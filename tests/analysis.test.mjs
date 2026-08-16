import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildAnalysis,
  buildRecommendations,
  dungeonLootOpportunities,
  dungeonOpportunities,
  gearWeaknesses,
  getCurrentScore,
  normaliseGear,
  usableLootForCharacter
} from '../public/js/analysis.js';
import { demoCharacter } from '../public/js/demo-data.js';

test('reads the current all-role Mythic+ score', () => {
  assert.equal(getCurrentScore(demoCharacter), 2846.2);
});

test('ranks weaker dungeon profiles above stronger ones with normalised scores', () => {
  const opportunities = dungeonOpportunities(demoCharacter);
  assert.ok(opportunities.length >= 2);
  assert.ok(opportunities[0].opportunity >= opportunities.at(-1).opportunity);
  assert.equal(Math.round(opportunities[0].opportunity), 100);
  assert.ok(opportunities.every((run) => run.opportunity >= 0 && run.opportunity <= 100));
  assert.notEqual(opportunities[0].shortName, 'EDA');
});

test('finds below-average performance gear slots', () => {
  const weak = gearWeaknesses(demoCharacter);
  assert.ok(weak.length > 0);
  assert.equal(Math.round(weak[0].priority), 100);
  assert.ok(weak.every((item) => item.belowAverage >= 0.5));
  assert.ok(weak.every((item) => item.priority >= 0 && item.priority <= 100));
});

test('excludes cosmetic shirt and tabard slots from gear analysis', () => {
  const character = structuredClone(demoCharacter);
  character.gear.items.shirt = { item_level: 1, name: 'Cosmetic Shirt' };
  character.gear.items.tabard = { item_level: 999, name: 'Cosmetic Tabard' };

  const gear = normaliseGear(character);
  const slots = new Set(gear.map((item) => item.slot));

  assert.equal(slots.has('shirt'), false);
  assert.equal(slots.has('tabard'), false);

  const weak = gearWeaknesses(character);
  assert.equal(weak.some((item) => item.slot === 'shirt' || item.slot === 'tabard'), false);
});

test('uses the equipped item level as the gear comparison baseline', () => {
  const weak = gearWeaknesses(demoCharacter);
  assert.ok(weak.length > 0);
  assert.ok(weak.every((item) => item.baseline === demoCharacter.gear.item_level_equipped));
});

test('focus modes create materially different recommendation mixes', () => {
  const score = buildRecommendations(demoCharacter, { targetScore: 3200, focus: 'score' });
  const gear = buildRecommendations(demoCharacter, { targetScore: 3200, focus: 'gear' });
  const balanced = buildRecommendations(demoCharacter, { targetScore: 3200, focus: 'balanced' });

  const count = (items, type) => items.filter((item) => item.type === type).length;

  assert.ok(count(score, 'dungeon') > count(score, 'gear'));
  assert.ok(count(gear, 'gear') > count(gear, 'dungeon'));
  assert.ok(count(balanced, 'dungeon') >= 2);
  assert.ok(count(balanced, 'gear') >= 2);
});


test('Season 2 loot planner ranks all eight confirmed dungeons', () => {
  const opportunities = dungeonLootOpportunities(demoCharacter, { keyLevel: 10 });
  assert.equal(opportunities.length, 8);
  assert.ok(opportunities.every((dungeon) => dungeon.gearOpportunity >= 0 && dungeon.gearOpportunity <= 100));
  assert.ok(opportunities.some((dungeon) => dungeon.gearOpportunity > 0));
  assert.equal(Math.round(opportunities[0].gearOpportunity), 100);
  assert.equal(opportunities[0].dropItemLevel, 311);
});

test('loot filtering gives a druid only leather armor plus universally usable items', () => {
  const loot = usableLootForCharacter(demoCharacter);
  const armorItems = loot.flatMap((dungeon) => dungeon.items).filter((item) => item.armor);
  assert.ok(armorItems.length > 0);
  assert.ok(armorItems.every((item) => item.armor === 'leather'));
});

test('loot planner only counts drops that are actual item-level upgrades at the selected key', () => {
  const lowKey = dungeonLootOpportunities(demoCharacter, { keyLevel: 2 });
  const highKey = dungeonLootOpportunities(demoCharacter, { keyLevel: 10 });

  assert.ok(highKey.some((dungeon) => dungeon.matchedSlots > 0));
  assert.ok(
    highKey.reduce((sum, dungeon) => sum + dungeon.matchedSlots, 0) >=
    lowKey.reduce((sum, dungeon) => sum + dungeon.matchedSlots, 0)
  );

  for (const dungeon of highKey) {
    assert.ok(dungeon.matches.every((match) => match.dropItemLevel > match.currentItemLevel));
    assert.ok(dungeon.matches.every((match) => match.upgradeDelta > 0));
  }
});

test('dungeons with a matching weak leather wrist are recognized for a restoration druid', () => {
  const character = structuredClone(demoCharacter);
  character.gear.item_level_equipped = 303;
  for (const item of Object.values(character.gear.items)) item.item_level = 303;
  character.gear.items.wrist.item_level = 290;

  const opportunities = dungeonLootOpportunities(character, { keyLevel: 10 });
  const murderRow = opportunities.find((dungeon) => dungeon.shortName === 'MR');
  const blindingVale = opportunities.find((dungeon) => dungeon.shortName === 'TBV');
  const kingsRest = opportunities.find((dungeon) => dungeon.shortName === 'KR');

  assert.ok(murderRow.slotMatches.some((match) => match.targetSlot === 'wrist'));
  assert.ok(blindingVale.slotMatches.some((match) => match.targetSlot === 'wrist'));
  assert.ok(kingsRest.slotMatches.some((match) => match.targetSlot === 'wrist'));
});

test('gear focus surfaces dungeon farm recommendations while score focus stays rating-led', () => {
  const score = buildRecommendations(demoCharacter, { targetScore: 3200, focus: 'score', farmKeyLevel: 10 });
  const gear = buildRecommendations(demoCharacter, { targetScore: 3200, focus: 'gear', farmKeyLevel: 10 });

  assert.equal(score.filter((item) => item.type === 'farm').length, 0);
  assert.ok(gear.filter((item) => item.type === 'farm').length >= 1);
});

test('UI source files contain no known mojibake markers', () => {
  for (const file of ['public/js/app.js', 'public/index.html']) {
    const text = readFileSync(file, 'utf8');
    const badMarkers = [
      String.fromCharCode(0x00C2),
      String.fromCharCode(0x00E2, 0x20AC),
      String.fromCharCode(0x00E2, 0x20AC, 0x00A6),
      String.fromCharCode(0x00E2, 0x20AC, 0x0153),
      String.fromCharCode(0x00E2, 0x2020),
    ];
    for (const bad of badMarkers) {
      assert.equal(text.includes(bad), false, `${file} contains a mojibake marker`);
    }
  }
});

test('buildAnalysis calculates score gap and produces recommendations', () => {
  const analysis = buildAnalysis(demoCharacter, { targetScore: 3200, focus: 'balanced' });
  assert.equal(Math.round(analysis.scoreGap), 354);
  assert.equal(analysis.focus, 'balanced');
  assert.ok(analysis.recommendations.length > 0);
  assert.equal(analysis.recommendations[0].rank, 1);
  assert.equal(analysis.lootDungeons.length, 8);
  assert.equal(analysis.farmKeyLevel, 10);
  assert.equal(analysis.farmDropItemLevel, 311);
});