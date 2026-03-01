from pydantic import BaseModel

class PublicTokenExchangeIn(BaseModel):
    public_token: str