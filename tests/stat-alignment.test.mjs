import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStatAlignment, itemStatFit, replacementStatFit } from '../public/js/stat-alignment.js';
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

// Secondary-stat ordered display regression tests.
test('restoration druid uses requested raid and mythic plus priority orders', () => {
  const character = { class: 'Druid', active_spec_name: 'Restoration' };
  assert.deepEqual(
    getStatProfile(character, 'raid').priorityOrder,
    ['haste', 'mastery', 'versatility', 'crit']
  );
  assert.deepEqual(
    getStatProfile(character, 'mythic_plus').priorityOrder,
    ['mastery', 'haste', 'versatility', 'crit']
  );
});

test('every healer reference profile exposes four unique ordered secondary stats', () => {
  for (const key of supportedStatProfiles()) {
    const [className, specName] = key.split(':');
    const character = { class: className, active_spec_name: specName };
    for (const context of ['raid', 'mythic_plus']) {
      const order = getStatProfile(character, context).priorityOrder;
      assert.equal(order.length, 4);
      assert.equal(new Set(order).size, 4);
      assert.deepEqual(
        [...order].sort(),
        ['crit', 'haste', 'mastery', 'versatility'].sort()
      );
    }
  }
});

test('alignment rows follow the activity priority order', () => {
  const character = {
    class: 'Druid',
    active_spec_name: 'Restoration',
    secondary_stats: { crit: 300, haste: 1000, mastery: 900, versatility: 250 },
  };

  const raid = buildStatAlignment(character, { context: 'raid' });
  const mythicPlus = buildStatAlignment(character, { context: 'mythic_plus' });

  assert.deepEqual(raid.rows.map((row) => row.stat), ['haste', 'mastery', 'versatility', 'crit']);
  assert.deepEqual(mythicPlus.rows.map((row) => row.stat), ['mastery', 'haste', 'versatility', 'crit']);
});

test('allocation state is blue-below, green-within and red-above compatible', () => {
  const character = {
    class: 'Druid',
    active_spec_name: 'Restoration',
    secondary_stats: { crit: 1200, haste: 200, mastery: 350, versatility: 250 },
  };

  const alignment = buildStatAlignment(character, { context: 'raid' });
  const crit = alignment.rows.find((row) => row.stat === 'crit');
  const haste = alignment.rows.find((row) => row.stat === 'haste');

  assert.equal(crit.balanceStatus, 'above');
  assert.equal(haste.balanceStatus, 'below');

  const targetCharacter = {
    class: 'Druid',
    active_spec_name: 'Restoration',
    secondary_stats: { ...getStatProfile({ class: 'Druid', active_spec_name: 'Restoration' }, 'raid').ratings },
  };
  const target = buildStatAlignment(targetCharacter, { context: 'raid' });
  assert.ok(target.rows.every((row) => row.balanceStatus === 'within'));
});

test('replacement stat analysis rewards swapping an overrepresented ring into preferred stats', () => {
  const character = {
    class: 'Druid',
    active_spec_name: 'Restoration',
    secondary_stats: { crit: 900, haste: 450, mastery: 350, versatility: 300 },
  };
  const alignment = buildStatAlignment(character, { context: 'mythic_plus' });

  const preferred = replacementStatFit(
    { haste: 500, mastery: 500 },
    { crit: 500, versatility: 500 },
    alignment
  );
  const poor = replacementStatFit(
    { crit: 500, versatility: 500 },
    { crit: 500, versatility: 500 },
    alignment
  );

  assert.equal(preferred.replacementAvailable, true);
  assert.ok(preferred.alignmentGain > poor.alignmentGain);
  assert.ok(preferred.projectedAlignmentScore > poor.projectedAlignmentScore);
  assert.ok(preferred.multiplier > poor.multiplier);
});

test('only the best stat-balanced item per weak slot is exposed as a dungeon recommendation', () => {
  const character = structuredClone(demoCharacter);
  character.gear.item_level_equipped = 310;
  for (const item of Object.values(character.gear.items)) item.item_level = 311;
  character.gear.items.finger_1 = {
    item_level: 290,
    name: 'Current Crit Vers Ring',
    secondary_stats: { crit: 500, versatility: 500 },
  };
  character.gear.items.finger_2.item_level = 311;
  character.secondary_stats = { crit: 900, haste: 450, mastery: 350, versatility: 300 };
  character.official_dungeon_loot = [
    {
      name: 'Temple of Sethraliss',
      journalInstanceId: 99,
      items: [
        {
          id: 2001,
          name: 'Jade Ophidian Band',
          secondaryStats: { haste: 520, mastery: 480 },
        },
        {
          id: 2002,
          name: 'Charged Sandstone Band',
          secondaryStats: { crit: 520, versatility: 480 },
        },
      ],
    },
  ];

  const opportunities = dungeonLootOpportunities(character, {
    keyLevel: 10,
    statContext: 'mythic_plus',
  });
  const temple = opportunities.find((dungeon) => dungeon.name === 'Temple of Sethraliss');

  assert.equal(temple.candidateDrops, 2);
  assert.equal(temple.recommendedMatches.length, 1);
  assert.equal(temple.matches.length, 1);
  assert.equal(temple.recommendedMatches[0].itemName, 'Jade Ophidian Band');
  assert.ok(temple.recommendedMatches[0].alignmentGain > 0);
  assert.equal(temple.candidateMatches.some((item) => item.itemName === 'Charged Sandstone Band'), true);
});

