"""
Cashism AI Financial Advisor.

A tool-using Claude agent that answers a user's financial questions by querying
their OWN aggregated data through a small set of read-only tools. The model
never sees another user's data — every tool is scoped to the authenticated user
and executed server-side.
"""
from __future__ import annotations

import json
from collections import defaultdict
from datetime import date, timedelta

import anthropic
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.finance import net_worth, classify
from app.models.user import User
from app.models.bank_account import BankAccount
from app.models.transaction import Transaction
from app.routes.analysis import _transactions_for_user, _compute_bills_and_income


SYSTEM_PROMPT = (
    "You are Cashism's AI financial advisor. You help the user understand their "
    "money and make better decisions.\n\n"
    "Rules:\n"
    "- Always ground numbers in the user's real data by calling the provided "
    "tools. Never invent balances, totals, or transactions.\n"
    "- Amounts are in USD. Negative transaction amounts are money out (spending); "
    "positive amounts are money in (income).\n"
    "- Be concise and specific. Lead with the answer, then a short, actionable "
    "insight or next step.\n"
    "- If the data needed isn't available (e.g. no accounts connected), say so "
    "plainly and suggest connecting a bank.\n"
    "- You are not a licensed financial, tax, or legal advisor; give practical "
    "guidance, not guarantees, and avoid definitive predictions about markets."
)


TOOLS = [
    {
        "name": "get_financial_overview",
        "description": (
            "Get the user's net worth, total assets, total liabilities, and a "
            "list of all connected accounts with their balances and types. Use "
            "for questions about overall position, net worth, or accounts."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_cash_flow",
        "description": (
            "Get the user's detected recurring monthly bills, recurring income, "
            "and monthly surplus/deficit over the last 90 days. Use for questions "
            "about bills, income, budgeting, or whether they're living within "
            "their means."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_spending_by_category",
        "description": (
            "Get total spending grouped by category over the last N days. Use for "
            "questions about where money goes or which categories cost the most."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "description": "Look-back window in days (default 30, max 365).",
                }
            },
        },
    },
    {
        "name": "get_recent_transactions",
        "description": (
            "List the user's most recent transactions across all accounts, "
            "optionally filtered by a text search on the description. Use to "
            "investigate specific charges or recent activity."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "How many to return (default 15, max 50)."},
                "search": {"type": "string", "description": "Optional case-insensitive description filter."},
            },
        },
    },
]


def _tool_executors(db: Session, user: User) -> dict:
    """Return name -> callable(input_dict) -> json-serializable result, scoped to user."""

    def get_financial_overview(_inp: dict) -> dict:
        accounts = db.query(BankAccount).filter(BankAccount.user_id == user.id).all()
        nw, assets, liabilities = net_worth(accounts)
        return {
            "net_worth": float(nw),
            "total_assets": float(assets),
            "total_liabilities": float(liabilities),
            "accounts": [
                {
                    "name": a.name,
                    "institution": a.institution,
                    "type": a.account_type,
                    "class": classify(a.account_type)[1],
                    "balance": float(a.balance),
                }
                for a in accounts
            ],
        }

    def get_cash_flow(_inp: dict) -> dict:
        since = date.today() - timedelta(days=90)
        txs = _transactions_for_user(db, user.id, since)
        bills, income, monthly_bills, monthly_income = _compute_bills_and_income(txs)
        return {
            "window_days": 90,
            "monthly_income_total": round(monthly_income, 2),
            "monthly_bills_total": round(monthly_bills, 2),
            "monthly_surplus": round(monthly_income - monthly_bills, 2),
            "recurring_bills": bills[:20],
            "income_sources": income[:10],
        }

    def get_spending_by_category(inp: dict) -> dict:
        days = max(1, min(int(inp.get("days", 30)), 365))
        since = date.today() - timedelta(days=days)
        txs = _transactions_for_user(db, user.id, since)
        agg: dict[str, float] = defaultdict(float)
        for t in txs:
            amt = float(t.amount)
            if amt < 0:
                agg[t.category or "Uncategorized"] += -amt
        rows = sorted(
            ({"category": k, "spent": round(v, 2)} for k, v in agg.items()),
            key=lambda r: r["spent"],
            reverse=True,
        )
        return {"window_days": days, "spending_by_category": rows}

    def get_recent_transactions(inp: dict) -> dict:
        limit = max(1, min(int(inp.get("limit", 15)), 50))
        q = (
            db.query(Transaction)
            .join(BankAccount, Transaction.account_id == BankAccount.id)
            .filter(BankAccount.user_id == user.id)
        )
        search = inp.get("search")
        if search:
            q = q.filter(Transaction.description.ilike(f"%{search}%"))
        txs = q.order_by(Transaction.created_at.desc()).limit(limit).all()
        return {
            "transactions": [
                {
                    "date": str(t.date) if t.date else None,
                    "description": t.description,
                    "amount": float(t.amount),
                    "category": t.category,
                }
                for t in txs
            ]
        }

    return {
        "get_financial_overview": get_financial_overview,
        "get_cash_flow": get_cash_flow,
        "get_spending_by_category": get_spending_by_category,
        "get_recent_transactions": get_recent_transactions,
    }


def advisor_enabled() -> bool:
    return bool(settings.ANTHROPIC_API_KEY)


def run_advisor(db: Session, user: User, message: str, history: list[dict]) -> str:
    """
    Run one advisor turn. `history` is a list of {role, content} text turns from
    earlier in the conversation. Returns the assistant's reply text.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("AI advisor is not configured")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    executors = _tool_executors(db, user)

    messages: list[dict] = []
    for turn in history[-10:]:  # cap conversational context
        role = turn.get("role")
        content = turn.get("content")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    # Manual tool-use loop — bounded to avoid runaway tool calling.
    for _ in range(6):
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=8000,
            system=SYSTEM_PROMPT,
            thinking={"type": "adaptive"},
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            # Preserve full content (incl. thinking + tool_use blocks) for replay.
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                fn = executors.get(block.name)
                try:
                    result = fn(block.input) if fn else {"error": "unknown tool"}
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, default=str),
                    })
                except Exception as e:  # surface tool failure to the model
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": f"Error running tool: {e}",
                        "is_error": True,
                    })
            messages.append({"role": "user", "content": tool_results})
            continue

        # Final answer
        return "".join(b.text for b in response.content if b.type == "text").strip() or (
            "I wasn't able to produce an answer. Please try rephrasing your question."
        )

    return "I gathered a lot of data but couldn't finish. Try asking a more specific question."
