import { SECONDARY_STATS, getStatProfile } from './stat-profiles.js';

const LABELS = Object.freeze({
  crit: 'Critical Strike',
  haste: 'Haste',
  mastery: 'Mastery',
  versatility: 'Versatility',
});

function finiteNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export function normaliseSecondaryStats(raw = {}) {
  return {
    crit: finiteNonNegative(raw.crit ?? raw.critical_strike ?? raw.criticalStrike),
    haste: finiteNonNegative(raw.haste),
    mastery: finiteNonNegative(raw.mastery),
    versatility: finiteNonNegative(raw.versatility ?? raw.vers),
  };
}

function sharesFor(ratings) {
  const total = SECONDARY_STATS.reduce((sum, stat) => sum + finiteNonNegative(ratings[stat]), 0);
  return {
    total,
    shares: Object.fromEntries(
      SECONDARY_STATS.map((stat) => [stat, total > 0 ? finiteNonNegative(ratings[stat]) / total : 0])
    ),
  };
}

function rowStatus(delta) {
  const absolute = Math.abs(delta);
  if (absolute <= 0.04) return 'good';
  if (absolute <= 0.08) return 'warning';
  return 'poor';
}

function balanceStatus(delta) {
  if (Math.abs(delta) <= 0.04) return 'within';
  return delta < 0 ? 'below' : 'above';
}

function overallStatus(score) {
  if (score >= 92) return 'good';
  if (score >= 84) return 'warning';
  return 'poor';
}



function alignmentScoreForRatings(ratings, profile) {
  const current = sharesFor(ratings);
  if (!profile || current.total <= 0) {
    return {
      available: false,
      score: 0,
      distance: 1,
      shares: current.shares,
      totalRating: current.total,
    };
  }

  const distance = 0.5 * SECONDARY_STATS.reduce(
    (sum, stat) => sum + Math.abs(current.shares[stat] - profile.shares[stat]),
    0
  );

  return {
    available: true,
    score: Math.max(0, Math.min(100, (1 - distance) * 100)),
    distance,
    shares: current.shares,
    totalRating: current.total,
  };
}
function orderedStats(profile) {
  const requested = Array.isArray(profile?.priorityOrder) ? profile.priorityOrder : [];
  const valid = requested.filter((stat, index) =>
    SECONDARY_STATS.includes(stat) && requested.indexOf(stat) === index
  );
  for (const stat of SECONDARY_STATS) {
    if (!valid.includes(stat)) valid.push(stat);
  }
  return valid;
}

export function buildStatAlignment(character, { context = 'mythic_plus' } = {}) {
  const profile = getStatProfile(character, context);
  const ratings = normaliseSecondaryStats(character?.secondary_stats || {});
  const current = sharesFor(ratings);

  if (!profile) {
    return {
      available: false,
      reason: 'No reference profile is available for this healer specialization.',
      context,
      ratings,
    };
  }

  if (current.total <= 0) {
    return {
      available: false,
      reason: 'Blizzard did not return usable secondary-stat ratings for this character.',
      context,
      profile,
      ratings,
    };
  }

  const priorityOrder = orderedStats(profile);
  const rows = priorityOrder.map((stat, priorityIndex) => {
    const currentShare = current.shares[stat];
    const targetShare = profile.shares[stat];
    const delta = currentShare - targetShare;
    return {
      stat,
      label: LABELS[stat],
      rating: ratings[stat],
      currentShare,
      targetShare,
      delta,
      status: rowStatus(delta),
      balanceStatus: balanceStatus(delta),
      direction: Math.abs(delta) <= 0.04 ? 'aligned' : delta < 0 ? 'low' : 'high',
      priorityIndex,
      priorityRank: priorityIndex + 1,
    };
  });

  const scored = alignmentScoreForRatings(ratings, profile);
  const distance = scored.distance;
  const score = scored.score;

  return {
    available: true,
    context: context === 'raid' ? 'raid' : 'mythic_plus',
    profile,
    ratings,
    totalRating: current.total,
    shares: current.shares,
    priorityOrder,
    rows,
    distance,
    score,
    status: overallStatus(score),
  };
}

