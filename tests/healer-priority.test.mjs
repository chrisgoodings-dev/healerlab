import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HEALER_PLAYBOOKS,
  getHealerPlaybook,
} from '../public/js/healer-priority.js';

test('all seven healer specialisations have raid and Mythic+ playbooks', () => {
  const specs = Object.keys(HEALER_PLAYBOOKS);
  assert.equal(specs.length, 7);

  for (const spec of specs) {
    for (const context of ['mythic_plus', 'raid']) {
      const book = HEALER_PLAYBOOKS[spec][context];
      assert.ok(book);
      assert.ok(book.priority.length >= 5, `${spec} ${context} needs a useful priority list`);
      assert.ok(book.rotation.length >= 3, `${spec} ${context} needs a useful response pattern`);
      assert.ok(book.cooldowns.length >= 1, `${spec} ${context} needs cooldown guidance`);
    }
  }
});

test('character context resolves to the correct healer playbook', () => {
  const disc = getHealerPlaybook({
    class: 'Priest',
    active_spec_name: 'Discipline',
  }, 'raid');

  assert.equal(disc.spec, 'Discipline Priest');
  assert.equal(disc.contextLabel, 'Raid');
  assert.equal(disc.patch, '12.1');

  const druid = getHealerPlaybook({
    class: 'Druid',
    active_spec_name: 'Restoration',
  }, 'mythic_plus');

  assert.equal(druid.spec, 'Restoration Druid');
  assert.equal(druid.contextLabel, 'Mythic+');
});