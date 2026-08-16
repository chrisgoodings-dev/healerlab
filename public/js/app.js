import { fetchCharacter, fetchOfficialSeasonLoot } from './api.js';
import { buildAnalysis } from './analysis.js';
import { demoCharacter } from './demo-data.js';
import { setupItemTooltips } from './item-tooltips.js';

import { getHealerPlaybook } from './healer-priority.js';
import { MIDNIGHT_SEASON_2 } from './season-12-1.js';
const $ = (selector) => document.querySelector(selector);
const form = $('#character-form');
const formMessage = $('#form-message');
const results = $('#results');
const loading = $('#loading');
const dashboard = $('#dashboard');
const submitButton = form.querySelector('button[type="submit"]');
let activeController = null;

const CLASS_ACCENTS = Object.freeze({
  Druid: '#FF7D0A',
  Evoker: '#33937F',
  Monk: '#00FF98',
  Paladin: '#F48CBA',
  Priest: '#FFFFFF',
  Shaman: '#0070DD',
});

const SPEC_SUMMARIES = Object.freeze({
  'Restoration Druid': {
    title: 'Heal with nature. Shape the fight before damage lands.',
    text: 'Prioritise predictive HoT coverage, haste/mastery balance and dungeon drops that strengthen the stat profile your selected activity actually rewards.',
    glyph: '✦',
  },
  'Holy Paladin': {
    title: 'Heal with light. Lead with knowledge.',
    text: 'Build around deliberate cooldown windows, efficient spot healing and gear choices that preserve throughput without wasting secondary-stat budget.',
    glyph: '✧',
  },
  'Holy Priest': {
    title: 'Heal with light. Recover the group with purpose.',
    text: 'Use the planner to turn broad throughput into targeted progression, balancing haste, mastery and encounter coverage rather than chasing item level alone.',
    glyph: '✧',
  },
  'Discipline Priest': {
    title: 'Prevent damage. Convert preparation into control.',
    text: 'Disc rewards planning. Use stat alignment and encounter priorities to support reliable ramps, clean cooldown timing and efficient dungeon progression.',
    glyph: '◇',
  },
  'Restoration Shaman': {
    title: 'Restore with tide, storm and deliberate cooldowns.',
    text: 'Identify the dungeons and secondary-stat upgrades that improve consistency around major damage events while keeping your gearing decisions explainable.',
    glyph: '≈',
  },
  'Mistweaver Monk': {
    title: 'Heal in motion. Keep pressure and recovery in balance.',
    text: 'Use encounter opportunity and stat-fit data together so gearing supports the tempo, mobility and burst recovery that Mistweaver depends on.',
    glyph: '◉',
  },
  'Preservation Evoker': {
    title: 'Preserve with time. Position every cast with intent.',
    text: 'Prioritise progression that supports empowered healing, range discipline and efficient stat distribution across raid and Mythic+.',
    glyph: '◆',
  },
});

setupItemTooltips();

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
    container.textContent = 'No Midnight Season 2 raid content is available.';
    return;
  }

  container.className = 'raid-progress current-season-raid-progress';
  container.innerHTML = raids.map((raid) => `
    <div class="raid-row current-raid-row">
      <div class="raid-current-copy">
        <span class="current-content-type">${raid.isLair ? 'SEASON 2 LAIR' : 'SEASON 2 RAID'}</span>
        <strong>${escapeHtml(raid.name)}</strong>
      </div>
      <span>${escapeHtml(raid.summary)}</span>
    </div>
  `).join('');
}

