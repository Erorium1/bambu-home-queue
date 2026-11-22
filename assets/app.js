import { CATEGORIES, CATALOG, COLORS } from './catalog.js';

/* ================= state ================= */
const LS = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
const S = {
  token: LS.get('pq_token'),
  admin: LS.get('pq_admin'),
  active: [], done: [], stats: { done_total: 0, done_hours: 0 }, custom: [],
  cat: 'all', q: '', tab: 'catalog',
  me: LS.get('pq_name') || '',
  lastSync: 0,
};
let PREV = {};
try { PREV = JSON.parse(LS.get('pq_prev') || '{}'); } catch {}

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;

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
    else logout();
  }
  if (!r.ok) throw new Error(j.error || `Ошибка ${r.status}`);
  return j;
}

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('#toasts').append(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = 0; }, 3400);
  setTimeout(() => el.remove(), 3800);
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
  return `${String(Math.round(h * 10) / 10).replace('.', ',')} ч`;
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
  return `hsl(${h} 55% 62%)`;
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
  return Math.max(total(r) - (Date.now() - new Date(r.started_at).getTime()) / 36e5, 0.05);
}
const catLabel = (id) => (CATEGORIES.find((c) => c.id === id) || { label: 'Разное' }).label;
const catIdFromLabel = (l) => (CATEGORIES.find((c) => c.label === l || c.id === l) || { id: 'other' }).id;
const isModelLink = (u) => { try { const x = new URL(u); return /(^|\.)(makerworld|printables|thingiverse)\.com$/.test(x.hostname); } catch { return false; } };

/* фото: готовая картинка или ленивая подгрузка по ссылке через /api/preview */
function thumb(src, url, extra = '') {
  const img = src || PREV[url]?.image;
  if (img) return `<div class="thumb ${extra}"><img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{innerHTML:'${icon('cube').replace(/"/g, '&quot;')}'}))"></div>`;
  const pv = url && isModelLink(url) && PREV[url] === undefined ? ` data-pv="${esc(url)}"` : '';
  return `<div class="thumb ${extra} ${pv ? 'loading' : ''}"${pv}>${icon('cube')}</div>`;
}
async function preview(url) {
  if (PREV[url] !== undefined) return PREV[url];
  try {
    const j = await api(`/api/preview?url=${encodeURIComponent(url)}`);
    PREV[url] = j.image ? { image: j.image, title: j.title } : null;
  } catch { PREV[url] = null; }
  LS.set('pq_prev', JSON.stringify(PREV));
  return PREV[url];
}
const io = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => {
  ents.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); hydrate(e.target); } });
}, { rootMargin: '200px' }) : null;
async function hydrate(el) {
  const url = el.dataset.pv;
  el.removeAttribute('data-pv');
  const p = await preview(url);
  el.classList.remove('loading');
  if (p?.image) {
    const img = new Image();
    img.alt = ''; img.referrerPolicy = 'no-referrer'; img.src = p.image;
    img.onload = () => { el.innerHTML = ''; el.append(img); };
  }
}
function watchThumbs(root = document) {
  $$('.thumb[data-pv]', root).forEach((el) => (io ? io.observe(el) : hydrate(el)));
}

/* ================= login ================= */
let pin = '';
function showLogin() {
  $('#app').hidden = true; $('#login').hidden = false;
  pin = ''; drawPin(); animatePct();
}
function drawPin() { $$('#pinDots i').forEach((d, i) => d.classList.toggle('f', i < pin.length)); }
async function tryLogin() {
  const dots = $('#pinDots');
  try {
    const j = await api('/api/login', { method: 'POST', data: { password: pin }, token: '' });
    dots.classList.add('ok');
    S.token = j.token; LS.set('pq_token', j.token);
    setTimeout(() => { dots.classList.remove('ok'); startApp(); }, 350);
  } catch (e) {
    $('#pinErr').textContent = e.message;
    dots.classList.add('shake'); navigator.vibrate?.(100);
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
});
let pctTimer;
function animatePct() {
  clearInterval(pctTimer);
  const start = performance.now();
  pctTimer = setInterval(() => {
    if ($('#login').hidden) return clearInterval(pctTimer);
    $('.pr-pct').textContent = `${Math.floor((((performance.now() - start) / 15600) % 1) * 100)}%`;
  }, 200);
}
function logout() {
  S.token = null; S.admin = null;
  LS.set('pq_token', null); LS.set('pq_admin', null);
  setAdmin(false); clearInterval(pollTimer); showLogin();
}
$('#logoutBtn').addEventListener('click', logout);

