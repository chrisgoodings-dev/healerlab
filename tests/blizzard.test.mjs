import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeBlizzardEquipment,
  normaliseBlizzardEquipment,
  normaliseCharacterStatistics,
  normaliseItemSecondaryStats,
  slugifyRealm,
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
