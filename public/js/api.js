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
