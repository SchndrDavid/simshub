'use strict';

/* ==========================================================================
   Sims Hub — client. One in-memory state object per profile is the source of
   truth during a session; the server is persistence. Writes are debounced and
   always send the whole blob.
   ========================================================================== */

/* The app may be served from a sub-path, so the API prefix is derived at
   runtime instead of hard-coding /api/… */
const BASE = (() => {
  const path = window.location.pathname;
  if (path.endsWith('/')) return path.slice(0, -1);
  return path.replace(/\/[^/]*$/, '');
})();

const SCHEMA_VERSION = 1;
const SAVE_DEBOUNCE_MS = 1000;
const POLL_INTERVAL_MS = 30000;
const HISTORY_LIMIT = 20;

/* ------------------------------------------------------------------ helpers */

function h(tag, props, ...children) {
  const node = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key in node && key !== 'list' && key !== 'style') {
        node[key] = value;
      } else {
        node.setAttribute(key, value === true ? '' : value);
      }
    }
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

/* --------------------------------------------------------------- randomness */

/* Rejection sampling over crypto.getRandomValues — modulo alone would bias
   the low values whenever the bound does not divide the word range. */
function randomInt(bound) {
  if (!Number.isInteger(bound) || bound < 1) throw new RangeError('bound must be a positive integer');
  if (bound === 1) return 0;

  if (bound <= 0x100000000) {
    const limit = Math.floor(0x100000000 / bound) * bound;
    const buffer = new Uint32Array(1);
    let value;
    do {
      crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return value % bound;
  }

  // Larger ranges: build a 53-bit integer out of two words, same rejection rule.
  const max = Number.MAX_SAFE_INTEGER + 1;
  const limit = Math.floor(max / bound) * bound;
  const buffer = new Uint32Array(2);
  let value;
  do {
    crypto.getRandomValues(buffer);
    value = (buffer[0] % 0x200000) * 0x100000000 + buffer[1];
  } while (value >= limit);
  return value % bound;
}

function randomBetween(min, max) {
  return min + randomInt(max - min + 1);
}

function pickOne(list) {
  return list[randomInt(list.length)];
}

function shuffled(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function weightedPick(list, weightOf) {
  const weights = list.map((item) => Math.max(0, Math.round(weightOf(item))));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return null;
  let roll = randomInt(total);
  for (let i = 0; i < list.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return list[i];
  }
  return list[list.length - 1];
}

/* ------------------------------------------------------------------- toasts */

function toast(message, kind = 'info') {
  const node = h('div', { class: `toast toast-${kind}` }, message);
  $('#toasts').append(node);
  setTimeout(() => {
    node.classList.add('leaving');
    setTimeout(() => node.remove(), 300);
  }, 3200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Zkopírováno do schránky.', 'ok');
  } catch {
    // Clipboard API needs a secure context; fall back to a manual selection.
    const area = h('textarea', { value: text, class: 'copy-fallback' });
    document.body.append(area);
    area.select();
    const ok = document.execCommand && document.execCommand('copy');
    area.remove();
    toast(ok ? 'Zkopírováno do schránky.' : 'Kopírování se nepovedlo.', ok ? 'ok' : 'error');
  }
}

/* ------------------------------------------------------------------ dialogs */

const dialogEl = $('#dialog');
const dialogForm = $('#dialog-form');
const dialogTitle = $('#dialog-title');
const dialogBody = $('#dialog-body');
const dialogOk = $('#dialog-ok');
const dialogCancel = $('#dialog-cancel');
let dialogResolve = null;

dialogForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const resolve = dialogResolve;
  dialogResolve = null;
  dialogEl.close();
  if (resolve) resolve({ confirmed: true, form: new FormData(dialogForm) });
});

dialogCancel.addEventListener('click', () => {
  const resolve = dialogResolve;
  dialogResolve = null;
  dialogEl.close();
  if (resolve) resolve({ confirmed: false });
});

dialogEl.addEventListener('cancel', (event) => {
  event.preventDefault();
  const resolve = dialogResolve;
  dialogResolve = null;
  dialogEl.close();
  if (resolve) resolve({ confirmed: false });
});

function openDialog({ title, content, okLabel = 'OK', cancelLabel = 'Zrušit', danger = false, hideCancel = false }) {
  dialogTitle.textContent = title;
  clearNode(dialogBody);
  if (content) dialogBody.append(content);
  dialogOk.textContent = okLabel;
  dialogOk.classList.toggle('danger', danger);
  dialogCancel.textContent = cancelLabel;
  dialogCancel.hidden = hideCancel;
  dialogEl.showModal();
  const focusTarget = dialogBody.querySelector('input, select, textarea') || dialogOk;
  focusTarget.focus();
  if (focusTarget.select) focusTarget.select();
  return new Promise((resolve) => { dialogResolve = resolve; });
}

async function confirmDialog(title, message, okLabel = 'Potvrdit') {
  const result = await openDialog({
    title,
    content: h('p', { class: 'dialog-text' }, message),
    okLabel,
    danger: true,
  });
  return result.confirmed;
}

async function promptDialog(title, label, value = '', okLabel = 'Uložit') {
  const input = h('input', { type: 'text', name: 'value', value, maxLength: 80, required: true });
  const result = await openDialog({
    title,
    content: h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), input),
    okLabel,
  });
  if (!result.confirmed) return null;
  const text = String(result.form.get('value') || '').trim();
  return text || null;
}

async function infoDialog(title, message) {
  await openDialog({ title, content: h('p', { class: 'dialog-text' }, message), okLabel: 'Zavřít', hideCancel: true });
}

