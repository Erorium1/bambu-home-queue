import { CATEGORIES, CATALOG, COLORS, mwUrl } from './catalog.js';

/* ================= state ================= */
const LS = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
const S = {
  token: LS.get('pq_token'),
  admin: LS.get('pq_admin'),
  role: 'user',
  active: [],
  done: [],
  stats: { done_total: 0, done_hours: 0 },
  custom: [],
  cat: 'all',
  q: '',
  tab: 'catalog',
  me: LS.get('pq_name') || '',
  lastSync: 0,
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ================= api ================= */
async function api(path, { method = 'GET', data, token } = {}) {
  const t = token ?? S.admin ?? S.token;
  const r = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  });
  let j = {};
  try { j = await r.json(); } catch {}
  if (r.status === 401 && path !== '/api/login') {
    if (S.admin) { S.admin = null; LS.set('pq_admin', null); setAdmin(false); }
    else { logout(); }
  }
  if (!r.ok) throw new Error(j.error || `Ошибка ${r.status}`);
  return j;
}

/* ================= toasts & confetti ================= */
function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('#toasts').append(el);
  setTimeout(() => { el.style.transition = 'opacity .3s, transform .3s'; el.style.opacity = 0; el.style.transform = 'translateY(10px)'; }, 3200);
  setTimeout(() => el.remove(), 3600);
}

function confetti() {
  const c = $('#confetti');
  const ctx = c.getContext('2d');
  const dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const cols = ['#00ae42', '#3dff8e', '#ffd21f', '#ff6fb5', '#5cc8ff', '#ffffff', '#8a4dff'];
  const P = Array.from({ length: 160 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 6,
    w: 6 + Math.random() * 8, h: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    c: cols[(Math.random() * cols.length) | 0],
  }));
  let f = 0;
  (function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    P.forEach((p) => {
      p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    });
    if (++f < 170) requestAnimationFrame(tick); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })();
}

