from fastapi import FastAPI
from app.routes import auth, users, accounts
from app.core.database import engine
from app.models import user

user.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Personal Bank Aggregator")

#Protected Routes
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(accounts.router)

@app.get("/")
def root():
    return {"message": "API is running"}