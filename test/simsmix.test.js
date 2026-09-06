'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const simsmixPath = path.join(__dirname, '..', 'public', 'data', 'simsmix.json');

test('simsmix.json data integrity', () => {
  assert.ok(fs.existsSync(simsmixPath), 'simsmix.json should exist');
  const data = JSON.parse(fs.readFileSync(simsmixPath, 'utf8'));

  // Sexes
  assert.ok(Array.isArray(data.sexes), 'sexes must be an array');
  assert.equal(data.sexes.length, 2, 'should have male and female');
  for (const s of data.sexes) {
    assert.ok(s.id && s.ru && s.cs && s.en, `sex ${s.id} must have ru, cs, en`);
  }

  // Character values (5 Parenthood values)
  assert.ok(Array.isArray(data.character_values), 'character_values must be an array');
  assert.equal(data.character_values.length, 5, 'must have exactly 5 character values');
  const expectedValues = ['manners', 'responsibility', 'emotional_control', 'empathy', 'conflict_resolution'];
  for (const expectedId of expectedValues) {
    const val = data.character_values.find((v) => v.id === expectedId);
    assert.ok(val, `character value ${expectedId} must exist`);
    assert.ok(val.nameRu && val.nameCs && val.nameEn, `${expectedId} must have names in all 3 languages`);
    assert.ok(val.positive.ru && val.negative.ru && val.neutral.ru, `${expectedId} must have ru states`);
  }

  // Infant traits
  assert.ok(Array.isArray(data.infant_traits), 'infant_traits must be an array');
  assert.ok(data.infant_traits.length >= 6, 'should have at least 6 infant traits');

  // Toddler traits
  assert.ok(Array.isArray(data.toddler_traits), 'toddler_traits must be an array');
  assert.ok(data.toddler_traits.length >= 8, 'should have at least 8 toddler traits');

  // Aspirations
  assert.ok(Array.isArray(data.child_aspirations), 'child_aspirations must be an array');
  assert.ok(data.child_aspirations.length >= 8, 'should have at least 8 child aspirations');
  assert.ok(Array.isArray(data.teen_aspirations), 'teen_aspirations must be an array');
  assert.ok(data.teen_aspirations.length >= 4, 'should have at least 4 teen aspirations');
  assert.ok(Array.isArray(data.adult_aspirations), 'adult_aspirations must be an array');
  assert.ok(data.adult_aspirations.length >= 35, 'should have at least 35 adult aspirations');

  // Careers
  assert.ok(Array.isArray(data.teen_careers), 'teen_careers must be an array');
  assert.ok(data.teen_careers.length >= 8, 'should have at least 8 teen careers');
  assert.ok(Array.isArray(data.adult_careers), 'adult_careers must be an array');
  assert.ok(data.adult_careers.length >= 25, 'should have at least 25 adult careers');

  // Check that branched careers have branches
  const astronaut = data.adult_careers.find((c) => c.en === 'Astronaut');
  assert.ok(astronaut, 'astronaut career must exist');
  assert.ok(Array.isArray(astronaut.branches) && astronaut.branches.length === 2, 'astronaut must have 2 branches');

  // CAS Traits
  assert.ok(Array.isArray(data.traits), 'traits must be an array');
  assert.ok(data.traits.length >= 40, 'should have at least 40 CAS traits');
  const childEligible = data.traits.filter((t) => t.childOk);
  assert.ok(childEligible.length >= 10, 'should have at least 10 child-eligible traits');
});

test('SimsMix generation logic: character values and gender', () => {
  const data = JSON.parse(fs.readFileSync(simsmixPath, 'utf8'));

  // Gender roll
  const rollGender = (opt) => {
    if (opt === 'male') return data.sexes.find((s) => s.id === 'male');
    if (opt === 'female') return data.sexes.find((s) => s.id === 'female');
    return data.sexes[Math.floor(Math.random() * data.sexes.length)];
  };

  assert.equal(rollGender('male').id, 'male');
  assert.equal(rollGender('female').id, 'female');
  const rndGender = rollGender('random');
  assert.ok(['male', 'female'].includes(rndGender.id));

  // Character value roll
  const rollValue = (valueDef, choice) => {
    const states = ['positive', 'negative', 'neutral'];
    const chosenState = choice === 'random' || !choice ? states[Math.floor(Math.random() * states.length)] : choice;
    return {
      id: valueDef.id,
      state: chosenState,
      text: valueDef[chosenState],
    };
  };

  for (const cv of data.character_values) {
    const resPos = rollValue(cv, 'positive');
    assert.equal(resPos.state, 'positive');
    assert.ok(resPos.text.ru);

    const resNeg = rollValue(cv, 'negative');
    assert.equal(resNeg.state, 'negative');

    const resNeu = rollValue(cv, 'neutral');
    assert.equal(resNeu.state, 'neutral');
  }
});

test('SimsMix generation logic: trait selection and parent inheritance', () => {
  const data = JSON.parse(fs.readFileSync(simsmixPath, 'utf8'));

  // Trait roll helper
  function rollSimTraits({ childTraitsOnly = false, exclude = [], parentTraits = [] }) {
    const pool = data.traits.filter((t) => {
      if (exclude.includes(t.en)) return false;
      if (childTraitsOnly && !t.childOk) return false;
      return true;
    });

    const parentCandidates = pool.filter((t) => parentTraits.includes(t.en));
    if (parentCandidates.length > 0 && Math.random() < 0.6) {
      return parentCandidates[Math.floor(Math.random() * parentCandidates.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 1. Child trait
  const trait1 = rollSimTraits({ childTraitsOnly: true });
  assert.ok(trait1, 'child trait generated');
  assert.ok(trait1.childOk, 'trait must be child-eligible');

  // 2. Teen trait (cannot duplicate trait1)
  const trait2 = rollSimTraits({ childTraitsOnly: false, exclude: [trait1.en] });
  assert.notEqual(trait1.en, trait2.en, 'traits must not duplicate');

  // 3. Adult trait (cannot duplicate trait1 or trait2)
  const trait3 = rollSimTraits({ childTraitsOnly: false, exclude: [trait1.en, trait2.en] });
  assert.notEqual(trait1.en, trait3.en);
  assert.notEqual(trait2.en, trait3.en);

  // 4. Test heredity bias
  const parentPool = ['Active', 'Ambitious', 'Art Lover'];
  let inheritedCount = 0;
  const trials = 200;
  for (let i = 0; i < trials; i++) {
    const picked = rollSimTraits({ childTraitsOnly: false, parentTraits: parentPool });
    if (parentPool.includes(picked.en)) inheritedCount++;
  }
  assert.ok(inheritedCount > 50, `inheritedCount (${inheritedCount}/${trials}) should reflect heredity weight`);
});
