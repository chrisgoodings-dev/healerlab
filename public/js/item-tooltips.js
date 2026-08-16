import { fetchItemDetails } from './api.js';

const STAT_ROWS = Object.freeze([
  { key: 'haste', label: 'Haste' },
  { key: 'mastery', label: 'Mastery' },
  { key: 'crit', label: 'Critical Strike' },
  { key: 'versatility', label: 'Versatility' },
]);

const detailCache = new Map();
let tooltip = null;
let activeTrigger = null;
let pinned = false;
let requestSerial = 0;
let hideTimer = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normaliseStats(stats = {}) {
  return {
    crit: positive(stats.crit),
    haste: positive(stats.haste),
    mastery: positive(stats.mastery),
    versatility: positive(stats.versatility),
  };
}

function hasStats(stats) {
  return Object.values(stats || {}).some((value) => positive(value) > 0);
}

export function mergeItemTooltipData(detail = {}, overrides = {}) {
  const detailStats = normaliseStats(detail.secondaryStats || {});
  const overrideStats = normaliseStats(overrides.secondaryStats || {});
  return {
    id: Number(overrides.id || detail.id) || null,
    name: overrides.name || detail.name || 'Unknown item',
    itemLevel: positive(overrides.itemLevel) || positive(detail.itemLevel) || null,
    quality: overrides.quality || detail.quality || null,
    itemClass: detail.itemClass || null,
    itemSubclass: detail.itemSubclass || null,
    inventoryType: detail.inventoryType || null,
    requiredLevel: positive(detail.requiredLevel) || null,
    iconUrl: overrides.iconUrl || detail.iconUrl || null,
    secondaryStats: hasStats(overrideStats) ? overrideStats : detailStats,
    effects: Array.isArray(detail.effects) ? detail.effects : [],
    description: detail.description || null,
  };
}

function overridesFromTrigger(trigger) {
  return {
    id: Number(trigger?.dataset?.itemTooltipId) || null,
    name: trigger?.dataset?.itemTooltipName || null,
    itemLevel: Number(trigger?.dataset?.itemTooltipLevel) || null,
    iconUrl: trigger?.tagName === 'IMG' ? trigger.src : null,
    secondaryStats: {
      crit: Number(trigger?.dataset?.itemTooltipCrit) || 0,
      haste: Number(trigger?.dataset?.itemTooltipHaste) || 0,
      mastery: Number(trigger?.dataset?.itemTooltipMastery) || 0,
      versatility: Number(trigger?.dataset?.itemTooltipVersatility) || 0,
    },
  };
}

function ensureTooltip() {
  if (tooltip) return tooltip;
  tooltip = document.createElement('div');
  tooltip.id = 'item-tooltip-popout';
  tooltip.className = 'item-tooltip-popout';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  document.body.append(tooltip);
  return tooltip;
}

function qualityClass(value) {
  const quality = String(value || '').trim().toLowerCase();
  return quality ? `quality-${quality.replace(/[^a-z0-9]+/g, '-')}` : 'quality-unknown';
}

function renderStatRows(stats) {
  const rows = STAT_ROWS
    .map((stat) => ({ ...stat, value: positive(stats?.[stat.key]) }))
    .filter((stat) => stat.value > 0);

  if (!rows.length) {
    return '<div class="item-tooltip-empty">No secondary-stat values were returned for this item.</div>';
  }

  return `<div class="item-tooltip-stats">${rows.map((stat) => `
    <div class="item-tooltip-stat stat-${stat.key}">
      <span>${escapeHtml(stat.label)}</span>
      <strong>+${Math.round(stat.value).toLocaleString()}</strong>
    </div>
  `).join('')}</div>`;
}

function renderEffects(effects, description, loading, failed) {
  if (loading) {
    return '<div class="item-tooltip-loading">Loading Blizzard bonus effects...</div>';
  }

  const rows = Array.isArray(effects) ? effects.filter((effect) => effect?.text) : [];
  const effectHtml = rows.length
    ? `<div class="item-tooltip-effects">${rows.map((effect) => `
        <div class="item-tooltip-effect">
          ${effect.trigger ? `<strong>${escapeHtml(effect.trigger)}:</strong>` : ''}
          <span>${escapeHtml(effect.text)}</span>
        </div>
      `).join('')}</div>`
    : '';
  const descriptionHtml = description
    ? `<p class="item-tooltip-description">${escapeHtml(description)}</p>`
    : '';

  if (effectHtml || descriptionHtml) return `${effectHtml}${descriptionHtml}`;
  if (failed) return '<div class="item-tooltip-empty">Bonus-effect details are currently unavailable.</div>';
  return '<div class="item-tooltip-empty">No additional Blizzard bonus effect was returned for this item.</div>';
}

