from pydantic import BaseModel
from typing import Optional

class PublicTokenExchangeIn(BaseModel):
    public_token: str
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None