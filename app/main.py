from fastapi import FastAPI
from app.routes import auth
from app.core.database import engine
from app.models import user

user.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Personal Bank Aggregator")

app.include_router(auth.router)

@app.get("/")
def root():
    return {"message": "API is running"}