# app/routes/analysis.py
#
# Financial Analysis Router — Cashism
#
# FREE endpoints:
#   GET /analysis/bills          – recurring bills + income detection
#   GET /analysis/liquidity      – liquidity & solvency ratios
#
# PREMIUM endpoints (requires user.is_premium == True):
#   GET /analysis/debt           – debt management breakdown
#   GET /analysis/profitability  – profitability & growth over time
#   GET /analysis/forecast       – forward projections (3m / 6m / 2yr / 10yr)
#
# Wiring: in your main.py add:
#   from app.routes.analysis import router as analysis_router
#   app.include_router(analysis_router, prefix="/analysis", tags=["Analysis"])
#
# Prerequisites:
#   - Add `is_premium: bool = Column(Boolean, default=False)` to app/models/user.py

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

# ── exact imports matching your project ───────────────────────────────────────
from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.bank_account import BankAccount
from app.models.transaction import Transaction
# ─────────────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/analysis", tags=["Analysis"])


# ---------------------------------------------------------------------------
# Keyword lists for heuristic detection
# ---------------------------------------------------------------------------

BILL_KEYWORDS = [
    # Streaming
    "netflix", "spotify", "hulu", "disney+", "disney plus", "hbo", "max",
    "peacock", "paramount", "apple tv", "youtube premium",
    # Utilities
    "electric", "electricity", "gas", "water", "sewer", "trash", "utility",
    # Internet / phone
    "internet", "comcast", "xfinity", "at&t", "verizon", "t-mobile",
    "spectrum", "cox", "frontier",
    # Housing
    "rent", "mortgage", "hoa", "homeowners",
    # Insurance
    "insurance", "geico", "progressive", "allstate", "state farm",
    "lemonade", "nationwide",
    # Subscriptions / SaaS
    "adobe", "microsoft", "google one", "dropbox", "icloud", "amazon prime",
    "gym", "planet fitness", "equinox", "peloton",
    # Loans
    "loan payment", "student loan", "auto loan", "car payment",
]

INCOME_KEYWORDS = [
    "payroll", "direct deposit", "ach credit", "salary", "wage",
    "employer", "gusto", "adp", "paychex", "transfer in", "venmo credit",
    "zelle credit", "deposit", "income",
]

LIQUID_ACCOUNT_TYPES = {"checking", "savings", "depository", "money market", "cash"}
DEBT_ACCOUNT_TYPES   = {"credit card", "credit", "loan", "mortgage", "student", "auto"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_bill(description: str, merchant: str | None) -> bool:
    text = f"{description} {merchant or ''}".lower()
    return any(k in text for k in BILL_KEYWORDS)

def _is_income(description: str, merchant: str | None) -> bool:
    text = f"{description} {merchant or ''}".lower()
    return any(k in text for k in INCOME_KEYWORDS)

def _require_premium(user: User) -> None:
    if not getattr(user, "is_premium", False):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="This feature requires a Cashism Premium subscription.",
        )

def _transactions_for_user(
    db: Session,
    user_id,
    since: date,
) -> list[Transaction]:
    """All transactions across all accounts owned by user_id since `since`."""
    return (
        db.query(Transaction)
        .join(BankAccount, Transaction.account_id == BankAccount.id)
        .filter(
            BankAccount.user_id == user_id,
            Transaction.date >= since,      # uses Transaction.date (posting date)
        )
        .order_by(Transaction.date)
        .all()
    )

def _accounts_for_user(db: Session, user_id) -> list[BankAccount]:
    return (
        db.query(BankAccount)
        .filter(BankAccount.user_id == user_id)
        .all()
    )

def _compute_bills_and_income(transactions: list[Transaction]):
    """
    Returns (bill_map, income_map, monthly_bills_total, stable_income).
    Averages each recurring item over however many occurrences appear.
    """
    bill_map: dict[str, list[float]]   = defaultdict(list)
    income_map: dict[str, list[float]] = defaultdict(list)

    for tx in transactions:
        amt      = float(tx.amount)
        merchant = tx.merchant_name  # Column on Transaction — may be None

        if amt < 0 and _is_bill(tx.description, merchant):
            key = (merchant or tx.description).strip().title()
            bill_map[key].append(abs(amt))
        elif amt > 0 and _is_income(tx.description, merchant):
            key = (merchant or tx.description).strip().title()
            income_map[key].append(amt)

    monthly_bills_total = sum(
        sum(amounts) / len(amounts) for amounts in bill_map.values()
    )
    stable_income = sum(
        sum(amounts) / len(amounts) for amounts in income_map.values()
    )

    return bill_map, income_map, monthly_bills_total, stable_income


