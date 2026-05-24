# Kron

Kron V0 is a private local trading-calendar foundation. It provides an
admin-key login, a same-origin web UI, and protected event APIs for manually
entered trading-related calendar events.

Kron V0 is not production-ready multi-user software. It is a controlled base for
future versions.

## Runtime Requirements

- Node.js 24
- npm 11

Use the project runtime target:

```bash
nvm use
node -v
npm -v
```

Expected versions are Node `>=24 <25` and npm `>=11 <12`.

## Setup

Install dependencies from the committed lockfile:

```bash
npm ci
```

Create a local environment file:

```bash
cp .env.example .env
```

Edit `.env` locally and replace placeholder values. Do not commit `.env`.

Required environment variables:

- `PORT`
- `KRON_ADMIN_KEY`
- `KRON_SESSION_SECRET`
- `KRON_COOKIE_SECURE`

`KRON_ADMIN_KEY` must be at least 8 characters. `KRON_SESSION_SECRET` must be at
least 24 characters.

## Run

```bash
npm start
```

By default, open:

```text
http://localhost:3000
```

## Test

Run syntax checks:

```bash
npm test
```

Run the dependency security audit:

```bash
npm audit
```

Use `TESTING.md` for the manual V0 verification checklist.

## V0 Features

- Private admin login using `KRON_ADMIN_KEY`.
- Signed HttpOnly session cookie using `KRON_SESSION_SECRET`.
- Same-origin browser UI served by Express.
- Protected create, list, and delete event routes.
- Weekly calendar and agenda views.
- Manual trading event entry.
- Event priority values: `0`, `1`, `2`.
- Local SQLite database using `kron.db`.
- Basic security headers and same-origin content policy.

## V0 Limitations

- Single private admin mode only.
- No public accounts.
- No edit-event flow.
- No AI, OCR, imports, external market APIs, or browser API-key entry.
- No production deployment configuration.
- No server-side session store.
- No login rate limiting.
- No month view or advanced calendar navigation.

Edit-event support can wait until after V0 unless the V0 acceptance definition
changes.

## Security Notes

- Keep `.env` private and local.
- Keep `kron.db` private and local.
- Do not commit API keys, passwords, tokens, private events, or trading data.
- The app stores sessions in signed HttpOnly cookies.
- `KRON_COOKIE_SECURE=true` should be used when serving over HTTPS.
- V0 is suitable for private local/admin-key use, not internet-exposed
  production use.
