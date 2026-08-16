// Midnight Season 2 healer-relevant dungeon loot snapshot.
// Validated 2026-08-16 against Blizzard's confirmed Season 2 dungeon pool
// and current Wowhead / Warcraft Wiki dungeon loot tables.
//
// This dataset deliberately excludes items that are clearly Strength/Agility-only
// for healer analysis. Armor is filtered by the character's native armor class.

export const LOOT_DATA_VERSION = '2026-08-16';

export const MYTHIC_PLUS_END_OF_DUNGEON_ILVL = Object.freeze({
  2: 295,
  3: 295,
  4: 298,
  5: 302,
  6: 305,
  7: 305,
  8: 308,
  9: 308,
  10: 311,
});

export function endOfDungeonItemLevel(keyLevel = 10) {
  const level = Math.max(2, Math.floor(Number(keyLevel) || 10));
  if (level >= 10) return MYTHIC_PLUS_END_OF_DUNGEON_ILVL[10];
  return MYTHIC_PLUS_END_OF_DUNGEON_ILVL[level] || MYTHIC_PLUS_END_OF_DUNGEON_ILVL[2];
}

export const HEALER_CLASSES = ['Druid', 'Evoker', 'Monk', 'Paladin', 'Priest', 'Shaman'];

export const CLASS_ARMOR = {
  Druid: 'leather',
  Evoker: 'mail',
  Monk: 'leather',
  Paladin: 'plate',
  Priest: 'cloth',
  Shaman: 'mail',
};

const STAFF_HEALERS = ['Druid', 'Evoker', 'Monk', 'Priest', 'Shaman'];
const DAGGER_HEALERS = ['Druid', 'Evoker', 'Priest', 'Shaman'];
const MACE_HEALERS = ['Druid', 'Monk', 'Paladin', 'Priest', 'Shaman'];
const OFFHAND_HEALERS = ['Druid', 'Evoker', 'Priest'];
const SHIELD_HEALERS = ['Paladin', 'Shaman'];

