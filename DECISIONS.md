# Kron Decisions

## 2026-05-24 - Establish Kron V0 Secure Calendar Foundation

### Confirmed Decisions
- Build Kron V0 as a private/admin-only trading-calendar app.
- Use the existing Express project as the server foundation.
- Serve a small same-origin UI from Express.
- Use SQLite through `sqlite3` for local event storage.
- Preserve the existing `events` table and make database schema changes additively.
- Keep `date` as the calendar date field.
- Add optional event fields for V0: `time`, `symbol`, `market`, `category`, `notes`, `created_at`, `updated_at`.
- Use signed HttpOnly cookies for private admin sessions.
- Store no API keys or admin secrets in browser storage.
- Require environment variable names `KRON_ADMIN_KEY` and `KRON_SESSION_SECRET`.
- Target Node 24 and npm 11.
- Add `.nvmrc` with `24`.
- Ignore `node_modules/`, `.env`, and `*.db`.
- Remove `node_modules` from Git tracking.
- Commit `package-lock.json` and do not commit `node_modules`.
- Keep AI, OCR, external imports, market APIs, and public user accounts out of V0.

### Rationale
- Private/admin-only scope reduces V0 security scope and product complexity.
- Same-origin UI avoids CORS and external frontend deployment concerns.
- Signed HttpOnly cookies avoid browser-stored secrets.
- SQLite is sufficient for a controlled local/private V0 and keeps setup simple.
- Additive schema changes reduce risk to existing event data.
- Node 24/npm 11 aligns the project with a modern supported runtime.
- Keeping `node_modules` out of Git makes the repository smaller and reproducible from the lockfile.

### Assumptions
- Kron is not yet a public SaaS product.
- V0 users are trusted admins.
- Event data is manually entered and private.
- Deployment, account management, API integrations, and automation are later-version work.

### Follow-Up Decisions Needed Later
- Whether to add public user accounts or keep single-admin mode.
- Whether to add server-side session storage and session revocation.
- Whether to add event editing.
- Whether to add notifications or reminders.
- Whether to add market data integrations.
- Whether to add imports, OCR, or AI-assisted workflows.
- Whether to add automated database backups.
