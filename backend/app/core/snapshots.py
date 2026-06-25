"""Net-worth snapshot recording — one upserted row per user per day."""
from datetime import date

from sqlalchemy.orm import Session

from app.core.finance import net_worth
from app.models.bank_account import BankAccount
from app.models.net_worth_snapshot import NetWorthSnapshot


def record_net_worth_snapshot(db: Session, user_id) -> NetWorthSnapshot | None:
    """
    Upsert today's net-worth snapshot for the user from current account
    balances. Returns the snapshot, or None if the user has no accounts.
    Caller is responsible for committing.
    """
    accounts = db.query(BankAccount).filter(BankAccount.user_id == user_id).all()
    if not accounts:
        return None

    nw, assets, liabilities = net_worth(accounts)
    today = date.today()

    snap = (
        db.query(NetWorthSnapshot)
        .filter(
            NetWorthSnapshot.user_id == user_id,
            NetWorthSnapshot.captured_on == today,
        )
        .first()
    )
    if snap:
        snap.net_worth = nw
        snap.total_assets = assets
        snap.total_liabilities = liabilities
    else:
        snap = NetWorthSnapshot(
            user_id=user_id,
            captured_on=today,
            net_worth=nw,
            total_assets=assets,
            total_liabilities=liabilities,
        )
        db.add(snap)
    return snap
