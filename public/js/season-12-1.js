// Midnight Patch 12.1 / Season 2 content definition.
//
// Confirmed for the 2026-08-19 Season 2 launch:
//   Altar of Fangs
//   Murder Row
//   Den of Nalorakk
//   The Blinding Vale
//   Voidscar Arena
//   Ruby Life Pools
//   Kings' Rest
//   Temple of Sethraliss
//
// Raid: The Venomous Abyss (8 bosses)
// Lair: The Tidebound Grotto (Nymrissa Wavecaller)
//
// The progression engine uses this module as the canonical CURRENT-SEASON
// content list. That prevents outgoing Season 1 Raider.IO runs/raids from
// leaking into the 12.1 progression map during the season transition.

export const MIDNIGHT_SEASON_2 = Object.freeze({
  patch: '12.1',
  season: 2,
  label: 'Midnight Season 2',
  mythicPlusOpens: '2026-08-19',
  raidOpens: '2026-08-19',
  raid: Object.freeze({
    slug: 'the-venomous-abyss',
    name: 'The Venomous Abyss',
    totalBosses: 8,
    bosses: Object.freeze([
      "Nek'zali the Soulcoiler",
      'Entombed Sentinels',
      'Vashnik the Malignant',
      'The Lost Explorers',
      'Sszorak',
      'The Twin Fangs',
      'The Coiled Altar',
      "Ula'tek",
    ]),
    aliases: Object.freeze([
      'thevenomousabyss',
      'venomousabyss',
    ]),
  }),
  lair: Object.freeze({
    slug: 'the-tidebound-grotto',
    name: 'The Tidebound Grotto',
    totalBosses: 1,
    boss: 'Nymrissa Wavecaller',
  }),
  dungeons: Object.freeze([
    Object.freeze({
      name: 'Altar of Fangs',
      shortName: 'AOF',
      aliases: Object.freeze(['altaroffangs', 'aof']),
    }),
    Object.freeze({
      name: 'Murder Row',
      shortName: 'MR',
      aliases: Object.freeze(['murderrow', 'mr']),
    }),
    Object.freeze({
      name: 'Den of Nalorakk',
      shortName: 'DON',
      aliases: Object.freeze(['denofnalorakk', 'don', 'nalorakk']),
    }),
    Object.freeze({
      name: 'The Blinding Vale',
      shortName: 'TBV',
      aliases: Object.freeze(['theblindingvale', 'blindingvale', 'tbv']),
    }),
    Object.freeze({
      name: 'Voidscar Arena',
      shortName: 'VSA',
      aliases: Object.freeze(['voidscararena', 'vsa']),
    }),
    Object.freeze({
      name: 'Ruby Life Pools',
      shortName: 'RLP',
      aliases: Object.freeze(['rubylifepools', 'rlp']),
    }),
    Object.freeze({
      name: "Kings' Rest",
      shortName: 'KR',
      aliases: Object.freeze(['kingsrest', 'kr']),
    }),
    Object.freeze({
      name: 'Temple of Sethraliss',
      shortName: 'TOS',
      aliases: Object.freeze(['templeofsethraliss', 'tos', 'sethraliss']),
    }),
  ]),
});

export function normaliseContentName(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

const DUNGEON_BY_ALIAS = new Map();

for (const dungeon of MIDNIGHT_SEASON_2.dungeons) {
  const aliases = new Set([
    normaliseContentName(dungeon.name),
    normaliseContentName(dungeon.shortName),
    ...dungeon.aliases.map(normaliseContentName),
  ]);

  for (const alias of aliases) {
    if (alias) DUNGEON_BY_ALIAS.set(alias, dungeon);
  }
}

export function seasonDungeonFor(...values) {
  for (const value of values) {
    const key = normaliseContentName(value);
    if (key && DUNGEON_BY_ALIAS.has(key)) return DUNGEON_BY_ALIAS.get(key);
  }
  return null;
}

export function currentSeasonState(now = new Date()) {
  const isoDate = Number.isNaN(now?.getTime?.())
    ? new Date().toISOString().slice(0, 10)
    : now.toISOString().slice(0, 10);

  return {
    patch: MIDNIGHT_SEASON_2.patch,
    season: MIDNIGHT_SEASON_2.season,
    label: MIDNIGHT_SEASON_2.label,
    mythicPlusOpens: MIDNIGHT_SEASON_2.mythicPlusOpens,
    raidOpens: MIDNIGHT_SEASON_2.raidOpens,
    mythicPlusOpen: isoDate >= MIDNIGHT_SEASON_2.mythicPlusOpens,
    raidOpen: isoDate >= MIDNIGHT_SEASON_2.raidOpens,
    dungeonCount: MIDNIGHT_SEASON_2.dungeons.length,
    raidName: MIDNIGHT_SEASON_2.raid.name,
    raidBosses: MIDNIGHT_SEASON_2.raid.totalBosses,
    lairName: MIDNIGHT_SEASON_2.lair.name,
  };
}

export function isMidnightSeason2ScoreEntry(entry) {
  const token = normaliseContentName(entry?.season);
  if (!token) return false;

  // Raider.IO season identifiers have historically used forms such as
  // season-tww-2. Keep matching deliberately narrow so an outgoing Season 1
  // score cannot be mistaken for Midnight Season 2.
  return [
    'seasonmidnight2',
    'midnight2',
    'midnights2',
    'seasonmn2',
    'mn2',
  ].includes(token);
}