function renderTooltip(item, { loading = false, failed = false } = {}) {
  const node = ensureTooltip();
  const typeLine = [item.itemSubclass || item.itemClass, item.inventoryType]
    .filter(Boolean)
    .join(' | ');
  const levelLine = item.itemLevel ? `Item Level ${Math.round(item.itemLevel)}` : '';

  node.innerHTML = `
    <div class="item-tooltip-header">
      ${item.iconUrl
        ? `<img class="item-tooltip-icon" src="${escapeHtml(item.iconUrl)}" alt="" />`
        : '<span class="item-tooltip-icon item-tooltip-icon-fallback" aria-hidden="true">?</span>'}
      <div>
        <strong class="item-tooltip-name ${qualityClass(item.quality)}">${escapeHtml(item.name)}</strong>
        ${levelLine ? `<span>${escapeHtml(levelLine)}</span>` : ''}
        ${typeLine ? `<span>${escapeHtml(typeLine)}</span>` : ''}
      </div>
    </div>
    ${renderStatRows(item.secondaryStats)}
    ${renderEffects(item.effects, item.description, loading, failed)}
  `;
}

function positionTooltip(trigger) {
  if (!trigger || !tooltip || tooltip.hidden) return;
  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 12;
  const edge = 8;

  let left = triggerRect.right + gap;
  if (left + tooltipRect.width > window.innerWidth - edge) {
    left = triggerRect.left - tooltipRect.width - gap;
  }
  left = Math.max(edge, Math.min(left, window.innerWidth - tooltipRect.width - edge));

  let top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
  top = Math.max(edge, Math.min(top, window.innerHeight - tooltipRect.height - edge));

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function hydrateTriggerIcon(trigger, detail) {
  if (!trigger || !detail?.iconUrl || trigger.tagName === 'IMG') return;
  trigger.style.backgroundImage = `url("${detail.iconUrl.replaceAll('"', '%22')}")`;
  trigger.classList.add('has-item-image');
  trigger.textContent = '';
}

async function getDetails(region, itemId) {
  const key = `${region}:${itemId}`;
  if (!detailCache.has(key)) {
    detailCache.set(key, fetchItemDetails(region, itemId).catch((error) => {
      detailCache.delete(key);
      throw error;
    }));
  }
  return detailCache.get(key);
}

function clearHideTimer() {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
}

function closeTooltip() {
  clearHideTimer();
  if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'false');
  activeTrigger = null;
  pinned = false;
  if (tooltip) tooltip.hidden = true;
}

function scheduleClose() {
  if (pinned) return;
  clearHideTimer();
  hideTimer = setTimeout(closeTooltip, 90);
}

async function openTooltip(trigger, { pin = false } = {}) {
  clearHideTimer();
  const itemId = Number(trigger?.dataset?.itemTooltipId);
  const region = String(trigger?.dataset?.itemTooltipRegion || '').toLowerCase();
  if (!Number.isInteger(itemId) || itemId <= 0 || !region) return;

  activeTrigger = trigger;
  if (pin) pinned = true;
  trigger.setAttribute('aria-expanded', 'true');

  const overrides = overridesFromTrigger(trigger);
  renderTooltip(mergeItemTooltipData({}, overrides), { loading: true });
  tooltip.hidden = false;
  positionTooltip(trigger);

  const serial = ++requestSerial;
  try {
    const detail = await getDetails(region, itemId);
    if (serial !== requestSerial || activeTrigger !== trigger) return;
    const merged = mergeItemTooltipData(detail, overrides);
    hydrateTriggerIcon(trigger, merged);
    renderTooltip(merged);
    positionTooltip(trigger);
  } catch {
    if (serial !== requestSerial || activeTrigger !== trigger) return;
    renderTooltip(mergeItemTooltipData({}, overrides), { failed: true });
    positionTooltip(trigger);
  }
}

function triggerFromEvent(event) {
  return event.target instanceof Element
    ? event.target.closest('[data-item-tooltip-id]')
    : null;
}

export function setupItemTooltips() {
  if (typeof document === 'undefined' || document.documentElement.dataset.healerlabItemTooltips === 'ready') return;
  document.documentElement.dataset.healerlabItemTooltips = 'ready';
  ensureTooltip();

  document.addEventListener('pointerover', (event) => {
    const trigger = triggerFromEvent(event);
    if (!trigger || event.pointerType === 'touch') return;
    if (event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget)) return;
    if (!pinned) openTooltip(trigger);
  });

  document.addEventListener('pointerout', (event) => {
    const trigger = triggerFromEvent(event);
    if (!trigger || event.pointerType === 'touch') return;
    if (event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget)) return;
    if (activeTrigger === trigger) scheduleClose();
  });

  document.addEventListener('focusin', (event) => {
    const trigger = triggerFromEvent(event);
    if (trigger && !pinned) openTooltip(trigger);
  });

  document.addEventListener('focusout', (event) => {
    const trigger = triggerFromEvent(event);
    if (trigger && activeTrigger === trigger) scheduleClose();
  });

  document.addEventListener('click', (event) => {
    const trigger = triggerFromEvent(event);
    if (trigger) {
      const alreadyPinned = pinned && activeTrigger === trigger;
      if (alreadyPinned) closeTooltip();
      else openTooltip(trigger, { pin: true });
      return;
    }
    if (pinned) closeTooltip();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeTooltip();
  });

  window.addEventListener('resize', () => positionTooltip(activeTrigger));
  window.addEventListener('scroll', () => positionTooltip(activeTrigger), true);
}