/* ================= helpers ================= */
function fmtH(h) {
  const m = Math.max(0, Math.round(h * 60));
  const hh = Math.floor(m / 60), mm = m % 60;
  if (!hh) return `${mm} мин`;
  return mm ? `${hh} ч ${mm} мин` : `${hh} ч`;
}
function shortH(h) {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} мин`;
  return `${Math.round(h * 10) / 10} ч`.replace('.', ',');
}
function ago(ts) {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return 'только что';
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч назад`;
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
function nameColor(n) {
  let h = 0;
  for (const ch of String(n).toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 85% 62%)`;
}
function swatch(colorName) {
  const c = COLORS.find((x) => x.n === colorName);
  if (!c || c.v === 'any') return '<i class="swatch any"></i>';
  if (c.v === 'multi') return '<i class="swatch multi"></i>';
  return `<i class="swatch" style="background:${c.v}"></i>`;
}
const total = (r) => Number(r.hours) * (r.qty || 1);
function remainingOf(r) {
  if (r.status !== 'printing' || !r.started_at) return total(r);
  const el = (Date.now() - new Date(r.started_at).getTime()) / 36e5;
  return Math.max(total(r) - el, 0.05);
}
function allModels() {
  const custom = S.custom.map((m) => ({
    id: `c${m.id}`, dbId: m.id, t: m.title, c: catIdFromLabel(m.category), e: m.emoji || '✨',
    h: Number(m.hours) || 1, lvl: Number(m.hours) > 4 ? 3 : Number(m.hours) > 1.5 ? 2 : 1,
    url: m.model_url, img: m.image_url, d: 'Добавлено мастером', hue: 150, custom: true,
  }));
  return [...custom, ...CATALOG.map((m) => ({ ...m, url: mwUrl(m.q) }))];
}
function catIdFromLabel(l) { return (CATEGORIES.find((c) => c.label === l || c.id === l) || { id: 'other' }).id; }

/* ================= login ================= */
let pin = '';
function showLogin() {
  $('#app').hidden = true;
  $('#login').hidden = false;
  pin = ''; drawPin();
  animatePct();
}
function drawPin() {
  $$('#pinDots i').forEach((d, i) => d.classList.toggle('f', i < pin.length));
}
async function tryLogin() {
  const dots = $('#pinDots');
  try {
    const j = await api('/api/login', { method: 'POST', data: { password: pin }, token: '' });
    dots.classList.add('ok');
    S.token = j.token; LS.set('pq_token', j.token);
    setTimeout(() => { dots.classList.remove('ok'); startApp(); }, 450);
  } catch (e) {
    $('#pinErr').textContent = e.message;
    dots.classList.add('shake');
    navigator.vibrate?.(120);
    setTimeout(() => { dots.classList.remove('shake'); pin = ''; drawPin(); }, 500);
  }
}
function pinKey(k) {
  $('#pinErr').textContent = '';
  if (k === 'del') pin = pin.slice(0, -1);
  else if (k === 'clr') pin = '';
  else if (/^\d$/.test(k) && pin.length < 6) pin += k;
  drawPin();
  if (pin.length === 6) tryLogin();
}
$('#pinpad').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) pinKey(b.dataset.k); });
document.addEventListener('keydown', (e) => {
  if ($('#login').hidden) return;
  if (/^\d$/.test(e.key)) pinKey(e.key);
  else if (e.key === 'Backspace') pinKey('del');
  else if (e.key === 'Escape') pinKey('clr');
});
let pctTimer;
function animatePct() {
  clearInterval(pctTimer);
  const start = performance.now();
  pctTimer = setInterval(() => {
    if ($('#login').hidden) return clearInterval(pctTimer);
    const p = Math.floor((((performance.now() - start) / 15600) % 1) * 100);
    $('.pr-pct').textContent = `${p}%`;
  }, 200);
}

function logout() {
  S.token = null; S.admin = null;
  LS.set('pq_token', null); LS.set('pq_admin', null);
  setAdmin(false);
  clearInterval(pollTimer);
  showLogin();
}
$('#logoutBtn').addEventListener('click', logout);

/* ================= app ================= */
let pollTimer;
async function startApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  renderChips();
  renderCatalog();
  moveInk();
  await refresh(true);
  loadCustom();
  clearInterval(pollTimer);
  pollTimer = setInterval(() => { if (!document.hidden) refresh(); }, 20000);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.token) refresh(); });

async function refresh(first) {
  try {
    const j = await api('/api/queue');
    S.active = j.active; S.done = j.done; S.stats = j.stats; S.role = j.role;
    setAdmin(j.role === 'admin');
    S.lastSync = Date.now();
    renderAll();
  } catch (e) {
    if (first) toast(e.message, 'err');
  }
}
async function loadCustom() {
  try { const j = await api('/api/catalog'); S.custom = j.items || []; renderCatalog(); } catch {}
}
function setAdmin(on) {
  document.body.classList.toggle('is-admin', on);
  $('#adminBtn').classList.toggle('on', on);
  $('#adminBtn').title = on ? 'Выйти из режима мастера' : 'Режим мастера';
}

function renderAll() {
  renderStatus(); renderStats(); renderNow(); renderQueue(); renderDone();
  $('#syncInfo').textContent = `обновлено ${new Date(S.lastSync).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

function renderStatus() {
  const p = S.active.find((r) => r.status === 'printing');
  const chip = $('#statusChip');
  chip.classList.toggle('busy', !!p);
  chip.classList.toggle('free', !p);
  $('.txt', chip).textContent = p ? 'Печатает' : S.active.length ? 'Ждёт запуска' : 'Принтер свободен';
}
function renderStats() {
  const queued = S.active.filter((r) => r.status === 'queued').length;
  const wait = S.active.reduce((s, r) => s + remainingOf(r), 0);
  $('[data-s="queued"]').textContent = queued;
  $('[data-s="wait"]').textContent = wait ? shortH(wait) : '0';
  $('[data-s="done"]').textContent = S.stats.done_total || 0;
  $('#qBadge').textContent = S.active.length;
}
function renderNow() {
  const p = S.active.find((r) => r.status === 'printing');
  const box = $('#nowPrinting');
  if (!p) { box.hidden = true; return; }
  box.hidden = false;
  const t = total(p);
  const rem = remainingOf(p);
  const pct = Math.min(99, Math.max(2, Math.round((1 - rem / t) * 100)));
  box.innerHTML = `
    <div class="now-emoji">${esc(p.emoji || '🧩')}</div>
    <div>
      <div class="now-lbl">Сейчас печатается</div>
      <h3>${esc(p.model_title)}${p.qty > 1 ? ` × ${p.qty}` : ''}</h3>
      <div class="who">для <b style="color:${nameColor(p.name)}">${esc(p.name)}</b> · ${swatch(p.color)}${esc(p.color)}</div>
      <div class="prog"><i style="width:${pct}%"></i></div>
    </div>
    <div class="now-eta"><b>${pct}%</b><span>осталось ~${fmtH(rem)}</span></div>`;
}

/* ---------- catalog ---------- */
function renderChips() {
  $('#chips').innerHTML = CATEGORIES.map((c) => `<button class="chip ${S.cat === c.id ? 'on' : ''}" data-cat="${c.id}">${c.icon} ${c.label}</button>`).join('');
  $('#addCat').innerHTML = CATEGORIES.filter((c) => c.id !== 'all').map((c) => `<option>${c.label}</option>`).join('') + '<option>Разное</option>';
}
$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  S.cat = b.dataset.cat;
  $$('.chip').forEach((x) => x.classList.toggle('on', x === b));
  renderCatalog();
});
$('#search').addEventListener('input', (e) => { S.q = e.target.value.trim().toLowerCase(); renderCatalog(); });

