'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const supersimPath = path.join(__dirname, '..', 'public', 'data', 'supersim.json');
const packsPath = path.join(__dirname, '..', 'public', 'data', 'packs.json');

test('supersim.json data integrity', () => {
  assert.ok(fs.existsSync(supersimPath), 'supersim.json must exist');
  const data = JSON.parse(fs.readFileSync(supersimPath, 'utf8'));
  assert.ok(Array.isArray(data.sections), 'sections must be an array');
  assert.ok(data.sections.length >= 10, 'must have at least 10 sections');

  const packsData = JSON.parse(fs.readFileSync(packsPath, 'utf8'));
  const validPacks = new Set(packsData.packs.map((p) => p.name));

  // Verify fairy_abilities is removed
  assert.ok(!data.sections.some((s) => s.id === 'fairy_abilities'), 'Fictional section "fairy_abilities" must not exist');

  // Verify werewolf and ghost sections are populated
  const werewolfSection = data.sections.find((s) => s.id === 'werewolf_abilities');
  assert.ok(werewolfSection, 'werewolf_abilities section must exist');
  assert.ok(werewolfSection.items.length >= 15, 'werewolf_abilities must have at least 15 items');

  const ghostSection = data.sections.find((s) => s.id === 'ghost_mastery');
  assert.ok(ghostSection, 'ghost_mastery section must exist');
  assert.ok(ghostSection.items.length >= 10, 'ghost_mastery must have at least 10 items');

  // Verify skills
  const skillsSection = data.sections.find((s) => s.id === 'skills');
  assert.ok(skillsSection, 'skills section must exist');
  assert.ok(!skillsSection.items.some((i) => i.name === 'Pottery' || i.en === 'Pottery'), 'Fictional skill "Pottery" must not exist');

  const potty = skillsSection.items.find((i) => i.en === 'Potty' || i.name === 'Nočník');
  assert.ok(potty, 'Potty skill must exist');
  assert.equal(potty.levels, 3, 'Potty skill must have exactly 3 levels in TS4');

  const photography = skillsSection.items.find((i) => i.en === 'Photography' || i.name === 'Fotografování');
  assert.ok(photography, 'Photography skill must exist');
  assert.equal(photography.levels, 5, 'Photography skill must have 5 levels in TS4');

  const mediaProduction = skillsSection.items.find((i) => i.en === 'Media Production' || i.name === 'Tvorba médií');
  assert.ok(mediaProduction, 'Media Production skill must exist');
  assert.equal(mediaProduction.levels, 5, 'Media Production skill must have 5 levels in TS4');

  const vampireLore = skillsSection.items.find((i) => i.en === 'Vampire Lore' || i.name === 'Upíří tradice');
  assert.ok(vampireLore, 'Vampire Lore skill must exist');
  assert.equal(vampireLore.levels, 15, 'Vampire Lore skill must have 15 levels in TS4');

  const crossStitch = skillsSection.items.find((i) => i.en === 'Cross-Stitch' || i.name === 'Křížkový steh');
  assert.ok(crossStitch, 'Cross-Stitch skill must exist');
  assert.equal(crossStitch.levels, 5, 'Cross-Stitch skill must have 5 levels in TS4');
  assert.equal(crossStitch.pack, 'Cottage Living', 'Cross-Stitch must belong to Cottage Living');

  const gemology = skillsSection.items.find((i) => i.en === 'Gemology' || i.name === 'Gemologie');
  assert.ok(gemology, 'Gemology skill must exist');
  assert.equal(gemology.pack, 'Crystal Creations Stuff');

  // Verify careers
  const careersSection = data.sections.find((s) => s.id === 'careers');
  const actor = careersSection.items.find((i) => i.en === 'Actor' || i.name === 'Herec');
  assert.ok(actor, 'Actor career must exist');
  assert.equal(actor.levels, 10, 'Actor career must have 10 levels in TS4');

  const decorator = careersSection.items.find((i) => i.en === 'Interior Decorator' || i.name === 'Bytový designér');
  assert.ok(decorator, 'Interior Decorator career must exist');
  assert.equal(decorator.levels, 10, 'Interior Decorator career must have 10 levels in TS4');

  const styleInfluencer = careersSection.items.find((i) => i.en === 'Style Influencer' || i.name === 'Stylový poradce');
  assert.ok(styleInfluencer, 'Style Influencer career must exist');
  assert.equal(styleInfluencer.pack, null, 'Style Influencer is Base Game in TS4');

  const reaper = careersSection.items.find((i) => i.en === 'Reaper' || i.name === 'Smrtka');
  assert.ok(reaper, 'Reaper career must exist');
  assert.equal(reaper.pack, 'Life and Death');

  // Validate all referenced pack names
  for (const section of data.sections) {
    for (const item of section.items) {
      assert.ok(typeof item.name === 'string' && item.name.length > 0, `Item name must be non-empty in section ${section.id}`);
      assert.ok(typeof item.levels === 'number' && item.levels >= 1, `Item levels must be >= 1: ${item.name}`);
      if (item.pack) {
        assert.ok(validPacks.has(item.pack), `Pack "${item.pack}" for item "${item.name}" must exist in packs.json`);
      }
    }
  }
});

