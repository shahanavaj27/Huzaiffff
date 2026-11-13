import {
  CoinDef,
  LevelConfig,
  LevelTheme,
  MysteryBoxDef,
  PipeDef,
  PlatformDef,
} from './types';

const THEMES: Record<string, LevelTheme> = {
  green_hills: {
    skyTop: '#2563eb',
    skyBottom: '#bae6fd',
    fogColor: '#bae6fd',
    sunColor: '#fffbeb',
    sunIntensity: 1.55,
    grassColor: '#22c55e',
    dirtColor: '#8b5a2b',
    hillColors: ['#16a34a', '#15803d'],
    accentColor: '#22c55e',
  },
  forest: {
    skyTop: '#0d9488',
    skyBottom: '#a7f3d0',
    fogColor: '#bbf7d0',
    sunColor: '#fef9c3',
    sunIntensity: 1.45,
    grassColor: '#16a34a',
    dirtColor: '#6b3e19',
    hillColors: ['#15803d', '#14532d'],
    accentColor: '#10b981',
  },
  mountain: {
    skyTop: '#1d4ed8',
    skyBottom: '#dbeafe',
    fogColor: '#cfe4fc',
    sunColor: '#ffffff',
    sunIntensity: 1.6,
    grassColor: '#4ade80',
    dirtColor: '#57534e',
    hillColors: ['#64748b', '#475569'],
    accentColor: '#3b82f6',
  },
  desert: {
    skyTop: '#c2410c',
    skyBottom: '#fde68a',
    fogColor: '#fed7aa',
    sunColor: '#fff7ed',
    sunIntensity: 1.7,
    grassColor: '#f59e0b',
    dirtColor: '#b45309',
    hillColors: ['#ea580c', '#c2410c'],
    accentColor: '#f97316',
  },
  water: {
    skyTop: '#0284c7',
    skyBottom: '#bae6fd',
    fogColor: '#c7ecfd',
    sunColor: '#fffbeb',
    sunIntensity: 1.6,
    grassColor: '#22c55e',
    dirtColor: '#0e7490',
    hillColors: ['#0891b2', '#0e7490'],
    accentColor: '#0ea5e9',
  },
  snow: {
    skyTop: '#1e40af',
    skyBottom: '#e0f2fe',
    fogColor: '#e2f1fe',
    sunColor: '#f8fafc',
    sunIntensity: 1.65,
    grassColor: '#f1f5f9',
    dirtColor: '#475569',
    hillColors: ['#93c5fd', '#60a5fa'],
    accentColor: '#38bdf8',
  },
  dark_forest: {
    skyTop: '#090d16',
    skyBottom: '#312e81',
    fogColor: '#1e1b4b',
    sunColor: '#c7d2fe',
    sunIntensity: 1.05,
    grassColor: '#059669',
    dirtColor: '#1e293b',
    hillColors: ['#312e81', '#1e1b4b'],
    isNight: true,
    accentColor: '#8b5cf6',
  },
  lava: {
    skyTop: '#2a0808',
    skyBottom: '#991b1b',
    fogColor: '#7f1d1d',
    sunColor: '#fdba74',
    sunIntensity: 1.45,
    grassColor: '#dc2626',
    dirtColor: '#292524',
    hillColors: ['#450a0a', '#7f1d1d'],
    isNight: true,
    accentColor: '#ef4444',
  },
  sky: {
    skyTop: '#0369a1',
    skyBottom: '#e0f2fe',
    fogColor: '#dbeafe',
    sunColor: '#ffffff',
    sunIntensity: 1.7,
    grassColor: '#34d399',
    dirtColor: '#64748b',
    hillColors: ['#7dd3fc', '#38bdf8'],
    accentColor: '#38bdf8',
  },
  kingdom: {
    skyTop: '#1e1b4b',
    skyBottom: '#fbbf24',
    fogColor: '#eab308',
    sunColor: '#fef08a',
    sunIntensity: 1.65,
    grassColor: '#22c55e',
    dirtColor: '#475569',
    hillColors: ['#b45309', '#78350f'],
    accentColor: '#f59e0b',
  },
};

function coinArc(startX: number, baseY: number, count: number, stepX: number, peakH: number): CoinDef[] {
  const arr: CoinDef[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const y = baseY + Math.sin(t * Math.PI) * peakH;
    arr.push({ x: startX + i * stepX, y });
  }
  return arr;
}

function coinRow(startX: number, y: number, count: number, stepX = 1.4, extra?: Partial<CoinDef>): CoinDef[] {
  return Array.from({ length: count }, (_, i) => ({
    x: startX + i * stepX,
    y,
    ...extra,
  }));
}

