import { replacementStatFit } from './stat-alignment.js';

// HealerLab BiS policy
// --------------------
// "Personal Dungeon BiS" means the best CURRENT Season 2 dungeon item for a
// character's slot according to the selected Raid/M+ secondary-stat profile.
// It is deliberately character-specific rather than a stale static list.
//
// Special-effect trinkets are NOT auto-declared BiS from secondary stats alone.
// Their effects require a verified external ranking or simulation model. Until
// such data is available, HealerLab leaves them out of automatic BiS bonuses.

export const BIS_MODEL_VERSION = '2026-08-16';

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

function clean(value) {
  return String(value ?? '').trim().toLowerCase();
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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

function itemStats(item) {
  return item?.secondaryStats || item?.secondary_stats || null;
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
  // Trinket value is usually dominated by the proc/use effect, not its raw
  // secondary-stat distribution. Do not fabricate a trinket BiS ranking.
  if (item?.slot === 'trinket') return false;
  return true;
}

function candidateScore(fit) {
  if (!fit?.available) return null;

  const replacement = fit.replacementAvailable
    ? finite(fit.alignmentGain) * 10
    : 0;
  const composition = finite(fit.candidateFitScore ?? fit.score) * 0.20;

  return replacement + composition;
}

export function buildPersonalDungeonBis(character, dungeons, { statAlignment } = {}) {
  const equipped = equippedItems(character);
  const bySlotCandidates = new Map();

  for (const dungeon of dungeons || []) {
    for (const item of dungeon?.items || []) {
      if (!rankableItem(item)) continue;

      for (const slot of targetSlots(item)) {
        const current = equipped[slot];
        if (!current) continue;

        const fit = replacementStatFit(
          itemStats(item),
          itemStats(current),
          statAlignment
        );
        const score = candidateScore(fit);
        if (score === null) continue;

        const candidate = {
          slot,
          itemName: itemName(item) || 'Unnamed item',
          itemId: itemId(item),
          dungeonName: dungeon.name,
          dungeonShortName: dungeon.shortName,
          itemSecondaryStats: itemStats(item),
          currentItemName: itemName(current) || 'Equipped item',
          currentItemId: itemId(current),
          currentItemLevel: finite(current?.item_level),
          score,
          statFitScore: finite(fit.candidateFitScore ?? fit.score),
          alignmentGain: finite(fit.alignmentGain),
          projectedAlignmentScore: finite(fit.projectedAlignmentScore),
          replacementAvailable: fit.replacementAvailable === true,
          fitLabel: fit.label || 'Stat fit',
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

  return {
    available: best.length > 0,
    modelVersion: BIS_MODEL_VERSION,
    context: statAlignment?.context || 'mythic_plus',
    bySlot,
    best,
    rankedSlots: Object.keys(bySlot).length,
    note: best.length
      ? 'Personal Dungeon BiS is derived from current Season 2 dungeon drops and the selected stat profile. Trinkets are excluded from automatic BiS ranking because their effects require independent valuation.'
      : 'No reliable personal dungeon BiS could be calculated because item secondary-stat data or character stat alignment was unavailable.',
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

    // Never create a dynamic BiS priority for a lower item-level replacement.
    // A true effect-driven exception belongs in a verified guide/sim override,
    // not in this stat-only model.
    if (ilvlDelta < 0) continue;

    // At equal item level, require a material alignment improvement so that
    // tiny secondary-stat shuffles do not crowd the gear-priority list.
    if (ilvlDelta === 0 && alignmentGain < BIS_POLICY.sameLevelMinimumAlignmentGain) {
      continue;
    }

    const existing = merged.get(slot);
    const bisPriority = Math.min(
      100,
      40
      + (Math.min(35, Math.max(0, ilvlDelta) * 4))
      + (Math.min(25, Math.max(0, alignmentGain) * 4))
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