function lvlDots(n) { return `<span class="lvl">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'f' : ''}"></i>`).join('')}</span>`; }

function renderCatalog() {
  const items = allModels().filter((m) =>
    (S.cat === 'all' || m.c === S.cat) &&
    (!S.q || m.t.toLowerCase().includes(S.q) || (m.q || '').includes(S.q) || (m.d || '').toLowerCase().includes(S.q)));
  const customCard = `
    <article class="card custom-new" data-custom style="animation-delay:0ms">
      <div class="art"><div class="plus">+</div></div>
      <div class="card-b">
        <h4>Своя модель</h4>
        <p>Нашёл что-то на MakerWorld? Вставь ссылку — напечатаем.</p>
        <div class="card-f"><button class="btn primary">Вставить ссылку</button></div>
      </div>
    </article>`;
  const cards = items.map((m, i) => `
    <article class="card" data-id="${esc(m.id)}" style="--h:${m.hue};animation-delay:${Math.min(i, 16) * 35}ms">
      <div class="art">
        ${m.img ? `<img src="${esc(m.img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
        <span class="emo">${esc(m.e)}</span>
        <div class="tags"><span class="tag">⏱ ${shortH(m.h)}</span><span class="tag">${lvlDots(m.lvl)}</span></div>
      </div>
      ${m.custom ? `<button class="icon-btn del admin-only inline" data-del="${m.dbId}" title="Убрать из каталога">🗑</button>` : ''}
      <div class="card-b">
        <h4>${esc(m.t)}</h4>
        <p>${esc(m.d || '')}</p>
        <div class="card-f">
          <button class="btn primary" data-order>Хочу это!</button>
          ${m.url ? `<a class="btn mw" href="${esc(m.url)}" target="_blank" rel="noopener" title="Посмотреть на MakerWorld">↗</a>` : ''}
        </div>
      </div>
    </article>`).join('');
  $('#grid').innerHTML = customCard + (cards || `<div class="empty"><div class="big">🔍</div>Ничего не нашлось. Попробуй другое слово или вставь свою ссылку.</div>`);
}
$('#grid').addEventListener('click', async (e) => {
  const del = e.target.closest('[data-del]');
  if (del) {
    if (!confirm('Убрать модель из каталога?')) return;
    try { await api('/api/catalog', { method: 'DELETE', data: { id: del.dataset.del } }); toast('Убрано', 'ok'); loadCustom(); } catch (er) { toast(er.message, 'err'); }
    return;
  }
  if (e.target.closest('a')) return;
  if (e.target.closest('[data-custom]')) return openOrder(null);
  const card = e.target.closest('.card[data-id]');
  if (card && (e.target.closest('[data-order]') || e.target.closest('.art'))) {
    openOrder(allModels().find((m) => m.id === card.dataset.id));
  }
});

