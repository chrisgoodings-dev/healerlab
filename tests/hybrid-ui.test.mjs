import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('hybrid healer dashboard keeps core anchors and Midnight 12.1 additions', () => {
  const html = readFileSync('public/index.html', 'utf8');
  const js = readFileSync('public/js/app.js', 'utf8');
  const css = readFileSync('public/styles.css', 'utf8');

  for (const marker of [
    'id="hero-title"',
    'id="class-summary-title"',
    'id="overview-stat-alignment"',
    'id="encounters"',
    'class="dungeon-list encounter-grid"',
    'id="playbook"',
    'id="spell-priority-list"',
    'id="rotation-list"',
    'id="season-summary-title"',
  ]) {
    assert.ok(html.includes(marker), `missing UI marker: ${marker}`);
  }

  // Do not lock the regression test to a complete function parameter list.
  // Season-aware rendering legitimately adds parameters over time.
  assert.ok(js.includes('SPEC_SUMMARIES'), 'spec summary mapping is missing');
  assert.ok(js.includes('applyClassPresentation'), 'class presentation function is missing');
  assert.ok(
    /function\s+renderDungeons\s*\(/.test(js),
    'encounter card renderer is missing'
  );
  assert.ok(js.includes('renderPlaybook'), 'healer playbook renderer is missing');
  assert.ok(js.includes('renderSeasonSummary'), 'Season 2 summary renderer is missing');

  assert.ok(css.includes('HealerLab hybrid visual system'), 'hybrid theme CSS marker is missing');
  assert.ok(css.includes('--class-accent'), 'class accent token is missing');
  assert.ok(
    css.includes('BEGIN MIDNIGHT-12-1-PREMIUM-UI'),
    'Midnight 12.1 premium UI marker is missing'
  );
});