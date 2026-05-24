# Kron V0 Testing Checklist

Run these checks with Node 24/npm 11 active:

```bash
nvm use
node -v
npm -v
```

## Automated Checks

```bash
npm test
npm audit
```

Expected result:

- `npm test` passes.
- `npm audit` reports `0 vulnerabilities`.

## Manual Server Start

Use local placeholder-free values in `.env`, then start the app:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Login And Logout

1. Open the app in a browser.
2. Confirm the login screen appears before any calendar data is shown.
3. Enter an invalid admin key.
4. Confirm login fails.
5. Enter the local `KRON_ADMIN_KEY`.
6. Confirm the calendar UI loads.
7. Use logout.
8. Confirm the app returns to the login screen.

## Create, List, And Delete Event

1. Log in.
2. Create an event with a valid title, date, optional time, symbol, market,
   category, notes, and priority.
3. Confirm the event appears in the agenda.
4. Confirm the event appears on the matching calendar date.
5. Delete the event.
6. Confirm the event is removed from the agenda and calendar.

## Protected API

With the server running, verify unauthenticated event access is blocked:

```bash
node -e "fetch('http://127.0.0.1:3000/api/events').then(async r => { console.log(r.status); console.log(await r.text()); })"
```

Expected result:

- Status `401`.

## Invalid Payload

After logging in through the browser, submit invalid values through the UI or an
authenticated API client:

- Empty `title`.
- `title` longer than 120 characters.
- Invalid `date`.
- Invalid `time`.
- Priority outside `0`, `1`, or `2`.

Expected result:

- Invalid API payloads return status `400`.
- Invalid UI submissions show a controlled error.

## Ignored Files Check

```bash
git status --short --ignored
```

Expected ignored local files:

- `!! kron.db`
- `!! node_modules/`

If `.env` exists locally, it should also appear as ignored:

- `!! .env`

## V0 Acceptance Checklist

- Private admin login works.
- Logout works.
- Unauthenticated event API access returns `401`.
- Valid event create/list/delete works.
- Invalid event payloads return `400`.
- Calendar and agenda show priority values `0`, `1`, and `2`.
- `.env`, `kron.db`, and `node_modules/` are not committed.
- `npm test` passes.
- `npm audit` reports `0 vulnerabilities`.
- README setup instructions are enough to rebuild from a clean clone.
- No real secrets, API keys, passwords, private events, or trading data are in
  committed files.
