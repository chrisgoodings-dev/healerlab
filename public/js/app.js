import { fetchCharacter, fetchOfficialSeasonLoot } from './api.js';
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

  container.innerHTML = gear.map((item) => {
    const icon = item.iconUrl
      ? `<img class="gear-icon" src="${escapeHtml(item.iconUrl)}" alt="" loading="lazy" />`
      : `<span class="gear-icon gear-icon-fallback" aria-hidden="true">${escapeHtml(item.label.slice(0, 1))}</span>`;
    const source = item.source === 'blizzard' ? 'Official Blizzard equipment' : 'Raider.IO equipment';

    return `
      <div class="gear-row">
        <div class="gear-item-main">
          ${icon}
          <div class="gear-copy">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(item.name)} | ${item.belowAverage.toFixed(0)} ilvl below ${item.baseline.toFixed(1)} equipped average</span>
            <small class="gear-source">${escapeHtml(source)}${item.itemId ? ` | Item ${item.itemId}` : ''}</small>
          </div>
        </div>
        <span class="gear-ilvl">${item.itemLevel}</span>
      </div>
    `;
  }).join('');
}

function renderStatAlignment(alignment) {
  const score = $('#stat-alignment-score');
  const summary = $('#stat-alignment-summary');
  const rows = $('#stat-alignment-rows');
  const note = $('#stat-alignment-note');

  if (!alignment?.available) {
    score.className = 'stat-alignment-score neutral';
    score.textContent = '-';
    summary.className = 'stat-alignment-summary empty-state';
    summary.textContent = alignment?.reason || 'No secondary-stat reference is available.';
    rows.innerHTML = '';
    note.textContent = '';
    return;
  }

  score.className = `stat-alignment-score ${alignment.status}`;
  score.textContent = `${Math.round(alignment.score)}/100`;

  const suggestedOrder = alignment.rows.map((row) => row.label).join(' > ');
  summary.className = 'stat-alignment-summary';
  summary.textContent = `${alignment.profile.context} target | Suggested order: ${suggestedOrder}`;

  rows.innerHTML = alignment.rows.map((row) => {
    const deltaPoints = row.delta * 100;
    const sign = deltaPoints > 0 ? '+' : '';
    const state = row.balanceStatus === 'within'
      ? 'IN RANGE'
      : row.balanceStatus === 'below'
        ? 'BELOW TARGET'
        : 'ABOVE TARGET';

    return `
      <div class="stat-alignment-row stat-${escapeHtml(row.stat)} balance-${escapeHtml(row.balanceStatus)}">
        <div class="stat-name stat-${escapeHtml(row.stat)}">
          <strong>${escapeHtml(row.label)}</strong>
          <span class="stat-current">${Math.round(row.rating).toLocaleString()} (${(row.currentShare * 100).toFixed(2)}%)</span>
        </div>
        <div class="stat-target">
          <span>Suggested share</span>
          <strong>${(row.targetShare * 100).toFixed(2)}%</strong>
        </div>
        <div class="stat-gap ${escapeHtml(row.balanceStatus)}">
          <strong>${sign}${deltaPoints.toFixed(1)}pp</strong>
          <span>${state}</span>
        </div>
      </div>
    `;
  }).join('');

  note.textContent = `Reference snapshot ${alignment.profile.snapshot}. Stats are shown in the suggested priority order for the selected activity. Blue means more of that stat is suggested, green is within +/-4 percentage points of target, and red means the current allocation is above the suggested range. The stat names themselves use fixed Haste, Mastery, Critical Strike and Versatility colours.`;
}

function itemStatNames(stats) {
  if (!stats) return [];
  const labels = {
    crit: 'Crit',
    haste: 'Haste',
    mastery: 'Mastery',
    versatility: 'Versatility',
  };
  return Object.entries(labels)
    .filter(([key]) => Number(stats[key]) > 0)
    .map(([, label]) => label);
}

