const SLOT_LABELS = {
  head: 'Head', neck: 'Neck', shoulder: 'Shoulders', back: 'Back', chest: 'Chest', shirt: 'Shirt',
  tabard: 'Tabard', wrist: 'Wrists', hands: 'Hands', waist: 'Waist', legs: 'Legs', feet: 'Feet',
  finger_1: 'Ring 1', finger_2: 'Ring 2', trinket_1: 'Trinket 1', trinket_2: 'Trinket 2',
  main_hand: 'Main hand', off_hand: 'Off hand'
};

const IMPORTANT_SLOTS = new Set(['head', 'chest', 'legs', 'main_hand', 'off_hand', 'trinket_1', 'trinket_2']);

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
    .filter(([, item]) => item && Number(item.item_level) > 0)
    .map(([slot, item]) => ({
      slot,
      label: SLOT_LABELS[slot] || slot.replaceAll('_', ' '),
      itemLevel: Number(item.item_level) || 0,
      name: item.name || 'Equipped item',
      important: IMPORTANT_SLOTS.has(slot),
    }));
}

export function gearWeaknesses(character, limit = 6) {
  const gear = normaliseGear(character);
  if (!gear.length) return [];
  const average = gear.reduce((sum, item) => sum + item.itemLevel, 0) / gear.length;

  return gear
    .map((item) => ({
      ...item,
      belowAverage: Math.max(0, average - item.itemLevel),
      priority: Math.max(0, average - item.itemLevel) * (item.important ? 1.15 : 1),
    }))
    .sort((a, b) => b.priority - a.priority || a.itemLevel - b.itemLevel)
    .slice(0, limit);
}

export function dungeonOpportunities(character) {
  const runs = normaliseRuns(character);
  if (!runs.length) return [];

  const bestScore = Math.max(...runs.map((run) => run.score));
  const bestLevel = Math.max(...runs.map((run) => run.level));

  return runs
    .map((run) => {
      const scoreDeficit = Math.max(0, bestScore - run.score);
      const levelDeficit = Math.max(0, bestLevel - run.level);
      const overTimeRatio = run.parTimeMs > 0 ? Math.max(0, run.clearTimeMs - run.parTimeMs) / run.parTimeMs : 0;
      const timingPenalty = Math.min(overTimeRatio * 12, 8);
      const opportunity = scoreDeficit + (levelDeficit * 4) + timingPenalty;

      return { ...run, scoreDeficit, levelDeficit, opportunity };
    })
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
  if (value >= 40) return 'Very high';
  if (value >= 24) return 'High';
  if (value >= 12) return 'Medium';
  return 'Useful';
}

export function buildRecommendations(character, { focus = 'balanced', targetScore = 3000 } = {}) {
  const currentScore = getCurrentScore(character);
  const dungeon = dungeonOpportunities(character);
  const gear = gearWeaknesses(character);
  const recommendations = [];

  const dungeonWeight = focus === 'score' ? 1.25 : focus === 'gear' ? 0.8 : 1;
  const gearWeight = focus === 'gear' ? 1.3 : focus === 'score' ? 0.75 : 1;

  dungeon.slice(0, 4).forEach((run) => {
    const value = Math.max(8, run.opportunity * dungeonWeight);
    const suggestedLevel = Math.max(run.level + 1, Math.min(run.level + Math.max(1, run.levelDeficit), run.level + 2));
    recommendations.push({
      type: 'dungeon',
      title: `Push ${run.shortName} toward +${suggestedLevel}`,
      detail: `Your best recorded run is +${run.level} for ${run.score.toFixed(1)} score. It trails your strongest dungeon by ${run.scoreDeficit.toFixed(1)} score.`,
      value,
      label: priorityLabel(value),
    });
  });

  gear.slice(0, 3).forEach((item) => {
    if (item.belowAverage < 1) return;
    const value = Math.max(7, item.priority * 3.2 * gearWeight);
    recommendations.push({
      type: 'gear',
      title: `Target a ${item.label.toLowerCase()} upgrade`,
      detail: `${item.name} is item level ${item.itemLevel}, about ${item.belowAverage.toFixed(0)} levels below your equipped-slot average.`,
      value,
      label: priorityLabel(value),
    });
  });

  const gap = Math.max(0, Number(targetScore) - currentScore);
  if (gap > 0) {
    const value = Math.min(55, 15 + gap / 25);
    recommendations.push({
      type: 'goal',
      title: `Close the ${Math.round(gap).toLocaleString()} point target gap`,
      detail: dungeon.length
        ? `Prioritise lower-scoring dungeons before repeatedly pushing your strongest key. This spreads rating gains across the profile.`
        : `Complete a broader set of rated Mythic+ runs so the planner can identify efficient score gains.`,
      value,
      label: priorityLabel(value),
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      type: 'general', title: 'Build a larger progression sample',
      detail: 'There is not enough public run or gear data to rank specific opportunities yet.', value: 8, label: 'Useful'
    });
  }

  return recommendations
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function buildAnalysis(character, options = {}) {
  const currentScore = getCurrentScore(character);
  const targetScore = Math.max(0, Number(options.targetScore) || 0);
  const progress = targetScore > 0 ? Math.min(1, currentScore / targetScore) : 0;

  return {
    currentScore,
    targetScore,
    scoreGap: Math.max(0, targetScore - currentScore),
    progress,
    runs: normaliseRuns(character),
    dungeons: dungeonOpportunities(character),
    weakGear: gearWeaknesses(character),
    raids: raidSnapshot(character),
    recommendations: buildRecommendations(character, options),
  };
}
