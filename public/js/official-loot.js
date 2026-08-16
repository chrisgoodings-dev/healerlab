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

function officialLootItem(item) {
  if (!item || !item.name) return null;

  return {
    name: item.name,
    itemId: Number(item.id || item.itemId) || null,
    encounterId: Number(item.encounterId) || null,
    encounterName: item.encounterName || null,
    slot: item.slot || null,
    armor: item.armor || null,
    weaponType: item.weaponType || null,
    itemClass: item.itemClass || null,
    itemSubclass: item.itemSubclass || null,
    inventoryType: item.inventoryType || null,
    secondaryStats: item.secondaryStats || null,
    secondaryStatTypes: Array.isArray(item.secondaryStatTypes)
      ? item.secondaryStatTypes
      : [],
    effects: Array.isArray(item.effects) ? item.effects : [],
    iconUrl: item.iconUrl || null,
    officialSource: true,
    metadataSource: item.metadataSource || 'blizzard-item',
  };
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
        liveLootCoverage: 0,
      };
    }

    const officialItems = new Map(
      (Array.isArray(official.items) ? official.items : [])
        .filter((item) => item && item.name)
        .map((item) => [normaliseLootName(item.name), item])
    );

    const matchedNames = new Set();

    const curatedItems = curated.items.map((item) => {
      const key = normaliseLootName(item.name);
      const officialItem = officialItems.get(key);
      if (!officialItem) return { ...item, officialSource: false };

      matchedNames.add(key);
      const live = officialLootItem(officialItem);

      return {
        ...item,
        ...live,
        // Retain curated safety metadata if Blizzard's base item does not
        // express it directly.
        slot: live.slot || item.slot,
        armor: live.armor || item.armor || null,
        classes: Array.isArray(item.classes) ? item.classes : undefined,
        secondaryStats: live.secondaryStats || item.secondaryStats || null,
        secondaryStatTypes: live.secondaryStatTypes?.length
          ? live.secondaryStatTypes
          : (item.secondaryStatTypes || []),
      };
    });

    // The old implementation could only enrich items whose names were already
    // in the hand-maintained table. Append Blizzard Journal items that are not
    // curated when the Item API gives us enough metadata to classify the slot.
    const liveOnlyItems = [...officialItems.entries()]
      .filter(([key]) => !matchedNames.has(key))
      .map(([, item]) => officialLootItem(item))
      .filter((item) => item && item.slot);

    const items = [...curatedItems, ...liveOnlyItems];

    return {
      ...curated,
      name: official.name || curated.name,
      journalInstanceId: Number(official.journalInstanceId) || null,
      instanceIconUrl: official.iconUrl || null,
      officialSource: true,
      liveLootCoverage: liveOnlyItems.length
        + curatedItems.filter((item) => item.officialSource).length,
      liveLootTotal: Array.isArray(official.items) ? official.items.length : 0,
      items,
    };
  });
}