

export const TILE_SIZE = 64;
export const CHUNK_SIZE_TILES = 16; // 16x16 tiles per chunk
export const CHUNK_PIXEL_SIZE = TILE_SIZE * CHUNK_SIZE_TILES;

export const PLAYER_SPEED = 3.5; 
export const PLAYER_SCALE = 1.5; 
export const DASH_SPEED = 12;
export const DASH_DURATION = 15;
export const DASH_COOLDOWN = 180; // Base 3 Seconds
export const DASH_UNLOCK_LEVEL = 3;

export const FRAME_DURATION = 10; 
export const ANIMATION_SPEED = 0.15; 
export const ATTACK_COOLDOWN = 25; 
export const ATTACK_RANGE = 90; 
export const BASE_ATTACK_DAMAGE = 25;

// Magic
export const FIREBALL_UNLOCK_LEVEL = 2;
export const FIREBALL_MANA_COST = 35;
export const FIREBALL_SPEED = 10;
export const FIREBALL_DAMAGE = 50;
export const MANA_REGEN = 0.05; 

// Companion
export const DRONE_OFFSET_X = -30;
export const DRONE_OFFSET_Y = -40;
export const DRONE_COOLDOWN = 60; // 1 second
export const DRONE_RANGE = 400;
export const DRONE_DAMAGE = 15;

// Ranged Enemies
export const ARROW_SPEED = 7;
export const ARCHER_RANGE = 400;
export const ARCHER_ATTACK_COOLDOWN = 120; 

// World Generation
export const OBSTACLE_DENSITY = 0.05; 
export const SAFE_ZONE_RADIUS = 300; 
export const BIOME_SCALE = 0.05; 
export const OUTPOST_CHANCE = 0.05; // Increased to 5% per chunk

// Drops & RPG
export const DROP_LIFE = 600; 
export const HEALTH_DROP_CHANCE = 0.05; 
export const HEALTH_DROP_VALUE = 30;
export const GOLD_DROP_CHANCE = 0.3;
export const GOLD_DROP_VALUE_MIN = 5;
export const GOLD_DROP_VALUE_MAX = 15;
export const XP_ORB_VALUE = 10;
export const PICKUP_RANGE = 60;
export const MAGNET_RANGE = 120;

// Shop Prices
export const SHOP_PRICES = {
  potion: 50,
  maxHp: 200,
  maxMana: 150,
  speed: 300,
  drone: 1000
};

// Environment
export const DAY_NIGHT_CYCLE_SPEED = 0.00002; 
export const VIGNETTE_INTENSITY = 0.4; 

// Colors
export const COLORS = {
  bg: '#1a1a1a', 
  
  // Biomes
  grass_base: '#2d3b32',
  grass_accent: '#36453b',
  desert_base: '#d4b483',
  desert_accent: '#c19a6b',
  corruption_base: '#2e1a2e',
  corruption_accent: '#3f243f',
  outpost_floor: '#5d4037',
  outpost_floor_detail: '#4e342e',

  tree_trunk: '#4a3b32',
  tree_leaves_dark: '#1e4d2b',
  tree_leaves_mid: '#2e7d32',
  tree_leaves_light: '#4caf50',
  rock_base: '#546e7a',
  rock_highlight: '#78909c',
  rock_shadow: '#37474f',
  damage: '#ef4444',
  xp: '#fbbf24',
  gold: '#fcd34d',
  heal: '#ef4444',
  mana: '#3b82f6',
  text_damage: '#ffffff',
  text_crit: '#fca5a5',
  ui_bg: 'rgba(0, 0, 0, 0.7)',
  light_warm: 'rgba(255, 160, 60, 0.1)',
  light_cold: 'rgba(100, 200, 255, 0.05)'
};
