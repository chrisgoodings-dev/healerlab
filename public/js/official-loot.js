export function normaliseLootName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function officialDungeonMap(dungeons) {
  return new Map(
    (Array.isArray(dungeons) ? dungeons : [])
      .filter((dungeon) => dungeon && dungeon.name)
      .map((dungeon) => [normaliseLootName(dungeon.name), dungeon])
  );
}

export function enrichCuratedDungeonsWithOfficial(curatedDungeons, officialDungeons) {
  const officialByDungeon = officialDungeonMap(officialDungeons);

  return (Array.isArray(curatedDungeons) ? curatedDungeons : []).map((curated) => {
    const official = officialByDungeon.get(normaliseLootName(curated.name));
    if (!official) {
      return {
        ...curated,
        officialSource: false,
        journalInstanceId: null,
        instanceIconUrl: null,
      };
    }

    const officialItems = new Map(
      (Array.isArray(official.items) ? official.items : [])
        .filter((item) => item && item.name)
        .map((item) => [normaliseLootName(item.name), item])
    );

    const items = curated.items.map((item) => {
      const officialItem = officialItems.get(normaliseLootName(item.name));
      if (!officialItem) return { ...item, officialSource: false };

      return {
        ...item,
        name: officialItem.name || item.name,
        itemId: Number(officialItem.id) || null,
        encounterId: Number(officialItem.encounterId) || null,
        encounterName: officialItem.encounterName || null,
        officialSource: true,
      };
    });

    return {
      ...curated,
      name: official.name || curated.name,
      journalInstanceId: Number(official.journalInstanceId) || null,
      instanceIconUrl: official.iconUrl || null,
      officialSource: true,
      items,
    };
  });
}