export const SEASON_2_DUNGEONS = [
  {
    name: 'Altar of Fangs',
    shortName: 'AOF',
    items: [
      { name: 'Primordial Robe of Rites', slot: 'chest', armor: 'cloth' },
      { name: 'Leggings of Entwined Serpents', slot: 'legs', armor: 'cloth' },
      { name: 'Handwraps of Blasphemous Rites', slot: 'hands', armor: 'cloth' },
      { name: 'Snakeskin Spaulders', slot: 'shoulder', armor: 'leather' },
      { name: "Spare Speaker's Hood", slot: 'head', armor: 'leather' },
      { name: 'Hydra Scale Wristguards', slot: 'wrist', armor: 'mail' },
      { name: 'Chestguard of Corroded Scales', slot: 'chest', armor: 'mail' },
      { name: 'Poison-Proof Stompers', slot: 'feet', armor: 'plate' },
      { name: 'Aged Interwoven Scaleplate', slot: 'chest', armor: 'plate' },
      { name: "Ancient General's Obsidian Pillars", slot: 'legs', armor: 'plate' },
      { name: 'Strand of Warding Fangs', slot: 'neck' },
      { name: 'Band of the Amani Warlord', slot: 'ring' },
      { name: 'Polished Lightwood Channeler', slot: 'main_hand', classes: DAGGER_HEALERS },
      { name: 'Nocuous Focal Fang', slot: 'off_hand', classes: OFFHAND_HEALERS },
      { name: 'Vile Vial of Volatile Venom', slot: 'trinket', classes: HEALER_CLASSES },
      { name: 'Knot of Writhing Serpents', slot: 'trinket', classes: HEALER_CLASSES },
    ],
  },
  {
    name: 'Murder Row',
    shortName: 'MR',
    items: [
      { name: 'Nibbling Armbands', slot: 'wrist', armor: 'cloth' },
      { name: 'Counterfeit Clutches', slot: 'hands', armor: 'cloth' },
      { name: "Summoner's Searing Shirt", slot: 'chest', armor: 'cloth' },
      { name: 'Tempestuous Sandals', slot: 'feet', armor: 'cloth' },
      { name: "Vilefiend's Guise", slot: 'head', armor: 'leather' },
      { name: 'Fury-fletched Armlets', slot: 'wrist', armor: 'leather' },
      { name: 'Gauntlets of Fevered Defense', slot: 'hands', armor: 'leather' },
      { name: 'Breeches of Deft Deals', slot: 'legs', armor: 'leather' },
      { name: 'Jangling Felpaulets', slot: 'shoulder', armor: 'mail' },
      { name: "Lithiel's Linked Leggings", slot: 'legs', armor: 'mail' },
      { name: 'Felsoaked Soles', slot: 'feet', armor: 'mail' },
      { name: 'Greathelm of Temptation', slot: 'head', armor: 'plate' },
      { name: 'Cinderfury Shoulderguards', slot: 'shoulder', armor: 'plate' },
      { name: "Overseer's Vambraces", slot: 'wrist', armor: 'plate' },
      { name: 'Pendant of Malefic Fury', slot: 'neck' },
      { name: 'Signet of Snarling Servitude', slot: 'ring' },
      { name: 'Speakeasy Shroud', slot: 'back' },
      { name: "Nibbles' Training Rod", slot: 'main_hand', classes: STAFF_HEALERS },
      { name: "Freightrunner's Flask", slot: 'trinket', classes: HEALER_CLASSES },
      { name: 'Unstable Felheart Crystal', slot: 'trinket', classes: HEALER_CLASSES },
    ],
  },
  {
    name: 'Den of Nalorakk',
    shortName: 'DON',
    items: [
      { name: "Winter's Embrace Bracers", slot: 'wrist', armor: 'cloth' },
      { name: 'Hoarded Harvest Wrap', slot: 'chest', armor: 'cloth' },
      { name: 'Forest Dream Leg-guards', slot: 'legs', armor: 'cloth' },
      { name: "Scavenger's Spaulders", slot: 'shoulder', armor: 'leather' },
      { name: 'War Trial Vestments', slot: 'chest', armor: 'leather' },
      { name: "Arctic Explorer's Legwraps", slot: 'feet', armor: 'leather' },
      { name: "Nalorakk's Nightmare", slot: 'head', armor: 'mail' },
      { name: "Season's Turn Gauntlets", slot: 'hands', armor: 'mail' },
      { name: "Tribal Defender's Cord", slot: 'waist', armor: 'mail' },
      { name: 'Forgotten Tribe Footguards', slot: 'feet', armor: 'mail' },
      { name: "Bonds of the Hash'ura", slot: 'hands', armor: 'plate' },
      { name: "Sentinel Challenger's Prize", slot: 'chest', armor: 'plate' },
      { name: "Autumn's Boon Belt", slot: 'waist', armor: 'plate' },
      { name: 'Pilfered Precious Band', slot: 'ring' },
      { name: 'Yoke of the Charging Bear', slot: 'neck' },
      { name: "Fallen Speaker's Staff", slot: 'main_hand', classes: STAFF_HEALERS },
      { name: 'Perennial Frostbound Charm', slot: 'off_hand', classes: OFFHAND_HEALERS },
      { name: "Tempest's Shelter", slot: 'off_hand', classes: SHIELD_HEALERS },
      { name: 'Mycolic Medicine', slot: 'trinket', classes: HEALER_CLASSES },
    ],
  },
  {
    name: 'The Blinding Vale',
    shortName: 'TBV',
    items: [
      { name: 'Worldroot Canopy', slot: 'head', armor: 'cloth' },
      { name: 'Lightblossom Cinch', slot: 'waist', armor: 'cloth' },
      { name: 'Rootwarden Wraps', slot: 'wrist', armor: 'leather' },
      { name: 'Rootwalker Harness', slot: 'waist', armor: 'leather' },
      { name: 'Lightspore Leggings', slot: 'legs', armor: 'leather' },
      { name: 'Saptorbane Guards', slot: 'wrist', armor: 'mail' },
      { name: 'Pulverizing Pads', slot: 'hands', armor: 'mail' },
      { name: 'Ironroot Collar', slot: 'shoulder', armor: 'mail' },
      { name: 'Thornspike Gauntlets', slot: 'hands', armor: 'plate' },
      { name: 'Taproot Ribs', slot: 'chest', armor: 'plate' },
      { name: 'Bedrock Breeches', slot: 'legs', armor: 'plate' },
      { name: "Lightwarden's Bind", slot: 'ring' },
      { name: 'Bloodthorn Burnous', slot: 'back' },
      { name: 'Doompetal', slot: 'main_hand', classes: ['Priest'] },
      { name: 'Luminescent Sprout', slot: 'off_hand', classes: OFFHAND_HEALERS },
      { name: "Teldrassil's Sacrifice", slot: 'off_hand', classes: SHIELD_HEALERS },
      { name: 'Seed of Radiant Hope', slot: 'trinket', classes: HEALER_CLASSES },
      { name: 'Lightspire Core', slot: 'trinket', classes: HEALER_CLASSES },
      { name: 'Sapling of the Dawnroot', slot: 'trinket', classes: HEALER_CLASSES },
    ],
  },
  {
    name: 'Voidscar Arena',
    shortName: 'VSA',
    items: [
      { name: "Overseer's Diadem", slot: 'head', armor: 'cloth' },
      { name: "Poisoner's Pauldrons", slot: 'shoulder', armor: 'cloth' },
      { name: 'Ethereal Netherwrap', slot: 'waist', armor: 'cloth' },
      { name: 'Gravitic Girdle', slot: 'waist', armor: 'leather' },
      { name: 'Somber Spaulders', slot: 'shoulder', armor: 'leather' },
      { name: 'Hide of Pestilence', slot: 'chest', armor: 'leather' },
      { name: 'Voidscarred Crown', slot: 'head', armor: 'mail' },
      { name: "Manipulator's Vest", slot: 'chest', armor: 'mail' },
      { name: 'Behemoth Waistband', slot: 'waist', armor: 'mail' },
      { name: 'Visor of the Predator', slot: 'head', armor: 'plate' },
      { name: "Despondent's Gauntlets", slot: 'hands', armor: 'plate' },
      { name: 'Graft of the Domanaar', slot: 'neck' },
      { name: 'Sickening Signet of Atroxus', slot: 'ring' },
      { name: 'Fang of Contagion', slot: 'main_hand', classes: DAGGER_HEALERS },
      { name: "Mindpiercer's Sigil", slot: 'trinket', classes: HEALER_CLASSES },
    ],
  },
  {
    name: 'Ruby Life Pools',
    shortName: 'RLP',
    items: [
      { name: "Subjugator's Chilling Grips", slot: 'hands', armor: 'leather' },
      { name: "Invader's Firestorm Chestguard", slot: 'chest', armor: 'leather' },
      { name: 'Crown of Roaring Storms', slot: 'head', armor: 'leather' },
      { name: "Egg Tender's Leggings", slot: 'legs', armor: 'mail' },
      { name: "Blazebound Lieutenant's Helm", slot: 'head', armor: 'mail' },
      { name: 'Galerattle Gauntlets', slot: 'hands', armor: 'mail' },
      { name: "Scaleguard's Stalwart Greatboots", slot: 'feet', armor: 'plate' },
      { name: 'Breastplate of Soaring Terror', slot: 'chest', armor: 'plate' },
      { name: 'Sky Saddle Cord', slot: 'waist', armor: 'cloth' },
      { name: "Wind Soarer's Breeches", slot: 'legs', armor: 'cloth' },
      { name: 'Fireproof Drape', slot: 'back' },
      { name: "Chillworn's Infusion Staff", slot: 'main_hand', classes: STAFF_HEALERS },
      { name: "Kokia's Burnout Rod", slot: 'off_hand', classes: OFFHAND_HEALERS },
      { name: "Drake Rider's Stecktarge", slot: 'off_hand', classes: SHIELD_HEALERS },
      { name: 'Ruby Whelp Shell', slot: 'trinket', classes: HEALER_CLASSES },
    ],
  },
  {
    name: "Kings' Rest",
    shortName: 'KR',
    items: [
      { name: 'Down-Lined Breeches', slot: 'legs', armor: 'cloth' },
      { name: 'Sandals of Wise Voodoo', slot: 'feet', armor: 'cloth' },
      { name: 'Headdress of the First Empire', slot: 'head', armor: 'cloth' },
      { name: 'Mantle of Ceremonial Ascension', slot: 'shoulder', armor: 'cloth' },
      { name: 'Goldfeather Boots', slot: 'feet', armor: 'leather' },
      { name: 'Breeches of the Sacred Hall', slot: 'legs', armor: 'leather' },
      { name: "Desiccator's Blessed Gloves", slot: 'hands', armor: 'leather' },
      { name: "Kula's Butchering Wristwraps", slot: 'wrist', armor: 'leather' },
      { name: 'Vest of Reverent Adoration', slot: 'chest', armor: 'leather' },
      { name: "Primal Dinomancer's Belt", slot: 'waist', armor: 'leather' },
      { name: 'Belt of the Consecrated Tomb', slot: 'waist', armor: 'mail' },
      { name: "Sepulchral Construct's Gloves", slot: 'hands', armor: 'mail' },
      { name: 'Boots of the Headlong Conqueror', slot: 'feet', armor: 'mail' },
      { name: 'Loa-Blessed Chestguard', slot: 'chest', armor: 'mail' },
      { name: 'Spaulders of Prime Emperor', slot: 'shoulder', armor: 'mail' },
      { name: 'Auric Puddle Stompers', slot: 'feet', armor: 'plate' },
      { name: 'Gauntlets of the Avian Sentinel', slot: 'hands', armor: 'plate' },
      { name: "Embalmer's Steadying Bracers", slot: 'wrist', armor: 'plate' },
      { name: 'Girdle of Pestilent Purification', slot: 'waist', armor: 'plate' },
      { name: 'Helm of the Raptor King', slot: 'head', armor: 'plate' },
      { name: 'Pauldrons of the Great Unifier', slot: 'shoulder', armor: 'plate' },
      { name: "Ritual Binder's Ring", slot: 'ring' },
      { name: 'Cloak of the Restless Tribes', slot: 'back' },
      { name: 'Vessel of Last Rites', slot: 'off_hand', classes: OFFHAND_HEALERS },
    ],
  },
  {
    name: 'Temple of Sethraliss',
    shortName: 'TOS',
    items: [
      { name: 'Bindings of the Slithering Current', slot: 'wrist', armor: 'cloth' },
      { name: 'Sandswept Sandals', slot: 'feet', armor: 'cloth' },
      { name: 'Ouroborial Sash', slot: 'waist', armor: 'cloth' },
      { name: 'Handwraps of Oscillating Polarity', slot: 'hands', armor: 'cloth' },
      { name: "Brood Cleanser's Amice", slot: 'shoulder', armor: 'cloth' },
      { name: 'Robes of the Reborn Serpent', slot: 'chest', armor: 'cloth' },
      { name: 'Whirling Dervish Sash', slot: 'waist', armor: 'leather' },
      { name: 'Leggings of the Galeforce Viper', slot: 'legs', armor: 'leather' },
      { name: 'Sand-Shined Snakeskin Sandals', slot: 'feet', armor: 'leather' },
      { name: 'Hood of the Slithering Loa', slot: 'head', armor: 'leather' },
      { name: 'Grips of Electrified Defense', slot: 'hands', armor: 'leather' },
      { name: 'Arc-Glass Bindings', slot: 'wrist', armor: 'mail' },
      { name: 'Sabatons of Coruscating Energy', slot: 'feet', armor: 'mail' },
      { name: 'Legguards of the Awakening Brood', slot: 'legs', armor: 'mail' },
      { name: "Sethraliss' Fanged Helm", slot: 'head', armor: 'mail' },
      { name: "Corrupted Hexxer's Vestments", slot: 'chest', armor: 'mail' },
      { name: 'Shard-Tipped Vambraces', slot: 'wrist', armor: 'plate' },
      { name: 'Legplates of Charged Duality', slot: 'legs', armor: 'plate' },
      { name: 'Fangproof Gauntlets', slot: 'hands', armor: 'plate' },
      { name: 'Sand-Scoured Greatbelt', slot: 'waist', armor: 'plate' },
      { name: "C'thraxxi Binders Pauldrons", slot: 'shoulder', armor: 'plate' },
      { name: "Desert Guardian's Breastplate", slot: 'chest', armor: 'plate' },
      { name: 'Jade Ophidian Band', slot: 'ring' },
      { name: 'Charged Sandstone Band', slot: 'ring' },
      { name: 'Staff of the Lightning Serpent', slot: 'main_hand', classes: STAFF_HEALERS },
      { name: 'Galvanized Stormcrusher', slot: 'main_hand', classes: MACE_HEALERS },
      { name: 'Bulwark of Brimming Potential', slot: 'off_hand', classes: SHIELD_HEALERS },
      { name: 'Fangs of Intertwined Essence', slot: 'trinket', classes: HEALER_CLASSES },
    ],
  },
];

export function getSeason2Loot() {
  return SEASON_2_DUNGEONS;
}