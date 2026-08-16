import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalysis, dungeonOpportunities, gearWeaknesses, getCurrentScore } from '../public/js/analysis.js';
import { demoCharacter } from '../public/js/demo-data.js';

test('reads the current all-role Mythic+ score', () => {
  assert.equal(getCurrentScore(demoCharacter), 2846.2);
});

test('ranks weaker dungeon profiles above stronger ones', () => {
  const opportunities = dungeonOpportunities(demoCharacter);
  assert.ok(opportunities.length >= 2);
  assert.ok(opportunities[0].opportunity >= opportunities.at(-1).opportunity);
  assert.notEqual(opportunities[0].shortName, 'EDA');
});

test('finds below-average gear slots', () => {
  const weak = gearWeaknesses(demoCharacter);
  assert.ok(weak.length > 0);
  assert.ok(weak[0].belowAverage >= weak.at(-1).belowAverage || weak[0].important);
});

test('buildAnalysis calculates score gap and produces recommendations', () => {
  const analysis = buildAnalysis(demoCharacter, { targetScore: 3200, focus: 'balanced' });
  assert.equal(Math.round(analysis.scoreGap), 354);
  assert.ok(analysis.recommendations.length > 0);
  assert.equal(analysis.recommendations[0].rank, 1);
});
