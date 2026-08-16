import { onRequestGet as getCharacter } from './functions/api/character.js';
import { onRequestGet as getBlizzardItem } from './functions/api/blizzard-item.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/character') {
      if (request.method !== 'GET') {
        return json({ message: 'Method not allowed.' }, 405);
      }

      return getCharacter({ request, env });
    }

    if (url.pathname === '/api/blizzard/item') {
      if (request.method !== 'GET') {
        return json({ message: 'Method not allowed.' }, 405);
      }

      return getBlizzardItem({ request, env });
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ message: 'API route not found.' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
