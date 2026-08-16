// HealerLab suggested spell-priority and response-pattern data.
//
// This is intentionally NOT presented as a literal fixed rotation. Healer
// gameplay is conditional on incoming damage, talents, positioning, mana,
// cooldown availability and group composition. These are compact starting
// priorities for Midnight Patch 12.1, using the established Midnight PvE
// rotational model as the baseline and keeping talent-specific steps explicit.

const DATA_VERSION = '2026-08-16';

export const HEALER_PLAYBOOKS = Object.freeze({
  'Restoration Druid': Object.freeze({
    mythic_plus: Object.freeze({
      title: 'Predict damage, then layer HoTs before it lands.',
      priority: Object.freeze([
        ['Lifebloom', 'Maintain on the tank or the priority target that will take sustained damage.'],
        ['Efflorescence', 'Keep it under the group whenever several players can remain inside it.'],
        ['Rejuvenation', 'Pre-HoT players before predictable group damage and cover injured targets.'],
        ['Wild Growth', 'Use into multi-target damage after your preparation is in place.'],
        ['Swiftmend', 'Use for efficient emergency recovery and to enable build-specific follow-up effects.'],
        ['Regrowth', 'Use for focused spot healing, especially when an instant or efficiency proc is available.'],
      ]),
      rotation: Object.freeze([
        'Before damage: establish Lifebloom, Efflorescence and Rejuvenation coverage.',
        'As group damage starts: Wild Growth, then use Swiftmend or Regrowth where the health deficit is most dangerous.',
        'During stable periods: refresh efficient HoTs and contribute damage rather than overhealing.',
        'For lethal windows: commit Tranquility, Flourish, Convoke or your selected major-cooldown package early enough to matter.',
      ]),
      cooldowns: Object.freeze([
        'Use Ironbark proactively on predictable tank or targeted damage.',
        'Do not sit on major throughput cooldowns waiting for a perfect emergency; map them to known dungeon events.',
      ]),
    }),
    raid: Object.freeze({
      title: 'Build coverage early and convert preparation into raid-wide throughput.',
      priority: Object.freeze([
        ['Efflorescence', 'Maintain high uptime where the raid is stacked.'],
        ['Lifebloom', 'Maintain on a reliable target for sustained value and associated talent interactions.'],
        ['Rejuvenation', 'Apply before predictable raid damage rather than after the raid is already low.'],
        ['Wild Growth', 'Use when multiple players have meaningful deficits.'],
        ['Swiftmend', 'Use to stabilise priority targets and support your selected talent package.'],
        ['Regrowth', 'Use for targeted recovery when HoTs alone are too slow.'],
      ]),
      rotation: Object.freeze([
        'Pre-ramp with Efflorescence, Lifebloom and Rejuvenation before the damage event.',
        'Cast Wild Growth as the raid takes damage and layer your build-specific throughput effects.',
        'Spot-heal dangerous deficits with Swiftmend and Regrowth while HoTs continue ticking.',
        'Assign Tranquility and other major cooldowns to specific raid mechanics instead of using them reactively.',
      ]),
      cooldowns: Object.freeze([
        'Coordinate Tranquility with the healing plan so it is not duplicated by another raid cooldown.',
        'Use Ironbark on scripted tank spikes or targeted mechanics.',
      ]),
    }),
  }),

  'Holy Paladin': Object.freeze({
    mythic_plus: Object.freeze({
      title: 'Generate efficient Holy Power and spend it on the target that actually needs it.',
      priority: Object.freeze([
        ['Beacon', 'Keep your Beacon effect on the correct target; do not waste transfer healing.'],
        ['Holy Shock', 'Use aggressively for efficient healing and Holy Power generation.'],
        ['Word of Glory', 'Primary Holy Power spender for dangerous single-target deficits.'],
        ['Light of Dawn', 'Prefer when the group is stacked and multiple targets need real healing.'],
        ['Infusion-powered cast', 'Use Holy Light or Flash of Light when the proc and damage pattern make the cast efficient.'],
        ['Damage globals', 'Use Judgment, Crusader Strike or other build tools only when healing pressure allows.'],
      ]),
      rotation: Object.freeze([
        'Maintain Beacon and enter damage windows with Holy Shock available.',
        'Generate Holy Power efficiently, then choose Word of Glory or Light of Dawn based on target count.',
        'Use Infusion procs to bridge between Holy Power spenders without wasting mana.',
        'Use Avenging Wrath, Divine Toll or your selected throughput package before the group reaches critical health.',
      ]),
      cooldowns: Object.freeze([
        'Aura Mastery should answer a known group-wide mechanic.',
        'Blessing of Sacrifice is strongest when used proactively with your own defensive coverage.',
      ]),
    }),
    raid: Object.freeze({
      title: 'Keep efficient generators rolling and spend Holy Power into planned raid damage.',
      priority: Object.freeze([
        ['Beacon', 'Maintain the correct Beacon configuration for the encounter.'],
        ['Holy Shock', 'Keep it working for Holy Power, procs and efficient healing.'],
        ['Light of Dawn', 'Use as your main multi-target Holy Power spender when positioning supports it.'],
        ['Word of Glory', 'Use when one target needs substantially more healing than the raid.'],
        ['Infusion-powered cast', 'Convert procs into efficient filler healing rather than letting them expire.'],
        ['Utility', 'Use blessings and externals as part of the healing plan, not as afterthoughts.'],
      ]),
      rotation: Object.freeze([
        'Pre-position for Light of Dawn coverage and maintain Beacon.',
        'Generate Holy Power with Holy Shock and your build-specific generators.',
        'Spend Holy Power into the incoming raid event, then use Infusion procs as efficient filler.',
        'Layer Avenging Wrath and Aura Mastery onto assigned mechanics.',
      ]),
      cooldowns: Object.freeze([
        'Aura Mastery is a raid cooldown; assign it to mechanics with high raid-wide value.',
        'Do not overlap Avenging Wrath with another major healer cooldown unless the event warrants it.',
      ]),
    }),
  }),

  'Holy Priest': Object.freeze({
    mythic_plus: Object.freeze({
      title: 'Use Holy Words early enough that their cooldown reduction keeps working for you.',
      priority: Object.freeze([
        ['Prayer of Mending', 'Keep it cycling when repeated group damage will allow it to bounce.'],
        ['Holy Word: Serenity', 'Use for dangerous single-target deficits rather than hoarding charges.'],
        ['Holy Word: Sanctify', 'Use when several players are injured and can benefit from the ground-targeted heal.'],
        ['Flash Heal / Heal', 'Use the appropriate filler to reduce Holy Word cooldowns and stabilise priority targets.'],
        ['Circle of Healing', 'Use for efficient group recovery when enough targets are injured.'],
        ['Renew', 'Use selectively; Season 2 tier interactions can increase its value, but avoid blanketing without purpose.'],
      ]),
      rotation: Object.freeze([
        'Keep Prayer of Mending active before recurring damage.',
        'Use Serenity and Sanctify as the health deficits appear, then reduce their cooldowns with filler spells.',
        'Use Circle of Healing when it will hit enough injured players to justify the global.',
        'Commit Apotheosis, Divine Hymn or your selected major cooldown to planned high-pressure pulls.',
      ]),
      cooldowns: Object.freeze([
        'Guardian Spirit is strongest when it prevents a death, not when used after the danger has passed.',
        'Use Apotheosis proactively to create extra Holy Word throughput during sustained danger.',
      ]),
    }),
    raid: Object.freeze({
      title: 'Cycle Holy Words efficiently and let filler casts accelerate the next wave of throughput.',
      priority: Object.freeze([
        ['Prayer of Mending', 'Keep it bouncing through recurring raid damage.'],
        ['Holy Word: Sanctify', 'Primary raid Holy Word when multiple targets are injured.'],
        ['Holy Word: Serenity', 'Use for severe individual deficits.'],
        ['Circle of Healing', 'Use when it produces efficient multi-target healing.'],
        ['Heal / Flash Heal', 'Use filler casts to reduce Holy Word cooldowns and spot-heal.'],
        ['Renew', 'Apply when the encounter and your Season 2 set/talents make the periodic value worthwhile.'],
      ]),
      rotation: Object.freeze([
        'Pre-cast Prayer of Mending and enter the event with Holy Words available.',
        'Use Sanctify into raid-wide deficits and Serenity on critical individuals.',
        'Cast Heal or Flash Heal to recover targets while accelerating the next Holy Word.',
        'Use Divine Hymn, Apotheosis and Salvation according to the raid cooldown plan.',
      ]),
      cooldowns: Object.freeze([
        'Divine Hymn should be assigned to a mechanic where the raid can remain in range.',
        'Guardian Spirit can be planned as a tank/target external rather than saved exclusively for emergencies.',
      ]),
    }),
  }),

  'Discipline Priest': Object.freeze({
    mythic_plus: Object.freeze({
      title: 'Apply Atonement before danger, then convert damage globals into healing.',
      priority: Object.freeze([
        ['Power Word: Shield', 'Apply or refresh Atonement on priority targets and absorb predictable damage.'],
        ['Power Word: Radiance', 'Establish rapid group Atonement coverage before a group damage event.'],
        ['Purge the Wicked / Shadow Word: Pain', 'Maintain your damage-over-time effect when safe to do so.'],
        ['Penance', 'Use offensively for Atonement throughput unless direct healing is specifically required.'],
        ['Mind Blast', 'Use as a high-value damage/healing global when your build provides it.'],
        ['Smite', 'Use as filler when Atonements are active and no higher-priority healing action is required.'],
      ]),
      rotation: Object.freeze([
        'Before group damage: apply Atonement with Shield and/or Radiance.',
        'As damage lands: use your highest-value offensive spells, especially Penance and Mind Blast.',
        'Refresh Atonement before it expires if pressure will continue; do not spam damage into players with no Atonement.',
        'Use Barrier, Pain Suppression and Ultimate Penitence as mapped defensive/throughput answers.',
      ]),
      cooldowns: Object.freeze([
        'Power Word: Barrier is substantially better when the group can remain inside it.',
        'Pain Suppression should be used before the dangerous hit, not after the target is already dying.',
      ]),
    }),
    raid: Object.freeze({
      title: 'Disc raid healing is a ramp: prepare Atonement, then execute the damage sequence.',
      priority: Object.freeze([
        ['Atonement setup', 'Apply Atonement before the mechanic using Shield, Renew or your build-specific setup.'],
        ['Power Word: Radiance', 'Use to complete raid coverage immediately before the damage event.'],
        ['Penance', 'High-value offensive cast during the ramp.'],
        ['Mind Blast', 'Use as a major offensive healing global when available.'],
        ['Purge the Wicked / Shadow Word: Pain', 'Keep the DoT contributing during the ramp when practical.'],
        ['Smite', 'Fill remaining Atonement time with efficient damage.'],
      ]),
      rotation: Object.freeze([
        'Start the ramp early enough to place the required Atonements before the mechanic.',
        'Complete coverage with Radiance immediately before damage.',
        'Execute your offensive burst sequence as the mechanic lands.',
        'Use Barrier and other assigned raid cooldowns separately from personal ramp timing when required.',
      ]),
      cooldowns: Object.freeze([
        'The exact ramp changes with talents; treat this as a priority framework rather than a universal cast-by-cast script.',
        'Power Word: Barrier should be pre-assigned to stackable raid mechanics.',
      ]),
    }),
  }),

  'Restoration Shaman': Object.freeze({
    mythic_plus: Object.freeze({
      title: 'Keep Riptide and totem value rolling, then choose the correct direct heal for the damage shape.',
      priority: Object.freeze([
        ['Riptide', 'Maintain efficient instant healing and the buffs it provides to your kit.'],
        ['Healing Stream / Cloudburst Totem', 'Keep your selected healing totem working during meaningful damage.'],
        ['Healing Rain', 'Use when the group can stay stacked long enough to justify it.'],
        ['Chain Heal', 'Use when several nearby players have real deficits.'],
        ['Healing Surge', 'Use for urgent single-target recovery.'],
        ['Healing Wave', 'Use as the efficient slower filler when the target is safe enough to wait.'],
      ]),
      rotation: Object.freeze([
        'Pre-position your healing totem and maintain Riptide coverage.',
        'Use Healing Rain when the group will actually remain inside it.',
        'Choose Chain Heal for clustered multi-target damage or Surge/Wave for focused recovery.',
        'Use Spirit Link Totem, Ascendance and Healing Tide Totem on planned high-risk events.',
      ]),
      cooldowns: Object.freeze([
        'Spirit Link Totem can solve mechanics that raw HPS cannot; plan it around group positioning.',
        'Ascendance and Healing Tide are strongest when used before the pull becomes unrecoverable.',
      ]),
    }),
    raid: Object.freeze({
      title: 'Exploit stacked healing, efficient Riptides and planned totem windows.',
      priority: Object.freeze([
        ['Riptide', 'Maintain efficient coverage and supporting buffs.'],
        ['Healing Rain', 'Keep strong uptime when the raid is stacked.'],
        ['Healing Stream / Cloudburst Totem', 'Align your selected totem with incoming raid damage.'],
        ['Chain Heal', 'Use when injured targets are sufficiently clustered.'],
        ['Healing Wave', 'Efficient spot-healing filler.'],
        ['Healing Surge', 'Emergency recovery when speed matters more than mana.'],
      ]),
      rotation: Object.freeze([
        'Prepare Riptides, Healing Rain and your healing totem before the damage event.',
        'Use Chain Heal into clustered deficits while maintaining efficient coverage.',
        'Spot-heal with Wave or Surge depending on urgency.',
        'Use Spirit Link, Ascendance and Healing Tide according to the raid cooldown assignment.',
      ]),
      cooldowns: Object.freeze([
        'Spirit Link requires correct placement and should be assigned to a mechanic the raid can stack for.',
        'Track Cloudburst release timing if talented; dumping it after the damage window wastes its value.',
      ]),
    }),
  }),

  'Mistweaver Monk': Object.freeze({
    mythic_plus: Object.freeze({
      title: 'Keep your maintenance healing active and convert mobility into fast recovery.',
      priority: Object.freeze([
        ['Renewing Mist', 'Keep charges cycling so Vivify can cleave effectively.'],
        ['Enveloping Mist', 'Use on tanks or priority targets taking sustained damage.'],
        ['Vivify', 'Use when its cleave will heal multiple injured Renewing Mist targets.'],
        ['Rising Sun Kick', 'Use when safe and when your selected build rewards melee healing.'],
        ["Sheilun's Gift", 'Use accumulated value for planned burst recovery rather than wasting charges.'],
        ['Soothing Mist', 'Use as the setup channel for caster-style targeted healing when movement permits.'],
      ]),
      rotation: Object.freeze([
        'Keep Renewing Mist rolling before damage begins.',
        'Use Enveloping Mist on sustained priority damage and Vivify when cleave value is high.',
        'In melee-oriented builds, weave Rising Sun Kick and other damage globals when safe.',
        "Use Sheilun's Gift, Revival/Restoral and your Celestial for planned spikes.",
      ]),
      cooldowns: Object.freeze([
        'Life Cocoon is a proactive external; use it before the target takes the full spike.',
        'Revival/Restoral should answer a specific group event, especially where the dispel component matters.',
      ]),
    }),
    raid: Object.freeze({
      title: 'Maintain Renewing Mist coverage and convert it into efficient Vivify cleave.',
      priority: Object.freeze([
        ['Renewing Mist', 'Maximise useful coverage across the raid.'],
        ['Vivify', 'Cast when enough Renewing Mist targets are injured for strong cleave value.'],
        ['Enveloping Mist', 'Use on priority targets that need sustained focused healing.'],
        ['Rising Sun Kick', 'Use when the build and encounter support melee uptime.'],
        ["Sheilun's Gift", 'Spend stored value into meaningful raid damage.'],
        ['Soothing Mist', 'Use selectively for focused caster-style healing.'],
      ]),
      rotation: Object.freeze([
        'Enter the damage event with Renewing Mist coverage already established.',
        'Use Vivify to exploit that coverage and Enveloping Mist on priority targets.',
        'Use melee healing globals only when positioning is safe and the build rewards them.',
        'Assign Revival/Restoral and Celestial cooldowns to major raid mechanics.',
      ]),
      cooldowns: Object.freeze([
        'Revival/Restoral is both throughput and, in some encounters, valuable dispel utility.',
        'Plan Celestial usage around sustained damage rather than single isolated hits.',
      ]),
    }),
  }),

  'Preservation Evoker': Object.freeze({
    mythic_plus: Object.freeze({
      title: 'Prepare Echo/Reversion coverage, then use empowered spells into the actual damage window.',
      priority: Object.freeze([
        ['Reversion', 'Maintain efficient periodic healing on targets likely to keep taking damage.'],
        ['Echo', 'Place Echo before important healing casts when duplication will produce real value.'],
        ['Dream Breath', 'Use an empower level that matches how quickly the healing is needed.'],
        ['Spiritbloom', 'Use for strong targeted multi-player recovery.'],
        ['Verdant Embrace', 'Use for efficient healing and Lifebind interactions when positioning is safe.'],
        ['Living Flame', 'Use as filler healing/damage when stronger tools are not required.'],
      ]),
      rotation: Object.freeze([
        'Before predictable damage: establish Reversion and/or Echo on priority players.',
        'Use Dream Breath and Spiritbloom as the damage arrives, choosing empower rank intentionally.',
        'Use Verdant Embrace to support Lifebind-style windows when your build and positioning allow it.',
        'Use Stasis, Rewind, Time Dilation and Dream Flight as planned answers to dangerous events.',
      ]),
      cooldowns: Object.freeze([
        'Stasis is strongest when preloaded with spells selected for the next damage event.',
        'Evoker range is a real constraint; positioning errors can invalidate an otherwise correct rotation.',
      ]),
    }),
    raid: Object.freeze({
      title: 'Use Echo and empowered spells to turn preparation into large, controlled healing events.',
      priority: Object.freeze([
        ['Reversion', 'Maintain on appropriate targets for efficient sustained healing.'],
        ['Echo', 'Set up duplicated healing before major events.'],
        ['Dream Breath', 'Choose empower rank based on whether the raid needs immediate or extended healing.'],
        ['Spiritbloom', 'Use for concentrated multi-target recovery.'],
        ['Verdant Embrace', 'Use for Lifebind setup and priority healing when movement is safe.'],
        ['Living Flame', 'Use as filler when no higher-value healing action is required.'],
      ]),
      rotation: Object.freeze([
        'Pre-place Echo/Reversion before the mechanic.',
        'Deliver Dream Breath and Spiritbloom into the incoming raid damage.',
        'Use Verdant Embrace and Lifebind interactions according to the selected build.',
        'Assign Rewind, Stasis and Dream Flight to specific raid events.',
      ]),
      cooldowns: Object.freeze([
        'Rewind gains value after substantial recent damage; do not fire it before the health loss exists.',
        'Stasis should be deliberately loaded, not treated as a generic panic button.',
      ]),
    }),
  }),
});

function fullSpecName(character) {
  const className = String(character?.class || '').trim();
  const specName = String(character?.active_spec_name || '').trim();
  if (!className || !specName) return '';

  if (className === 'Priest') return `${specName} Priest`;
  if (className === 'Druid') return `${specName} Druid`;
  if (className === 'Shaman') return `${specName} Shaman`;
  if (className === 'Paladin') return `${specName} Paladin`;
  if (className === 'Monk') return `${specName} Monk`;
  if (className === 'Evoker') return `${specName} Evoker`;
  return `${specName} ${className}`.trim();
}

export function getHealerPlaybook(character, context = 'mythic_plus') {
  const spec = fullSpecName(character);
  const book = HEALER_PLAYBOOKS[spec];
  if (!book) return null;

  const mode = context === 'raid' ? 'raid' : 'mythic_plus';
  return {
    spec,
    context: mode,
    contextLabel: mode === 'raid' ? 'Raid' : 'Mythic+',
    patch: '12.1',
    dataVersion: DATA_VERSION,
    ...book[mode],
  };
}