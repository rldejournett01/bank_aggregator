from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from decimal import Decimal

from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.bank_account import BankAccount
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# ---------------------------------------------------------------------------
# Account type classification
#
# ASSET accounts   → balance is money YOU HAVE   → add to net worth
# LIABILITY accounts → balance is money YOU OWE  → subtract from net worth
#
# Plaid uses these account_type strings (lowercased here for matching):
#   depository  → checking, savings, money market, cd  (asset)
#   investment  → brokerage, retirement, 401k          (asset)
#   credit      → credit card                          (liability)
#   loan        → mortgage, auto, student, personal    (liability)
#   other       → treat as asset unless balance < 0
# ---------------------------------------------------------------------------

ASSET_TYPES     = {"depository", "investment", "checking", "savings",
                   "money market", "brokerage", "cd", "cash"}

LIABILITY_TYPES = {"credit", "credit card", "loan", "mortgage",
                   "auto", "student", "personal loan", "line of credit"}

# Display label + sign for the frontend
ACCOUNT_CLASS = {
    # Depositories
    "depository":     ("Depository",     "asset"),
    "checking":       ("Checking",       "asset"),
    "savings":        ("Savings",        "asset"),
    "money market":   ("Money Market",   "asset"),
    "cd":             ("CD",             "asset"),
    "cash":           ("Cash",           "asset"),
    # Investments
    "investment":     ("Investment",     "asset"),
    "brokerage":      ("Brokerage",      "asset"),
    "retirement":     ("Retirement",     "asset"),
    "401k":           ("401(k)",         "asset"),
    "ira":            ("IRA",            "asset"),
    # Liabilities
    "credit":         ("Credit Card",    "liability"),
    "credit card":    ("Credit Card",    "liability"),
    "loan":           ("Loan",           "liability"),
    "mortgage":       ("Mortgage",       "liability"),
    "auto":           ("Auto Loan",      "liability"),
    "student":        ("Student Loan",   "liability"),
    "personal loan":  ("Personal Loan",  "liability"),
    "line of credit": ("Line of Credit", "liability"),
}

def _classify(account_type: str) -> tuple[str, str]:
    """Returns (display_label, 'asset' | 'liability')."""
    key = account_type.lower().strip()
    if key in ACCOUNT_CLASS:
        return ACCOUNT_CLASS[key]
    # Fallback: negative balance = liability
    return (account_type.title(), "asset")


@router.get("/")
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dashboard summary endpoint.

    Net worth = sum(asset balances) - sum(liability balances)

    Returns:
      - net_worth:       true financial position
      - total_assets:    sum of depository + investment balances
      - total_liabilities: sum of credit + loan balances
      - total_balance:   alias for net_worth (keeps frontend compat)
      - accounts:        list with account_class ('asset' | 'liability') added
    """

    accounts = (
        db.query(BankAccount)
        .filter(BankAccount.user_id == current_user.id)
        .all()
    )

    total_assets      = Decimal("0")
    total_liabilities = Decimal("0")

    serialized = []
    for a in accounts:
        balance = Decimal(str(a.balance))
        label, account_class = _classify(a.account_type)

        if account_class == "liability":
            # Plaid stores credit/loan balances as positive numbers
            # representing what you owe — subtract from net worth
            total_liabilities += abs(balance)
        else:
            total_assets += balance

        serialized.append({
            "id":            str(a.id),
            "name":          a.name,
            "institution":   a.institution,
            "account_type":  a.account_type,
            "account_class": account_class,         # NEW: "asset" | "liability"
            "type_label":    label,                 # NEW: "Checking", "Mortgage" etc
            "balance":       str(abs(balance)),     # always positive — class tells sign
        })

    net_worth = total_assets - total_liabilities

    return {
        "net_worth":          str(net_worth),
        "total_assets":       str(total_assets),
        "total_liabilities":  str(total_liabilities),
        "total_balance":      str(net_worth),   # backward compat alias
        "accounts":           serialized,
    }