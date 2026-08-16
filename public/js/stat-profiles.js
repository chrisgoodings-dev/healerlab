export const STAT_PROFILE_VERSION = '2026-08-16';
export const SECONDARY_STATS = Object.freeze(['crit', 'haste', 'mastery', 'versatility']);

function profile({ ratings, context, sample, sourceUrl }) {
  const normalizedRatings = {
    crit: Number(ratings.crit) || 0,
    haste: Number(ratings.haste) || 0,
    mastery: Number(ratings.mastery) || 0,
    versatility: Number(ratings.versatility) || 0,
  };
  const total = SECONDARY_STATS.reduce((sum, stat) => sum + normalizedRatings[stat], 0);
  const shares = Object.fromEntries(
    SECONDARY_STATS.map((stat) => [stat, total > 0 ? normalizedRatings[stat] / total : 0])
  );

  return Object.freeze({
    ratings: Object.freeze(normalizedRatings),
    shares: Object.freeze(shares),
    context,
    sample,
    source: 'Archon observed gear distribution',
    sourceUrl,
    snapshot: STAT_PROFILE_VERSION,
  });
}

const PROFILES = Object.freeze({
  'Druid:Restoration': Object.freeze({
    mythic_plus: profile({
      ratings: { crit: 265, haste: 1035, mastery: 864, versatility: 224 },
      context: 'Mythic+',
      sample: 'Midnight Season 1, all keys +7 to +24, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/restoration/druid/mythic-plus/overview/10/all-dungeons/this-week',
    }),
    raid: profile({
      ratings: { crit: 183, haste: 1270, mastery: 1148, versatility: 128 },
      context: 'Raid',
      sample: 'Midnight 12.0.7, Mythic all bosses, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/restoration/druid/raid/overview/mythic/all-bosses',
    }),
  }),
  'Evoker:Preservation': Object.freeze({
    mythic_plus: profile({
      ratings: { crit: 633, haste: 688, mastery: 708, versatility: 180 },
      context: 'Mythic+',
      sample: 'Midnight Season 1, all keys +7 to +24, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/preservation/evoker/mythic-plus/overview/10/all-dungeons/this-week',
    }),
    raid: profile({
      ratings: { crit: 770, haste: 542, mastery: 1330, versatility: 94 },
      context: 'Raid',
      sample: 'Midnight 12.0.7, Mythic all bosses, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/preservation/evoker/raid/overview/mythic/all-bosses',
    }),
  }),
  'Monk:Mistweaver': Object.freeze({
    mythic_plus: profile({
      ratings: { crit: 800, haste: 1101, mastery: 220, versatility: 345 },
      context: 'Mythic+',
      sample: 'Midnight Season 1, all keys +7 to +24, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/mistweaver/monk/mythic-plus/overview/10/all-dungeons/this-week',
    }),
    raid: profile({
      ratings: { crit: 930, haste: 1273, mastery: 245, versatility: 171 },
      context: 'Raid',
      sample: 'Midnight 12.0.7, Mythic all bosses, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/mistweaver/monk/raid/overview/mythic/all-bosses',
    }),
  }),
  'Paladin:Holy': Object.freeze({
    mythic_plus: profile({
      ratings: { crit: 460, haste: 854, mastery: 820, versatility: 204 },
      context: 'Mythic+',
      sample: 'Midnight Season 1, all keys +7 to +24, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/holy/paladin/mythic-plus/overview/10/all-dungeons/this-week',
    }),
    raid: profile({
      ratings: { crit: 429, haste: 875, mastery: 1280, versatility: 100 },
      context: 'Raid',
      sample: 'Midnight 12.0.7, Mythic all bosses, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/holy/paladin/raid/overview/mythic/all-bosses',
    }),
  }),
  'Priest:Discipline': Object.freeze({
    mythic_plus: profile({
      ratings: { crit: 631, haste: 963, mastery: 614, versatility: 166 },
      context: 'Mythic+',
      sample: 'Midnight Season 1, all keys +7 to +24, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/discipline/priest/mythic-plus/overview/10/all-dungeons/this-week',
    }),
    raid: profile({
      ratings: { crit: 719, haste: 1108, mastery: 735, versatility: 87 },
      context: 'Raid',
      sample: 'Midnight 12.0.7, Mythic all bosses, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/discipline/priest/raid/overview/mythic/all-bosses',
    }),
  }),
  'Priest:Holy': Object.freeze({
    mythic_plus: profile({
      ratings: { crit: 774, haste: 730, mastery: 507, versatility: 272 },
      context: 'Mythic+',
      sample: 'Midnight Season 1, all keys +7 to +24, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/holy/priest/mythic-plus/overview/10/all-dungeons/this-week',
    }),
    raid: profile({
      ratings: { crit: 1049, haste: 538, mastery: 835, versatility: 167 },
      context: 'Raid',
      sample: 'Midnight 12.0.7, Mythic all bosses, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/holy/priest/raid/overview/mythic/all-bosses',
    }),
  }),
  'Shaman:Restoration': Object.freeze({
    mythic_plus: profile({
      ratings: { crit: 942, haste: 530, mastery: 419, versatility: 435 },
      context: 'Mythic+',
      sample: 'Midnight Season 1, all keys +7 to +24, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/restoration/shaman/mythic-plus/overview/10/all-dungeons/this-week',
    }),
    raid: profile({
      ratings: { crit: 1152, haste: 439, mastery: 530, versatility: 392 },
      context: 'Raid',
      sample: 'Midnight 12.0.7, Mythic all bosses, last 14 days',
      sourceUrl: 'https://www.archon.gg/wow/builds/restoration/shaman/raid/overview/mythic/all-bosses',
    }),
  }),
});

