import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequestGet as getCharacter } from './functions/api/character.js';
import { onRequestGet as getBlizzardItem } from './functions/api/blizzard-item.js';
import { onRequestGet as getBlizzardDungeon } from './functions/api/blizzard-dungeon.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, process.env.SERVE_DIR || 'public');
const port = Number(process.env.PORT || 5173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function send(res, status, body, contentType = 'text/plain; charset=utf-8', headers = {}) {
  res.writeHead(status, { 'content-type': contentType, ...headers });
  res.end(body);
}

function parseDotEnv(text) {
  const values = {};
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function loadLocalEnv() {
  let devVars = {};
  try {
    devVars = parseDotEnv(await readFile(path.join(__dirname, '.dev.vars'), 'utf8'));
  } catch {
    // .dev.vars is optional. The site still works with Raider.IO only.
  }

  return {
    ...process.env,
    BLIZZARD_CLIENT_ID:
      devVars.BLIZZARD_CLIENT_ID ||
      process.env.BLIZZARD_CLIENT_ID ||
      'c02a86b8ca7e4800b1e3a29c430808e3',
    BLIZZARD_CLIENT_SECRET:
      devVars.BLIZZARD_CLIENT_SECRET ||
      process.env.BLIZZARD_CLIENT_SECRET ||
      '',
  };
}

const env = await loadLocalEnv();

async function sendFetchResponse(res, response) {
  const body = Buffer.from(await response.arrayBuffer());
  const headers = {};
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'content-length') headers[key] = value;
  });
  res.writeHead(response.status, headers);
  res.end(body);
}

async function runApiHandler(req, res, handler) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
  });

  try {
    await sendFetchResponse(res, await handler({ request, env }));
  } catch (error) {
    send(
      res,
      500,
      JSON.stringify({ message: error?.message || 'Local API handler failed.' }),
      'application/json; charset=utf-8'
    );
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/character') {
    return runApiHandler(req, res, getCharacter);
  }

  if (url.pathname === '/api/blizzard/item') {
    return runApiHandler(req, res, getBlizzardItem);
  }

  if (url.pathname === '/api/blizzard/dungeon') {
    return runApiHandler(req, res, getBlizzardDungeon);
  }

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
  const blizzard = env.BLIZZARD_CLIENT_SECRET ? 'Blizzard enabled' : 'Blizzard disabled (set .dev.vars)';
  console.log(`HealerLab running at http://127.0.0.1:${port} | ${blizzard}`);
});
