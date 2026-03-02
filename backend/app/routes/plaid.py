from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.crypto import encrypt_text
from app.models.linked_account import LinkedAccount

from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest

from app.core.security import get_current_user
from app.integrations.plaid_client import plaid_client
from app.models.user import User
from app.schemas.plaid import PublicTokenExchangeIn
from app.schemas.linked_account import LinkedAccountOut

router = APIRouter(prefix="/plaid", tags=["Plaid"])


# -------------------------------------------------
# Create Link Token
# -------------------------------------------------
@router.post("/link-token")
def create_link_token(
    current_user: User = Depends(get_current_user),
):
    """
    Creates a Plaid link_token for the logged-in user.

    Frontend uses this link_token to open Plaid Link.
    Plaid Link then returns a public_token, which we exchange server-side.
    """
    try:
        request = LinkTokenCreateRequest(
            products=[Products("transactions")],
            client_name="Bank Aggregator",
            country_codes=[CountryCode("US")],
            language="en",
            user=LinkTokenCreateRequestUser(
                client_user_id=str(current_user.id)
            ),
        )

        response = plaid_client.link_token_create(request)
        return response.to_dict()

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------------
# Exchange Public Token
# -------------------------------------------------
@router.post("/exchange")
def exchange_public_token(
    body: PublicTokenExchangeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exchanges a Plaid public_token for:
      - access_token (must be encrypted and stored)
      - item_id (unique identifier for the linked institution)

    IMPORTANT:
    - We prevent duplicates using item_id.
    - If item already exists, we "heal" missing institution metadata
      (institution_id/name) if the frontend provides it now.
    """
    public_token = body.public_token
    if not public_token:
        raise HTTPException(status_code=400, detail="public_token required")

    try:
        # 1) Exchange public_token -> access_token + item_id
        request = ItemPublicTokenExchangeRequest(public_token=public_token)
        response = plaid_client.item_public_token_exchange(request)

        access_token = response["access_token"]
        item_id = response["item_id"]

        # 2) Prevent duplicate link by item_id (globally unique)
        existing = db.query(LinkedAccount).filter(
            LinkedAccount.item_id == item_id
        ).first()

        if existing:
            # If the item was linked before we started storing institution metadata,
            # fill in missing fields now (safe "backfill" behavior).
            updated = False

            if not existing.institution_id and body.institution_id:
                existing.institution_id = body.institution_id
                updated = True

            if not existing.institution_name and body.institution_name:
                existing.institution_name = body.institution_name
                updated = True

            # Commit only if we changed something
            if updated:
                db.commit()

            return {"status": "already_linked"}

        # 3) Create a new LinkedAccount row (store encrypted access_token)
        linked = LinkedAccount(
            user_id=current_user.id,
            item_id=item_id,
            access_token=encrypt_text(access_token),
            institution_id=body.institution_id,
            institution_name=body.institution_name,
        )

        db.add(linked)
        db.commit()
        db.refresh(linked)

        return {
            "status": "linked",
            "linked_account_id": str(linked.id),
            "item_id": linked.item_id,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------------
# List Linked Banks
# -------------------------------------------------
@router.get("/linked", response_model=list[LinkedAccountOut])
def list_linked_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all linked Plaid items for the current user.
    Used by the frontend to show "Linked institutions".
    """
    return (
        db.query(LinkedAccount)
        .filter(LinkedAccount.user_id == current_user.id)
        .order_by(LinkedAccount.created_at.desc())
        .all()
    )