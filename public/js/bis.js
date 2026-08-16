import { replacementStatFit } from './stat-alignment.js';
import { SECONDARY_STATS, getStatProfile } from './stat-profiles.js';

export const BIS_MODEL_VERSION = '2026-08-16-live-blizzard';

export const BIS_POLICY = Object.freeze({
  exactMultiplier: 1.18,
  nearMultiplier: 1.07,
  exactDungeonBonus: 12,
  nearDungeonBonus: 5,
  nearScoreWindow: 10,
  sameLevelMinimumAlignmentGain: 0.75,
});

const TARGET_SLOT_MAP = Object.freeze({
  ring: ['finger_1', 'finger_2'],
  trinket: ['trinket_1', 'trinket_2'],
  main_hand: ['main_hand'],
  off_hand: ['off_hand'],
  head: ['head'],
  neck: ['neck'],
  shoulder: ['shoulder'],
  back: ['back'],
  chest: ['chest'],
  wrist: ['wrist'],
  hands: ['hands'],
  waist: ['waist'],
  legs: ['legs'],
  feet: ['feet'],
});

const PRIORITY_WEIGHTS = Object.freeze([1.00, 0.82, 0.58, 0.34]);

function clean(value) {
  return String(value ?? '').trim().toLowerCase();
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function totalStats(stats = {}) {
  return SECONDARY_STATS.reduce((sum, stat) => sum + Math.max(0, finite(stats?.[stat])), 0);
}

function equippedItems(character) {
  const items = character?.gear?.items;
  return items && typeof items === 'object' ? items : {};
}

function targetSlots(item) {
  return TARGET_SLOT_MAP[item?.slot] || [];
}

function itemId(item) {
  return Number(item?.itemId ?? item?.item_id ?? item?.id) || null;
}

function itemName(item) {
  return String(item?.name || item?.itemName || '').trim();
}

function numericItemStats(item) {
  return item?.secondaryStats || item?.secondary_stats || null;
}

function statTypeList(item) {
  const raw = item?.secondaryStatTypes || item?.secondary_stat_types || [];
  return [...new Set(
    (Array.isArray(raw) ? raw : [])
      .map((value) => clean(value).replaceAll('critical strike', 'crit'))
      .map((value) => value === 'critical_strike' ? 'crit' : value)
      .filter((value) => SECONDARY_STATS.includes(value))
  )];
}

export function effectiveItemStats(item) {
  const numeric = numericItemStats(item) || {};
  if (totalStats(numeric) > 0) {
    return {
      crit: finite(numeric.crit),
      haste: finite(numeric.haste),
      mastery: finite(numeric.mastery),
      versatility: finite(numeric.versatility),
    };
  }

  // The Blizzard base Item endpoint can expose the secondary-stat TYPES while
  // the scaled rating values are zero/absent. BiS only needs the distribution
  // to distinguish e.g. Haste/Mastery from Crit/Vers. Use one unit per stat
  // type so the existing composition math can still work.
  const types = statTypeList(item);
  if (!types.length) return null;

  return Object.fromEntries(
    SECONDARY_STATS.map((stat) => [stat, types.includes(stat) ? 1 : 0])
  );
}

function sameItem(a, b) {
  const aId = itemId(a);
  const bId = itemId(b);
  if (aId && bId) return aId === bId;
  const aName = clean(itemName(a));
  const bName = clean(itemName(b));
  return Boolean(aName && bName && aName === bName);
}

function rankableItem(item) {
  if (!item?.slot) return false;

  // Trinkets are effect-driven. Do not pretend secondary-stat order is enough
  // to rank a proc/use trinket as BiS.
  if (item.slot === 'trinket') return false;

  return true;
}

function priorityCompositionFit(stats, profile) {
  const total = totalStats(stats);
  if (!profile || total <= 0) {
    return {
      available: false,
      score: 0,
      label: 'No stat signal',
      status: 'neutral',
      priorityOnly: true,
    };
  }

  const order = Array.isArray(profile.priorityOrder) && profile.priorityOrder.length
    ? profile.priorityOrder
    : SECONDARY_STATS;

  const weights = Object.fromEntries(
    order.map((stat, index) => [stat, PRIORITY_WEIGHTS[index] ?? 0.25])
  );

  const weighted = SECONDARY_STATS.reduce(
    (sum, stat) => sum + ((finite(stats[stat]) / total) * (weights[stat] ?? 0.25)),
    0
  );

  // Map the theoretical 0.34..1.00 range into a readable 0..100 score.
  const score = Math.max(0, Math.min(100, ((weighted - 0.25) / 0.75) * 100));
  const present = order.filter((stat) => finite(stats[stat]) > 0);

  let label = 'Stat-priority match';
  let status = 'neutral';
  if (score >= 75) {
    label = `Excellent priority fit: ${present.join(' / ')}`;
    status = 'good';
  } else if (score >= 55) {
    label = `Strong priority fit: ${present.join(' / ')}`;
    status = 'good';
  } else if (score >= 35) {
    label = `Useful priority fit: ${present.join(' / ')}`;
    status = 'warning';
  } else {
    label = `Low priority fit: ${present.join(' / ')}`;
    status = 'poor';
  }

  return {
    available: true,
    score,
    candidateFitScore: score,
    multiplier: 1,
    label,
    status,
    replacementAvailable: false,
    projectedAlignmentScore: 0,
    alignmentGain: 0,
    priorityOnly: true,
  };
}

function candidateScore(fit) {
  if (!fit?.available) return null;

  if (fit.replacementAvailable) {
    const replacement = finite(fit.alignmentGain) * 10;
    const composition = finite(fit.candidateFitScore ?? fit.score) * 0.20;
    return replacement + composition;
  }

  return finite(fit.candidateFitScore ?? fit.score);
}

function sourceForItem(item) {
  if (totalStats(numericItemStats(item) || {}) > 0) return 'Blizzard item ratings';
  if (statTypeList(item).length) return 'Blizzard item stat types';
  return 'unknown';
}

export function buildPersonalDungeonBis(
  character,
  dungeons,
  { statAlignment, statContext = 'mythic_plus' } = {}
) {
  const equipped = equippedItems(character);
  const context = statAlignment?.context === 'raid' || statContext === 'raid'
    ? 'raid'
    : 'mythic_plus';
  const profile = statAlignment?.profile || getStatProfile(character, context);
  const bySlotCandidates = new Map();

  if (!profile) {
    return {
      available: false,
      modelVersion: BIS_MODEL_VERSION,
      context,
      bySlot: {},
      best: [],
      rankedSlots: 0,
      sourceMode: 'unavailable',
      note: 'No stat-priority profile is available for this healer specialization.',
    };
  }

  for (const dungeon of dungeons || []) {
    for (const item of dungeon?.items || []) {
      if (!rankableItem(item)) continue;

      const candidateStats = effectiveItemStats(item);
      if (!candidateStats || totalStats(candidateStats) <= 0) continue;

      for (const slot of targetSlots(item)) {
        const current = equipped[slot];
        if (!current) continue;

        let fit;
        if (statAlignment?.available) {
          fit = replacementStatFit(
            candidateStats,
            effectiveItemStats(current) || numericItemStats(current),
            statAlignment
          );

          // If current equipment did not expose stats, replacementStatFit falls
          // back to candidate-only composition. If it still cannot score, use
          // the static priority order rather than abandoning BiS entirely.
          if (!fit?.available) {
            fit = priorityCompositionFit(candidateStats, profile);
          }
        } else {
          fit = priorityCompositionFit(candidateStats, profile);
        }

        const score = candidateScore(fit);
        if (score === null) continue;

        const candidate = {
          slot,
          itemName: itemName(item) || 'Unnamed item',
          itemId: itemId(item),
          dungeonName: dungeon.name,
          dungeonShortName: dungeon.shortName,
          itemSecondaryStats: candidateStats,
          secondaryStatTypes: statTypeList(item),
          statDataSource: sourceForItem(item),
          currentItemName: itemName(current) || 'Equipped item',
          currentItemId: itemId(current),
          currentItemLevel: finite(current?.item_level),
          score,
          statFitScore: finite(fit.candidateFitScore ?? fit.score),
          alignmentGain: finite(fit.alignmentGain),
          projectedAlignmentScore: finite(fit.projectedAlignmentScore),
          replacementAvailable: fit.replacementAvailable === true,
          priorityOnly: fit.priorityOnly === true || !statAlignment?.available,
          fitLabel: fit.label || 'Stat-priority fit',
          fitStatus: fit.status || 'neutral',
        };

        if (!bySlotCandidates.has(slot)) bySlotCandidates.set(slot, []);
        bySlotCandidates.get(slot).push(candidate);
      }
    }
  }

  const bySlot = {};

  for (const [slot, candidates] of bySlotCandidates.entries()) {
    const unique = new Map();

    for (const candidate of candidates) {
      const key = candidate.itemId
        ? `id:${candidate.itemId}`
        : `name:${clean(candidate.itemName)}`;

      const existing = unique.get(key);
      if (!existing || candidate.score > existing.score) unique.set(key, candidate);
    }

    const ranked = [...unique.values()]
      .sort((a, b) =>
        b.score - a.score
        || b.alignmentGain - a.alignmentGain
        || b.statFitScore - a.statFitScore
        || a.itemName.localeCompare(b.itemName)
      )
      .slice(0, 3)
      .map((candidate, index) => ({
        ...candidate,
        rank: index + 1,
        label: index === 0 ? 'Personal Dungeon BiS' : `Alternative #${index + 1}`,
      }));

    if (ranked.length) bySlot[slot] = ranked;
  }

  const best = Object.values(bySlot).map((candidates) => candidates[0]);
  const sources = new Set(best.map((item) => item.statDataSource));
  const usedPriorityFallback = best.some((item) => item.priorityOnly);

  return {
    available: best.length > 0,
    modelVersion: BIS_MODEL_VERSION,
    context,
    bySlot,
    best,
    rankedSlots: Object.keys(bySlot).length,
    sourceMode: usedPriorityFallback
      ? 'Blizzard loot + stat-priority fallback'
      : 'Blizzard loot + live stat alignment',
    itemStatSources: [...sources],
    note: best.length
      ? `Personal Dungeon BiS is built from Blizzard Journal loot and Blizzard Item metadata, filtered to usable gear, then ranked against the ${profile.context} stat priority. ${usedPriorityFallback ? 'Where scaled item ratings are unavailable, HealerLab uses the Blizzard-reported stat types and the existing priority order.' : 'Live character stat alignment is used where available.'} Trinkets remain excluded from automatic stat-only BiS ranking.`
      : 'Blizzard loot was loaded, but no rankable items exposed usable secondary-stat ratings or stat types for this character.',
  };
}

export function getBisMatch(item, targetSlot, bisProfile) {
  const candidates = bisProfile?.bySlot?.[targetSlot] || [];

  if (!candidates.length) {
    return {
      exact: false,
      near: false,
      rank: null,
      label: null,
      multiplier: 1,
      candidate: null,
    };
  }

  const match = candidates.find((candidate) => sameItem(item, candidate));
  if (!match) {
    return {
      exact: false,
      near: false,
      rank: null,
      label: null,
      multiplier: 1,
      candidate: candidates[0],
    };
  }

  const bestScore = finite(candidates[0]?.score);
  const near = match.rank === 2
    && (bestScore - finite(match.score)) <= BIS_POLICY.nearScoreWindow;
  const exact = match.rank === 1;

  return {
    exact,
    near,
    rank: match.rank,
    label: exact ? 'Personal BiS' : near ? 'Near-BiS' : null,
    multiplier: exact
      ? BIS_POLICY.exactMultiplier
      : near
        ? BIS_POLICY.nearMultiplier
        : 1,
    candidate: match,
  };
}

export function mergeBisGearPriorities(
  weakGear,
  allGear,
  bisProfile,
  { dropItemLevel = 0, limit = 10 } = {}
) {
  const weakBySlot = new Map((weakGear || []).map((item) => [item.slot, item]));
  const allBySlot = new Map((allGear || []).map((item) => [item.slot, item]));
  const merged = new Map(weakBySlot);

  if (!bisProfile?.available) {
    return [...merged.values()]
      .sort((a, b) => finite(b.priority) - finite(a.priority))
      .slice(0, limit);
  }

  for (const [slot, candidates] of Object.entries(bisProfile.bySlot || {})) {
    const bis = candidates?.[0];
    const current = allBySlot.get(slot);
    if (!bis || !current) continue;

    if (sameItem(current, bis)) {
      const existing = merged.get(slot);
      if (existing) {
        merged.set(slot, {
          ...existing,
          bisEquipped: true,
          bisTargetName: bis.itemName,
          bisTargetDungeon: bis.dungeonName,
          bisLabel: 'Personal BiS equipped',
        });
      }
      continue;
    }

    const ilvlDelta = finite(dropItemLevel) - finite(current.itemLevel);
    const alignmentGain = finite(bis.alignmentGain);

    if (ilvlDelta < 0) continue;

    // Equal-ilvl sidegrades are only auto-promoted when live replacement
    // analysis proves they improve the complete character stat balance.
    if (
      ilvlDelta === 0
      && (!bis.replacementAvailable || alignmentGain < BIS_POLICY.sameLevelMinimumAlignmentGain)
    ) {
      continue;
    }

    const existing = merged.get(slot);
    const bisPriority = Math.min(
      100,
      40
      + Math.min(35, Math.max(0, ilvlDelta) * 4)
      + Math.min(25, Math.max(0, alignmentGain) * 4)
    );

    const base = existing || {
      ...current,
      baseline: finite(current.baseline) || finite(current.itemLevel),
      belowAverage: finite(current.belowAverage),
      priority: 0,
    };

    merged.set(slot, {
      ...base,
      priority: Math.max(finite(base.priority), bisPriority),
      bisPriority,
      bisEquipped: false,
      bisTargetName: bis.itemName,
      bisTargetItemId: bis.itemId,
      bisTargetDungeon: bis.dungeonName,
      bisTargetShortName: bis.dungeonShortName,
      bisAlignmentGain: alignmentGain,
      bisProjectedAlignmentScore: bis.projectedAlignmentScore,
      bisPriorityOnly: bis.priorityOnly,
      bisLabel: 'Personal Dungeon BiS target',
    });
  }

  return [...merged.values()]
    .sort((a, b) =>
      finite(b.priority) - finite(a.priority)
      || finite(b.bisPriority) - finite(a.bisPriority)
      || finite(a.itemLevel) - finite(b.itemLevel)
    )
    .slice(0, limit);
}