$('#addModelForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    await api('/api/catalog', { method: 'POST', data });
    e.target.reset(); toast('Модель добавлена в каталог ✨', 'ok'); loadCustom();
  } catch (er) { toast(er.message, 'err'); }
});

/* ---------- order modal ---------- */
function openOrder(model) {
  const isCustom = !model;
  const st = { color: 'Любой', qty: 1 };
  const m = model || { t: '', e: '🔗', h: 2, hue: 150 };
  const body = $('#orderBody');
  body.innerHTML = `
    <div class="o-head">
      <div class="o-art art" style="--h:${m.hue}">${m.img ? `<img src="${esc(m.img)}" alt="">` : `<span class="emo" style="font-size:46px">${esc(m.e)}</span>`}</div>
      <div>
        <h2>${isCustom ? 'Своя модель' : esc(m.t)}</h2>
        <div class="muted">${isCustom ? 'Вставь ссылку с MakerWorld (или любого сайта с моделями)' : `⏱ примерно ${fmtH(m.h)} на 1 шт.`}</div>
      </div>
    </div>
    <form id="orderForm" autocomplete="off">
      ${isCustom ? `
        <div class="field"><label>Ссылка на модель</label><input name="model_url" placeholder="https://makerworld.com/…" required></div>
        <div class="row2 field">
          <div><label>Как называется</label><input name="model_title" placeholder="Например: дракончик" required maxlength="120"></div>
          <div><label>Часов (если знаешь)</label><input name="hours" type="number" min="0.25" max="48" step="0.25" placeholder="2"></div>
        </div>` : ''}
      <div class="row2 field">
        <div><label>Твоё имя</label><input name="name" value="${esc(S.me)}" placeholder="Как тебя зовут?" required maxlength="40"></div>
        <div><label>Сколько штук</label>
          <div class="stepper"><button type="button" data-q="-1">−</button><b id="qtyV">1</b><button type="button" data-q="1">+</button></div>
        </div>
      </div>
      <div class="field"><label>Цвет пластика</label>
        <div class="colors" id="colors">${COLORS.map((c) => `<button type="button" class="col ${c.n === st.color ? 'on' : ''}" data-c="${esc(c.n)}">${swatch(c.n)}${esc(c.n)}</button>`).join('')}</div>
      </div>
      <div class="field"><label>Комментарий</label><textarea name="comment" maxlength="300" placeholder="Размер, надпись на брелке, срочно ли…"></textarea></div>
      <div class="o-sum"><span>В очереди перед тобой: <b>${S.active.length}</b></span><span>Примерно ждать: <b>${fmtH(S.active.reduce((s, r) => s + remainingOf(r), 0))}</b></span></div>
      <button class="btn primary full" type="submit" style="height:54px;font-size:16px">🚀 Встать в очередь</button>
    </form>`;
  const modal = $('#orderModal');
  modal.hidden = false;
  setTimeout(() => (isCustom ? $('[name=model_url]', body) : !S.me ? $('[name=name]', body) : null)?.focus(), 50);

  $('#colors', body).addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    st.color = b.dataset.c;
    $$('.col', body).forEach((x) => x.classList.toggle('on', x === b));
  });
  $$('[data-q]', body).forEach((b) => b.addEventListener('click', () => {
    st.qty = Math.min(10, Math.max(1, st.qty + Number(b.dataset.q)));
    $('#qtyV', body).textContent = st.qty;
  }));

  $('#orderForm', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const btn = $('button[type=submit]', e.target);
    btn.disabled = true; btn.textContent = 'Отправляю…';
    const data = {
      name: f.name.trim(),
      model_title: isCustom ? f.model_title : m.t,
      model_url: isCustom ? f.model_url : m.url,
      emoji: isCustom ? '🔗' : m.e,
      hours: isCustom ? Number(f.hours) || 2 : m.h,
      color: st.color, qty: st.qty, comment: f.comment,
    };
    try {
      const j = await api('/api/queue', { method: 'POST', data });
      S.me = data.name; LS.set('pq_name', data.name);
      body.innerHTML = `
        <div class="success">
          <div class="big">${esc(data.emoji)}</div>
          <h2>Ты в очереди, ${esc(data.name)}!</h2>
          <div class="muted">${esc(data.model_title)}${data.qty > 1 ? ` × ${data.qty}` : ''} · ${esc(data.color)}</div>
          <div class="pos">#${j.position}</div>
          <div class="muted">твоё место в очереди</div>
          <p class="muted" style="margin:18px 0 22px">${j.telegram ? '📨 Мастер уже получил уведомление в Telegram' : 'Заявка сохранена'}</p>
          <button class="btn primary full" data-close>Супер!</button>
        </div>`;
      confetti();
      refresh();
    } catch (er) {
      toast(er.message, 'err');
      btn.disabled = false; btn.textContent = '🚀 Встать в очередь';
    }
  });
}
$$('.modal').forEach((m) => m.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) {
    m.hidden = true;
    if (m.id === 'orderModal' && $('.success', m)) switchTab('queue');
  }
}));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('.modal').forEach((m) => (m.hidden = true)); });

