import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, process.env.SERVE_DIR || 'public');
const port = Number(process.env.PORT || 5173);
const fields = 'gear,mythic_plus_scores_by_season:current,mythic_plus_best_runs,raid_progression';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': contentType });
  res.end(body);
}

async function proxyCharacter(req, res, url) {
  const region = url.searchParams.get('region') || '';
  const realm = url.searchParams.get('realm') || '';
  const name = url.searchParams.get('name') || '';
  const upstream = new URL('https://raider.io/api/v1/characters/profile');
  upstream.searchParams.set('region', region);
  upstream.searchParams.set('realm', realm);
  upstream.searchParams.set('name', name);
  upstream.searchParams.set('fields', fields);

  try {
    const response = await fetch(upstream, { headers: { accept: 'application/json' } });
    const body = await response.text();
    send(res, response.status, body, 'application/json; charset=utf-8');
  } catch {
    send(res, 502, JSON.stringify({ message: 'Raider.IO is unavailable from the local development server.' }), 'application/json; charset=utf-8');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/character') return proxyCharacter(req, res, url);

  const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const filePath = path.normalize(path.join(root, relative));
  if (!filePath.startsWith(root)) return send(res, 403, 'Forbidden');

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not file');
    const data = await readFile(filePath);
    send(res, 200, data, types[path.extname(filePath)] || 'application/octet-stream');
  } catch {
    try {
      const data = await readFile(path.join(root, 'index.html'));
      send(res, 200, data, types['.html']);
    } catch {
      send(res, 404, 'Not found');
    }
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`HealerLab running at http://127.0.0.1:${port}`);
});
