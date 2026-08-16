import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normaliseItemSecondaryStatTypes,
} from '../functions/api/blizzard.js';

import {
  normaliseOfficialItemDetails,
} from '../functions/api/blizzard-dungeon.js';

import {
  enrichCuratedDungeonsWithOfficial,
} from '../public/js/official-loot.js';

import {
  buildPersonalDungeonBis,
  effectiveItemStats,
} from '../public/js/bis.js';

test('Blizzard item stat types survive even when scaled ratings are zero', () => {
  const item = {
    preview_item: {
      stats: [
        { type: { type: 'HASTE_RATING' }, value: { value: 0 } },
        { type: { type: 'MASTERY_RATING' }, value: { value: 0 } },
      ],
    },
  };

  assert.deepEqual(
    normaliseItemSecondaryStatTypes(item),
    ['haste', 'mastery']
  );
});

test('Blizzard item metadata classifies cloth armour by slot', () => {
  const item = normaliseOfficialItemDetails(
    { id: 123, name: 'Live Hood' },
    {
      name: 'Live Hood',
      itemClass: 'Armor',
      itemSubclass: 'Cloth',
      inventoryType: 'HEAD',
      secondaryStats: { haste: 0, mastery: 0, crit: 0, versatility: 0 },
      secondaryStatTypes: ['haste', 'mastery'],
    }
  );

  assert.equal(item.slot, 'head');
  assert.equal(item.armor, 'cloth');
  assert.deepEqual(item.secondaryStatTypes, ['haste', 'mastery']);
});

test('official loot merge appends Blizzard items missing from curated name table', () => {
  const curated = [{
    name: 'Altar of Fangs',
    shortName: 'AOF',
    items: [{ name: 'Old Curated Item', slot: 'head', armor: 'cloth' }],
  }];

  const official = [{
    name: 'Altar of Fangs',
    journalInstanceId: 999,
    items: [{
      id: 456,
      name: 'Brand New Live Hood',
      slot: 'head',
      armor: 'cloth',
      secondaryStats: { crit: 0, haste: 0, mastery: 0, versatility: 0 },
      secondaryStatTypes: ['haste', 'mastery'],
    }],
  }];

  const [dungeon] = enrichCuratedDungeonsWithOfficial(curated, official);
  const live = dungeon.items.find((item) => item.itemId === 456);

  assert.ok(live);
  assert.equal(live.slot, 'head');
  assert.equal(live.armor, 'cloth');
  assert.equal(live.officialSource, true);
});

test('effective item stats fall back to Blizzard stat-type composition', () => {
  assert.deepEqual(
    effectiveItemStats({
      secondaryStats: { crit: 0, haste: 0, mastery: 0, versatility: 0 },
      secondaryStatTypes: ['haste', 'mastery'],
    }),
    { crit: 0, haste: 1, mastery: 1, versatility: 0 }
  );
});

test('personal dungeon BiS can rank from stat priority without live character alignment', () => {
  const character = {
    class: 'Druid',
    active_spec_name: 'Restoration',
    gear: {
      items: {
        head: {
          item_level: 311,
          name: 'Current Helm',
        },
      },
    },
  };

  const dungeons = [
    {
      name: 'Dungeon Haste Mastery',
      shortName: 'HM',
      items: [{
        id: 1001,
        name: 'Haste Mastery Helm',
        itemId: 1001,
        slot: 'head',
        armor: 'leather',
        secondaryStatTypes: ['haste', 'mastery'],
      }],
    },
    {
      name: 'Dungeon Crit Vers',
      shortName: 'CV',
      items: [{
        id: 1002,
        name: 'Crit Vers Helm',
        itemId: 1002,
        slot: 'head',
        armor: 'leather',
        secondaryStatTypes: ['crit', 'versatility'],
      }],
    },
  ];

  const profile = buildPersonalDungeonBis(character, dungeons, {
    statAlignment: {
      available: false,
      context: 'mythic_plus',
      reason: 'No live ratings',
    },
    statContext: 'mythic_plus',
  });

  assert.equal(profile.available, true);
  assert.equal(profile.bySlot.head[0].itemName, 'Haste Mastery Helm');
  assert.equal(profile.bySlot.head[0].priorityOnly, true);
  assert.match(profile.sourceMode, /stat-priority/i);
});