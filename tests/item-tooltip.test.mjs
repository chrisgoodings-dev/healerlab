import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeItemTooltipData } from '../public/js/item-tooltips.js';

test('tooltip trigger overrides preserve context-specific item level and stats', () => {
  const merged = mergeItemTooltipData(
    {
      id: 123,
      name: 'Dungeon Ring',
      itemLevel: 280,
      quality: 'EPIC',
      secondaryStats: { crit: 100, haste: 0, mastery: 0, versatility: 100 },
      effects: [{ trigger: 'Equip', text: 'Test effect' }],
      iconUrl: 'https://example.invalid/item.jpg',
    },
    {
      id: 123,
      name: 'Dungeon Ring',
      itemLevel: 311,
      secondaryStats: { crit: 0, haste: 420, mastery: 380, versatility: 0 },
    }
  );

  assert.equal(merged.itemLevel, 311);
  assert.deepEqual(merged.secondaryStats, {
    crit: 0,
    haste: 420,
    mastery: 380,
    versatility: 0,
  });
  assert.equal(merged.effects[0].text, 'Test effect');
});

test('tooltip falls back to Blizzard item stats when trigger has no stat override', () => {
  const merged = mergeItemTooltipData({
    id: 88,
    name: 'Static Item',
    secondaryStats: { crit: 123, haste: 456, mastery: 0, versatility: 0 },
  });

  assert.equal(merged.secondaryStats.crit, 123);
  assert.equal(merged.secondaryStats.haste, 456);
});
