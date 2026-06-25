import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/billing", tags=["Billing"])


def _require_stripe() -> None:
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Billing is not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY


def _get_or_create_customer(db: Session, user: User) -> str:
    if user.stripe_customer_id:
        return user.stripe_customer_id
    customer = stripe.Customer.create(
        email=user.email, metadata={"user_id": str(user.id)}
    )
    user.stripe_customer_id = customer.id
    db.commit()
    return customer.id


@router.get("/config")
def billing_config():
    """Lets the frontend know whether the upgrade flow is available."""
    return {"enabled": bool(settings.STRIPE_SECRET_KEY and settings.STRIPE_PRICE_ID)}


@router.post("/checkout")
def create_checkout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Stripe Checkout Session for the Premium subscription."""
    _require_stripe()
    if not settings.STRIPE_PRICE_ID:
        raise HTTPException(status_code=503, detail="No subscription price configured")
    if current_user.is_premium:
        raise HTTPException(status_code=400, detail="You are already on Premium")

    customer_id = _get_or_create_customer(db, current_user)
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": settings.STRIPE_PRICE_ID, "quantity": 1}],
        client_reference_id=str(current_user.id),
        success_url=(
            f"{settings.FRONTEND_URL}/analysis"
            "?checkout=success&session_id={CHECKOUT_SESSION_ID}"
        ),
        cancel_url=f"{settings.FRONTEND_URL}/analysis?checkout=cancel",
    )
    return {"url": session.url}


@router.post("/verify")
def verify_checkout(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Confirm a completed checkout without relying on the webhook.

    The webhook is the source of truth in production, but this lets the
    success redirect grant access immediately (useful in local/dev where a
    public webhook URL may not be reachable).
    """
    _require_stripe()
    session = stripe.checkout.Session.retrieve(session_id)
    if session.get("client_reference_id") != str(current_user.id):
        raise HTTPException(status_code=403, detail="Session does not belong to you")

    if session.get("payment_status") == "paid" or session.get("status") == "complete":
        current_user.is_premium = True
        if session.get("subscription"):
            current_user.stripe_subscription_id = session["subscription"]
        if session.get("customer"):
            current_user.stripe_customer_id = session["customer"]
        db.commit()

    return {"is_premium": current_user.is_premium}


@router.post("/portal")
def billing_portal(current_user: User = Depends(get_current_user)):
    """Open the Stripe customer portal to manage/cancel the subscription."""
    _require_stripe()
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account on file")
    session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/analysis",
    )
    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Stripe-called endpoint (no auth). Source of truth for premium status."""
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid webhook signature: {e}")

    etype = event["type"]
    obj = event["data"]["object"]

    if etype == "checkout.session.completed":
        user = db.query(User).filter(User.id == obj.get("client_reference_id")).first()
        if user:
            user.is_premium = True
            if obj.get("customer"):
                user.stripe_customer_id = obj["customer"]
            if obj.get("subscription"):
                user.stripe_subscription_id = obj["subscription"]
            db.commit()

    elif etype == "customer.subscription.deleted":
        user = db.query(User).filter(
            User.stripe_subscription_id == obj.get("id")
        ).first()
        if user:
            user.is_premium = False
            db.commit()

    return {"received": True}
