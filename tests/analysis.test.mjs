import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAnalysis,
  buildRecommendations,
  dungeonOpportunities,
  gearWeaknesses,
  getCurrentScore,
  normaliseGear
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

test('buildAnalysis calculates score gap and produces recommendations', () => {
  const analysis = buildAnalysis(demoCharacter, { targetScore: 3200, focus: 'balanced' });
  assert.equal(Math.round(analysis.scoreGap), 354);
  assert.equal(analysis.focus, 'balanced');
  assert.ok(analysis.recommendations.length > 0);
  assert.equal(analysis.recommendations[0].rank, 1);
});