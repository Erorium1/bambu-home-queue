import {
  wrap, send, body, db, ensureSchema, makeToken, readToken, safeEqual, clientIp,
  SITE_PASSWORD, ADMIN_PASSWORD,
} from './_lib.js';

const MAX_FAILS = 12; // за 15 минут с одного IP

export default wrap(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const { password = '', mode = 'user' } = await body(req);
  await ensureSchema();
  const sql = db();
  const ip = clientIp(req);

  const [{ n }] = await sql`SELECT count(*)::int AS n FROM login_fails WHERE ip = ${ip} AND at > now() - interval '15 minutes'`;
  if (n >= MAX_FAILS) return send(res, 429, { error: 'Слишком много попыток. Подожди 15 минут ⏳' });

  if (mode === 'admin') {
    // в админа можно зайти только уже залогиненным
    if (!readToken(req)) return send(res, 401, { error: 'Сначала войди на сайт' });
    if (!ADMIN_PASSWORD) return send(res, 400, { error: 'ADMIN_PASSWORD не задан в Vercel' });
    if (!safeEqual(password, ADMIN_PASSWORD)) {
      await sql`INSERT INTO login_fails (ip) VALUES (${ip})`;
      return send(res, 401, { error: 'Неверный пароль админа' });
    }
    return send(res, 200, { token: makeToken('admin', 30), role: 'admin' });
  }

  if (!safeEqual(String(password).trim(), SITE_PASSWORD)) {
    await sql`INSERT INTO login_fails (ip) VALUES (${ip})`;
    await sql`DELETE FROM login_fails WHERE at < now() - interval '1 day'`;
    await new Promise((r) => setTimeout(r, 600));
    return send(res, 401, { error: 'Неверный пароль' });
  }
  return send(res, 200, { token: makeToken('user', 90), role: 'user' });
});
