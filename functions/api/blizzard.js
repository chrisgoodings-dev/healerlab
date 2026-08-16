const REGION_CONFIG = Object.freeze({
  eu: { apiBase: 'https://eu.api.blizzard.com', profileNamespace: 'profile-eu', staticNamespace: 'static-eu', locale: 'en_GB' },
  us: { apiBase: 'https://us.api.blizzard.com', profileNamespace: 'profile-us', staticNamespace: 'static-us', locale: 'en_US' },
  kr: { apiBase: 'https://kr.api.blizzard.com', profileNamespace: 'profile-kr', staticNamespace: 'static-kr', locale: 'ko_KR' },
  tw: { apiBase: 'https://tw.api.blizzard.com', profileNamespace: 'profile-tw', staticNamespace: 'static-tw', locale: 'zh_TW' },
});

const PERFORMANCE_SLOT_TYPES = Object.freeze({
  HEAD: 'head',
  NECK: 'neck',
  SHOULDER: 'shoulder',
  SHOULDERS: 'shoulder',
  BACK: 'back',
  CLOAK: 'back',
  CHEST: 'chest',
  WRIST: 'wrist',
  WRISTS: 'wrist',
  HAND: 'hands',
  HANDS: 'hands',
  WAIST: 'waist',
  LEGS: 'legs',
  FEET: 'feet',
  MAIN_HAND: 'main_hand',
  MAINHAND: 'main_hand',
  OFF_HAND: 'off_hand',
  OFFHAND: 'off_hand',
});

let tokenCache = { clientId: '', token: '', expiresAt: 0 };
const mediaCache = new Map();
const itemStatsCache = new Map();

export function blizzardConfigured(env = {}) {
  return Boolean(env.BLIZZARD_CLIENT_ID && env.BLIZZARD_CLIENT_SECRET);
}

