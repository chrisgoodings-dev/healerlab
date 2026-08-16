function normalise(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function usableWowheadGuide(payload) {
  return Boolean(
    payload
    && payload.state === 'ok'
    && payload.currentSeason === true
    && Array.isArray(payload.bis)
    && payload.bis.length > 0
  );
}

export function wowheadSourceSummary(payload) {
  const result = {
    available: usableWowheadGuide(payload),
    raid: 0,
    lair: 0,
    dungeons: new Map(),
    bisItems: [],
    mythicPlusItems: [],
  };

  if (!result.available) return result;

  const add = (item, category) => {
    const source = item?.source || {};
    const entry = { ...item, category };
    if (category === 'bis') result.bisItems.push(entry);
    else result.mythicPlusItems.push(entry);

    if (source.kind === 'raid') result.raid += 1;
    if (source.kind === 'lair') result.lair += 1;
    if (source.kind === 'dungeon' && source.instance) {
      const key = normalise(source.instance);
      const current = result.dungeons.get(key) || { bis: 0, mythicPlus: 0, items: [] };
      if (category === 'bis') current.bis += 1;
      else current.mythicPlus += 1;
      current.items.push(entry);
      result.dungeons.set(key, current);
    }
  };

  for (const item of payload.bis || []) add(item, 'bis');
  for (const item of payload.mythicPlus || []) add(item, 'mythic_plus');
  return result;
}

export function annotateDungeonLootWithWowhead(dungeons, payload) {
  const source = wowheadSourceSummary(payload);
  const list = Array.isArray(dungeons) ? dungeons : [];
  if (!source.available) return list;

  const annotated = list.map((dungeon) => {
    const guide = source.dungeons.get(normalise(dungeon.name)) || { bis: 0, mythicPlus: 0, items: [] };
    const guideBonus = (guide.bis * 14) + (guide.mythicPlus * 5);
    return {
      ...dungeon,
      wowheadBisTargets: guide.bis,
      wowheadMythicTargets: guide.mythicPlus,
      wowheadGuideItems: guide.items,
      wowheadBonus: guideBonus,
      rawGearOpportunity: Number(dungeon.rawGearOpportunity || 0) + guideBonus,
    };
  });

  const maxRaw = Math.max(0, ...annotated.map((dungeon) => Number(dungeon.rawGearOpportunity) || 0));
  return annotated
    .map((dungeon) => ({
      ...dungeon,
      gearOpportunity: maxRaw > 0
        ? (Number(dungeon.rawGearOpportunity || 0) / maxRaw) * 100
        : Number(dungeon.gearOpportunity || 0),
    }))
    .sort((a, b) =>
      b.gearOpportunity - a.gearOpportunity
      || b.wowheadBisTargets - a.wowheadBisTargets
      || b.matchedSlots - a.matchedSlots
      || a.name.localeCompare(b.name)
    );
}