function renderDungeons(dungeons, lootDungeons = [], seasonStatus = null) {
  const container = $('#dungeon-list');
  const normalise = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const lootByName = new Map();

  for (const dungeon of lootDungeons || []) {
    lootByName.set(normalise(dungeon.name), dungeon);
    lootByName.set(normalise(dungeon.shortName), dungeon);
  }

  const seasonNotice = seasonStatus && !seasonStatus.mythicPlusOpen
    ? `
      <div class="season-notice">
        <strong>Patch 12.1 pool loaded.</strong>
        Midnight Season 2 Mythic+ opens ${escapeHtml(seasonStatus.mythicPlusOpens)}.
        Outgoing Season 1 runs are intentionally ignored, so unrun Season 2 dungeons show as open progression targets.
      </div>
    `
    : `
      <div class="season-notice live">
        <strong>Midnight Season 2 is active.</strong>
        The progression map is restricted to the eight Patch 12.1 dungeons and current-season best runs.
      </div>
    `;

  const cards = dungeons.map((run, index) => {
    const loot = lootByName.get(normalise(run.dungeon)) || lootByName.get(normalise(run.shortName));
    const gearOpportunity = Math.round(Number(loot?.gearOpportunity) || 0);
    const scoreOpportunity = Math.round(Number(run.opportunity) || 0);
    const combined = Math.round((scoreOpportunity * 0.55) + (gearOpportunity * 0.45));

    const icon = loot?.instanceIconUrl
      ? `<img class="encounter-icon" src="${escapeHtml(loot.instanceIconUrl)}" alt="" loading="lazy" />`
      : `<span class="encounter-icon encounter-icon-fallback" aria-hidden="true">${escapeHtml(run.shortName.slice(0, 2))}</span>`;

    const progressLine = run.hasRun
      ? `Best +${run.level} | ${run.score.toFixed(1)} Season 2 score`
      : 'No Season 2 run recorded';

    const runLink = run.url
      ? `<a class="encounter-link" href="${escapeHtml(run.url)}" target="_blank" rel="noreferrer">Open run</a>`
      : '<span class="encounter-link muted">Current-season baseline needed</span>';

    const valueLabel = !run.hasRun
      ? 'OPEN TARGET'
      : combined >= 70
        ? 'HIGH VALUE'
        : combined >= 35
          ? 'USEFUL'
          : 'STABLE';

    return `
      <article class="encounter-card${index === 0 ? ' recommended' : ''}${run.hasRun ? '' : ' unrun'}">
        <div class="encounter-card-top">
          ${icon}
          <div class="encounter-rank">#${index + 1}</div>
        </div>
        <div class="encounter-copy">
          <span class="encounter-code">PATCH 12.1 | ${escapeHtml(run.shortName)}</span>
          <h4>${escapeHtml(run.dungeon)}</h4>
          <p>${escapeHtml(progressLine)}</p>
        </div>
        <div class="encounter-metrics">
          <span><small>Score opportunity</small><strong>${scoreOpportunity}</strong></span>
          <span><small>Gear opportunity</small><strong>${gearOpportunity}</strong></span>
        </div>
        <div class="encounter-footer">
          <span class="encounter-priority">${valueLabel}</span>
          ${runLink}
        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = seasonNotice + cards;
}

function itemTooltipAttributes({ itemId, region, name, itemLevel, stats = {} }) {
  const id = Number(itemId);
  if (!Number.isInteger(id) || id <= 0) return '';
  const attributes = [
    `data-item-tooltip-id="${id}"`,
    `data-item-tooltip-region="${escapeHtml(region || 'eu')}"`,
    `data-item-tooltip-name="${escapeHtml(name || 'Item')}"`,
    `data-item-tooltip-level="${Number(itemLevel) || 0}"`,
    `data-item-tooltip-crit="${Number(stats?.crit) || 0}"`,
    `data-item-tooltip-haste="${Number(stats?.haste) || 0}"`,
    `data-item-tooltip-mastery="${Number(stats?.mastery) || 0}"`,
    `data-item-tooltip-versatility="${Number(stats?.versatility) || 0}"`,
    'tabindex="0"',
    'role="button"',
    'aria-haspopup="true"',
    'aria-expanded="false"',
    `aria-label="View ${escapeHtml(name || 'item')} details"`,
  ];
  return attributes.join(' ');
}

function renderGear(gear, region) {
  const container = $('#gear-list');
  if (!gear.length) {
    container.innerHTML = '<p class="empty-state">No detailed equipment data was returned.</p>';
    return;
  }

  container.innerHTML = gear.map((item) => {
    const tooltipAttributes = itemTooltipAttributes({
      itemId: item.itemId,
      region,
      name: item.name,
      itemLevel: item.itemLevel,
      stats: item.secondaryStats,
    });
    const tooltipClass = item.itemId ? ' item-tooltip-trigger' : '';
    const icon = item.iconUrl
      ? `<img class="gear-icon${tooltipClass}" src="${escapeHtml(item.iconUrl)}" alt="" loading="lazy" ${tooltipAttributes} />`
      : `<span class="gear-icon gear-icon-fallback${tooltipClass}" ${tooltipAttributes}>${escapeHtml(item.label.slice(0, 1))}</span>`;
    const source = item.source === 'blizzard' ? 'Official Blizzard equipment' : 'Raider.IO equipment';
    const bisTarget = item.bisTargetName
      ? `<small class="gear-bis-target">Personal BiS: ${escapeHtml(item.bisTargetName)} | ${escapeHtml(item.bisTargetDungeon || "Season 2 dungeon")}${item.bisAlignmentGain > 0 ? ` | +${item.bisAlignmentGain.toFixed(1)} alignment` : ``}</small>`
      : '';

    return `
      <div class="gear-row">
        <div class="gear-item-main">
          ${icon}
          <div class="gear-copy">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(item.name)} | ${item.belowAverage.toFixed(0)} ilvl below ${item.baseline.toFixed(1)} equipped average</span>
            <small class="gear-source">${escapeHtml(source)}${item.itemId ? ` | Item ${item.itemId}` : ``}</small>
            ${bisTarget}
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

  const overviewScore = $('#overview-stat-alignment');

  if (!alignment?.available) {
    if (overviewScore) overviewScore.textContent = '-';
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
  if (overviewScore) overviewScore.textContent = `${Math.round(alignment.score)}/100`;

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

function renderLootPlanner(dungeons, { version, keyLevel, dropItemLevel, region } = {}) {
  const bestContainer = $('#best-loot-farm');
  const ranking = $('#loot-ranking');
  const versionElement = $('#loot-version');
  const best = dungeons[0];

  versionElement.textContent = `Midnight S2 | Patch 12.1 | +${keyLevel} drops ${dropItemLevel}`;

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
    const tooltipAttributes = itemTooltipAttributes({
      itemId: match.itemId,
      region,
      name: match.itemName,
      itemLevel: match.dropItemLevel,
      stats: match.itemSecondaryStats,
    });
    const gearIcon = match.itemId
      ? `<span class="loot-gear-icon loot-gear-icon-fallback item-tooltip-trigger" ${tooltipAttributes}>?</span>`
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
    const bisBadge = match.bisStatus
      ? `<span class="loot-bis-badge">${escapeHtml(match.bisStatus)}</span>`
      : '';

    return `
      <li>
        ${gearIcon}
        <div>
          <strong>${escapeHtml(match.itemName)}</strong>
          ${bisBadge}
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
        <span>${dungeon.matchedSlots} recommended target${dungeon.matchedSlots === 1 ? '' : 's'}${dungeon.bisTargets ? ` | ${dungeon.bisTargets} personal BiS target${dungeon.bisTargets === 1 ? '' : 's'}` : ''}${dungeon.nearBisTargets ? ` | ${dungeon.nearBisTargets} near-BiS` : ''}${Number(dungeon.candidateDrops) > dungeon.matchedSlots ? ` | ${dungeon.candidateDrops} candidates compared` : ''}${dungeon.journalInstanceId ? ` | Journal ${dungeon.journalInstanceId}` : ''}</span>
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

function applyClassPresentation(character) {
  const className = clean(character?.class) || 'Healer';
  const specName = clean(character?.active_spec_name);
  const summaryKey = `${specName} ${className}`.trim();
  const summary = SPEC_SUMMARIES[summaryKey] || {
    title: 'Heal with insight. Lead with knowledge.',
    text: 'Use live progression, stat alignment and dungeon loot data together so the next upgrade has a clear reason behind it.',
    glyph: '+',
  };
  const accent = CLASS_ACCENTS[className] || '#36E0C6';

  document.documentElement.style.setProperty('--class-accent', accent);
  document.body.dataset.healerClass = className.toLowerCase();

  const heroKicker = $('#hero-kicker');
  const heroTitle = $('#hero-title');
  const heroIntro = $('#hero-intro');
  const heroGlyph = $('#hero-class-glyph');
  const heroSpec = $('#hero-spec-label');
  const heroClassName = $('#hero-class-name');
  const heroTagline = $('#hero-class-tagline');
  const summaryKicker = $('#class-summary-kicker');
  const summaryTitle = $('#class-summary-title');
  const summaryText = $('#class-summary-text');

  if (heroKicker) heroKicker.textContent = `${specName || 'HEALER'} PROGRESSION`.toUpperCase();
  if (heroTitle) heroTitle.innerHTML = `${escapeHtml(summary.title.split('.')[0] || summary.title)}.<br /><span>${escapeHtml((summary.title.split('.').slice(1).join('.').trim() || 'Progress with purpose.'))}</span>`;
  if (heroIntro) heroIntro.textContent = summary.text;
  if (heroGlyph) heroGlyph.textContent = summary.glyph;
  if (heroSpec) heroSpec.textContent = (specName || 'HEALER').toUpperCase();
  if (heroClassName) heroClassName.textContent = className;
  if (heroTagline) heroTagline.textContent = 'Analyse. Optimise. Heal.';
  if (summaryKicker) summaryKicker.textContent = `${specName || className} FOCUS`.toUpperCase();
  if (summaryTitle) summaryTitle.textContent = summary.title;
  if (summaryText) summaryText.textContent = summary.text;
}

function renderSeasonSummary(analysis) {
  const title = $('#season-summary-title');
  const text = $('#season-summary-text');
  const badge = $('#season-summary-badge');

  if (badge) badge.textContent = `PATCH ${analysis.season?.patch || '12.1'}`;
  if (title) title.textContent = analysis.season?.label || 'Midnight Season 2';

  if (text) {
    const status = analysis.season?.mythicPlusOpen
      ? 'Mythic+ active'
      : `Mythic+ opens ${analysis.season?.mythicPlusOpens || '2026-08-19'}`;

    text.textContent = `${analysis.season?.dungeonCount || 8} dungeons | ${analysis.season?.raidName || MIDNIGHT_SEASON_2.raid.name} (${analysis.season?.raidBosses || 8} bosses) | ${status}`;
  }
}

function renderPlaybook(character, context) {
  const title = $('#playbook-title');
  const intro = $('#playbook-intro');
  const contextLabel = $('#playbook-context');
  const priorities = $('#spell-priority-list');
  const rotation = $('#rotation-list');
  const cooldowns = $('#cooldown-notes');
  const note = $('#playbook-note');

  if (!title || !intro || !contextLabel || !priorities || !rotation || !cooldowns || !note) return;

  const playbook = getHealerPlaybook(character, context);

  if (!playbook) {
    title.textContent = 'Suggested spell priority';
    intro.textContent = 'No healer playbook is available for this specialization.';
    contextLabel.textContent = 'PATCH 12.1';
    priorities.innerHTML = '';
    rotation.innerHTML = '';
    cooldowns.innerHTML = '';
    note.textContent = '';
    return;
  }

  title.textContent = `${playbook.spec} playbook`;
  intro.textContent = playbook.title;
  contextLabel.textContent = `${playbook.contextLabel.toUpperCase()} | PATCH ${playbook.patch}`;

  priorities.innerHTML = playbook.priority.map(([spell, use], index) => `
    <li class="priority-row">
      <span class="priority-index">${index + 1}</span>
      <div>
        <strong>${escapeHtml(spell)}</strong>
        <p>${escapeHtml(use)}</p>
      </div>
    </li>
  `).join('');

  rotation.innerHTML = playbook.rotation.map((step, index) => `
    <li class="rotation-step">
      <span>${String(index + 1).padStart(2, '0')}</span>
      <p>${escapeHtml(step)}</p>
    </li>
  `).join('');

  cooldowns.innerHTML = playbook.cooldowns.map((item) => `
    <li>${escapeHtml(item)}</li>
  `).join('');

  note.textContent = `Updated for the Midnight 12.1 baseline (${playbook.dataVersion}). This is a conditional healer priority framework, not a fixed cast sequence; talents and encounter damage patterns can change the correct choice.`;
}

function renderBisPlan(profile) {
  const container = $('#bis-plan-list');
  const score = $('#bis-plan-score');
  const note = $('#bis-plan-note');
  if (!container || !score || !note) return;

  if (!profile?.available) {
    score.textContent = '-';
    container.innerHTML = '<p class="empty-state">Personal dungeon BiS needs live item secondary-stat data and a valid character stat profile.</p>';
    note.textContent = profile?.note || '';
    return;
  }

  score.textContent = `${profile.rankedSlots} slots`;
  const labelBySlot = {
    head: 'Head', neck: 'Neck', shoulder: 'Shoulders', back: 'Back',
    chest: 'Chest', wrist: 'Wrists', hands: 'Hands', waist: 'Waist',
    legs: 'Legs', feet: 'Feet', finger_1: 'Ring 1', finger_2: 'Ring 2',
    main_hand: 'Main hand', off_hand: 'Off hand'
  };

  container.innerHTML = profile.best
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .map((item) => `
      <div class="bis-plan-row">
        <span class="bis-slot">${escapeHtml(labelBySlot[item.slot] || item.slot)}</span>
        <div>
          <strong>${escapeHtml(item.itemName)}</strong>
          <small>${escapeHtml(item.dungeonName)} | ${escapeHtml(item.fitLabel)}${item.alignmentGain ? ` | ${item.alignmentGain >= 0 ? '+' : ''}${item.alignmentGain.toFixed(1)} alignment` : ''}</small>
        </div>
        <span class="bis-badge">BiS</span>
      </div>
    `).join('');

  note.textContent = profile.note;
}

function renderCharacter(character, options) {
  const analysis = buildAnalysis(character, options);
  const score = analysis.currentScore;
  const target = analysis.targetScore;
  const progressPct = Math.round(analysis.progress * 100);
  const itemLevel = Number(character?.gear?.item_level_equipped || character?.gear?.item_level_total || 0);

  applyClassPresentation(character);
  renderSeasonSummary(analysis);
  renderPlaybook(character, analysis.statContext);

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

  if (!analysis.season?.mythicPlusOpen) {
    $('#score-summary').textContent = `${analysis.season.label} Mythic+ has not opened yet, so outgoing Season 1 rating is intentionally excluded from this 12.1 planner.`;
    $('#score-detail').textContent = `Current pool loaded | Mythic+ opens ${analysis.season.mythicPlusOpens}`;
  } else if (analysis.scoreGap > 0) {
    $('#score-summary').textContent = `You are ${Math.round(analysis.scoreGap).toLocaleString()} rating from the target. The planner favours current Season 2 dungeons where progression is least developed.`;
    $('#score-detail').textContent = `${Math.round(score).toLocaleString()} Season 2 rating | ${target.toLocaleString()} target`;
  } else {
    $('#score-summary').textContent = 'You have met or exceeded this Season 2 target. Raise the goal to keep the progression analysis useful.';
    $('#score-detail').textContent = `${Math.round(score).toLocaleString()} Season 2 rating`;
  }

  const initials = (character.name || 'HL').slice(0, 2).toUpperCase();
  const avatar = $('#avatar');
  avatar.textContent = initials;
  avatar.style.backgroundImage = character.thumbnail_url ? `url("${encodeURI(character.thumbnail_url)}")` : '';

  const profileLink = $('#profile-link');
  profileLink.href = character.profile_url || 'https://raider.io/';

  renderRaid(analysis.raids);
  renderDungeons(analysis.dungeons, analysis.lootDungeons, analysis.season);
  renderGear(analysis.weakGear, character.region || $('#region').value);
  renderStatAlignment(analysis.statAlignment);
  renderBisPlan(analysis.bisProfile);
  renderLootPlanner(analysis.lootDungeons, {
    version: analysis.lootDataVersion,
    keyLevel: analysis.farmKeyLevel,
    dropItemLevel: analysis.farmDropItemLevel,
    region: character.region || $('#region').value,
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