# ---------------------------------------------------------------------------
# Pydantic response schemas
# ---------------------------------------------------------------------------

class BillItem(BaseModel):
    name: str
    amount: float
    frequency: str
    category: str | None

class IncomeItem(BaseModel):
    source: str
    amount: float
    frequency: str

class BillsResponse(BaseModel):
    monthly_bills_total: float
    annual_bills_total: float
    stable_income_monthly: float
    surplus_deficit: float
    bills: list[BillItem]
    income_sources: list[IncomeItem]


class LiquidityResponse(BaseModel):
    current_ratio: float | None
    cash_buffer_months: float | None
    total_liquid: float
    total_monthly_obligations: float
    solvency_score: int
    solvency_label: str
    insights: list[str]


class DebtItem(BaseModel):
    account_name: str
    balance: float
    account_type: str
    estimated_monthly_payment: float | None

class DebtResponse(BaseModel):
    total_debt: float
    debt_to_income_ratio: float | None
    monthly_debt_payments: float
    payoff_months_estimate: int | None
    items: list[DebtItem]
    insights: list[str]


class ProfitabilityPoint(BaseModel):
    period: str
    income: float
    expenses: float
    net: float
    savings_rate: float | None

class ProfitabilityResponse(BaseModel):
    avg_monthly_net: float
    avg_savings_rate: float | None
    trend: str
    periods: list[ProfitabilityPoint]
    insights: list[str]


class ForecastPoint(BaseModel):
    label: str
    months_out: int
    projected_balance: float
    projected_savings_accumulated: float
    scenario_low: float
    scenario_high: float

class ForecastResponse(BaseModel):
    monthly_surplus: float
    annual_surplus: float
    points: list[ForecastPoint]
    assumptions: list[str]


# ---------------------------------------------------------------------------
# FREE — Bills & Income   GET /analysis/bills
# ---------------------------------------------------------------------------

@router.get("/bills", response_model=BillsResponse)
def get_bills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    since = date.today() - timedelta(days=90)
    transactions = _transactions_for_user(db, current_user.id, since)
    bill_map, income_map, monthly_bills_total, stable_income = (
        _compute_bills_and_income(transactions)
    )

    # Build bill items — pull category from the most recent matching transaction
    tx_lookup = {
        (tx.merchant_name or tx.description).strip().title(): tx
        for tx in transactions
    }
    bills = [
        BillItem(
            name=name,
            amount=round(sum(amounts) / len(amounts), 2),
            frequency="monthly",
            category=tx_lookup.get(name, None) and getattr(tx_lookup[name], "category", None),
        )
        for name, amounts in bill_map.items()
    ]

    income_sources = [
        IncomeItem(
            source=src,
            amount=round(sum(amounts) / len(amounts), 2),
            frequency="monthly",
        )
        for src, amounts in income_map.items()
    ]

    return BillsResponse(
        monthly_bills_total=round(monthly_bills_total, 2),
        annual_bills_total=round(monthly_bills_total * 12, 2),
        stable_income_monthly=round(stable_income, 2),
        surplus_deficit=round(stable_income - monthly_bills_total, 2),
        bills=bills,
        income_sources=income_sources,
    )


# ---------------------------------------------------------------------------
# FREE — Liquidity & Solvency   GET /analysis/liquidity
# ---------------------------------------------------------------------------