/* ---------- queue ---------- */
function renderQueue() {
  const list = $('#queueList');
  if (!S.active.length) {
    list.innerHTML = `<div class="empty"><div class="big">😴</div>Очередь пустая. Принтер скучает — выбери что-нибудь в каталоге!</div>`;
    return;
  }
  let acc = 0;
  list.innerHTML = S.active.map((r, i) => {
    const startsIn = acc;
    acc += remainingOf(r);
    const printing = r.status === 'printing';
    const mine = S.me && r.name.toLowerCase() === S.me.toLowerCase();
    return `
      <div class="qi ${printing ? 'printing' : ''} ${mine ? 'mine' : ''}" style="animation-delay:${Math.min(i, 12) * 40}ms">
        <div class="qi-pos">${printing ? '▶' : i + 1}</div>
        <div class="qi-emo">${esc(r.emoji || '🧩')}</div>
        <div class="qi-main">
          <div class="qi-title">${r.model_url ? `<a href="${esc(r.model_url)}" target="_blank" rel="noopener">${esc(r.model_title)}</a>` : esc(r.model_title)}${r.qty > 1 ? ` <span class="muted">× ${r.qty}</span>` : ''}</div>
          <div class="qi-meta">
            <span class="who-pill"><span class="ava" style="background:${nameColor(r.name)}">${esc(r.name[0]?.toUpperCase() || '?')}</span>${esc(r.name)}${mine ? ' <span class="muted">(ты)</span>' : ''}</span>
            <span>${swatch(r.color)}${esc(r.color)}</span>
            <span>⏱ ${fmtH(total(r))}</span>
            <span>${ago(r.created_at)}</span>
          </div>
          ${r.comment ? `<div class="qi-comment">💬 ${esc(r.comment)}</div>` : ''}
        </div>
        <div class="qi-side">
          ${printing ? `<span class="pill p">🔥 печатается · ещё ~${fmtH(remainingOf(r))}</span>` : `<span class="pill">${startsIn < 0.05 ? '⚡ следующий' : `⌛ через ~${fmtH(startsIn)}`}</span>`}
          <div class="qi-admin">
            ${printing
              ? `<button data-act="done" data-id="${r.id}" title="Готово">✅</button><button data-act="back" data-id="${r.id}" title="Вернуть в очередь">↩️</button>`
              : `<button data-act="start" data-id="${r.id}" title="Запустить печать">▶️</button><button data-act="up" data-id="${r.id}" title="Поднять наверх">⬆️</button>`}
            <button data-act="cancel" data-id="${r.id}" title="Отменить">✖️</button>
          </div>
        </div>
      </div>`;
  }).join('');
}
function renderDone() {
  const list = $('#doneList');
  if (!S.done.length) {
    list.innerHTML = `<div class="empty"><div class="big">🏁</div>Тут появятся готовые модели.</div>`;
    return;
  }
  list.innerHTML = `
    <div class="muted" style="margin-bottom:6px">Всего напечатано: <b style="color:var(--g2)">${S.stats.done_total}</b> · ${fmtH(S.stats.done_hours)} работы принтера</div>` +
    S.done.map((r, i) => `
      <div class="qi" style="animation-delay:${Math.min(i, 12) * 30}ms">
        <div class="qi-pos">${r.status === 'done' ? '✓' : '×'}</div>
        <div class="qi-emo">${esc(r.emoji || '🧩')}</div>
        <div class="qi-main">
          <div class="qi-title">${esc(r.model_title)}${r.qty > 1 ? ` <span class="muted">× ${r.qty}</span>` : ''}</div>
          <div class="qi-meta">
            <span class="who-pill"><span class="ava" style="background:${nameColor(r.name)}">${esc(r.name[0]?.toUpperCase() || '?')}</span>${esc(r.name)}</span>
            <span>${swatch(r.color)}${esc(r.color)}</span>
            <span>${ago(r.finished_at || r.created_at)}</span>
          </div>
        </div>
        <div class="qi-side">
          ${r.status === 'done' ? '<span class="pill d">✅ готово</span>' : '<span class="pill c">отменено</span>'}
          <div class="qi-admin">
            <button data-act="back" data-id="${r.id}" title="Вернуть в очередь">↩️</button>
            <button data-act="delete" data-id="${r.id}" title="Удалить навсегда">🗑</button>
          </div>
        </div>
      </div>`).join('');
}
async function adminAct(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const { act, id } = b.dataset;
  if ((act === 'cancel' || act === 'delete') && !confirm(act === 'cancel' ? 'Отменить эту заявку?' : 'Удалить навсегда?')) return;
  b.disabled = true;
  try {
    if (act === 'delete') await api('/api/queue', { method: 'DELETE', data: { id } });
    else await api('/api/queue', { method: 'PATCH', data: { id, action: act } });
    if (act === 'done') confetti();
    await refresh();
  } catch (er) { toast(er.message, 'err'); b.disabled = false; }
}
$('#queueList').addEventListener('click', adminAct);
$('#doneList').addEventListener('click', adminAct);

