export async function fetchCharacter({ region, realm, character }, { signal } = {}) {
  const query = new URLSearchParams({ region, realm, name: character });
  const response = await fetch(`/api/character?${query.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Character lookup failed (${response.status}).`;
    throw new Error(message);
  }

  return payload;
}


const SEASON_2_DUNGEONS = [
  'Altar of Fangs',
  'Murder Row',
  'Den of Nalorakk',
  'The Blinding Vale',
  'Voidscar Arena',
  'Ruby Life Pools',
  "Kings' Rest",
  'Temple of Sethraliss',
];

async function fetchOfficialDungeon(region, name, signal) {
  const query = new URLSearchParams({ region, name });
  const response = await fetch(`/api/blizzard/dungeon?${query.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) return null;
  return response.json().catch(() => null);
}

export async function fetchOfficialSeasonLoot(region, { signal } = {}) {
  const results = await Promise.allSettled(
    SEASON_2_DUNGEONS.map((name) => fetchOfficialDungeon(region, name, signal))
  );

  const dungeons = results
    .filter((result) => result.status === 'fulfilled' && result.value)
    .map((result) => result.value);

  return {
    dungeons,
    resolved: dungeons.length,
    total: SEASON_2_DUNGEONS.length,
  };
}
