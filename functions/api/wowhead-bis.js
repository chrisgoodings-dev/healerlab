const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map();

const GUIDE_MAP = Object.freeze({
  'Druid:Restoration': ['druid', 'restoration'],
  'Evoker:Preservation': ['evoker', 'preservation'],
  'Monk:Mistweaver': ['monk', 'mistweaver'],
  'Paladin:Holy': ['paladin', 'holy'],
  'Priest:Discipline': ['priest', 'discipline'],
  'Priest:Holy': ['priest', 'holy'],
  'Shaman:Restoration': ['shaman', 'restoration'],
});

const CURRENT_DUNGEONS = Object.freeze([
  'Altar of Fangs',
  'Murder Row',
  'Den of Nalorakk',
  'The Blinding Vale',
  'Voidscar Arena',
  "King's Rest",
  'Temple of Sethraliss',
  'Ruby Life Pools',
]);

const RAID_NAME = 'The Venomous Abyss';
const LAIR_NAME = 'The Tidebound Grotto';

const RAID_BOSSES = Object.freeze([
  "Nek'zali the Soulcoiler",
  'Entombed Sentinels',
  'The Lost Explorers',
  'Vashnik the Malignant',
  'Sszorak',
  'The Twin Fangs',
  'The Coiled Altar',
  "Ula'tek",
]);

const SLOT_NAMES = Object.freeze({
  helm: 'head',
  head: 'head',
  neck: 'neck',
  shoulders: 'shoulder',
  shoulder: 'shoulder',
  cape: 'back',
  cloak: 'back',
  back: 'back',
  chest: 'chest',
  bracers: 'wrist',
  wrist: 'wrist',
  wrists: 'wrist',
  gloves: 'hands',
  hands: 'hands',
  belt: 'waist',
  waist: 'waist',
  legs: 'legs',
  boots: 'feet',
  feet: 'feet',
  ring: 'ring',
  rings: 'ring',
  trinket: 'trinket',
  trinkets: 'trinket',
  weapon: 'main_hand',
  '1h weapon': 'main_hand',
  '2h weapon': 'main_hand',
  'main hand': 'main_hand',
  mainhand: 'main_hand',
  offhand: 'off_hand',
  'off hand': 'off_hand',
});

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=21600' : 'no-store',
    },
  });
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, number) => String.fromCodePoint(Number(number)));
}

function textFromHtml(value) {
  return decodeHtml(
    String(value ?? '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?\s*>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function normalise(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function guideKey(className, specName) {
  return `${String(className || '').trim()}:${String(specName || '').trim()}`;
}

function itemIdFromHtml(cell) {
  const match = String(cell || '').match(/(?:item=|\/item[=/])([0-9]+)/i);
  return match ? Number(match[1]) : null;
}

function normaliseSlot(value) {
  return SLOT_NAMES[normalise(value)] || null;
}

function sourceDescriptor(sourceText) {
  const source = String(sourceText || '').trim();
  const token = normalise(source);

  for (const dungeon of CURRENT_DUNGEONS) {
    if (token.includes(normalise(dungeon))) {
      return { kind: 'dungeon', instance: dungeon, boss: null };
    }
  }

  for (const boss of RAID_BOSSES) {
    if (token.includes(normalise(boss))) {
      return { kind: 'raid', instance: RAID_NAME, boss };
    }
  }

  if (token.includes(normalise(LAIR_NAME)) || token.includes('nymrissa wavecaller')) {
    return { kind: 'lair', instance: LAIR_NAME, boss: 'Nymrissa Wavecaller' };
  }

  if (token.includes('raid') || token.includes('catalyst')) {
    return { kind: 'raid', instance: RAID_NAME, boss: null };
  }

  if (token.includes('craft')) return { kind: 'crafting', instance: null, boss: null };
  if (token.includes('vault')) return { kind: 'vault', instance: null, boss: null };
  return { kind: 'other', instance: null, boss: null };
}

function rowsFromTable(tableHtml, category) {
  const rows = [];
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableHtml))) {
    const cells = [];
    const cellHtml = [];
    const cellRegex = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1]))) {
      cellHtml.push(cellMatch[1]);
      cells.push(textFromHtml(cellMatch[1]));
    }

    if (cells.length < 2) continue;
    const slot = normaliseSlot(cells[0]);
    if (!slot) continue;

    const itemName = cells[1]?.trim();
    if (!itemName || normalise(itemName) === 'item') continue;

    const sourceText = cells.slice(2).join(' | ').trim();
    rows.push({
      category,
      slot,
      slotLabel: cells[0],
      itemName,
      itemId: itemIdFromHtml(cellHtml[1]),
      sourceText,
      source: sourceDescriptor(sourceText),
    });
  }

  return rows;
}

