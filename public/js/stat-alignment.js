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

function overallStatus(score) {
  if (score >= 92) return 'good';
  if (score >= 84) return 'warning';
  return 'poor';
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

  const rows = SECONDARY_STATS.map((stat) => {
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
      direction: Math.abs(delta) <= 0.04 ? 'aligned' : delta < 0 ? 'low' : 'high',
    };
  });

  const distance = 0.5 * rows.reduce((sum, row) => sum + Math.abs(row.delta), 0);
  const score = Math.max(0, Math.min(100, (1 - distance) * 100));

  return {
    available: true,
    context: context === 'raid' ? 'raid' : 'mythic_plus',
    profile,
    ratings,
    totalRating: current.total,
    shares: current.shares,
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
  const maxGap = Math.max(...SECONDARY_STATS.map((stat) => Math.abs(gaps[stat])), 0.0001);
  const rawFit = SECONDARY_STATS.reduce(
    (sum, stat) => sum + (item.shares[stat] * gaps[stat]),
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
