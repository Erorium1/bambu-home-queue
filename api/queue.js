import {
  wrap, send, body, db, ensureSchema, requireRole, clean, cleanUrl, telegram,
} from './_lib.js';
import { normalizeUrl, getPreview } from './preview.js';

const ORDER_ACTIVE = (sql) => sql`
  SELECT * FROM print_queue
  WHERE status IN ('queued','printing')
  ORDER BY (status = 'printing') DESC, priority DESC, created_at ASC`;

export default wrap(async (req, res) => {
  const role = requireRole(req, res);
  if (!role) return;
  await ensureSchema();
  const sql = db();

  /* ---------- список ---------- */
  if (req.method === 'GET') {
    const active = await ORDER_ACTIVE(sql);
    const done = await sql`
      SELECT * FROM print_queue WHERE status IN ('done','cancelled')
      ORDER BY coalesce(finished_at, created_at) DESC LIMIT 40`;
    const [stats] = await sql`
      SELECT
        count(*) FILTER (WHERE status = 'done')::int AS done_total,
        coalesce(sum(hours * qty) FILTER (WHERE status = 'done'), 0)::float AS done_hours
      FROM print_queue`;
    return send(res, 200, { role, active, done, stats });
  }

  /* ---------- новая заявка ---------- */
  if (req.method === 'POST') {
    const b = await body(req);
    const name = clean(b.name, 40);
    const model_title = clean(b.model_title, 120);
    if (!name) return send(res, 400, { error: 'Напиши своё имя' });
    if (!model_title) return send(res, 400, { error: 'Выбери модель' });
    const qty = Math.min(Math.max(parseInt(b.qty, 10) || 1, 1), 10);
    const hours = Math.min(Math.max(Number(b.hours) || 1, 0.25), 48);
    const model_url = cleanUrl(b.model_url);
    const emoji = clean(b.emoji, 8) || '🧩';
    let image_url = cleanUrl(b.image_url);
    if (!image_url && model_url && normalizeUrl(model_url)) {
      try { image_url = (await getPreview(normalizeUrl(model_url))).image || null; } catch {}
    }
    const color = clean(b.color, 40) || 'Любой';
    const comment = clean(b.comment, 300);

    if (role !== 'admin') {
      const [{ mine }] = await sql`
        SELECT count(*)::int AS mine FROM print_queue
        WHERE status IN ('queued','printing') AND lower(name) = lower(${name})`;
      if (mine >= 3) return send(res, 429, { error: `${name}, у тебя уже 3 заявки в очереди. Дождись, пока напечатается хоть одна 🙂` });
      const [{ total }] = await sql`SELECT count(*)::int AS total FROM print_queue WHERE status IN ('queued','printing')`;
      if (total >= 60) return send(res, 429, { error: 'Очередь переполнена, попробуй позже' });
    }

    const [row] = await sql`
      INSERT INTO print_queue (name, model_title, model_url, emoji, color, qty, comment, hours, image_url)
      VALUES (${name}, ${model_title}, ${model_url}, ${emoji}, ${color}, ${qty}, ${comment || null}, ${hours}, ${image_url})
      RETURNING *`;

    const active = await ORDER_ACTIVE(sql);
    const pos = active.findIndex((r) => r.id === row.id) + 1;
    const ahead = active.slice(0, Math.max(pos - 1, 0)).reduce((s, r) => s + Number(r.hours) * r.qty, 0);
    const e = telegram.esc;

    const tg = await telegram([
      `🆕 <b>Новая заявка на печать</b>`,
      ``,
      `👤 <b>${e(name)}</b>`,
      `🧩 ${e(model_title)}${qty > 1 ? ` × ${qty}` : ''}`,
      `🎨 Цвет: ${e(color)}`,
      `⏱ ~${fmtH(hours * qty)}`,
      comment ? `💬 ${e(comment)}` : null,
      model_url ? `🔗 ${e(model_url)}` : null,
      ``,
      `📍 Место в очереди: <b>#${pos}</b> из ${active.length}`,
      ahead > 0 ? `⌛ Перед ней ещё ~${fmtH(ahead)} печати` : `⚡ Можно запускать сразу!`,
    ], image_url);

    return send(res, 201, { item: row, position: pos, telegram: tg.ok });
  }

  /* ---------- управление (админ) ---------- */
  if (req.method === 'PATCH' || req.method === 'DELETE') {
    if (!requireRole(req, res, 'admin')) return;
    const b = await body(req);
    const id = parseInt(b.id ?? req.query?.id, 10);
    if (!id) return send(res, 400, { error: 'Нет id' });

    if (req.method === 'DELETE') {
      await sql`DELETE FROM print_queue WHERE id = ${id}`;
      return send(res, 200, { ok: true });
    }

    const action = b.action;
    let row;
    if (action === 'start') {
      [row] = await sql`UPDATE print_queue SET status = 'printing', started_at = now() WHERE id = ${id} RETURNING *`;
    } else if (action === 'done') {
      [row] = await sql`UPDATE print_queue SET status = 'done', finished_at = now() WHERE id = ${id} RETURNING *`;
    } else if (action === 'cancel') {
      [row] = await sql`UPDATE print_queue SET status = 'cancelled', finished_at = now() WHERE id = ${id} RETURNING *`;
    } else if (action === 'back') {
      [row] = await sql`UPDATE print_queue SET status = 'queued', started_at = NULL, finished_at = NULL WHERE id = ${id} RETURNING *`;
    } else if (action === 'up') {
      const [{ top }] = await sql`SELECT coalesce(max(priority), 0)::int AS top FROM print_queue WHERE status = 'queued'`;
      [row] = await sql`UPDATE print_queue SET priority = ${top + 1} WHERE id = ${id} RETURNING *`;
    } else {
      return send(res, 400, { error: 'Неизвестное действие' });
    }
    if (!row) return send(res, 404, { error: 'Заявка не найдена' });

    if (action === 'done') {
      const e = telegram.esc;
      await telegram([`✅ Готово: <b>${e(row.model_title)}</b> для <b>${e(row.name)}</b>`]);
    }
    return send(res, 200, { item: row });
  }

  return send(res, 405, { error: 'Метод не поддерживается' });
});

function fmtH(h) {
  const m = Math.round(h * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  if (!hh) return `${mm} мин`;
  return mm ? `${hh} ч ${mm} мин` : `${hh} ч`;
}
