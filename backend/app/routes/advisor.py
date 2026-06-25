from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.routes.analysis import _require_premium
from app.integrations.ai_advisor import run_advisor, advisor_enabled

router = APIRouter(prefix="/advisor", tags=["AI Advisor"])


class ChatTurn(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatTurn] = []


class ChatResponse(BaseModel):
    reply: str


@router.get("/status")
def advisor_status(current_user: User = Depends(get_current_user)):
    """Tell the frontend whether the advisor is available and unlocked."""
    return {
        "enabled": advisor_enabled(),
        "is_premium": bool(getattr(current_user, "is_premium", False)),
    }


@router.post("/chat", response_model=ChatResponse)
def advisor_chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not advisor_enabled():
        raise HTTPException(status_code=503, detail="The AI advisor is not configured.")
    _require_premium(current_user)

    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    reply = run_advisor(
        db,
        current_user,
        body.message.strip(),
        [t.model_dump() for t in body.history],
    )
    return ChatResponse(reply=reply)
