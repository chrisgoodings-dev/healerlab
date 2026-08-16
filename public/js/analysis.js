const SLOT_LABELS = {
  head: 'Head',
  neck: 'Neck',
  shoulder: 'Shoulders',
  back: 'Back',
  chest: 'Chest',
  wrist: 'Wrists',
  hands: 'Hands',
  waist: 'Waist',
  legs: 'Legs',
  feet: 'Feet',
  finger_1: 'Ring 1',
  finger_2: 'Ring 2',
  trinket_1: 'Trinket 1',
  trinket_2: 'Trinket 2',
  main_hand: 'Main hand',
  off_hand: 'Off hand'
};

export const PERFORMANCE_SLOTS = new Set(Object.keys(SLOT_LABELS));

export function getCurrentScore(character) {
  const seasons = Array.isArray(character?.mythic_plus_scores_by_season)
    ? character.mythic_plus_scores_by_season
    : [];
  const score = seasons[0]?.scores?.all;
  return Number.isFinite(score) ? score : 0;
}

export function normaliseRuns(character) {
  const runs = Array.isArray(character?.mythic_plus_best_runs) ? character.mythic_plus_best_runs : [];
  return runs
    .map((run) => ({
      dungeon: run.dungeon || run.short_name || 'Unknown dungeon',
      shortName: run.short_name || run.dungeon || 'Unknown',
      level: Number(run.mythic_level) || 0,
      score: Number(run.score) || 0,
      upgrades: Number(run.num_keystone_upgrades) || 0,
      clearTimeMs: Number(run.clear_time_ms) || 0,
      parTimeMs: Number(run.par_time_ms) || 0,
      url: run.url || null,
    }))
    .sort((a, b) => b.score - a.score);
}

export function normaliseGear(character) {
  const items = character?.gear?.items;
  if (!items || typeof items !== 'object') return [];

  return Object.entries(items)
    .filter(([slot, item]) =>
      PERFORMANCE_SLOTS.has(slot) &&
      item &&
      Number(item.item_level) > 0
    )
    .map(([slot, item]) => ({
      slot,
      label: SLOT_LABELS[slot],
      itemLevel: Number(item.item_level) || 0,
      name: item.name || 'Equipped item',
    }));
}

function getGearBaseline(character, gear) {
  const equippedAverage = Number(character?.gear?.item_level_equipped);
  if (Number.isFinite(equippedAverage) && equippedAverage > 0) return equippedAverage;
  if (!gear.length) return 0;
  return gear.reduce((sum, item) => sum + item.itemLevel, 0) / gear.length;
}

export function gearWeaknesses(character, limit = 8) {
  const gear = normaliseGear(character);
  if (!gear.length) return [];

  const baseline = getGearBaseline(character, gear);
  const candidates = gear
    .map((item) => ({
      ...item,
      baseline,
      belowAverage: Math.max(0, baseline - item.itemLevel),
    }))
    .filter((item) => item.belowAverage >= 0.5);

  const maxDeficit = Math.max(0, ...candidates.map((item) => item.belowAverage));

  return candidates
    .map((item) => ({
      ...item,
      priority: maxDeficit > 0 ? (item.belowAverage / maxDeficit) * 100 : 0,
    }))
    .sort((a, b) => b.priority - a.priority || a.itemLevel - b.itemLevel)
    .slice(0, limit);
}

export function dungeonOpportunities(character) {
  const runs = normaliseRuns(character);
  if (!runs.length) return [];

  const bestScore = Math.max(...runs.map((run) => run.score));
  const bestLevel = Math.max(...runs.map((run) => run.level));

  const candidates = runs.map((run) => {
    const scoreDeficit = Math.max(0, bestScore - run.score);
    const levelDeficit = Math.max(0, bestLevel - run.level);
    const overTimeRatio = run.parTimeMs > 0
      ? Math.max(0, run.clearTimeMs - run.parTimeMs) / run.parTimeMs
      : 0;
    const timingPenalty = Math.min(overTimeRatio * 12, 8);
    const rawOpportunity = scoreDeficit + (levelDeficit * 4) + timingPenalty;

    return {
      ...run,
      scoreDeficit,
      levelDeficit,
      timingPenalty,
      rawOpportunity,
    };
  });

  const maxOpportunity = Math.max(0, ...candidates.map((run) => run.rawOpportunity));

  return candidates
    .map((run) => ({
      ...run,
      opportunity: maxOpportunity > 0 ? (run.rawOpportunity / maxOpportunity) * 100 : 0,
    }))
    .sort((a, b) => b.opportunity - a.opportunity);
}

