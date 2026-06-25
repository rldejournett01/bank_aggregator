# Cashism  
### AI-Powered Financial Aggregation Platform

Cashism is a full-stack fintech platform that securely aggregates multi-institution financial data, provides transaction analytics, and lays the foundation for an agentic AI financial advisor.

Built with production-oriented architecture, encrypted credential storage, and strict user-level data isolation.

---

## 🚀 Tech Stack

### Backend
- FastAPI
- PostgreSQL
- SQLAlchemy (ORM)
- Plaid API (financial aggregation)
- JWT Authentication
- Application-level encryption for sensitive credentials

### Frontend
- Next.js (App Router)
- TailwindCSS v4
- Recharts (data visualization)

---

## 🔐 Security Features

- Encrypted storage of Plaid access tokens
- User-scoped data access control
- Idempotent transaction ingestion
- JWT-based authentication
- Route-level authorization enforcement
- SSR-safe frontend rendering

Future hardening roadmap:
- HTTP-only secure cookies
- Refresh token rotation
- Rate limiting
- Audit logging
- 2FA authentication
- Secure header middleware

---

## 🏗 Architecture Overview

The system is modular and layered:
backend/
app/
core/ → security, crypto, config
models/ → database models
schemas/ → Pydantic schemas
routes/ → API endpoints
integrations/ → Plaid integration layer



Key architectural principles:

- Separation of concerns
- Dependency injection
- Idempotent financial data ingestion
- Encrypted credential handling
- User-scoped relational integrity

---

## 💳 Core Features

### 1. Secure Bank Linking
- Plaid Link integration
- Public token exchange
- Encrypted access token storage

### 2. Account Synchronization
- Account upsert logic
- Transaction ingestion with duplicate prevention
- Category classification support

### 3. Dashboard Analytics
- Account-level balance tracking
- Transaction filtering (date, search)
- Category summaries
- Pagination

### 4. Account Management
- View account details
- Delete accounts
- Scoped transaction access

---

## 🧠 Planned AI Expansion

Cashism is designed to evolve into an AI-powered financial intelligence system.

Planned features:

- Agentic AI Financial Advisor
- Tool-using AI capable of querying structured financial data
- Automated monthly spending summaries
- Budget forecasting
- Anomaly detection
- Context-aware financial insights

Future AI Architecture:
- Structured SQL data retrieval layer
- Financial reasoning engine
- LLM-driven advisory layer
- Hybrid structured + semantic retrieval

---

## 📊 Database Model Highlights

- Users
- LinkedAccounts (Plaid item-level linkage)
- BankAccounts (institution accounts)
- Transactions (idempotent, external ID tracked)
- Future: AuditLogs, RefreshTokens

All financial records are scoped by user ownership to prevent cross-user data access.

---

## 🛠 Setup Instructions

### 1️⃣ Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload


Create a backend/.env file:

```bash
# Required
SECRET_KEY=your_jwt_secret
FERNET_KEY=your_fernet_key            # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
PLAID_CLIENT_ID=your_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox                     # sandbox | development | production
DATABASE_URL=postgresql://localhost/bank_aggregator

# Optional — auth cookies (production)
COOKIE_SECURE=true                    # true behind HTTPS
COOKIE_SAMESITE=lax                   # use "none" for cross-site frontends (requires COOKIE_SECURE)
FRONTEND_URL=http://localhost:3000
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Optional — Plaid webhooks (auto-sync on new transactions)
PLAID_WEBHOOK_URL=https://your-host/plaid/webhook

# Optional — Stripe billing (Premium upgrade). If unset, upgrade is disabled.
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...             # a recurring subscription price

# Optional — AI advisor (premium feature). If unset, advisor is disabled.
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-8
```

Run database migrations after installing:

```bash
alembic upgrade head
```

Run the tests:

```bash
pip install -r requirements-dev.txt
pytest
```

2️⃣ Frontend
cd frontend
npm install
npm run dev

Frontend runs at:

http://localhost:3000

Backend runs at:

http://localhost:8000

```
📌 Engineering Principles

Secure by default

Explicit authorization checks

Deterministic SSR rendering

Modular service design

Scalable data modeling

Clear separation of integration layer
