import { CLASS_ARMOR, HEALER_CLASSES, LOOT_DATA_VERSION, SEASON_2_DUNGEONS, endOfDungeonItemLevel } from './loot-data.js';
import { enrichCuratedDungeonsWithOfficial } from './official-loot.js';
import { buildStatAlignment, replacementStatFit } from './stat-alignment.js';

import { MIDNIGHT_SEASON_2, currentSeasonState, isMidnightSeason2ScoreEntry, normaliseContentName, seasonDungeonFor } from './season-12-1.js';
import { buildPersonalDungeonBis, effectiveItemStats, getBisMatch, mergeBisGearPriorities } from './bis.js';
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

  // Prefer an explicitly identified Midnight Season 2 score.
  // The literal "current" token remains accepted for the local demo fixture.
  // A real outgoing season identifier such as season-midnight-1 is rejected.
  const selected = seasons.find(isMidnightSeason2ScoreEntry)
    || seasons.find((entry) => normaliseContentName(entry?.season) === 'current');

  const score = selected?.scores?.all;
  return Number.isFinite(score) ? score : 0;
}

export function normaliseRuns(character) {
  const sourceRuns = Array.isArray(character?.mythic_plus_best_runs)
    ? character.mythic_plus_best_runs
    : [];

  // Raider.IO best-runs data is current-season data, but around a season
  // transition the outgoing season can remain "current" until the new M+
  // season actually opens. Filtering against the canonical 12.1 pool stops
  // Season 1 runs from contaminating the Season 2 progression map.
  const bestByDungeon = new Map();

  for (const run of sourceRuns) {
    const seasonDungeon = seasonDungeonFor(run?.dungeon, run?.short_name);
    if (!seasonDungeon) continue;

    const item = {
      dungeon: seasonDungeon.name,
      shortName: seasonDungeon.shortName,
      level: Number(run?.mythic_level) || 0,
      score: Number(run?.score) || 0,
      upgrades: Number(run?.num_keystone_upgrades) || 0,
      clearTimeMs: Number(run?.clear_time_ms) || 0,
      parTimeMs: Number(run?.par_time_ms) || 0,
      url: run?.url || null,
      hasRun: true,
    };

    const existing = bestByDungeon.get(seasonDungeon.shortName);
    if (
      !existing
      || item.score > existing.score
      || (item.score === existing.score && item.level > existing.level)
    ) {
      bestByDungeon.set(seasonDungeon.shortName, item);
    }
  }

  return [...bestByDungeon.values()]
    .sort((a, b) => b.score - a.score || b.level - a.level || a.dungeon.localeCompare(b.dungeon));
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
      secondaryStats: item.secondary_stats || null,
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
  const runByDungeon = new Map(runs.map((run) => [run.shortName, run]));
  const bestScore = runs.length ? Math.max(...runs.map((run) => run.score)) : 0;
  const bestLevel = runs.length ? Math.max(...runs.map((run) => run.level)) : 0;

  const candidates = MIDNIGHT_SEASON_2.dungeons.map((dungeon) => {
    const run = runByDungeon.get(dungeon.shortName);

    if (!run) {
      // An unrun current-season dungeon is a genuine score opportunity.
      // Give it a deterministic high raw value rather than importing an old
      // Season 1 score or pretending +0 is a completed run.
      return {
        dungeon: dungeon.name,
        shortName: dungeon.shortName,
        level: 0,
        score: 0,
        upgrades: 0,
        clearTimeMs: 0,
        parTimeMs: 0,
        url: null,
        hasRun: false,
        scoreDeficit: bestScore,
        levelDeficit: bestLevel,
        timingPenalty: 0,
        rawOpportunity: 100 + Math.min(60, bestScore * 0.15) + Math.min(30, bestLevel * 3),
      };
    }

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
      opportunity: maxOpportunity > 0
        ? (run.rawOpportunity / maxOpportunity) * 100
        : (run.hasRun ? 0 : 100),
    }))
    .sort((a, b) =>
      b.opportunity - a.opportunity
      || Number(a.hasRun) - Number(b.hasRun)
      || b.scoreDeficit - a.scoreDeficit
      || a.dungeon.localeCompare(b.dungeon)
    );
}

