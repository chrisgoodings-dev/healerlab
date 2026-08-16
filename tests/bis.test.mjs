import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BIS_POLICY,
  buildPersonalDungeonBis,
  getBisMatch,
  mergeBisGearPriorities,
} from '../public/js/bis.js';

const alignment = {
  available: true,
  context: 'mythic_plus',
  score: 70,
  ratings: { crit: 800, haste: 200, mastery: 200, versatility: 800 },
  shares: { crit: 0.4, haste: 0.1, mastery: 0.1, versatility: 0.4 },
  priorityOrder: ['haste', 'mastery', 'versatility', 'crit'],
  profile: {
    shares: { crit: 0.10, haste: 0.35, mastery: 0.35, versatility: 0.20 },
  },
};

const character = {
  gear: {
    items: {
      finger_1: {
        item_level: 311,
        name: 'Crit Vers Ring',
        item_id: 100,
        secondary_stats: { crit: 500, versatility: 500 },
      },
      finger_2: {
        item_level: 305,
        name: 'Old Ring',
        item_id: 101,
        secondary_stats: { crit: 400, versatility: 400 },
      },
      head: {
        item_level: 305,
        name: 'Current Helm',
        item_id: 102,
        secondary_stats: { crit: 400, versatility: 400 },
      },
      trinket_1: {
        item_level: 305,
        name: 'Current Trinket',
        item_id: 103,
        secondary_stats: { haste: 300 },
      },
    },
  },
};

const dungeons = [
  {
    name: 'Dungeon A',
    shortName: 'DA',
    items: [
      { name: 'Haste Mastery Ring', itemId: 200, slot: 'ring', secondaryStats: { haste: 500, mastery: 500 } },
      { name: 'Haste Mastery Helm', itemId: 201, slot: 'head', secondaryStats: { haste: 500, mastery: 500 } },
      { name: 'Stat Stick Trinket', itemId: 202, slot: 'trinket', secondaryStats: { haste: 500 } },
    ],
  },
  {
    name: 'Dungeon B',
    shortName: 'DB',
    items: [
      { name: 'Crit Vers Alternative', itemId: 203, slot: 'ring', secondaryStats: { crit: 500, versatility: 500 } },
      { name: 'Crit Helm', itemId: 204, slot: 'head', secondaryStats: { crit: 600, versatility: 400 } },
    ],
  },
];

test('personal dungeon BiS favours the candidate that repairs the character stat profile', () => {
  const profile = buildPersonalDungeonBis(character, dungeons, { statAlignment: alignment });
  assert.equal(profile.available, true);
  assert.equal(profile.bySlot.finger_1[0].itemName, 'Haste Mastery Ring');
  assert.equal(profile.bySlot.head[0].itemName, 'Haste Mastery Helm');
});

test('exact personal BiS receives the configured farming multiplier', () => {
  const profile = buildPersonalDungeonBis(character, dungeons, { statAlignment: alignment });
  const match = getBisMatch(dungeons[0].items[0], 'finger_1', profile);
  assert.equal(match.exact, true);
  assert.equal(match.label, 'Personal BiS');
  assert.equal(match.multiplier, BIS_POLICY.exactMultiplier);
});

test('special-effect trinkets are not fabricated as stat-only BiS', () => {
  const profile = buildPersonalDungeonBis(character, dungeons, { statAlignment: alignment });
  assert.equal(profile.bySlot.trinket_1, undefined);
  assert.equal(profile.bySlot.trinket_2, undefined);
});


test('dungeon integration declares a scoped BiS profile before using BiS matches', async () => {
  const source = await import('node:fs/promises')
    .then(({ readFile }) => readFile('public/js/analysis.js', 'utf8'));

  const functionStart = source.indexOf('export function dungeonLootOpportunities');
  assert.ok(functionStart >= 0, 'dungeonLootOpportunities is missing');

  const functionEnd = source.indexOf('export function bestGearFarm', functionStart);
  assert.ok(functionEnd > functionStart, 'could not isolate dungeonLootOpportunities');

  const body = source.slice(functionStart, functionEnd);
  const declarationMatch = body.match(
    /const\s+bisProfile\s*=\s*buildPersonalDungeonBis\(character,\s*usableLoot,\s*\{[^}]*statAlignment[^}]*\}\s*\);/
  );
  const declaration = declarationMatch?.index ?? -1;
  const firstUse = body.indexOf('getBisMatch(item, target.slot, bisProfile)');

  assert.ok(declaration >= 0, 'dungeonLootOpportunities does not declare bisProfile');
  assert.ok(firstUse > declaration, 'bisProfile is used before it is declared');
});

test('BiS-aware gear priorities can surface an equal-level material stat upgrade', () => {
  const profile = buildPersonalDungeonBis(character, dungeons, { statAlignment: alignment });
  const allGear = [
    {
      slot: 'finger_1',
      label: 'Ring 1',
      itemLevel: 311,
      name: 'Crit Vers Ring',
      itemId: 100,
      secondaryStats: { crit: 500, versatility: 500 },
    },
  ];

  const result = mergeBisGearPriorities([], allGear, profile, { dropItemLevel: 311 });
  assert.equal(result.length, 1);
  assert.equal(result[0].bisTargetName, 'Haste Mastery Ring');
  assert.ok(result[0].priority >= 40);
});