/* ================= app ================= */
let pollTimer;
async function startApp() {
  $('#login').hidden = true; $('#app').hidden = false;
  renderChips(); renderCatalog();
  await refresh(true);
  loadCustom();
  clearInterval(pollTimer);
  pollTimer = setInterval(() => { if (!document.hidden) refresh(); }, 20000);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.token && !$('#app').hidden) refresh(); });

async function refresh(first) {
  try {
    const j = await api('/api/queue');
    Object.assign(S, { active: j.active, done: j.done, stats: j.stats, lastSync: Date.now() });
    setAdmin(j.role === 'admin');
    renderAll();
  } catch (e) { if (first) toast(e.message, 'err'); }
}
async function loadCustom() {
  try { S.custom = (await api('/api/catalog')).items || []; renderCatalog(); } catch {}
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
  chip.classList.toggle('busy', !!p); chip.classList.toggle('free', !p);
  $('.txt', chip).textContent = p ? 'Идёт печать' : S.active.length ? 'Ожидает запуска' : 'Принтер свободен';
}
function renderStats() {
  const wait = S.active.reduce((s, r) => s + remainingOf(r), 0);
  $('[data-s="queued"]').textContent = S.active.filter((r) => r.status === 'queued').length;
  $('[data-s="wait"]').textContent = wait ? shortH(wait) : '—';
  $('[data-s="done"]').textContent = S.stats.done_total || 0;
  $('#qBadge').textContent = S.active.length;
}
function renderNow() {
  const p = S.active.find((r) => r.status === 'printing');
  const box = $('#nowPrinting');
  if (!p) { box.hidden = true; return; }
  box.hidden = false;
  const rem = remainingOf(p);
  const pct = Math.min(99, Math.max(2, Math.round((1 - rem / total(p)) * 100)));
  box.innerHTML = `
    ${thumb(p.image_url, p.model_url)}
    <div>
      <div class="now-lbl">Сейчас печатается</div>
      <h3>${esc(p.model_title)}${p.qty > 1 ? ` × ${p.qty}` : ''}</h3>
      <div class="who">Для ${esc(p.name)} · ${swatch(p.color)}${esc(p.color)}</div>
      <div class="prog"><i style="width:${pct}%"></i></div>
    </div>
    <div class="now-eta"><b>${pct}%</b><span>осталось ~${fmtH(rem)}</span></div>`;
  watchThumbs(box);
}

/* ---------- catalog ---------- */
function allModels() {
  const custom = S.custom.map((m) => ({
    id: `c${m.id}`, dbId: m.id, t: m.title, c: catIdFromLabel(m.category), h: Number(m.hours) || 1,
    url: m.model_url, img: m.image_url, d: '', custom: true,
  }));
  return [...custom, ...CATALOG];
}
function renderChips() {
  $('#chips').innerHTML = CATEGORIES.map((c) => `<button class="chip ${S.cat === c.id ? 'on' : ''}" data-cat="${c.id}">${c.label}</button>`).join('');
  $('#addCat').innerHTML = CATEGORIES.filter((c) => c.id !== 'all').map((c) => `<option>${c.label}</option>`).join('') + '<option>Разное</option>';
}
$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  S.cat = b.dataset.cat;
  $$('.chip').forEach((x) => x.classList.toggle('on', x === b));
  renderCatalog();
});
$('#search').addEventListener('input', (e) => { S.q = e.target.value.trim().toLowerCase(); renderCatalog(); });