export function raidSnapshot(character) {
  const season = currentSeasonState();
  const raids = character?.raid_progression && typeof character.raid_progression === 'object'
    ? character.raid_progression
    : {};

  const currentRaidEntry = Object.entries(raids).find(([slug]) => {
    const token = normaliseContentName(slug);
    return token === normaliseContentName(MIDNIGHT_SEASON_2.raid.slug)
      || MIDNIGHT_SEASON_2.raid.aliases.includes(token);
  });

  const value = currentRaidEntry?.[1] || null;
  const normal = Number(value?.normal_bosses_killed) || 0;
  const heroic = Number(value?.heroic_bosses_killed) || 0;
  const mythic = Number(value?.mythic_bosses_killed) || 0;
  const totalBosses = MIDNIGHT_SEASON_2.raid.totalBosses;

  const raidSummary = value?.summary
    || (season.raidOpen
      ? `${normal}/${totalBosses} N | ${heroic}/${totalBosses} H | ${mythic}/${totalBosses} M`
      : `Opens ${MIDNIGHT_SEASON_2.raidOpens} | ${totalBosses} bosses`);

  return [
    {
      slug: MIDNIGHT_SEASON_2.raid.slug,
      name: MIDNIGHT_SEASON_2.raid.name,
      summary: raidSummary,
      totalBosses,
      mythic,
      heroic,
      normal,
      seasonCurrent: true,
      isLair: false,
    },
    {
      slug: MIDNIGHT_SEASON_2.lair.slug,
      name: MIDNIGHT_SEASON_2.lair.name,
      summary: `${MIDNIGHT_SEASON_2.lair.boss} | 1-boss Season 2 Lair`,
      totalBosses: 1,
      mythic: 0,
      heroic: 0,
      normal: 0,
      seasonCurrent: true,
      isLair: true,
    },
  ];
}

function canonicalClass(character) {
  const name = String(character?.class || '').trim();
  return HEALER_CLASSES.includes(name) ? name : name;
}

const HEALER_WEAPON_TYPES = Object.freeze({
  Druid: new Set(['dagger', 'fist weapon', 'one handed mace', 'mace', 'staff', 'polearm']),
  Evoker: new Set(['dagger', 'fist weapon', 'one handed axe', 'one handed mace', 'one handed sword', 'staff']),
  Monk: new Set(['fist weapon', 'one handed axe', 'one handed mace', 'one handed sword', 'staff', 'polearm']),
  Paladin: new Set(['one handed axe', 'one handed mace', 'one handed sword', 'shield']),
  Priest: new Set(['dagger', 'one handed mace', 'mace', 'staff', 'wand', 'off hand', 'held in off hand']),
  Shaman: new Set(['fist weapon', 'one handed axe', 'one handed mace', 'mace', 'dagger', 'staff', 'shield']),
});

function normaliseWeaponType(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/s+/g, ' ');

  const aliases = {
    'daggers': 'dagger',
    'fist weapons': 'fist weapon',
    'one handed axes': 'one handed axe',
    'one handed maces': 'one handed mace',
    'one handed swords': 'one handed sword',
    'staves': 'staff',
    'polearms': 'polearm',
    'shields': 'shield',
    'wands': 'wand',
  };

  return aliases[normalized] || normalized;
}

function itemIsUsable(character, item) {
  const className = canonicalClass(character);

  // Curated class restrictions remain the strongest signal for weapons and
  // unusual items where we already have a known-safe compatibility list.
  if (Array.isArray(item.classes)) {
    return item.classes.includes(className);
  }

  if (item.armor) {
    return CLASS_ARMOR[className] === item.armor;
  }

  if (item.weaponType) {
    const allowed = HEALER_WEAPON_TYPES[className];
    const type = normaliseWeaponType(item.weaponType);
    return Boolean(allowed && allowed.has(type));
  }

  // Jewellery, cloaks and other armour-agnostic slots are usable unless a
  // stronger restriction above says otherwise.
  return true;
}