/* ---------- tabs ---------- */
function moveInk() {
  const on = $('#tabs button.on'); if (!on) return;
  const ink = $('.tab-ink');
  ink.style.left = `${on.offsetLeft}px`;
  ink.style.width = `${on.offsetWidth}px`;
}
function switchTab(t) {
  S.tab = t;
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  $$('.panel').forEach((p) => (p.hidden = p.dataset.panel !== t));
  moveInk();
}
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) switchTab(b.dataset.tab); });
$('.brand').addEventListener('click', (e) => { e.preventDefault(); switchTab('catalog'); scrollTo({ top: 0, behavior: 'smooth' }); });
addEventListener('resize', moveInk);
document.fonts?.ready.then(moveInk);

/* ---------- admin ---------- */
$('#adminBtn').addEventListener('click', () => {
  if (document.body.classList.contains('is-admin')) {
    S.admin = null; LS.set('pq_admin', null); setAdmin(false); refresh(); toast('Режим мастера выключен');
    return;
  }
  $('#adminModal').hidden = false;
  setTimeout(() => $('#adminForm input').focus(), 50);
});
$('#adminForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = e.target.password.value;
  try {
    const j = await api('/api/login', { method: 'POST', data: { password, mode: 'admin' }, token: S.token });
    S.admin = j.token; LS.set('pq_admin', j.token);
    e.target.reset();
    $('#adminModal').hidden = true;
    setAdmin(true); toast('🛠️ Режим мастера включён', 'ok'); refresh();
  } catch (er) { toast(er.message, 'err'); }
});

/* ---------- live ticking (progress) ---------- */
setInterval(() => { if (!$('#app').hidden && S.active.some((r) => r.status === 'printing')) { renderNow(); renderStats(); } }, 30000);

/* ---------- boot ---------- */
if (S.token) startApp(); else showLogin();