export function slugifyRealm(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function numericValue(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
}

function nonNegativeValue(...values) {
  // Blizzard can expose several variants of the same combat stat. Some variants
  // may be present with a zero rating while another variant contains the actual
  // rating. Prefer the first positive value and only fall back to zero if none
  // of the supplied candidates are positive.
  let sawZero = false;
  for (const candidate of values) {
    const raw = candidate && typeof candidate === 'object' && 'value' in candidate
      ? candidate.value
      : candidate;
    const number = Number(raw);
    if (!Number.isFinite(number) || number < 0) continue;
    if (number > 0) return number;
    sawZero = true;
  }
  return sawZero ? 0 : 0;
}

const ITEM_SECONDARY_STAT_TYPES = Object.freeze({
  CRIT_RATING: 'crit',
  CRITICAL_STRIKE: 'crit',
  CRITICAL_STRIKE_RATING: 'crit',
  HASTE: 'haste',
  HASTE_RATING: 'haste',
  MASTERY: 'mastery',
  MASTERY_RATING: 'mastery',
  VERSATILITY: 'versatility',
  VERSATILITY_RATING: 'versatility',
});

function statTypeKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normaliseCharacterStatistics(raw = {}) {
  return {
    crit: nonNegativeValue(
      raw?.spell_crit?.rating,
      raw?.spell_critical_strike?.rating,
      raw?.melee_crit?.rating,
      raw?.melee_critical_strike?.rating,
      raw?.ranged_crit?.rating,
      raw?.ranged_critical_strike?.rating,
      raw?.critical_strike?.rating,
      raw?.critical_strike_rating,
      raw?.crit?.rating,
      raw?.crit_rating,
      raw?.crit
    ),
    haste: nonNegativeValue(
      raw?.spell_haste?.rating,
      raw?.melee_haste?.rating,
      raw?.ranged_haste?.rating,
      raw?.haste?.rating,
      raw?.haste_rating,
      raw?.haste
    ),
    mastery: nonNegativeValue(
      raw?.mastery?.rating,
      raw?.mastery_rating,
      raw?.mastery
    ),
    versatility: nonNegativeValue(
      raw?.versatility?.rating,
      raw?.versatility_rating,
      raw?.versatility
    ),
  };
}

export function sumEquipmentSecondaryStats(items = []) {
  const totals = { crit: 0, haste: 0, mastery: 0, versatility: 0 };
  for (const item of Array.isArray(items) ? items : []) {
    const stats = item?.secondaryStats || {};
    for (const key of Object.keys(totals)) {
      totals[key] += Math.max(0, Number(stats[key]) || 0);
    }
  }
  return totals;
}

export function resolveSecondaryStats(statisticsRatings = {}, equipmentRatings = {}) {
  const stats = normaliseCharacterStatistics({
    crit: statisticsRatings?.crit,
    haste: statisticsRatings?.haste,
    mastery: statisticsRatings?.mastery,
    versatility: statisticsRatings?.versatility,
  });
  const equipment = {
    crit: Math.max(0, Number(equipmentRatings?.crit) || 0),
    haste: Math.max(0, Number(equipmentRatings?.haste) || 0),
    mastery: Math.max(0, Number(equipmentRatings?.mastery) || 0),
    versatility: Math.max(0, Number(equipmentRatings?.versatility) || 0),
  };

  const ratings = {};
  const fallbackStats = [];
  for (const key of Object.keys(equipment)) {
    if (stats[key] > 0 || equipment[key] <= 0) {
      ratings[key] = stats[key];
    } else {
      ratings[key] = equipment[key];
      fallbackStats.push(key);
    }
  }

  const populated = Object.values(ratings).filter((value) => value > 0).length;
  const source = fallbackStats.length
    ? (populated ? 'blended' : 'equipment')
    : 'character_statistics';

  return { ratings, source, fallbackStats };
}

export function normaliseItemSecondaryStats(item = {}) {
  const result = { crit: 0, haste: 0, mastery: 0, versatility: 0 };
  const previewStats = Array.isArray(item?.preview_item?.stats) ? item.preview_item.stats : null;
  const stats = previewStats || (Array.isArray(item?.stats) ? item.stats : []);

  for (const entry of stats) {
    const type = statTypeKey(entry?.type?.type || entry?.type?.name || entry?.type);
    const key = ITEM_SECONDARY_STAT_TYPES[type];
    if (!key) continue;
    result[key] += nonNegativeValue(entry?.value?.value, entry?.value);
  }

  return result;
}

function slotFromType(type, counters) {
  const normalized = String(type || '').trim().toUpperCase();

  if (normalized === 'FINGER') {
    counters.finger += 1;
    return counters.finger === 1 ? 'finger_1' : counters.finger === 2 ? 'finger_2' : null;
  }

  if (normalized === 'TRINKET') {
    counters.trinket += 1;
    return counters.trinket === 1 ? 'trinket_1' : counters.trinket === 2 ? 'trinket_2' : null;
  }

  if (normalized === 'FINGER_1' || normalized === 'FINGER1') return 'finger_1';
  if (normalized === 'FINGER_2' || normalized === 'FINGER2') return 'finger_2';
  if (normalized === 'TRINKET_1' || normalized === 'TRINKET1') return 'trinket_1';
  if (normalized === 'TRINKET_2' || normalized === 'TRINKET2') return 'trinket_2';

  // SHIRT and TABARD deliberately have no mapping.
  return PERFORMANCE_SLOT_TYPES[normalized] || null;
}

export function normaliseBlizzardEquipment(raw = {}) {
  const equipped = Array.isArray(raw?.equipped_items) ? raw.equipped_items : [];
  const counters = { finger: 0, trinket: 0 };

  return equipped
    .map((entry) => {
      const slot = slotFromType(entry?.slot?.type || entry?.inventory_type?.type, counters);
      if (!slot) return null;

      const itemId = numericValue(entry?.item?.id, entry?.id);
      const itemLevel = numericValue(
        entry?.level?.value,
        entry?.item_level?.value,
        entry?.item_level,
        entry?.level
      );

      return {
        slot,
        itemId: itemId || null,
        name: entry?.name || entry?.item?.name || 'Equipped item',
        itemLevel,
        quality: entry?.quality?.type || entry?.quality?.name || null,
        iconUrl: null,
        secondaryStats: normaliseItemSecondaryStats(entry),
      };
    })
    .filter((item) => item && item.itemLevel > 0);
}

function safeSourceState(character, blizzardState) {
  return {
    ...(character?.healerlab_sources || {}),
    raider_io: 'ok',
    blizzard: blizzardState,
  };
}

export function mergeBlizzardEquipment(character, equipment) {
  if (!equipment?.available || !Array.isArray(equipment.items)) {
    return {
      ...character,
      healerlab_sources: safeSourceState(character, equipment?.state || 'unavailable'),
      blizzard: {
        available: false,
        state: equipment?.state || 'unavailable',
        message: equipment?.message || null,
      },
    };
  }

  const existingGear = character?.gear || {};
  const existingItems = { ...(existingGear.items || {}) };

  for (const official of equipment.items) {
    const current = existingItems[official.slot] || {};
    existingItems[official.slot] = {
      ...current,
      name: official.name || current.name || 'Equipped item',
      item_level: official.itemLevel || Number(current.item_level) || 0,
      item_id: official.itemId || Number(current.item_id) || null,
      icon_url: official.iconUrl || current.icon_url || null,
      quality: official.quality || current.quality || null,
      secondary_stats: official.secondaryStats || current.secondary_stats || null,
      source: 'blizzard',
    };
  }

  return {
    ...character,
    gear: {
      ...existingGear,
      items: existingItems,
    },
    healerlab_sources: safeSourceState(character, 'ok'),
    blizzard: {
      available: true,
      state: 'ok',
      realmSlug: equipment.realmSlug,
      itemCount: equipment.items.length,
    },
  };
}

async function getAccessToken(env, forceRefresh = false) {
  if (!blizzardConfigured(env)) {
    const error = new Error('Blizzard API credentials are not configured.');
    error.code = 'BLIZZARD_NOT_CONFIGURED';
    throw error;
  }

  const now = Date.now();
  if (
    !forceRefresh &&
    tokenCache.clientId === env.BLIZZARD_CLIENT_ID &&
    tokenCache.token &&
    tokenCache.expiresAt > now + 30_000
  ) {
    return tokenCache.token;
  }

  const credentials = btoa(`${env.BLIZZARD_CLIENT_ID}:${env.BLIZZARD_CLIENT_SECRET}`);
  const response = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${credentials}`,
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token) {
    const error = new Error('Battle.net OAuth token request failed.');
    error.code = 'BLIZZARD_AUTH_FAILED';
    error.status = response.status;
    throw error;
  }

  const expiresIn = Math.max(60, Number(payload.expires_in) || 3600);
  tokenCache = {
    clientId: env.BLIZZARD_CLIENT_ID,
    token: payload.access_token,
    expiresAt: now + Math.max(60, expiresIn - 60) * 1000,
  };

  return tokenCache.token;
}

export async function blizzardGet(path, { region, namespace, locale, env, retry = true }) {
  const config = REGION_CONFIG[region];
  if (!config) {
    const error = new Error('Unsupported Blizzard API region.');
    error.code = 'BLIZZARD_REGION';
    throw error;
  }

  const token = await getAccessToken(env);
  const url = new URL(path, config.apiBase);
  url.searchParams.set('namespace', namespace);
  url.searchParams.set('locale', locale || config.locale);

  let response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
      'user-agent': 'HealerLab/0.4 university-project',
    },
  });

  if (response.status === 401 && retry) {
    const refreshedToken = await getAccessToken(env, true);
    response = await fetch(url, {
      headers: {
        authorization: `Bearer ${refreshedToken}`,
        accept: 'application/json',
        'user-agent': 'HealerLab/0.4 university-project',
      },
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`Blizzard API request failed (${response.status}).`);
    error.code = 'BLIZZARD_API_FAILED';
    error.status = response.status;
    throw error;
  }

  return payload;
}

function iconFromMedia(media) {
  const assets = Array.isArray(media?.assets) ? media.assets : [];
  return (
    assets.find((asset) => asset?.key === 'icon')?.value ||
    assets.find((asset) => typeof asset?.value === 'string')?.value ||
    null
  );
}

async function fetchItemIcon(itemId, region, env) {
  if (!itemId) return null;
  const cacheKey = `${region}:${itemId}`;
  if (mediaCache.has(cacheKey)) return mediaCache.get(cacheKey);

  const config = REGION_CONFIG[region];
  try {
    const media = await blizzardGet(`/data/wow/media/item/${itemId}`, {
      region,
      namespace: config.staticNamespace,
      locale: config.locale,
      env,
    });
    const iconUrl = iconFromMedia(media);
    if (mediaCache.size > 250) mediaCache.clear();
    mediaCache.set(cacheKey, iconUrl);
    return iconUrl;
  } catch {
    return null;
  }
}

export async function fetchCharacterStatistics({ region, realm, name, env }) {
  const config = REGION_CONFIG[region];
  if (!config) throw new Error('Unsupported Blizzard API region.');

  const realmSlug = slugifyRealm(realm);
  const characterName = String(name || '').trim().toLowerCase();
  if (!realmSlug || !characterName) throw new Error('Realm and character are required.');

  const raw = await blizzardGet(
    `/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterName)}/statistics`,
    {
      region,
      namespace: config.profileNamespace,
      locale: config.locale,
      env,
    }
  );

  return {
    available: true,
    state: 'ok',
    realmSlug,
    ratings: normaliseCharacterStatistics(raw),
  };
}

export async function fetchCharacterEquipment({ region, realm, name, env }) {
  const config = REGION_CONFIG[region];
  if (!config) throw new Error('Unsupported Blizzard API region.');

  const realmSlug = slugifyRealm(realm);
  const characterName = String(name || '').trim().toLowerCase();
  if (!realmSlug || !characterName) throw new Error('Realm and character are required.');

  const raw = await blizzardGet(
    `/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterName)}/equipment`,
    {
      region,
      namespace: config.profileNamespace,
      locale: config.locale,
      env,
    }
  );

  const normalized = normaliseBlizzardEquipment(raw);
  const items = await Promise.all(
    normalized.map(async (item) => ({
      ...item,
      iconUrl: await fetchItemIcon(item.itemId, region, env),
    }))
  );

  return {
    available: true,
    state: 'ok',
    realmSlug,
    items,
    secondaryStats: sumEquipmentSecondaryStats(items),
  };
}

export async function enrichCharacterWithBlizzard(character, { region, realm, name, env }) {
  if (!blizzardConfigured(env)) {
    const merged = mergeBlizzardEquipment(character, {
      available: false,
      state: 'not_configured',
      message: 'Blizzard API credentials are not configured.',
    });
    return {
      ...merged,
      healerlab_sources: {
        ...(merged.healerlab_sources || {}),
        blizzard_statistics: 'not_configured',
      },
    };
  }

  const [equipmentResult, statisticsResult] = await Promise.allSettled([
    fetchCharacterEquipment({ region, realm, name, env }),
    fetchCharacterStatistics({ region, realm, name, env }),
  ]);

  const merged = equipmentResult.status === 'fulfilled'
    ? mergeBlizzardEquipment(character, equipmentResult.value)
    : mergeBlizzardEquipment(character, {
        available: false,
        state: 'unavailable',
        message: equipmentResult.reason?.code === 'BLIZZARD_AUTH_FAILED'
          ? 'Blizzard authentication failed.'
          : 'Blizzard equipment data was unavailable; Raider.IO data was used instead.',
      });

  const statistics = statisticsResult.status === 'fulfilled' ? statisticsResult.value : null;
  const equipment = equipmentResult.status === 'fulfilled' ? equipmentResult.value : null;
  const resolvedStats = resolveSecondaryStats(
    statistics?.ratings || {},
    equipment?.secondaryStats || {}
  );
  const hasResolvedStats = Object.values(resolvedStats.ratings).some((value) => value > 0);

  return {
    ...merged,
    secondary_stats: hasResolvedStats ? resolvedStats.ratings : (merged.secondary_stats || null),
    healerlab_sources: {
      ...(merged.healerlab_sources || {}),
      blizzard_statistics: statistics
        ? (resolvedStats.fallbackStats.length ? 'blended' : 'ok')
        : (hasResolvedStats ? 'equipment_fallback' : 'unavailable'),
    },
    blizzard: {
      ...(merged.blizzard || {}),
      statisticsAvailable: Boolean(statistics),
      statisticsSource: statistics
        ? resolvedStats.source
        : (hasResolvedStats ? 'equipment' : 'unavailable'),
      statisticsFallbackStats: resolvedStats.fallbackStats,
    },
  };
}

export async function fetchBlizzardItemStats({ region, itemId, env }) {
  const config = REGION_CONFIG[region];
  if (!config) throw new Error('Unsupported Blizzard API region.');

  const id = Number(itemId);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid Blizzard item ID.');

  const cacheKey = `${region}:${id}`;
  if (itemStatsCache.has(cacheKey)) return itemStatsCache.get(cacheKey);

  const item = await blizzardGet(`/data/wow/item/${id}`, {
    region,
    namespace: config.staticNamespace,
    locale: config.locale,
    env,
  });

  const result = {
    id,
    secondaryStats: normaliseItemSecondaryStats(item),
  };

  if (itemStatsCache.size > 500) itemStatsCache.clear();
  itemStatsCache.set(cacheKey, result);
  return result;
}

export async function fetchBlizzardItem({ region, itemId, env }) {
  const config = REGION_CONFIG[region];
  if (!config) throw new Error('Unsupported Blizzard API region.');

  const id = Number(itemId);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid Blizzard item ID.');

  const [item, media] = await Promise.all([
    blizzardGet(`/data/wow/item/${id}`, {
      region,
      namespace: config.staticNamespace,
      locale: config.locale,
      env,
    }),
    blizzardGet(`/data/wow/media/item/${id}`, {
      region,
      namespace: config.staticNamespace,
      locale: config.locale,
      env,
    }).catch(() => null),
  ]);

  return {
    id,
    name: item?.name || null,
    quality: item?.quality?.type || item?.quality?.name || null,
    itemClass: item?.item_class?.name || null,
    itemSubclass: item?.item_subclass?.name || null,
    inventoryType: item?.inventory_type?.type || item?.inventory_type?.name || null,
    requiredLevel: numericValue(item?.required_level) || null,
    secondaryStats: normaliseItemSecondaryStats(item),
    iconUrl: iconFromMedia(media),
  };
}
