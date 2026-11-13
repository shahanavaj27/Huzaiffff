export type GamePhase =
  | 'title'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'levelcomplete'
  | 'victory';

export type PowerUpType = 'speed' | 'jump' | 'shield' | 'life';

export type EnemyType = 'walker' | 'spiky' | 'flyer' | 'hopper';

export type BiomeId =
  | 'green_hills'
  | 'forest'
  | 'mountain'
  | 'desert'
  | 'water'
  | 'snow'
  | 'dark_forest'
  | 'lava'
  | 'sky'
  | 'kingdom';

export type PlatformKind =
  | 'grass'
  | 'stone'
  | 'bridge'
  | 'floating'
  | 'underground'
  | 'brick'
  | 'sand'
  | 'ice'
  | 'cloud'
  | 'castle';

export interface PlatformDef {
  id?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  d?: number;
  kind: PlatformKind;
  moving?: {
    axis: 'x' | 'y';
    range: number;
    speed: number;
    phase?: number;
  };
}

export interface CoinDef {
  x: number;
  y: number;
  secret?: boolean;
  underground?: boolean;
}

export interface MysteryBoxDef {
  x: number;
  y: number;
  reward: 'coins' | PowerUpType;
  coinCount?: number;
  underground?: boolean;
  secret?: boolean;
}

export interface EnemyDef {
  type: EnemyType;
  x: number;
  y: number;
  patrolMinX?: number;
  patrolMaxX?: number;
  speed?: number;
  amplitude?: number;
}

export type HazardKind = 'cactus' | 'fire_geyser' | 'spikes';

export interface HazardDef {
  kind: HazardKind;
  x: number;
  y: number;
  height?: number;
  period?: number;
  phase?: number;
}

export interface WaterfallDef {
  x: number;
  y: number;
  w: number;
  h: number;
  z?: number;
  isLava?: boolean;
}

export interface BossDef {
  name: string;
  x: number;
  y: number;
  minX: number;
  maxX: number;
  maxHp: number;
}

export interface CheckpointDef {
  x: number;
  y: number;
}

export interface PipeDef {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  toUnderground: boolean;
  label?: string;
}

export interface WaterZoneDef {
  x: number;
  y: number;
  w: number;
  h: number;
  isLava?: boolean;
}

export interface LevelTheme {
  skyTop: string;
  skyBottom: string;
  fogColor: string;
  sunColor: string;
  sunIntensity: number;
  grassColor: string;
  dirtColor: string;
  hillColors: [string, string];
  isNight?: boolean;
  accentColor: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  biome: BiomeId;
  theme: LevelTheme;
  startX: number;
  startY: number;
  finishX: number;
  finishY: number;
  platforms: PlatformDef[];
  waterZones: WaterZoneDef[];
  waterfalls?: WaterfallDef[];
  hazards?: HazardDef[];
  coins: CoinDef[];
  mysteryBoxes: MysteryBoxDef[];
  enemies: EnemyDef[];
  checkpoints: CheckpointDef[];
  pipes: PipeDef[];
  boss?: BossDef;
  undergroundBounds?: {
    minX: number;
    maxX: number;
    floorY: number;
  };
}

export interface ActivePowerUps {
  speedRemaining: number;
  jumpRemaining: number;
  shieldActive: boolean;
  shieldRemaining: number;
}

export interface BossHudState {
  name: string;
  hp: number;
  maxHp: number;
  defeated: boolean;
}

export interface HudSnapshot {
  phase: GamePhase;
  levelId: number;
  levelName: string;
  levelSubtitle: string;
  biome: BiomeId;
  coins: number;
  levelCoinsCollected: number;
  levelCoinsTotal: number;
  score: number;
  lives: number;
  playerHp: number;
  maxPlayerHp: number;
  hasCheckpoint: boolean;
  inUnderground: boolean;
  nearPipe: boolean;
  powerUps: ActivePowerUps;
  bannerText: string | null;
  starsEarned: number;
  completionBonusCoins: number;
  completionBonusScore: number;
  boss: BossHudState | null;
}

export interface LevelProgress {
  completed: boolean;
  stars: number;
  bestCoins: number;
  totalCoins: number;
  bestScore: number;
}

export interface SaveData {
  unlockedLevel: number;
  totalCoins: number;
  highScore: number;
  levels: Record<number, LevelProgress>;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
  down: boolean;
}
