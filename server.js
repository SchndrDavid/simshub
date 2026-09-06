'use strict';

const path = require('node:path');
const express = require('express');
const store = require('./db');

const PORT = Number(process.env.PORT || 8000);
const SERVICE = 'simshub';
const DEFAULT_PROFILE_NAME = 'Hlavní';
const MAX_NAME_LENGTH = 80;
const MAX_DATA_BYTES = 5 * 1024 * 1024;

const app = express();
app.disable('x-powered-by');
// Slightly above MAX_DATA_BYTES so oversized payloads can be rejected with
// a readable message instead of a parser error.
app.use(express.json({ limit: '6mb' }));

// User-facing strings are Czech because the interface is Czech.
function fail(res, status, message) {
  return res.status(status).json({ error: message });
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name || name.length > MAX_NAME_LENGTH) return null;
  return name;
}

// The whole tool state travels as one JSON object; anything else is refused.
function serializeData(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'Data musí být JSON objekt.' };
  }
  let text;
  try {
    text = JSON.stringify(value);
  } catch {
    return { error: 'Data se nepodařilo serializovat do JSON.' };
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_DATA_BYTES) {
    return { error: 'Data jsou příliš velká (limit je 5 MB).' };
  }
  return { text };
}

function withParsedData(row) {
  let data;
  try {
    data = JSON.parse(row.data);
  } catch {
    data = {};
  }
  return { id: row.id, name: row.name, data, updated_at: row.updated_at };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: SERVICE });
});

function getGlobalProfile() {
  store.ensureDefaultProfile(DEFAULT_PROFILE_NAME);
  const row = store.getProfile(1) || store.listProfiles()[0];
  if (row) return store.getProfile(row.id);
  return store.createProfile(DEFAULT_PROFILE_NAME, '{}');
}

app.get('/api/state', (req, res) => {
  const profile = getGlobalProfile();
  return res.json(withParsedData(profile));
});

function handleUpdateState(req, res) {
  const body = req.body || {};
  if (body.data === undefined) {
    return fail(res, 400, 'Nic k uložení – pošli data.');
  }
  const result = serializeData(body.data);
  if (result.error) return fail(res, result.error.includes('5 MB') ? 413 : 400, result.error);

  const profile = getGlobalProfile();
  const updated = store.updateProfile(profile.id, { data: result.text });
  return res.json(withParsedData(updated));
}

app.patch('/api/state', handleUpdateState);
app.put('/api/state', handleUpdateState);
app.post('/api/state', handleUpdateState);

app.get('/api/state/export', (req, res) => {
  const row = getGlobalProfile();
  const profile = withParsedData(row);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="simshub-data.json"');
  return res.send(JSON.stringify({
    app: SERVICE,
    data: profile.data,
    updated_at: profile.updated_at,
    exported_at: new Date().toISOString(),
  }, null, 2));
});

app.get('/api/profiles', (req, res) => {
  res.json(store.listProfiles());
});

app.post('/api/profiles', (req, res) => {
  const name = normalizeName(req.body && req.body.name);
  if (!name) return fail(res, 400, 'Zadej název profilu (1–80 znaků).');
  if (store.nameTaken(name)) return fail(res, 409, `Profil „${name}“ už existuje. Zvol jiný název.`);
  return res.status(201).json(withParsedData(store.createProfile(name, '{}')));
});

app.get('/api/profiles/:id', (req, res) => {
  const id = parseId(req.params.id);
  const row = id && store.getProfile(id);
  if (!row) return fail(res, 404, 'Profil neexistuje.');
  return res.json(withParsedData(row));
});

app.patch('/api/profiles/:id', (req, res) => {
  const id = parseId(req.params.id);
  const row = id && store.getProfile(id);
  if (!row) return fail(res, 404, 'Profil neexistuje.');

  const body = req.body || {};
  const patch = {};

  if (body.name !== undefined) {
    const name = normalizeName(body.name);
    if (!name) return fail(res, 400, 'Zadej název profilu (1–80 znaků).');
    if (store.nameTaken(name, id)) return fail(res, 409, `Profil „${name}“ už existuje. Zvol jiný název.`);
    patch.name = name;
  }

  if (body.data !== undefined) {
    const result = serializeData(body.data);
    if (result.error) return fail(res, result.error.includes('5 MB') ? 413 : 400, result.error);
    patch.data = result.text;
  }

  if (patch.name === undefined && patch.data === undefined) {
    return fail(res, 400, 'Nic k uložení – pošli name nebo data.');
  }

  return res.json(withParsedData(store.updateProfile(id, patch)));
});

app.delete('/api/profiles/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id || !store.getProfile(id)) return fail(res, 404, 'Profil neexistuje.');
  store.deleteProfile(id);
  // The UI always needs something to switch to after the last profile is gone.
  store.ensureDefaultProfile(DEFAULT_PROFILE_NAME);
  return res.status(204).end();
});

app.get('/api/profiles/:id/export', (req, res) => {
  const id = parseId(req.params.id);
  const row = id && store.getProfile(id);
  if (!row) return fail(res, 404, 'Profil neexistuje.');
  const profile = withParsedData(row);
  const safeName = profile.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'profil';
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="simshub-${safeName}.json"`);
  return res.send(JSON.stringify({
    app: SERVICE,
    name: profile.name,
    data: profile.data,
    updated_at: profile.updated_at,
    exported_at: new Date().toISOString(),
  }, null, 2));
});

app.post('/api/profiles/import', (req, res) => {
  const body = req.body || {};
  const name = normalizeName(body.name);
  if (!name) return fail(res, 400, 'Zadej název profilu (1–80 znaků).');
  if (store.nameTaken(name)) return fail(res, 409, `Profil „${name}“ už existuje. Zvol jiný název.`);

  const result = serializeData(body.data === undefined ? {} : body.data);
  if (result.error) return fail(res, result.error.includes('5 MB') ? 413 : 400, result.error);

  return res.status(201).json(withParsedData(store.createProfile(name, result.text)));
});

app.use('/api', (req, res) => fail(res, 404, 'Neznámý endpoint.'));

// Registered last: routes match in registration order, so the static mount
// must not shadow /api/…
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return fail(res, 413, 'Data jsou příliš velká (limit je 5 MB).');
  }
  if (err && err.type === 'entity.parse.failed') {
    return fail(res, 400, 'Tělo požadavku není platný JSON.');
  }
  console.error('[simshub] unhandled error:', err);
  return fail(res, 500, 'Chyba serveru.');
});

if (require.main === module) {
  const seeded = store.ensureDefaultProfile(DEFAULT_PROFILE_NAME);
  if (seeded) {
    console.log(`[simshub] created default profile "${DEFAULT_PROFILE_NAME}"`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[simshub] listening on 0.0.0.0:${PORT}, database at ${store.DB_PATH}`);
  });
}

module.exports = app;
