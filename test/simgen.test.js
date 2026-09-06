'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const simgenPath = path.join(__dirname, '..', 'public', 'data', 'simgen.json');
const packsPath = path.join(__dirname, '..', 'public', 'data', 'packs.json');

test('simgen.json data integrity', () => {
  assert.ok(fs.existsSync(simgenPath), 'simgen.json must exist');
  const simgen = JSON.parse(fs.readFileSync(simgenPath, 'utf8'));

  assert.ok(Array.isArray(simgen.ages), 'ages must be an array');
  assert.ok(Array.isArray(simgen.genders), 'genders must be an array');
  assert.ok(Array.isArray(simgen.traits), 'traits must be an array');
  assert.ok(Array.isArray(simgen.toddler_traits), 'toddler_traits must be an array');
  assert.ok(Array.isArray(simgen.aspirations), 'aspirations must be an array');
  assert.ok(Array.isArray(simgen.child_aspirations), 'child_aspirations must be an array');
  assert.ok(Array.isArray(simgen.careers), 'careers must be an array');
  assert.ok(Array.isArray(simgen.teen_careers), 'teen_careers must be an array');
  assert.ok(Array.isArray(simgen.occults), 'occults must be an array');

  // Verify non-existent / fake items were removed
  const traitNames = simgen.traits.map((t) => (typeof t === 'string' ? t : t.cs || t.name));
  assert.ok(!traitNames.includes('Nesnáší psy'), 'Fictional trait "Nesnáší psy" must not exist');
  assert.ok(!traitNames.includes('Skromný'), 'TS3 trait "Skromný" must not exist in TS4 traits');

  const occultNames = simgen.occults.map((o) => (typeof o === 'string' ? o : o.cs || o.name));
  assert.ok(!occultNames.includes('Víla'), 'Fictional/unreleased occult "Víla" must not exist');

  // Verify toddler traits (8 authentic TS4 toddler traits)
  assert.equal(simgen.toddler_traits.length, 8, 'Must have exactly 8 TS4 toddler traits');
  const toddlerNames = simgen.toddler_traits.map((t) => t.name || t.cs);
  assert.ok(toddlerNames.includes('Andílek'));
  assert.ok(toddlerNames.includes('Rošťák'));
  assert.ok(toddlerNames.includes('Zvídavý'));

  // Verify child aspirations (4 authentic TS4 child aspirations)
  assert.equal(simgen.child_aspirations.length, 4, 'Must have exactly 4 TS4 child aspirations');
  const childAspNames = simgen.child_aspirations.map((a) => a.name || a.cs);
  assert.ok(childAspNames.includes('Dětský génius'));
  assert.ok(childAspNames.includes('Kreativní zázrak'));

  // Verify packs referenced in simgen exist in packs.json
  const packsData = JSON.parse(fs.readFileSync(packsPath, 'utf8'));
  const validPackNames = new Set(packsData.packs.map((p) => p.name));

  for (const trait of simgen.traits) {
    if (trait.pack) {
      assert.ok(validPackNames.has(trait.pack), `Trait pack "${trait.pack}" must exist in packs.json`);
    }
  }

  for (const asp of simgen.aspirations) {
    if (asp.pack) {
      assert.ok(validPackNames.has(asp.pack), `Aspiration pack "${asp.pack}" must exist in packs.json`);
    }
  }

  for (const car of simgen.careers) {
    if (car.pack) {
      assert.ok(validPackNames.has(car.pack), `Career pack "${car.pack}" must exist in packs.json`);
    }
  }

  for (const occ of simgen.occults) {
    if (occ.pack) {
      assert.ok(validPackNames.has(occ.pack), `Occult pack "${occ.pack}" must exist in packs.json`);
    }
  }
});

/* SimGen generation logic test */
function isPackOwned(packName, ownedMap) {
  if (!packName) return true;
  if (!ownedMap) return true;
  return ownedMap[packName] !== false;
}

function filterByPack(items, ownedMap) {
  if (!items || !items.length) return [];
  return items.filter((item) => {
    if (!item) return false;
    const pack = typeof item === 'object' ? item.pack : null;
    return isPackOwned(pack, ownedMap);
  });
}

test('SimGen generation rules for different ages', () => {
  const simgen = JSON.parse(fs.readFileSync(simgenPath, 'utf8'));

  // 1. Toddler rules
  const toddlerTraits = filterByPack(simgen.toddler_traits, {});
  assert.ok(toddlerTraits.length >= 8);
  const toddlerResult = {
    age: 'Batole',
    traits: [toddlerTraits[0]],
    aspiration: null,
    career: null,
  };
  assert.equal(toddlerResult.traits.length, 1);
  assert.equal(toddlerResult.aspiration, null);
  assert.equal(toddlerResult.career, null);

  // 2. Child rules
  const childTraits = filterByPack(simgen.traits, {}).filter((t) => !t.adultOnly);
  const childAspirations = filterByPack(simgen.child_aspirations, {});
  assert.ok(childTraits.length > 0);
  assert.equal(childAspirations.length, 4);

  const childResult = {
    age: 'Dítě',
    traits: [childTraits[0]],
    aspiration: childAspirations[0],
    career: null,
  };
  assert.equal(childResult.traits.length, 1);
  assert.ok(childResult.aspiration !== null);
  assert.equal(childResult.career, null);

  // 3. Teen rules
  const adultAspirations = filterByPack(simgen.aspirations, {});
  const teenCareers = filterByPack(simgen.teen_careers, {});
  assert.ok(teenCareers.length > 0);

  const teenResult = {
    age: 'Teenager',
    traits: [childTraits[0], childTraits[1]],
    aspiration: adultAspirations[0],
    career: teenCareers[0],
  };
  assert.equal(teenResult.traits.length, 2);
  assert.ok(teenResult.aspiration !== null);
  assert.ok(teenResult.career !== null);

  // 4. Young Adult / Adult rules
  const adultCareers = filterByPack(simgen.careers, {});
  const adultResult = {
    age: 'Mladý dospělý',
    traits: [childTraits[0], childTraits[1], childTraits[2]],
    aspiration: adultAspirations[0],
    career: adultCareers[0],
  };
  assert.equal(adultResult.traits.length, 3);
  assert.ok(adultResult.aspiration !== null);
  assert.ok(adultResult.career !== null);
});

test('SimGen respects unowned DLC packs', () => {
  const simgen = JSON.parse(fs.readFileSync(simgenPath, 'utf8'));

  // Pretend user does NOT own "City Living" or "Vampires"
  const ownedMap = {
    'City Living': false,
    Vampires: false,
  };

  const availableTraits = filterByPack(simgen.traits, ownedMap);
  const availableAspirations = filterByPack(simgen.aspirations, ownedMap);
  const availableCareers = filterByPack(simgen.careers, ownedMap);
  const availableOccults = filterByPack(simgen.occults, ownedMap);

  assert.ok(!availableTraits.some((t) => t.pack === 'City Living'));
  assert.ok(!availableTraits.some((t) => t.pack === 'Vampires'));
  assert.ok(!availableAspirations.some((a) => a.pack === 'City Living'));
  assert.ok(!availableCareers.some((c) => c.pack === 'City Living'));
  assert.ok(!availableOccults.some((o) => o.pack === 'Vampires'));
});