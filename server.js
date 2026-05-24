require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const publicPath = path.join(__dirname, 'public');
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const ADMIN_KEY = process.env.KRON_ADMIN_KEY;
const SESSION_SECRET = process.env.KRON_SESSION_SECRET;
const SESSION_COOKIE = 'kron_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const COOKIE_SECURE =
  process.env.KRON_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';

function requireSecret(name, value, minLength) {
  if (!value || value.length < minLength) {
    throw new Error(`${name} must be set and at least ${minLength} characters long`);
  }
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input) {
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function sign(value) {
  return base64Url(crypto.createHmac('sha256', SESSION_SECRET).update(value).digest());
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function safeSecretEqual(left, right) {
  const leftHash = crypto.createHash('sha256').update(String(left)).digest();
  const rightHash = crypto.createHash('sha256').update(String(right)).digest();

  return crypto.timingSafeEqual(leftHash, rightHash);
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, part) => {
    const index = part.indexOf('=');

    if (index === -1) {
      return cookies;
    }

    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    if (name) {
      try {
        cookies[name] = decodeURIComponent(value);
      } catch (err) {
        cookies[name] = value;
      }
    }

    return cookies;
  }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (Number.isInteger(options.maxAge)) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function sessionCookie(value, maxAgeSeconds) {
  return serializeCookie(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: maxAgeSeconds,
    secure: COOKIE_SECURE,
  });
}

function clearSessionCookie() {
  return serializeCookie(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    secure: COOKIE_SECURE,
  });
}

function createSessionValue() {
  const payload = base64Url(
    JSON.stringify({
      role: 'admin',
      exp: Date.now() + SESSION_TTL_MS,
    }),
  );

  return `${payload}.${sign(payload)}`;
}

function readSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies[SESSION_COOKIE];

  if (!raw) {
    return null;
  }

  const [payload, signature] = raw.split('.');

  if (!payload || !signature || !safeEqual(signature, sign(payload))) {
    return null;
  }

  try {
    const session = JSON.parse(fromBase64Url(payload));

    if (session.role !== 'admin' || Number(session.exp) < Date.now()) {
      return null;
    }

    return session;
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const session = readSession(req);

  if (!session) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  req.session = session;
  next();
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function optionalText(body, field, maxLength, errors) {
  const value = body[field];

  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    errors.push(`${field} must be text`);
    return null;
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    errors.push(`${field} must be ${maxLength} characters or less`);
    return null;
  }

  return normalized || null;
}

function validateEventPayload(body) {
  const errors = [];
  const title = optionalText(body, 'title', 120, errors);
  const date = body.date;
  const time = optionalText(body, 'time', 5, errors);
  const rawPriority = body.priority === undefined || body.priority === '' ? 1 : Number(body.priority);
  const priority = Number.isInteger(rawPriority) ? rawPriority : NaN;

  if (!title) {
    errors.push('title is required');
  }

  if (!isIsoDate(date)) {
    errors.push('date must be YYYY-MM-DD');
  }

  if (time !== null && !isTime(time)) {
    errors.push('time must be HH:MM');
  }

  if (![0, 1, 2].includes(priority)) {
    errors.push('priority must be 0, 1, or 2');
  }

  const event = {
    title,
    date,
    time,
    priority,
    symbol: optionalText(body, 'symbol', 20, errors),
    market: optionalText(body, 'market', 40, errors),
    category: optionalText(body, 'category', 40, errors),
    notes: optionalText(body, 'notes', 1000, errors),
  };

  return { event, errors };
}

function validateDateRange(query) {
  const errors = [];
  const filters = [];
  const params = [];

  if (query.from !== undefined) {
    if (!isIsoDate(query.from)) {
      errors.push('from must be YYYY-MM-DD');
    } else {
      filters.push('date >= ?');
      params.push(query.from);
    }
  }

  if (query.to !== undefined) {
    if (!isIsoDate(query.to)) {
      errors.push('to must be YYYY-MM-DD');
    } else {
      filters.push('date <= ?');
      params.push(query.to);
    }
  }

  if (query.from && query.to && query.from > query.to) {
    errors.push('from must be before or equal to to');
  }

  return { errors, filters, params };
}

function validateId(value) {
  if (!/^\d+$/.test(String(value))) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  );
  next();
});

app.use(express.json({ limit: '32kb' }));

app.get('/api/session', (req, res) => {
  res.json({ authenticated: Boolean(readSession(req)) });
});

app.post('/api/auth/login', (req, res) => {
  const body = req.body || {};
  const key = typeof body.key === 'string' ? body.key : '';

  if (!safeSecretEqual(key, ADMIN_KEY)) {
    res.status(401).json({ error: 'invalid_key' });
    return;
  }

  res.setHeader('Set-Cookie', sessionCookie(createSessionValue(), SESSION_TTL_MS / 1000));
  res.json({ authenticated: true });
});

app.post('/api/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.json({ authenticated: false });
});

app.get(
  '/api/events',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { errors, filters, params } = validateDateRange(req.query);

    if (errors.length) {
      res.status(400).json({ error: 'validation_failed', details: errors });
      return;
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await db.allAsync(
      `
        SELECT
          id,
          title,
          date,
          time,
          CASE WHEN priority IN (0, 1, 2) THEN priority ELSE 1 END AS priority,
          symbol,
          market,
          category,
          notes,
          created_at,
          updated_at
        FROM events
        ${where}
        ORDER BY
          date ASC,
          CASE WHEN time IS NULL OR time = '' THEN 1 ELSE 0 END ASC,
          time ASC,
          priority ASC,
          id ASC
      `,
      params,
    );

    res.json({ events: rows });
  }),
);

app.post(
  '/api/events',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { event, errors } = validateEventPayload(req.body || {});

    if (errors.length) {
      res.status(400).json({ error: 'validation_failed', details: errors });
      return;
    }

    const now = new Date().toISOString();
    const result = await db.runAsync(
      `
        INSERT INTO events (
          title, date, time, priority, symbol, market, category, notes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        event.title,
        event.date,
        event.time,
        event.priority,
        event.symbol,
        event.market,
        event.category,
        event.notes,
        now,
        now,
      ],
    );

    res.status(201).json({ id: result.lastID });
  }),
);

app.delete(
  '/api/events/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = validateId(req.params.id);

    if (!id) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }

    const result = await db.runAsync('DELETE FROM events WHERE id = ?', [id]);

    if (result.changes === 0) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    res.json({ deleted: result.changes });
  }),
);

app.use(express.static(publicPath));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'internal_error' });
});

async function start() {
  requireSecret('KRON_ADMIN_KEY', ADMIN_KEY, 8);
  requireSecret('KRON_SESSION_SECRET', SESSION_SECRET, 24);

  await db.ready;

  const server = app.listen(PORT);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('listening', resolve);
  });

  console.log(`Kron V0 running on port ${PORT}`);
}

if (require.main === module) {
  start().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = app;
