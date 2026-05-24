# Kron Agent Instructions

## Confirmed Project Context
- Kron is a private trading-calendar app.
- Current baseline is Kron V0: a secure calendar foundation with manual event entry.
- Runtime target is Node 24 and npm 11.
- The app is an Express server with a same-origin static UI and SQLite storage.
- Latest committed foundation checkpoint: `eee65c9 Build Kron V0 secure calendar foundation`.

## Operating Rules
- Inspect before changing files.
- Report findings and proposed changes before acting when the request is not already explicit.
- Make only approved changes.
- Do not modify source code, database schema, dependencies, authentication, security logic, or Git history without explicit approval.
- Do not commit, push, stage, install, migrate, or delete files unless explicitly approved.
- Keep changes small, controlled, and aligned with the existing codebase.

## Security Rules
- Never include real secrets, passwords, API keys, tokens, `.env` contents, `kron.db` contents, private events, or private trading data in code or docs.
- Refer to environment variables by name only.
- Required private runtime variables are:
  - `KRON_ADMIN_KEY`
  - `KRON_SESSION_SECRET`
- Optional runtime variables include:
  - `KRON_COOKIE_SECURE`
  - `PORT`
- Treat authentication, authorization, database access, dependency changes, and deployment configuration as approval-required work.

## Git And File Hygiene
- `node_modules/`, `.env`, and `*.db` must remain ignored.
- `node_modules` must not be committed.
- `kron.db` must not be committed.
- `package-lock.json` should be committed when dependencies are intentionally changed.
- Use clear professional commit messages.

## Safe Checks
- Syntax check:
  ```bash
  npm test
  ```
- Security audit:
  ```bash
  npm audit
  ```
- Status inspection:
  ```bash
  git status --short --ignored
  ```

## Assumptions
- V0 remains private/admin-only until a later approved version changes that.
- Calendar events are manually entered trading-related events.
- AI, OCR, imports, external market APIs, and public user accounts are out of scope for V0.
