// Healer-focused Midnight Season 2 encounter summaries.
//
// Source basis: the eight dungeon cheat-sheet images supplied by the user for
// this feature. The text below intentionally summarises the important mechanics
// instead of reproducing the original cheat sheets verbatim. Damage numbers and
// exact timers are omitted because they can vary by difficulty and tuning.

const SOURCE_NOTE = 'Summarised from the supplied Jamosabi Midnight Season 2 cheat-sheet images. Use as a concise healer reminder, not as a replacement for the in-game encounter journal or a full route guide.';

const GUIDES = Object.freeze({
  'altaroffangs': Object.freeze({
    name: 'Altar of Fangs',
    shortName: 'AOF',
    healerSummary: 'Frequent multi-target DoTs, a five-player poison dispel check, repeated shield-phase AoE and several tank-buster moments. The dangerous overlaps are more important than raw filler healing.',
    noteworthy: Object.freeze([
      'Ravi repeatedly applies a three-target DoT and adds raid-wide pressure while feeding behind his shield.',
      'Writhing Coil is the major dispel encounter: Synchronized Venom is a five-player poison and Death Rattle continues until the Uncoil tether is broken.',
      "Zul'jan applies a long Ritual Venom DoT through the green-laser soak mechanic; the debuff must be cleared through the encounter mechanic before it expires.",
    ]),
    bosses: Object.freeze([
      Object.freeze({
        name: 'Ravi',
        check: 'Multi-target DoT + shield AoE',
        severity: 'high',
        healing: 'Keep three marked players stable through Triple Shot. Expect extra group damage while Ravi is feeding behind his shield, then recover cleanly before the next DoT cycle.',
        mechanics: Object.freeze([
          ['HEAL', 'Triple Shot', 'Repeated three-target damage-over-time effect.'],
          ['AOE', 'Carrion Burst', 'Group damage pulses while Ravi gains his feeding shield.'],
          ['SOAK', 'Messy Eater', 'Soak the green puddles/chunks created by the mechanic.'],
          ['DODGE', 'Regurgitate', 'Avoid the frontal waves rather than healing avoidable damage.'],
        ]),
      }),
      Object.freeze({
        name: 'Writhing Coil',
        check: 'Poison dispel + sustained group damage',
        severity: 'critical',
        healing: 'Treat Synchronized Venom as the priority event. Dispel the five-player poison quickly, keep the tethered player alive while they run away, and cover Death Rattle if the rope takes time to break.',
        mechanics: Object.freeze([
          ['DISPEL', 'Synchronized Venom', 'Five-player poison with a very large DoT.'],
          ['MOVE', 'Uncoil', 'The tethered player runs away to break the rope.'],
          ['AOE', 'Death Rattle', 'Persistent group damage until the Uncoil rope is broken.'],
          ['INTERRUPT', 'Toxic Atrophy', 'Interrupt the cast before the stacking damage/movement reduction lands.'],
          ['TANK', 'Tail Scythe', 'Heavy tank hit.'],
        ]),
      }),
      Object.freeze({
        name: "Zul'jan",
        check: 'Soak mechanic + long DoT',
        severity: 'high',
        healing: 'Pre-heal the players handling Ritual of the Fang. The green-laser soak applies Ritual Venom, so watch the affected player until they clear it with the encounter mechanic. Keep a response ready for Chop Down on the tank.',
        mechanics: Object.freeze([
          ['SOAK', 'Ritual of the Fang', 'Intercept the green lasers; doing so applies Ritual Venom.'],
          ['HEAL', 'Ritual Venom', 'Long-duration DoT created by the laser soak.'],
          ['POSITION', 'Boneslicer', 'Red-line mechanic used as part of clearing the laser debuff; avoid unnecessary hits.'],
          ['DODGE', 'Axegrinder', 'Bouncing axes must be avoided.'],
          ['TANK', 'Chop Down', 'Tank-buster sequence.'],
        ]),
      }),
    ]),
  }),

  'voidscararena': Object.freeze({
    name: 'Voidscar Arena',
    shortName: 'VSA',
    healerSummary: 'Movement-heavy encounters with long DoTs and pulsing AoE. The main healer failures come from overlapping unavoidable damage with puddles, clone movement or add pressure.',
    noteworthy: Object.freeze([
      "Taz'Rah combines a 15-second player DoT with clone dashes and star-pattern projectile bursts.",
      'Atroxus is an add-control healing check: the Creeper add continuously pulses AoE and should be killed quickly.',
      'Charonus is most dangerous when Cosmic Crash is active while Unstable Singularity/orb pressure is still happening.',
    ]),
    bosses: Object.freeze([
      Object.freeze({
        name: "Taz'Rah",
        check: 'Long DoTs + movement burst',
        severity: 'high',
        healing: 'Track Nether Dash targets for the full DoT duration. Keep healing mobile because clones create puddles when they spawn/move and Dark Bloom forces additional dodging.',
        mechanics: Object.freeze([
          ['HEAL', 'Nether Dash', 'Clone dash applies a long DoT to players.'],
          ['ADDS', 'Ethereal Shades', 'Clones spawn and then dash toward players.'],
          ['POSITION', 'Void Fissure', 'Clone movement creates persistent puddles.'],
          ['DODGE', 'Dark Bloom', 'Burst AoE followed by balls radiating from the puddles in a star pattern.'],
        ]),
      }),
      Object.freeze({
        name: 'Atroxus',
        check: 'Add pulse AoE + tank DoT',
        severity: 'critical',
        healing: 'The Creeper add is the primary danger. Use throughput cooldowns if it lives through multiple pulses, and keep the tank covered for Hulking Claw while the group handles puddles and the frontal.',
        mechanics: Object.freeze([
          ['ADDS', 'Toxic Creeper', 'Priority add continuously pulses group-wide damage.'],
          ['AOE', 'Poison Splash', 'Small group AoE that also creates puddles.'],
          ['DODGE', 'Noxious Breath', 'Frontal cone.'],
          ['TANK', 'Hulking Claw', 'Tank buster followed by a DoT.'],
        ]),
      }),
      Object.freeze({
        name: 'Charonus',
        check: 'Rot overlap + long DoT',
        severity: 'critical',
        healing: 'Cosmic Crash is the key individual healing assignment. The worst overlap is a Crash DoT while Unstable Singularity is still pulsing, so reserve fast spot healing or a defensive for that combination.',
        mechanics: Object.freeze([
          ['AOE', 'Unstable Singularity', 'Black puddles pulse group damage and pull nearby players.'],
          ['HEAL', 'Cosmic Crash', 'Very long single-player DoT with a launch/knock effect.'],
          ['MECHANIC', 'Gravitic Orbs', 'Fixated players bring the orbs into the singularities to remove them.'],
          ['DODGE', 'Void Cascade', 'Non-tank frontal.'],
          ['DODGE', 'Dark Waves', 'Avoid the incoming waves.'],
        ]),
      }),
    ]),
  }),

  'templeofsethraliss': Object.freeze({
    name: 'Temple of Sethraliss',
    shortName: 'TOS',
    healerSummary: 'The early bosses are comparatively light, but Merektha, Galvazzt and the Avatar create distinct healer checks: sustained rot, two-target beam soaking and a direct heal-the-boss phase.',
    noteworthy: Object.freeze([
      'Adderis and Aspix are low overall damage compared with the rest of the dungeon; conserve major cooldowns when the group executes the soaks correctly.',
      'Merektha is the best place for a healing cooldown: Serpentstorm and the Burrow intermission both create sustained group damage.',
      'The Avatar of Sethraliss is a direct single-target healing encounter: once the add phase is cleared, heal the boss to full to win the phase.',
    ]),
    bosses: Object.freeze([
      Object.freeze({
        name: 'Adderis and Aspix',
        check: 'Low damage + targeted debuff',
        severity: 'medium',
        healing: 'Heal the Gust target and the group soak, but avoid spending large cooldowns unless execution breaks down. Overload is the tank spike to watch.',
        mechanics: Object.freeze([
          ['MECHANIC', 'Stormblessed', 'One boss is effectively immune at a time and the effect swaps.'],
          ['SOAK', 'Thunder and Lightning', 'Group soak.'],
          ['HEAL', 'Gust', 'Targeted damage/debuff that needs focused healing.'],
          ['POSITION', 'Gale Force / Tempest Winds', 'Avoid lines and correctly place the puddles.'],
          ['TANK', 'Overload', 'Tank-buster event.'],
        ]),
      }),
      Object.freeze({
        name: 'Merektha',
        check: 'Group rot + intermission',
        severity: 'critical',
        healing: 'Use a healing cooldown for Serpentstorm or immediately after the knock into the Burrow intermission. Both create sustained group-wide damage while movement is constrained.',
        mechanics: Object.freeze([
          ['HEAL', 'Serpentstorm', 'Knockback followed by an extended DoT on the group.'],
          ['AOE', 'Burrowquake', 'Intermission with continuous ticking group damage.'],
          ['CC', 'A Knot of Snakes', 'A player is trapped; control/kill the snake to release them.'],
        ]),
      }),
      Object.freeze({
        name: 'Galvazzt',
        check: 'Two-target healing check',
        severity: 'high',
        healing: 'Keep the active beam soakers healthy while also stabilising tank damage. The encounter is less about raid-wide throughput and more about keeping the small number of exposed targets safely above the next hit.',
        mechanics: Object.freeze([
          ['SOAK', 'Galvanized / Spire Beam', 'Players intercept the pylon beams.'],
          ['HEAL', 'Beam soakers', 'The active soakers are the primary healing targets.'],
          ['TANK', 'Induction', 'Boss slams the tank and creates an induction field/puddle.'],
        ]),
      }),
      Object.freeze({
        name: 'Avatar of Sethraliss',
        check: 'Single-target heal-the-boss phase',
        severity: 'critical',
        healing: 'During the healing phase, dump efficient single-target throughput into the Avatar. The boss reaches victory at full health. Protect your own casts because Hexate specifically targets the healer.',
        mechanics: Object.freeze([
          ['HEAL', 'Heal the Avatar', 'The encounter is won by restoring the Avatar to full health during the healing phase.'],
          ['ADDS', 'Corrupted Guardian / Essence Defiler', 'Kill the required adds to begin the boss-healing phase.'],
          ['HEALER', 'Hexate', 'Targets the healer and reduces healing output.'],
          ['DISPEL', 'Latent Hex', 'Random-player hex that creates a puddle when it expires.'],
        ]),
      }),
    ]),
  }),

  'rubylifepools': Object.freeze({
    name: 'Ruby Life Pools',
    shortName: 'RLP',
    healerSummary: 'Three different healer checks: Melidrussa has scheduled add-wave throughput, Kokia punishes slow add kills with pulsing AoE, and Kyrakka combines multi-target DoTs with a dangerous tank dispel/debuff.',
    noteworthy: Object.freeze([
      'Melidrussa is a planned cooldown fight: add waves occur around 75% and 45%, and Frost Overload creates the largest healing demand.',
      'Kokia becomes dramatically harder if the Blazebound add survives and keeps pulsing Inferno.',
      'Kyrakka becomes most dangerous once the dragon is active; use personals during the overlap and manage the tank debuff deliberately.',
    ]),
    bosses: Object.freeze([
      Object.freeze({
        name: 'Melidrussa Chillworn',
        check: 'Scheduled add-wave throughput',
        severity: 'critical',
        healing: 'Plan healing cooldowns around the Infused Whelp waves and Frost Overload. Chillstorm adds a DoT plus forced movement, so prioritise instant/mobile healing while the group is displaced.',
        mechanics: Object.freeze([
          ['HEAL', 'Frost Overload', 'Large repeated frost damage while the Ice Bulwark is active.'],
          ['ADDS', 'Awaken Whelps', 'Add waves around 75% and 45%; these are the main planned healing windows.'],
          ['HEAL', 'Chillstorm', 'Push/pull pressure plus a DoT on the targeted player.'],
          ['DODGE', 'Hailburst', 'Avoid the ice-cube impacts; they also apply a haste-reducing debuff.'],
        ]),
      }),
      Object.freeze({
        name: 'Kokia Blazehoof',
        check: 'Priority-add AoE + tank pressure',
        severity: 'high',
        healing: 'The summoned add is the danger. If Inferno is allowed to pulse repeatedly, group damage rises sharply. Keep the tank stable through Searing Blows while the group focuses the add.',
        mechanics: Object.freeze([
          ['ADDS', 'Ritual of Blazebinding', 'Summons the Blazebound Firestorm add.'],
          ['AOE', 'Inferno', 'The add repeatedly pulses heavy group damage.'],
          ['INTERRUPT', 'Blaze Volley', 'Interrupt the add cast.'],
          ['TANK', 'Searing Blows', 'Repeated tank hits that apply a stacking wound.'],
          ['DODGE', 'Molten Boulder', 'Bait and avoid the rolling boulder.'],
        ]),
      }),
      Object.freeze({
        name: 'Kyrakka and Erkhart Stormvein',
        check: 'Multi-target DoTs + tank dispel',
        severity: 'critical',
        healing: 'Track the Inferno Spit targets and leave room for their expiry puddles. The second half is much more dangerous when Kyrakka is active; use personals and handle the Stormslam debuff on the tank deliberately.',
        mechanics: Object.freeze([
          ['HEAL', 'Inferno Spit', 'Two-target DoT that leaves a puddle when it expires.'],
          ['HEAL', 'Winds of Change', 'Pushback plus ticking damage.'],
          ['AOE', 'Interrupting Cloudburst', 'Small unavoidable group AoE.'],
          ['DISPEL', 'Stormslam', 'Heavy tank hit with a dangerous nature-damage-taken debuff.'],
        ]),
      }),
    ]),
  }),

  'murderrow': Object.freeze({
    name: 'Murder Row',
    shortName: 'MR',
    healerSummary: 'A dungeon of planned group-damage windows. The largest checks are Kystia and Nibbles phase two, the barrel/Killing Spree overlaps, the axe add pulsing on the third boss and the final add/wave sequence.',
    noteworthy: Object.freeze([
      'Kystia and Nibbles phase two is explicitly the big healing phase; use cooldowns there.',
      'Zaen Gangplank has repeatable AoE from Killing Spree and from active green barrels.',
      'The axe boss is fundamentally a tank check while the spawned axe pulses group damage until killed.',
    ]),
    bosses: Object.freeze([
      Object.freeze({
        name: 'Kystia and Nibbles',
        check: 'Phase-two burst healing',
        severity: 'critical',
        healing: 'Phase one is mostly control and positioning. Save your major throughput for phase two: Chaotic Burst creates the big healing window while Felstorm/add pressure can overlap.',
        mechanics: Object.freeze([
          ['HEAL', 'Chaos Barrage', 'Phase-one rot damage.'],
          ['ADDS', 'Mirror Images / Felstorm', 'Adds spawn and contribute AoE pressure.'],
          ['AOE', 'Chaotic Burst', 'Major phase-two group-damage window; use healing cooldowns here.'],
          ['DODGE', 'Fel Spray', 'Frontal cone.'],
        ]),
      }),
      Object.freeze({
        name: 'Zaen Gangplank',
        check: 'Periodic AoE + barrel pressure',
        severity: 'high',
        healing: 'Green barrels pulse damage while active, and Killing Spree creates a repeatable group AoE check. Keep the group healthy enough to survive the red-line/barrel execution mechanic.',
        mechanics: Object.freeze([
          ['AOE', 'Killing Spree', 'Short group AoE roughly every 45 seconds.'],
          ['AOE', 'Fel-Infused Freight', 'Green barrels pulse group damage while they remain active.'],
          ['MECHANIC', 'Fire Bomb', 'Use the orange circle to destroy the correct green barrel.'],
          ['POSITION', 'Murder in a Row', 'Hide behind the remaining barrels to avoid the red line.'],
        ]),
      }),
      Object.freeze({
        name: 'Xathux the Annihilator',
        check: 'Tank check + pulsing axe',
        severity: 'high',
        healing: 'Keep the tank high for Legion Strike while the group kills the thrown axe quickly. The axe continuously pulses Fel Lightning until destroyed, so a slow kill converts directly into healer pressure.',
        mechanics: Object.freeze([
          ['ADDS', 'Axe Toss / Fel Lightning', 'The spawned axe pulses AoE until DPS kill it.'],
          ['TANK', 'Legion Strike', 'Large tank-buster hit.'],
          ['AOE', 'Demonic Rage', 'Small group AoE.'],
          ['SPREAD', 'Infernal Crush', 'Spread the green circles and avoid stacking extra damage.'],
        ]),
      }),
      Object.freeze({
        name: 'Lithiel Cinderfury',
        check: 'Add control + persistent ticking damage',
        severity: 'high',
        healing: 'Kill the summoned imps before Malefic Wave and use the Demonic Gateway to avoid the wave. Searing Fel Flame creates persistent ticking damage, so do not let avoidable add casts compound it.',
        mechanics: Object.freeze([
          ['ADDS', "Fingers of Gul'dan", 'Summons Wild Imps that should die before the major wave.'],
          ['INTERRUPT', 'Felfire Burst', 'Interrupt/stop the add cast when possible.'],
          ['DODGE', 'Malefic Wave', 'Use the Demonic Gateway to avoid the wave.'],
          ['HEAL', 'Searing Fel Flame', 'Persistent ticking group damage.'],
        ]),
      }),
    ]),
  }),

  'kingsrest': Object.freeze({
    name: "King's Rest",
    shortName: 'KR',
    healerSummary: 'Targeted-healing dungeon with repeated two-player DoTs, single-target rescue checks and a final boss that layers raid-style rot with heavy tank damage.',
    noteworthy: Object.freeze([
      'Golden Serpent deliberately chains a two-target DoT into an AoE burst, so stabilise the DoT targets before the burst lands.',
      'Mchimba is a single-target healing check: Drain Fluids targets need immediate attention and entombed players must be released.',
      'King Dazar is the largest throughput fight, especially once Tzala joins and Gilded Destruction creates sustained rot while the group is moving.',
    ]),
    bosses: Object.freeze([
      Object.freeze({
        name: 'The Golden Serpent',
        check: 'Two-target DoT into AoE burst',
        severity: 'high',
        healing: 'Spit Gold targets two players and is followed closely by Serpentine Gust. Heal the DoT targets aggressively enough that the subsequent group burst cannot finish them.',
        mechanics: Object.freeze([
          ['HEAL', 'Spit Gold', 'Two-target DoT that also drops puddles.'],
          ['AOE', 'Serpentine Gust', 'Group burst that follows the DoT sequence.'],
          ['ADDS', "Lucre's Call", 'Re-summons the Animated Gold adds.'],
        ]),
      }),
      Object.freeze({
        name: 'Mchimba the Embalmer',
        check: 'Single-target rescue healing',
        severity: 'critical',
        healing: 'Drain Fluids is the main single-target emergency. Heal its victim hard and quickly. Entomb removes a player from the fight until the correct coffin is opened, reducing available group resources.',
        mechanics: Object.freeze([
          ['HEAL', 'Drain Fluids', 'Strong single-target DoT and the main healer check.'],
          ['MECHANIC', 'Entomb', 'A player is trapped in a coffin; open the correct one to free them.'],
          ['HEAL', 'Desiccation', 'Debuff reduces performance until the affected player is healed back above the required health threshold.'],
          ['DODGE', 'Burn Corruption', 'Avoid the fire patches.'],
        ]),
      }),
      Object.freeze({
        name: 'The Council of Tribes',
        check: 'Two-target DoT + group soak',
        severity: 'high',
        healing: 'The dangerous healing moments are Severing Axe on two players and the Barrel Through group soak. Keep the tank prepared for Debilitating Backhand during the second council member.',
        mechanics: Object.freeze([
          ['HEAL', 'Severing Axe', 'Two-target damage-over-time effect during the first council member.'],
          ['SOAK', 'Barrel Through', 'Group soak during the second council member.'],
          ['TANK', 'Debilitating Backhand', 'Tank-buster hit.'],
          ['ADDS', 'Call of the Elements', 'Kill summoned totems in the required priority.'],
        ]),
      }),
      Object.freeze({
        name: 'King Dazar',
        check: 'AoE rot + heavy tank damage',
        severity: 'critical',
        healing: 'This is the main AoE healing check. Gilded Destruction is sustained rot with forced movement, while Blade Combo is a major tank spike. The fight becomes harder when Tzala joins, so align cooldowns with that overlap.',
        mechanics: Object.freeze([
          ['HEAL', 'Gilded Destruction', 'Extended group DoT/rot while players must keep moving.'],
          ['TANK', 'Blade Combo', 'Very large tank-damage sequence.'],
          ['HEAL', 'Aerial Smash / Quaking Leap', 'Multi-target jump damage.'],
          ['POSITION', 'Liquid Gold', 'Drops persistent puddles.'],
          ['ADDS', 'Reban / Tzala', 'The add phases increase encounter pressure; kill Reban early and expect the larger healing check after Tzala joins.'],
        ]),
      }),
    ]),
  }),

  'denofnalorakk': Object.freeze({
    name: 'Den of Nalorakk',
    shortName: 'DON',
    healerSummary: 'Heavy sustained rot. Hoardmonger and Sentinel both apply long group DoTs, while Nalorakk adds spread/stack execution and a major tank soak/buster.',
    noteworthy: Object.freeze([
      'Hoardmonger repeatedly applies a long AoE DoT; missed mushrooms add extra poison pressure.',
      'Sentinel of Winter has a fixed ability cycle: DoT, adds, stand in snow, then a lethal pushback if players are not in the snow pile.',
      'Nalorakk alternates spread, stack and soak mechanics; the healer should be ready to move while covering the tank buster.',
    ]),
    bosses: Object.freeze([
      Object.freeze({
        name: 'Hoardmonger',
        check: 'Repeated 10-second group DoT',
        severity: 'critical',
        healing: 'Ravenous/Hearty Bellow is the core healing event: a long AoE DoT on the entire group. Destroy mushrooms before they explode so Toxic Spores do not compound the rot.',
        mechanics: Object.freeze([
          ['HEAL', 'Ravenous / Hearty Bellow', 'Long group-wide DoT and the primary throughput check.'],
          ['MECHANIC', 'Spoiled Supplies', 'Spawns mushrooms around the arena; step on them to destroy them before they explode.'],
          ['HEAL', 'Toxic Spores', 'Mushroom contact/explosion creates an additional poison DoT.'],
          ['DODGE', 'Bonespike Slam', 'Frontal cone.'],
        ]),
      }),
      Object.freeze({
        name: 'Sentinel of Winter',
        check: 'Ability-cycle rot + lethal positioning',
        severity: 'critical',
        healing: 'Expect the cycle: Glacial Torment group DoT, adds, Snowdrift positioning, then Frozen Tempest. Top the group before the pushback and make sure players are standing in the snow pile for the lethal part.',
        mechanics: Object.freeze([
          ['HEAL', 'Glacial Torment', 'Extended group-wide frost DoT.'],
          ['ADDS', 'Raging Squall', 'Summoned adds should be controlled or killed.'],
          ['POSITION', 'Snowdrift', 'Stand in the snow pile before the next major mechanic.'],
          ['HEAL', 'Frozen Tempest', 'Large pushback/damage event; players outside the snow take lethal extra damage.'],
        ]),
      }),
      Object.freeze({
        name: 'Nalorakk',
        check: 'Spread/stack execution + tank soak',
        severity: 'high',
        healing: 'Keep the group mobile for Echoing Maul, then recover before the stack/hide sequence. Forceful Slam is the tank-focused danger; Echoing Fury creates additional damage when players soak the red bears.',
        mechanics: Object.freeze([
          ['SPREAD', 'Echoing Maul', 'Bears are summoned on players; spread for the impact.'],
          ['POSITION', 'Overwhelming Onslaught', 'Stack/hide behind the friendly NPC for the onslaught.'],
          ['TANK', 'Forceful Slam', 'Major tank soak/buster.'],
          ['SOAK', 'Echoing Fury', 'Bears turn red and should be soaked when active.'],
        ]),
      }),
    ]),
  }),

  'theblindingvale': Object.freeze({
    name: 'The Blinding Vale',
    shortName: 'TBV',
    healerSummary: 'Four healer-relevant fights: a three-target soak cycle, a six-second group DoT plus 50% enrage pulse, a bear/final-phase throughput ramp, and a final rot fight with constant ticking damage.',
    noteworthy: Object.freeze([
      'Lightblossom Trinity cycles approximately every 45 seconds and culminates in a three-target beam/soak healing check.',
      'Ikuzz applies a nasty six-second group DoT and begins pulsing more damage below 50%.',
      'Ziekket is explicitly a rot fight with constant ticking damage and an add/orb/laser execution cycle.',
    ]),
    bosses: Object.freeze([
      Object.freeze({
        name: 'Lightblossom Trinity',
        check: 'Three-target heal/soak cycle',
        severity: 'high',
        healing: 'The cycle is predictable: Bedrock Slam, Lightsower Dash, then Lightblossom Beam. Pre-heal the players assigned to the yellow-pool beam soak and cover the Bedrock DoT between cycles.',
        mechanics: Object.freeze([
          ['HEAL', 'Bedrock Slam', 'Creates green pools and applies an extended DoT.'],
          ['MECHANIC', 'Lightsower Dash', 'Plants a seed on each pool.'],
          ['SOAK', 'Lightblossom Beam', 'The pools turn yellow and create a three-target healing/soak check.'],
          ['INTERRUPT', 'Light Bolt', 'Interrupt the cast.'],
        ]),
      }),
      Object.freeze({
        name: 'Ikuzz',
        check: 'Six-second group DoT + execute pulse',
        severity: 'critical',
        healing: 'Thorncaller Roar is the main predictable group DoT. At 50% health the boss becomes empowered and starts pulsing damage, so enter the second half with cooldowns and mana available.',
        mechanics: Object.freeze([
          ['HEAL', 'Thorncaller Roar', 'Strong six-second pulsing damage on the entire group.'],
          ['HEAL', 'Lightgrazed Frenzy', 'Below 50%, the boss gains an absorb and pulses additional group damage.'],
          ['MOVE', 'Verdant Stomp', 'Knockback that also roots players.'],
          ['MOVE', 'Bloodthirsty Gaze', 'Fixate: targeted player runs from the boss.'],
        ]),
      }),
      Object.freeze({
        name: 'Ruia',
        check: 'Bear-phase throughput + final random pressure',
        severity: 'critical',
        healing: 'The bear phase requires noticeably more healing than the opening moonkin phase. Grievous Thrash is the large damage event. Below 40%, Convoke repeatedly uses encounter abilities, so keep the group stable and react quickly to random overlaps.',
        mechanics: Object.freeze([
          ['PHASE', 'Moonkin -> Bear -> Convoke', '100-70% is lighter, 70-40% requires more healing, and below 40% the boss repeatedly casts encounter abilities.'],
          ['HEAL', 'Grievous Thrash', 'Large damage event with a bleed/DoT component.'],
          ['DODGE', 'Lightfall / Lightfire', 'Avoid the falling zones and star-pattern lines.'],
          ['DODGE', 'Pulverizing Strikes', 'Frontal attack.'],
          ['INTERRUPT', "Warden's Wrath", 'Interrupt during the final spirit/Convoke phase.'],
        ]),
      }),
      Object.freeze({
        name: 'Ziekket',
        check: 'Constant rot fight',
        severity: 'critical',
        healing: 'This is sustained healer throughput from pull to finish. Oozing Xylem ticks constantly, so plan mana and avoid wasting globals. Stack the adds for their death mechanic and handle the orb/laser cycle cleanly so avoidable damage does not overwhelm the baseline rot.',
        mechanics: Object.freeze([
          ['HEAL', 'Oozing Xylem', 'Constant group-wide ticking damage throughout the fight.'],
          ['ADDS', 'Awaken the Lightbloom', 'Summons adds; keep them stacked when they die.'],
          ['SOAK', "Lightbloom's Essence", 'Soak the orbs as part of the phase cycle.'],
          ['MECHANIC', 'Concentrated Lightbeam', 'Laser targets a DPS and must be aimed through the dead adds/required objects.'],
          ['HEAL', "Lightbloom's Might", 'Damage-amplification window that also adds sustained holy damage.'],
        ]),
      }),
    ]),
  }),
});

function normalise(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

export function getEncounterGuide(name) {
  return GUIDES[normalise(name)] || null;
}

export function encounterGuideNames() {
  return Object.values(GUIDES).map((guide) => guide.name);
}

export function encounterGuideCount() {
  return Object.keys(GUIDES).length;
}

export function encounterBossCount() {
  return Object.values(GUIDES).reduce((sum, guide) => sum + guide.bosses.length, 0);
}

export { SOURCE_NOTE };