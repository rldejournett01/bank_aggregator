# Cashism — Compliance & Ethics Notes

> **Not legal advice.** This is an engineering checklist to help you build responsibly and have an informed conversation with a fintech/privacy attorney. Regulations vary by jurisdiction and change over time. Get qualified counsel before a public launch.

## What Cashism is (this scopes everything below)

A **read-only personal financial aggregator** for US consumers: it connects accounts via Plaid and shows a consolidated view + analytics + an optional AI advisor. **It never moves, holds, or transfers funds.** Staying read-only keeps you out of the most burdensome regimes (money transmission, lending). The moment you add money movement, payments, or lending, a much heavier set of obligations applies — revisit this doc first.

Legend: ✅ implemented · ⚠️ partial · ❌ to do

---

## 1. Honest marketing (FTC Act §5 / CFPB UDAAP)
Deceptive claims are illegal, not just bad form.
- ✅ Removed the false **"SOC 2 compliant"** claim from the auth screens. Only make security/certification claims that are literally true. Don't say "SOC 2", "bank-grade", or "military-grade" unless you can back them.
- ⚠️ Keep all copy (landing page, advisor) accurate about what the product does and doesn't do.

## 2. Privacy & consumer data rights
- ✅ **Privacy Policy** and **Terms of Service** pages (`/privacy`, `/terms`) — *templates; have counsel finalize.*
- ✅ **Explicit consent + 18+ age gate** at signup (checkbox linking Terms/Privacy + Plaid consent).
- ✅ **Right to access / portability** — "Export my data" (`GET /users/me/export`).
- ✅ **Right to deletion** — "Delete my account" erases all data (`DELETE /users/me`).
- ✅ **Right to disconnect** — per-institution disconnect revokes Plaid access + deletes that data (`DELETE /plaid/linked/{item_id}`).
- ❌ **State privacy laws (CCPA/CPRA, VA, CO, CT, …)** — confirm thresholds; even if below them, the controls above are good practice. Add a "Do Not Sell/Share" statement (you don't sell — say so) and a documented data-subject-request process + contact address.
- ❌ **CFPB §1033 (Personal Financial Data Rights / "open banking")** — finalized 2024, phased compliance. Relevant to data aggregators: consent scoping, data minimization, no secondary use without consent, deletion on request. Track the timeline for your size tier.
- ❌ Fill in real contact emails and "last updated" dates in the legal pages.

## 3. Plaid contractual obligations (you must meet these to use Plaid)
- ✅ Never store bank login credentials (Plaid handles auth).
- ✅ Encrypt Plaid access tokens at rest (Fernet).
- ✅ Let users disconnect items (calls Plaid `/item/remove`).
- ⚠️ Publish a privacy policy and obtain user consent (templates added — finalize).
- ❌ Display Plaid's required end-user disclosures where applicable; follow Plaid's Developer Policy data-use limits; don't use Plaid data for anything beyond the user-facing service.

## 4. Security — GLBA Safeguards Rule (FTC, 16 CFR 314)
Aggregators handling consumers' financial data are generally treated as "financial institutions" and must maintain a **written information security program**.
- ✅ Passwords hashed (bcrypt); httpOnly cookie auth with refresh-token rotation + reuse detection.
- ✅ Plaid token encryption at rest; user-scoped data access on every endpoint.
- ✅ CI security scanning (CodeQL, Bandit, secret scanning, dependency audit) + Dependabot.
- ❌ **Multi-factor authentication** for users (Safeguards Rule expects MFA).
- ❌ **Audit logging** of access to financial data + admin actions.
- ❌ **Encryption at rest for the database** (transactions/balances are currently plaintext in Postgres — enable disk/column encryption).
- ❌ **Secrets management** — move `SECRET_KEY`/`FERNET_KEY`/API keys out of `.env` into a managed secrets store for production; key rotation plan.
- ❌ **Written infosec program**: designated qualified individual, risk assessment, access controls, vendor management, **incident response plan**, employee training, annual review.
- ❌ Rate limiting / brute-force protection on auth endpoints.

## 5. Third-party data processors — disclose & contract
- ✅ Disclosed in the Privacy Policy: **Plaid** (aggregation), **Stripe** (payments), **Anthropic** (AI advisor).
- ⚠️ **AI advisor sends financial summaries to Anthropic's API.** This is disclosed; Anthropic's API does not train on this data by default. Ensure a Data Processing Addendum is in place and that users understand it (consent covers it).
- ❌ Execute DPAs/BAAs as needed with each processor; keep a vendor inventory.

## 6. Money transmission / licensing
- ✅ **N/A while read-only** — you never take custody or control of funds, so state money-transmitter licenses (MTLs) generally don't apply. **This is your single biggest compliance advantage — protect it.** Any feature that moves money (transfers, bill pay, payouts) changes this entirely.

## 7. Other
- **FCRA** — N/A: you show users their own data; you're not assembling/furnishing consumer reports to third parties. Don't start reselling data as reports without FCRA analysis.
- **PCI DSS** — Stripe handles card data; you stay in the lightest scope (SAQ-A) as long as card data never touches your servers.
- **Breach notification** — all 50 US states require it; bake notification steps into your incident response plan.
- **Accessibility (WCAG/ADA)** — ⚠️ ethical + increasingly expected; audit the UI.
- **E-SIGN** — consent to electronic communications (fold into Terms acceptance).

---

## Top priorities before a public launch
1. **Finalize Privacy Policy + Terms with counsel** (and real contact info) — required by law and by Plaid.
2. **Stand up the GLBA Safeguards program**: MFA, audit logging, DB encryption at rest, secrets manager, incident response plan, rate limiting.
3. **Confirm Plaid production approval** and that you meet their Developer Policy.
4. **Keep marketing claims true** (done for "SOC 2"; keep it up).
5. **Don't add money movement** without re-doing the licensing analysis.

_Implemented in-app today: honest auth copy, consent + age gate, Privacy/Terms pages, data export, account deletion, per-institution disconnect, processor disclosure (incl. AI), and a security-scanning CI pipeline._