export function usableLootForCharacter(character) {
  const enriched = enrichCuratedDungeonsWithOfficial(
    SEASON_2_DUNGEONS,
    character?.official_dungeon_loot
  );

  return enriched.map((dungeon) => ({
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

export function buildBisAwareGearPriorities(
  character,
  { keyLevel = 10, statContext = 'mythic_plus', limit = 10 } = {}
) {
  const weak = gearWeaknesses(character, 16);
  const gear = normaliseGear(character);
  const statAlignment = buildStatAlignment(character, { context: statContext });
  const usableLoot = usableLootForCharacter(character);
  const bisProfile = buildPersonalDungeonBis(character, usableLoot, { statAlignment, statContext });
  const dropItemLevel = endOfDungeonItemLevel(keyLevel);

  return mergeBisGearPriorities(weak, gear, bisProfile, {
    dropItemLevel,
    limit,
  });
}

export function dungeonLootOpportunities(character, { keyLevel = 10, statContext = 'mythic_plus' } = {}) {
  const weakGear = gearWeaknesses(character, 16);
  const statAlignment = buildStatAlignment(character, { context: statContext });
  const usableLoot = usableLootForCharacter(character);
  const bisProfile = buildPersonalDungeonBis(character, usableLoot, { statAlignment, statContext });
  const farmKeyLevel = Math.max(2, Math.floor(Number(keyLevel) || 10));
  const dropItemLevel = endOfDungeonItemLevel(farmKeyLevel);
  const farmTargets = mergeBisGearPriorities(
    weakGear,
    normaliseGear(character),
    bisProfile,
    { dropItemLevel, limit: 16 }
  );

  const candidates = usableLoot.map((dungeon) => {
    const itemMatches = dungeon.items
      .map((item) => {
        const target = bestTargetForLootItem(item, farmTargets);
        if (!target) return null;

        const candidateStats = effectiveItemStats(item);
        const statFit = replacementStatFit(
          candidateStats,
          target.secondaryStats,
          statAlignment
        );
        const bisMatch = getBisMatch(item, target.slot, bisProfile);
        const upgradeDelta = dropItemLevel - target.itemLevel;
        const sameLevelBisSidegrade = upgradeDelta === 0
          && bisMatch.exact
          && statFit.replacementAvailable
          && Number(statFit.alignmentGain) >= 0.75;
        if (upgradeDelta < 0 || (upgradeDelta === 0 && !sameLevelBisSidegrade)) return null;
        const baseUpgradeValue = upgradeDelta > 0
          ? upgradeDelta * (0.5 + (target.priority / 200))
          : Math.max(2, Number(statFit.alignmentGain) * 4);
        const upgradeValue = baseUpgradeValue * statFit.multiplier * bisMatch.multiplier;

        return {
          itemName: item.name,
          itemId: Number(item.itemId) || null,
          officialSource: item.officialSource === true,
          encounterName: item.encounterName || null,
          itemSecondaryStats: candidateStats || null,
          itemSecondaryStatTypes: item.secondaryStatTypes || [],
          statFitScore: statFit.score,
          statFitMultiplier: statFit.multiplier,
          statFitLabel: statFit.label,
          statFitStatus: statFit.status,
          bisStatus: bisMatch.label,
          bisRank: bisMatch.rank,
          bisExact: bisMatch.exact,
          bisNear: bisMatch.near,
          bisMultiplier: bisMatch.multiplier,
          replacementAnalysisAvailable: statFit.replacementAvailable === true,
          projectedAlignmentScore: Number(statFit.projectedAlignmentScore) || null,
          alignmentGain: Number(statFit.alignmentGain) || 0,
          lootSlot: item.slot,
          targetSlot: target.slot,
          targetLabel: target.label,
          currentItem: target.name,
          currentItemId: target.itemId || null,
          currentIconUrl: target.iconUrl || null,
          currentItemLevel: target.itemLevel,
          baseline: target.baseline,
          deficit: target.belowAverage,
          slotPriority: target.priority,
          currentSecondaryStats: target.secondaryStats || null,
          dropItemLevel,
          upgradeDelta,
          baseUpgradeValue,
          upgradeValue,
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
        match.upgradeValue > existing.upgradeValue ||
        (match.upgradeValue === existing.upgradeValue && match.alignmentGain > existing.alignmentGain) ||
        (
          match.upgradeValue === existing.upgradeValue &&
          match.alignmentGain === existing.alignmentGain &&
          match.statFitScore > existing.statFitScore
        ) ||
        (
          match.upgradeValue === existing.upgradeValue &&
          match.alignmentGain === existing.alignmentGain &&
          match.statFitScore === existing.statFitScore &&
          match.upgradeDelta > existing.upgradeDelta
        ) ||
        (
          match.upgradeValue === existing.upgradeValue &&
          match.alignmentGain === existing.alignmentGain &&
          match.statFitScore === existing.statFitScore &&
          match.upgradeDelta === existing.upgradeDelta &&
          match.slotPriority > existing.slotPriority
        )
      ) {
        bestBySlot.set(match.targetSlot, match);
      }
    }

    const slotMatches = [...bestBySlot.values()]
      .sort((a, b) =>
        b.upgradeValue - a.upgradeValue ||
        b.alignmentGain - a.alignmentGain ||
        b.statFitScore - a.statFitScore ||
        b.upgradeDelta - a.upgradeDelta ||
        b.slotPriority - a.slotPriority ||
        a.targetLabel.localeCompare(b.targetLabel)
      );

    // Base value comes from real item-level gain and current slot weakness.
    // Secondary-stat composition then applies a deliberately capped +/-25%
    // modifier so stat fit can reorder similar upgrades without overwhelming
    // a materially larger item-level gain.
    const upgradeCoverage = slotMatches.reduce(
      (sum, match) => sum + match.upgradeValue,
      0
    );
    const breadthBonus = Math.min(12, Math.max(0, slotMatches.length - 1) * 2);
    const bisBonus = slotMatches.reduce(
      (sum, match) => sum
        + (match.bisExact ? 12 : match.bisNear ? 5 : 0),
      0
    );
    const rawGearOpportunity = upgradeCoverage + breadthBonus + bisBonus;

    return {
      name: dungeon.name,
      shortName: dungeon.shortName,
      journalInstanceId: dungeon.journalInstanceId || null,
      instanceIconUrl: dungeon.instanceIconUrl || null,
      officialSource: dungeon.officialSource === true,
      rawGearOpportunity,
      gearOpportunity: 0,
      matchedSlots: slotMatches.length,
      eligibleItems: dungeon.items.length,
      candidateDrops: itemMatches.length,
      matchingDrops: slotMatches.length,
      bisTargets: slotMatches.filter((match) => match.bisExact).length,
      nearBisTargets: slotMatches.filter((match) => match.bisNear).length,
      bisBonus,
      farmKeyLevel,
      dropItemLevel,
      statAlignmentAvailable: statAlignment.available === true,
      // Public/UI-facing matches are deliberately restricted to the single best
      // candidate for each weak slot. All alternatives are retained separately
      // for diagnostics/tests but do not appear as recommendations.
      matches: slotMatches,
      recommendedMatches: slotMatches,
      candidateMatches: itemMatches
        .sort((a, b) =>
          b.upgradeValue - a.upgradeValue ||
          b.alignmentGain - a.alignmentGain ||
          b.statFitScore - a.statFitScore ||
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
      b.candidateDrops - a.candidateDrops ||
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
  if (!run.hasRun) {
    return {
      key: `dungeon:${run.shortName}`,
      type: 'dungeon',
      title: `Establish Season 2 score in ${run.shortName}`,
      detail: `No Midnight Season 2 best run is recorded for ${run.dungeon}. Completing it gives the progression map a valid current-season baseline.`,
      value: run.opportunity,
      label: priorityLabel(run.opportunity),
    };
  }

  const suggestedLevel = Math.max(
    run.level + 1,
    Math.min(run.level + Math.max(1, run.levelDeficit), run.level + 2)
  );

  return {
    key: `dungeon:${run.shortName}`,
    type: 'dungeon',
    title: `Push ${run.shortName} toward +${suggestedLevel}`,
    detail: `Your best Season 2 run is +${run.level} for ${run.score.toFixed(1)} score. It trails your strongest current-season dungeon by ${run.scoreDeficit.toFixed(1)} score.`,
    value: run.opportunity,
    label: priorityLabel(run.opportunity),
  };
}

function gearRecommendation(item) {
  return {
    key: `gear:${item.slot}`,
    type: 'gear',
    title: `Target a ${item.label.toLowerCase()} upgrade`,
    detail: item.bisTargetName
      ? `${item.name} is item level ${item.itemLevel}. Personal Dungeon BiS target: ${item.bisTargetName} from ${item.bisTargetDungeon}${item.bisAlignmentGain > 0 ? ` (+${item.bisAlignmentGain.toFixed(1)} projected stat alignment)` : ``}.`
      : `${item.name} is item level ${item.itemLevel}, ${item.belowAverage.toFixed(0)} levels below your ${item.baseline.toFixed(1)} equipped-item average.`,
    value: item.priority,
    label: priorityLabel(item.priority),
  };
}

function farmRecommendation(dungeon) {
  const recommended = dungeon.recommendedMatches || dungeon.slotMatches || [];
  const slots = recommended.slice(0, 4).map((match) => match.targetLabel).join(', ');
  const bestStatFit = recommended[0] || null;
  const statDetail = bestStatFit
    ? ` Best target: ${bestStatFit.itemName} for ${bestStatFit.targetLabel.toLowerCase()} (${bestStatFit.statFitLabel.toLowerCase()}${bestStatFit.replacementAnalysisAvailable ? `, ${bestStatFit.alignmentGain >= 0 ? '+' : ''}${bestStatFit.alignmentGain.toFixed(1)} alignment` : ''}).`
    : '';

  return {
    key: `farm:${dungeon.shortName}`,
    type: 'farm',
    title: `Farm ${dungeon.name} at +${dungeon.farmKeyLevel}`,
    detail: dungeon.matchedSlots
      ? `Item level ${dungeon.dropItemLevel} loot can upgrade ${dungeon.matchedSlots} weak slot${dungeon.matchedSlots === 1 ? '' : 's'}${slots ? `: ${slots}` : ''}.${statDetail}`
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

export function buildRecommendations(character, { focus = 'balanced', targetScore = 3000, farmKeyLevel = 10, statContext = 'mythic_plus' } = {}) {
  const currentScore = getCurrentScore(character);
  const dungeonCandidates = dungeonOpportunities(character).map(dungeonRecommendation);
  const gearCandidates = buildBisAwareGearPriorities(character, {
    keyLevel: farmKeyLevel,
    statContext,
  }).map(gearRecommendation);
  const farmCandidates = dungeonLootOpportunities(character, { keyLevel: farmKeyLevel, statContext })
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
  const statContext = options.statContext === 'raid' ? 'raid' : 'mythic_plus';
  const statAlignment = buildStatAlignment(character, { context: statContext });
  const lootDungeons = dungeonLootOpportunities(character, { keyLevel: farmKeyLevel, statContext });
  const bisProfileForAnalysis = buildPersonalDungeonBis(
    character,
    usableLootForCharacter(character),
    { statAlignment }
  );
  const bisAwareGear = mergeBisGearPriorities(
    gearWeaknesses(character, 16),
    normaliseGear(character),
    bisProfileForAnalysis,
    { dropItemLevel: endOfDungeonItemLevel(farmKeyLevel), limit: 10 }
  );
  const season = currentSeasonState();

  return {
    currentScore,
    targetScore,
    scoreGap: Math.max(0, targetScore - currentScore),
    progress,
    focus,
    statContext,
    statAlignment,
    season,
    runs: normaliseRuns(character),
    dungeons: dungeonOpportunities(character),
    weakGear: bisAwareGear,
    bisProfile: bisProfileForAnalysis,
    lootDungeons,
    bestGearFarm: lootDungeons[0] || null,
    farmKeyLevel,
    farmDropItemLevel: endOfDungeonItemLevel(farmKeyLevel),
    lootDataVersion: LOOT_DATA_VERSION,
    raids: raidSnapshot(character),
    recommendations: buildRecommendations(character, { ...options, focus, statContext }),
  };
}
