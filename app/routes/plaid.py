from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db

from app.core.crypto import encrypt_text
from app.core.crypto import decrypt_text
from app.models.linked_account import LinkedAccount

from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest,
)

from app.core.security import get_current_user
from app.integrations.plaid_client import plaid_client
from app.models.user import User

router = APIRouter(
    prefix="/plaid",
    tags=["Plaid"]
)

# -------------------------------------------------
# Create Link Token
# -------------------------------------------------
@router.post("/link-token")
def create_link_token(
    current_user: User = Depends(get_current_user),
):
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
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    public_token = payload.get("public_token")
    if not public_token:
        raise HTTPException(status_code=400, detail="public_token required")

    try:
        request = ItemPublicTokenExchangeRequest(public_token=public_token)
        response = plaid_client.item_public_token_exchange(request)

        access_token = response["access_token"]
        item_id = response["item_id"]

        # Prevent duplicate link (Plaid item_id should be unique globally)
        existing = db.query(LinkedAccount).filter(LinkedAccount.item_id == item_id).first()
        if existing:
            return {"status": "already_linked"}

        linked = LinkedAccount(
            user_id=current_user.id,
            item_id=item_id,
            access_token=encrypt_text(access_token),
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
    
    
from app.schemas.linked_account import LinkedAccountOut
# -------------------------------------------------
# List Linked Banks
# -------------------------------------------------
@router.get("/linked", response_model=list[LinkedAccountOut])
def list_linked_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(LinkedAccount).filter(
        LinkedAccount.user_id == current_user.id
    ).order_by(LinkedAccount.created_at.desc()).all()