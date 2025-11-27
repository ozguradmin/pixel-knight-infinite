
export interface GameAssets {
  walk: HTMLImageElement[];
  attack: HTMLImageElement[];
  death: HTMLImageElement[];
}

export interface Point {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  dead: boolean;
}

export interface Player extends Entity {
  state: 'idle' | 'walk' | 'attack' | 'dead';
  facing: 1 | -1; // 1 = right, -1 = left
  frameIndex: number;
  frameTimer: number;
  attackCooldown: number;
  invulnerabilityTimer: number;
  // Ability
  dashCooldown: number;
  isDashing: boolean;
  // Magic
  mana: number;
  maxMana: number;
  // RPG Stats
  level: number;
  xp: number;
  maxXp: number;
  damage: number;
  gold: number; 
  // Companion
  hasDrone: boolean;
  droneX: number;
  droneY: number;
  droneCooldown: number;
}

export interface Enemy extends Entity {
  type: 'slime' | 'skeleton' | 'archer' | 'boss';
  isBoss: boolean;
  aggroRange: number;
  attackRange: number;
  speed: number;
  damage: number;
  flashTimer: number; 
  animTimer: number; // For wobbling/walking anims
  attackTimer: number; // For ranged attacks
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface Decal {
  id: string;
  x: number;
  y: number;
  type: 'blood' | 'scorch';
  opacity: number;
  scale: number;
}

export interface Projectile {
  id: string;
  owner: 'player' | 'enemy' | 'drone';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  radius: number;
  color: string;
  trail?: boolean; // For fireball visuals
}

export interface Drop {
  id: string;
  x: number;
  y: number;
  type: 'xp' | 'health' | 'gold';
  value: number;
  life: number; // Despawn timer
  magnetized: boolean; // Is it flying to player?
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
}

export interface ChatMessage {
  sender: 'player' | 'npc' | 'merchant';
  text: string;
}

export interface NPC {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  type: 'guide' | 'merchant';
  interactionRange: number;
}

// --- Chunk System Types ---
export interface TileData {
  type: 'ground' | 'wall' | 'water' | 'floor';
  biome: 'grass' | 'desert' | 'corruption' | 'outpost';
  decoration: 'none' | 'tree' | 'rock' | 'grass' | 'flower' | 'crate' | 'fence' | 'cactus' | 'spikes';
  variant: number; // For visual variety
  scale: number; // Size multiplier
}

export interface Chunk {
  x: number; // Chunk Grid X
  y: number; // Chunk Grid Y
  canvas: OffscreenCanvas | HTMLCanvasElement; // Cached visual
  tiles: TileData[][]; // Logical collision data
  hasOutpost: boolean;
}

export interface GhostTrail {
  x: number;
  y: number;
  facing: 1 | -1;
  life: number;
  sprite: HTMLImageElement;
}