function renderCatalog() {
  const items = allModels().filter((m) =>
    (S.cat === 'all' || m.c === S.cat) &&
    (!S.q || m.t.toLowerCase().includes(S.q) || (m.d || '').toLowerCase().includes(S.q)));
  $('#grid').innerHTML = items.map((m, i) => `
    <article class="card" data-id="${esc(m.id)}" style="animation-delay:${Math.min(i, 14) * 30}ms">
      <div data-open>${thumb(m.img, m.url).replace('class="thumb', `class="thumb`)}</div>
      <span class="time-tag" style="top:auto">${icon('clock')}${shortH(m.h)}</span>
      ${m.custom ? `<button class="icon-btn del admin-only inline" data-del="${m.dbId}" title="Убрать из каталога">${icon('trash')}</button>` : ''}
      <div class="card-b">
        <span class="cat">${esc(catLabel(m.c))}</span>
        <h4>${esc(m.t)}</h4>
        ${m.d ? `<p>${esc(m.d)}</p>` : '<p></p>'}
        <div class="card-f">
          <button class="btn primary" data-order>В очередь</button>
          ${m.url ? `<a class="btn mw" href="${esc(m.url)}" target="_blank" rel="noopener" title="Открыть на MakerWorld">${icon('ext')}</a>` : ''}
        </div>
      </div>
    </article>`).join('') || `<div class="empty">${icon('search')}<div>Ничего не найдено. Найдите модель на MakerWorld и вставьте ссылку в поле вверху.</div></div>`;
  // тег времени должен лежать поверх фото
  $$('#grid .card').forEach((c) => { const t = $('.time-tag', c); const th = $('.thumb', c); if (t && th) th.append(t); });
  watchThumbs($('#grid'));
}
$('#grid').addEventListener('click', async (e) => {
  const del = e.target.closest('[data-del]');
  if (del) {
    if (!confirm('Убрать модель из каталога?')) return;
    try { await api('/api/catalog', { method: 'DELETE', data: { id: del.dataset.del } }); toast('Убрано', 'ok'); loadCustom(); } catch (er) { toast(er.message, 'err'); }
    return;
  }
  if (e.target.closest('a')) return;
  const card = e.target.closest('.card[data-id]');
  if (card && (e.target.closest('[data-order]') || e.target.closest('[data-open]'))) {
    openOrder(allModels().find((m) => m.id === card.dataset.id));
  }
});

$('#linkBar').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#linkInput').value.trim();
  if (!v) { $('#linkInput').focus(); return; }
  if (!/^https?:\/\//.test(v)) { toast('Вставьте полную ссылку, начиная с https://', 'err'); return; }
  openOrder(null, v);
  $('#linkInput').value = '';
});

$('#addModelForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('button[type=submit]', e.target);
  btn.disabled = true;
  try {
    await api('/api/catalog', { method: 'POST', data: Object.fromEntries(new FormData(e.target)) });
    e.target.reset(); toast('Модель добавлена в каталог', 'ok'); loadCustom();
  } catch (er) { toast(er.message, 'err'); }
  btn.disabled = false;
});
$('#tgTest').addEventListener('click', async (e) => {
  const out = $('#tgRes'); const b = e.currentTarget;
  b.disabled = true; out.className = 'muted'; out.textContent = 'Проверяю…';
  try {
    const j = await api('/api/tg-test', { method: 'POST' });
    out.className = j.ok ? 'ok' : 'bad'; out.textContent = j.hint;
  } catch (er) { out.className = 'bad'; out.textContent = er.message; }
  b.disabled = false;
});

/* ---------- order modal ---------- */
function openOrder(model, link) {
  const isCustom = !model;
  const st = { color: 'Любой', qty: 1, img: model?.img || '', title: model?.t || '' };
  const url = model?.url || link || '';
  const body = $('#orderBody');
  const waitAll = S.active.reduce((s, r) => s + remainingOf(r), 0);
  body.innerHTML = `
    <div class="o-head">
      <div id="oThumb">${thumb(st.img, isCustom ? '' : url)}</div>
      <div>
        <h2 id="oTitle">${isCustom ? 'Модель по ссылке' : esc(model.t)}</h2>
        <div class="muted">
          ${isCustom ? '<span id="oHint">Загружаю фото…</span>' : `<span>${icon('clock')} ~${fmtH(model.h)} за 1 шт.</span>`}
          ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">MakerWorld ${icon('ext')}</a>` : ''}
        </div>
      </div>
    </div>
    <form id="orderForm" autocomplete="off">
      ${isCustom ? `
        <div class="row2 field">
          <div><label>Название модели</label><input name="model_title" placeholder="Например: подставка для телефона" required maxlength="120"></div>
          <div><label>Часов печати</label><input name="hours" type="number" min="0.25" max="48" step="0.25" placeholder="2"></div>
        </div>` : ''}
      <div class="row2 field">
        <div><label>Имя</label><input name="name" value="${esc(S.me)}" placeholder="Кто заказывает" required maxlength="40"></div>
        <div><label>Количество</label>
          <div class="stepper"><button type="button" data-q="-1">−</button><b id="qtyV">1</b><button type="button" data-q="1">+</button></div>
        </div>
      </div>
      <div class="field"><label>Цвет пластика</label>
        <div class="colors" id="colors">${COLORS.map((c) => `<button type="button" class="col ${c.n === st.color ? 'on' : ''}" data-c="${esc(c.n)}">${swatch(c.n)}${esc(c.n)}</button>`).join('')}</div>
      </div>
      <div class="field"><label>Комментарий</label><textarea name="comment" maxlength="300" placeholder="Размер, надпись, к какому дню нужно…"></textarea></div>
      <div class="o-sum"><span>Заявок в очереди: <b>${S.active.length}</b></span><span>Ожидание до старта: <b>${waitAll ? '~' + fmtH(waitAll) : 'можно сразу'}</b></span></div>
      <button class="btn primary full" type="submit" style="height:48px;font-size:15px">Добавить в очередь</button>
    </form>`;
  $('#orderModal').hidden = false;
  watchThumbs(body);
  setTimeout(() => (isCustom ? $('[name=model_title]', body) : !S.me ? $('[name=name]', body) : null)?.focus(), 50);

  if (isCustom) {
    if (isModelLink(url)) {
      preview(url).then((p) => {
        if (!body.isConnected) return;
        const hint = $('#oHint', body);
        if (p?.image) { st.img = p.image; $('#oThumb', body).innerHTML = thumb(p.image, ''); if (hint) hint.textContent = 'Фото загружено'; }
        else if (hint) hint.textContent = 'Фото не удалось получить — это не мешает заказу';
        if (p?.title) { st.title = p.title; $('#oTitle', body).textContent = p.title; const inp = $('[name=model_title]', body); if (inp && !inp.value) inp.value = p.title; }
      });
    } else { const h = $('#oHint', body); if (h) h.textContent = 'Ссылка не с MakerWorld — фото не подтянется'; }
  }

  $('#colors', body).addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    st.color = b.dataset.c; $$('.col', body).forEach((x) => x.classList.toggle('on', x === b));
  });
  $$('[data-q]', body).forEach((b) => b.addEventListener('click', () => {
    st.qty = Math.min(10, Math.max(1, st.qty + Number(b.dataset.q))); $('#qtyV', body).textContent = st.qty;
  }));

  $('#orderForm', body).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const btn = $('button[type=submit]', e.target);
    btn.disabled = true; btn.textContent = 'Отправляю…';
    const data = {
      name: f.name.trim(),
      model_title: isCustom ? f.model_title : model.t,
      model_url: url || null,
      image_url: st.img || null,
      emoji: '🧩',
      hours: isCustom ? Number(f.hours) || 2 : model.h,
      color: st.color, qty: st.qty, comment: f.comment,
    };
    try {
      const j = await api('/api/queue', { method: 'POST', data });
      S.me = data.name; LS.set('pq_name', data.name);
      body.innerHTML = `
        <div class="success">
          ${thumb(j.item?.image_url || st.img, '')}
          <h2>Заявка принята</h2>
          <div class="muted">${esc(data.model_title)}${data.qty > 1 ? ` × ${data.qty}` : ''} · ${esc(data.color)} · ${esc(data.name)}</div>
          <div class="pos">№${j.position}</div>
          <div class="muted">место в очереди</div>
          <p class="muted" style="margin:16px 0 20px">${j.telegram ? 'Мастер получил уведомление в Telegram.' : 'Заявка сохранена.'}</p>
          <button class="btn primary full" data-close>Готово</button>
        </div>`;
      refresh();
    } catch (er) {
      toast(er.message, 'err');
      btn.disabled = false; btn.textContent = 'Добавить в очередь';
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
function meta(r, mine) {
  return `
    <span class="who-pill"><span class="ava" style="background:${nameColor(r.name)}">${esc(r.name[0]?.toUpperCase() || '?')}</span>${esc(r.name)}${mine ? ' <span class="muted">(вы)</span>' : ''}</span>
    <span>${swatch(r.color)}${esc(r.color)}</span>
    <span>${fmtH(total(r))}</span>`;
}
function titleLink(r) {
  const t = esc(r.model_title) + (r.qty > 1 ? ` <span class="muted">× ${r.qty}</span>` : '');
  return r.model_url ? `<a href="${esc(r.model_url)}" target="_blank" rel="noopener">${t}</a>` : t;
}
function renderQueue() {
  const list = $('#queueList');
  if (!S.active.length) { list.innerHTML = `<div class="empty">${icon('cube')}<div>Очередь пуста — принтер свободен.</div></div>`; return; }
  let acc = 0;
  list.innerHTML = S.active.map((r, i) => {
    const startsIn = acc; acc += remainingOf(r);
    const printing = r.status === 'printing';
    const mine = S.me && r.name.toLowerCase() === S.me.toLowerCase();
    return `
      <div class="qi ${printing ? 'printing' : ''} ${mine ? 'mine' : ''}" style="animation-delay:${Math.min(i, 12) * 35}ms">
        <div class="qi-pos">${printing ? icon('play') : i + 1}</div>
        ${thumb(r.image_url, r.model_url)}
        <div class="qi-main">
          <div class="qi-title">${titleLink(r)}</div>
          <div class="qi-meta">${meta(r, mine)}<span>${ago(r.created_at)}</span></div>
          ${r.comment ? `<div class="qi-comment">${esc(r.comment)}</div>` : ''}
        </div>
        <div class="qi-side">
          ${printing ? `<span class="pill p">Печатается · ещё ~${fmtH(remainingOf(r))}</span>` : `<span class="pill">${startsIn < 0.05 ? 'Следующая' : `Старт через ~${fmtH(startsIn)}`}</span>`}
          <div class="qi-admin">
            ${printing
              ? `<button class="go" data-act="done" data-id="${r.id}" title="Готово">${icon('check')}</button><button data-act="back" data-id="${r.id}" title="Вернуть в очередь">${icon('undo')}</button>`
              : `<button class="go" data-act="start" data-id="${r.id}" title="Запустить печать">${icon('play')}</button><button data-act="up" data-id="${r.id}" title="Поднять наверх">${icon('up')}</button>`}
            <button class="bad" data-act="cancel" data-id="${r.id}" title="Отменить">${icon('x')}</button>
          </div>
        </div>
      </div>`;
  }).join('');
  watchThumbs(list);
}
function renderDone() {
  const list = $('#doneList');
  if (!S.done.length) { list.innerHTML = `<div class="empty">${icon('check')}<div>Здесь появятся напечатанные модели.</div></div>`; return; }
  list.innerHTML = `<div class="muted" style="margin-bottom:6px;font-size:13px">Всего напечатано: <b style="color:var(--txt)">${S.stats.done_total}</b> · ${fmtH(S.stats.done_hours)} работы принтера</div>` +
    S.done.map((r, i) => `
      <div class="qi" style="animation-delay:${Math.min(i, 12) * 30}ms">
        <div class="qi-pos">${r.status === 'done' ? icon('check') : icon('x')}</div>
        ${thumb(r.image_url, r.model_url)}
        <div class="qi-main">
          <div class="qi-title">${titleLink(r)}</div>
          <div class="qi-meta">${meta(r, false)}<span>${ago(r.finished_at || r.created_at)}</span></div>
        </div>
        <div class="qi-side">
          ${r.status === 'done' ? '<span class="pill d">Готово</span>' : '<span class="pill c">Отменено</span>'}
          <div class="qi-admin">
            <button data-act="back" data-id="${r.id}" title="Вернуть в очередь">${icon('undo')}</button>
            <button class="bad" data-act="delete" data-id="${r.id}" title="Удалить">${icon('trash')}</button>
          </div>
        </div>
      </div>`).join('');
  watchThumbs(list);
}
async function adminAct(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const { act, id } = b.dataset;
  if ((act === 'cancel' || act === 'delete') && !confirm(act === 'cancel' ? 'Отменить заявку?' : 'Удалить запись?')) return;
  b.disabled = true;
  try {
    if (act === 'delete') await api('/api/queue', { method: 'DELETE', data: { id } });
    else await api('/api/queue', { method: 'PATCH', data: { id, action: act } });
    await refresh();
  } catch (er) { toast(er.message, 'err'); b.disabled = false; }
}
$('#queueList').addEventListener('click', adminAct);
$('#doneList').addEventListener('click', adminAct);

/* ---------- tabs ---------- */
function switchTab(t) {
  S.tab = t;
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  $$('.panel').forEach((p) => (p.hidden = p.dataset.panel !== t));
}
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) switchTab(b.dataset.tab); });
$('.brand').addEventListener('click', (e) => { e.preventDefault(); switchTab('catalog'); scrollTo({ top: 0, behavior: 'smooth' }); });

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
  try {
    const j = await api('/api/login', { method: 'POST', data: { password: e.target.password.value, mode: 'admin' }, token: S.token });
    S.admin = j.token; LS.set('pq_admin', j.token);
    e.target.reset(); $('#adminModal').hidden = true;
    setAdmin(true); toast('Режим мастера включён', 'ok'); refresh();
  } catch (er) { toast(er.message, 'err'); }
});

setInterval(() => { if (!$('#app').hidden && S.active.some((r) => r.status === 'printing')) { renderNow(); renderStats(); } }, 30000);

if (S.token) startApp(); else showLogin();
