const WEIGHTS = Object.freeze({
  balanced: Object.freeze({
    score: 0.55,
    gear: 0.45,
    label: 'Balanced',
  }),
  score: Object.freeze({
    score: 0.75,
    gear: 0.25,
    label: 'Score focus',
  }),
  gear: Object.freeze({
    score: 0.30,
    gear: 0.70,
    label: 'Gear focus',
  }),
});

function clampOpportunity(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function normalise(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

export function dungeonPriorityWeights(focus = 'balanced') {
  return WEIGHTS[focus] || WEIGHTS.balanced;
}

export function dungeonPriorityDriver(scoreOpportunity, gearOpportunity) {
  const score = clampOpportunity(scoreOpportunity);
  const gear = clampOpportunity(gearOpportunity);
  const delta = score - gear;

  if (delta >= 20) return 'Score-led';
  if (delta <= -20) return 'Gear-led';
  if (score >= 60 && gear >= 60) return 'Strong dual value';
  return 'Balanced value';
}

export function rankDungeonProgression(
  dungeons,
  lootDungeons = [],
  { focus = 'balanced' } = {}
) {
  const weights = dungeonPriorityWeights(focus);
  const lootByName = new Map();

  for (const dungeon of Array.isArray(lootDungeons) ? lootDungeons : []) {
    for (const key of [dungeon?.name, dungeon?.shortName]) {
      const normalized = normalise(key);
      if (normalized) lootByName.set(normalized, dungeon);
    }
  }

  const ranked = (Array.isArray(dungeons) ? dungeons : []).map((run) => {
    const loot = lootByName.get(normalise(run?.dungeon))
      || lootByName.get(normalise(run?.shortName))
      || null;

    const scoreOpportunity = clampOpportunity(run?.opportunity);
    const gearOpportunity = clampOpportunity(loot?.gearOpportunity);
    const combinedOpportunity =
      (scoreOpportunity * weights.score)
      + (gearOpportunity * weights.gear);

    return {
      run,
      loot,
      scoreOpportunity,
      gearOpportunity,
      combinedOpportunity,
      driver: dungeonPriorityDriver(scoreOpportunity, gearOpportunity),
      weights,
    };
  });

  return ranked.sort((a, b) => {
    const combined = b.combinedOpportunity - a.combinedOpportunity;
    if (Math.abs(combined) > 0.000001) return combined;

    if (focus === 'gear') {
      return b.gearOpportunity - a.gearOpportunity
        || b.scoreOpportunity - a.scoreOpportunity
        || String(a.run?.dungeon || '').localeCompare(String(b.run?.dungeon || ''));
    }

    if (focus === 'score') {
      return b.scoreOpportunity - a.scoreOpportunity
        || b.gearOpportunity - a.gearOpportunity
        || String(a.run?.dungeon || '').localeCompare(String(b.run?.dungeon || ''));
    }

    // In balanced mode, prefer the dungeon that has useful value on BOTH axes
    // when the weighted totals are equal.
    return Math.min(b.scoreOpportunity, b.gearOpportunity)
      - Math.min(a.scoreOpportunity, a.gearOpportunity)
      || (b.scoreOpportunity + b.gearOpportunity)
        - (a.scoreOpportunity + a.gearOpportunity)
      || String(a.run?.dungeon || '').localeCompare(String(b.run?.dungeon || ''));
  });
}