/* ---------------------------------------------------------------------- api */

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function api(path, options = {}) {
  const init = { headers: { 'Content-Type': 'application/json' }, ...options };
  const response = await fetch(BASE + path, init);
  if (!response.ok) {
    let message = `Server odpověděl chybou ${response.status}.`;
    try {
      const payload = await response.json();
      if (payload && payload.error) message = payload.error;
    } catch { /* keep the generic message */ }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}

/* ------------------------------------------------------------- local backup */

/* Purely a fallback so the app keeps working while the server is unreachable.
   The server stays the authority as soon as it answers again. */
const localCache = {
  key: (id) => `simshub:cache:${id}`,
  read(id) {
    try {
      const raw = localStorage.getItem(this.key(id));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  write(id, payload) {
    try { localStorage.setItem(this.key(id), JSON.stringify(payload)); } catch { /* quota */ }
  },
  readProfiles() {
    try {
      const raw = localStorage.getItem('simshub:profiles');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  writeProfiles(list) {
    try { localStorage.setItem('simshub:profiles', JSON.stringify(list)); } catch { /* quota */ }
  },
};

/* -------------------------------------------------------------- state shape */

function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    wheel: { text: 'Pizza\nSushi\nPalačinky x3\nBurgery', removeWinner: false, sound: false, lists: [], history: [] },
    random: { min: 1, max: 100, count: 1, unique: false, sort: false, history: [] },
    simgen: { enabled: null, locks: {}, current: null, saved: [] },
    packs: { owned: {}, count: 3, eachCategory: false, weights: {}, results: [] },
    supersim: { progress: {}, collapsed: {}, hideDone: false, age: '' },
  };
}

/* Fills in anything a stored blob predates, so an old profile never crashes a
   newer build. schemaVersion is what future migrations will branch on. */
function migrateState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const merged = { ...base, ...raw, schemaVersion: SCHEMA_VERSION };
  for (const key of ['wheel', 'random', 'simgen', 'packs', 'supersim']) {
    merged[key] = { ...base[key], ...(raw[key] && typeof raw[key] === 'object' ? raw[key] : {}) };
  }
  if (!Array.isArray(merged.wheel.lists)) merged.wheel.lists = [];
  if (!Array.isArray(merged.wheel.history)) merged.wheel.history = [];
  if (!Array.isArray(merged.random.history)) merged.random.history = [];
  if (!Array.isArray(merged.simgen.saved)) merged.simgen.saved = [];
  if (!Array.isArray(merged.packs.results)) merged.packs.results = [];
  return merged;
}

/* -------------------------------------------------------------------- store */

const Store = {
  profiles: [],
  currentId: null,
  state: defaultState(),
  serverUpdatedAt: null,
  dirty: false,
  saving: false,
  version: 0,
  saveTimer: null,
  retryTimer: null,
  retryDelay: 2000,
  listeners: new Set(),

  onChange(fn) { this.listeners.add(fn); },
  emit() { for (const fn of this.listeners) fn(); },

  /* Called by every tool after it mutates state. */
  touch() {
    this.dirty = true;
    this.version += 1;
    this.setStatus('saving');
    localCache.write(this.currentId, { data: this.state, updated_at: this.serverUpdatedAt, dirty: true });
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
  },

  setStatus(status, detail = '') {
    const el = $('#save-status');
    const retry = $('#save-retry');
    el.dataset.state = status;
    el.textContent = {
      saving: 'Ukládám…',
      saved: 'Uloženo',
      error: 'Nepodařilo se uložit',
      offline: 'Offline – uložím později',
    }[status] || status;
    if (detail) el.title = detail; else el.removeAttribute('title');
    retry.hidden = status !== 'error' && status !== 'offline';
  },

  async flush() {
    if (!this.dirty || this.saving || this.currentId === null) return;
    clearTimeout(this.retryTimer);
    this.saving = true;
    this.setStatus('saving');
    // The body is serialised now, so edits made while the request is in flight
    // are not in it; the version counter is what tells them apart afterwards.
    const body = JSON.stringify({ data: this.state });
    const sentVersion = this.version;
    const sentProfile = this.currentId;
    try {
      const saved = await api(`/api/profiles/${sentProfile}`, { method: 'PATCH', body });
      if (this.currentId !== sentProfile) { this.saving = false; return; }
      this.serverUpdatedAt = saved.updated_at;
      this.retryDelay = 2000;
      this.dirty = this.version !== sentVersion;
      this.saving = false;
      localCache.write(this.currentId, { data: this.state, updated_at: saved.updated_at, dirty: this.dirty });
      if (this.dirty) {
        this.flush();
      } else {
        this.setStatus('saved');
      }
    } catch (error) {
      this.saving = false;
      const offline = !navigator.onLine || !(error instanceof ApiError);
      this.setStatus(offline ? 'offline' : 'error', error.message);
      // Keep the pending changes and retry with a growing delay.
      this.retryTimer = setTimeout(() => this.flush(), this.retryDelay);
      this.retryDelay = Math.min(this.retryDelay * 2, 30000);
    }
  },

  async loadProfiles() {
    try {
      this.profiles = await api('/api/profiles');
      localCache.writeProfiles(this.profiles);
    } catch (error) {
      const cached = localCache.readProfiles();
      if (!cached || !cached.length) throw error;
      this.profiles = cached;
      this.setStatus('offline', error.message);
    }
    renderProfileSelect();
  },

  async selectProfile(id, { force = false } = {}) {
    if (!force && id === this.currentId) return;
    // Never lose pending edits when switching away.
    if (this.dirty) await this.flush();
    this.currentId = id;
    try { localStorage.setItem('simshub:lastProfile', String(id)); } catch { /* ignore */ }

    try {
      const profile = await api(`/api/profiles/${id}`);
      const cached = localCache.read(id);
      const remoteChanged = Boolean(cached && cached.updated_at && profile.updated_at !== cached.updated_at);
      // Changes that never reached the server (tab closed while offline) are
      // recovered as long as nobody else wrote in the meantime.
      const recoverable = Boolean(cached && cached.dirty && !remoteChanged && !force);

      this.serverUpdatedAt = profile.updated_at;
      if (recoverable) {
        this.state = migrateState(cached.data);
        this.dirty = true;
        hideConflictBanner();
        this.flush();
        toast('Obnovil jsem neuložené změny z minule.', 'warn');
      } else {
        // A different stamp than the one this client last saw means someone else wrote.
        if (remoteChanged && !force) showConflictBanner(profile.updated_at);
        else hideConflictBanner();
        this.state = migrateState(profile.data);
        this.dirty = false;
        localCache.write(id, { data: this.state, updated_at: profile.updated_at, dirty: false });
        this.setStatus('saved');
      }
    } catch (error) {
      const cached = localCache.read(id);
      if (cached) {
        this.state = migrateState(cached.data);
        this.serverUpdatedAt = cached.updated_at;
        this.setStatus('offline', error.message);
        toast('Server není dostupný, pracuješ s poslední známou verzí.', 'warn');
      } else {
        this.state = defaultState();
        this.serverUpdatedAt = null;
        this.setStatus('offline', error.message);
        toast('Server není dostupný, začínáš s prázdným profilem.', 'warn');
      }
    }
    renderProfileSelect();
    this.emit();
  },

  /* Cheap poll: the list endpoint carries updated_at for every profile. */
  async pollForRemoteChange() {
    if (this.currentId === null || this.saving || this.dirty) return;
    try {
      const list = await api('/api/profiles');
      this.profiles = list;
      localCache.writeProfiles(list);
      renderProfileSelect();
      const mine = list.find((p) => p.id === this.currentId);
      if (mine && this.serverUpdatedAt && mine.updated_at !== this.serverUpdatedAt) {
        showConflictBanner(mine.updated_at);
      }
    } catch { /* offline polls are not worth reporting */ }
  },
};

/* --------------------------------------------------------- conflict banner */

function showConflictBanner(updatedAt) {
  const banner = $('#conflict-banner');
  const warning = Store.dirty ? ' Tvoje neuložené změny se načtením zahodí.' : '';
  $('#conflict-text').textContent = `Profil mezitím někdo změnil (${formatTime(updatedAt)}).${warning}`;
  banner.hidden = false;
}

function hideConflictBanner() {
  $('#conflict-banner').hidden = true;
}

/* ------------------------------------------------------------- profile bar */

function renderProfileSelect() {
  const select = $('#profile-select');
  clearNode(select);
  for (const profile of Store.profiles) {
    select.append(h('option', { value: String(profile.id), selected: profile.id === Store.currentId }, profile.name));
  }
}

async function createProfileFlow() {
  const name = await promptDialog('Nový profil', 'Název profilu', '', 'Vytvořit');
  if (!name) return;
  try {
    const profile = await api('/api/profiles', { method: 'POST', body: JSON.stringify({ name }) });
    await Store.loadProfiles();
    await Store.selectProfile(profile.id, { force: true });
    toast(`Profil „${profile.name}“ je připravený.`, 'ok');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function renameProfileFlow() {
  const current = Store.profiles.find((p) => p.id === Store.currentId);
  if (!current) return;
  const name = await promptDialog('Přejmenovat profil', 'Nový název', current.name, 'Přejmenovat');
  if (!name || name === current.name) return;
  try {
    await api(`/api/profiles/${current.id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
    await Store.loadProfiles();
    toast('Profil přejmenovaný.', 'ok');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function deleteProfileFlow() {
  const current = Store.profiles.find((p) => p.id === Store.currentId);
  if (!current) return;
  const ok = await confirmDialog('Smazat profil', `Opravdu smazat profil „${current.name}“ i se všemi daty?`, 'Smazat');
  if (!ok) return;
  try {
    await api(`/api/profiles/${current.id}`, { method: 'DELETE' });
    try { localStorage.removeItem(localCache.key(current.id)); } catch { /* ignore */ }
    await Store.loadProfiles();
    const next = Store.profiles[0];
    if (next) await Store.selectProfile(next.id, { force: true });
    toast('Profil smazaný.', 'ok');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function importProfileFlow() {
  const input = h('input', { type: 'file', accept: 'application/json,.json' });
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const data = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload;
      const suggested = (payload && payload.name) || file.name.replace(/\.json$/i, '');
      const name = await promptDialog('Import profilu', 'Název nového profilu', suggested, 'Importovat');
      if (!name) return;
      const profile = await api('/api/profiles/import', { method: 'POST', body: JSON.stringify({ name, data }) });
      await Store.loadProfiles();
      await Store.selectProfile(profile.id, { force: true });
      toast('Profil naimportovaný.', 'ok');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Soubor se nepodařilo načíst jako JSON.', 'error');
    }
  });
  input.click();
}

async function manageProfilesFlow() {
  const actions = h('div', { class: 'dialog-actions-list' },
    h('button', { class: 'ghost-btn', type: 'button', onclick: () => finish(createProfileFlow) }, 'Nový profil'),
    h('button', { class: 'ghost-btn', type: 'button', onclick: () => finish(renameProfileFlow) }, 'Přejmenovat'),
    h('button', {
      class: 'ghost-btn',
      type: 'button',
      onclick: () => {
        window.location.href = `${BASE}/api/profiles/${Store.currentId}/export`;
        closeDialog();
      },
    }, 'Exportovat JSON'),
    h('button', { class: 'ghost-btn', type: 'button', onclick: () => finish(importProfileFlow) }, 'Importovat JSON'),
    h('button', { class: 'ghost-btn danger', type: 'button', onclick: () => finish(deleteProfileFlow) }, 'Smazat profil'),
  );

  function closeDialog() {
    const resolve = dialogResolve;
    dialogResolve = null;
    dialogEl.close();
    if (resolve) resolve({ confirmed: false });
  }

  function finish(action) {
    closeDialog();
    setTimeout(action, 0);
  }

  await openDialog({ title: 'Profily', content: actions, okLabel: 'Zavřít', hideCancel: true });
}

/* -------------------------------------------------------------------- theme */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('#theme-toggle').setAttribute('aria-label', theme === 'dark' ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim');
  try { localStorage.setItem('simshub:theme', theme); } catch { /* ignore */ }
}

function initTheme() {
  let theme;
  try { theme = localStorage.getItem('simshub:theme'); } catch { theme = null; }
  if (theme !== 'dark' && theme !== 'light') {
    theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  applyTheme(theme);
  $('#theme-toggle').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
}

/* ------------------------------------------------------------- shared data */

const dataCache = new Map();

async function loadData(name) {
  if (dataCache.has(name)) return dataCache.get(name);
  const promise = (async () => {
    const response = await fetch(`${BASE}/data/${name}.json`);
    if (!response.ok) throw new Error(`Soubor data/${name}.json se nepodařilo načíst (${response.status}).`);
    return response.json();
  })();
  dataCache.set(name, promise);
  promise.catch(() => dataCache.delete(name));
  return promise;
}

function showTabError(elementId, message) {
  const node = $(`#${elementId}`);
  if (!node) return;
  clearNode(node);
  node.append(h('p', { class: 'error-text' }, message));
  node.hidden = false;
}

function hideTabError(elementId) {
  const node = $(`#${elementId}`);
  if (node) node.hidden = true;
}

/* Owned packs live in the profile and are shared by three tools. Packs missing
   from the map count as owned, so a newly released pack is not silently off. */
function isPackOwned(packName) {
  const owned = Store.state.packs.owned || {};
  return owned[packName] !== false;
}

/* --------------------------------------------------------------- tab router */

const tabs = new Map();
let currentRoute = null;

function registerTab(route, handlers) {
  tabs.set(route, handlers);
}

function routeFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  return tabs.has(raw) ? raw : 'wheel';
}

async function activateRoute(route) {
  currentRoute = route;
  for (const [name, handlers] of tabs) {
    const panel = $(`#panel-${name}`);
    const button = $(`#tab-${name}`);
    const active = name === route;
    panel.hidden = !active;
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    button.tabIndex = active ? 0 : -1;
    button.classList.toggle('active', active);
    if (active && handlers.activate) await handlers.activate();
  }
}

function initTabs() {
  const buttons = $$('#tabs .tab');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      window.location.hash = `#/${button.dataset.route}`;
    });
    button.addEventListener('keydown', (event) => {
      const index = buttons.indexOf(button);
      let next = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next === null) return;
      event.preventDefault();
      buttons[next].focus();
      window.location.hash = `#/${buttons[next].dataset.route}`;
    });
  });
  window.addEventListener('hashchange', () => activateRoute(routeFromHash()));
}

