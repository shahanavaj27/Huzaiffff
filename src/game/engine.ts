import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from './audio';
import { CharacterAnimState, FlutonCatCharacter } from './character';
import { LEVELS } from './levels';
import {
  CalloutSparkle,
  CoinSharedKit,
  createBossMesh,
  createBushMesh,
  createCactusHazardMesh,
  createCheckpointMesh,
  createCloudMesh,
  createCoinSharedKit,
  createEnemyMesh,
  createFinishGateMesh,
  createFireGeyserMesh,
  createFlutonCoinMesh,
  createMysteryBoxMesh,
  createMysteryCalloutMesh,
  createPipeMesh,
  createPowerUpMesh,
  createSkyGradientDome,
  createTiledBoxGeometry,
  createTreeMesh,
  createWaterfallMesh,
} from './models';
import { createGameTextures, GameTextureSet } from './textures';
import {
  ActivePowerUps,
  BossHudState,
  EnemyType,
  GamePhase,
  HazardKind,
  HudSnapshot,
  InputState,
  LevelConfig,
  PlatformDef,
  PowerUpType,
  SaveData,
} from './types';

const SAVE_KEY = 'fluton_adventure_save_v1';

interface RuntimePlatform {
  def: PlatformDef;
  mesh: THREE.Group | THREE.Mesh;
  x: number;
  y: number;
  w: number;
  h: number;
  prevX: number;
  prevY: number;
  baseX: number;
  baseY: number;
}

interface RuntimeCoin {
  mesh: THREE.Group;
  x: number;
  y: number;
  collected: boolean;
  secret: boolean;
  underground: boolean;
  bobOffset: number;
}

interface RuntimeMysteryBox {
  group: THREE.Group;
  mainMat: THREE.MeshStandardMaterial;
  x: number;
  y: number;
  baseY: number;
  w: number;
  h: number;
  used: boolean;
  bumpTimer: number;
  reward: 'coins' | PowerUpType;
  coinCount: number;
  secret: boolean;
}

interface RuntimePowerUp {
  mesh: THREE.Group;
  type: PowerUpType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  collected: boolean;
  spawnTimer: number;
}

interface RuntimeEnemy {
  group: THREE.Group;
  type: EnemyType;
  x: number;
  y: number;
  baseY: number;
  vy: number;
  dir: number;
  speed: number;
  minX: number;
  maxX: number;
  amplitude: number;
  alive: boolean;
  squashTimer: number;
  hopTimer: number;
  phase: number;
  wingL?: THREE.Mesh;
  wingR?: THREE.Mesh;
  footL?: THREE.Mesh;
  footR?: THREE.Mesh;
}

interface RuntimeHazard {
  kind: HazardKind;
  group: THREE.Group;
  plume?: THREE.Group;
  x: number;
  y: number;
  height: number;
  period: number;
  phase: number;
  active: boolean;
}

interface RuntimeBoss {
  name: string;
  group: THREE.Group;
  crown: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  visorMat: THREE.MeshStandardMaterial;
  bodyMat: THREE.MeshStandardMaterial;
  x: number;
  y: number;
  baseY: number;
  vy: number;
  dir: number;
  minX: number;
  maxX: number;
  hp: number;
  maxHp: number;
  invulnTimer: number;
  hopTimer: number;
  engaged: boolean;
  defeated: boolean;
}

interface RuntimeCheckpoint {
  group: THREE.Group;
  flag: THREE.Mesh;
  beaconMat: THREE.MeshStandardMaterial;
  x: number;
  y: number;
  activated: boolean;
}

interface RuntimePipe {
  group: THREE.Group;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  toUnderground: boolean;
  label?: string;
}

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  gravity: number;
  zSpinOnly?: boolean;
}

interface RuntimeCallout {
  group: THREE.Group;
  textMat: THREE.MeshBasicMaterial;
  sparkleMat: THREE.MeshBasicMaterial;
  sparkles: CalloutSparkle[];
  startY: number;
  age: number;
  duration: number;
}

