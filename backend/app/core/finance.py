"""
Shared account-classification + balance-sheet helpers.

Centralises the asset/liability logic that both the dashboard and the analysis
endpoints need, so net worth is computed identically everywhere.

ASSET    accounts → balance is money you HAVE  → adds to net worth
LIABILITY accounts → balance is money you OWE  → subtracts from net worth
"""
from decimal import Decimal

ASSET_TYPES = {
    "depository", "investment", "checking", "savings",
    "money market", "brokerage", "cd", "cash", "retirement", "401k", "ira",
}

LIABILITY_TYPES = {
    "credit", "credit card", "loan", "mortgage",
    "auto", "student", "personal loan", "line of credit",
}

# Short-term / revolving liabilities used for the current ratio.
CURRENT_LIABILITY_TYPES = {"credit", "credit card", "line of credit"}

LIQUID_ACCOUNT_TYPES = {"checking", "savings", "depository", "money market", "cash"}

# Display label + class for the frontend.
ACCOUNT_CLASS = {
    "depository":     ("Depository",     "asset"),
    "checking":       ("Checking",       "asset"),
    "savings":        ("Savings",        "asset"),
    "money market":   ("Money Market",   "asset"),
    "cd":             ("CD",             "asset"),
    "cash":           ("Cash",           "asset"),
    "investment":     ("Investment",     "asset"),
    "brokerage":      ("Brokerage",      "asset"),
    "retirement":     ("Retirement",     "asset"),
    "401k":           ("401(k)",         "asset"),
    "ira":            ("IRA",            "asset"),
    "credit":         ("Credit Card",    "liability"),
    "credit card":    ("Credit Card",    "liability"),
    "loan":           ("Loan",           "liability"),
    "mortgage":       ("Mortgage",       "liability"),
    "auto":           ("Auto Loan",      "liability"),
    "student":        ("Student Loan",   "liability"),
    "personal loan":  ("Personal Loan",  "liability"),
    "line of credit": ("Line of Credit", "liability"),
}


def classify(account_type: str) -> tuple[str, str]:
    """Returns (display_label, 'asset' | 'liability')."""
    key = (account_type or "").lower().strip()
    if key in ACCOUNT_CLASS:
        return ACCOUNT_CLASS[key]
    # Unknown type: treat as asset (matches prior dashboard behaviour).
    return ((account_type or "Account").title(), "asset")


def net_worth(accounts) -> tuple[Decimal, Decimal, Decimal]:
    """
    Returns (net_worth, total_assets, total_liabilities).

    Plaid stores credit/loan balances as positive numbers representing what is
    owed, so liabilities are summed by absolute value and subtracted.
    """
    total_assets = Decimal("0")
    total_liabilities = Decimal("0")
    for a in accounts:
        balance = Decimal(str(a.balance))
        _, account_class = classify(a.account_type)
        if account_class == "liability":
            total_liabilities += abs(balance)
        else:
            total_assets += balance
    return (total_assets - total_liabilities, total_assets, total_liabilities)


def current_liabilities(accounts) -> Decimal:
    """Sum of short-term/revolving liability balances (for the current ratio)."""
    total = Decimal("0")
    for a in accounts:
        if (a.account_type or "").lower().strip() in CURRENT_LIABILITY_TYPES:
            total += abs(Decimal(str(a.balance)))
    return total