function makeUndergroundRoom(
  exitTargetX: number,
  exitTargetY: number,
  bonusPowerUp: MysteryBoxDef['reward'],
): {
  platforms: PlatformDef[];
  coins: CoinDef[];
  boxes: MysteryBoxDef[];
  pipes: PipeDef[];
  bounds: { minX: number; maxX: number; floorY: number };
} {
  const floorY = -28;
  const platforms: PlatformDef[] = [
    { x: 18, y: floorY - 1.5, w: 32, h: 3, d: 6, kind: 'underground' },
    { x: 18, y: floorY + 7.5, w: 32, h: 2, d: 6, kind: 'underground' },
    { x: 1.5, y: floorY + 3, w: 2, h: 9, d: 6, kind: 'underground' },
    { x: 34.5, y: floorY + 3, w: 2, h: 9, d: 6, kind: 'underground' },
    { x: 18, y: floorY + 2.7, w: 7, h: 0.7, d: 3.5, kind: 'brick' },
  ];
  const coins: CoinDef[] = [
    ...coinRow(8.5, floorY + 1.0, 12, 1.4, { underground: true }),
    ...coinRow(13.5, floorY + 4.1, 8, 1.4, { underground: true }),
  ];
  const boxes: MysteryBoxDef[] = [
    { x: 18, y: floorY + 4.9, reward: bonusPowerUp, underground: true },
  ];
  const pipes: PipeDef[] = [
    {
      x: 31,
      y: floorY,
      targetX: exitTargetX,
      targetY: exitTargetY,
      toUnderground: false,
      label: 'Exit Cavern',
    },
  ];
  return {
    platforms,
    coins,
    boxes,
    pipes,
    bounds: { minX: 2, maxX: 34, floorY },
  };
}

