# Cashism

### Personal financial aggregation platform

Cashism securely connects your financial accounts (via Plaid) and gives you one
consolidated view of your money — net worth, balances, transactions, cash-flow
and spending analytics, and an optional AI advisor. It is **read-only**: it never
moves, holds, or transfers funds.

> **Status:** working MVP. Runs end-to-end locally; see [TODO.md](TODO.md) for the
> remaining key/infra work before a public launch, and [COMPLIANCE.md](COMPLIANCE.md)
> for the fintech compliance checklist.

---

## 🚀 Tech stack

**Backend** — FastAPI · PostgreSQL · SQLAlchemy · Alembic · Plaid · Stripe ·
Anthropic (AI advisor) · JWT httpOnly-cookie auth with refresh-token rotation ·
Fernet-encrypted credential storage.

**Frontend** — Next.js (App Router) · TailwindCSS · Recharts.

**Ops** — Docker / docker-compose · GitHub Actions CI + security scanning
(CodeQL, Bandit, gitleaks, dependency audit) · Dependabot.

---

## 💳 Features

- **Secure bank linking** via Plaid (credentials never touch the app; access
  tokens encrypted at rest).
- **Incremental sync** using Plaid `/transactions/sync` (cursor-based) + webhook
  auto-sync; each transaction mapped to its correct account.
- **Dashboard** — net worth (assets − liabilities), per-account balances, and a
  net-worth-over-time chart.
- **Accounts** — transaction list with date/search filters, pagination, and a
  spending-by-category breakdown.
- **Analysis** — recurring bills & income detection, liquidity/solvency, and
  (Premium) debt, profitability, and a multi-horizon forecast.
- **AI advisor** (Premium) — a tool-using Claude agent that answers questions
  grounded in your own data. Informational only, not financial advice.
- **Billing** — Stripe subscriptions for Premium.
- **Settings & data rights** — change password, sign out everywhere, disconnect
  an institution, **export all your data**, and **delete your account**.
- **Security** — refresh-token rotation with reuse detection, security headers,
  auth rate limiting, audit logging, and a health check.

---

## 🏃 Quickstart

### Option A — Docker (everything, one command)

```bash
cp backend/.env.example backend/.env    # fill in keys you have (see TODO.md)
docker compose up --build
```

Then open **http://localhost:3000**. (Backend on `:8001`, Postgres on `:5432`.)

### Option B — run locally

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                    # fill in SECRET_KEY, FERNET_KEY, Plaid, etc.
uvicorn app.main:app --reload --port 8001

# Frontend (new terminal)
cd frontend
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001 npm run dev
```

Open **http://localhost:3000** (use `localhost`, not `127.0.0.1`, so cookie auth
stays same-site with the API). The database schema is created automatically on
backend startup.

**Plaid sandbox:** when connecting a bank, use `user_good` / `pass_good`.

---

## ⚙️ Configuration

All settings are environment variables — see **[backend/.env.example](backend/.env.example)**
for the full list. Required: `SECRET_KEY`, `FERNET_KEY`, `DATABASE_URL`, and Plaid
keys. Optional (degrade gracefully if unset): `STRIPE_*` (billing),
`ANTHROPIC_API_KEY` (AI advisor), `PLAID_WEBHOOK_URL` (auto-sync).

---

## 🧪 Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

CI runs the test suite (against a Postgres service), the frontend build, and a
security suite (CodeQL, Bandit, gitleaks, pip-audit/npm-audit, dependency review)
on every PR.

---

## 📚 More

- [COMPLIANCE.md](COMPLIANCE.md) — fintech compliance & ethics checklist (not legal advice)
- [TODO.md](TODO.md) — what's left for production, with instructions
