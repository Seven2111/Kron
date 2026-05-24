# Kron Handoff

## Confirmed Facts
- Project name: Kron.
- Current version baseline: Kron V0 secure calendar foundation.
- Latest foundation commit: `eee65c9 Build Kron V0 secure calendar foundation`.
- Runtime target: Node 24, npm 11.
- Current app stack:
  - Express server in `server.js`
  - SQLite database access in `db.js`
  - Static same-origin UI under `public/`
  - Runtime dependencies managed by `package.json` and `package-lock.json`
- Local ignored files include `.env`, `kron.db`, and `node_modules/`.

## Current Functionality
- Private admin login.
- Signed HttpOnly cookie session.
- Same-origin browser UI.
- Weekly calendar and agenda view.
- Manual event creation.
- Event listing by date range.
- Event deletion.
- Priority display values: `0`, `1`, `2`.

## Runtime Environment
Required environment variable names:
- `KRON_ADMIN_KEY`
- `KRON_SESSION_SECRET`

Optional environment variable names:
- `KRON_COOKIE_SECURE`
- `PORT`

No real environment values are recorded in this handoff.

## API Surface
- `GET /api/session`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /api/events`
- `DELETE /api/events/:id`

Event routes are protected by the admin session.

## Database State
- Database file: `kron.db`
- Database file is ignored and must not be committed.
- Main table: `events`
- Confirmed columns:
  - `id`
  - `title`
  - `date`
  - `time`
  - `priority`
  - `symbol`
  - `market`
  - `category`
  - `notes`
  - `created_at`
  - `updated_at`
- Schema changes in V0 were additive and intended to preserve existing rows.
- No private database contents are recorded here.

## Validation And Security
- `title` is required and length-limited.
- `date` must be ISO `YYYY-MM-DD`.
- `time` is optional and must be `HH:MM` when present.
- `priority` must be `0`, `1`, or `2`.
- Optional text fields are length-limited.
- Security headers are set in `server.js`.
- Browser-stored API keys are not used.
- External scripts, fonts, AI calls, OCR, and API-key entry are out of scope for V0.

## Verification Completed
- `npm test` passed under Node `v24.16.0` and npm `11.13.0`.
- `npm audit` reported `0 vulnerabilities` after dependency audit fixes.
- Post-commit status was clean except ignored `kron.db` and `node_modules/`.

## Known Risks
- V0 uses a single private admin key, not full user accounts.
- Session invalidation is cookie-expiry based; there is no server-side session store.
- `kron.db` is local SQLite state and requires separate backup handling.
- Documentation must be updated as future versions change architecture or security decisions.

## Assumptions
- Kron remains a local/private admin-controlled tool until explicitly redesigned.
- Trading events are manually entered in V0.
- Future market-data, AI, OCR, import, notification, and multi-user features require separate planning and approval.

## Next Recommended Action
- Plan Kron V1 scope before adding features.
- Keep V1 changes small and review security/database impact before implementation.