export const LEVELS: LevelConfig[] = [
  // =========================================================
  // LEVEL 1 — GREEN HILLS (VERY EASY)
  // =========================================================
  (() => {
    const ug = makeUndergroundRoom(56, 2.2, 'shield');
    return {
      id: 1,
      name: 'Green Hills',
      subtitle: 'Very Easy · Sunny Grasslands & First Fluton Coins',
      biome: 'green_hills',
      theme: THEMES.green_hills,
      startX: 0,
      startY: 1.5,
      finishX: 112,
      finishY: 0,
      platforms: [
        { x: 14, y: -1.5, w: 34, h: 3, kind: 'grass' },
        { x: 43, y: -1.5, w: 28, h: 3, kind: 'grass' },
        { x: 61, y: -0.3, w: 14, h: 0.6, d: 3.8, kind: 'bridge' },
        { x: 77, y: -1.5, w: 24, h: 3, kind: 'grass' },
        { x: 20, y: 2.3, w: 7.5, h: 0.75, kind: 'floating' },
        { x: 27, y: 4.1, w: 7.0, h: 0.75, kind: 'floating' },
        { x: 47, y: 2.3, w: 7.0, h: 0.75, kind: 'floating' },
        { x: 82, y: 2.3, w: 7.5, h: 0.75, kind: 'floating' },
        { x: 103, y: -1.5, w: 32, h: 3, kind: 'grass' },
        ...ug.platforms,
      ],
      waterZones: [{ x: 61, y: -2.6, w: 12, h: 2.4 }],
      waterfalls: [{ x: 61, y: 3.2, w: 7, h: 10, z: -8 }],
      coins: [
        ...coinRow(4, 1.0, 7, 1.4),
        ...coinRow(17.5, 3.6, 5, 1.3),
        ...coinRow(24.5, 5.4, 5, 1.3, { secret: true }),
        ...coinRow(44.5, 3.6, 5, 1.3),
        ...coinRow(56, 1.1, 7, 1.4),
        ...coinRow(79.5, 3.6, 5, 1.3),
        ...coinRow(95, 1.0, 7, 1.4),
        ...ug.coins,
      ],
      mysteryBoxes: [
        { x: 12, y: 3.1, reward: 'coins', coinCount: 10 },
        { x: 47, y: 5.2, reward: 'speed' },
        { x: 73, y: 3.1, reward: 'jump' },
        { x: 92, y: 3.1, reward: 'coins', coinCount: 10 },
        ...ug.boxes,
      ],
      enemies: [
        { type: 'walker', x: 76, y: 0, patrolMinX: 70, patrolMaxX: 83, speed: 1.3 },
      ],
      checkpoints: [
        { x: 45, y: 0 },
        { x: 84, y: 0 },
      ],
      pipes: [
        { x: 39, y: 0, targetX: 8, targetY: -25.5, toUnderground: true, label: 'Bonus Meadow' },
        ...ug.pipes,
      ],
      undergroundBounds: ug.bounds,
    };
  })(),

  // =========================================================
  // LEVEL 2 — FOREST ADVENTURE (VERY EASY)
  // =========================================================
  (() => {
    const ug = makeUndergroundRoom(76, 2.5, 'life');
    return {
      id: 2,
      name: 'Forest Adventure',
      subtitle: 'Very Easy · Lush Canopy & Gentle Rafts',
      biome: 'forest',
      theme: THEMES.forest,
      startX: 0,
      startY: 1.5,
      finishX: 126,
      finishY: 0,
      platforms: [
        { x: 12, y: -1.5, w: 28, h: 3, kind: 'grass' },
        { x: 24, y: 2.1, w: 7.5, h: 0.75, kind: 'bridge' },
        { x: 32, y: 3.8, w: 7.5, h: 0.75, kind: 'floating' },
        { x: 36, y: -1.5, w: 22, h: 3, kind: 'grass' },
        {
          x: 52,
          y: 0.3,
          w: 8.5,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'x', range: 2.8, speed: 1.0 },
        },
        { x: 70, y: -1.5, w: 22, h: 3, kind: 'grass' },
        { x: 87, y: -0.2, w: 14, h: 0.6, d: 3.8, kind: 'bridge' },
        { x: 96, y: 2.3, w: 7.0, h: 0.75, kind: 'floating' },
        { x: 114, y: -1.5, w: 34, h: 3, kind: 'grass' },
        ...ug.platforms,
      ],
      waterZones: [
        { x: 52, y: -2.6, w: 14, h: 2.4 },
        { x: 87, y: -2.6, w: 12, h: 2.4 },
      ],
      waterfalls: [{ x: 87, y: 3.0, w: 6.5, h: 10, z: -8 }],
      coins: [
        ...coinRow(4.5, 1.0, 6, 1.4),
        ...coinRow(21.5, 3.4, 5, 1.3),
        ...coinRow(29.5, 5.1, 5, 1.3, { secret: true }),
        ...coinRow(48.5, 2.0, 5, 1.4),
        ...coinRow(65.5, 1.0, 6, 1.4),
        ...coinRow(82, 1.2, 7, 1.4),
        ...coinRow(105, 1.0, 7, 1.4),
        ...ug.coins,
      ],
      mysteryBoxes: [
        { x: 14, y: 3.1, reward: 'coins', coinCount: 10 },
        { x: 37, y: 3.1, reward: 'speed' },
        { x: 72, y: 3.1, reward: 'shield' },
        { x: 103, y: 3.1, reward: 'coins', coinCount: 10 },
        ...ug.boxes,
      ],
      enemies: [
        { type: 'walker', x: 17, y: 0, patrolMinX: 12, patrolMaxX: 22, speed: 1.4 },
        { type: 'hopper', x: 70, y: 0, patrolMinX: 64, patrolMaxX: 76, speed: 1.3 },
        { type: 'flyer', x: 88, y: 3.1, patrolMinX: 82, patrolMaxX: 93, speed: 1.4, amplitude: 0.6 },
      ],
      checkpoints: [
        { x: 44, y: 0 },
        { x: 64, y: 0 },
      ],
      pipes: [
        { x: 41, y: 0, targetX: 8, targetY: -25.5, toUnderground: true, label: 'Root Vault' },
        ...ug.pipes,
      ],
      undergroundBounds: ug.bounds,
    };
  })(),

  // =========================================================
  // LEVEL 3 — MOUNTAIN CLIMB (VERY EASY)
  // =========================================================
  (() => {
    const ug = makeUndergroundRoom(86, 5.5, 'jump');
    return {
      id: 3,
      name: 'Mountain Climb',
      subtitle: 'Very Easy · Wide Stone Steps & Scenic Waterfalls',
      biome: 'mountain',
      theme: THEMES.mountain,
      startX: 0,
      startY: 1.5,
      finishX: 134,
      finishY: 3.5,
      platforms: [
        { x: 10, y: -1.5, w: 24, h: 3, kind: 'stone' },
        { x: 25, y: 0.2, w: 12, h: 3, kind: 'stone' },
        { x: 37, y: 1.8, w: 12, h: 3, kind: 'stone' },
        { x: 47.5, y: 3.6, w: 7.5, h: 0.85, kind: 'floating' },
        {
          x: 56.5,
          y: 3.4,
          w: 7.5,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'y', range: 1.3, speed: 1.05 },
        },
        { x: 69, y: 2.2, w: 18, h: 3, kind: 'stone' },
        { x: 83, y: 4.1, w: 12, h: 0.65, d: 3.6, kind: 'bridge' },
        { x: 95, y: 2.0, w: 16, h: 3, kind: 'stone' },
        {
          x: 106.5,
          y: 3.4,
          w: 7.5,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'x', range: 2.2, speed: 1.1 },
        },
        { x: 116.5, y: 4.4, w: 8.0, h: 0.85, kind: 'floating' },
        { x: 130, y: 2.0, w: 24, h: 3, kind: 'stone' },
        ...ug.platforms,
      ],
      waterZones: [{ x: 54, y: -3.5, w: 18, h: 2.4 }],
      waterfalls: [
        { x: 52, y: 2.5, w: 8, h: 12, z: -7 },
        { x: 84, y: 1.0, w: 7, h: 11, z: -7 },
      ],
      coins: [
        ...coinRow(5.5, 1.1, 5, 1.4),
        ...coinRow(22, 2.8, 5, 1.4),
        ...coinRow(34, 4.4, 5, 1.4),
        ...coinRow(45, 5.0, 5, 1.2, { secret: true }),
        ...coinRow(79, 5.4, 6, 1.4),
        ...coinRow(113.5, 5.8, 5, 1.3, { secret: true }),
        ...coinRow(122, 4.8, 6, 1.4),
        ...ug.coins,
      ],
      mysteryBoxes: [
        { x: 13, y: 3.1, reward: 'jump' },
        { x: 37, y: 6.2, reward: 'coins', coinCount: 10 },
        { x: 69, y: 6.7, reward: 'shield' },
        { x: 95, y: 6.5, reward: 'speed' },
        ...ug.boxes,
      ],
      enemies: [
        { type: 'walker', x: 25, y: 1.7, patrolMinX: 20, patrolMaxX: 30, speed: 1.4 },
        { type: 'flyer', x: 83, y: 6.2, patrolMinX: 78, patrolMaxX: 88, speed: 1.6, amplitude: 0.65 },
        { type: 'walker', x: 95, y: 3.5, patrolMinX: 89, patrolMaxX: 101, speed: 1.5 },
      ],
      checkpoints: [
        { x: 39, y: 3.3 },
        { x: 63, y: 3.7 },
        { x: 91, y: 3.5 },
      ],
      pipes: [
        { x: 73, y: 3.7, targetX: 8, targetY: -25.5, toUnderground: true, label: 'Mountain Mine' },
        ...ug.pipes,
      ],
      undergroundBounds: ug.bounds,
    };
  })(),

  // =========================================================
  // LEVEL 4 — DESERT RUN (EASY)
  // =========================================================
  (() => {
    const ug = makeUndergroundRoom(92, 2.2, 'speed');
    return {
      id: 4,
      name: 'Desert Run',
      subtitle: 'Easy · Golden Dunes & Simple Cactus Jumps',
      biome: 'desert',
      theme: THEMES.desert,
      startX: 0,
      startY: 1.5,
      finishX: 140,
      finishY: 0,
      platforms: [
        { x: 14, y: -1.5, w: 34, h: 3, kind: 'sand' },
        { x: 35, y: 0.0, w: 14, h: 3, kind: 'sand' },
        { x: 46, y: 2.1, w: 7.5, h: 0.85, kind: 'brick' },
        { x: 58, y: -1.5, w: 24, h: 3, kind: 'sand' },
        {
          x: 74,
          y: 1.1,
          w: 7.5,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'x', range: 2.8, speed: 1.2 },
        },
        { x: 89, y: -1.5, w: 24, h: 3, kind: 'sand' },
        { x: 105, y: 1.8, w: 7.5, h: 0.85, kind: 'brick' },
        { x: 114, y: 3.4, w: 7.0, h: 0.85, kind: 'brick' },
        { x: 128, y: -1.5, w: 34, h: 3, kind: 'sand' },
        ...ug.platforms,
      ],
      waterZones: [],
      hazards: [
        { kind: 'cactus', x: 11, y: 0, height: 1.35 },
        { kind: 'cactus', x: 23, y: 0, height: 1.45 },
        { kind: 'cactus', x: 54, y: 0, height: 1.4 },
        { kind: 'cactus', x: 119, y: 0, height: 1.4 },
      ],
      coins: [
        ...coinArc(9.0, 1.8, 4, 1.3, 1.3),
        ...coinArc(21.0, 1.9, 4, 1.3, 1.3),
        ...coinRow(43.5, 3.4, 5, 1.3),
        ...coinRow(58, 1.0, 6, 1.4),
        ...coinRow(86, 1.1, 6, 1.4),
        ...coinRow(111.5, 4.7, 5, 1.2, { secret: true }),
        ...coinRow(123, 1.1, 7, 1.4),
        ...ug.coins,
      ],
      mysteryBoxes: [
        { x: 16, y: 3.2, reward: 'speed' },
        { x: 35, y: 4.7, reward: 'coins', coinCount: 10 },
        { x: 64, y: 3.2, reward: 'shield' },
        { x: 114, y: 6.4, reward: 'life', secret: true },
        ...ug.boxes,
      ],
      enemies: [
        { type: 'walker', x: 35, y: 1.5, patrolMinX: 30, patrolMaxX: 40, speed: 1.6 },
        { type: 'spiky', x: 60, y: 0, patrolMinX: 56, patrolMaxX: 66, speed: 1.6 },
        { type: 'flyer', x: 74, y: 3.8, patrolMinX: 68, patrolMaxX: 81, speed: 1.8, amplitude: 0.75 },
        { type: 'walker', x: 127, y: 0, patrolMinX: 122, patrolMaxX: 133, speed: 1.8 },
      ],
      checkpoints: [
        { x: 51, y: 0 },
        { x: 82, y: 0 },
      ],
      pipes: [
        { x: 96, y: 0, targetX: 8, targetY: -25.5, toUnderground: true, label: 'Pyramid Tomb' },
        ...ug.pipes,
      ],
      undergroundBounds: ug.bounds,
    };
  })(),

  // =========================================================
  // LEVEL 5 — WATER WORLD (EASY)
  // =========================================================
  (() => {
    const ug = makeUndergroundRoom(92, 2.2, 'shield');
    return {
      id: 5,
      name: 'Water World',
      subtitle: 'Easy · Bridges, Sea Rafts & Checkpoints',
      biome: 'water',
      theme: THEMES.water,
      startX: 0,
      startY: 1.5,
      finishX: 142,
      finishY: 0,
      platforms: [
        { x: 9, y: -1.5, w: 22, h: 3, kind: 'grass' },
        { x: 24, y: -0.2, w: 14, h: 0.65, d: 3.8, kind: 'bridge' },
        { x: 36, y: -1.5, w: 14, h: 3, kind: 'grass' },
        {
          x: 48,
          y: 0.4,
          w: 7.5,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'x', range: 2.8, speed: 1.2 },
        },
        {
          x: 61,
          y: 1.6,
          w: 7.5,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'y', range: 1.3, speed: 1.25 },
        },
        { x: 74, y: -1.5, w: 20, h: 3, kind: 'grass' },
        { x: 89, y: -0.2, w: 14, h: 0.65, d: 3.8, kind: 'bridge' },
        { x: 102, y: -1.5, w: 15, h: 3, kind: 'grass' },
        {
          x: 115,
          y: 0.5,
          w: 7.5,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'x', range: 2.8, speed: 1.25 },
        },
        { x: 132, y: -1.5, w: 30, h: 3, kind: 'grass' },
        ...ug.platforms,
      ],
      waterZones: [
        { x: 24, y: -2.6, w: 12, h: 2.4 },
        { x: 54, y: -2.6, w: 22, h: 2.4 },
        { x: 90, y: -2.6, w: 13, h: 2.4 },
        { x: 114, y: -2.6, w: 14, h: 2.4 },
      ],
      waterfalls: [
        { x: 26, y: 3.5, w: 8, h: 11, z: -8 },
        { x: 90, y: 3.5, w: 8, h: 11, z: -8 },
      ],
      coins: [
        ...coinRow(18, 1.3, 7, 1.4),
        ...coinArc(44, 2.2, 6, 1.4, 1.4),
        ...coinRow(58, 3.6, 5, 1.3),
        ...coinRow(83, 1.3, 7, 1.4),
        ...coinRow(111, 2.2, 6, 1.4),
        ...coinRow(124, 1.1, 7, 1.4),
        ...ug.coins,
      ],
      mysteryBoxes: [
        { x: 12, y: 3.2, reward: 'jump' },
        { x: 36, y: 3.2, reward: 'coins', coinCount: 10 },
        { x: 76, y: 3.2, reward: 'shield' },
        { x: 103, y: 3.2, reward: 'speed' },
        ...ug.boxes,
      ],
      enemies: [
        { type: 'flyer', x: 25, y: 2.8, patrolMinX: 19, patrolMaxX: 31, speed: 1.7, amplitude: 0.7 },
        { type: 'hopper', x: 36, y: 0, patrolMinX: 32, patrolMaxX: 40, speed: 1.6 },
        { type: 'spiky', x: 74, y: 0, patrolMinX: 68, patrolMaxX: 80, speed: 1.7 },
        { type: 'walker', x: 128, y: 0, patrolMinX: 121, patrolMaxX: 135, speed: 1.8 },
      ],
      checkpoints: [
        { x: 39, y: 0 },
        { x: 68, y: 0 },
        { x: 105, y: 0 },
      ],
      pipes: [
        { x: 79, y: 0, targetX: 8, targetY: -25.5, toUnderground: true, label: 'Sunken Grotto' },
        ...ug.pipes,
      ],
      undergroundBounds: ug.bounds,
    };
  })(),

  // =========================================================
  // LEVEL 6 — SNOW MOUNTAIN (EASY)
  // =========================================================
  (() => {
    const ug = makeUndergroundRoom(98, 2.5, 'life');
    return {
      id: 6,
      name: 'Snow Mountain',
      subtitle: 'Easy · Wide Ice Ledges & Gentle Snowflakes',
      biome: 'snow',
      theme: THEMES.snow,
      startX: 0,
      startY: 1.5,
      finishX: 146,
      finishY: 1.0,
      platforms: [
        { x: 10, y: -1.5, w: 26, h: 3, kind: 'ice' },
        { x: 28, y: 0.2, w: 12, h: 2.6, kind: 'ice' },
        { x: 41, y: 1.8, w: 11, h: 0.9, kind: 'ice' },
        { x: 52.5, y: 3.1, w: 8.5, h: 0.85, kind: 'floating' },
        {
          x: 64,
          y: 1.6,
          w: 7.5,
          h: 0.85,
          kind: 'ice',
          moving: { axis: 'x', range: 2.8, speed: 1.25 },
        },
        { x: 80, y: -0.5, w: 22, h: 3, kind: 'ice' },
        { x: 96, y: 1.8, w: 12, h: 0.7, kind: 'bridge' },
        {
          x: 106.5,
          y: 2.6,
          w: 7.5,
          h: 0.85,
          kind: 'ice',
          moving: { axis: 'y', range: 1.5, speed: 1.3 },
        },
        { x: 116.5, y: 3.9, w: 9.0, h: 0.85, kind: 'ice' },
        { x: 138, y: -0.5, w: 30, h: 3, kind: 'ice' },
        ...ug.platforms,
      ],
      waterZones: [{ x: 64, y: -3.0, w: 18, h: 2.4 }],
      coins: [
        ...coinRow(7, 1.0, 6, 1.4),
        ...coinRow(24, 2.5, 5, 1.4),
        ...coinRow(37, 3.5, 5, 1.4),
        ...coinRow(49.5, 4.5, 5, 1.3, { secret: true }),
        ...coinRow(75, 2.0, 7, 1.4),
        ...coinRow(114, 5.3, 5, 1.3),
        ...coinRow(129, 2.0, 7, 1.4),
        ...ug.coins,
      ],
      mysteryBoxes: [
        { x: 12, y: 3.2, reward: 'shield' },
        { x: 41, y: 5.0, reward: 'coins', coinCount: 10 },
        { x: 82, y: 4.1, reward: 'jump' },
        { x: 118, y: 7.0, reward: 'speed', secret: true },
        ...ug.boxes,
      ],
      enemies: [
        { type: 'spiky', x: 28, y: 1.5, patrolMinX: 24, patrolMaxX: 32, speed: 1.7 },
        { type: 'flyer', x: 52, y: 5.4, patrolMinX: 47, patrolMaxX: 58, speed: 1.9, amplitude: 0.7 },
        { type: 'hopper', x: 80, y: 1.0, patrolMinX: 73, patrolMaxX: 87, speed: 1.8 },
      ],
      checkpoints: [
        { x: 41, y: 2.25 },
        { x: 75, y: 1.0 },
        { x: 96, y: 2.15 },
      ],
      pipes: [
        { x: 86, y: 1.0, targetX: 8, targetY: -25.5, toUnderground: true, label: 'Ice Cavern' },
        ...ug.pipes,
      ],
      undergroundBounds: ug.bounds,
    };
  })(),

  // =========================================================
  // LEVEL 7 — DARK FOREST (NORMAL)
  // =========================================================
  (() => {
    const ug = makeUndergroundRoom(109, 4.2, 'jump');
    return {
      id: 7,
      name: 'Dark Forest',
      subtitle: 'Normal · Moonlit Woods & Glowing Fluton Coins',
      biome: 'dark_forest',
      theme: THEMES.dark_forest,
      startX: 0,
      startY: 1.5,
      finishX: 150,
      finishY: 0,
      platforms: [
        { x: 9, y: -1.5, w: 22, h: 3, kind: 'grass' },
        { x: 23, y: 1.6, w: 7.0, h: 0.85, kind: 'floating' },
        { x: 32, y: 3.4, w: 7.5, h: 0.85, kind: 'bridge' },
        { x: 43, y: -1.0, w: 18, h: 3, kind: 'grass' },
        {
          x: 56,
          y: 1.8,
          w: 7.0,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'y', range: 1.6, speed: 1.45 },
        },
        { x: 65.5, y: 3.6, w: 8.5, h: 0.85, kind: 'brick' },
        { x: 80, y: -1.0, w: 20, h: 3, kind: 'grass' },
        {
          x: 95,
          y: 1.6,
          w: 7.0,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'x', range: 3.0, speed: 1.5 },
        },
        { x: 109, y: 2.4, w: 10, h: 0.85, kind: 'bridge' },
        { x: 119.5, y: 4.0, w: 7.5, h: 0.85, kind: 'floating' },
        { x: 138, y: -1.5, w: 34, h: 3, kind: 'grass' },
        ...ug.platforms,
      ],
      waterZones: [{ x: 58, y: -3.2, w: 22, h: 2.4 }],
      coins: [
        ...coinRow(5, 1.1, 5, 1.4),
        ...coinRow(20, 2.9, 5, 1.3),
        ...coinRow(29.5, 4.7, 5, 1.3),
        ...coinRow(64, 5.0, 5, 1.3),
        ...coinRow(76, 1.5, 6, 1.4),
        ...coinRow(106.5, 3.7, 5, 1.3),
        ...coinRow(118, 5.4, 5, 1.3, { secret: true }),
        ...coinRow(129, 1.0, 7, 1.4),
        ...ug.coins,
      ],
      mysteryBoxes: [
        { x: 11, y: 3.2, reward: 'shield' },
        { x: 43, y: 3.7, reward: 'jump' },
        { x: 67, y: 6.7, reward: 'coins', coinCount: 12 },
        { x: 121, y: 7.2, reward: 'life', secret: true },
        ...ug.boxes,
      ],
      enemies: [
        { type: 'spiky', x: 43, y: 0.5, patrolMinX: 37, patrolMaxX: 49, speed: 1.9 },
        { type: 'flyer', x: 56, y: 4.5, patrolMinX: 50, patrolMaxX: 62, speed: 2.1, amplitude: 0.8 },
        { type: 'hopper', x: 80, y: 0.5, patrolMinX: 74, patrolMaxX: 86, speed: 2.0 },
        { type: 'spiky', x: 132, y: 0, patrolMinX: 125, patrolMaxX: 139, speed: 2.1 },
      ],
      checkpoints: [
        { x: 46, y: 0.5 },
        { x: 75, y: 0.5 },
      ],
      pipes: [
        { x: 85, y: 0.5, targetX: 8, targetY: -25.5, toUnderground: true, label: 'Shadow Crypt' },
        ...ug.pipes,
      ],
      undergroundBounds: ug.bounds,
    };
  })(),

  // =========================================================
  // LEVEL 8 — LAVA WORLD (NORMAL)
  // =========================================================
  (() => {
    const ug = makeUndergroundRoom(102, 2.5, 'shield');
    return {
      id: 8,
      name: 'Lava World',
      subtitle: 'Normal · Magma Bridges & Timed Fire Geysers',
      biome: 'lava',
      theme: THEMES.lava,
      startX: 0,
      startY: 1.5,
      finishX: 154,
      finishY: 0,
      platforms: [
        { x: 9, y: -1.5, w: 22, h: 3, kind: 'stone' },
        { x: 24, y: 1.3, w: 7.5, h: 0.85, kind: 'stone' },
        { x: 34, y: 2.7, w: 9.0, h: 0.85, kind: 'stone' },
        {
          x: 47,
          y: 1.6,
          w: 7.0,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'x', range: 3.0, speed: 1.5 },
        },
        { x: 61, y: -0.5, w: 20, h: 3, kind: 'stone' },
        {
          x: 75,
          y: 2.1,
          w: 7.0,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'y', range: 1.6, speed: 1.5 },
        },
        { x: 86, y: 3.6, w: 9.0, h: 0.85, kind: 'brick' },
        { x: 100, y: -0.5, w: 20, h: 3, kind: 'stone' },
        { x: 114, y: 1.5, w: 11, h: 0.75, kind: 'stone' },
        {
          x: 127,
          y: 2.3,
          w: 7.0,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'x', range: 3.0, speed: 1.55 },
        },
        { x: 144, y: -1.5, w: 32, h: 3, kind: 'stone' },
        ...ug.platforms,
      ],
      waterZones: [
        { x: 36, y: -2.8, w: 28, h: 2.4, isLava: true },
        { x: 80, y: -2.8, w: 22, h: 2.4, isLava: true },
        { x: 124, y: -2.8, w: 20, h: 2.4, isLava: true },
      ],
      waterfalls: [
        { x: 35, y: 3.5, w: 7, h: 12, z: -8, isLava: true },
        { x: 125, y: 3.5, w: 7, h: 12, z: -8, isLava: true },
      ],
      hazards: [
        { kind: 'fire_geyser', x: 14, y: 0, period: 3.6, phase: 0 },
        { kind: 'fire_geyser', x: 64, y: 1.0, period: 3.6, phase: 1.5 },
        { kind: 'fire_geyser', x: 136, y: 0, period: 3.6, phase: 2.2 },
      ],
      coins: [
        ...coinRow(4, 1.1, 5, 1.4),
        ...coinRow(21.5, 2.7, 5, 1.3),
        ...coinRow(31, 4.1, 5, 1.3),
        ...coinRow(83.5, 5.0, 5, 1.3),
        ...coinRow(95, 2.0, 6, 1.4),
        ...coinRow(111, 3.0, 5, 1.4),
        ...coinRow(139, 1.1, 7, 1.4),
        ...ug.coins,
      ],
      mysteryBoxes: [
        { x: 10, y: 3.2, reward: 'shield' },
        { x: 34, y: 5.7, reward: 'speed' },
        { x: 60, y: 4.1, reward: 'jump' },
        { x: 100, y: 4.1, reward: 'coins', coinCount: 12 },
        ...ug.boxes,
      ],
      enemies: [
        { type: 'spiky', x: 34, y: 3.1, patrolMinX: 31, patrolMaxX: 37, speed: 1.6 },
        { type: 'flyer', x: 48, y: 4.5, patrolMinX: 41, patrolMaxX: 54, speed: 2.1, amplitude: 0.8 },
        { type: 'hopper', x: 96, y: 1.0, patrolMinX: 92, patrolMaxX: 104, speed: 2.0 },
        { type: 'spiky', x: 142, y: 0, patrolMinX: 138, patrolMaxX: 147, speed: 2.1 },
      ],
      checkpoints: [
        { x: 61, y: 1.0 },
        { x: 103, y: 1.0 },
      ],
      pipes: [
        { x: 94, y: 1.0, targetX: 8, targetY: -25.5, toUnderground: true, label: 'Obsidian Core' },
        ...ug.pipes,
      ],
      undergroundBounds: ug.bounds,
    };
  })(),

  // =========================================================
  // LEVEL 9 — SKY ADVENTURE (MEDIUM)
  // =========================================================
  (() => {
    const ug = makeUndergroundRoom(109, 5.4, 'life');
    return {
      id: 9,
      name: 'Sky Adventure',
      subtitle: 'Medium · Floating Cloud Islands & Sky Waterfalls',
      biome: 'sky',
      theme: THEMES.sky,
      startX: 0,
      startY: 2.5,
      finishX: 160,
      finishY: 2.5,
      platforms: [
        { x: 8, y: -0.5, w: 22, h: 3, kind: 'grass' },
        { x: 22, y: 2.1, w: 7.5, h: 0.9, kind: 'cloud' },
        { x: 31, y: 3.8, w: 8.0, h: 0.9, kind: 'cloud' },
        {
          x: 43,
          y: 4.0,
          w: 7.0,
          h: 0.9,
          kind: 'cloud',
          moving: { axis: 'x', range: 3.0, speed: 1.55 },
        },
        { x: 56, y: 2.0, w: 16, h: 2.5, kind: 'grass' },
        {
          x: 69,
          y: 3.6,
          w: 7.0,
          h: 0.9,
          kind: 'cloud',
          moving: { axis: 'y', range: 1.6, speed: 1.6 },
        },
        { x: 78.5, y: 5.0, w: 8.5, h: 0.9, kind: 'cloud' },
        { x: 94, y: 2.0, w: 18, h: 2.5, kind: 'grass' },
        { x: 109, y: 4.0, w: 7.5, h: 0.9, kind: 'cloud' },
        {
          x: 121,
          y: 4.0,
          w: 7.0,
          h: 0.9,
          kind: 'cloud',
          moving: { axis: 'x', range: 3.1, speed: 1.65 },
        },
        { x: 134, y: 5.2, w: 8.0, h: 0.9, kind: 'cloud' },
        { x: 150, y: 1.0, w: 30, h: 3, kind: 'grass' },
        ...ug.platforms,
      ],
      waterZones: [],
      waterfalls: [
        { x: 58, y: -3.5, w: 5.5, h: 11, z: -3.5 },
        { x: 96, y: -3.5, w: 5.5, h: 11, z: -3.5 },
      ],
      coins: [
        ...coinRow(4.5, 2.0, 5, 1.4),
        ...coinRow(19.5, 3.4, 5, 1.3),
        ...coinRow(28.5, 5.1, 5, 1.3),
        ...coinRow(53, 4.4, 6, 1.4),
        ...coinRow(76.5, 6.5, 5, 1.3, { secret: true }),
        ...coinRow(106.5, 5.3, 5, 1.3),
        ...coinRow(131.5, 6.6, 5, 1.3),
        ...coinRow(143, 3.8, 7, 1.4),
        ...ug.coins,
      ],
      mysteryBoxes: [
        { x: 11, y: 4.2, reward: 'jump' },
        { x: 56, y: 6.4, reward: 'shield' },
        { x: 80, y: 8.4, reward: 'life', secret: true },
        { x: 94, y: 6.4, reward: 'speed' },
        ...ug.boxes,
      ],
      enemies: [
        { type: 'flyer', x: 35, y: 5.8, patrolMinX: 29, patrolMaxX: 42, speed: 2.1, amplitude: 0.8 },
        { type: 'hopper', x: 56, y: 3.25, patrolMinX: 50, patrolMaxX: 61, speed: 2.0 },
        { type: 'flyer', x: 124, y: 6.2, patrolMinX: 117, patrolMaxX: 131, speed: 2.2, amplitude: 0.85 },
        { type: 'spiky', x: 144, y: 2.5, patrolMinX: 138, patrolMaxX: 152, speed: 2.2 },
      ],
      checkpoints: [
        { x: 54, y: 3.25 },
        { x: 91, y: 3.25 },
      ],
      pipes: [
        { x: 99, y: 3.25, targetX: 8, targetY: -25.5, toUnderground: true, label: 'Cloud Vault' },
        ...ug.pipes,
      ],
      undergroundBounds: ug.bounds,
    };
  })(),

  // =========================================================
  // LEVEL 10 — FLUTON KINGDOM (MEDIUM · ROYAL FINALE + BOSS!)
  // =========================================================
  (() => {
    const ug = makeUndergroundRoom(112, 2.5, 'shield');
    return {
      id: 10,
      name: 'Fluton Kingdom',
      subtitle: 'Medium · Royal Citadel & Shadow King Boss Battle',
      biome: 'kingdom',
      theme: THEMES.kingdom,
      startX: 0,
      startY: 1.5,
      finishX: 168,
      finishY: 0,
      platforms: [
        { x: 9, y: -1.5, w: 24, h: 3, kind: 'castle' },
        {
          x: 25,
          y: 1.4,
          w: 7.0,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'x', range: 2.9, speed: 1.65 },
        },
        { x: 38, y: 0.0, w: 16, h: 3, kind: 'castle' },
        {
          x: 50,
          y: 2.1,
          w: 7.0,
          h: 0.85,
          kind: 'floating',
          moving: { axis: 'y', range: 1.6, speed: 1.65 },
        },
        { x: 60, y: 3.8, w: 9.0, h: 0.85, kind: 'brick' },
        { x: 74, y: 1.2, w: 14, h: 0.65, d: 3.8, kind: 'bridge' },
        { x: 88, y: -0.5, w: 20, h: 3, kind: 'castle' },
        { x: 100, y: 2.6, w: 7.5, h: 0.85, kind: 'floating' },
        { x: 100, y: 5.4, w: 6.5, h: 0.75, kind: 'floating' },
        { x: 112, y: -1.5, w: 20, h: 3, kind: 'castle' },
        // Grand Boss Courtyard + Finish Gate Sanctuary
        { x: 148, y: -1.5, w: 50, h: 3, d: 6.5, kind: 'castle' },
        // Elevated Boss Arena jump pads (easy crown stomp access!)
        { x: 134, y: 2.4, w: 5.5, h: 0.75, kind: 'floating' },
        { x: 144, y: 3.1, w: 5.5, h: 0.75, kind: 'floating' },
        { x: 154, y: 2.4, w: 5.5, h: 0.75, kind: 'floating' },
        ...ug.platforms,
      ],
      waterZones: [
        { x: 28, y: -3.2, w: 15, h: 2.4 },
        { x: 74, y: -3.2, w: 18, h: 2.4 },
      ],
      waterfalls: [
        { x: 74, y: 3.8, w: 7, h: 12, z: -8 },
      ],
      hazards: [
        { kind: 'fire_geyser', x: 89, y: 1.0, period: 3.6, phase: 0.5 },
      ],
      coins: [
        ...coinRow(5, 1.0, 7, 1.4),
        ...coinRow(57, 5.1, 5, 1.3),
        ...coinRow(69.5, 2.7, 7, 1.4),
        ...coinRow(97.5, 6.7, 5, 1.3, { secret: true }),
        ...coinRow(132, 3.6, 4, 1.3),
        ...coinRow(142, 4.3, 4, 1.3),
        ...coinRow(152, 3.6, 4, 1.3),
        ...ug.coins,
      ],
      mysteryBoxes: [
        { x: 13, y: 3.2, reward: 'speed' },
        { x: 38, y: 4.6, reward: 'shield' },
        { x: 100, y: 8.2, reward: 'life', secret: true },
        { x: 127, y: 3.2, reward: 'jump' },
        { x: 144, y: 5.8, reward: 'shield' },
        ...ug.boxes,
      ],
      enemies: [
        { type: 'spiky', x: 38, y: 1.5, patrolMinX: 33, patrolMaxX: 43, speed: 2.0 },
        { type: 'flyer', x: 54, y: 4.8, patrolMinX: 48, patrolMaxX: 60, speed: 2.2, amplitude: 0.8 },
        { type: 'walker', x: 112, y: 0, patrolMinX: 105, patrolMaxX: 118, speed: 2.2 },
      ],
      checkpoints: [
        { x: 35, y: 1.5 },
        { x: 82, y: 1.0 },
        { x: 125, y: 0 },
      ],
      pipes: [
        { x: 116, y: 0, targetX: 8, targetY: -25.5, toUnderground: true, label: 'Royal Treasury' },
        ...ug.pipes,
      ],
      boss: {
        name: 'Shadow King Spike',
        x: 148,
        y: 0,
        minX: 132,
        maxX: 159,
        maxHp: 4,
      },
      undergroundBounds: ug.bounds,
    };
  })(),
];