function sectionTable(html, headingPattern, stopPattern) {
  const heading = html.search(headingPattern);
  if (heading < 0) return null;

  const stopRelative = html.slice(heading + 1).search(stopPattern);
  const stop = stopRelative >= 0 ? heading + 1 + stopRelative : Math.min(html.length, heading + 120000);
  const section = html.slice(heading, stop);
  const table = section.match(/<table\b[^>]*>[\s\S]*?<\/table>/i);
  return table ? table[0] : null;
}

export function parseWowheadBisHtml(html) {
  const source = String(html || '');
  const pageText = textFromHtml(source);
  const normalizedPage = normalise(pageText);

  const currentMarkers = [RAID_NAME, ...CURRENT_DUNGEONS]
    .filter((name) => normalizedPage.includes(normalise(name)));
  const currentSeason = currentMarkers.length >= 2 || normalizedPage.includes(normalise(RAID_NAME));

  const bisTable = sectionTable(
    source,
    /best\s+in\s+slot\s+gear\s+for/i,
    /learn\s+about\s+popular\s+gear|best\s+gear\s+from\s+(?:season\s+\d+\s+)?raids|best\s+gear\s+from\s+mythic/i
  );

  const mythicTable = sectionTable(
    source,
    /best\s+gear\s+from\s+mythic\+/i,
    /best\s+.+?\s+trinkets|best\s+crafted\s+gear|gear\s+upgrade\s+priorities/i
  );

  const bis = bisTable ? rowsFromTable(bisTable, 'bis') : [];
  const mythicPlus = mythicTable ? rowsFromTable(mythicTable, 'mythic_plus') : [];

  const updatedMatch = pageText.match(/Updated:\s*([0-9]{4}\/[0-9]{2}\/[0-9]{2}|[A-Za-z]+\s+\d{1,2},\s+\d{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  const patchMatch = pageText.match(/Patch\s+(12\.1(?:\.\d+)?|12\.0\.7)/i);

  return {
    currentSeason,
    currentMarkers,
    patchLabel: patchMatch?.[1] || null,
    updated: updatedMatch?.[1] || null,
    bis,
    mythicPlus,
  };
}

async function fetchGuide(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'HealerLab/0.6 (+https://github.com/chrisgoodings-dev/healerlab)',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    const error = new Error(`Wowhead guide request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return response.text();
}

async function resolveGuide(className, specName) {
  const key = guideKey(className, specName);
  const slugs = GUIDE_MAP[key];
  if (!slugs) {
    const error = new Error('Unsupported healer specialization.');
    error.status = 400;
    throw error;
  }

  const [classSlug, specSlug] = slugs;
  const urls = [
    `https://www.wowhead.com/guide/classes/${classSlug}/${specSlug}/bis-gear`,
    `https://www.wowhead.com/ptr-2/guide/classes/${classSlug}/${specSlug}/bis-gear`,
  ];

  let staleCandidate = null;
  let lastError = null;

  for (const url of urls) {
    try {
      const html = await fetchGuide(url);
      const parsed = parseWowheadBisHtml(html);
      const candidate = {
        state: parsed.currentSeason && parsed.bis.length ? 'ok' : 'stale',
        currentSeason: parsed.currentSeason,
        source: 'Wowhead',
        sourceUrl: url,
        className,
        specName,
        patchLabel: parsed.patchLabel,
        updated: parsed.updated,
        currentMarkers: parsed.currentMarkers,
        bis: parsed.bis,
        mythicPlus: parsed.mythicPlus,
        resolvedAt: new Date().toISOString(),
      };

      if (candidate.state === 'ok') return candidate;
      if (!staleCandidate || candidate.bis.length > staleCandidate.bis.length) {
        staleCandidate = candidate;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (staleCandidate) {
    return {
      ...staleCandidate,
      message: 'Wowhead BiS guide was reachable but does not yet identify the Midnight Season 2 loot pool. HealerLab will not mix the stale list into current-season farming.',
    };
  }

  return {
    state: 'unavailable',
    currentSeason: false,
    source: 'Wowhead',
    sourceUrl: urls[0],
    className,
    specName,
    bis: [],
    mythicPlus: [],
    message: lastError?.message || 'Wowhead BiS guide could not be retrieved.',
    resolvedAt: new Date().toISOString(),
  };
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const className = url.searchParams.get('class') || '';
  const specName = url.searchParams.get('spec') || '';
  const key = guideKey(className, specName);

  if (!GUIDE_MAP[key]) {
    return json({ message: 'Unsupported healer specialization.' }, 400);
  }

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return json(await cached.promise);

  const promise = resolveGuide(className, specName);
  cache.set(key, { promise, expiresAt: Date.now() + CACHE_TTL_MS });

  try {
    return json(await promise);
  } catch (error) {
    cache.delete(key);
    return json({ message: error?.message || 'Wowhead lookup failed.' }, 502);
  }
}