// Suggested secondary-stat priority order is intentionally separate from the
// observed target distribution. This lets HealerLab show a practical gearing
// order without pretending the population average is a marginal stat weight.
const PRIORITY_ORDERS = Object.freeze({
  'Druid:Restoration': Object.freeze({
    raid: Object.freeze(['haste', 'mastery', 'versatility', 'crit']),
    mythic_plus: Object.freeze(['mastery', 'haste', 'versatility', 'crit']),
  }),
  'Evoker:Preservation': Object.freeze({
    raid: Object.freeze(['mastery', 'crit', 'haste', 'versatility']),
    mythic_plus: Object.freeze(['mastery', 'haste', 'crit', 'versatility']),
  }),
  'Monk:Mistweaver': Object.freeze({
    raid: Object.freeze(['haste', 'crit', 'versatility', 'mastery']),
    mythic_plus: Object.freeze(['haste', 'crit', 'versatility', 'mastery']),
  }),
  'Paladin:Holy': Object.freeze({
    raid: Object.freeze(['mastery', 'haste', 'crit', 'versatility']),
    mythic_plus: Object.freeze(['mastery', 'haste', 'crit', 'versatility']),
  }),
  'Priest:Discipline': Object.freeze({
    raid: Object.freeze(['haste', 'crit', 'mastery', 'versatility']),
    mythic_plus: Object.freeze(['haste', 'crit', 'versatility', 'mastery']),
  }),
  'Priest:Holy': Object.freeze({
    raid: Object.freeze(['crit', 'mastery', 'versatility', 'haste']),
    mythic_plus: Object.freeze(['versatility', 'crit', 'haste', 'mastery']),
  }),
  'Shaman:Restoration': Object.freeze({
    raid: Object.freeze(['crit', 'versatility', 'haste', 'mastery']),
    mythic_plus: Object.freeze(['crit', 'haste', 'versatility', 'mastery']),
  }),
});

export function statProfileKey(character) {
  const className = String(character?.class || '').trim();
  const specName = String(character?.active_spec_name || '').trim();
  return `${className}:${specName}`;
}

export function getStatProfile(character, context = 'mythic_plus') {
  const key = statProfileKey(character);
  const profiles = PROFILES[key];
  if (!profiles) return null;

  const mode = context === 'raid' ? 'raid' : 'mythic_plus';
  const selected = profiles[mode] || null;
  if (!selected) return null;

  return {
    ...selected,
    priorityOrder: PRIORITY_ORDERS[key]?.[mode] || SECONDARY_STATS,
    prioritySource: 'Midnight healer guide priority',
  };
}

export function supportedStatProfiles() {
  return Object.keys(PROFILES);
}
