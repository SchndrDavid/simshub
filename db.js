'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.SIMSHUB_DB_PATH || path.join(__dirname, 'data', 'simshub.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
  );
`);

const statements = {
  list: db.prepare('SELECT id, name, updated_at FROM profiles ORDER BY name COLLATE NOCASE'),
  get: db.prepare('SELECT id, name, data, updated_at FROM profiles WHERE id = ?'),
  getByName: db.prepare('SELECT id FROM profiles WHERE name = ? COLLATE NOCASE'),
  insert: db.prepare('INSERT INTO profiles (name, data, updated_at) VALUES (?, ?, ?)'),
  updateName: db.prepare('UPDATE profiles SET name = ?, updated_at = ? WHERE id = ?'),
  updateData: db.prepare('UPDATE profiles SET data = ?, updated_at = ? WHERE id = ?'),
  updateBoth: db.prepare('UPDATE profiles SET name = ?, data = ?, updated_at = ? WHERE id = ?'),
  remove: db.prepare('DELETE FROM profiles WHERE id = ?'),
  count: db.prepare('SELECT COUNT(*) AS n FROM profiles'),
};

function now() {
  return new Date().toISOString();
}

function listProfiles() {
  return statements.list.all();
}

function getProfile(id) {
  return statements.get.get(id);
}

function nameTaken(name, exceptId) {
  const row = statements.getByName.get(name);
  return Boolean(row) && row.id !== exceptId;
}

function createProfile(name, data = '{}') {
  const info = statements.insert.run(name, data, now());
  return getProfile(info.lastInsertRowid);
}

function updateProfile(id, { name, data }) {
  const stamp = now();
  if (name !== undefined && data !== undefined) {
    statements.updateBoth.run(name, data, stamp, id);
  } else if (name !== undefined) {
    statements.updateName.run(name, stamp, id);
  } else if (data !== undefined) {
    statements.updateData.run(data, stamp, id);
  }
  return getProfile(id);
}

function deleteProfile(id) {
  return statements.remove.run(id).changes > 0;
}

function countProfiles() {
  return statements.count.get().n;
}

// A fresh database would otherwise leave the UI without a profile to select.
function ensureDefaultProfile(defaultName) {
  if (countProfiles() === 0) {
    createProfile(defaultName, '{}');
    return true;
  }
  return false;
}

module.exports = {
  DB_PATH,
  db,
  listProfiles,
  getProfile,
  nameTaken,
  createProfile,
  updateProfile,
  deleteProfile,
  countProfiles,
  ensureDefaultProfile,
};
