'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const packsDataPath = path.join(__dirname, '..', 'public', 'data', 'packs.json');
const publicDir = path.join(__dirname, '..', 'public');

/* Pure pack logic matching public/app.js */

function filterOwned(packs, ownedMap) {
  return packs.filter((pack) => (ownedMap ? ownedMap[pack.name] !== false : true));
}

function filterActive(packs, ownedMap, weights) {
  return filterOwned(packs, ownedMap).filter((pack) => {
    const w = weights && weights[pack.category] !== undefined ? Number(weights[pack.category]) : 1;
    return w > 0;
  });
}

function drawPacksLogic({ packs, ownedMap, weights, count, eachCategory }) {
  const pool = filterActive(packs, ownedMap, weights);
  if (!pool.length) return { error: 'no_active_packs', results: [] };
  if (pool.length <= count) return { results: pool.slice() };

  const weightOf = (cat) => (weights && weights[cat] !== undefined ? Number(weights[cat]) : 1);
  const activeCategories = [...new Set(pool.map((p) => p.category))];
  const picked = [];
  const remaining = pool.slice();

  const take = (candidates) => {
    if (!candidates.length) return false;
    const totalWeight = candidates.reduce((sum, p) => sum + weightOf(p.category), 0);
    if (totalWeight <= 0) return false;
    const chosen = candidates[0];
    picked.push(chosen);
    const index = remaining.indexOf(chosen);
    if (index >= 0) remaining.splice(index, 1);
    return true;
  };

  if (eachCategory && count >= activeCategories.length) {
    for (const category of activeCategories) {
      take(remaining.filter((p) => p.category === category));
    }
  }

  while (picked.length < count && remaining.length) {
    if (!take(remaining)) break;
  }

  return { results: picked };
}

test('packs.json data integrity', () => {
  assert.ok(fs.existsSync(packsDataPath), 'packs.json must exist');
  const raw = fs.readFileSync(packsDataPath, 'utf8');
  const data = JSON.parse(raw);
  assert.ok(Array.isArray(data.packs), 'data.packs must be an array');
  assert.ok(data.packs.length >= 90, 'must have at least 90 packs');

  const validCategories = new Set(['expansion', 'gamepack', 'stuffpack', 'kit']);
  const validSubtypes = new Set(['cas', 'build', 'other', null, undefined]);

  for (const pack of data.packs) {
    assert.ok(typeof pack.name === 'string' && pack.name.length > 0, `pack name must be valid: ${JSON.stringify(pack)}`);
    assert.ok(validCategories.has(pack.category), `pack category must be valid: ${pack.name} (${pack.category})`);
    if (pack.category === 'kit') {
      assert.ok(validSubtypes.has(pack.subtype), `kit subtype must be valid: ${pack.name} (${pack.subtype})`);
    }
    assert.ok(typeof pack.icon === 'string' && pack.icon.length > 0, `pack icon must be defined: ${pack.name}`);
    assert.ok(pack.icon.startsWith('icons/packs/'), `icon path must be in icons/packs/: ${pack.name}`);
  }
});

test('all pack icon files exist on disk in public/', () => {
  const data = JSON.parse(fs.readFileSync(packsDataPath, 'utf8'));
  const missingFiles = [];

  for (const pack of data.packs) {
    const fullPath = path.join(publicDir, pack.icon);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push({ pack: pack.name, icon: pack.icon });
    }
  }

  assert.deepEqual(missingFiles, [], `All pack icon files must exist on disk. Missing: ${JSON.stringify(missingFiles)}`);
});

test('owned packs filtering excludes unowned items', () => {
  const dummyPacks = [
    { name: 'Get to Work', category: 'expansion' },
    { name: 'Seasons', category: 'expansion' },
    { name: 'Vampires', category: 'gamepack' },
  ];
  const ownedMap = {
    'Get to Work': true,
    'Seasons': false,
  };

  const owned = filterOwned(dummyPacks, ownedMap);
  assert.equal(owned.length, 2);
  assert.ok(owned.some((p) => p.name === 'Get to Work'));
  assert.ok(owned.some((p) => p.name === 'Vampires'));
  assert.ok(!owned.some((p) => p.name === 'Seasons'));
});

test('active packs filtering respects category weights', () => {
  const dummyPacks = [
    { name: 'Get to Work', category: 'expansion' },
    { name: 'Vampires', category: 'gamepack' },
    { name: 'Tiny Living', category: 'stuffpack' },
  ];
  const weights = {
    expansion: 1,
    gamepack: 0,
    stuffpack: 2,
  };

  const active = filterActive(dummyPacks, {}, weights);
  assert.equal(active.length, 2);
  assert.ok(active.some((p) => p.name === 'Get to Work'));
  assert.ok(active.some((p) => p.name === 'Tiny Living'));
  assert.ok(!active.some((p) => p.name === 'Vampires'));
});

test('drawPacksLogic guarantees at least one per category when option is active and count allows', () => {
  const dummyPacks = [
    { name: 'Expansion 1', category: 'expansion' },
    { name: 'Expansion 2', category: 'expansion' },
    { name: 'Gamepack 1', category: 'gamepack' },
    { name: 'Stuffpack 1', category: 'stuffpack' },
  ];

  const result = drawPacksLogic({
    packs: dummyPacks,
    ownedMap: {},
    weights: { expansion: 1, gamepack: 1, stuffpack: 1 },
    count: 3,
    eachCategory: true,
  });

  assert.equal(result.results.length, 3);
  const categories = new Set(result.results.map((p) => p.category));
  assert.equal(categories.size, 3);
  assert.ok(categories.has('expansion'));
  assert.ok(categories.has('gamepack'));
  assert.ok(categories.has('stuffpack'));
});