/* Pure logic matching public/app.js for testing visibleItems */
function filterVisibleItems({ section, search, age, hideDone, progressMap, ownedMap }) {
  const needle = (search || '').trim().toLowerCase();
  const available = section.items.filter((item) => !item.pack || (ownedMap ? ownedMap[item.pack] !== false : true));

  return available.filter((item) => {
    if (needle) {
      const matchName = item.name && item.name.toLowerCase().includes(needle);
      const matchEn = item.en && item.en.toLowerCase().includes(needle);
      if (!matchName && !matchEn) return false;
    }
    if (age) {
      if (age === 'toddler') {
        if (item.age !== 'toddler') return false;
      } else if (age === 'child') {
        if (item.age !== 'child') return false;
      } else if (age === 'teen') {
        if (item.age === 'toddler' || item.age === 'child' || item.age === 'adult') return false;
      } else if (age === 'adult') {
        if (item.age === 'toddler' || item.age === 'child' || item.age === 'teen') return false;
      }
    }
    if (hideDone) {
      const current = (progressMap && progressMap[`${section.id}::${item.name}`]) || 0;
      if (current >= item.levels) return false;
    }
    return true;
  });
}

test('age filter logic accurately segregates ages', () => {
  const data = JSON.parse(fs.readFileSync(supersimPath, 'utf8'));
  const skillsSection = data.sections.find((s) => s.id === 'skills');
  const careersSection = data.sections.find((s) => s.id === 'careers');

  // 1. Toddler filter: should only get toddler skills (5 items), 0 adult careers
  const toddlerSkills = filterVisibleItems({ section: skillsSection, age: 'toddler' });
  assert.equal(toddlerSkills.length, 5);
  assert.ok(toddlerSkills.every((s) => s.age === 'toddler'));

  const toddlerCareers = filterVisibleItems({ section: careersSection, age: 'toddler' });
  assert.equal(toddlerCareers.length, 0, 'Toddlers must have 0 careers');

  // 2. Child filter: should only get child skills (4 items), 0 adult careers
  const childSkills = filterVisibleItems({ section: skillsSection, age: 'child' });
  assert.equal(childSkills.length, 4);
  assert.ok(childSkills.every((s) => s.age === 'child'));

  const childCareers = filterVisibleItems({ section: careersSection, age: 'child' });
  assert.equal(childCareers.length, 0, 'Children must have 0 careers');

  // 3. Teen filter: should get teen careers (part-time), but NOT adult careers
  const teenCareers = filterVisibleItems({ section: careersSection, age: 'teen' });
  assert.ok(teenCareers.length > 0);
  assert.ok(teenCareers.every((c) => c.age === 'teen'));
  assert.ok(!teenCareers.some((c) => c.en === 'Astronaut'));

  // 4. Adult filter: MUST show adult skills and adult careers, but NO toddler/child skills
  const adultSkills = filterVisibleItems({ section: skillsSection, age: 'adult' });
  assert.ok(adultSkills.length >= 40, 'Adult skills must include general skills');
  assert.ok(!adultSkills.some((s) => s.age === 'toddler'));
  assert.ok(!adultSkills.some((s) => s.age === 'child'));

  const adultCareers = filterVisibleItems({ section: careersSection, age: 'adult' });
  assert.ok(adultCareers.length >= 25, 'Adult careers must be visible');
  assert.ok(adultCareers.some((c) => c.en === 'Astronaut'));
  assert.ok(!adultCareers.some((c) => c.age === 'teen'), 'Adult filter must exclude teen part-time jobs');
});

test('bilingual search matches Czech and English terms', () => {
  const data = JSON.parse(fs.readFileSync(supersimPath, 'utf8'));
  const skillsSection = data.sections.find((s) => s.id === 'skills');

  // Search by Czech name
  const czechMatches = filterVisibleItems({ section: skillsSection, search: 'vaření' });
  assert.ok(czechMatches.length >= 1);
  assert.ok(czechMatches.some((s) => s.name === 'Vaření'));

  // Search by English name
  const englishMatches = filterVisibleItems({ section: skillsSection, search: 'cooking' });
  assert.ok(englishMatches.length >= 1);
  assert.ok(englishMatches.some((s) => s.en === 'Cooking'));

  // Search by Czech name for Potty
  const pottyCzech = filterVisibleItems({ section: skillsSection, search: 'nočník' });
  assert.equal(pottyCzech.length, 1);
  assert.equal(pottyCzech[0].en, 'Potty');

  // Search by English name for Potty
  const pottyEn = filterVisibleItems({ section: skillsSection, search: 'potty' });
  assert.equal(pottyEn.length, 1);
  assert.equal(pottyEn[0].name, 'Nočník');
});

test('owned pack filtering excludes items from unowned packs', () => {
  const data = JSON.parse(fs.readFileSync(supersimPath, 'utf8'));
  const skillsSection = data.sections.find((s) => s.id === 'skills');

  const ownedMap = {
    Vampires: false,
    'Get Famous': false,
  };

  const visible = filterVisibleItems({ section: skillsSection, ownedMap });
  assert.ok(!visible.some((s) => s.pack === 'Vampires'));
  assert.ok(!visible.some((s) => s.pack === 'Get Famous'));
  assert.ok(visible.some((s) => s.name === 'Vaření'));
});

test('hideDone filter excludes completed items', () => {
  const data = JSON.parse(fs.readFileSync(supersimPath, 'utf8'));
  const skillsSection = data.sections.find((s) => s.id === 'skills');

  const progressMap = {
    'skills::Vaření': 10,
    'skills::Nočník': 2, // not yet done (levels: 3)
  };

  const visible = filterVisibleItems({ section: skillsSection, hideDone: true, progressMap });
  assert.ok(!visible.some((s) => s.name === 'Vaření'), 'Completed skill must be hidden');
  assert.ok(visible.some((s) => s.name === 'Nočník'), 'Incomplete skill must remain visible');
});