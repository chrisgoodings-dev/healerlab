import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichCuratedDungeonsWithOfficial, normaliseLootName } from '../public/js/official-loot.js';
import { normaliseJournalDungeon, findJournalInstance } from '../functions/api/blizzard-dungeon.js';

test('normalises punctuation when matching Blizzard Journal names', () => {
  assert.equal(normaliseLootName("Kings' Rest"), 'kings rest');
  assert.equal(normaliseLootName('Kings\u2019 Rest'), 'kings rest');
});

test('merges official Blizzard item IDs and instance media into curated loot', () => {
  const curated = [{ name: "Kings' Rest", shortName: 'KR', items: [{ name: 'Example Ring', slot: 'ring' }, { name: 'Curated Only', slot: 'trinket' }] }];
  const official = [{ name: "Kings' Rest", journalInstanceId: 1041, iconUrl: 'https://example.test/kr.jpg', items: [{ id: 12345, name: 'Example Ring', encounterId: 1, encounterName: 'Boss' }] }];
  const [dungeon] = enrichCuratedDungeonsWithOfficial(curated, official);
  assert.equal(dungeon.journalInstanceId, 1041);
  assert.equal(dungeon.instanceIconUrl, 'https://example.test/kr.jpg');
  assert.equal(dungeon.items[0].itemId, 12345);
  assert.equal(dungeon.items[0].officialSource, true);
  assert.equal(dungeon.items[1].officialSource, false);
});

test('finds a Journal instance by normalized name', () => {
  const result = findJournalInstance({ journal_instances: [{ id: 1, name: 'Ruby Life Pools' }, { id: 2, name: "Kings' Rest" }] }, "Kings' Rest");
  assert.equal(result.id, 2);
});

test('normalises encounter loot into unique official item IDs', () => {
  const dungeon = normaliseJournalDungeon({
    definition: { name: 'Ruby Life Pools', shortName: 'RLP' },
    instance: { id: 1202 },
    media: { assets: [{ key: 'tile', value: 'https://example.test/rlp.jpg' }] },
    encounters: [
      { id: 10, name: 'Boss One', items: [{ item: { id: 100, name: 'Item A' } }, { item: { id: 101, name: 'Item B' } }] },
      { id: 11, name: 'Boss Two', items: [{ item: { id: 100, name: 'Item A' } }, { item: { id: 102, name: 'Item C' } }] },
    ],
  });
  assert.equal(dungeon.journalInstanceId, 1202);
  assert.equal(dungeon.iconUrl, 'https://example.test/rlp.jpg');
  assert.deepEqual(dungeon.items.map((item) => item.id), [100, 101, 102]);
});
