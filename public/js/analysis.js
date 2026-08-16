import { CLASS_ARMOR, HEALER_CLASSES, LOOT_DATA_VERSION, SEASON_2_DUNGEONS, endOfDungeonItemLevel } from './loot-data.js';

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
      itemId: Number(item.item_id || item.id) || null,
      iconUrl: item.icon_url || null,
      quality: item.quality || null,
      source: item.source || 'raider.io',
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

function canonicalClass(character) {
  const name = String(character?.class || '').trim();
  return HEALER_CLASSES.includes(name) ? name : name;
}

function itemIsUsable(character, item) {
  const className = canonicalClass(character);

  if (item.armor) {
    return CLASS_ARMOR[className] === item.armor;
  }

  if (Array.isArray(item.classes)) {
    return item.classes.includes(className);
  }

  return true;
}

export function usableLootForCharacter(character) {
  return SEASON_2_DUNGEONS.map((dungeon) => ({
    ...dungeon,
    items: dungeon.items.filter((item) => itemIsUsable(character, item)),
  }));
}

function weaknessCandidatesForLootSlot(slot, weakGear) {
  if (slot === 'ring') {
    return weakGear.filter((item) => item.slot === 'finger_1' || item.slot === 'finger_2');
  }

  if (slot === 'trinket') {
    return weakGear.filter((item) => item.slot === 'trinket_1' || item.slot === 'trinket_2');
  }

  return weakGear.filter((item) => item.slot === slot);
}

function bestTargetForLootItem(item, weakGear) {
  const candidates = weaknessCandidatesForLootSlot(item.slot, weakGear)
    .sort((a, b) => b.priority - a.priority || a.itemLevel - b.itemLevel);
  return candidates[0] || null;
}

export function dungeonLootOpportunities(character, { keyLevel = 10 } = {}) {
  const weakGear = gearWeaknesses(character, 16);
  const usableLoot = usableLootForCharacter(character);
  const farmKeyLevel = Math.max(2, Math.floor(Number(keyLevel) || 10));
  const dropItemLevel = endOfDungeonItemLevel(farmKeyLevel);

  const candidates = usableLoot.map((dungeon) => {
    const itemMatches = dungeon.items
      .map((item) => {
        const target = bestTargetForLootItem(item, weakGear);
        if (!target) return null;

        const upgradeDelta = dropItemLevel - target.itemLevel;
        if (upgradeDelta <= 0) return null;

        return {
          itemName: item.name,
          lootSlot: item.slot,
          targetSlot: target.slot,
          targetLabel: target.label,
          currentItem: target.name,
          currentItemLevel: target.itemLevel,
          baseline: target.baseline,
          deficit: target.belowAverage,
          slotPriority: target.priority,
          dropItemLevel,
          upgradeDelta,
        };
      })
      .filter(Boolean);

    // Multiple drops can target one slot. The dungeon earns slot value once so
    // duplicate items do not artificially inflate its opportunity score.
    const bestBySlot = new Map();
    for (const match of itemMatches) {
      const existing = bestBySlot.get(match.targetSlot);
      if (
        !existing ||
        match.upgradeDelta > existing.upgradeDelta ||
        (match.upgradeDelta === existing.upgradeDelta && match.slotPriority > existing.slotPriority)
      ) {
        bestBySlot.set(match.targetSlot, match);
      }
    }

    const slotMatches = [...bestBySlot.values()]
      .sort((a, b) =>
        b.upgradeDelta - a.upgradeDelta ||
        b.slotPriority - a.slotPriority ||
        a.targetLabel.localeCompare(b.targetLabel)
      );

    // Weight the real item-level gain by how weak the slot is relative to the
    // character's equipped average. The final score is then normalised to 0-100.
    const upgradeCoverage = slotMatches.reduce(
      (sum, match) => sum + (match.upgradeDelta * (0.5 + (match.slotPriority / 200))),
      0
    );
    const breadthBonus = Math.min(12, Math.max(0, slotMatches.length - 1) * 2);
    const rawGearOpportunity = upgradeCoverage + breadthBonus;

    return {
      name: dungeon.name,
      shortName: dungeon.shortName,
      rawGearOpportunity,
      gearOpportunity: 0,
      matchedSlots: slotMatches.length,
      eligibleItems: dungeon.items.length,
      matchingDrops: itemMatches.length,
      farmKeyLevel,
      dropItemLevel,
      matches: itemMatches
        .sort((a, b) =>
          b.upgradeDelta - a.upgradeDelta ||
          b.slotPriority - a.slotPriority ||
          a.itemName.localeCompare(b.itemName)
        ),
      slotMatches,
    };
  });

  const maxRaw = Math.max(0, ...candidates.map((dungeon) => dungeon.rawGearOpportunity));

  return candidates
    .map((dungeon) => ({
      ...dungeon,
      gearOpportunity: maxRaw > 0 ? (dungeon.rawGearOpportunity / maxRaw) * 100 : 0,
    }))
    .sort((a, b) =>
      b.gearOpportunity - a.gearOpportunity ||
      b.matchedSlots - a.matchedSlots ||
      b.matchingDrops - a.matchingDrops ||
      a.name.localeCompare(b.name)
    );
}

