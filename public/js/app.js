import { fetchCharacter } from './api.js';
import { buildAnalysis } from './analysis.js';
import { demoCharacter } from './demo-data.js';

const $ = (selector) => document.querySelector(selector);
const form = $('#character-form');
const formMessage = $('#form-message');
const results = $('#results');
const loading = $('#loading');
const dashboard = $('#dashboard');
const submitButton = form.querySelector('button[type="submit"]');
let activeController = null;

function clean(value) {
  return String(value ?? '').trim();
}

function validateForm() {
  const realm = clean($('#realm').value);
  const character = clean($('#character').value);
  if (realm.length < 2) return 'Enter a valid realm name.';
  if (character.length < 2) return 'Enter a valid character name.';
  if (!/^[\p{L}\p{N}' -]+$/u.test(realm)) return 'Realm contains unsupported characters.';
  if (!/^[\p{L}\p{N}'-]+$/u.test(character)) return 'Character name contains unsupported characters.';
  return '';
}

function setState(state, message = '') {
  results.classList.toggle('is-hidden', state === 'idle');
  loading.classList.toggle('is-hidden', state !== 'loading');
  dashboard.classList.toggle('is-hidden', state !== 'ready');
  submitButton.disabled = state === 'loading';
  formMessage.textContent = message;
  formMessage.classList.toggle('error', state === 'error');
}

function renderRaid(raids) {
  const container = $('#raid-progress');
  if (!raids.length) {
    container.className = 'raid-progress empty-state';
    container.textContent = 'No current public raid progression was returned.';
    return;
  }
  container.className = 'raid-progress';
  container.innerHTML = raids.map((raid) => `
    <div class="raid-row">
      <strong>${escapeHtml(raid.name)}</strong>
      <span>${escapeHtml(raid.summary)}</span>
    </div>
  `).join('');
}

function renderDungeons(dungeons) {
  const container = $('#dungeon-list');
  if (!dungeons.length) {
    container.innerHTML = '<p class="empty-state">No Mythic+ best-run data was returned.</p>';
    return;
  }
  container.innerHTML = dungeons.map((run) => `
    <div class="dungeon-row">
      <div class="dungeon-name"><strong>${escapeHtml(run.shortName)}</strong><span>${escapeHtml(run.dungeon)}</span></div>
      <span class="key-level">+${run.level}</span>
      <span class="score-value">${run.score.toFixed(1)}</span>
    </div>
  `).join('');
}

function renderGear(gear) {
  const container = $('#gear-list');
  if (!gear.length) {
    container.innerHTML = '<p class="empty-state">No detailed equipment data was returned.</p>';
    return;
  }
  container.innerHTML = gear.map((item) => `
    <div class="gear-row">
      <div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.name)} | ${item.belowAverage.toFixed(0)} ilvl below ${item.baseline.toFixed(1)} equipped average</span></div>
      <span class="gear-ilvl">${item.itemLevel}</span>
    </div>
  `).join('');
}

function renderLootPlanner(dungeons, { version, keyLevel, dropItemLevel } = {}) {
  const bestContainer = $('#best-loot-farm');
  const ranking = $('#loot-ranking');
  const versionElement = $('#loot-version');
  const best = dungeons[0];

  versionElement.textContent = `Season 2 | +${keyLevel} drops ${dropItemLevel}`;

  if (!best || best.gearOpportunity <= 0) {
    bestContainer.className = 'best-loot-farm';
    bestContainer.innerHTML = `
      <div class="loot-best-copy">
        <span class="loot-best-label">NO ITEM-LEVEL UPGRADE FOUND</span>
        <h4>No weak slot is improved at +${keyLevel}</h4>
        <p>Raise the farm key level or improve the loot model with item effects/stat weights if item level alone no longer separates upgrades.</p>
      </div>
    `;
    ranking.innerHTML = dungeons.map((dungeon, index) => `
      <div class="loot-dungeon-row">
        <span class="loot-rank">${index + 1}</span>
        <div><strong>${escapeHtml(dungeon.name)}</strong><span>0 weak-slot upgrades at item level ${dungeon.dropItemLevel}</span></div>
        <strong>0</strong>
      </div>
    `).join('');
    return;
  }

  const targetSummary = best.slotMatches
    .slice(0, 4)
    .map((match) => `${match.targetLabel} +${match.upgradeDelta}`)
    .join(', ');

  const topItems = best.matches.slice(0, 5).map((match) => `
    <li>
      <strong>${escapeHtml(match.itemName)}</strong>
      <span>${escapeHtml(match.targetLabel)} | ${match.currentItemLevel} -> ${match.dropItemLevel} (+${match.upgradeDelta} ilvl)</span>
    </li>
  `).join('');

  bestContainer.className = 'best-loot-farm';
  bestContainer.innerHTML = `
    <div class="loot-best-copy">
      <span class="loot-best-label">BEST GEAR FARM AT +${keyLevel}</span>
      <h4>${escapeHtml(best.name)}</h4>
      <p>Targets ${best.matchedSlots} weak slot${best.matchedSlots === 1 ? '' : 's'}${targetSummary ? `: ${escapeHtml(targetSummary)}` : ''}.</p>
      <ul class="loot-match-list">${topItems}</ul>
    </div>
    <div class="loot-score"><strong>${Math.round(best.gearOpportunity)}</strong><span>/ 100</span></div>
  `;

  ranking.innerHTML = dungeons.map((dungeon, index) => `
    <div class="loot-dungeon-row">
      <span class="loot-rank">${index + 1}</span>
      <div>
        <strong>${escapeHtml(dungeon.name)}</strong>
        <span>${dungeon.matchedSlots} weak-slot upgrade${dungeon.matchedSlots === 1 ? '' : 's'} | ${dungeon.matchingDrops} matching drop${dungeon.matchingDrops === 1 ? '' : 's'}</span>
      </div>
      <strong>${Math.round(dungeon.gearOpportunity)}</strong>
    </div>
  `).join('');

  $('#loot-disclaimer').textContent = `Season 2 loot snapshot ${version}. Score uses actual +${keyLevel} end-of-dungeon item level (${dropItemLevel}), weak-slot coverage and item-level gain. It does not model drop probability, secondary-stat value, embellishments, or Best-in-Slot effects.`;
}

function renderRecommendations(recommendations) {
  $('#recommendations').innerHTML = recommendations.map((item) => `
    <article class="recommendation">
      <div class="recommendation-rank">${item.rank}</div>
      <div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.detail)}</p></div>
      <div class="priority"><strong>${escapeHtml(item.label)}</strong><span>priority</span></div>
    </article>
  `).join('');
}

function renderCharacter(character, options) {
  const analysis = buildAnalysis(character, options);
  const score = analysis.currentScore;
  const target = analysis.targetScore;
  const progressPct = Math.round(analysis.progress * 100);
  const itemLevel = Number(character?.gear?.item_level_equipped || character?.gear?.item_level_total || 0);

  $('#character-name').textContent = character.name || 'Unknown character';
  $('#character-role').textContent = character.active_spec_role || 'HEALER';
  $('#character-meta').textContent = [character.realm, character.class, character.active_spec_name].filter(Boolean).join(' | ');
  $('#item-level').textContent = itemLevel ? itemLevel.toFixed(1) : '-';
  $('#mythic-score').textContent = score ? Math.round(score).toLocaleString() : '0';
  $('#score-gap').textContent = analysis.scoreGap ? Math.round(analysis.scoreGap).toLocaleString() : 'Goal met';
  $('#target-label').textContent = target.toLocaleString();
  $('#score-percent').textContent = `${progressPct}%`;
  $('#score-meter').style.width = `${Math.min(100, progressPct)}%`;
  $('#score-ring').style.setProperty('--progress', `${Math.min(360, analysis.progress * 360)}deg`);

  if (analysis.scoreGap > 0) {
    $('#score-summary').textContent = `You are ${Math.round(analysis.scoreGap).toLocaleString()} rating from the target. The planner favours weaker dungeons where progression is less developed.`;
    $('#score-detail').textContent = `${Math.round(score).toLocaleString()} current rating | ${target.toLocaleString()} target`;
  } else {
    $('#score-summary').textContent = 'You have met or exceeded this target. Raise the goal to keep the progression analysis useful.';
    $('#score-detail').textContent = `${Math.round(score).toLocaleString()} current rating`;
  }

  const initials = (character.name || 'HL').slice(0, 2).toUpperCase();
  const avatar = $('#avatar');
  avatar.textContent = initials;
  avatar.style.backgroundImage = character.thumbnail_url ? `url("${encodeURI(character.thumbnail_url)}")` : '';

  const profileLink = $('#profile-link');
  profileLink.href = character.profile_url || 'https://raider.io/';

  renderRaid(analysis.raids);
  renderDungeons(analysis.dungeons);
  renderGear(analysis.weakGear);
  renderLootPlanner(analysis.lootDungeons, {
    version: analysis.lootDataVersion,
    keyLevel: analysis.farmKeyLevel,
    dropItemLevel: analysis.farmDropItemLevel,
  });
  renderRecommendations(analysis.recommendations);

  const runCount = analysis.runs.length;
  const gearCount = analysis.weakGear.length;
  const focusLabel = {
    balanced: 'Balanced progression',
    score: 'Mythic+ score',
    gear: 'Gear efficiency',
  }[analysis.focus] || 'Balanced progression';

  const farmName = analysis.bestGearFarm?.gearOpportunity > 0 ? analysis.bestGearFarm.name : 'no current farm';
  $('#method-summary').textContent = `${focusLabel} mode compared ${runCount} best dungeon runs, your ${score.toFixed(1)} rating and ${gearCount} performance slots below your equipped-item average. The gear farm planner matched those weak slots against the curated Midnight Season 2 healer loot pool at +${analysis.farmKeyLevel} (item level ${analysis.farmDropItemLevel}); its current top result is ${farmName}. Opportunity scores are normalised within their category. Cosmetic slots are excluded. This is an item-level progression heuristic, not a Best-in-Slot or healing-throughput simulation.`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function currentOptions() {
  return {
    focus: $('#focus').value,
    targetScore: Number($('#target-score').value) || 0,
    farmKeyLevel: Number($('#farm-key-level').value) || 10,
  };
}

async function analyseLiveCharacter(event) {
  event.preventDefault();
  const error = validateForm();
  if (error) {
    setState('error', error);
    return;
  }

  activeController?.abort();
  activeController = new AbortController();
  setState('loading', 'Contacting Raider.IO through the HealerLab API...');

  try {
    const character = await fetchCharacter({
      region: $('#region').value,
      realm: clean($('#realm').value),
      character: clean($('#character').value),
    }, { signal: activeController.signal });

    renderCharacter(character, currentOptions());
    setState('ready', `Analysis generated from Raider.IO data retrieved ${new Date().toLocaleTimeString()}.`);
    dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    if (error?.name === 'AbortError') return;
    setState('error', `${error.message} You can use "Load example" to preview the analysis engine.`);
  }
}

form.addEventListener('submit', analyseLiveCharacter);

$('#demo-button').addEventListener('click', () => {
  $('#character').value = demoCharacter.name;
  $('#realm').value = demoCharacter.realm;
  $('#region').value = demoCharacter.region;
  renderCharacter(demoCharacter, currentOptions());
  setState('ready', 'Example data loaded locally. Submit a real character to make the external API call.');
  dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

if (new URLSearchParams(location.search).get('demo') === '1') {
  $('#demo-button').click();
}