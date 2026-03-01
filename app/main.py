from fastapi import FastAPI
from app.routes import auth, users, accounts
from app.core.database import engine
from app.models import user
from app.routes import dashboard
from app.routes import transactions
from app.routes import plaid

user.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Personal Bank Aggregator")

#Protected Routes
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(accounts.router)
app.include_router(dashboard.router)
app.include_router(transactions.router)
app.include_router(plaid.router)

@app.get("/")
def root():
    return {"message": "API is running"}