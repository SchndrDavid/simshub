'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Run tests with isolated DB
const testDbPath = path.join(__dirname, 'test-simshub.db');
process.env.SIMSHUB_DB_PATH = testDbPath;

const store = require('../db');

test.after(() => {
  store.db.close();
  try { fs.unlinkSync(testDbPath); } catch {}
  try { fs.unlinkSync(`${testDbPath}-wal`); } catch {}
  try { fs.unlinkSync(`${testDbPath}-shm`); } catch {}
});

test('store manages profiles correctly', () => {
  const seeded = store.ensureDefaultProfile('Hlavní');
  assert.ok(seeded);

  const profiles = store.listProfiles();
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].name, 'Hlavní');

  // Name taken check
  assert.ok(store.nameTaken('Hlavní'));
  assert.ok(!store.nameTaken('Druhá postava'));

  // Create profile
  const p2 = store.createProfile('Druhá postava', JSON.stringify({ test: 123 }));
  assert.equal(p2.name, 'Druhá postava');

  // Update profile
  const updated = store.updateProfile(p2.id, { name: 'Přejmenovaná postava' });
  assert.equal(updated.name, 'Přejmenovaná postava');

  // Delete profile
  const deleted = store.deleteProfile(p2.id);
  assert.ok(deleted);
  assert.equal(store.countProfiles(), 1);
});

