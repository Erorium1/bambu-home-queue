import { wrap, send, db, ensureSchema, requireRole } from './_lib.js';

// Фото и название по ссылке на модель (MakerWorld, Printables, Thingiverse).
// Результат кешируется в БД, неудачные попытки — на сутки.
const ALLOWED = ['makerworld.com', 'printables.com', 'thingiverse.com'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

function decode(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\\u002F/gi, '/').replace(/\\\//g, '/').trim();
}
function meta(html, prop) {
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'));
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'));
  return decode((a || b || [])[1]);
}

export function normalizeUrl(raw) {
  try {
    const u = new URL(String(raw).trim());
    const host = u.hostname.replace(/^www\./, '');
    if (u.protocol !== 'https:' || !ALLOWED.some((h) => host === h || host.endsWith('.' + h))) return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

export async function fetchPreview(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'ru,en;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(7000),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const html = (await r.text()).slice(0, 1_500_000);
  let image = meta(html, 'og:image') || meta(html, 'twitter:image');
  if (!image) {
    const m = html.match(/"coverUrl"\s*:\s*"([^"]+)"/);
    if (m) image = decode(m[1]);
  }
  let title = meta(html, 'og:title') || decode((html.match(/<title>([^<]+)<\/title>/i) || [])[1]);
  title = title.replace(/\s*[-|–]\s*(MakerWorld|Printables\.com|Thingiverse).*$/i, '').slice(0, 120);
  if (image && image.startsWith('//')) image = 'https:' + image;
  if (image && !/^https:\/\//.test(image)) image = '';
  return { title, image };
}

export async function getPreview(url) {
  await ensureSchema();
  const sql = db();
  const [c] = await sql`SELECT * FROM link_preview WHERE url = ${url}`;
  if (c && (c.ok || Date.now() - new Date(c.fetched_at).getTime() < 864e5)) {
    return { title: c.title || '', image: c.image || '', ok: c.ok, cached: true };
  }
  let p = { title: '', image: '' };
  let ok = false;
  try {
    p = await fetchPreview(url);
    ok = !!p.image;
  } catch (e) {
    console.error('preview fail', url, e.message);
  }
  await sql`
    INSERT INTO link_preview (url, title, image, ok, fetched_at) VALUES (${url}, ${p.title}, ${p.image}, ${ok}, now())
    ON CONFLICT (url) DO UPDATE SET title = EXCLUDED.title, image = EXCLUDED.image, ok = EXCLUDED.ok, fetched_at = now()`;
  return { ...p, ok };
}

export default wrap(async (req, res) => {
  if (!requireRole(req, res)) return;
  const url = normalizeUrl(req.query?.url || new URL(req.url, 'http://x').searchParams.get('url'));
  if (!url) return send(res, 400, { error: 'Нужна ссылка на makerworld.com, printables.com или thingiverse.com' });
  const p = await getPreview(url);
  return send(res, 200, { url, ...p });
});
