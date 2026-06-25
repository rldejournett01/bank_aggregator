from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class LinkedAccountOut(BaseModel):
    id: UUID
    item_id: str
    institution_id: str | None
    institution_name: str | None
    last_synced_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True