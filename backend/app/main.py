from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routes import auth, users, accounts
from app.core.database import engine
from app.models import user
from app.routes import dashboard
from app.routes import transactions
from app.routes import plaid
from app.routes import plaid_sync
from app.routes import analysis
from app.routes import billing
from app.routes import advisor



user.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Personal Bank Aggregator")

#Protected Routes
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(accounts.router)
app.include_router(dashboard.router)
app.include_router(transactions.router)
app.include_router(plaid.router)
app.include_router(plaid_sync.router)
app.include_router(analysis.router)
app.include_router(billing.router)
app.include_router(advisor.router)

app.add_middleware(
    CORSMiddleware,
    # Must be an explicit origin (not "*") because cookies require credentials.
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "API is running"}