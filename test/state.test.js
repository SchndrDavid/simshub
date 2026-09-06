'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const testDbPath = path.join(__dirname, 'test-simshub-state.db');
process.env.SIMSHUB_DB_PATH = testDbPath;

const store = require('../db');
const app = require('../server');

let server;
let baseUrl;

test.before(async () => {
  store.ensureDefaultProfile('Hlavní');
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  store.db.close();
  try { fs.unlinkSync(testDbPath); } catch {}
  try { fs.unlinkSync(`${testDbPath}-wal`); } catch {}
  try { fs.unlinkSync(`${testDbPath}-shm`); } catch {}
});

test('GET /api/state returns current state', async () => {
  const res = await fetch(`${baseUrl}/api/state`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.ok(json.updated_at);
  assert.equal(typeof json.data, 'object');
});

test('PATCH /api/state updates state across devices', async () => {
  const payload = {
    simsmix: { gender: 'female', traits: ['creative'] },
    supersim: { progress: { 'milestones:first_steps': 1 } },
  };
  const patchRes = await fetch(`${baseUrl}/api/state`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: payload }),
  });
  assert.equal(patchRes.status, 200);
  const patchJson = await patchRes.json();
  assert.deepEqual(patchJson.data, payload);

  // Subsequent GET returns the updated state
  const getRes = await fetch(`${baseUrl}/api/state`);
  assert.equal(getRes.status, 200);
  const getJson = await getRes.json();
  assert.deepEqual(getJson.data, payload);
  assert.equal(getJson.updated_at, patchJson.updated_at);
});

test('GET /api/state/export downloads JSON file', async () => {
  const res = await fetch(`${baseUrl}/api/state/export`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-disposition'), /simshub-data\.json/);
  const json = await res.json();
  assert.equal(json.app, 'simshub');
  assert.ok(json.data);
});

