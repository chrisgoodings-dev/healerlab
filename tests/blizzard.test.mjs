import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeBlizzardEquipment,
  normaliseBlizzardEquipment,
  normaliseCharacterStatistics,
  normaliseItemSecondaryStats,
  normaliseItemEffects,
  resolveSecondaryStats,
  slugifyRealm,
  sumEquipmentSecondaryStats,
} from '../functions/api/blizzard.js';

test('slugifies a Blizzard realm name', () => {
  assert.equal(slugifyRealm('Tarren Mill'), 'tarren-mill');
  assert.equal(slugifyRealm("Quel'Thalas"), 'quelthalas');
});

test('normalises performance slots and excludes cosmetic slots', () => {
  const raw = {
    equipped_items: [
      { slot: { type: 'HEAD' }, item: { id: 100 }, name: 'Official Helm', level: { value: 311 } },
      { slot: { type: 'SHIRT' }, item: { id: 101 }, name: 'Cosmetic Shirt', level: { value: 999 } },
      { slot: { type: 'TABARD' }, item: { id: 102 }, name: 'Cosmetic Tabard', level: { value: 999 } },
      { slot: { type: 'FINGER' }, item: { id: 103 }, name: 'Ring One', level: { value: 308 } },
      { slot: { type: 'FINGER' }, item: { id: 104 }, name: 'Ring Two', level: { value: 305 } },
      { slot: { type: 'TRINKET' }, item: { id: 105 }, name: 'Trinket One', level: { value: 302 } },
      { slot: { type: 'TRINKET' }, item: { id: 106 }, name: 'Trinket Two', level: { value: 298 } },
    ],
  };

  const items = normaliseBlizzardEquipment(raw);
  const slots = items.map((item) => item.slot);

  assert.deepEqual(slots, [
    'head',
    'finger_1',
    'finger_2',
    'trinket_1',
    'trinket_2',
  ]);
  assert.equal(items.some((item) => item.name.includes('Cosmetic')), false);
});

test('merges Blizzard equipment over Raider.IO slot data without losing the rest of the character', () => {
  const character = {
    name: 'Bubbymenda',
    gear: {
      item_level_equipped: 305,
      items: {
        head: { name: 'Raider Helm', item_level: 300 },
        neck: { name: 'Raider Neck', item_level: 305 },
      },
    },
    mythic_plus_best_runs: [{ short_name: 'TEST' }],
  };

  const merged = mergeBlizzardEquipment(character, {
    available: true,
    state: 'ok',
    realmSlug: 'tarren-mill',
    items: [
      {
        slot: 'head',
        itemId: 123456,
        name: 'Official Helm',
        itemLevel: 311,
        iconUrl: 'https://example.invalid/icon.jpg',
        quality: 'EPIC',
      },
    ],
  });

  assert.equal(merged.gear.items.head.name, 'Official Helm');
  assert.equal(merged.gear.items.head.item_level, 311);
  assert.equal(merged.gear.items.head.item_id, 123456);
  assert.equal(merged.gear.items.head.source, 'blizzard');
  assert.equal(merged.gear.items.neck.name, 'Raider Neck');
  assert.equal(merged.healerlab_sources.blizzard, 'ok');
  assert.equal(merged.mythic_plus_best_runs[0].short_name, 'TEST');
});

test('falls back cleanly when Blizzard equipment is unavailable', () => {
  const character = {
    gear: { items: { head: { name: 'Raider Helm', item_level: 300 } } },
  };

  const merged = mergeBlizzardEquipment(character, {
    available: false,
    state: 'unavailable',
    message: 'Temporary failure',
  });

  assert.equal(merged.gear.items.head.name, 'Raider Helm');
  assert.equal(merged.healerlab_sources.raider_io, 'ok');
  assert.equal(merged.healerlab_sources.blizzard, 'unavailable');
  assert.equal(merged.blizzard.available, false);
});


test('normalises Blizzard character secondary-stat ratings', () => {
  const stats = normaliseCharacterStatistics({
    spell_crit: { rating: 321, value: 12.3 },
    spell_haste: { rating: 654, value: 18.4 },
    mastery: { rating: 777, value: 31.2 },
    versatility: 222,
  });

  assert.deepEqual(stats, {
    crit: 321,
    haste: 654,
    mastery: 777,
    versatility: 222,
  });
});

