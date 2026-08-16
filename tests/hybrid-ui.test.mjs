import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('hybrid healer dashboard keeps the class hero, overview stats and encounter planner anchors', () => {
  const html = readFileSync('public/index.html', 'utf8');
  const js = readFileSync('public/js/app.js', 'utf8');
  const css = readFileSync('public/styles.css', 'utf8');

  for (const marker of [
    'id="hero-title"',
    'id="class-summary-title"',
    'id="overview-stat-alignment"',
    'id="encounters"',
    'class="dungeon-list encounter-grid"',
  ]) {
    assert.ok(html.includes(marker), `missing UI marker: ${marker}`);
  }

  assert.ok(js.includes('SPEC_SUMMARIES'), 'spec summary mapping is missing');
  assert.ok(js.includes('applyClassPresentation'), 'class presentation function is missing');
  assert.ok(js.includes('renderDungeons(dungeons, lootDungeons = [])'), 'encounter card renderer is missing');
  assert.ok(css.includes('HealerLab hybrid visual system'), 'hybrid theme CSS marker is missing');
  assert.ok(css.includes('--class-accent'), 'class accent token is missing');
});
