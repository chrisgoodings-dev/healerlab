import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dungeonPriorityWeights,
  rankDungeonProgression,
} from '../public/js/dungeon-priority.js';

const runs = [
  { dungeon: 'Score Dungeon', shortName: 'SD', opportunity: 90 },
  { dungeon: 'Balanced Dungeon', shortName: 'BD', opportunity: 60 },
  { dungeon: 'Gear Dungeon', shortName: 'GD', opportunity: 30 },
];

const loot = [
  { name: 'Score Dungeon', shortName: 'SD', gearOpportunity: 20 },
  { name: 'Balanced Dungeon', shortName: 'BD', gearOpportunity: 70 },
  { name: 'Gear Dungeon', shortName: 'GD', gearOpportunity: 95 },
];

test('balanced dungeon ordering combines score and gear opportunity', () => {
  const ranked = rankDungeonProgression(runs, loot, { focus: 'balanced' });
  assert.deepEqual(
    ranked.map((entry) => entry.run.dungeon),
    ['Balanced Dungeon', 'Gear Dungeon', 'Score Dungeon']
  );
  assert.equal(Math.round(ranked[0].combinedOpportunity), 65);
});

test('score focus makes score opportunity dominant', () => {
  const ranked = rankDungeonProgression(runs, loot, { focus: 'score' });
  assert.equal(ranked[0].run.dungeon, 'Score Dungeon');
  assert.deepEqual(dungeonPriorityWeights('score'), {
    score: 0.75,
    gear: 0.25,
    label: 'Score focus',
  });
});

test('gear focus makes gear opportunity dominant', () => {
  const ranked = rankDungeonProgression(runs, loot, { focus: 'gear' });
  assert.equal(ranked[0].run.dungeon, 'Gear Dungeon');
});

test('missing gear data safely contributes zero instead of changing the run object', () => {
  const original = [{ dungeon: 'No Gear Data', shortName: 'NG', opportunity: 80 }];
  const copy = structuredClone(original);
  const [ranked] = rankDungeonProgression(original, [], { focus: 'balanced' });

  assert.equal(ranked.gearOpportunity, 0);
  assert.equal(ranked.scoreOpportunity, 80);
  assert.deepEqual(original, copy);
});

test('balanced ties prefer useful opportunity on both axes', () => {
  const tiedRuns = [
    { dungeon: 'Extreme', shortName: 'EX', opportunity: 100 },
    { dungeon: 'Dual', shortName: 'DU', opportunity: 55 },
  ];
  const tiedLoot = [
    { name: 'Extreme', shortName: 'EX', gearOpportunity: 0 },
    { name: 'Dual', shortName: 'DU', gearOpportunity: 55 },
  ];

  // 55/45 makes these close, but the dual-value option should not lose an
  // exact tie simply because it is less extreme on one axis.
  const ranked = rankDungeonProgression(tiedRuns, tiedLoot, { focus: 'balanced' });
  assert.equal(ranked[0].run.dungeon, 'Dual');
});