# TODO — to take Cashism from MVP to production

The app is a working MVP: sign up → connect a bank (Plaid sandbox) → consolidated
dashboard, analytics, AI advisor, settings, and data controls. Everything below
is either **blocked on an external key/account** or is **infra/hardening** for a
real launch. Each item says exactly what to do.

## 🔑 Blocked on external keys / accounts

### Plaid — production access (currently sandbox)
- Today: `PLAID_ENV=sandbox`, test creds `user_good` / `pass_good`.
- **Do:** request Production access in the Plaid Dashboard, then set
  `PLAID_CLIENT_ID` / `PLAID_SECRET` to the production keys and
  `PLAID_ENV=production` in `backend/.env`.

### Plaid — webhooks (auto-sync)
- **Do:** set `PLAID_WEBHOOK_URL` to a public HTTPS URL pointing at
  `/plaid/webhook`. **TODO in code:** verify the Plaid webhook JWT before acting
  (see the note in `backend/app/routes/plaid_sync.py` → `plaid_webhook`). Until
  then the endpoint only re-syncs item_ids it already owns (low risk), but JWT
  verification is required before production.

### Stripe — Premium subscriptions
- Today: upgrade flow returns 503 when unset (handled gracefully).
- **Do:** create a Stripe account, a recurring **Price**, and a **webhook**
  (events `checkout.session.completed`, `customer.subscription.deleted`) pointing
  at `/billing/webhook`. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
  `STRIPE_WEBHOOK_SECRET`.

### Anthropic — AI advisor ✅ (key added)
- Working. Note ongoing API cost; tune `ANTHROPIC_MODEL` if needed.

### Email — password reset & verification (NOT built)
- **Do:** pick a provider (SES / SendGrid / Postmark), add an email client, and
  build: (1) email-verification on signup, (2) forgot/reset-password flow with
  single-use, expiring tokens. Needs an `EMAIL_API_KEY` + `FROM` address.

## 🛡️ Security hardening (GLBA Safeguards — see COMPLIANCE.md)
- **HTTPS in prod:** set `ENVIRONMENT=production`, `COOKIE_SECURE=true` (HSTS then
  turns on automatically). Terminate TLS at a load balancer / reverse proxy.
- **Client IP behind a proxy:** make the rate limiter read `X-Forwarded-For`
  (see `backend/app/core/middleware.py`).
- **Rate limiting at scale:** the limiter is in-memory per process. **Do:** back
  it with Redis for multi-instance deployments.
- **Secrets management:** move `SECRET_KEY` / `FERNET_KEY` / provider keys out of
  `.env` into a managed secrets store; add a key-rotation plan.
- **Database encryption at rest:** enable on your managed Postgres (balances and
  transactions are otherwise plaintext at rest).
- **MFA / 2FA (NOT built):** add TOTP enrollment + a verification step at login
  and recovery codes (`pyotp` covers the crypto; needs UI + storage).
- **Audit logging:** events are logged to stdout (`cashism.audit`). **Do:**
  persist to an append-only table and ship to a SIEM for retention.

## 🗃️ Schema / migrations
- The Alembic chain has **no initial create-tables migration**; the app builds
  its schema via `create_all` on startup. **Do:** add an initial migration so
  `alembic upgrade head` provisions an empty DB for fully migration-managed
  deploys. (CI works today via create_all + `alembic stamp head`.)

## ✨ Product polish (post-MVP, no keys required)
- Budgets / savings goals, spending alerts & notifications.
- Net-worth history is point-in-time per day; add weekly/monthly rollups.
- Accessibility (WCAG) audit; clear the frontend ESLint backlog so lint can
  become a blocking CI gate.
- Remove the unused manual `POST /transactions/{account_id}` endpoint (a
  pre-Plaid leftover that doesn't fit the read-only aggregator model).
