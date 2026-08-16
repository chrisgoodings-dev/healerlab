import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MIDNIGHT_SEASON_2,
  seasonDungeonFor,
} from '../public/js/season-12-1.js';

import {
  dungeonOpportunities,
  getCurrentScore,
  normaliseRuns,
  raidSnapshot,
} from '../public/js/analysis.js';

test('Midnight 12.1 Season 2 uses the confirmed eight-dungeon pool', () => {
  assert.deepEqual(
    MIDNIGHT_SEASON_2.dungeons.map((dungeon) => dungeon.name),
    [
      'Altar of Fangs',
      'Murder Row',
      'Den of Nalorakk',
      'The Blinding Vale',
      'Voidscar Arena',
      'Ruby Life Pools',
      "Kings' Rest",
      'Temple of Sethraliss',
    ]
  );
});

test('season dungeon matching accepts canonical names and short names', () => {
  assert.equal(seasonDungeonFor('Temple of Sethraliss')?.shortName, 'TOS');
  assert.equal(seasonDungeonFor('KR')?.name, "Kings' Rest");
  assert.equal(seasonDungeonFor('Algethar Academy'), null);
});

test('outgoing-season best runs are excluded from the 12.1 progression map', () => {
  const character = {
    mythic_plus_best_runs: [
      { dungeon: 'Algethar Academy', short_name: 'AA', mythic_level: 12, score: 350 },
      { dungeon: 'Pit of Saron', short_name: 'POS', mythic_level: 11, score: 330 },
    ],
  };

  assert.equal(normaliseRuns(character).length, 0);

  const opportunities = dungeonOpportunities(character);
  assert.equal(opportunities.length, 8);
  assert.ok(opportunities.every((dungeon) => dungeon.hasRun === false));
});

test('current Season 2 runs are matched only to their current pool dungeon', () => {
  const character = {
    mythic_plus_scores_by_season: [
      { season: 'season-midnight-2', scores: { all: 412.4 } },
    ],
    mythic_plus_best_runs: [
      {
        dungeon: 'Temple of Sethraliss',
        short_name: 'TOS',
        mythic_level: 4,
        score: 142.5,
        num_keystone_upgrades: 1,
        clear_time_ms: 1900000,
        par_time_ms: 1980000,
      },
      {
        dungeon: 'Algethar Academy',
        short_name: 'AA',
        mythic_level: 15,
        score: 400,
      },
    ],
  };

  assert.equal(getCurrentScore(character), 412.4);
  assert.equal(normaliseRuns(character).length, 1);

  const temple = dungeonOpportunities(character)
    .find((dungeon) => dungeon.shortName === 'TOS');

  assert.equal(temple.hasRun, true);
  assert.equal(temple.level, 4);
  assert.equal(temple.score, 142.5);
});

test('raid snapshot filters old raids and exposes current 12.1 raid/lair content', () => {
  const character = {
    raid_progression: {
      'manaforge-omega': {
        summary: '8/8 H',
        total_bosses: 8,
        heroic_bosses_killed: 8,
      },
      'the-venomous-abyss': {
        summary: '2/8 N',
        total_bosses: 8,
        normal_bosses_killed: 2,
      },
    },
  };

  const raids = raidSnapshot(character);
  assert.equal(raids.length, 2);
  assert.equal(raids[0].name, 'The Venomous Abyss');
  assert.equal(raids[0].normal, 2);
  assert.equal(raids[1].name, 'The Tidebound Grotto');
  assert.equal(raids.some((raid) => raid.slug === 'manaforge-omega'), false);
});