function renderLootPlanner(dungeons, { version, keyLevel, dropItemLevel } = {}) {
  const bestContainer = $('#best-loot-farm');
  const ranking = $('#loot-ranking');
  const versionElement = $('#loot-version');
  const best = dungeons[0];

  versionElement.textContent = `Season 2 | +${keyLevel} drops ${dropItemLevel}`;

  const instanceIcon = (dungeon, className = 'loot-instance-icon') => dungeon?.instanceIconUrl
    ? `<img class="${className}" src="${escapeHtml(dungeon.instanceIconUrl)}" alt="" loading="lazy" />`
    : `<span class="${className} loot-instance-icon-fallback" aria-hidden="true">${escapeHtml((dungeon?.shortName || '?').slice(0, 2))}</span>`;

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
        ${instanceIcon(dungeon, 'loot-instance-icon-small')}
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

  const recommendedMatches = best.recommendedMatches || best.matches || [];
  const topItems = recommendedMatches.slice(0, 5).map((match) => {
    const gearIcon = match.currentIconUrl
      ? `<img class="loot-gear-icon" src="${escapeHtml(match.currentIconUrl)}" alt="" loading="lazy" />`
      : '<span class="loot-gear-icon loot-gear-icon-fallback" aria-hidden="true">+</span>';
    const official = match.itemId ? ` | Blizzard item ${match.itemId}` : '';
    const stats = itemStatNames(match.itemSecondaryStats);
    const fitScore = Number(match.statFitScore) || 0;
    const fitSign = fitScore > 0 ? '+' : '';
    const alignmentChange = match.replacementAnalysisAvailable
      ? ` | alignment ${Number(match.projectedAlignmentScore).toFixed(1)}/100 (${match.alignmentGain >= 0 ? '+' : ''}${Number(match.alignmentGain).toFixed(1)})`
      : '';
    const fit = match.statFitLabel && match.statFitLabel !== 'No stat signal'
      ? `<small class="loot-stat-fit ${escapeHtml(match.statFitStatus || 'neutral')}">${stats.length ? `${escapeHtml(stats.join(' / '))} | ` : ''}${escapeHtml(match.statFitLabel)} (${fitSign}${Math.round(fitScore)})${escapeHtml(alignmentChange)}</small>`
      : '';

    return `
      <li>
        ${gearIcon}
        <div>
          <strong>${escapeHtml(match.itemName)}</strong>
          <span>Recommended ${escapeHtml(match.targetLabel)} target | ${match.currentItemLevel} -> ${match.dropItemLevel} (+${match.upgradeDelta} ilvl)${official}</span>
          ${fit}
        </div>
      </li>
    `;
  }).join('');

  bestContainer.className = 'best-loot-farm';
  bestContainer.innerHTML = `
    <div class="loot-instance-feature">
      ${instanceIcon(best)}
      <div class="loot-best-copy">
        <span class="loot-best-label">BEST GEAR FARM AT +${keyLevel}</span>
        <h4>${escapeHtml(best.name)}</h4>
        <p>Targets ${best.matchedSlots} weak slot${best.matchedSlots === 1 ? '' : 's'}${targetSummary ? `: ${escapeHtml(targetSummary)}` : ''}.</p>
        <small class="loot-official-source">${best.officialSource ? 'Blizzard Journal instance + item IDs' : 'Curated fallback identity data'}</small>
        <ul class="loot-match-list">${topItems}</ul>
      </div>
    </div>
    <div class="loot-score"><strong>${Math.round(best.gearOpportunity)}</strong><span>/ 100</span></div>
  `;

  ranking.innerHTML = dungeons.map((dungeon, index) => `
    <div class="loot-dungeon-row">
      <span class="loot-rank">${index + 1}</span>
      ${instanceIcon(dungeon, 'loot-instance-icon-small')}
      <div>
        <strong>${escapeHtml(dungeon.name)}</strong>
        <span>${dungeon.matchedSlots} recommended target${dungeon.matchedSlots === 1 ? '' : 's'}${Number(dungeon.candidateDrops) > dungeon.matchedSlots ? ` | ${dungeon.candidateDrops} candidates compared` : ''}${dungeon.journalInstanceId ? ` | Journal ${dungeon.journalInstanceId}` : ''}</span>
      </div>
      <strong>${Math.round(dungeon.gearOpportunity)}</strong>
    </div>
  `).join('');

  const officialCount = dungeons.filter((dungeon) => dungeon.officialSource).length;
  const statAdjusted = dungeons.some((dungeon) => dungeon.statAlignmentAvailable);
  $('#loot-disclaimer').textContent = `Season 2 loot snapshot ${version}. ${officialCount}/${dungeons.length} dungeon identities were enriched from the Blizzard Journal API. For each weak slot, HealerLab compares every eligible drop and recommends only the candidate with the strongest combined item-level and stat-balance replacement value. Score uses +${keyLevel} end-of-dungeon item level (${dropItemLevel}), weak-slot severity and coverage${statAdjusted ? ', with secondary-stat replacement value capped to a +/-25% modifier so item level remains dominant' : ''}. Curated healer eligibility remains a safety layer.`;
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
  const apiSourceLabel = $('#api-source-label');
  if (apiSourceLabel) {
    const equipmentOk = character?.healerlab_sources?.blizzard === 'ok';
    const journalOk = character?.healerlab_sources?.blizzard_journal === 'ok';
    apiSourceLabel.textContent = equipmentOk && journalOk
      ? 'Raider.IO + Blizzard Equipment + Journal'
      : equipmentOk
        ? 'Raider.IO + Blizzard Equipment'
        : 'Raider.IO';
  }
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
  renderStatAlignment(analysis.statAlignment);
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
  const statMethod = analysis.statAlignment?.available
    ? ` Secondary-stat alignment is ${Math.round(analysis.statAlignment.score)}/100 against the ${analysis.statAlignment.profile.context} observed reference profile. Blizzard item stat composition can modify otherwise comparable gear opportunities by at most +/-25%.`
    : ' Secondary-stat alignment was unavailable and did not affect gear priority.';
  $('#method-summary').textContent = `${focusLabel} mode compared ${runCount} best dungeon runs, your ${score.toFixed(1)} rating and ${gearCount} performance slots below your equipped-item average. The gear farm planner matched those weak slots against the Midnight Season 2 healer loot pool, enriched with Blizzard Journal instance and item identity data when available at +${analysis.farmKeyLevel} (item level ${analysis.farmDropItemLevel}); its current top result is ${farmName}.${statMethod} Equipment data source: ${character?.healerlab_sources?.blizzard === 'ok' ? 'official Blizzard Character Equipment API' : 'Raider.IO fallback'}. Cosmetic slots are excluded. This remains an explainable progression heuristic, not a Best-in-Slot or healing-throughput simulation.`;
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
    statContext: $('#stat-context').value === 'raid' ? 'raid' : 'mythic_plus',
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
  setState('loading', 'Contacting Raider.IO and Blizzard through the HealerLab API...');

  try {
    const region = $('#region').value;
    const [character, officialLoot] = await Promise.all([
      fetchCharacter({
        region,
        realm: clean($('#realm').value),
        character: clean($('#character').value),
      }, { signal: activeController.signal }),
      fetchOfficialSeasonLoot(region, { signal: activeController.signal }),
    ]);

    character.official_dungeon_loot = officialLoot.dungeons;
    character.healerlab_sources = {
      ...(character.healerlab_sources || {}),
      blizzard_journal: officialLoot.resolved > 0 ? 'ok' : 'fallback',
    };

    renderCharacter(character, currentOptions());
    const sourceName = character?.healerlab_sources?.blizzard === 'ok'
      ? 'Raider.IO + Blizzard'
      : 'Raider.IO';
    setState('ready', `Analysis generated from ${sourceName} data at ${new Date().toLocaleTimeString()}.`);
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
