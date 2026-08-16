import { blizzardConfigured, blizzardGet } from './blizzard.js';

const ALLOWED_REGIONS = new Set(['eu', 'us', 'kr', 'tw']);

const REGION_LOCALE = Object.freeze({
  eu: 'en_GB',
  us: 'en_US',
  kr: 'ko_KR',
  tw: 'zh_TW',
});

const SEASON_2_DUNGEONS = Object.freeze([
  { name: 'Altar of Fangs', shortName: 'AOF' },
  { name: 'Murder Row', shortName: 'MR' },
  { name: 'Den of Nalorakk', shortName: 'DON' },
  { name: 'The Blinding Vale', shortName: 'TBV' },
  { name: 'Voidscar Arena', shortName: 'VSA' },
  { name: 'Ruby Life Pools', shortName: 'RLP' },
  { name: "Kings' Rest", shortName: 'KR' },
  { name: 'Temple of Sethraliss', shortName: 'TOS' },
]);

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const indexCache = new Map();
const dungeonCache = new Map();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=21600' : 'no-store',
    },
  });
}

export function normaliseJournalName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dungeonDefinition(value) {
  const normalized = normaliseJournalName(value);
  return SEASON_2_DUNGEONS.find((dungeon) => normaliseJournalName(dungeon.name) === normalized) || null;
}

export function findJournalInstance(index, dungeonName) {
  const instances = Array.isArray(index?.journal_instances)
    ? index.journal_instances
    : Array.isArray(index?.instances)
      ? index.instances
      : [];
  const target = normaliseJournalName(dungeonName);

  return instances.find((instance) => normaliseJournalName(instance?.name) === target) || null;
}

function mediaUrl(media) {
  const assets = Array.isArray(media?.assets) ? media.assets : [];
  return (
    assets.find((asset) => /icon|tile/i.test(String(asset?.key || '')))?.value ||
    assets.find((asset) => typeof asset?.value === 'string' && asset.value)?.value ||
    null
  );
}

function encounterRefs(instance) {
  if (Array.isArray(instance?.encounters)) return instance.encounters;
  if (Array.isArray(instance?.journal_encounters)) return instance.journal_encounters;
  return [];
}

export function normaliseJournalDungeon({ definition, instance, media, encounters }) {
  const items = [];
  const seen = new Set();

  for (const encounter of encounters || []) {
    const encounterId = Number(encounter?.id) || null;
    const encounterName = encounter?.name || null;
    const loot = Array.isArray(encounter?.items) ? encounter.items : [];

    for (const entry of loot) {
      const item = entry?.item || entry;
      const itemId = Number(item?.id);
      if (!Number.isInteger(itemId) || itemId <= 0 || seen.has(itemId)) continue;
      seen.add(itemId);

      items.push({
        id: itemId,
        name: item?.name || entry?.name || `Item ${itemId}`,
        encounterId,
        encounterName,
      });
    }
  }

  return {
    name: definition.name,
    shortName: definition.shortName,
    journalInstanceId: Number(instance?.id) || null,
    iconUrl: mediaUrl(media),
    items,
    source: 'blizzard-journal',
    resolvedAt: new Date().toISOString(),
  };
}

async function getJournalIndex(region, env) {
  const cached = indexCache.get(region);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const namespace = `static-${region}`;
  const locale = REGION_LOCALE[region];
  const promise = blizzardGet('/data/wow/journal-instance/index', {
    region,
    namespace,
    locale,
    env,
  });

  indexCache.set(region, {
    promise,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  try {
    return await promise;
  } catch (error) {
    indexCache.delete(region);
    throw error;
  }
}

async function fetchJournalDungeon({ region, definition, env }) {
  const cacheKey = `${region}:${definition.shortName}`;
  const cached = dungeonCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const namespace = `static-${region}`;
  const locale = REGION_LOCALE[region];

  const promise = (async () => {
    const index = await getJournalIndex(region, env);
    const instanceRef = findJournalInstance(index, definition.name);

    if (!instanceRef?.id) {
      const error = new Error(`Blizzard Journal instance not found for ${definition.name}.`);
      error.status = 404;
      throw error;
    }

    const instance = await blizzardGet(`/data/wow/journal-instance/${instanceRef.id}`, {
      region,
      namespace,
      locale,
      env,
    });

    const refs = encounterRefs(instance);
    const [media, ...encounters] = await Promise.all([
      blizzardGet(`/data/wow/media/journal-instance/${instanceRef.id}`, {
        region,
        namespace,
        locale,
        env,
      }).catch(() => null),
      ...refs.map((encounter) =>
        blizzardGet(`/data/wow/journal-encounter/${encounter.id}`, {
          region,
          namespace,
          locale,
          env,
        })
      ),
    ]);

    return normaliseJournalDungeon({ definition, instance, media, encounters });
  })();

  dungeonCache.set(cacheKey, {
    promise,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  try {
    return await promise;
  } catch (error) {
    dungeonCache.delete(cacheKey);
    throw error;
  }
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const region = (url.searchParams.get('region') || '').toLowerCase();
  const requestedDungeon = url.searchParams.get('name') || '';

  if (!ALLOWED_REGIONS.has(region)) return json({ message: 'Unsupported region.' }, 400);

  const definition = dungeonDefinition(requestedDungeon);
  if (!definition) return json({ message: 'Unsupported Season 2 dungeon.' }, 400);

  if (!blizzardConfigured(context.env || {})) {
    return json({ message: 'Blizzard API credentials are not configured.' }, 503);
  }

  try {
    return json(await fetchJournalDungeon({
      region,
      definition,
      env: context.env || {},
    }));
  } catch (error) {
    return json({
      message: error?.message || 'Blizzard Journal lookup failed.',
    }, error?.status === 404 ? 404 : 502);
  }
}
