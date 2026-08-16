import { enrichCharacterWithBlizzard } from './blizzard.js';

const ALLOWED_REGIONS = new Set(['eu', 'us', 'kr', 'tw']);
const FIELDS = [
  'gear',
  'mythic_plus_scores_by_season:current',
  'mythic_plus_best_runs',
  'raid_progression'
].join(',');

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=120' : 'no-store',
      ...extraHeaders,
    },
  });
}

function validName(value, maxLength) {
  return typeof value === 'string' && value.length >= 2 && value.length <= maxLength && /^[\p{L}\p{N}' -]+$/u.test(value);
}

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const region = (requestUrl.searchParams.get('region') || '').toLowerCase();
  const realm = (requestUrl.searchParams.get('realm') || '').trim();
  const name = (requestUrl.searchParams.get('name') || '').trim();

  if (!ALLOWED_REGIONS.has(region)) return json({ message: 'Unsupported region.' }, 400);
  if (!validName(realm, 80)) return json({ message: 'Invalid realm name.' }, 400);
  if (!validName(name, 24)) return json({ message: 'Invalid character name.' }, 400);

  const upstream = new URL('https://raider.io/api/v1/characters/profile');
  upstream.searchParams.set('region', region);
  upstream.searchParams.set('realm', realm);
  upstream.searchParams.set('name', name);
  upstream.searchParams.set('fields', FIELDS);

  try {
    const response = await fetch(upstream, {
      headers: {
        accept: 'application/json',
        'user-agent': 'HealerLab/0.4 university-project'
      },
    });

    const body = await response.text();
    let payload;
    try { payload = JSON.parse(body); } catch { payload = { message: body || 'Unexpected response from Raider.IO.' }; }

    if (!response.ok) {
      return json({
        message: payload?.message || payload?.error || 'Raider.IO could not return that character.',
        upstreamStatus: response.status,
      }, response.status === 404 ? 404 : 502);
    }

    const enriched = await enrichCharacterWithBlizzard(payload, {
      region,
      realm,
      name,
      env: context.env || {},
    });

    return json(enriched);
  } catch {
    return json({ message: 'The Raider.IO service could not be reached.' }, 502);
  }
}
