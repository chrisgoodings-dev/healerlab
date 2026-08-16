import { blizzardConfigured, fetchBlizzardItem } from './blizzard.js';

const ALLOWED_REGIONS = new Set(['eu', 'us', 'kr', 'tw']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=3600' : 'no-store',
    },
  });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const region = (url.searchParams.get('region') || '').toLowerCase();
  const itemId = Number(url.searchParams.get('id'));

  if (!ALLOWED_REGIONS.has(region)) return json({ message: 'Unsupported region.' }, 400);
  if (!Number.isInteger(itemId) || itemId <= 0) return json({ message: 'Invalid item ID.' }, 400);

  if (!blizzardConfigured(context.env || {})) {
    return json({ message: 'Blizzard API credentials are not configured.' }, 503);
  }

  try {
    return json(await fetchBlizzardItem({ region, itemId, env: context.env || {} }));
  } catch (error) {
    return json({
      message: error?.message || 'Blizzard item lookup failed.',
    }, error?.status === 404 ? 404 : 502);
  }
}
