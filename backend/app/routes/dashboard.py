from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import asc
from decimal import Decimal
from datetime import date, timedelta

from app.core.deps import get_db
from app.core.security import get_current_user
from app.core.finance import classify, net_worth
from app.models.bank_account import BankAccount
from app.models.net_worth_snapshot import NetWorthSnapshot
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/")
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dashboard summary endpoint.

    Net worth = sum(asset balances) - sum(liability balances)

    Returns:
      - net_worth:         true financial position
      - total_assets:      sum of depository + investment balances
      - total_liabilities: sum of credit + loan balances
      - total_balance:     alias for net_worth (keeps frontend compat)
      - accounts:          list with account_class ('asset' | 'liability') added
    """
    accounts = (
        db.query(BankAccount)
        .filter(BankAccount.user_id == current_user.id)
        .all()
    )

    nw, total_assets, total_liabilities = net_worth(accounts)

    serialized = []
    for a in accounts:
        balance = Decimal(str(a.balance))
        label, account_class = classify(a.account_type)
        serialized.append({
            "id":            str(a.id),
            "name":          a.name,
            "institution":   a.institution,
            "account_type":  a.account_type,
            "account_class": account_class,        # "asset" | "liability"
            "type_label":    label,                # "Checking", "Mortgage", etc
            "balance":       str(abs(balance)),    # always positive — class tells sign
        })

    return {
        "net_worth":          str(nw),
        "total_assets":       str(total_assets),
        "total_liabilities":  str(total_liabilities),
        "total_balance":      str(nw),   # backward compat alias
        "accounts":           serialized,
    }


@router.get("/history")
def net_worth_history(
    days: int = 90,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Net-worth snapshots over the last `days`, oldest first (for charting)."""
    days = max(7, min(days, 365 * 3))
    since = date.today() - timedelta(days=days)
    rows = (
        db.query(NetWorthSnapshot)
        .filter(
            NetWorthSnapshot.user_id == current_user.id,
            NetWorthSnapshot.captured_on >= since,
        )
        .order_by(asc(NetWorthSnapshot.captured_on))
        .all()
    )
    return [
        {
            "date": r.captured_on.isoformat(),
            "net_worth": float(r.net_worth),
            "total_assets": float(r.total_assets),
            "total_liabilities": float(r.total_liabilities),
        }
        for r in rows
    ]
