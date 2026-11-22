import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';

/* ---------- env ---------- */
export const SITE_PASSWORD = process.env.SITE_PASSWORD || '676912';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const OWNER_ID = (process.env.TELEGRAM_OWNER_ID || process.env.TELEGRAM_CHAT_ID || '').trim();
const DB_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  '';
const SECRET =
  process.env.AUTH_SECRET ||
  crypto.createHash('sha256').update(`pq:${SITE_PASSWORD}:${ADMIN_PASSWORD}:${BOT_TOKEN}:${DB_URL}`).digest('hex');

/* ---------- db ---------- */
let _sql = null;
let _ready = null;

export function db() {
  if (!DB_URL) {
    const e = new Error('База не подключена: добавь DATABASE_URL (Neon) в Vercel');
    e.status = 500;
    throw e;
  }
  if (!_sql) _sql = neon(DB_URL);
  return _sql;
}

export async function ensureSchema() {
  if (_ready) return _ready;
  const sql = db();
  _ready = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS print_queue (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      model_title TEXT NOT NULL,
      model_url TEXT,
      emoji TEXT,
      color TEXT,
      qty INT NOT NULL DEFAULT 1,
      comment TEXT,
      hours NUMERIC(6,2) NOT NULL DEFAULT 1,
      priority INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'queued',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ
    )`;
    await sql`CREATE TABLE IF NOT EXISTS catalog_custom (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Разное',
      emoji TEXT,
      image_url TEXT,
      model_url TEXT,
      hours NUMERIC(6,2) NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS login_fails (
      ip TEXT NOT NULL,
      at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  })().catch((e) => {
    _ready = null;
    throw e;
  });
  return _ready;
}

/* ---------- auth ---------- */
const b64u = (s) => Buffer.from(s).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

export function makeToken(role, days = 60) {
  const payload = b64u(JSON.stringify({ r: role, e: Date.now() + days * 864e5 }));
  return `${payload}.${sign(payload)}`;
}

export function readToken(req) {
  const h = req.headers['authorization'] || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  const [payload, sig] = t.split('.');
  if (!payload || !sig) return null;
  const good = sign(payload);
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!p.e || p.e < Date.now()) return null;
    return p.r;
  } catch {
    return null;
  }
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function requireRole(req, res, role = 'user') {
  const r = readToken(req);
  if (!r || (role === 'admin' && r !== 'admin')) {
    send(res, 401, { error: role === 'admin' ? 'Нужен режим админа' : 'Нужно войти' });
    return null;
  }
  return r;
}

export function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
}

/* ---------- helpers ---------- */
export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { return {}; }
}

export const clean = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

export function cleanUrl(v) {
  const s = clean(v, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export function wrap(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error(e);
      send(res, e.status || 500, { error: e.status ? e.message : 'Ошибка сервера: ' + (e.message || e) });
    }
  };
}

/* ---------- telegram ---------- */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function telegram(lines) {
  if (!BOT_TOKEN || !OWNER_ID) return { ok: false, skipped: true };
  const text = lines.filter((l) => l !== null && l !== undefined && l !== false).join('\n');
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: OWNER_ID, text, parse_mode: 'HTML', disable_web_page_preview: false }),
    });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) console.error('telegram error', j);
    return { ok: !!j.ok };
  } catch (e) {
    console.error('telegram fail', e);
    return { ok: false };
  }
}
telegram.esc = esc;
