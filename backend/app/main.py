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

import logging
from sqlalchemy import text
from fastapi.responses import JSONResponse
from app.core.middleware import SecurityHeadersMiddleware, RateLimitMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

user.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cashism API")

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

# Added after CORS so they wrap it (rate limit runs first on the way in).
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)


@app.get("/")
def root():
    return {"message": "API is running"}


@app.get("/health")
def health():
    """Liveness + DB connectivity, for load balancers / uptime checks."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "up"}
    except Exception:
        return JSONResponse(
            status_code=503, content={"status": "degraded", "database": "down"}
        )