import { wrap, send, body, db, ensureSchema, requireRole, clean, cleanUrl } from './_lib.js';

// Свои модели, которые админ добавляет в каталог (поверх встроенных)
export default wrap(async (req, res) => {
  if (!requireRole(req, res)) return;
  await ensureSchema();
  const sql = db();

  if (req.method === 'GET') {
    const items = await sql`SELECT * FROM catalog_custom ORDER BY created_at DESC`;
    return send(res, 200, { items });
  }

  if (!requireRole(req, res, 'admin')) return;
  const b = await body(req);

  if (req.method === 'POST') {
    const title = clean(b.title, 80);
    if (!title) return send(res, 400, { error: 'Нужно название' });
    const [item] = await sql`
      INSERT INTO catalog_custom (title, category, emoji, image_url, model_url, hours)
      VALUES (${title}, ${clean(b.category, 30) || 'Разное'}, ${clean(b.emoji, 8) || '✨'},
              ${cleanUrl(b.image_url)}, ${cleanUrl(b.model_url)},
              ${Math.min(Math.max(Number(b.hours) || 1, 0.25), 48)})
      RETURNING *`;
    return send(res, 201, { item });
  }

  if (req.method === 'DELETE') {
    const id = parseInt(b.id ?? req.query?.id, 10);
    await sql`DELETE FROM catalog_custom WHERE id = ${id}`;
    return send(res, 200, { ok: true });
  }

  return send(res, 405, { error: 'Метод не поддерживается' });
});