test('normalises secondary stats from Blizzard preview item data', () => {
  const stats = normaliseItemSecondaryStats({
    preview_item: {
      stats: [
        { type: { type: 'HASTE_RATING' }, value: 410 },
        { type: { type: 'MASTERY_RATING' }, value: 360 },
        { type: { type: 'INTELLECT' }, value: 900 },
      ],
    },
  });

  assert.deepEqual(stats, {
    crit: 0,
    haste: 410,
    mastery: 360,
    versatility: 0,
  });
});


test('skips zero-valued Blizzard stat variants when a populated variant exists', () => {
  const stats = normaliseCharacterStatistics({
    spell_crit: { rating: 0 },
    melee_crit: { rating: 711 },
    spell_haste: { rating: 0 },
    melee_haste: { rating: 1240 },
    mastery: { rating: 986 },
    versatility: 326,
  });

  assert.deepEqual(stats, {
    crit: 711,
    haste: 1240,
    mastery: 986,
    versatility: 326,
  });
});

test('accepts alternate Blizzard critical strike field names', () => {
  const stats = normaliseCharacterStatistics({
    spell_critical_strike: { rating: 444 },
    haste_rating: 555,
    mastery_rating: 666,
    versatility_rating: 77,
  });

  assert.deepEqual(stats, {
    crit: 444,
    haste: 555,
    mastery: 666,
    versatility: 77,
  });
});

test('sums secondary stats from normalized equipped Blizzard items', () => {
  const raw = {
    equipped_items: [
      {
        slot: { type: 'HEAD' },
        item: { id: 1 },
        name: 'Helm',
        level: { value: 311 },
        stats: [
          { type: { type: 'HASTE_RATING' }, value: 210 },
          { type: { type: 'MASTERY_RATING' }, value: 180 },
        ],
      },
      {
        slot: { type: 'WRIST' },
        item: { id: 2 },
        name: 'Bracers',
        level: { value: 311 },
        stats: [
          { type: { type: 'CRITICAL_STRIKE_RATING' }, value: 90 },
          { type: { type: 'VERSATILITY' }, value: 70 },
        ],
      },
    ],
  };

  const items = normaliseBlizzardEquipment(raw);
  assert.deepEqual(sumEquipmentSecondaryStats(items), {
    crit: 90,
    haste: 210,
    mastery: 180,
    versatility: 70,
  });
});

test('fills missing character statistics from equipped item totals per stat', () => {
  const resolved = resolveSecondaryStats(
    { crit: 0, haste: 0, mastery: 0, versatility: 326 },
    { crit: 711, haste: 1240, mastery: 986, versatility: 280 }
  );

  assert.deepEqual(resolved.ratings, {
    crit: 711,
    haste: 1240,
    mastery: 986,
    versatility: 326,
  });
  assert.deepEqual(resolved.fallbackStats, ['crit', 'haste', 'mastery']);
  assert.equal(resolved.source, 'blended');
});


test('normalises Blizzard item bonus effects from spell data', () => {
  const effects = normaliseItemEffects({
    spells: [
      {
        trigger_type: { type: 'ON_EQUIP' },
        spell: { id: 123, name: 'Verdant Surge' },
        description: 'Your healing spells have a chance to grant 500 Haste for 10 sec.'
      },
      {
        trigger_type: { type: 'ON_USE' },
        spell: { id: 456, name: 'Blooming Pulse' },
      },
    ],
  });

  assert.deepEqual(effects, [
    {
      trigger: 'Equip',
      text: 'Your healing spells have a chance to grant 500 Haste for 10 sec.',
      spellId: 123,
    },
    {
      trigger: 'Use',
      text: 'Blooming Pulse',
      spellId: 456,
    },
  ]);
});

test('deduplicates Blizzard item effects exposed in multiple payload sections', () => {
  const effect = {
    trigger_type: { type: 'ON_EQUIP' },
    spell: { id: 999, name: 'Shared Effect' },
    description: 'Gain Mastery after casting a major cooldown.',
  };
  const effects = normaliseItemEffects({
    spells: [effect],
    preview_item: { spells: [effect] },
  });
  assert.equal(effects.length, 1);
});