@router.get("/liquidity", response_model=LiquidityResponse)
def get_liquidity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accounts = _accounts_for_user(db, current_user.id)

    total_liquid = sum(
        float(a.balance)
        for a in accounts
        if a.account_type.lower() in LIQUID_ACCOUNT_TYPES and float(a.balance) > 0
    )

    since = date.today() - timedelta(days=90)
    transactions = _transactions_for_user(db, current_user.id, since)
    _, _, monthly_obligations, _ = _compute_bills_and_income(transactions)

    current_ratio = (total_liquid / monthly_obligations) if monthly_obligations > 0 else None
    cash_buffer   = (total_liquid / monthly_obligations) if monthly_obligations > 0 else None

    score = 50
    insights: list[str] = []

    if cash_buffer is not None:
        if cash_buffer >= 6:
            score = 90
            insights.append("Excellent — you have 6+ months of cash runway.")
        elif cash_buffer >= 3:
            score = 70
            insights.append("Solid foundation. Aim for 6 months of reserves.")
        elif cash_buffer >= 1:
            score = 45
            insights.append("Tight margin. Consider building a 3-month emergency fund.")
        else:
            score = 20
            insights.append("At risk — liquid assets cover less than 1 month of bills.")
    else:
        insights.append("Connect more accounts to get an accurate liquidity picture.")

    if total_liquid < 1000:
        insights.append("Your liquid balance is very low. Prioritize building savings.")

    label = "Healthy" if score >= 70 else ("Moderate" if score >= 40 else "At Risk")

    return LiquidityResponse(
        current_ratio=round(current_ratio, 2) if current_ratio is not None else None,
        cash_buffer_months=round(cash_buffer, 1) if cash_buffer is not None else None,
        total_liquid=round(total_liquid, 2),
        total_monthly_obligations=round(monthly_obligations, 2),
        solvency_score=score,
        solvency_label=label,
        insights=insights,
    )


# ---------------------------------------------------------------------------
# PREMIUM — Debt Management   GET /analysis/debt
# ---------------------------------------------------------------------------