interface AmbientMote {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  speedY: number;
  speedX: number;
  phase: number;
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed && typeof parsed.unlockedLevel === 'number') {
        const normalizedLevels: SaveData['levels'] = {};
        if (parsed.levels) {
          for (const [k, v] of Object.entries(parsed.levels)) {
            normalizedLevels[Number(k)] = {
              completed: Boolean(v.completed),
              stars: typeof v.stars === 'number' ? v.stars : v.completed ? 2 : 0,
              bestCoins: v.bestCoins ?? 0,
              totalCoins: v.totalCoins ?? 0,
              bestScore: v.bestScore ?? 0,
            };
          }
        }
        return {
          unlockedLevel: Math.max(1, Math.min(LEVELS.length, parsed.unlockedLevel)),
          totalCoins: parsed.totalCoins ?? 0,
          highScore: parsed.highScore ?? 0,
          levels: normalizedLevels,
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  return {
    unlockedLevel: 1,
    totalCoins: 0,
    highScore: 0,
    levels: {},
  };
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export class FlutonGameEngine {
  private readonly container: HTMLElement;
  private readonly sound: SoundEngine;
  private readonly onHudUpdate: (hud: HudSnapshot) => void;
  private readonly onSaveUpdate: (save: SaveData) => void;

  private readonly isSoftwareGl: boolean;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly textures: GameTextureSet;
  private readonly envTexture: THREE.Texture;

  private readonly sunLight: THREE.DirectionalLight;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly worldGroup: THREE.Group;
  private readonly character: FlutonCatCharacter;
  private readonly contactShadow: THREE.Mesh;
  private skyDome: THREE.Mesh | null = null;

  // Player physics state
  private px = 0;
  private py = 1.5;
  private vx = 0;
  private vy = 0;
  private grounded = false;
  private wasGrounded = false;
  private onIce = false;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private jumpHeldPrev = false;
  private pipeCooldown = 0;
  private invulnTimer = 0;
  private deathTimer = 0;
  private victoryTimer = 0;
  private inUnderground = false;
  private nearPipe: RuntimePipe | null = null;

  // Respawn & score state
  private respawnX = 0;
  private respawnY = 1.5;
  private hasCheckpoint = false;
  private phase: GamePhase = 'title';
  private currentLevel: LevelConfig = LEVELS[0];
  private coins = 0;
  private levelCoinsCollected = 0;
  private levelCoinsTotal = 0;
  private score = 0;
  private lives = 5;
  private playerHp = 2;
  private readonly maxPlayerHp = 2;
  private bannerText: string | null = null;
  private bannerTimer = 0;
  private starsEarned = 0;
  private completionBonusCoins = 0;
  private completionBonusScore = 0;
  private powerUps: ActivePowerUps = {
    speedRemaining: 0,
    jumpRemaining: 0,
    shieldActive: false,
    shieldRemaining: 0,
  };

  // Level entity arrays
  private platforms: RuntimePlatform[] = [];
  private coinsList: RuntimeCoin[] = [];
  private mysteryBoxes: RuntimeMysteryBox[] = [];
  private activePowerUps: RuntimePowerUp[] = [];
  private enemies: RuntimeEnemy[] = [];
  private hazards: RuntimeHazard[] = [];
  private boss: RuntimeBoss | null = null;
  private checkpoints: RuntimeCheckpoint[] = [];
  private pipes: RuntimePipe[] = [];
  private finishCrest: THREE.Group | null = null;
  private finishBarrier: THREE.Mesh | null = null;
  private waterMeshes: THREE.Mesh[] = [];
  private clouds: THREE.Group[] = [];
  private ambientMotes: AmbientMote[] = [];
  private particles: Particle[] = [];
  private callouts: RuntimeCallout[] = [];
  private particleGeo = new THREE.OctahedronGeometry(0.14, 0);
  private particleMatCache = new Map<number, THREE.MeshBasicMaterial>();
  private calloutTextGeo = new THREE.PlaneGeometry(3.3, 1.24);
  private calloutSparkleGeo = new THREE.PlaneGeometry(0.46, 0.46);
  private goldenSparkleMat: THREE.MeshBasicMaterial;

  // Input state
  private input: InputState = {
    left: false,
    right: false,
    jump: false,
    run: false,
    down: false,
  };

  // Loop & timing
  private frameId = 0;
  private lastTime = performance.now();
  private worldTime = 0;
  private hudEmitTimer = 0;
  private disposed = false;
  private saveData: SaveData;

  // Pre-allocated helpers to prevent GC in loop
  private readonly _camTarget = new THREE.Vector3();
  private readonly _skyColor = new THREE.Color();

  constructor(
    container: HTMLElement,
    sound: SoundEngine,
    onHudUpdate: (hud: HudSnapshot) => void,
    onSaveUpdate: (save: SaveData) => void,
  ) {
    this.container = container;
    this.sound = sound;
    this.onHudUpdate = onHudUpdate;
    this.onSaveUpdate = onSaveUpdate;
    this.saveData = loadSaveData();

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const isCoarseMobile =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 900);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, isCoarseMobile ? 1.75 : 2),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    const aspect = width / Math.max(1, height);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(aspect < 1.0 ? 28 : 23, aspect, 0.2, 340);
    this.camera.position.set(aspect < 1.0 ? 1.25 : 2.4, 2.3, aspect < 1.0 ? 24.0 : 22.5);

    // Studio Reflection Environment
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    pmrem.dispose();

    // Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x3f6212, 0.92);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.58);
    this.sunLight.position.set(14, 26, 18);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = this.isSoftwareGl ? 512 : isCoarseMobile ? 1024 : 2048;
    this.sunLight.shadow.mapSize.height = this.isSoftwareGl ? 512 : isCoarseMobile ? 1024 : 2048;
    this.sunLight.shadow.radius = 2.4;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 90;
    const d = 32;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.52);
    rimLight.position.set(-10, 12, -14);
    this.scene.add(rimLight);

    // Textures & Character
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createGameTextures(maxAniso);
    this.goldenSparkleMat = new THREE.MeshBasicMaterial({
      map: this.textures.sparkleStarMap,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.character = new FlutonCatCharacter(
      this.textures.foreheadLogoMap,
      this.textures.furBumpMap,
    );
    this.scene.add(this.character.root);

    // Soft grounded contact shadow beneath Fluton Cat
    this.contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.85),
      new THREE.MeshBasicMaterial({
        map: this.textures.contactShadowMap,
        transparent: true,
        depthWrite: false,
        opacity: 0.52,
      }),
    );
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.contactShadow);

    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    // Load Level 1 as live title backdrop
    this.buildLevel(LEVELS[0], true);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.emitHud();
    this.startLoop();
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.stopLoop();
  };

  private handleContextRestored = (): void => {
    this.lastTime = performance.now();
    this.startLoop();
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const aspect = width / Math.max(1, height);
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1.0 ? 28 : 23;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public setInput(partial: Partial<InputState>): void {
    Object.assign(this.input, partial);
  }

  public getPhase(): GamePhase {
    return this.phase;
  }

  public startNewGame(levelId = 1): void {
    this.sound.unlock();
    this.sound.startMusic();
    const cfg = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
    this.lives = 5;
    this.playerHp = this.maxPlayerHp;
    this.coins = 0;
    this.score = 0;
    this.loadLevel(cfg);
  }

  public retryLevel(): void {
    this.sound.unlock();
    this.sound.startMusic();
    if (this.lives <= 0) {
      this.lives = 5;
    }
    this.playerHp = this.maxPlayerHp;
    this.loadLevel(this.currentLevel);
  }

  public restartFromCheckpoint(): void {
    this.sound.unlock();
    this.sound.startMusic();
    this.phase = 'playing';
    this.lives = 5;
    this.playerHp = this.maxPlayerHp;
    this.px = this.respawnX;
    this.py = this.respawnY + 0.8;
    this.vx = 0;
    this.vy = 0;
    this.deathTimer = 0;
    this.victoryTimer = 0;
    this.invulnTimer = 2.4;
    this.inUnderground = false;
    if (this.skyDome) this.skyDome.visible = true;
    this.scene.background = new THREE.Color(this.currentLevel.theme.skyBottom);
    this.scene.fog = new THREE.FogExp2(
      this.currentLevel.theme.fogColor,
      this.currentLevel.theme.isNight ? 0.0072 : 0.0046,
    );
    this.lastTime = performance.now();
    this.showBanner('Restarted from Checkpoint!', 1.8);
    this.emitHud();
  }

  public nextLevel(): void {
    this.sound.unlock();
    this.sound.startMusic();
    const next = LEVELS.find((l) => l.id === this.currentLevel.id + 1);
    if (next) {
      this.loadLevel(next);
    } else {
      this.phase = 'victory';
      this.emitHud();
    }
  }

  public returnToTitle(): void {
    this.phase = 'title';
    this.sound.stopMusic();
    this.buildLevel(LEVELS[0], true);
    this.emitHud();
  }

  public pause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.sound.stopMusic();
      this.emitHud();
    }
  }

  public resume(): void {
    if (this.phase === 'paused') {
      this.phase = 'playing';
      this.sound.startMusic();
      this.lastTime = performance.now();
      this.emitHud();
    }
  }

  public triggerPipeIfNear(): void {
    if (this.phase !== 'playing' || !this.nearPipe || this.pipeCooldown > 0) return;
    this.enterPipe(this.nearPipe);
  }

  private loadLevel(cfg: LevelConfig): void {
    this.phase = 'playing';
    this.buildLevel(cfg, false);
    this.showBanner(`Level ${cfg.id}: ${cfg.name}`, 2.4);
    this.emitHud();
  }

  private showBanner(text: string, duration = 2.0): void {
    this.bannerText = text;
    this.bannerTimer = duration;
  }

  private clearWorld(): void {
    while (this.worldGroup.children.length > 0) {
      const child = this.worldGroup.children[0];
      this.worldGroup.remove(child);
    }
    this.platforms = [];
    this.coinsList = [];
    this.mysteryBoxes = [];
    this.activePowerUps = [];
    this.enemies = [];
    this.hazards = [];
    this.boss = null;
    this.checkpoints = [];
    this.pipes = [];
    this.waterMeshes = [];
    this.clouds = [];
    this.ambientMotes = [];
    this.particles = [];
    for (let i = 0; i < this.callouts.length; i++) {
      this.callouts[i].textMat.dispose();
      this.callouts[i].sparkleMat.dispose();
    }
    this.callouts = [];
    this.finishCrest = null;
    this.finishBarrier = null;
    this.skyDome = null;
  }

  private buildLevel(cfg: LevelConfig, isTitlePreview: boolean): void {
    this.clearWorld();
    this.currentLevel = cfg;
    this.px = cfg.startX;
    this.py = cfg.startY;
    this.vx = 0;
    this.vy = 0;
    this.respawnX = cfg.startX;
    this.respawnY = cfg.startY;
    this.hasCheckpoint = false;
    this.playerHp = this.maxPlayerHp;
    this.grounded = false;
    this.wasGrounded = false;
    this.onIce = false;
    this.inUnderground = false;
    this.nearPipe = null;
    this.pipeCooldown = 0;
    this.invulnTimer = 0;
    this.deathTimer = 0;
    this.victoryTimer = 0;
    this.starsEarned = 0;
    this.completionBonusCoins = 0;
    this.completionBonusScore = 0;
    this.levelCoinsCollected = 0;
    this.levelCoinsTotal = cfg.coins.length;
    this.powerUps = {
      speedRemaining: 0,
      jumpRemaining: 0,
      shieldActive: false,
      shieldRemaining: 0,
    };

    // Sky gradient dome, fog & lighting
    this._skyColor.set(cfg.theme.skyBottom);
    this.scene.background = this._skyColor.clone();
    this.scene.fog = new THREE.FogExp2(cfg.theme.fogColor, cfg.theme.isNight ? 0.0072 : 0.0046);
    this.sunLight.color.set(cfg.theme.sunColor);
    this.sunLight.intensity = cfg.theme.sunIntensity;
    this.hemiLight.color.set(cfg.theme.skyTop);
    this.hemiLight.groundColor.set(cfg.theme.dirtColor);

    this.skyDome = createSkyGradientDome(
      cfg.theme.skyTop,
      cfg.theme.skyBottom,
      Boolean(cfg.theme.isNight),
    );
    this.worldGroup.add(this.skyDome);

    // Glowing Sun or Moon disc with subtle aura halo in sky dome
    const celestial = new THREE.Mesh(
      new THREE.CircleGeometry(cfg.theme.isNight ? 4.2 : 5.5, 24),
      new THREE.MeshBasicMaterial({
        color: cfg.theme.isNight ? 0xe0e7ff : 0xfef08a,
      }),
    );
    celestial.position.set(cfg.finishX * 0.45, 28, -95);
    this.worldGroup.add(celestial);

    // 1. Tiled Crisp Biome Materials with Bump Relief & Edge Ambient Occlusion
    const grassTopMat = new THREE.MeshStandardMaterial({
      map: this.textures.grassTopMap,
      bumpMap: this.textures.terrainBumpMap,
      bumpScale: 0.045,
      aoMap: this.textures.aoEdgeMap,
      aoMapIntensity: 0.38,
      color: new THREE.Color(cfg.theme.grassColor).lerp(new THREE.Color(0xffffff), 0.35),
      roughness: 0.76,
    });
    const dirtMat = new THREE.MeshStandardMaterial({
      map: this.textures.dirtSideMap,
      bumpMap: this.textures.terrainBumpMap,
      bumpScale: 0.06,
      aoMap: this.textures.aoEdgeMap,
      aoMapIntensity: 0.48,
      roughness: 0.86,
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      map: this.textures.stoneMap,
      bumpMap: this.textures.terrainBumpMap,
      bumpScale: 0.055,
      aoMap: this.textures.aoEdgeMap,
      aoMapIntensity: 0.45,
      color: cfg.biome === 'lava' ? 0x44403c : 0xe2e8f0,
      roughness: 0.72,
      metalness: 0.08,
    });
    const bridgeMat = new THREE.MeshStandardMaterial({
      map: this.textures.woodPlankMap,
      bumpMap: this.textures.terrainBumpMap,
      bumpScale: 0.04,
      aoMap: this.textures.aoEdgeMap,
      aoMapIntensity: 0.4,
      roughness: 0.74,
    });
    const brickMat = new THREE.MeshStandardMaterial({
      map: this.textures.brickMap,
      bumpMap: this.textures.terrainBumpMap,
      bumpScale: 0.05,
      aoMap: this.textures.aoEdgeMap,
      aoMapIntensity: 0.44,
      roughness: 0.65,
    });
    const sandMat = new THREE.MeshStandardMaterial({
      map: this.textures.sandMap,
      bumpMap: this.textures.terrainBumpMap,
      bumpScale: 0.035,
      aoMap: this.textures.aoEdgeMap,
      aoMapIntensity: 0.36,
      roughness: 0.82,
    });
    const iceMat = new THREE.MeshPhysicalMaterial({
      map: this.textures.iceMap,
      aoMap: this.textures.aoEdgeMap,
      aoMapIntensity: 0.3,
      roughness: 0.14,
      metalness: 0.12,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
    });
    const cloudMat = new THREE.MeshStandardMaterial({
      map: this.textures.cloudMap,
      roughness: 0.88,
      emissive: 0xe0f2fe,
      emissiveIntensity: 0.18,
    });
    const castleMat = new THREE.MeshStandardMaterial({
      map: this.textures.castleMap,
      bumpMap: this.textures.terrainBumpMap,
      bumpScale: 0.04,
      aoMap: this.textures.aoEdgeMap,
      aoMapIntensity: 0.42,
      roughness: 0.46,
      metalness: 0.24,
    });
    const ugMat = new THREE.MeshStandardMaterial({
      map: this.textures.undergroundWallMap,
      aoMap: this.textures.aoEdgeMap,
      aoMapIntensity: 0.48,
      roughness: 0.78,
    });

    cfg.platforms.forEach((p) => {
      const depth = p.d ?? (p.kind === 'grass' || p.kind === 'stone' || p.kind === 'sand' || p.kind === 'ice' || p.kind === 'castle' ? 5.2 : 2.8);
      const group = new THREE.Group();
      group.position.set(p.x, p.y, 0);

      if (p.kind === 'grass') {
        const body = new THREE.Mesh(
          createTiledBoxGeometry(p.w, p.h, depth, 3.2, true),
          dirtMat,
        );
        body.receiveShadow = true;
        body.castShadow = true;
        group.add(body);

        const topCap = new THREE.Mesh(
          createTiledBoxGeometry(p.w + 0.14, 0.36, depth + 0.14, 3.0),
          grassTopMat,
        );
        topCap.position.y = p.h * 0.5 - 0.15;
        topCap.receiveShadow = true;
        group.add(topCap);
      } else if (p.kind === 'bridge') {
        const plank = new THREE.Mesh(
          createTiledBoxGeometry(p.w, p.h, depth, 2.5),
          bridgeMat,
        );
        plank.receiveShadow = true;
        plank.castShadow = true;
        group.add(plank);

        const postMat = new THREE.MeshStandardMaterial({ color: 0x5c310e, roughness: 0.85 });
        const count = Math.max(2, Math.floor(p.w / 3));
        for (let i = 0; i <= count; i++) {
          const px = -p.w / 2 + 0.4 + ((p.w - 0.8) * i) / count;
          [-depth / 2 + 0.15, depth / 2 - 0.15].forEach((pz) => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.0, 8), postMat);
            post.position.set(px, p.h / 2 + 0.45, pz);
            group.add(post);
          });
        }
        const rail = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.1, 0.12), postMat);
        rail.position.set(0, p.h / 2 + 0.82, -depth / 2 + 0.15);
        group.add(rail);
      } else if (p.kind === 'cloud') {
        const core = new THREE.Mesh(
          createTiledBoxGeometry(p.w, p.h, depth, 2.8),
          cloudMat,
        );
        core.receiveShadow = true;
        core.castShadow = true;
        group.add(core);
        // Fluffy underside cloud puffs
        const puffCount = Math.max(2, Math.floor(p.w / 1.8));
        for (let i = 0; i < puffCount; i++) {
          const px = -p.w * 0.36 + (i / Math.max(1, puffCount - 1)) * p.w * 0.72;
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.68, 12, 10), cloudMat);
          puff.scale.set(1.2, 0.72, 1.1);
          puff.position.set(px, -0.25, 0);
          group.add(puff);
        }
      } else {
        const mat =
          p.kind === 'sand'
            ? sandMat
            : p.kind === 'ice'
              ? iceMat
              : p.kind === 'castle'
                ? castleMat
                : p.kind === 'stone' || p.kind === 'floating'
                  ? stoneMat
                  : p.kind === 'brick'
                    ? brickMat
                    : ugMat;
        const mesh = new THREE.Mesh(createTiledBoxGeometry(p.w, p.h, depth, 3.0), mat);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        group.add(mesh);

        if (p.kind === 'floating') {
          const trimMat = cfg.biome === 'snow' ? iceMat : cfg.biome === 'lava' ? stoneMat : grassTopMat;
          const trim = new THREE.Mesh(
            createTiledBoxGeometry(p.w + 0.08, 0.22, depth + 0.08, 3.0),
            trimMat,
          );
          trim.position.y = p.h * 0.5 - 0.06;
          trim.receiveShadow = true;
          group.add(trim);
        }
      }

      this.worldGroup.add(group);
      this.platforms.push({
        def: p,
        mesh: group,
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h,
        prevX: p.x,
        prevY: p.y,
        baseX: p.x,
        baseY: p.y,
      });
    });

    // 2. Water Rivers & Molten Lava Rivers (smooth specular surface + shoreline foam)
    cfg.waterZones.forEach((wz) => {
      const isLava = Boolean(wz.isLava);
      const waterMat = new THREE.MeshPhysicalMaterial({
        map: isLava ? this.textures.lavaMap : this.textures.waterMap,
        color: isLava ? 0xf97316 : 0x0ea5e9,
        emissive: isLava ? 0xdc2626 : 0x0369a1,
        emissiveIntensity: isLava ? 0.65 : 0.14,
        roughness: isLava ? 0.32 : 0.08,
        metalness: isLava ? 0.05 : 0.14,
        clearcoat: isLava ? 0 : 0.85,
        clearcoatRoughness: 0.08,
        transparent: !isLava,
        opacity: isLava ? 0.96 : 0.84,
      });
      const water = new THREE.Mesh(new THREE.BoxGeometry(wz.w, wz.h, 8.8), waterMat);
      water.position.set(wz.x, wz.y, 0);
      this.worldGroup.add(water);
      this.waterMeshes.push(water);

      // Subtle glowing surface crest line for crisp water edge definition
      const crest = new THREE.Mesh(
        new THREE.BoxGeometry(wz.w, 0.08, 8.84),
        new THREE.MeshBasicMaterial({
          color: isLava ? 0xfef08a : 0xe0f2fe,
          transparent: true,
          opacity: isLava ? 0.48 : 0.42,
        }),
      );
      crest.position.set(wz.x, wz.y + wz.h * 0.5 - 0.02, 0);
      this.worldGroup.add(crest);
    });

    // 3. Cascading Waterfalls / Lavafalls
    cfg.waterfalls?.forEach((wf) => {
      const wfGroup = createWaterfallMesh(wf.w, wf.h, this.textures, Boolean(wf.isLava));
      wfGroup.position.set(wf.x, wf.y, wf.z ?? -8);
      this.worldGroup.add(wfGroup);
    });

    // 4. Hazards (Desert Cacti & Lava Fire Geysers)
    cfg.hazards?.forEach((h, idx) => {
      if (h.kind === 'cactus') {
        const group = createCactusHazardMesh(h.height ?? 1.6);
        group.position.set(h.x, h.y, 0);
        this.worldGroup.add(group);
        this.hazards.push({
          kind: 'cactus',
          group,
          x: h.x,
          y: h.y,
          height: h.height ?? 1.6,
          period: 0,
          phase: 0,
          active: true,
        });
      } else if (h.kind === 'fire_geyser') {
        const { group, plume } = createFireGeyserMesh();
        group.position.set(h.x, h.y, 0);
        this.worldGroup.add(group);
        this.hazards.push({
          kind: 'fire_geyser',
          group,
          plume,
          x: h.x,
          y: h.y,
          height: 2.8,
          period: h.period ?? 3.0,
          phase: h.phase ?? idx * 0.8,
          active: false,
        });
      }
    });

    // 5. Scenic Background Hills, Mountains, Biome Trees, Bushes, Clouds & Weather Motes
    this.buildScenery(cfg);

    // 6. Collectible Fluton Logo Coins (shared GPU geometry/material kit for Android 60fps!)
    const coinKit: CoinSharedKit = createCoinSharedKit(this.textures);
    const strongCoinGlow = cfg.biome === 'dark_forest' || cfg.biome === 'lava' || cfg.biome === 'kingdom';
    cfg.coins.forEach((c, idx) => {
      const mesh = createFlutonCoinMesh(
        this.textures,
        strongCoinGlow || Boolean(c.secret),
        coinKit,
      );
      mesh.position.set(c.x, c.y, 0);
      this.worldGroup.add(mesh);
      this.coinsList.push({
        mesh,
        x: c.x,
        y: c.y,
        collected: false,
        secret: Boolean(c.secret),
        underground: Boolean(c.underground),
        bobOffset: idx * 0.65,
      });
    });

    // 7. Mystery Boxes
    cfg.mysteryBoxes.forEach((mb) => {
      const { group, mainMat } = createMysteryBoxMesh(this.textures);
      group.position.set(mb.x, mb.y, 0);
      this.worldGroup.add(group);
      this.mysteryBoxes.push({
        group,
        mainMat,
        x: mb.x,
        y: mb.y,
        baseY: mb.y,
        w: 1.12,
        h: 1.12,
        used: false,
        bumpTimer: 0,
        reward: mb.reward,
        coinCount: mb.coinCount ?? 5,
        secret: Boolean(mb.secret),
      });
    });

    // 8. Enemies
    cfg.enemies.forEach((e, idx) => {
      const { group, wingL, wingR, footL, footR } = createEnemyMesh(e.type, cfg.biome);
      group.position.set(e.x, e.y, 0);
      this.worldGroup.add(group);
      this.enemies.push({
        group,
        type: e.type,
        x: e.x,
        y: e.y,
        baseY: e.y,
        vy: 0,
        dir: idx % 2 === 0 ? 1 : -1,
        speed: e.speed ?? 2.5,
        minX: e.patrolMinX ?? e.x - 4,
        maxX: e.patrolMaxX ?? e.x + 4,
        amplitude: e.amplitude ?? 0.9,
        alive: true,
        squashTimer: 0,
        hopTimer: 1.0 + (idx % 3) * 0.4,
        phase: idx * 1.1,
        wingL,
        wingR,
        footL,
        footR,
      });
    });

    // 9. Level 10 Final Boss (Shadow King Spike)
    if (cfg.boss) {
      const bossParts = createBossMesh(this.textures);
      bossParts.group.position.set(cfg.boss.x, cfg.boss.y, 0);
      this.worldGroup.add(bossParts.group);
      this.boss = {
        name: cfg.boss.name,
        ...bossParts,
        x: cfg.boss.x,
        y: cfg.boss.y,
        baseY: cfg.boss.y,
        vy: 0,
        dir: -1,
        minX: cfg.boss.minX,
        maxX: cfg.boss.maxX,
        hp: cfg.boss.maxHp,
        maxHp: cfg.boss.maxHp,
        invulnTimer: 0,
        hopTimer: 2.2,
        engaged: false,
        defeated: false,
      };
    }

    // 10. Checkpoints
    cfg.checkpoints.forEach((cp) => {
      const { group, flag, beaconMat } = createCheckpointMesh(this.textures);
      group.position.set(cp.x, cp.y, 0);
      this.worldGroup.add(group);
      this.checkpoints.push({
        group,
        flag,
        beaconMat,
        x: cp.x,
        y: cp.y,
        activated: false,
      });
    });

    // 11. Warp Pipes
    cfg.pipes.forEach((p) => {
      const group = createPipeMesh(p.toUnderground);
      group.position.set(p.x, p.y, 0);
      this.worldGroup.add(group);
      this.pipes.push({
        group,
        x: p.x,
        y: p.y,
        targetX: p.targetX,
        targetY: p.targetY,
        toUnderground: p.toUnderground,
        label: p.label,
      });
    });

    // 12. Final Finish Gate
    const gate = createFinishGateMesh(this.textures);
    gate.group.position.set(cfg.finishX, cfg.finishY, 0);
    gate.lockBarrier.visible = Boolean(cfg.boss);
    this.worldGroup.add(gate.group);
    this.finishCrest = gate.crest;
    this.finishBarrier = gate.lockBarrier;

    // Position player & camera immediately (exact calibrated distance!)
    this.character.root.position.set(this.px, this.py, 0);
    this.updateContactShadow();
    const isPortrait = this.camera.aspect < 1.0;
    const camZ = isPortrait ? 24.0 : 22.5;
    const lookAhead = isPortrait ? 1.25 : 2.4;
    if (isTitlePreview) {
      this.camera.position.set(this.px + lookAhead + 1.2, 2.5, camZ - 1.5);
      this.camera.lookAt(this.px + lookAhead + 1.1, 1.3, 0);
    } else {
      this.camera.position.set(this.px + lookAhead, this.py + 2.3, camZ);
      this.camera.lookAt(this.px + lookAhead - 0.1, this.py + 1.2, 0);
    }
  }

  private buildScenery(cfg: LevelConfig): void {
    const hillMat1 = new THREE.MeshStandardMaterial({
      color: cfg.theme.hillColors[0],
      roughness: 0.9,
    });
    const hillMat2 = new THREE.MeshStandardMaterial({
      color: cfg.theme.hillColors[1],
      roughness: 0.92,
    });
    const mtnColor =
      cfg.biome === 'desert'
        ? 0xb45309
        : cfg.biome === 'lava'
          ? 0x292524
          : cfg.biome === 'dark_forest'
            ? 0x1e1b4b
            : 0x64748b;
    const mtnMat = new THREE.MeshStandardMaterial({ color: mtnColor, roughness: 0.88 });
    const capColor =
      cfg.biome === 'lava' ? 0xf97316 : cfg.biome === 'desert' ? 0xf59e0b : 0xf8fafc;
    const capMat = new THREE.MeshStandardMaterial({
      color: capColor,
      roughness: 0.65,
      emissive: cfg.biome === 'lava' ? 0xea580c : 0x000000,
      emissiveIntensity: cfg.biome === 'lava' ? 0.55 : 0,
    });

    const maxExtent = cfg.finishX + 36;

    // Distant dual-depth layered mountain ranges
    for (let x = -24; x <= maxExtent; x += 22) {
      const h = 17 + (Math.abs(x * 17) % 12);
      const r = 13 + (Math.abs(x * 7) % 5);
      const mtn = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mtnMat);
      mtn.position.set(x, h * 0.35 - 6, -36 - (Math.abs(x) % 8));
      this.worldGroup.add(mtn);

      if (cfg.biome !== 'sky') {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.38, h * 0.35, 7), capMat);
        cap.position.set(x, h * 0.35 - 6 + h * 0.33, mtn.position.z);
        this.worldGroup.add(cap);

        // Secondary mid-distance ridge offset for atmospheric depth
        const ridge = new THREE.Mesh(
          new THREE.ConeGeometry(r * 0.72, h * 0.68, 6),
          mtnMat,
        );
        ridge.position.set(x + 11, h * 0.22 - 6.5, -24 - (Math.abs(x * 3) % 6));
        this.worldGroup.add(ridge);
      }
    }

    // Rolling hills (skipped in sky world so islands float cleanly)
    if (cfg.biome !== 'sky') {
      for (let x = -15; x <= maxExtent; x += 14) {
        const radius = 7 + (Math.abs(x * 13) % 5);
        const hill = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
          x % 28 === 0 ? hillMat1 : hillMat2,
        );
        hill.scale.set(1.35, 0.85, 0.75);
        hill.position.set(x, -4.2, -14 - (Math.abs(x * 3) % 7));
        this.worldGroup.add(hill);
      }
    }

    // Fluffy clouds
    const cloudTint =
      cfg.biome === 'dark_forest'
        ? 0x475569
        : cfg.biome === 'lava'
          ? 0x7f1d1d
          : cfg.biome === 'desert'
            ? 0xfef3c7
            : 0xffffff;
    for (let x = -10; x <= maxExtent; x += 16) {
      const cloud = createCloudMesh(1.15 + ((Math.abs(x) % 5) * 0.18), cloudTint);
      cloud.position.set(x, 10 + (Math.abs(x * 7) % 5), -16 - (Math.abs(x) % 10));
      this.worldGroup.add(cloud);
      this.clouds.push(cloud);
    }

    // Biome Trees, Bushes & Instanced Edge Grass Tufts (1 draw call!)
    const tuftPlacements: { x: number; y: number; z: number; s: number }[] = [];
    const flowerMat = new THREE.MeshStandardMaterial({
      color: cfg.biome === 'kingdom' ? 0xfbbf24 : 0xf472b6,
      roughness: 0.5,
    });
    cfg.platforms.forEach((p, idx) => {
      if (
        p.w < 8 ||
        (p.kind !== 'grass' && p.kind !== 'sand' && p.kind !== 'ice' && p.kind !== 'castle' && p.kind !== 'stone')
      ) {
        return;
      }
      const topY = p.y + p.h * 0.5;
      const spacing = cfg.biome === 'forest' || cfg.biome === 'dark_forest' ? 6.5 : 8.5;
      const count = Math.floor(p.w / spacing);
      for (let i = 0; i < count; i++) {
        const tx = p.x - p.w * 0.38 + i * spacing + (idx % 3);
        const tree = createTreeMesh(
          cfg.biome,
          0.95 + ((i + idx) % 3) * 0.22,
          this.textures.contactShadowMap,
        );
        tree.position.set(tx, topY, -2.15);
        this.worldGroup.add(tree);

        const bush = createBushMesh(
          cfg.biome,
          0.85 + (i % 2) * 0.25,
          this.textures.contactShadowMap,
        );
        bush.position.set(tx + 2.4, topY, -1.78);
        this.worldGroup.add(bush);

        if (cfg.biome === 'green_hills' || cfg.biome === 'forest' || cfg.biome === 'kingdom') {
          const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), flowerMat);
          flower.position.set(tx + 1.2, topY + 0.14, 1.85);
          this.worldGroup.add(flower);
        }
      }

      if (p.kind === 'grass' && !p.moving) {
        for (let gx = p.x - p.w * 0.45; gx <= p.x + p.w * 0.45; gx += 2.6) {
          tuftPlacements.push({
            x: gx,
            y: topY + 0.12,
            z: 2.18 - (Math.abs(Math.round(gx)) % 3) * 0.15,
            s: 0.75 + (Math.abs(Math.round(gx * 3)) % 4) * 0.15,
          });
        }
      }
    });

    if (tuftPlacements.length > 0) {
      const tuftGeo = new THREE.ConeGeometry(0.12, 0.32, 5);
      const tuftMat = new THREE.MeshStandardMaterial({
        color: cfg.theme.grassColor,
        roughness: 0.72,
      });
      const instTufts = new THREE.InstancedMesh(tuftGeo, tuftMat, tuftPlacements.length);
      const dummy = new THREE.Object3D();
      tuftPlacements.forEach((tp, idx) => {
        dummy.position.set(tp.x, tp.y, tp.z);
        dummy.rotation.set(0, (idx * 1.1) % Math.PI, ((idx % 3) - 1) * 0.12);
        dummy.scale.set(tp.s, tp.s, tp.s);
        dummy.updateMatrix();
        instTufts.setMatrixAt(idx, dummy.matrix);
      });
      instTufts.instanceMatrix.needsUpdate = true;
      instTufts.computeBoundingSphere();
      this.worldGroup.add(instTufts);
    }

    // Ambient Weather / Atmosphere Motes (Snowflakes, Fireflies, Volcanic Embers, Sky/Royal Sparkles)
    if (
      cfg.biome === 'snow' ||
      cfg.biome === 'dark_forest' ||
      cfg.biome === 'lava' ||
      cfg.biome === 'sky' ||
      cfg.biome === 'kingdom'
    ) {
      const moteColor =
        cfg.biome === 'snow'
          ? 0xffffff
          : cfg.biome === 'dark_forest'
            ? 0xa3e635
            : cfg.biome === 'lava'
              ? 0xf97316
              : 0xfef08a;
      const moteMat = new THREE.MeshBasicMaterial({ color: moteColor });
      const moteGeo = new THREE.OctahedronGeometry(cfg.biome === 'snow' ? 0.09 : 0.08, 0);
      const count = 48;
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(moteGeo, moteMat);
        const bx = (i / count) * maxExtent;
        const by = 1.5 + ((i * 3.7) % 10);
        m.position.set(bx, by, (i % 5) - 2.2);
        this.worldGroup.add(m);
        this.ambientMotes.push({
          mesh: m,
          baseX: bx,
          baseY: by,
          speedY: cfg.biome === 'snow' ? -1.8 : cfg.biome === 'lava' ? 1.5 : 0.35,
          speedX: cfg.biome === 'snow' ? -0.45 : 0.2,
          phase: i * 0.7,
        });
      }
    }

    // Underground glowing crystals & light
    if (cfg.undergroundBounds) {
      const { minX, maxX, floorY } = cfg.undergroundBounds;
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8,
        roughness: 0.18,
        metalness: 0.3,
      });
      for (let cx = minX + 4; cx < maxX - 3; cx += 6) {
        const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.4, 5), crystalMat);
        crystal.position.set(cx, floorY + 0.7, -2.2);
        crystal.rotation.z = (cx % 2 === 0 ? 1 : -1) * 0.18;
        this.worldGroup.add(crystal);
      }
      const ugLight = new THREE.PointLight(0x38bdf8, 3.2, 42);
      ugLight.position.set((minX + maxX) * 0.5, floorY + 4.5, 2.5);
      this.worldGroup.add(ugLight);
    }
  }

  private updateContactShadow(): void {
    let bestY = -999;
    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i];
      const top = p.y + p.h * 0.5;
      if (this.px >= p.x - p.w * 0.5 - 0.3 && this.px <= p.x + p.w * 0.5 + 0.3 && top <= this.py + 0.15) {
        if (top > bestY) bestY = top;
      }
    }
    if (bestY > -900) {
      const dist = Math.max(0, this.py - bestY);
      const scale = Math.max(0.38, 1.0 - dist * 0.12);
      this.contactShadow.visible = dist < 7.5;
      this.contactShadow.position.set(this.px, bestY + 0.025, 0);
      this.contactShadow.scale.set(scale, scale, 1);
      (this.contactShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 0.55 - dist * 0.07);
    } else {
      this.contactShadow.visible = false;
    }
  }

  private spawnParticles(x: number, y: number, colorHex: number, count = 10, speed = 4.5): void {
    let mat = this.particleMatCache.get(colorHex);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color: colorHex });
      this.particleMatCache.set(colorHex, mat);
    }
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.set(x, y, (Math.random() - 0.5) * 0.6);
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = speed * (0.5 + Math.random() * 0.7);
      this.worldGroup.add(mesh);
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd + 2.2,
        vz: (Math.random() - 0.5) * 2.5,
        life: 0.55 + Math.random() * 0.25,
        maxLife: 0.75,
        gravity: 12,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.worldGroup.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.zSpinOnly) {
        p.mesh.rotation.z += dt * 5.5;
      } else {
        p.mesh.rotation.x += dt * 7;
        p.mesh.rotation.y += dt * 7;
      }
      const s = Math.max(0.01, p.life / p.maxLife);
      p.mesh.scale.setScalar(s);
    }
  }

  private spawnGoldenStarSparkles(x: number, y: number, count = 12): void {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.calloutSparkleGeo, this.goldenSparkleMat);
      mesh.position.set(x + (Math.random() - 0.5) * 0.6, y, 0.72 + (Math.random() - 0.5) * 0.35);
      mesh.renderOrder = 24;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
      const spd = 2.8 + Math.random() * 3.4;
      this.worldGroup.add(mesh);
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd + 2.8,
        vz: (Math.random() - 0.5) * 1.4,
        life: 0.72 + Math.random() * 0.32,
        maxLife: 1.0,
        gravity: 6.5,
        zSpinOnly: true,
      });
    }
  }

  private spawnGFlutonCallout(x: number, y: number): void {
    const built = createMysteryCalloutMesh(
      this.textures,
      this.calloutTextGeo,
      this.calloutSparkleGeo,
    );
    built.group.position.set(x, y, 0.85);
    built.group.scale.setScalar(0.25);
    this.worldGroup.add(built.group);
    this.callouts.push({
      group: built.group,
      textMat: built.textMat,
      sparkleMat: built.sparkleMat,
      sparkles: built.sparkles,
      startY: y,
      age: 0,
      duration: 1.35,
    });
  }

  private updateCallouts(dt: number): void {
    for (let i = this.callouts.length - 1; i >= 0; i--) {
      const c = this.callouts[i];
      c.age += dt;
      if (c.age >= c.duration) {
        this.worldGroup.remove(c.group);
        c.textMat.dispose();
        c.sparkleMat.dispose();
        this.callouts.splice(i, 1);
        continue;
      }

      const age = c.age;
      // Elastic pop-in followed by gentle float
      let scale = 1.0;
      if (age < 0.14) {
        scale = THREE.MathUtils.lerp(0.25, 1.24, age / 0.14);
      } else if (age < 0.28) {
        scale = THREE.MathUtils.lerp(1.24, 1.0, (age - 0.14) / 0.14);
      } else {
        scale = 1.0 + Math.sin(age * 10) * 0.035;
      }
      c.group.scale.setScalar(scale);

      const riseT = Math.min(1, age / 1.15);
      const rise = 1.65 * (1 - Math.pow(1 - riseT, 2.2));
      c.group.position.y = c.startY + rise;
      c.group.rotation.z = Math.sin(age * 12) * 0.055 * Math.max(0, 1 - age * 0.85);

      const alpha = age > 0.95 ? Math.max(0, 1 - (age - 0.95) / 0.4) : Math.min(1, age / 0.07);
      c.textMat.opacity = alpha;
      c.sparkleMat.opacity = alpha;

      for (let j = 0; j < c.sparkles.length; j++) {
        const sp = c.sparkles[j];
        const driftFactor = age * 0.85;
        sp.mesh.position.set(
          sp.baseX + sp.driftX * driftFactor,
          sp.baseY + sp.driftY * driftFactor,
          sp.baseZ,
        );
        sp.mesh.rotation.z += dt * sp.spinSpeed;
        const twinkle = sp.baseScale * (0.55 + 0.65 * Math.abs(Math.sin(age * 11 + sp.phase)));
        sp.mesh.scale.setScalar(twinkle);
      }
    }
  }

  private enterPipe(pipe: RuntimePipe): void {
    this.sound.playPipe();
    this.spawnParticles(this.px, this.py + 0.6, 0x22c55e, 14, 5);
    this.px = pipe.targetX;
    this.py = pipe.targetY;
    this.vx = 0;
    this.vy = 0;
    this.inUnderground = pipe.toUnderground;
    this.pipeCooldown = 0.75;
    if (pipe.toUnderground) {
      this.showBanner('Secret Underground Bonus Area!', 2.2);
      this.scene.background = new THREE.Color('#090d16');
      this.scene.fog = new THREE.FogExp2('#090d16', 0.016);
      if (this.skyDome) this.skyDome.visible = false;
    } else {
      this.showBanner('Back to Surface!', 1.5);
      this.scene.background = new THREE.Color(this.currentLevel.theme.skyBottom);
      this.scene.fog = new THREE.FogExp2(
        this.currentLevel.theme.fogColor,
        this.currentLevel.theme.isNight ? 0.0072 : 0.0046,
      );
      if (this.skyDome) this.skyDome.visible = true;
    }
    this.emitHud();
  }

  private collectCoin(coin: RuntimeCoin): void {
    if (coin.collected) return;
    coin.collected = true;
    coin.mesh.visible = false;
    this.coins += 1;
    this.levelCoinsCollected += 1;
    this.score += coin.secret ? 100 : 50;
    this.sound.playCoin();
    this.character.triggerCoinCollect();
    this.spawnParticles(coin.x, coin.y, coin.secret ? 0x38bdf8 : 0xfbbf24, 14, 5.2);
    this.spawnGoldenStarSparkles(coin.x, coin.y, 6);
    this.emitHud();
  }

  private activatePowerUp(type: PowerUpType): void {
    this.sound.playPowerUp();
    this.score += 150;
    if (type === 'speed') {
      this.powerUps.speedRemaining = 10;
      this.showBanner('Speed Boost Active!', 1.8);
    } else if (type === 'jump') {
      this.powerUps.jumpRemaining = 12;
      this.showBanner('Super Jump Active!', 1.8);
    } else if (type === 'shield') {
      this.powerUps.shieldActive = true;
      this.powerUps.shieldRemaining = 15;
      this.showBanner('Fluton Shield Active!', 1.8);
    } else if (type === 'life') {
      this.lives += 1;
      this.showBanner('Extra Life +1!', 1.8);
    }
    this.emitHud();
  }

  private hurtPlayer(kind: 'enemy' | 'hazard' | 'fall' = 'enemy'): void {
    if (this.deathTimer > 0 || this.victoryTimer > 0) return;
    if (kind !== 'fall' && this.invulnTimer > 0) return;

    if (kind !== 'fall' && this.powerUps.shieldActive) {
      this.powerUps.shieldActive = false;
      this.powerUps.shieldRemaining = 0;
      this.invulnTimer = 2.2;
      this.vy = 9.8;
      this.vx = -Math.sign(this.vx || 1) * 4.2;
      this.sound.playShieldBreak();
      this.spawnParticles(this.px, this.py + 0.9, 0x38bdf8, 16, 6);
      this.showBanner('Shield Absorbed Hit!', 1.5);
      this.emitHud();
      return;
    }

    // 2-Hit Point Health System: 1st hit reduces HP by 1 + invincibility; 2nd hit triggers death & checkpoint respawn
    if (kind !== 'fall') {
      this.sound.playHurt();
      this.playerHp -= 1;

      if (this.playerHp > 0) {
        this.invulnTimer = 2.4;
        this.vy = 9.0;
        this.vx = -Math.sign(this.vx || 1) * 3.8;
        this.spawnParticles(this.px, this.py + 0.8, 0xfbbf24, 12, 4.6);
        this.showBanner('Ouch! 1 Heart Left!', 1.5);
        this.emitHud();
        return;
      }

      // 2nd hit -> player dies (plays death animation, deducts 1 life, respawns at latest checkpoint or Game Over)
      this.lives -= 1;
      this.playerHp = 0;
      this.deathTimer = 0.95;
      this.vy = 11.2;
      this.vx = 0;
      this.spawnParticles(this.px, this.py + 0.8, 0xef4444, 16, 5.2);
      this.emitHud();
      return;
    }

    // Fall into abyss / water / lava -> costs 1 life & respawns at latest checkpoint
    this.sound.playHurt();
    this.lives -= 1;
    this.playerHp = this.maxPlayerHp;
    this.deathTimer = 0.95;
    this.vy = 11.2;
    this.vx = 0;
    this.spawnParticles(this.px, this.py + 0.8, 0xef4444, 14, 5);
    this.emitHud();
  }

  private finishLevel(): void {
    if (this.victoryTimer > 0) return;
    this.victoryTimer = 2.6;
    this.vx = 0;
    this.sound.stopMusic();
    this.sound.playVictory();

    // Calculate 1-3 Stars based on coins collected & lives remaining
    const coinRatio =
      this.levelCoinsTotal > 0 ? this.levelCoinsCollected / this.levelCoinsTotal : 1;
    let stars = 1;
    if (coinRatio >= 0.3 || this.lives >= 4) stars = 2;
    if (coinRatio >= 0.55 || this.lives >= 5) stars = 3;
    this.starsEarned = stars;
    this.completionBonusCoins = 10 + stars * 5;
    this.completionBonusScore = stars * 250 + this.lives * 100;

    this.coins += this.completionBonusCoins;
    this.score += this.completionBonusScore;

    // Fireworks
    this.spawnParticles(this.currentLevel.finishX - 1.5, this.currentLevel.finishY + 4.5, 0xfbbf24, 18, 7);
    this.spawnParticles(this.currentLevel.finishX + 1.5, this.currentLevel.finishY + 5.0, 0x38bdf8, 18, 7);
    this.spawnParticles(this.currentLevel.finishX, this.currentLevel.finishY + 5.8, 0x22c55e, 18, 7);

    // Save progress locally
    const prev = this.saveData.levels[this.currentLevel.id];
    this.saveData.levels[this.currentLevel.id] = {
      completed: true,
      stars: Math.max(prev?.stars ?? 0, stars),
      bestCoins: Math.max(prev?.bestCoins ?? 0, this.levelCoinsCollected),
      totalCoins: this.levelCoinsTotal,
      bestScore: Math.max(prev?.bestScore ?? 0, this.score),
    };
    this.saveData.unlockedLevel = Math.min(
      LEVELS.length,
      Math.max(this.saveData.unlockedLevel, this.currentLevel.id + 1),
    );
    this.saveData.totalCoins += this.levelCoinsCollected + this.completionBonusCoins;
    this.saveData.highScore = Math.max(this.saveData.highScore, this.score);
    persistSaveData(this.saveData);
    this.onSaveUpdate({ ...this.saveData });
    this.emitHud();
  }

  private stepSimulation(dt: number): void {
    this.worldTime += dt;

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.bannerText = null;
        this.emitHud();
      }
    }

    // Animate spinning Fluton Coins & Crest
    for (let i = 0; i < this.coinsList.length; i++) {
      const c = this.coinsList[i];
      if (!c.collected) {
        c.mesh.rotation.y += dt * 3.1;
        c.mesh.position.y = c.y + Math.sin(this.worldTime * 3.4 + c.bobOffset) * 0.14;
      }
    }
    if (this.finishCrest) {
      this.finishCrest.rotation.y += dt * 2.4;
    }

    // Animate Water UVs, Clouds & Ambient Motes
    this.textures.waterMap.offset.x = (this.worldTime * 0.16) % 1;
    this.textures.lavaMap.offset.x = (this.worldTime * 0.08) % 1;
    this.textures.waterfallMap.offset.y = -(this.worldTime * 0.85) % 1;

    for (let i = 0; i < this.clouds.length; i++) {
      this.clouds[i].position.y += Math.sin(this.worldTime * 0.8 + i) * 0.002;
    }

    for (let i = 0; i < this.ambientMotes.length; i++) {
      const m = this.ambientMotes[i];
      m.mesh.position.y += m.speedY * dt;
      m.mesh.position.x = m.baseX + Math.sin(this.worldTime * 1.4 + m.phase) * 0.7;
      if (m.speedY < 0 && m.mesh.position.y < -3) m.mesh.position.y = 11.5;
      if (m.speedY > 0 && m.mesh.position.y > 12) m.mesh.position.y = -2.0;
    }

    if (this.skyDome) {
      this.skyDome.position.x = this.camera.position.x;
    }

    // Update Moving Platforms
    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i];
      p.prevX = p.x;
      p.prevY = p.y;
      if (p.def.moving) {
        const m = p.def.moving;
        const off = Math.sin(this.worldTime * m.speed + (m.phase ?? 0)) * m.range;
        if (m.axis === 'x') p.x = p.baseX + off;
        else p.y = p.baseY + off;
        p.mesh.position.set(p.x, p.y, 0);
      }
    }

    // Update Fire Geysers
    for (let i = 0; i < this.hazards.length; i++) {
      const h = this.hazards[i];
      if (h.kind === 'fire_geyser' && h.plume) {
        const cycle = ((this.worldTime + h.phase) % h.period) / h.period;
        const erupting = cycle < 0.45;
        h.active = erupting;
        const targetScaleY = erupting ? 0.9 + Math.sin(this.worldTime * 28) * 0.14 : 0.05;
        h.plume.scale.y = THREE.MathUtils.damp(h.plume.scale.y, targetScaleY, 16, dt);
        h.plume.visible = h.plume.scale.y > 0.1;
      }
    }

    // Title screen idle preview
    if (this.phase === 'title') {
      this.character.setFacing(1);
      this.character.update(dt, 'idle', 0, {
        shieldActive: false,
        speedActive: false,
        jumpBoostActive: false,
      });
      this.updateContactShadow();
      const isPortrait = this.camera.aspect < 1.0;
      const panX = this.currentLevel.startX + (isPortrait ? 1.8 : 3.2) + Math.sin(this.worldTime * 0.35) * 2.2;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, panX, 3, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 2.5, 3, dt);
      this.camera.position.z = THREE.MathUtils.damp(
        this.camera.position.z,
        isPortrait ? 22.0 : 21.0,
        3,
        dt,
      );
      this.camera.lookAt(panX - 0.1, 1.3, 0);
      this.updateParticles(dt);
      this.updateCallouts(dt);
      return;
    }

    if (this.phase !== 'playing') {
      this.updateParticles(dt);
      this.updateCallouts(dt);
      return;
    }

    // Power-up countdowns
    if (this.powerUps.speedRemaining > 0) {
      this.powerUps.speedRemaining = Math.max(0, this.powerUps.speedRemaining - dt);
    }
    if (this.powerUps.jumpRemaining > 0) {
      this.powerUps.jumpRemaining = Math.max(0, this.powerUps.jumpRemaining - dt);
    }
    if (this.powerUps.shieldActive) {
      this.powerUps.shieldRemaining = Math.max(0, this.powerUps.shieldRemaining - dt);
      if (this.powerUps.shieldRemaining <= 0) {
        this.powerUps.shieldActive = false;
      }
    }
    if (this.pipeCooldown > 0) this.pipeCooldown = Math.max(0, this.pipeCooldown - dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);

    // Victory Dance sequence
    if (this.victoryTimer > 0) {
      this.victoryTimer -= dt;
      this.vy = Math.max(-20, this.vy - 30 * dt);
      this.py += this.vy * dt;
      if (this.py < this.currentLevel.finishY) {
        this.py = this.currentLevel.finishY;
        this.vy = 0;
      }
      this.character.root.position.set(this.px, this.py, 0);
      this.updateContactShadow();
      this.character.update(dt, 'victory', 0, {
        shieldActive: this.powerUps.shieldActive,
        speedActive: this.powerUps.speedRemaining > 0,
        jumpBoostActive: this.powerUps.jumpRemaining > 0,
      });
      if (Math.random() < dt * 3.5) {
        this.spawnParticles(
          this.px + (Math.random() - 0.5) * 4,
          this.py + 3.5 + Math.random() * 2.5,
          Math.random() > 0.5 ? 0xfbbf24 : 0x38bdf8,
          8,
          5.5,
        );
      }
      this.updateParticles(dt);
      this.updateCallouts(dt);
      if (this.victoryTimer <= 0) {
        this.phase = this.currentLevel.id >= LEVELS.length ? 'victory' : 'levelcomplete';
        this.emitHud();
      }
      return;
    }

    // Death animation sequence
    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      this.vy -= 30 * dt;
      this.py += this.vy * dt;
      this.character.root.position.set(this.px, this.py, 0);
      this.contactShadow.visible = false;
      this.character.update(dt, 'death', 0, {
        shieldActive: false,
        speedActive: false,
        jumpBoostActive: false,
      });
      this.updateParticles(dt);
      this.updateCallouts(dt);
      if (this.deathTimer <= 0) {
        if (this.lives <= 0) {
          this.phase = 'gameover';
          this.sound.stopMusic();
          this.emitHud();
        } else {
          this.px = this.respawnX;
          this.py = this.respawnY + 1.2;
          this.vx = 0;
          this.vy = 0;
          this.inUnderground = false;
          this.invulnTimer = 2.4;
          this.playerHp = this.maxPlayerHp;
          if (this.skyDome) this.skyDome.visible = true;
          this.scene.background = new THREE.Color(this.currentLevel.theme.skyBottom);
          this.scene.fog = new THREE.FogExp2(
            this.currentLevel.theme.fogColor,
            this.currentLevel.theme.isNight ? 0.0072 : 0.0046,
          );
          this.emitHud();
        }
      }
      return;
    }

    // ========================
    // PLAYER MOVEMENT & PHYSICS
    // ========================
    const speedBoost = this.powerUps.speedRemaining > 0 ? 1.4 : 1.0;
    const isRunning = this.input.run || this.powerUps.speedRemaining > 0;
    const maxSpeed = (isRunning ? 10.8 : 7.4) * speedBoost;
    const accel = this.grounded ? (this.onIce ? 24 : 64) : 56;

    const moveDir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    if (moveDir !== 0) {
      this.character.setFacing(moveDir);
      this.vx = THREE.MathUtils.damp(this.vx, moveDir * maxSpeed, accel * 0.25, dt);
    } else {
      const friction = this.grounded ? (this.onIce ? 3.2 : 18) : 6.5;
      this.vx = THREE.MathUtils.damp(this.vx, 0, friction, dt);
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    }

    // Generous coyote time & jump buffer for responsive mobile jumps
    if (this.grounded) {
      this.coyoteTimer = 0.18;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    const jumpJustPressed = this.input.jump && !this.jumpHeldPrev;
    if (jumpJustPressed) {
      this.jumpBufferTimer = 0.20;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    // +23% higher jump & ~17% longer hang time / jump duration
    const superJump = this.powerUps.jumpRemaining > 0;
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = superJump ? 19.6 : 15.6;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.sound.playJump(superJump);
      this.spawnParticles(this.px, this.py + 0.1, superJump ? 0x38bdf8 : 0xe2e8f0, 5, 2.2);
    }

    // Gentle variable jump cut on early release so mobile taps stay forgiving
    if (!this.input.jump && this.vy > 6.5) {
      this.vy *= Math.pow(0.58, dt * 10);
    }
    this.jumpHeldPrev = this.input.jump;

    // Slightly softer gravity for longer, smoother jump arc
    this.vy = Math.max(-20, this.vy - 28.5 * dt);

    const halfW = 0.36;
    const playerH = 1.55;

    // Horizontal move & collision
    this.px += this.vx * dt;
    if (this.inUnderground && this.currentLevel.undergroundBounds) {
      this.px = THREE.MathUtils.clamp(
        this.px,
        this.currentLevel.undergroundBounds.minX + 0.8,
        this.currentLevel.undergroundBounds.maxX - 0.8,
      );
    } else {
      this.px = Math.max(-2.5, this.px);
    }

    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i];
      if (this.py + playerH - 0.08 > p.y - p.h / 2 && this.py + 0.08 < p.y + p.h / 2) {
        const minX = p.x - p.w / 2 - halfW;
        const maxX = p.x + p.w / 2 + halfW;
        if (this.px > minX && this.px < maxX) {
          if (this.px < p.x) {
            this.px = minX;
          } else {
            this.px = maxX;
          }
          this.vx = 0;
        }
      }
    }

    for (let i = 0; i < this.mysteryBoxes.length; i++) {
      const b = this.mysteryBoxes[i];
      if (this.py + playerH - 0.08 > b.y - b.h / 2 && this.py + 0.08 < b.y + b.h / 2) {
        const minX = b.x - b.w / 2 - halfW;
        const maxX = b.x + b.w / 2 + halfW;
        if (this.px > minX && this.px < maxX) {
          this.px = this.px < b.x ? minX : maxX;
          this.vx = 0;
        }
      }
    }

    // Vertical move & collision
    this.wasGrounded = this.grounded;
    this.grounded = false;
    this.onIce = false;
    const prevPy = this.py;
    this.py += this.vy * dt;

    let standingPlatform: RuntimePlatform | null = null;

    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i];
      if (this.px + halfW - 0.04 > p.x - p.w / 2 && this.px - halfW + 0.04 < p.x + p.w / 2) {
        const top = p.y + p.h / 2;
        const bottom = p.y - p.h / 2;
        if (this.vy <= 0 && prevPy >= top - 0.35 && this.py <= top + 0.04) {
          this.py = top;
          this.vy = 0;
          this.grounded = true;
          this.onIce = p.def.kind === 'ice';
          standingPlatform = p;
        } else if (this.vy > 0 && prevPy + playerH <= bottom + 0.35 && this.py + playerH >= bottom) {
          this.py = bottom - playerH;
          this.vy = -1.2;
        }
      }
    }

    if (standingPlatform && standingPlatform.def.moving) {
      this.px += standingPlatform.x - standingPlatform.prevX;
      this.py += standingPlatform.y - standingPlatform.prevY;
    }

    // Mystery Boxes vertical collision
    for (let i = 0; i < this.mysteryBoxes.length; i++) {
      const b = this.mysteryBoxes[i];
      if (b.bumpTimer > 0) {
        b.bumpTimer = Math.max(0, b.bumpTimer - dt);
        b.group.position.y = b.baseY + Math.sin((b.bumpTimer / 0.22) * Math.PI) * 0.32;
      } else {
        b.group.position.y = b.baseY;
      }

      if (this.px + halfW - 0.04 > b.x - b.w / 2 && this.px - halfW + 0.04 < b.x + b.w / 2) {
        const top = b.y + b.h / 2;
        const bottom = b.y - b.h / 2;
        if (this.vy <= 0 && prevPy >= top - 0.32 && this.py <= top + 0.04) {
          this.py = top;
          this.vy = 0;
          this.grounded = true;
        } else if (this.vy > 0 && prevPy + playerH <= bottom + 0.35 && this.py + playerH >= bottom) {
          this.py = bottom - playerH;
          this.vy = -2.0;
          if (!b.used) {
            this.bonkMysteryBox(b);
          }
        }
      }
    }

    // Pipe solid top collision & warp detection
    this.nearPipe = null;
    for (let i = 0; i < this.pipes.length; i++) {
      const pipe = this.pipes[i];
      const pipeTop = pipe.y + 1.66;
      const pipeHalfW = 0.85;
      if (this.px + halfW > pipe.x - pipeHalfW && this.px - halfW < pipe.x + pipeHalfW) {
        if (this.vy <= 0 && prevPy >= pipeTop - 0.35 && this.py <= pipeTop + 0.05) {
          this.py = pipeTop;
          this.vy = 0;
          this.grounded = true;
          this.nearPipe = pipe;
        } else if (this.py + 0.05 < pipeTop && this.py + playerH > pipe.y) {
          this.px = this.px < pipe.x ? pipe.x - pipeHalfW - halfW : pipe.x + pipeHalfW + halfW;
          this.vx = 0;
        }
      }
    }

    if (this.nearPipe && this.input.down && this.pipeCooldown <= 0) {
      this.enterPipe(this.nearPipe);
    }

    // Landing trigger
    if (this.grounded && !this.wasGrounded) {
      this.character.triggerLanding();
      this.sound.playLand();
      this.spawnParticles(this.px, this.py + 0.08, this.onIce ? 0xbae6fd : 0xd6d3d1, 5, 1.9);
    }

    // Water / Lava / Abyss hazard check
    if (!this.inUnderground && this.py < -5.8) {
      this.hurtPlayer('fall');
      return;
    }
    if (this.inUnderground && this.py < -36) {
      this.hurtPlayer('fall');
      return;
    }
    for (let i = 0; i < this.currentLevel.waterZones.length; i++) {
      const wz = this.currentLevel.waterZones[i];
      const waterSurface = wz.y + wz.h * 0.5;
      if (
        !this.inUnderground &&
        this.px > wz.x - wz.w * 0.5 &&
        this.px < wz.x + wz.w * 0.5 &&
        this.py < waterSurface - 0.35
      ) {
        this.spawnParticles(this.px, waterSurface, wz.isLava ? 0xf97316 : 0x7dd3fc, 12, 4.5);
        this.hurtPlayer('fall');
        return;
      }
    }

    // Cactus & Fire Geyser Hazard Collisions
    for (let i = 0; i < this.hazards.length; i++) {
      const h = this.hazards[i];
      if (!h.active) continue;
      if (h.kind === 'cactus') {
        if (Math.abs(this.px - h.x) < 0.55 && this.py < h.y + h.height - 0.15 && this.py + playerH > h.y) {
          this.hurtPlayer('hazard');
          return;
        }
      } else if (h.kind === 'fire_geyser') {
        if (Math.abs(this.px - h.x) < 0.52 && this.py < h.y + h.height - 0.2 && this.py + playerH > h.y + 0.45) {
          this.hurtPlayer('hazard');
          return;
        }
      }
    }

    // Coin Collection
    const playerCenterY = this.py + 0.8;
    for (let i = 0; i < this.coinsList.length; i++) {
      const c = this.coinsList[i];
      if (c.collected) continue;
      const dx = this.px - c.x;
      const dy = playerCenterY - c.y;
      if (dx * dx + dy * dy < 1.05 * 1.05) {
        this.collectCoin(c);
      }
    }

    // Active Power-Up Pickups
    for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
      const pu = this.activePowerUps[i];
      if (pu.collected) continue;
      if (pu.spawnTimer > 0) {
        pu.spawnTimer -= dt;
        pu.y += dt * 3.0;
      } else {
        pu.vy = Math.max(-18, pu.vy - 24 * dt);
        pu.x += pu.vx * dt;
        pu.y += pu.vy * dt;
        for (let j = 0; j < this.platforms.length; j++) {
          const p = this.platforms[j];
          const top = p.y + p.h / 2;
          if (pu.x > p.x - p.w / 2 && pu.x < p.x + p.w / 2 && pu.vy <= 0 && pu.y <= top + 0.45 && pu.y >= top - 0.5) {
            pu.y = top + 0.45;
            pu.vy = 0;
          }
        }
      }
      pu.mesh.position.set(pu.x, pu.y, 0);
      pu.mesh.rotation.y += dt * 2.8;

      const dx = this.px - pu.x;
      const dy = playerCenterY - pu.y;
      if (dx * dx + dy * dy < 1.1 * 1.1) {
        pu.collected = true;
        this.worldGroup.remove(pu.mesh);
        this.spawnParticles(pu.x, pu.y, 0x38bdf8, 14, 5);
        this.activatePowerUp(pu.type);
      }
    }

    // Checkpoints
    for (let i = 0; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i];
      if (!cp.activated && Math.abs(this.px - cp.x) < 1.5 && Math.abs(this.py - cp.y) < 3.0) {
        cp.activated = true;
        this.hasCheckpoint = true;
        this.respawnX = cp.x;
        this.respawnY = cp.y + 0.5;
        this.playerHp = this.maxPlayerHp;
        cp.beaconMat.color.setHex(0x22c55e);
        cp.beaconMat.emissive.setHex(0x16a34a);
        (cp.flag.material as THREE.MeshStandardMaterial).color.setHex(0x22c55e);
        this.sound.playCheckpoint();
        this.spawnParticles(cp.x, cp.y + 2.8, 0x22c55e, 14, 4.5);
        this.showBanner('Checkpoint Reached!', 1.6);
        this.emitHud();
      }
      if (cp.activated && cp.flag.position.y < 2.75) {
        cp.flag.position.y = Math.min(2.75, cp.flag.position.y + dt * 4.5);
      }
    }

    // Enemies AI & Combat Collision
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive) {
        if (e.squashTimer > 0) {
          e.squashTimer -= dt;
          e.group.scale.y = Math.max(0.12, e.squashTimer * 3);
          e.group.scale.x = 1.35;
          if (e.squashTimer <= 0) e.group.visible = false;
        }
        continue;
      }

      e.x += e.dir * e.speed * dt;
      if (e.x >= e.maxX) {
        e.x = e.maxX;
        e.dir = -1;
      } else if (e.x <= e.minX) {
        e.x = e.minX;
        e.dir = 1;
      }

      if (e.type === 'flyer') {
        e.y = e.baseY + Math.sin(this.worldTime * 3.5 + e.phase) * e.amplitude;
        if (e.wingL && e.wingR) {
          const flap = Math.sin(this.worldTime * 22) * 0.55;
          e.wingL.rotation.z = flap;
          e.wingR.rotation.z = -flap;
        }
      } else if (e.type === 'hopper') {
        e.hopTimer -= dt;
        if (e.hopTimer <= 0 && e.y <= e.baseY + 0.02) {
          e.vy = 8.8;
          e.hopTimer = 1.25;
        }
        e.vy -= 26 * dt;
        e.y += e.vy * dt;
        if (e.y < e.baseY) {
          e.y = e.baseY;
          e.vy = 0;
        }
      } else {
        if (e.footL && e.footR) {
          const w = Math.sin(this.worldTime * 11) * 0.12;
          e.footL.position.z = 0.04 + w;
          e.footR.position.z = 0.04 - w;
        }
      }

      e.group.position.set(e.x, e.y, 0);
      e.group.rotation.y = THREE.MathUtils.damp(
        e.group.rotation.y,
        e.dir > 0 ? Math.PI * 0.42 : -Math.PI * 0.42,
        12,
        dt,
      );

      const dx = Math.abs(this.px - e.x);
      const dy = playerCenterY - (e.y + 0.45);
      const isStomping =
        e.type !== 'spiky' &&
        this.vy <= 0.8 &&
        prevPy >= e.y + 0.22;
      if ((isStomping && dx < 0.78 && Math.abs(dy) < 0.82) || (dx < 0.68 && Math.abs(dy) < 0.72)) {
        if (isStomping) {
          e.alive = false;
          e.squashTimer = 0.32;
          this.vy = 11.8;
          this.score += 100;
          this.sound.playStomp();
          this.spawnParticles(e.x, e.y + 0.5, 0xfbbf24, 10, 4);
          this.emitHud();
        } else {
          this.hurtPlayer('enemy');
          return;
        }
      }
    }

    // Level 10 Final Boss Battle (Shadow King Spike — Clear, Fair Boss Pattern)
    if (this.boss && !this.boss.defeated && !this.inUnderground) {
      const b = this.boss;
      if (!b.engaged && this.px >= b.minX - 6) {
        b.engaged = true;
        this.showBanner(`Boss Battle: ${b.name}! Stomp His Crown!`, 2.6);
        this.emitHud();
      }
      if (b.invulnTimer > 0) {
        b.invulnTimer = Math.max(0, b.invulnTimer - dt);
        b.group.visible = Math.floor(b.invulnTimer * 16) % 2 === 0;
      } else {
        b.group.visible = true;
      }

      if (b.engaged) {
        const rageBoost = b.hp <= 2 ? 1.28 : 1.0;
        b.x += b.dir * 2.5 * rageBoost * dt;
        if (b.x >= b.maxX) {
          b.x = b.maxX;
          b.dir = -1;
        } else if (b.x <= b.minX) {
          b.x = b.minX;
          b.dir = 1;
        }

        b.hopTimer -= dt;
        if (b.hopTimer <= 0 && b.y <= b.baseY + 0.03) {
          b.vy = b.hp <= 2 ? 9.2 : 7.8;
          b.hopTimer = b.hp <= 2 ? 2.2 : 3.0;
        }
        b.vy -= 24 * dt;
        b.y += b.vy * dt;
        if (b.y <= b.baseY) {
          b.y = b.baseY;
          b.vy = 0;
        }

        b.group.position.set(b.x, b.y, 0);
        b.group.rotation.y = THREE.MathUtils.damp(
          b.group.rotation.y,
          b.dir > 0 ? Math.PI * 0.44 : -Math.PI * 0.44,
          10,
          dt,
        );
        b.crown.rotation.y += dt * 2.5;
        b.armL.rotation.x = Math.sin(this.worldTime * 8) * 0.5;
        b.armR.rotation.x = -Math.sin(this.worldTime * 8) * 0.5;

        // Boss collision with player (generous crown stomp zone)
        const dx = Math.abs(this.px - b.x);
        if (dx < 1.45 && this.py < b.y + 3.55 && this.py + playerH > b.y) {
          const isStompingCrown = this.vy <= 0.4 && prevPy >= b.y + 1.85;
          if (isStompingCrown && b.invulnTimer <= 0) {
            b.hp -= 1;
            b.invulnTimer = 1.0;
            this.vy = 14.5;
            this.vx = Math.sign(this.px - b.x || -1) * 4.5;
            this.score += 300;
            this.sound.playBossHit();
            this.spawnParticles(b.x, b.y + 3.2, 0x38bdf8, 16, 6);
            if (b.hp <= 0) {
              b.defeated = true;
              b.group.visible = false;
              this.score += 1500;
              this.coins += 25;
              this.sound.playBossDefeat();
              this.spawnParticles(b.x, b.y + 1.8, 0xfbbf24, 28, 8);
              this.spawnParticles(b.x, b.y + 2.2, 0x38bdf8, 20, 7);
              if (this.finishBarrier) this.finishBarrier.visible = false;
              this.showBanner('Shadow King Defeated! Finish Gate Open!', 2.8);
            } else {
              this.showBanner(`${b.name} Hit! (${b.hp} HP Left)`, 1.2);
            }
            this.emitHud();
          } else if (b.invulnTimer <= 0) {
            this.hurtPlayer('enemy');
            return;
          }
        }
      }
    }

    // Finish Gate check (locked until Boss defeated on Level 10)
    if (
      !this.inUnderground &&
      Math.abs(this.px - this.currentLevel.finishX) < 1.6 &&
      Math.abs(this.py - this.currentLevel.finishY) < 3.5
    ) {
      if (this.boss && !this.boss.defeated) {
        this.px = Math.min(this.px, this.currentLevel.finishX - 1.9);
        this.vx = 0;
        this.showBanner(`Defeat ${this.boss.name} to Unlock Gate!`, 1.4);
      } else {
        this.finishLevel();
        return;
      }
    }

    // Invulnerability flicker
    this.character.root.visible =
      this.invulnTimer <= 0 || Math.floor(this.invulnTimer * 18) % 2 === 0;

    // Update character transform & animation state
    this.character.root.position.set(this.px, this.py, 0);
    this.updateContactShadow();
    let animState: CharacterAnimState = 'idle';
    if (!this.grounded) {
      animState = 'jump';
    } else if (Math.abs(this.vx) > 7.8) {
      animState = 'run';
    } else if (Math.abs(this.vx) > 0.35) {
      animState = 'walk';
    }
    this.character.update(dt, animState, Math.abs(this.vx) / 10.8, {
      shieldActive: this.powerUps.shieldActive,
      speedActive: this.powerUps.speedRemaining > 0,
      jumpBoostActive: this.powerUps.jumpRemaining > 0,
      vy: this.vy,
    });

    // Smooth Side-View Third-Person Camera (preserving exact calibrated zoom & framing!)
    const isPortrait = this.camera.aspect < 1.0;
    const baseOffset = isPortrait ? 1.25 : 2.4;
    const velLookAhead = isPortrait
      ? THREE.MathUtils.clamp(this.vx * 0.1, -0.3, 0.9)
      : THREE.MathUtils.clamp(this.vx * 0.14, -0.5, 1.4);
    const targetCamX = this.px + baseOffset + velLookAhead;
    const targetCamY = this.inUnderground
      ? this.currentLevel.undergroundBounds!.floorY + 3.6
      : Math.max(1.9, this.py + 2.3);
    const targetCamZ = this.inUnderground
      ? (isPortrait ? 20.5 : 18.5)
      : (isPortrait ? 24.0 : 22.5);

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 5.5, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 5.0, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 4.8, dt);

    const lookY = this.inUnderground
      ? this.currentLevel.undergroundBounds!.floorY + 2.5
      : Math.max(0.8, this.py + 1.2);
    this._camTarget.set(this.camera.position.x - 0.1, lookY, 0);
    this.camera.lookAt(this._camTarget);

    // Keep shadow sun centered near player
    this.sunLight.position.set(this.px + 14, 26, 18);
    this.sunLight.target.position.set(this.px, 0, 0);

    this.updateParticles(dt);
    this.updateCallouts(dt);

    // Periodic HUD update for power-up timers & pipe prompt
    this.hudEmitTimer += dt;
    if (this.hudEmitTimer >= 0.12) {
      this.hudEmitTimer = 0;
      this.emitHud();
    }
  }

  private bonkMysteryBox(box: RuntimeMysteryBox): void {
    box.used = true;
    box.bumpTimer = 0.22;
    box.mainMat.map = this.textures.usedBoxMap;
    box.mainMat.needsUpdate = true;
    this.sound.playMysteryBoxVoice();
    this.spawnParticles(box.x, box.y + 0.75, 0xfde047, 14, 5.0);
    this.spawnGoldenStarSparkles(box.x, box.y + 0.9, 14);
    this.spawnGFlutonCallout(box.x, box.y + 1.2);

    if (box.reward === 'coins') {
      this.coins += box.coinCount;
      this.score += box.coinCount * 50;
      this.sound.playCoinDelayed(0.48);
      this.character.triggerCoinCollect();
      this.showBanner(`GFluton! +${box.coinCount} Fluton Coins!`, 1.5);
      this.emitHud();
    } else {
      const puMesh = createPowerUpMesh(box.reward);
      puMesh.position.set(box.x, box.y + 0.5, 0);
      this.worldGroup.add(puMesh);
      this.activePowerUps.push({
        mesh: puMesh,
        type: box.reward,
        x: box.x,
        y: box.y + 0.5,
        vx: box.reward === 'shield' || box.reward === 'life' ? 0 : 2.2,
        vy: 0,
        collected: false,
        spawnTimer: 0.3,
      });
    }
  }

  private emitHud(): void {
    const bossHud: BossHudState | null =
      this.boss && (this.boss.engaged || this.boss.defeated)
        ? {
            name: this.boss.name,
            hp: Math.max(0, this.boss.hp),
            maxHp: this.boss.maxHp,
            defeated: this.boss.defeated,
          }
        : null;

    this.onHudUpdate({
      phase: this.phase,
      levelId: this.currentLevel.id,
      levelName: this.currentLevel.name,
      levelSubtitle: this.currentLevel.subtitle,
      biome: this.currentLevel.biome,
      coins: this.coins,
      levelCoinsCollected: this.levelCoinsCollected,
      levelCoinsTotal: this.levelCoinsTotal,
      score: this.score,
      lives: this.lives,
      playerHp: this.playerHp,
      maxPlayerHp: this.maxPlayerHp,
      hasCheckpoint: this.hasCheckpoint,
      inUnderground: this.inUnderground,
      nearPipe: Boolean(this.nearPipe),
      powerUps: { ...this.powerUps },
      bannerText: this.bannerText,
      starsEarned: this.starsEarned,
      completionBonusCoins: this.completionBonusCoins,
      completionBonusScore: this.completionBonusScore,
      boss: bossHud,
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    this.stepSimulation(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private startLoop(): void {
    this.lastTime = performance.now();
    if (this.isSoftwareGl) {
      this.tick();
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private stopLoop(): void {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
  }

  public dispose(): void {
    this.disposed = true;
    this.stopLoop();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    this.textures.dispose();
    this.envTexture.dispose();
    this.particleGeo.dispose();
    this.particleMatCache.forEach((m) => m.dispose());
    this.particleMatCache.clear();
    this.calloutTextGeo.dispose();
    this.calloutSparkleGeo.dispose();
    this.goldenSparkleMat.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
