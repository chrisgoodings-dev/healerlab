import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStatAlignment, itemStatFit } from '../public/js/stat-alignment.js';
import { getStatProfile, supportedStatProfiles } from '../public/js/stat-profiles.js';
import { dungeonLootOpportunities } from '../public/js/analysis.js';
import { demoCharacter } from '../public/js/demo-data.js';

test('ships reference profiles for all seven healer specializations', () => {
  assert.equal(supportedStatProfiles().length, 7);
});

test('builds a 100 score when current shares exactly match the target profile', () => {
  const character = { class: 'Druid', active_spec_name: 'Restoration' };
  const profile = getStatProfile(character, 'mythic_plus');
  character.secondary_stats = { ...profile.ratings };

  const alignment = buildStatAlignment(character, { context: 'mythic_plus' });
  assert.equal(alignment.available, true);
  assert.ok(Math.abs(alignment.score - 100) < 0.0001);
  assert.ok(alignment.rows.every((row) => row.status === 'good'));
});

test('colour-codes material under/over allocation as poor', () => {
  const character = {
    class: 'Druid',
    active_spec_name: 'Restoration',
    secondary_stats: { crit: 1000, haste: 200, mastery: 200, versatility: 200 },
  };
  const alignment = buildStatAlignment(character, { context: 'mythic_plus' });
  const crit = alignment.rows.find((row) => row.stat === 'crit');
  const haste = alignment.rows.find((row) => row.stat === 'haste');
  assert.equal(crit.status, 'poor');
  assert.equal(crit.direction, 'high');
  assert.equal(haste.status, 'poor');
  assert.equal(haste.direction, 'low');
});

test('a haste/mastery item is rewarded for a restoration druid short on haste and mastery', () => {
  const character = {
    class: 'Druid',
    active_spec_name: 'Restoration',
    secondary_stats: { crit: 800, haste: 500, mastery: 400, versatility: 300 },
  };
  const alignment = buildStatAlignment(character, { context: 'mythic_plus' });
  const fit = itemStatFit({ haste: 700, mastery: 650 }, alignment);
  assert.equal(fit.available, true);
  assert.ok(fit.score > 0);
  assert.ok(fit.multiplier > 1);
  assert.ok(fit.multiplier <= 1.25);
});

test('a crit-heavy item is penalised when crit is already materially over target', () => {
  const character = {
    class: 'Druid',
    active_spec_name: 'Restoration',
    secondary_stats: { crit: 1000, haste: 500, mastery: 450, versatility: 200 },
  };
  const alignment = buildStatAlignment(character, { context: 'mythic_plus' });
  const fit = itemStatFit({ crit: 900, versatility: 100 }, alignment);
  assert.equal(fit.available, true);
  assert.ok(fit.score < 0);
  assert.ok(fit.multiplier < 1);
  assert.ok(fit.multiplier >= 0.75);
});

test('raid and mythic plus use distinct profiles', () => {
  const character = {
    class: 'Paladin',
    active_spec_name: 'Holy',
    secondary_stats: { crit: 500, haste: 900, mastery: 900, versatility: 200 },
  };
  const mplus = buildStatAlignment(character, { context: 'mythic_plus' });
  const raid = buildStatAlignment(character, { context: 'raid' });
  assert.notDeepEqual(mplus.profile.shares, raid.profile.shares);
  assert.notEqual(mplus.score, raid.score);
});


test('secondary-stat fit changes the priority of otherwise equivalent dungeon upgrades', () => {
  const character = structuredClone(demoCharacter);
  character.gear.item_level_equipped = 310;
  for (const item of Object.values(character.gear.items)) item.item_level = 311;
  character.gear.items.wrist.item_level = 290;
  character.secondary_stats = { crit: 800, haste: 500, mastery: 400, versatility: 300 };
  character.official_dungeon_loot = [
    {
      name: 'Murder Row',
      journalInstanceId: 1,
      items: [
        { id: 1001, name: 'Fury-fletched Armlets', secondaryStats: { haste: 700, mastery: 650 } },
      ],
    },
    {
      name: 'The Blinding Vale',
      journalInstanceId: 2,
      items: [
        { id: 1002, name: 'Rootwarden Wraps', secondaryStats: { crit: 900, versatility: 100 } },
      ],
    },
  ];

  const opportunities = dungeonLootOpportunities(character, { keyLevel: 10, statContext: 'mythic_plus' });
  const murderRow = opportunities.find((dungeon) => dungeon.name === 'Murder Row');
  const blindingVale = opportunities.find((dungeon) => dungeon.name === 'The Blinding Vale');

  assert.ok(murderRow.rawGearOpportunity > blindingVale.rawGearOpportunity);
  assert.ok(murderRow.matches[0].statFitScore > 0);
  assert.ok(blindingVale.matches[0].statFitScore < 0);
});