@router.get("/debt", response_model=DebtResponse)
def get_debt(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_premium(current_user)

    accounts = _accounts_for_user(db, current_user.id)

    debt_accounts = [
        a for a in accounts
        if any(d in a.account_type.lower() for d in DEBT_ACCOUNT_TYPES)
        or float(a.balance) < 0
    ]
    total_debt = sum(abs(float(a.balance)) for a in debt_accounts)

    since = date.today() - timedelta(days=90)
    transactions = _transactions_for_user(db, current_user.id, since)

    debt_keywords = {"loan payment", "credit card payment", "card payment", "mortgage payment"}
    monthly_payments = sum(
        abs(float(tx.amount))
        for tx in transactions
        if float(tx.amount) < 0
        and any(k in (tx.description or "").lower() for k in debt_keywords)
    ) / 3  # average over 3-month window

    _, _, _, stable_income = _compute_bills_and_income(transactions)
    dti        = (monthly_payments / stable_income) if stable_income > 0 else None
    payoff_est = int(total_debt / monthly_payments) if monthly_payments > 0 else None

    insights: list[str] = []
    if dti is not None:
        if dti < 0.15:
            insights.append("Healthy DTI — under 15%. Strong borrowing flexibility.")
        elif dti < 0.36:
            insights.append("Moderate DTI. Consider accelerating high-interest debt.")
        else:
            insights.append("High DTI (36%+). Prioritize debt reduction before new obligations.")
    if total_debt == 0:
        insights.append("No detected debt accounts. Great position to build wealth.")

    return DebtResponse(
        total_debt=round(total_debt, 2),
        debt_to_income_ratio=round(dti, 3) if dti is not None else None,
        monthly_debt_payments=round(monthly_payments, 2),
        payoff_months_estimate=payoff_est,
        items=[
            DebtItem(
                account_name=a.name,
                balance=abs(float(a.balance)),
                account_type=a.account_type,
                estimated_monthly_payment=None,
            )
            for a in debt_accounts
        ],
        insights=insights,
    )


# ---------------------------------------------------------------------------
# PREMIUM — Profitability & Growth   GET /analysis/profitability
# ---------------------------------------------------------------------------

@router.get("/profitability", response_model=ProfitabilityResponse)
def get_profitability(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_premium(current_user)

    since = date.today() - timedelta(days=365)
    transactions = _transactions_for_user(db, current_user.id, since)

    period_map: dict[str, dict[str, float]] = defaultdict(
        lambda: {"income": 0.0, "expenses": 0.0}
    )
    for tx in transactions:
        if tx.date is None:
            continue
        period = tx.date.strftime("%Y-%m")   # Transaction.date is a Date column
        amt = float(tx.amount)
        if amt > 0:
            period_map[period]["income"] += amt
        else:
            period_map[period]["expenses"] += abs(amt)

    periods: list[ProfitabilityPoint] = []
    nets: list[float] = []

    for period in sorted(period_map.keys()):
        inc = period_map[period]["income"]
        exp = period_map[period]["expenses"]
        net = inc - exp
        savings_rate = (net / inc) if inc > 0 else None
        nets.append(net)
        periods.append(ProfitabilityPoint(
            period=period,
            income=round(inc, 2),
            expenses=round(exp, 2),
            net=round(net, 2),
            savings_rate=round(savings_rate, 3) if savings_rate is not None else None,
        ))

    avg_net = sum(nets) / len(nets) if nets else 0.0
    rates   = [p.savings_rate for p in periods if p.savings_rate is not None]
    avg_savings = sum(rates) / len(rates) if rates else 0.0

    mid = len(nets) // 2
    trend = "stable"
    if mid > 0:
        first_avg  = sum(nets[:mid]) / mid
        second_avg = sum(nets[mid:]) / max(len(nets[mid:]), 1)
        if second_avg > first_avg * 1.05:
            trend = "improving"
        elif second_avg < first_avg * 0.95:
            trend = "declining"

    insights: list[str] = []
    if avg_savings >= 0.20:
        insights.append("Strong savings rate — retaining over 20% of income.")
    elif avg_savings >= 0.10:
        insights.append("Moderate savings rate. Target 20%+ for long-term growth.")
    elif avg_savings > 0:
        insights.append("Low savings rate. Review recurring expenses to improve margin.")
    else:
        insights.append("Expenses are exceeding income. Immediate budget review recommended.")

    if trend == "improving":
        insights.append("Net income trend is improving month over month.")
    elif trend == "declining":
        insights.append("Net income trend is declining. Review recent expense increases.")

    return ProfitabilityResponse(
        avg_monthly_net=round(avg_net, 2),
        avg_savings_rate=round(avg_savings, 3),
        trend=trend,
        periods=periods,
        insights=insights,
    )


# ---------------------------------------------------------------------------
# PREMIUM — Forecast   GET /analysis/forecast
# ---------------------------------------------------------------------------

@router.get("/forecast", response_model=ForecastResponse)
def get_forecast(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_premium(current_user)

    accounts = _accounts_for_user(db, current_user.id)
    total_balance = sum(float(a.balance) for a in accounts)

    since = date.today() - timedelta(days=90)
    transactions = _transactions_for_user(db, current_user.id, since)

    total_in  = sum(float(tx.amount) for tx in transactions if float(tx.amount) > 0)
    total_out = sum(abs(float(tx.amount)) for tx in transactions if float(tx.amount) < 0)
    monthly_surplus = (total_in - total_out) / 3   # 3-month average

    horizons = [
        ("3 months",  3),
        ("6 months",  6),
        ("2 years",  24),
        ("10 years", 120),
    ]

    points: list[ForecastPoint] = []
    for label, months in horizons:
        base = total_balance + monthly_surplus * months
        points.append(ForecastPoint(
            label=label,
            months_out=months,
            projected_balance=round(base, 2),
            projected_savings_accumulated=round(monthly_surplus * months, 2),
            scenario_low=round(total_balance + monthly_surplus * months * 0.80, 2),
            scenario_high=round(total_balance + monthly_surplus * months * 1.20, 2),
        ))

    return ForecastResponse(
        monthly_surplus=round(monthly_surplus, 2),
        annual_surplus=round(monthly_surplus * 12, 2),
        points=points,
        assumptions=[
            "Projection uses your average monthly surplus from the last 90 days.",
            "Conservative scenario: 20% reduction in surplus (higher expenses).",
            "Optimistic scenario: 20% increase in surplus (income growth).",
            "Does not account for investment returns, inflation, or major life events.",
        ],
    )