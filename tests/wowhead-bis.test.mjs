import test from 'node:test';
import assert from 'node:assert/strict';

import { parseWowheadBisHtml } from '../functions/api/wowhead-bis.js';
import { annotateDungeonLootWithWowhead, usableWowheadGuide, wowheadSourceSummary } from '../public/js/wowhead-bis.js';

test('parses current-season Wowhead BiS rows and classifies raid/dungeon sources', () => {
  const html = `
    <h3>Best in Slot Gear for Holy Priest</h3>
    <p>Midnight Season 2 - The Venomous Abyss and Temple of Sethraliss</p>
    <table>
      <tr><th>Slot</th><th>Item</th><th>Source</th></tr>
      <tr><td>Helm</td><td><a href="/item=1001/test">Seraphic Crown</a></td><td>Raid | Catalyst | Vault</td></tr>
      <tr><td>Ring</td><td><a href="/item=1002/test">Serpent Band</a></td><td>Temple of Sethraliss</td></tr>
    </table>
    <h3>Learn About Popular Gear With Archon</h3>
  `;

  const parsed = parseWowheadBisHtml(html);
  assert.equal(parsed.currentSeason, true);
  assert.equal(parsed.bis.length, 2);
  assert.equal(parsed.bis[0].source.kind, 'raid');
  assert.equal(parsed.bis[1].source.instance, 'Temple of Sethraliss');
  assert.equal(parsed.bis[1].itemId, 1002);
});

test('rejects a stale Season 1 guide from current-season use', () => {
  const html = `
    <h3>Best in Slot Gear for Restoration Druid</h3>
    <p>Season 1 - The Dreamrift, The Voidspire, The March on Quel'Danas</p>
    <table><tr><td>Ring</td><td>Old Ring</td><td>Sporefall (Raid)</td></tr></table>
  `;
  const parsed = parseWowheadBisHtml(html);
  assert.equal(parsed.currentSeason, false);
});

test('Wowhead source summary counts current raid and dungeon BiS targets', () => {
  const payload = {
    state: 'ok', currentSeason: true,
    bis: [
      { itemName: 'Raid Helm', source: { kind: 'raid', instance: 'The Venomous Abyss' } },
      { itemName: 'Dungeon Ring', source: { kind: 'dungeon', instance: 'Temple of Sethraliss' } },
    ],
    mythicPlus: [],
  };
  assert.equal(usableWowheadGuide(payload), true);
  const summary = wowheadSourceSummary(payload);
  assert.equal(summary.raid, 1);
  assert.equal(summary.dungeons.get('temple of sethraliss').bis, 1);
});

test('Wowhead BiS source increases a matching dungeon farming score', () => {
  const payload = {
    state: 'ok', currentSeason: true,
    bis: [{ itemName: 'Dungeon Ring', source: { kind: 'dungeon', instance: 'Temple of Sethraliss' } }],
    mythicPlus: [],
  };
  const result = annotateDungeonLootWithWowhead([
    { name: 'Temple of Sethraliss', rawGearOpportunity: 20, gearOpportunity: 50, matchedSlots: 1 },
    { name: 'Ruby Life Pools', rawGearOpportunity: 30, gearOpportunity: 100, matchedSlots: 1 },
  ], payload);
  const temple = result.find((d) => d.name === 'Temple of Sethraliss');
  assert.equal(temple.wowheadBisTargets, 1);
  assert.equal(temple.rawGearOpportunity, 34);
  assert.equal(result[0].name, 'Temple of Sethraliss');
});