export function itemStatFit(itemStats, alignment) {
  const ratings = normaliseSecondaryStats(itemStats || {});
  const item = sharesFor(ratings);

  if (!alignment?.available || item.total <= 0) {
    return {
      available: false,
      score: 0,
      multiplier: 1,
      label: 'No stat signal',
      status: 'neutral',
      shares: item.shares,
    };
  }

  const gaps = Object.fromEntries(
    SECONDARY_STATS.map((stat) => [stat, alignment.profile.shares[stat] - alignment.shares[stat]])
  );

  const order = Array.isArray(alignment.priorityOrder) && alignment.priorityOrder.length
    ? alignment.priorityOrder
    : SECONDARY_STATS;
  const priorityWeights = Object.fromEntries(
    order.map((stat, index) => [stat, Math.max(0.55, 1 - (index * 0.15))])
  );

  const weightedGaps = Object.fromEntries(
    SECONDARY_STATS.map((stat) => [stat, gaps[stat] * (priorityWeights[stat] || 0.55)])
  );
  const maxGap = Math.max(...SECONDARY_STATS.map((stat) => Math.abs(weightedGaps[stat])), 0.0001);
  const rawFit = SECONDARY_STATS.reduce(
    (sum, stat) => sum + (item.shares[stat] * weightedGaps[stat]),
    0
  );
  const score = Math.max(-100, Math.min(100, (rawFit / maxGap) * 100));
  const multiplier = 1 + (0.25 * (score / 100));

  let label = 'Neutral stat fit';
  let status = 'neutral';
  if (score >= 35) {
    label = 'Strong stat fit';
    status = 'good';
  } else if (score >= 10) {
    label = 'Helpful stat fit';
    status = 'good';
  } else if (score <= -35) {
    label = 'Poor stat fit';
    status = 'poor';
  } else if (score <= -10) {
    label = 'Weak stat fit';
    status = 'warning';
  }

  return {
    available: true,
    score,
    multiplier,
    label,
    status,
    shares: item.shares,
  };
}

export function replacementStatFit(candidateStats, currentItemStats, alignment) {
  const candidateRatings = normaliseSecondaryStats(candidateStats || {});
  const currentItemRatings = normaliseSecondaryStats(currentItemStats || {});
  const candidate = sharesFor(candidateRatings);
  const currentItem = sharesFor(currentItemRatings);
  const candidateFit = itemStatFit(candidateStats, alignment);

  if (!alignment?.available || candidate.total <= 0) {
    return {
      ...candidateFit,
      replacementAvailable: false,
      projectedAlignmentScore: alignment?.score ?? 0,
      alignmentGain: 0,
      candidateFitScore: candidateFit.score,
      label: candidateFit.label,
    };
  }

  // If the currently equipped item does not expose usable secondary ratings,
  // fall back to candidate-only fit. The item-level calculation still applies
  // independently in the gear planner.
  if (currentItem.total <= 0) {
    return {
      ...candidateFit,
      replacementAvailable: false,
      projectedAlignmentScore: alignment.score,
      alignmentGain: 0,
      candidateFitScore: candidateFit.score,
      label: candidateFit.label,
    };
  }

  // Compare composition at the current item's stat budget. This deliberately
  // isolates secondary-stat balance from item level, which is scored elsewhere.
  // It answers: if this slot kept the same total secondary budget but changed to
  // the candidate's stat distribution, would the whole character move closer to
  // the selected Raid/M+ target?
  const projectedRatings = {};
  for (const stat of SECONDARY_STATS) {
    const removed = currentItemRatings[stat];
    const replacement = candidate.shares[stat] * currentItem.total;
    projectedRatings[stat] = Math.max(0, alignment.ratings[stat] - removed + replacement);
  }

  const projected = alignmentScoreForRatings(projectedRatings, alignment.profile);
  const alignmentGain = projected.score - alignment.score;

  // +/-10 alignment-score points is enough to reach the existing +/-25% cap.
  // Smaller improvements scale proportionally; item level remains dominant.
  const modifierDelta = Math.max(-0.25, Math.min(0.25, alignmentGain / 40));
  const multiplier = 1 + modifierDelta;

  let label = 'Neutral replacement';
  let status = 'neutral';
  if (alignmentGain >= 4) {
    label = 'Excellent balance upgrade';
    status = 'good';
  } else if (alignmentGain >= 1) {
    label = 'Improves stat balance';
    status = 'good';
  } else if (alignmentGain <= -4) {
    label = 'Worsens stat balance';
    status = 'poor';
  } else if (alignmentGain <= -1) {
    label = 'Slightly worse balance';
    status = 'warning';
  }

  return {
    available: true,
    replacementAvailable: true,
    score: candidateFit.score,
    candidateFitScore: candidateFit.score,
    multiplier,
    label,
    status,
    shares: candidate.shares,
    currentItemShares: currentItem.shares,
    projectedShares: projected.shares,
    projectedRatings,
    projectedAlignmentScore: projected.score,
    alignmentGain,
  };
}

