import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  SOURCE_NOTE,
  encounterBossCount,
  encounterGuideCount,
  encounterGuideNames,
  getEncounterGuide,
} from '../public/js/encounter-guides.js';

test('ships healer encounter summaries for all eight Midnight Season 2 dungeons', () => {
  assert.equal(encounterGuideCount(), 8);
  assert.deepEqual(
    new Set(encounterGuideNames()),
    new Set([
      'Altar of Fangs',
      'Murder Row',
      'Den of Nalorakk',
      'The Blinding Vale',
      'Voidscar Arena',
      'Ruby Life Pools',
      "King's Rest",
      'Temple of Sethraliss',
    ])
  );
});

test('all 28 bosses have a healer check, healing note and mechanics list', () => {
  assert.equal(encounterBossCount(), 28);
  for (const dungeon of encounterGuideNames()) {
    const guide = getEncounterGuide(dungeon);
    assert.ok(guide.healerSummary.length > 30, `${dungeon}: healer summary missing`);
    assert.ok(guide.noteworthy.length >= 2, `${dungeon}: noteworthy healer notes missing`);
    for (const boss of guide.bosses) {
      assert.ok(boss.name, `${dungeon}: boss name missing`);
      assert.ok(boss.check, `${boss.name}: healer-check label missing`);
      assert.ok(boss.healing.length > 30, `${boss.name}: healing guidance missing`);
      assert.ok(boss.mechanics.length >= 3, `${boss.name}: mechanics incomplete`);
    }
  }
});

test('reference-derived high-risk healer checks are represented', () => {
  const altar = getEncounterGuide('Altar of Fangs');
  const coil = altar.bosses.find((boss) => boss.name === 'Writhing Coil');
  assert.ok(coil.mechanics.some(([type, name]) => type === 'DISPEL' && name === 'Synchronized Venom'));

  const temple = getEncounterGuide('Temple of Sethraliss');
  const avatar = temple.bosses.find((boss) => boss.name === 'Avatar of Sethraliss');
  assert.match(avatar.check, /heal-the-boss/i);

  const ruby = getEncounterGuide('Ruby Life Pools');
  const melidrussa = ruby.bosses.find((boss) => boss.name === 'Melidrussa Chillworn');
  assert.match(melidrussa.healing, /cooldown/i);

  const blinding = getEncounterGuide('The Blinding Vale');
  const ziekket = blinding.bosses.find((boss) => boss.name === 'Ziekket');
  assert.match(ziekket.check, /rot/i);
});

test('guide source note states that the supplied cheat sheets are the basis', () => {
  assert.match(SOURCE_NOTE, /supplied/i);
  assert.match(SOURCE_NOTE, /cheat-sheet/i);
});

test('dungeon tiles expose accessible expandable encounter-guide controls', () => {
  const app = readFileSync('public/js/app.js', 'utf8');
  assert.ok(app.includes("getEncounterGuide"), 'encounter guide lookup is not wired into app.js');
  assert.ok(app.includes('data-dungeon-toggle'), 'dungeon tile toggle marker is missing');
  assert.ok(app.includes('aria-expanded'), 'expanded-state accessibility marker is missing');
  assert.ok(app.includes('renderEncounterGuidePanel'), 'expanded encounter renderer is missing');
});