export function bestGearFarm(character, options = {}) {
  return dungeonLootOpportunities(character, options)[0] || null;
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

function farmRecommendation(dungeon) {
  const slots = dungeon.slotMatches.slice(0, 4).map((match) => match.targetLabel).join(', ');
  return {
    key: `farm:${dungeon.shortName}`,
    type: 'farm',
    title: `Farm ${dungeon.name} at +${dungeon.farmKeyLevel}`,
    detail: dungeon.matchedSlots
      ? `Item level ${dungeon.dropItemLevel} loot can upgrade ${dungeon.matchedSlots} weak slot${dungeon.matchedSlots === 1 ? '' : 's'}${slots ? `: ${slots}` : ''}.`
      : `No weak equipped slots are item-level upgrades from +${dungeon.farmKeyLevel} loot.`,
    value: dungeon.gearOpportunity,
    label: priorityLabel(dungeon.gearOpportunity),
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
  balanced: { dungeon: 2, gear: 2, farm: 1 },
  score: { dungeon: 4, gear: 1, farm: 0 },
  gear: { dungeon: 0, gear: 3, farm: 2 },
};

export function buildRecommendations(character, { focus = 'balanced', targetScore = 3000, farmKeyLevel = 10 } = {}) {
  const currentScore = getCurrentScore(character);
  const dungeonCandidates = dungeonOpportunities(character).map(dungeonRecommendation);
  const gearCandidates = gearWeaknesses(character).map(gearRecommendation);
  const farmCandidates = dungeonLootOpportunities(character, { keyLevel: farmKeyLevel })
    .filter((dungeon) => dungeon.gearOpportunity > 0)
    .map(farmRecommendation);
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

  take(farmCandidates, strategy.farm);
  take(dungeonCandidates, strategy.dungeon);
  take(gearCandidates, strategy.gear);

  const goal = goalRecommendation(currentScore, Number(targetScore), dungeonCandidates.length);
  if (goal && selected.length < 6) {
    selected.push(goal);
    used.add(goal.key);
  }

  const remaining = [...farmCandidates, ...dungeonCandidates, ...gearCandidates]
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
  const farmKeyLevel = Math.max(2, Math.floor(Number(options.farmKeyLevel) || 10));
  const lootDungeons = dungeonLootOpportunities(character, { keyLevel: farmKeyLevel });

  return {
    currentScore,
    targetScore,
    scoreGap: Math.max(0, targetScore - currentScore),
    progress,
    focus,
    runs: normaliseRuns(character),
    dungeons: dungeonOpportunities(character),
    weakGear: gearWeaknesses(character),
    lootDungeons,
    bestGearFarm: lootDungeons[0] || null,
    farmKeyLevel,
    farmDropItemLevel: endOfDungeonItemLevel(farmKeyLevel),
    lootDataVersion: LOOT_DATA_VERSION,
    raids: raidSnapshot(character),
    recommendations: buildRecommendations(character, { ...options, focus }),
  };
}