/* ==========================================================================
   TAB 1 — Kolo štěstí
   ========================================================================== */

const Wheel = (() => {
  const SPIN_MS = 5000;
  const EASING = [0.12, 0.72, 0.12, 1];
  const MAX_TICKS = 240;

  const WHEEL_PALETTE = [
    '#5a3fc0', // Deep purple
    '#0284c7', // Sapphire blue
    '#059669', // Emerald green
    '#d97706', // Amber gold
    '#db2777', // Rose pink
    '#7c3aed', // Bright violet
    '#0d9488', // Teal
    '#ea580c', // Orange
    '#0891b2', // Cyan
    '#be123c', // Crimson
    '#4f46e5', // Indigo
    '#65a30d', // Lime
  ];

  const PRESETS = {
    'sims-challenges': [
      'Rags to Riches',
      '100 dětí',
      'Not So Berry',
      'Černá vdova',
      'Generační výzva (Legacy)',
      'Bezdomovec',
      'Život na samotě',
      'Malý dům (Tiny Living)',
    ].join('\n'),
    'sims-aspirations': [
      'Kreativita x2',
      'Bohatství',
      'Láska a romantika',
      'Znalosti a věda x2',
      'Příroda a outdoor',
      'Jídlo a vaření',
      'Rodina',
      'Popularita',
    ].join('\n'),
    'food': [
      'Pizza x2',
      'Sushi',
      'Těstoviny',
      'Burgery x2',
      'Palačinky',
      'Salát',
      'Kuře s rýží',
      'Čína / Wok',
    ].join('\n'),
    'activities': [
      'Hrát The Sims 4 x3',
      'Koukat na film',
      'Jít na procházku',
      'Číst knížku',
      'Stavět dům v Sims x2',
      'Společenská hra',
    ].join('\n'),
    'yes-no': [
      'Určitě ano x2',
      'Spíše ano',
      'Rozhodně ne x2',
      'Spíše ne',
      'Zeptej se později',
    ].join('\n'),
    'who-turn': [
      'Hráč 1',
      'Hráč 2',
    ].join('\n'),
  };

  let segments = [];
  let rotation = 0;
  let spinning = false;
  let audioCtx = null;

  const rotor = () => $('#wheel-rotor');

  /* "Palačinky x3" → three times the segment size. */
  function parseItems(text) {
    return String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(.*?)\s*[x×]\s*(\d{1,2})$/i);
        if (match && match[1].trim()) {
          return { label: match[1].trim(), weight: clamp(Number(match[2]), 1, 50) };
        }
        return { label: line, weight: 1 };
      });
  }

  function pointOnCircle(angle, radius) {
    const rad = (angle * Math.PI) / 180;
    return [200 + radius * Math.sin(rad), 200 - radius * Math.cos(rad)];
  }

  function truncate(label, maxChars) {
    if (label.length <= maxChars) return label;
    return `${label.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
  }

  function getSegmentColor(index, count) {
    if (count <= WHEEL_PALETTE.length) {
      if (count === 2) return index === 0 ? '#5a3fc0' : '#0d9488';
      let cIndex = index % WHEEL_PALETTE.length;
      if (index === count - 1 && cIndex === 0) {
        cIndex = (cIndex + 1) % WHEEL_PALETTE.length;
      }
      return WHEEL_PALETTE[cIndex];
    }
    const hue = Math.round((index * 360) / count);
    const lightness = index % 2 === 0 ? 46 : 56;
    return `hsl(${hue} 68% ${lightness}%)`;
  }

  function updateCounter(items) {
    const countEl = $('#wheel-count');
    if (!countEl) return;
    const count = items.length;
    if (count === 0) {
      countEl.textContent = '0 položek';
      return;
    }
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const itemWord = count === 1 ? 'položka' : count >= 2 && count <= 4 ? 'položky' : 'položek';
    if (totalWeight === count) {
      countEl.textContent = `${count} ${itemWord}`;
    } else {
      const weightWord = totalWeight === 1 ? 'váha' : totalWeight >= 2 && totalWeight <= 4 ? 'váhy' : 'vah';
      countEl.textContent = `${count} ${itemWord} · ${totalWeight} ${weightWord}`;
    }
  }

  function renderHub(svg) {
    const ns = 'http://www.w3.org/2000/svg';
    const hub = document.createElementNS(ns, 'circle');
    hub.setAttribute('cx', '200');
    hub.setAttribute('cy', '200');
    hub.setAttribute('r', '27');
    hub.setAttribute('class', 'wheel-hub');
    svg.append(hub);

    const mark = document.createElementNS(ns, 'text');
    mark.setAttribute('x', '200');
    mark.setAttribute('y', '201');
    mark.setAttribute('text-anchor', 'middle');
    mark.setAttribute('dominant-baseline', 'central');
    mark.setAttribute('class', 'wheel-hub-mark');
    mark.textContent = '◆';
    svg.append(mark);
  }

  function render() {
    const svg = $('#wheel-svg');
    const items = parseItems(Store.state.wheel.text);
    clearNode(svg);
    segments = [];
    updateCounter(items);

    if (!items.length) {
      svg.append(h('circle', { cx: 200, cy: 200, r: 190, class: 'wheel-empty' }));
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', '200');
      label.setAttribute('y', '206');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'wheel-empty-text');
      label.textContent = 'Přidej položky';
      svg.append(label);
      return;
    }

    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let cursor = 0;
    const ns = 'http://www.w3.org/2000/svg';

    if (items.length === 1) {
      const item = items[0];
      segments.push({ ...item, start: 0, end: 360, mid: 180, index: 0 });

      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', '200');
      circle.setAttribute('cy', '200');
      circle.setAttribute('r', '190');
      circle.setAttribute('fill', '#5a3fc0');
      circle.setAttribute('stroke', 'rgba(0,0,0,0.18)');
      circle.setAttribute('stroke-width', '2');
      svg.append(circle);

      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', '200');
      label.setAttribute('y', '125');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('font-size', '22');
      label.setAttribute('class', 'wheel-label');
      label.textContent = truncate(item.label, 20);
      svg.append(label);

      renderHub(svg);
      return;
    }

    items.forEach((item, index) => {
      const sweep = (item.weight / total) * 360;
      const start = cursor;
      const end = cursor + sweep;
      cursor = end;
      const mid = (start + end) / 2;
      segments.push({ ...item, start, end, mid, index });

      const group = document.createElementNS(ns, 'g');

      const title = document.createElementNS(ns, 'title');
      title.textContent = item.weight > 1 ? `${item.label} (${item.weight}× váha)` : item.label;
      group.append(title);

      const path = document.createElementNS(ns, 'path');
      const [x1, y1] = pointOnCircle(start, 190);
      const [x2, y2] = pointOnCircle(end, 190);
      const largeArc = sweep > 180 ? 1 : 0;
      path.setAttribute('d', `M200,200 L${x1.toFixed(2)},${y1.toFixed(2)} A190,190 0 ${largeArc},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`);
      path.setAttribute('fill', getSegmentColor(index, items.length));
      path.setAttribute('stroke', 'rgba(0,0,0,0.2)');
      path.setAttribute('stroke-width', '1.5');
      group.append(path);

      let fontSize = 16;
      if (sweep >= 100) fontSize = 21;
      else if (sweep >= 60) fontSize = 18;
      else if (sweep >= 35) fontSize = 15;
      else if (sweep >= 22) fontSize = 13;
      else if (sweep >= 14) fontSize = 11;
      else if (sweep >= 9) fontSize = 10;
      else fontSize = 9;

      const maxChars = Math.max(3, Math.floor(140 / (fontSize * 0.56)));

      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', '378');
      label.setAttribute('y', '200');
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('font-size', String(fontSize));
      label.setAttribute('class', 'wheel-label');
      label.setAttribute('transform', `rotate(${(mid - 90).toFixed(2)} 200 200)`);
      label.textContent = truncate(item.label, maxChars);
      group.append(label);

      svg.append(group);
    });

    renderHub(svg);
  }

  function bezierTimeForProgress(progress, [x1, y1, x2, y2]) {
    const curve = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
    let low = 0;
    let high = 1;
    for (let i = 0; i < 30; i += 1) {
      const mid = (low + high) / 2;
      if (curve(mid, y1, y2) < progress) low = mid; else high = mid;
    }
    return curve((low + high) / 2, x1, x2);
  }

  function ensureAudio() {
    if (!Store.state.wheel.sound) return null;
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function scheduleTicks(from, to) {
    const ctx = ensureAudio();
    if (!ctx || !segments.length || to <= from) return;
    const boundaries = segments.map((segment) => segment.start);
    const crossings = [];
    for (const boundary of boundaries) {
      const first = Math.ceil((from + boundary) / 360);
      for (let k = first; ; k += 1) {
        const value = k * 360 - boundary;
        if (value > to) break;
        if (value > from) crossings.push(value);
        if (crossings.length > 2000) break;
      }
    }
    crossings.sort((a, b) => a - b);
    const step = Math.max(1, Math.ceil(crossings.length / MAX_TICKS));
    for (let i = 0; i < crossings.length; i += step) {
      const progress = (crossings[i] - from) / (to - from);
      const at = ctx.currentTime + (bezierTimeForProgress(progress, EASING) * SPIN_MS) / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, at);
      osc.frequency.exponentialRampToValueAtTime(200, at + 0.025);
      gain.gain.setValueAtTime(0.001, at);
      gain.gain.linearRampToValueAtTime(0.06, at + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.035);
    }
  }

  function setControlsDisabled(disabled) {
    const ids = [
      '#wheel-spin',
      '#wheel-input',
      '#wheel-shuffle',
      '#wheel-sort',
      '#wheel-clear',
      '#wheel-remove',
      '#wheel-sound',
      '#wheel-preset-load',
      '#wheel-list-save',
      '#wheel-list-load',
      '#wheel-list-delete',
      '#wheel-history-clear',
    ];
    for (const id of ids) {
      const el = $(id);
      if (el) el.disabled = disabled;
    }
  }

  function finish(winner) {
    spinning = false;
    setControlsDisabled(false);
    const state = Store.state.wheel;
    state.history.unshift({ label: winner.label, at: new Date().toISOString() });
    state.history = state.history.slice(0, HISTORY_LIMIT);

    if (state.removeWinner) {
      const lines = state.text.split('\n');
      const target = lines.findIndex((line) => {
        const parsed = parseItems(line)[0];
        return parsed && parsed.label === winner.label;
      });
      if (target >= 0) {
        lines.splice(target, 1);
        state.text = lines.join('\n');
        $('#wheel-input').value = state.text;
        render();
      }
    }

    Store.touch();
    renderHistory();

    const winnerContent = h(
      'div',
      { class: 'winner-wrap' },
      h('div', { class: 'winner-badge' }, '🎉 Vítězná volba'),
      h('p', { class: 'winner' }, winner.label)
    );

    openDialog({
      title: 'Kolo štěstí',
      content: winnerContent,
      okLabel: 'Skvělé!',
      hideCancel: true,
    });
  }

  function spin() {
    if (spinning) return;
    if (!segments.length) {
      $('#wheel-message').textContent = 'Nejdřív přidej aspoň jednu položku.';
      return;
    }
    $('#wheel-message').textContent = '';

    const winner = weightedPick(segments, (segment) => segment.weight);
    const half = (winner.end - winner.start) / 2;
    const jitter = (randomInt(1000) / 1000 - 0.5) * 2 * half * 0.7;
    const targetAngle = winner.mid + jitter;

    const normalized = ((rotation % 360) + 360) % 360;
    const delta = (360 - ((targetAngle + normalized) % 360)) % 360;
    const turns = 4 + randomInt(3);
    const to = rotation + turns * 360 + delta;

    if (prefersReducedMotion()) {
      rotation = to;
      rotor().style.transition = 'none';
      rotor().style.transform = `rotate(${rotation}deg)`;
      finish(winner);
      return;
    }

    spinning = true;
    setControlsDisabled(true);
    scheduleTicks(rotation, to);
    rotor().style.transition = `transform ${SPIN_MS}ms cubic-bezier(${EASING.join(',')})`;
    void rotor().offsetWidth;
    rotation = to;
    rotor().style.transform = `rotate(${rotation}deg)`;

    let finished = false;
    const onEnd = (event) => {
      if (event && event.target !== rotor()) return;
      if (finished) return;
      finished = true;
      rotor().removeEventListener('transitionend', onEnd);
      if (spinning) finish(winner);
    };

    rotor().addEventListener('transitionend', onEnd);
    setTimeout(() => {
      if (!finished && spinning) {
        finished = true;
        rotor().removeEventListener('transitionend', onEnd);
        finish(winner);
      }
    }, SPIN_MS + 120);
  }

  function renderHistory() {
    const list = $('#wheel-history');
    clearNode(list);
    const history = Store.state.wheel.history;
    if (!history.length) {
      list.append(h('li', { class: 'muted' }, 'Zatím nic.'));
      return;
    }
    for (const entry of history) {
      list.append(h('li', {}, h('span', {}, entry.label), h('time', { class: 'muted' }, formatTime(entry.at))));
    }
  }

  function renderLists() {
    const select = $('#wheel-lists');
    clearNode(select);
    const lists = Store.state.wheel.lists;
    if (!lists.length) {
      select.append(h('option', { value: '' }, 'Žádný uložený seznam'));
      select.disabled = true;
      return;
    }
    select.disabled = false;
    for (const list of lists) select.append(h('option', { value: list.name }, list.name));
  }

  function syncFromState() {
    const state = Store.state.wheel;
    $('#wheel-input').value = state.text;
    $('#wheel-remove').checked = Boolean(state.removeWinner);
    $('#wheel-sound').checked = Boolean(state.sound);
    rotation = 0;
    rotor().style.transition = 'none';
    rotor().style.transform = 'rotate(0deg)';
    render();
    renderHistory();
    renderLists();
  }

  function init() {
    $('#wheel-input').addEventListener('input', (event) => {
      Store.state.wheel.text = event.target.value;
      render();
      Store.touch();
    });
    $('#wheel-remove').addEventListener('change', (event) => {
      Store.state.wheel.removeWinner = event.target.checked;
      Store.touch();
    });
    $('#wheel-sound').addEventListener('change', (event) => {
      Store.state.wheel.sound = event.target.checked;
      if (event.target.checked) ensureAudio();
      Store.touch();
    });
    $('#wheel-spin').addEventListener('click', spin);
    $('#wheel-svg').addEventListener('click', spin);

    $('#wheel-shuffle').addEventListener('click', () => {
      if (spinning) return;
      const lines = String($('#wheel-input').value || '').split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) return;
      const mixed = shuffled(lines);
      Store.state.wheel.text = mixed.join('\n');
      $('#wheel-input').value = Store.state.wheel.text;
      render();
      Store.touch();
      toast('Seznam byl náhodně promíchán.', 'ok');
    });

    $('#wheel-sort').addEventListener('click', () => {
      if (spinning) return;
      const lines = String($('#wheel-input').value || '').split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) return;
      lines.sort((a, b) => a.localeCompare(b, 'cs'));
      Store.state.wheel.text = lines.join('\n');
      $('#wheel-input').value = Store.state.wheel.text;
      render();
      Store.touch();
      toast('Seznam byl seřazen podle abecedy.', 'ok');
    });

    $('#wheel-clear').addEventListener('click', async () => {
      if (spinning) return;
      if (!Store.state.wheel.text.trim()) return;
      const ok = await confirmDialog('Vyčistit seznam', 'Opravdu chceš smazat všechny položky z kola?', 'Vyčistit');
      if (!ok) return;
      Store.state.wheel.text = '';
      $('#wheel-input').value = '';
      render();
      Store.touch();
      toast('Seznam byl vyčištěn.', 'ok');
    });

    $('#wheel-preset-load').addEventListener('click', async () => {
      if (spinning) return;
      const key = $('#wheel-presets').value;
      if (!key || !PRESETS[key]) return;
      if (Store.state.wheel.text.trim()) {
        const ok = await confirmDialog('Vložit předlohu', 'Aktuální seznam na kole bude nahrazen touto předlohou. Chceš pokračovat?', 'Vložit');
        if (!ok) return;
      }
      Store.state.wheel.text = PRESETS[key];
      $('#wheel-input').value = Store.state.wheel.text;
      render();
      Store.touch();
      toast('Předloha byla vložena na kolo.', 'ok');
    });

    $('#wheel-history-clear').addEventListener('click', () => {
      Store.state.wheel.history = [];
      renderHistory();
      Store.touch();
    });

    $('#wheel-list-save').addEventListener('click', async () => {
      const name = await promptDialog('Uložit seznam', 'Název seznamu');
      if (!name) return;
      const lists = Store.state.wheel.lists;
      const existing = lists.findIndex((list) => list.name === name);
      if (existing >= 0) {
        const ok = await confirmDialog('Přepsat seznam', `Seznam „${name}“ už existuje. Přepsat ho?`, 'Přepsat');
        if (!ok) return;
        lists[existing].text = Store.state.wheel.text;
      } else {
        lists.push({ name, text: Store.state.wheel.text });
      }
      renderLists();
      $('#wheel-lists').value = name;
      Store.touch();
      toast('Seznam uložený.', 'ok');
    });

    $('#wheel-list-load').addEventListener('click', () => {
      const name = $('#wheel-lists').value;
      const list = Store.state.wheel.lists.find((item) => item.name === name);
      if (!list) return;
      Store.state.wheel.text = list.text;
      $('#wheel-input').value = list.text;
      render();
      Store.touch();
    });

    $('#wheel-list-delete').addEventListener('click', async () => {
      const name = $('#wheel-lists').value;
      if (!name) return;
      const ok = await confirmDialog('Smazat seznam', `Opravdu smazat seznam „${name}“?`, 'Smazat');
      if (!ok) return;
      Store.state.wheel.lists = Store.state.wheel.lists.filter((list) => list.name !== name);
      renderLists();
      Store.touch();
    });

    registerTab('wheel', { activate: () => {} });
  }

  return { init, syncFromState };
})();

/* ==========================================================================
   TAB 2 — Náhodné číslo
   ========================================================================== */

const RandomNumber = (() => {
  const FLICKER_MS = 600;
  let flickerTimer = null;
  let lastResult = [];

  function readInputs() {
    const min = Math.trunc(Number($('#rnd-min').value));
    const max = Math.trunc(Number($('#rnd-max').value));
    const count = Math.trunc(Number($('#rnd-count').value));
    return { min, max, count };
  }

  function setError(message) {
    const node = $('#rnd-error');
    node.textContent = message || '';
    node.hidden = !message;
  }

  function draw(min, max, count, unique) {
    const span = max - min + 1;
    if (!unique) {
      return Array.from({ length: count }, () => randomBetween(min, max));
    }
    // Small counts against a possibly huge range: rejection into a set beats
    // materialising the range.
    const chosen = new Set();
    while (chosen.size < count) chosen.add(randomBetween(min, max));
    return Array.from(chosen).slice(0, Math.min(count, span));
  }

  function renderNumbers(numbers, isFinal) {
    const box = $('#rnd-result');
    clearNode(box);
    box.classList.toggle('grid', numbers.length > 1);
    box.classList.toggle('flickering', !isFinal);
    for (const value of numbers) {
      box.append(h('span', { class: numbers.length > 1 ? 'rnd-cell' : 'rnd-single' }, String(value)));
    }
  }

  function renderHistory() {
    const list = $('#rnd-history');
    clearNode(list);
    const history = Store.state.random.history;
    if (!history.length) {
      list.append(h('li', { class: 'muted' }, 'Zatím nic.'));
      return;
    }
    for (const entry of history) {
      list.append(h('li', {},
        h('span', {}, entry.numbers.join(', ')),
        h('time', { class: 'muted' }, `${entry.min}–${entry.max} · ${formatTime(entry.at)}`)));
    }
  }

  function generate() {
    const { min, max, count } = readInputs();
    const unique = $('#rnd-unique').checked;
    const sort = $('#rnd-sort').checked;

    if (!Number.isFinite(min) || !Number.isFinite(max)) return setError('Zadej platná čísla.');
    if (min > max) return setError('Hodnota „od“ musí být menší nebo rovna „do“.');
    if (!Number.isFinite(count) || count < 1 || count > 100) return setError('Počet čísel musí být 1 až 100.');
    const span = max - min + 1;
    if (span > Number.MAX_SAFE_INTEGER) return setError('Rozsah je příliš velký.');
    if (unique && span < count) {
      return setError(`Bez opakování nejde vylosovat ${count} čísel z rozsahu o velikosti ${span}.`);
    }
    setError('');

    const result = draw(min, max, count, unique);
    if (sort) result.sort((a, b) => a - b);
    lastResult = result;

    const state = Store.state.random;
    Object.assign(state, { min, max, count, unique, sort });
    state.history.unshift({ numbers: result, min, max, at: new Date().toISOString() });
    state.history = state.history.slice(0, HISTORY_LIMIT);
    Store.touch();
    renderHistory();

    clearInterval(flickerTimer);
    if (prefersReducedMotion()) {
      renderNumbers(result, true);
      return;
    }
    const started = Date.now();
    flickerTimer = setInterval(() => {
      if (Date.now() - started >= FLICKER_MS) {
        clearInterval(flickerTimer);
        renderNumbers(result, true);
        return;
      }
      renderNumbers(result.map(() => randomBetween(min, max)), false);
    }, 60);
  }

  function syncFromState() {
    const state = Store.state.random;
    $('#rnd-min').value = state.min;
    $('#rnd-max').value = state.max;
    $('#rnd-count').value = state.count;
    $('#rnd-unique').checked = Boolean(state.unique);
    $('#rnd-sort').checked = Boolean(state.sort);
    lastResult = [];
    renderNumbers([], true);
    $('#rnd-result').append(h('span', { class: 'rnd-placeholder' }, '—'));
    setError('');
    renderHistory();
  }

  function init() {
    $('#rnd-go').addEventListener('click', generate);
    $('#rnd-copy').addEventListener('click', () => {
      if (!lastResult.length) return toast('Není co kopírovat.', 'warn');
      copyText(lastResult.join(', '));
    });
    $('#rnd-history-clear').addEventListener('click', () => {
      Store.state.random.history = [];
      renderHistory();
      Store.touch();
    });
    for (const id of ['#rnd-min', '#rnd-max', '#rnd-count', '#rnd-unique', '#rnd-sort']) {
      $(id).addEventListener('change', () => {
        const { min, max, count } = readInputs();
        Object.assign(Store.state.random, {
          min, max, count, unique: $('#rnd-unique').checked, sort: $('#rnd-sort').checked,
        });
        Store.touch();
      });
    }
    $('#panel-random').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
        event.preventDefault();
        generate();
      }
    });
    registerTab('random', { activate: () => {} });
  }

  return { init, syncFromState };
})();

/* ==========================================================================
   Shared pack metadata
   ========================================================================== */

const PACK_CATEGORIES = [
  { id: 'expansion', label: 'Rozšíření', short: 'EP' },
  { id: 'gamepack', label: 'Herní balíčky', short: 'GP' },
  { id: 'stuffpack', label: 'Balíčky předmětů', short: 'SP' },
  { id: 'kit', label: 'Kity', short: 'Kit' },
];

const KIT_SUBTYPES = [
  { id: 'build', label: 'Stavební kity' },
  { id: 'cas', label: 'Vzhledové kity' },
  { id: 'other', label: 'Ostatní kity' },
];

const categoryLabel = (id) => (PACK_CATEGORIES.find((c) => c.id === id) || {}).label || id;

/* ==========================================================================
   TAB 3 — Generátor simíka
   ========================================================================== */

const SimGen = (() => {
  const FIELDS = [
    { key: 'gender', label: 'Pohlaví', bonus: false },
    { key: 'age', label: 'Věk', bonus: false },
    { key: 'traits', label: 'Vlastnosti (3)', bonus: false },
    { key: 'aspiration', label: 'Aspirace', bonus: false },
    { key: 'career', label: 'Kariéra', bonus: false },
    { key: 'occult', label: 'Okultní typ', bonus: false },
    { key: 'color', label: 'Oblíbená barva', bonus: true },
    { key: 'music', label: 'Oblíbená hudba', bonus: true },
    { key: 'food', label: 'Oblíbené jídlo', bonus: true },
  ];

  let data = null;

  function defaults() {
    const enabled = {};
    for (const field of FIELDS) enabled[field.key] = !field.bonus;
    return enabled;
  }

  function ownedOnly(list) {
    return list.filter((item) => !item.pack || isPackOwned(item.pack));
  }

  /* Traits are drawn one at a time so every pick can exclude everything it
     clashes with, which a bulk sample could not guarantee. */
  function drawTraits(count = 3) {
    const pool = ownedOnly(data.traits);
    const picked = [];
    const blocked = new Set();
    let candidates = pool.slice();
    while (picked.length < count && candidates.length) {
      const trait = pickOne(candidates);
      picked.push(trait);
      blocked.add(trait.name);
      for (const conflict of trait.conflicts || []) blocked.add(conflict);
      candidates = candidates.filter((item) => !blocked.has(item.name));
    }
    return picked;
  }

  function generateField(key) {
    switch (key) {
      case 'gender': return pickOne(data.genders);
      case 'age': return pickOne(data.ages).label;
      case 'traits': return drawTraits(3).map((trait) => ({ name: trait.name, en: trait.en }));
      case 'aspiration': {
        const list = ownedOnly(data.aspirations);
        if (!list.length) return null;
        const item = pickOne(list);
        return { name: item.name, category: item.category };
      }
      case 'career': {
        const list = ownedOnly(data.careers);
        return list.length ? pickOne(list).name : null;
      }
      case 'occult': {
        const list = ownedOnly(data.occults);
        const item = weightedPick(list, (entry) => entry.weight);
        return item ? item.name : null;
      }
      case 'color': return pickOne(data.bonuses.colors);
      case 'music': return pickOne(data.bonuses.music);
      case 'food': return pickOne(data.bonuses.food);
      default: return null;
    }
  }

  function generate() {
    const state = Store.state.simgen;
    const current = { ...(state.current || {}) };
    for (const field of FIELDS) {
      if (!state.enabled[field.key]) {
        delete current[field.key];
        continue;
      }
      if (state.locks[field.key] && current[field.key] !== undefined && current[field.key] !== null) continue;
      current[field.key] = generateField(field.key);
    }
    state.current = current;
    Store.touch();
    renderResult();
  }

  function valueToText(key, value) {
    if (value === null || value === undefined) return '—';
    if (key === 'traits') return value.map((trait) => (trait.en ? `${trait.name} (${trait.en})` : trait.name)).join(', ');
    if (key === 'aspiration') return `${value.name} — ${value.category}`;
    return String(value);
  }

  function asText(current) {
    return FIELDS
      .filter((field) => current && current[field.key] !== undefined)
      .map((field) => `${field.label.replace(' (3)', '')}: ${valueToText(field.key, current[field.key])}`)
      .join('\n');
  }

  function renderResult() {
    const box = $('#simgen-result');
    clearNode(box);
    const current = Store.state.simgen.current;
    if (!current || !Object.keys(current).length) {
      box.append(h('p', { class: 'muted' }, 'Klikni na Generovat.'));
      return;
    }
    for (const field of FIELDS) {
      if (current[field.key] === undefined) continue;
      box.append(h('div', { class: 'sim-row' },
        h('span', { class: 'sim-key' }, field.label.replace(' (3)', '')),
        h('span', { class: 'sim-value' }, valueToText(field.key, current[field.key]))));
    }
  }

  function renderOptions() {
    const box = $('#simgen-options');
    clearNode(box);
    const state = Store.state.simgen;
    for (const field of FIELDS) {
      const enabled = h('input', {
        type: 'checkbox',
        checked: Boolean(state.enabled[field.key]),
        onchange: (event) => {
          state.enabled[field.key] = event.target.checked;
          Store.touch();
        },
      });
      const locked = Boolean(state.locks[field.key]);
      const lock = h('button', {
        type: 'button',
        class: `icon-btn lock${locked ? ' locked' : ''}`,
        'aria-pressed': locked ? 'true' : 'false',
        'aria-label': `${locked ? 'Odemknout' : 'Zamknout'} – ${field.label}`,
        title: locked ? 'Zamčeno – hodnota se nemění' : 'Odemčeno',
        onclick: () => {
          state.locks[field.key] = !state.locks[field.key];
          Store.touch();
          renderOptions();
        },
      }, locked ? '🔒' : '🔓');

      box.append(h('div', { class: 'opt-row' },
        h('label', { class: 'check grow' }, enabled, field.label, field.bonus ? h('span', { class: 'pill tiny' }, 'bonus') : null),
        lock));
    }
  }

  function renderSaved() {
    const list = $('#simgen-saved');
    clearNode(list);
    const saved = Store.state.simgen.saved;
    if (!saved.length) {
      list.append(h('li', { class: 'muted' }, 'Zatím nikdo uložený.'));
      return;
    }
    saved.forEach((entry, index) => {
      list.append(h('li', {},
        h('span', { class: 'grow' }, entry.name),
        h('button', {
          class: 'ghost-btn small', type: 'button',
          onclick: () => {
            Store.state.simgen.current = entry.sim;
            Store.touch();
            renderResult();
          },
        }, 'Načíst'),
        h('button', {
          class: 'ghost-btn small', type: 'button',
          onclick: () => copyText(`${entry.name}\n${asText(entry.sim)}`),
        }, 'Kopírovat'),
        h('button', {
          class: 'ghost-btn small danger', type: 'button', 'aria-label': `Smazat ${entry.name}`,
          onclick: async () => {
            const ok = await confirmDialog('Smazat simíka', `Opravdu smazat „${entry.name}“?`, 'Smazat');
            if (!ok) return;
            Store.state.simgen.saved.splice(index, 1);
            Store.touch();
            renderSaved();
          },
        }, '✕')));
    });
  }

  function syncFromState() {
    const state = Store.state.simgen;
    if (!state.enabled || typeof state.enabled !== 'object') state.enabled = defaults();
    for (const field of FIELDS) {
      if (state.enabled[field.key] === undefined) state.enabled[field.key] = !field.bonus;
    }
    if (!state.locks || typeof state.locks !== 'object') state.locks = {};
    if (data) {
      renderOptions();
      renderResult();
      renderSaved();
    }
  }

  async function activate() {
    if (data) { syncFromState(); return; }
    try {
      data = await loadData('simgen');
      hideTabError('simgen-error');
      syncFromState();
    } catch (error) {
      showTabError('simgen-error', `${error.message} Zkus stránku načíst znovu.`);
    }
  }

  function init() {
    $('#simgen-go').addEventListener('click', () => {
      if (!data) return;
      generate();
    });
    $('#simgen-unlock').addEventListener('click', () => {
      Store.state.simgen.locks = {};
      Store.touch();
      renderOptions();
    });
    $('#simgen-copy').addEventListener('click', () => {
      const current = Store.state.simgen.current;
      if (!current) return toast('Nejdřív vygeneruj simíka.', 'warn');
      copyText(asText(current));
    });
    $('#simgen-save').addEventListener('click', async () => {
      const current = Store.state.simgen.current;
      if (!current || !Object.keys(current).length) return toast('Nejdřív vygeneruj simíka.', 'warn');
      const name = await promptDialog('Uložit simíka', 'Jméno');
      if (!name) return;
      Store.state.simgen.saved.unshift({ name, sim: current, at: new Date().toISOString() });
      Store.touch();
      renderSaved();
      toast('Simík uložený.', 'ok');
    });
    registerTab('simgen', { activate });
  }

  return { init, syncFromState: () => { if (data) syncFromState(); } };
})();

/* ==========================================================================
   TAB 4 — Náhodné packy
   ========================================================================== */

const Packs = (() => {
  let packs = null;
  let lastResults = [];

  const weightOf = (categoryId) => {
    const weights = Store.state.packs.weights || {};
    return weights[categoryId] === undefined ? 1 : Number(weights[categoryId]);
  };

  function ownedPacks() {
    return packs.filter((pack) => isPackOwned(pack.name));
  }

  function setMessage(message, kind = 'hint') {
    const node = $('#packs-message');
    node.textContent = message || '';
    node.className = kind === 'error' ? 'error-text' : 'hint';
  }

  function drawPacks() {
    const state = Store.state.packs;
    const count = clamp(Math.trunc(Number(state.count) || 1), 1, 20);
    const pool = ownedPacks().filter((pack) => weightOf(pack.category) > 0);

    if (!pool.length) {
      setMessage('Žádný aktivní pack. Zaškrtni aspoň jeden vlastněný pack s nenulovou váhou.', 'error');
      return null;
    }
    if (pool.length <= count) {
      setMessage(`K dispozici je jen ${pool.length} aktivních packů, takže je vypisuju všechny.`);
      return shuffled(pool);
    }

    const activeCategories = [...new Set(pool.map((pack) => pack.category))];
    const picked = [];
    const remaining = pool.slice();

    const take = (candidates) => {
      const chosen = weightedPick(candidates, (pack) => weightOf(pack.category));
      if (!chosen) return false;
      picked.push(chosen);
      const index = remaining.indexOf(chosen);
      if (index >= 0) remaining.splice(index, 1);
      return true;
    };

    // "At least one per category" is ignored when it cannot fit in the count.
    if (state.eachCategory && count >= activeCategories.length) {
      for (const category of activeCategories) {
        take(remaining.filter((pack) => pack.category === category));
      }
      setMessage('');
    } else if (state.eachCategory) {
      setMessage(`Počet (${count}) je menší než počet aktivních kategorií (${activeCategories.length}), volbu „aspoň jeden z každé kategorie“ ignoruju.`);
    } else {
      setMessage('');
    }

    while (picked.length < count && remaining.length) {
      if (!take(remaining)) break;
    }
    return shuffled(picked);
  }

  function renderResults() {
    const box = $('#packs-results');
    clearNode(box);
    if (!lastResults.length) return;
    for (const pack of lastResults) {
      box.append(h('div', { class: 'pack-card' },
        h('span', { class: `badge badge-${pack.category}` }, categoryLabel(pack.category)),
        h('span', { class: 'pack-name' }, pack.name)));
    }
  }

  function renderWeights() {
    const box = $('#packs-weights');
    clearNode(box);
    for (const category of PACK_CATEGORIES) {
      const value = weightOf(category.id);
      const output = h('output', { class: 'weight-value' }, String(value));
      const slider = h('input', {
        type: 'range', min: '0', max: '5', step: '1', value: String(value),
        'aria-label': `Váha kategorie ${category.label}`,
        oninput: (event) => {
          output.textContent = event.target.value;
          if (!Store.state.packs.weights) Store.state.packs.weights = {};
          Store.state.packs.weights[category.id] = Number(event.target.value);
          Store.touch();
        },
      });
      box.append(h('div', { class: 'weight-row' },
        h('span', { class: 'weight-label' }, category.label),
        slider,
        output));
    }
  }

  function updateOwnedCount() {
    const owned = ownedPacks().length;
    $('#packs-owned-count').textContent = `${owned} / ${packs.length} vlastněných`;
  }

  function setOwned(names, owned) {
    const map = Store.state.packs.owned || (Store.state.packs.owned = {});
    for (const name of names) map[name] = owned;
    Store.touch();
    renderOwned();
    if (Supersim.refreshIfActive) Supersim.refreshIfActive();
  }

  function renderOwned() {
    const box = $('#packs-owned');
    clearNode(box);

    const groups = [];
    for (const category of PACK_CATEGORIES) {
      if (category.id === 'kit') {
        for (const subtype of KIT_SUBTYPES) {
          groups.push({
            label: subtype.label,
            items: packs.filter((pack) => pack.category === 'kit' && pack.subtype === subtype.id),
          });
        }
      } else {
        groups.push({ label: category.label, items: packs.filter((pack) => pack.category === category.id) });
      }
    }

    for (const group of groups) {
      if (!group.items.length) continue;
      const names = group.items.map((pack) => pack.name);
      const ownedInGroup = names.filter((name) => isPackOwned(name)).length;
      box.append(h('div', { class: 'owned-group' },
        h('div', { class: 'owned-head' },
          h('h3', {}, group.label),
          h('span', { class: 'pill tiny' }, `${ownedInGroup}/${names.length}`),
          h('button', { class: 'ghost-btn small', type: 'button', onclick: () => setOwned(names, true) }, 'Vše'),
          h('button', { class: 'ghost-btn small', type: 'button', onclick: () => setOwned(names, false) }, 'Nic')),
        h('div', { class: 'owned-items' }, group.items.map((pack) => h('label', { class: 'check pack-check' },
          h('input', {
            type: 'checkbox',
            checked: isPackOwned(pack.name),
            onchange: (event) => {
              const map = Store.state.packs.owned || (Store.state.packs.owned = {});
              map[pack.name] = event.target.checked;
              Store.touch();
              updateOwnedCount();
              const head = event.target.closest('.owned-group').querySelector('.pill');
              const count = group.items.filter((item) => isPackOwned(item.name)).length;
              head.textContent = `${count}/${group.items.length}`;
              if (Supersim.refreshIfActive) Supersim.refreshIfActive();
            },
          }),
          pack.name)))));
    }
    updateOwnedCount();
  }

  function syncFromState() {
    if (!packs) return;
    const state = Store.state.packs;
    if (!state.weights || typeof state.weights !== 'object') state.weights = {};
    for (const category of PACK_CATEGORIES) {
      if (state.weights[category.id] === undefined) state.weights[category.id] = 1;
    }
    $('#packs-count').value = clamp(Math.trunc(Number(state.count) || 3), 1, 20);
    $('#packs-each-cat').checked = Boolean(state.eachCategory);
    lastResults = Array.isArray(state.results) ? state.results : [];
    renderWeights();
    renderOwned();
    renderResults();
    setMessage('');
  }

  async function activate() {
    if (packs) { syncFromState(); return; }
    try {
      const doc = await loadData('packs');
      packs = doc.packs;
      hideTabError('packs-error');
      syncFromState();
    } catch (error) {
      showTabError('packs-error', `${error.message} Zkus stránku načíst znovu.`);
    }
  }

  function init() {
    $('#packs-go').addEventListener('click', () => {
      if (!packs) return;
      const result = drawPacks();
      if (!result) { lastResults = []; renderResults(); return; }
      lastResults = result;
      Store.state.packs.results = result;
      Store.touch();
      renderResults();
    });
    $('#packs-copy').addEventListener('click', () => {
      if (!lastResults.length) return toast('Není co kopírovat.', 'warn');
      copyText(lastResults.map((pack) => `${pack.name} (${categoryLabel(pack.category)})`).join('\n'));
    });
    $('#packs-count').addEventListener('change', (event) => {
      const value = clamp(Math.trunc(Number(event.target.value) || 1), 1, 20);
      event.target.value = value;
      Store.state.packs.count = value;
      Store.touch();
    });
    $('#packs-each-cat').addEventListener('change', (event) => {
      Store.state.packs.eachCategory = event.target.checked;
      Store.touch();
    });
    for (const button of $$('[data-packs-all]')) {
      button.addEventListener('click', () => {
        if (!packs) return;
        setOwned(packs.map((pack) => pack.name), button.dataset.packsAll === '1');
      });
    }
    registerTab('packs', { activate });
  }

  return { init, syncFromState: () => { if (packs) syncFromState(); } };
})();

/* ==========================================================================
   TAB 5 — Super Sim tracker
   ========================================================================== */

const Supersim = (() => {
  let doc = null;
  let search = '';
  let active = false;
  let longPressTimer = null;
  let longPressFired = false;
  const sectionPills = new Map();

  const keyOf = (sectionId, item) => `${sectionId}::${item.name}`;

  function progressOf(sectionId, item) {
    const value = Store.state.supersim.progress[keyOf(sectionId, item)];
    return clamp(Math.trunc(Number(value) || 0), 0, item.levels);
  }

  function setProgress(sectionId, item, value) {
    const key = keyOf(sectionId, item);
    const next = clamp(Math.trunc(value), 0, item.levels);
    if (next === 0) delete Store.state.supersim.progress[key];
    else Store.state.supersim.progress[key] = next;
    Store.touch();
  }

  /* Items from packs the profile does not own never appear anywhere. */
  const availableItems = (section) => section.items.filter((item) => !item.pack || isPackOwned(item.pack));

  function visibleItems(section) {
    const state = Store.state.supersim;
    const needle = search.trim().toLowerCase();
    return availableItems(section).filter((item) => {
      if (needle && !item.name.toLowerCase().includes(needle)) return false;
      if (state.age && item.age !== state.age) return false;
      if (state.hideDone && progressOf(section.id, item) >= item.levels) return false;
      return true;
    });
  }

  function sectionStats(section) {
    let done = 0;
    let total = 0;
    for (const item of availableItems(section)) {
      done += progressOf(section.id, item);
      total += item.levels;
    }
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  function renderSummary() {
    let done = 0;
    let total = 0;
    for (const section of doc.sections) {
      const stats = sectionStats(section);
      done += stats.done;
      total += stats.total;
    }
    const percent = total ? Math.round((done / total) * 100) : 0;
    $('#supersim-summary-text').textContent = `${done} / ${total} · ${percent} %`;
    $('#supersim-summary-bar').style.width = `${percent}%`;
  }

  /* A click only touches its own row: rebuilding every section would scroll
     the list around and drop keyboard focus. */
  function applyChange(section, item, node, delta) {
    setProgress(section.id, item, progressOf(section.id, item) + delta);
    const hadFocus = document.activeElement === node;
    if (Store.state.supersim.hideDone && progressOf(section.id, item) >= item.levels) {
      node.remove();
    } else {
      const fresh = itemControl(section, item);
      node.replaceWith(fresh);
      if (hadFocus) fresh.focus();
    }
    const pill = sectionPills.get(section.id);
    if (pill) {
      const stats = sectionStats(section);
      pill.textContent = `${stats.done}/${stats.total} · ${stats.percent} %`;
    }
    renderSummary();
  }

  function itemControl(section, item) {
    const value = progressOf(section.id, item);
    const done = value >= item.levels;
    const change = (delta) => applyChange(section, item, button, delta);

    const button = h('button', {
      type: 'button',
      class: `item-btn${done ? ' done' : ''}`,
      'aria-pressed': item.levels === 1 ? String(done) : null,
      'aria-label': item.levels === 1
        ? `${item.name} – ${done ? 'hotovo' : 'nehotovo'}`
        : `${item.name} – úroveň ${value} z ${item.levels}`,
      onclick: () => {
        if (longPressFired) { longPressFired = false; return; }
        change(item.levels === 1 ? (done ? -1 : 1) : 1);
      },
      oncontextmenu: (event) => {
        event.preventDefault();
        change(-1);
      },
      onpointerdown: () => {
        longPressFired = false;
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          longPressFired = true;
          change(-1);
        }, 550);
      },
      onpointerup: () => clearTimeout(longPressTimer),
      onpointerleave: () => clearTimeout(longPressTimer),
      onkeydown: (event) => {
        if (event.key === 'ArrowDown' || event.key === '-') {
          event.preventDefault();
          change(-1);
        }
        if (event.key === 'ArrowUp' || event.key === '+') {
          event.preventDefault();
          change(1);
        }
      },
    },
    h('span', { class: 'item-name' }, item.name),
    item.pack ? h('span', { class: 'item-pack' }, item.pack) : null,
    item.levels === 1
      ? h('span', { class: 'item-state' }, done ? '✓' : '')
      : h('span', { class: 'item-level' }, `${value}/${item.levels}`));

    if (item.levels > 1) {
      button.append(h('span', { class: 'item-bar' },
        h('span', { class: 'item-bar-fill', style: `width:${(value / item.levels) * 100}%` })));
    }
    return button;
  }

  function renderSection(section) {
    const stats = sectionStats(section);
    const collapsed = Boolean(Store.state.supersim.collapsed[section.id]);
    const items = visibleItems(section);
    const bodyId = `section-body-${section.id}`;
    const pill = h('span', { class: 'pill' }, `${stats.done}/${stats.total} · ${stats.percent} %`);
    sectionPills.set(section.id, pill);

    const header = h('div', { class: 'section-head' },
      h('button', {
        type: 'button',
        class: 'section-toggle',
        'aria-expanded': String(!collapsed),
        'aria-controls': bodyId,
        onclick: () => {
          Store.state.supersim.collapsed[section.id] = !collapsed;
          Store.touch();
          render();
        },
      }, h('span', { class: 'chevron', 'aria-hidden': 'true' }, collapsed ? '▸' : '▾'), section.label),
      pill,
      h('button', {
        type: 'button',
        class: 'ghost-btn small danger',
        onclick: async () => {
          const ok = await confirmDialog('Vynulovat sekci', `Opravdu vynulovat postup v sekci „${section.label}“?`, 'Vynulovat');
          if (!ok) return;
          for (const item of section.items) delete Store.state.supersim.progress[keyOf(section.id, item)];
          Store.touch();
          render();
        },
      }, 'Vynulovat'));

    const body = h('div', { class: 'section-body', id: bodyId, hidden: collapsed });

    if (section.incomplete) {
      body.append(h('p', { class: 'note' }, section.note || 'Seznam v této sekci zatím není kompletní.'));
    } else if (section.note) {
      body.append(h('p', { class: 'note' }, section.note));
    }

    if (!items.length) {
      body.append(h('p', { class: 'muted' }, availableItems(section).length ? 'Filtrům nic neodpovídá.' : 'Zatím tu nejsou žádné položky.'));
    } else if (section.groupBy === 'category') {
      const groups = new Map();
      for (const item of items) {
        if (!groups.has(item.category)) groups.set(item.category, []);
        groups.get(item.category).push(item);
      }
      for (const [category, groupItems] of groups) {
        body.append(h('div', { class: 'group' },
          h('h4', { class: 'group-title' }, category),
          h('div', { class: 'items' }, groupItems.map((item) => itemControl(section, item)))));
      }
    } else {
      body.append(h('div', { class: 'items' }, items.map((item) => itemControl(section, item))));
    }

    return h('section', { class: 'card tracker-section' }, header, body);
  }

  function render() {
    if (!doc) return;
    const box = $('#supersim-sections');
    clearNode(box);
    sectionPills.clear();
    const state = Store.state.supersim;
    for (const section of doc.sections) {
      // While searching or filtering by age, sections with no hit only add noise.
      if ((state.age || search.trim()) && !visibleItems(section).length) continue;
      box.append(renderSection(section));
    }
    renderSummary();
  }

  function syncFromState() {
    if (!doc) return;
    const state = Store.state.supersim;
    if (!state.progress || typeof state.progress !== 'object') state.progress = {};
    if (!state.collapsed || typeof state.collapsed !== 'object') state.collapsed = {};
    $('#supersim-hide-done').checked = Boolean(state.hideDone);
    $('#supersim-age').value = state.age || '';
    $('#supersim-search').value = search;
    render();
  }

  async function activate() {
    active = true;
    if (doc) { syncFromState(); return; }
    try {
      doc = await loadData('supersim');
      hideTabError('supersim-error');
      syncFromState();
    } catch (error) {
      showTabError('supersim-error', `${error.message} Zkus stránku načíst znovu.`);
    }
  }

  function init() {
    $('#supersim-search').addEventListener('input', (event) => {
      search = event.target.value;
      render();
    });
    $('#supersim-age').addEventListener('change', (event) => {
      Store.state.supersim.age = event.target.value;
      Store.touch();
      render();
    });
    $('#supersim-hide-done').addEventListener('change', (event) => {
      Store.state.supersim.hideDone = event.target.checked;
      Store.touch();
      render();
    });
    $('#supersim-reset-all').addEventListener('click', async () => {
      const ok = await confirmDialog('Vynulovat celý tracker', 'Opravdu smazat celý postup Super Sima? Tohle nejde vrátit.', 'Vynulovat vše');
      if (!ok) return;
      Store.state.supersim.progress = {};
      Store.touch();
      render();
      toast('Postup vynulovaný.', 'ok');
    });
    registerTab('supersim', { activate });
  }

  return {
    init,
    syncFromState: () => { if (doc) syncFromState(); },
    refreshIfActive: () => { if (active && doc) render(); },
  };
})();

/* ==========================================================================
   Boot
   ========================================================================== */

function initProfileBar() {
  $('#profile-select').addEventListener('change', (event) => {
    Store.selectProfile(Number(event.target.value));
  });
  $('#profile-manage').addEventListener('click', manageProfilesFlow);
  $('#save-retry').addEventListener('click', () => {
    Store.dirty = true;
    Store.flush();
  });
  $('#conflict-reload').addEventListener('click', async () => {
    hideConflictBanner();
    await Store.selectProfile(Store.currentId, { force: true });
    toast('Profil načtený znovu.', 'ok');
  });
  $('#conflict-dismiss').addEventListener('click', hideConflictBanner);
}

async function boot() {
  initTheme();
  initTabs();
  initProfileBar();

  Wheel.init();
  RandomNumber.init();
  SimGen.init();
  Packs.init();
  Supersim.init();

  Store.onChange(() => {
    Wheel.syncFromState();
    RandomNumber.syncFromState();
    SimGen.syncFromState();
    Packs.syncFromState();
    Supersim.syncFromState();
  });

  try {
    await Store.loadProfiles();
  } catch (error) {
    toast(`Profily se nepodařilo načíst: ${error.message}`, 'error');
    Store.setStatus('offline', error.message);
  }

  let last = null;
  try { last = Number(localStorage.getItem('simshub:lastProfile')); } catch { /* ignore */ }
  const initial = Store.profiles.find((profile) => profile.id === last) || Store.profiles[0];
  if (initial) {
    await Store.selectProfile(initial.id, { force: true });
  } else {
    Store.emit();
  }

  await activateRoute(routeFromHash());

  setInterval(() => Store.pollForRemoteChange(), POLL_INTERVAL_MS);
  window.addEventListener('online', () => { if (Store.dirty) Store.flush(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) Store.pollForRemoteChange();
  });
  // Best-effort save when the tab goes away before the debounce fires.
  window.addEventListener('pagehide', () => {
    if (!Store.dirty || Store.currentId === null) return;
    try {
      fetch(`${BASE}/api/profiles/${Store.currentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: Store.state }),
        keepalive: true,
      });
    } catch { /* nothing else to try at this point */ }
  });
}

boot();
