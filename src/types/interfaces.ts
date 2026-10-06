// ============================================================================
// FROZEN INTERFACES — DO NOT CHANGE
// These interfaces are strictly frozen per project governance.
// Implement to them, NEVER modify them.
// ============================================================================

export interface Vec2 {
  x: number;
  y: number;
}

export interface IGameState {
  phase: 'menu' | 'playing' | 'paused' | 'levelup' | 'gameover';
  time: number;
  paused: boolean;
}

export interface IStats {
  hp: number;
  maxHp: number;
  moveSpeed: number;
  damageMul: number;
  attackSpeedMul: number;
  critChance: number;
  magnetRadius: number;
  armor: number;
  xpMul: number;
  luck: number;
  coinMul: number;
}

export interface IWeaponLevel {
  level: number;
  damage: number;
  cooldown: number;
  area: number;
  count: number;
  speed: number;
  description: string;
}

export interface IWeaponDef {
  id: string;
  name: string;
  levels: [
    IWeaponLevel,
    IWeaponLevel,
    IWeaponLevel,
    IWeaponLevel,
    IWeaponLevel,
    IWeaponLevel,
    IWeaponLevel,
    IWeaponLevel
  ];
  evolution: {
    requiresPassive: string;
    evolvesTo: string;
  } | null;
}

export interface IEnemyDef {
  id: string;
  hp: number;
  speed: number;
  damage: number;
  xpValue: number;
  behavior: 'chase' | 'dash' | 'tank' | 'split' | 'ranged' | 'kamikaze';
  scale: number;
  color: string;
}

export interface IPassiveDef {
  id: string;
  name: string;
  levels: [number, number, number, number, number, number, number, number];
  stat: keyof IStats;
}

export interface IWeapon {
  id: string;
  level: number;
  cooldown: number;
  update(dt: number, ctx: CombatCtx): void;
}

export interface IEnemy {
  id: string;
  hp: number;
  maxHp: number;
  pos: Vec2;
  vel: Vec2;
  speed: number;
  damage: number;
  xpValue: number;
  update(dt: number, playerPos: Vec2): void;
  takeDamage(n: number): boolean;
}

export interface SpawnOrder {
  enemyDefId: string;
  pos: Vec2;
  isElite?: boolean;
  isBoss?: boolean;
}

export interface IDirector {
  update(dt: number, time: number): SpawnOrder[];
}

export interface IWaveEvent {
  at: number;
  type: 'swarm' | 'elite' | 'boss';
  enemyId: string;
  count: number;
}

export interface ISettings {
  language: 'hi' | 'en';
  sfxVolume: number;
  musicVolume: number;
  joystickSide: 'left' | 'right';
  qualityMode: 'high' | 'low';
}

export interface ISaveData {
  coins: number;
  upgrades: Record<string, number>;
  unlockedChars: string[];
  unlockedMaps: string[];
  achievements: string[];
  settings: ISettings;
}

// Runtime Combat Context provided to weapon updates
export interface CombatCtx {
  playerPos: Vec2;
  playerStats: IStats;
  enemies: IEnemy[];
  time: number;
  spawnProjectile: (p: Projectile) => void;
  spawnDamageNumber: (pos: Vec2, amount: number, isCrit: boolean) => void;
  triggerSound: (soundId: string) => void;
  applyScreenshake: (intensity: number) => void;
  spatialQuery: (pos: Vec2, radius: number) => IEnemy[];
}

export interface Projectile {
  id: string;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  damage: number;
  duration: number;
  color: string;
  pierce: number;
  isCrit?: boolean;
  onHit?: (target: IEnemy, ctx: CombatCtx) => void;
  update?: (dt: number, ctx: CombatCtx) => void;
  render?: (ctx: CanvasRenderingContext2D) => void;
}
