import { wrap, send, requireRole } from './_lib.js';

// Проверка Telegram из режима мастера: какой бот, и доходит ли сообщение
export default wrap(async (req, res) => {
  if (!requireRole(req, res, 'admin')) return;
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chat = (process.env.TELEGRAM_OWNER_ID || process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!token) return send(res, 200, { ok: false, hint: 'Нет TELEGRAM_BOT_TOKEN в Vercel' });
  if (!chat) return send(res, 200, { ok: false, hint: 'Нет TELEGRAM_OWNER_ID в Vercel' });

  const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json()).catch(() => ({}));
  if (!me.ok) return send(res, 200, { ok: false, hint: `Токен бота не подходит: ${me.description || 'нет ответа'}` });
  const bot = '@' + me.result.username;

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: '✅ Тест: «Печать Дома» подключена к Telegram' }),
  }).then((x) => x.json()).catch(() => ({}));

  if (r.ok) return send(res, 200, { ok: true, bot, hint: `Сообщение отправлено через ${bot}` });

  const d = r.description || 'неизвестная ошибка';
  let hint = d;
  if (/chat not found/i.test(d)) hint = `Бот ${bot} не видит твой чат. Открой ${bot} в Telegram, нажми /start и проверь, что TELEGRAM_OWNER_ID — твой числовой ID (узнать у @userinfobot).`;
  else if (/blocked/i.test(d)) hint = `Ты заблокировал ${bot}. Разблокируй его и нажми /start.`;
  return send(res, 200, { ok: false, bot, hint, error: d, idLooksNumeric: /^-?\d+$/.test(chat) });
});