export function raidSnapshot(character, limit = 4) {
  const raids = character?.raid_progression;
  if (!raids || typeof raids !== 'object') return [];

  return Object.entries(raids)
    .map(([slug, value]) => ({
      slug,
      name: slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
      summary: value?.summary || 'No progress',
      totalBosses: Number(value?.total_bosses) || 0,
      mythic: Number(value?.mythic_bosses_killed) || 0,
      heroic: Number(value?.heroic_bosses_killed) || 0,
      normal: Number(value?.normal_bosses_killed) || 0,
    }))
    .sort((a, b) => b.mythic - a.mythic || b.heroic - a.heroic || b.normal - a.normal)
    .slice(0, limit);
}

function priorityLabel(value) {
  if (value >= 75) return 'Very high';
  if (value >= 50) return 'High';
  if (value >= 25) return 'Medium';
  return 'Useful';
}

function dungeonRecommendation(run) {
  const suggestedLevel = Math.max(
    run.level + 1,
    Math.min(run.level + Math.max(1, run.levelDeficit), run.level + 2)
  );

  return {
    key: `dungeon:${run.shortName}`,
    type: 'dungeon',
    title: `Push ${run.shortName} toward +${suggestedLevel}`,
    detail: `Your best recorded run is +${run.level} for ${run.score.toFixed(1)} score. It trails your strongest dungeon by ${run.scoreDeficit.toFixed(1)} score.`,
    value: run.opportunity,
    label: priorityLabel(run.opportunity),
  };
}

function gearRecommendation(item) {
  return {
    key: `gear:${item.slot}`,
    type: 'gear',
    title: `Target a ${item.label.toLowerCase()} upgrade`,
    detail: `${item.name} is item level ${item.itemLevel}, ${item.belowAverage.toFixed(0)} levels below your ${item.baseline.toFixed(1)} equipped-item average.`,
    value: item.priority,
    label: priorityLabel(item.priority),
  };
}

function goalRecommendation(currentScore, targetScore, dungeonCount) {
  const gap = Math.max(0, Number(targetScore) - currentScore);
  if (gap <= 0 || targetScore <= 0) return null;

  const gapRatio = Math.min(1, gap / targetScore);
  const value = 30 + (gapRatio * 70);

  return {
    key: 'goal:score',
    type: 'goal',
    title: `Close the ${Math.round(gap).toLocaleString()} point target gap`,
    detail: dungeonCount
      ? 'Prioritise lower-scoring dungeons before repeatedly pushing your strongest key. This spreads rating gains across the profile.'
      : 'Complete a broader set of rated Mythic+ runs so the planner can identify efficient score gains.',
    value,
    label: priorityLabel(value),
  };
}

const STRATEGIES = {
  balanced: { dungeon: 3, gear: 2 },
  score: { dungeon: 4, gear: 1 },
  gear: { dungeon: 1, gear: 4 },
};

export function buildRecommendations(character, { focus = 'balanced', targetScore = 3000 } = {}) {
  const currentScore = getCurrentScore(character);
  const dungeonCandidates = dungeonOpportunities(character).map(dungeonRecommendation);
  const gearCandidates = gearWeaknesses(character).map(gearRecommendation);
  const strategy = STRATEGIES[focus] || STRATEGIES.balanced;
  const selected = [];
  const used = new Set();

  function take(candidates, count) {
    for (const candidate of candidates) {
      if (selected.length >= 6 || count <= 0) break;
      if (used.has(candidate.key)) continue;
      selected.push(candidate);
      used.add(candidate.key);
      count -= 1;
    }
  }

  take(dungeonCandidates, strategy.dungeon);
  take(gearCandidates, strategy.gear);

  const goal = goalRecommendation(currentScore, Number(targetScore), dungeonCandidates.length);
  if (goal && selected.length < 6) {
    selected.push(goal);
    used.add(goal.key);
  }

  // Fill any unused capacity without changing the focus-specific minimum mix.
  const remaining = [...dungeonCandidates, ...gearCandidates]
    .filter((candidate) => !used.has(candidate.key))
    .sort((a, b) => b.value - a.value);

  take(remaining, 6 - selected.length);

  if (!selected.length) {
    selected.push({
      key: 'general:sample',
      type: 'general',
      title: 'Build a larger progression sample',
      detail: 'There is not enough public run or gear data to rank specific opportunities yet.',
      value: 10,
      label: 'Useful',
    });
  }

  return selected
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map(({ key, ...item }, index) => ({ ...item, rank: index + 1 }));
}

export function buildAnalysis(character, options = {}) {
  const currentScore = getCurrentScore(character);
  const targetScore = Math.max(0, Number(options.targetScore) || 0);
  const progress = targetScore > 0 ? Math.min(1, currentScore / targetScore) : 0;
  const focus = STRATEGIES[options.focus] ? options.focus : 'balanced';

  return {
    currentScore,
    targetScore,
    scoreGap: Math.max(0, targetScore - currentScore),
    progress,
    focus,
    runs: normaliseRuns(character),
    dungeons: dungeonOpportunities(character),
    weakGear: gearWeaknesses(character),
    raids: raidSnapshot(character),
    recommendations: buildRecommendations(character, { ...options, focus }),
  };
}