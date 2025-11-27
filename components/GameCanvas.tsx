
import React, { useRef, useEffect, useState } from 'react';
import { GameAssets, Player, Enemy, Particle, Drop, FloatingText, NPC, ChatMessage, Chunk, TileData, GhostTrail, Decal, Projectile } from '../types';
import { 
  TILE_SIZE, PLAYER_SPEED, COLORS, PLAYER_SCALE, 
  ATTACK_COOLDOWN, ATTACK_RANGE, BASE_ATTACK_DAMAGE,
  OBSTACLE_DENSITY, SAFE_ZONE_RADIUS,
  HEALTH_DROP_CHANCE, HEALTH_DROP_VALUE, XP_ORB_VALUE,
  GOLD_DROP_CHANCE, GOLD_DROP_VALUE_MIN, GOLD_DROP_VALUE_MAX,
  DROP_LIFE, PICKUP_RANGE, MAGNET_RANGE,
  CHUNK_SIZE_TILES, CHUNK_PIXEL_SIZE,
  DASH_SPEED, DASH_COOLDOWN, DASH_DURATION, DASH_UNLOCK_LEVEL,
  DAY_NIGHT_CYCLE_SPEED, VIGNETTE_INTENSITY,
  FIREBALL_MANA_COST, FIREBALL_SPEED, FIREBALL_DAMAGE, MANA_REGEN, FIREBALL_UNLOCK_LEVEL,
  ARCHER_RANGE, ARCHER_ATTACK_COOLDOWN, ARROW_SPEED,
  BIOME_SCALE, OUTPOST_CHANCE, SHOP_PRICES,
  DRONE_COOLDOWN, DRONE_DAMAGE, DRONE_OFFSET_X, DRONE_OFFSET_Y, DRONE_RANGE
} from '../constants';
import { generateNPCResponse } from '../services/ai';

interface GameCanvasProps {
  assets: GameAssets;
  onRestart: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ assets, onRestart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // UI State
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [maxXp, setMaxXp] = useState(100);
  const [hp, setHp] = useState(200);
  const [maxHp, setMaxHp] = useState(200);
  const [mana, setMana] = useState(100);
  const [maxMana, setMaxMana] = useState(100);
  const [gold, setGold] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [dashCooldownVisual, setDashCooldownVisual] = useState(0);
  
  // Interaction State
  const [showChat, setShowChat] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [activeNPC, setActiveNPC] = useState<NPC | null>(null);
  const [npcMessage, setNpcMessage] = useState<string>("");
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Input State
  const keys = useRef<{ [key: string]: boolean }>({});
  const mouse = useRef<{ x: number, y: number, down: boolean, rightDown: boolean }>({ x: 0, y: 0, down: false, rightDown: false });

  // Game State Refs
  const playerRef = useRef<Player>({
    id: 'player',
    x: 0,
    y: 0,
    width: 20, 
    height: 20, 
    vx: 0,
    vy: 0,
    health: 200,
    maxHealth: 200,
    dead: false,
    state: 'idle',
    facing: 1,
    frameIndex: 0,
    frameTimer: 0,
    attackCooldown: 0,
    invulnerabilityTimer: 0,
    dashCooldown: 0,
    isDashing: false,
    mana: 100,
    maxMana: 100,
    level: 1,
    xp: 0,
    maxXp: 100,
    damage: BASE_ATTACK_DAMAGE,
    gold: 0,
    hasDrone: false,
    droneX: 0,
    droneY: 0,
    droneCooldown: 0
  });

  // Global NPCs list (Safe zone + Outposts)
  const npcsRef = useRef<NPC[]>([]);

  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const decalsRef = useRef<Decal[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const dropsRef = useRef<Drop[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const ghostTrailsRef = useRef<GhostTrail[]>([]);
  
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const shakeRef = useRef(0);
  const hitStopRef = useRef(0); 
  const worldSeedRef = useRef(Math.random() * 10000);
  const timeOfDayRef = useRef(0.3); 
  const rainRef = useRef<{x:number, y:number, speed:number, length:number}[]>([]);
  
  const chunksRef = useRef<Map<string, Chunk>>(new Map());

  // Initialize Game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initial Safe Zone NPC
    npcsRef.current.push({
      id: 'guide_old_knight',
      x: 100,
      y: 80,
      width: 32,
      height: 32,
      name: "Old Knight",
      type: 'guide',
      interactionRange: 100
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showChat || showShop) {
        if (e.key === 'Escape') {
           setShowChat(false);
           setShowShop(false);
           setActiveNPC(null);
        }
        return;
      }
      keys.current[e.code] = true;
      if (e.code === 'Space' && !playerRef.current.dead) {
         handleAttack();
      }
      if (e.code === 'KeyE') {
         checkNPCInteraction();
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
         handleDash();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.code] = false;

    const handleMouseMove = (e: MouseEvent) => {
       mouse.current.x = e.clientX;
       mouse.current.y = e.clientY;
    };
    const handleMouseDown = (e: MouseEvent) => {
       if (e.button === 0) mouse.current.down = true;
       if (e.button === 2) {
           mouse.current.rightDown = true;
           handleMagic();
       }
    };
    const handleMouseUp = (e: MouseEvent) => {
        if (e.button === 0) mouse.current.down = false;
        if (e.button === 2) mouse.current.rightDown = false;
    };
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initRain();
    };
    window.addEventListener('resize', resize);
    resize();

    const cleanupInterval = setInterval(() => {
        cleanupChunks();
    }, 5000);

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      clearInterval(cleanupInterval);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [showChat, showShop]); 

  useEffect(() => {
    if (showChat && chatInputRef.current) {
        chatInputRef.current.focus();
    }
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [showChat, chatHistory]);

  // --- Helpers ---

  const initRain = () => {
      const count = 120;
      rainRef.current = [];
      for(let i=0; i<count; i++) {
          rainRef.current.push({
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              speed: 15 + Math.random() * 5,
              length: 10 + Math.random() * 10
          });
      }
  };

  const pseudoRandom = (x: number, y: number) => {
    const v = Math.sin(x * 12.9898 + y * 78.233 + worldSeedRef.current) * 43758.5453;
    return v - Math.floor(v);
  };

  // --- Chunk Generation ---

  const getChunkKey = (cx: number, cy: number) => `${cx},${cy}`;

  const cleanupChunks = () => {
      const pCx = Math.floor(playerRef.current.x / CHUNK_PIXEL_SIZE);
      const pCy = Math.floor(playerRef.current.y / CHUNK_PIXEL_SIZE);
      const keepDist = 3; 

      for (const key of chunksRef.current.keys()) {
          const [cx, cy] = key.split(',').map(Number);
          if (Math.abs(cx - pCx) > keepDist || Math.abs(cy - pCy) > keepDist) {
              chunksRef.current.delete(key);
          }
      }
      
      // Cleanup far NPCs
      npcsRef.current = npcsRef.current.filter(n => {
         // Keep safe zone NPC
         if (n.id === 'guide_old_knight') return true;
         const dist = Math.sqrt((playerRef.current.x - n.x)**2 + (playerRef.current.y - n.y)**2);
         return dist < 2000;
      });
  };

  const getBiomeAt = (worldX: number, worldY: number): TileData['biome'] => {
     // Use lower frequency noise for large continents
     const nx = worldX * BIOME_SCALE * 0.01;
     const ny = worldY * BIOME_SCALE * 0.01;
     const val = Math.sin(nx + worldSeedRef.current) + Math.cos(ny + worldSeedRef.current); // Approx range -2 to 2
     
     if (val < -0.8) return 'corruption';
     if (val > 0.8) return 'desert';
     return 'grass';
  };

  const generateChunk = (cx: number, cy: number): Chunk => {
      const tiles: TileData[][] = [];
      const offCanvas = document.createElement('canvas');
      offCanvas.width = CHUNK_PIXEL_SIZE;
      offCanvas.height = CHUNK_PIXEL_SIZE;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) throw new Error("Could not create offscreen context");

      // Check for Outpost Generation
      const chunkRand = pseudoRandom(cx * 999, cy * 999);
      const isOutpost = (chunkRand < OUTPOST_CHANCE) && !(cx === 0 && cy === 0);
      
      if (isOutpost) {
          // Spawn Merchant
          const centerX = cx * CHUNK_PIXEL_SIZE + CHUNK_PIXEL_SIZE / 2;
          const centerY = cy * CHUNK_PIXEL_SIZE + CHUNK_PIXEL_SIZE / 2;
          npcsRef.current.push({
             id: `merchant_${cx}_${cy}`,
             x: centerX,
             y: centerY,
             width: 32, height: 32,
             name: "Wandering Merchant",
             type: 'merchant',
             interactionRange: 120
          });
      }

      for (let x = 0; x < CHUNK_SIZE_TILES; x++) {
          tiles[x] = [];
          for (let y = 0; y < CHUNK_SIZE_TILES; y++) {
              const worldX = cx * CHUNK_PIXEL_SIZE + x * TILE_SIZE;
              const worldY = cy * CHUNK_PIXEL_SIZE + y * TILE_SIZE;
              const safe = isPositionSafe(worldX + TILE_SIZE/2, worldY + TILE_SIZE/2) || isOutpost;
              
              let biome = getBiomeAt(worldX, worldY);
              if (isOutpost) biome = 'outpost';

              let decoration: TileData['decoration'] = 'none';
              const rand = pseudoRandom(worldX, worldY);
              const scale = 0.8 + pseudoRandom(worldX*5, worldY*5) * 0.7; 

              if (biome === 'outpost') {
                 if (x === 0 || x === CHUNK_SIZE_TILES -1 || y === 0 || y === CHUNK_SIZE_TILES -1) {
                     decoration = 'fence';
                 }
              } else if (!safe && rand < OBSTACLE_DENSITY) {
                  const typeRand = pseudoRandom(worldX + 1, worldY + 1);
                  if (biome === 'desert') {
                      if (typeRand > 0.5) decoration = 'cactus';
                      else decoration = 'rock';
                  } else if (biome === 'corruption') {
                      if (typeRand > 0.6) decoration = 'spikes';
                      else decoration = 'rock';
                  } else {
                      // Grass
                      if (typeRand > 0.6) decoration = 'tree';
                      else if (typeRand > 0.3) decoration = 'rock';
                      else decoration = 'crate';
                  }
              } else if (rand > 0.85) {
                  decoration = 'grass';
              } else if (rand > 0.98) {
                  decoration = 'flower';
              }

              tiles[x][y] = {
                  type: 'ground',
                  decoration,
                  biome,
                  variant: pseudoRandom(worldX * 2, worldY * 2),
                  scale
              };
          }
      }

      // Draw Ground
      for (let x = 0; x < CHUNK_SIZE_TILES; x++) {
          for (let y = 0; y < CHUNK_SIZE_TILES; y++) {
              const tile = tiles[x][y];
              const drawX = x * TILE_SIZE;
              const drawY = y * TILE_SIZE;

              let baseColor = COLORS.grass_base;
              let accentColor = COLORS.grass_accent;

              if (tile.biome === 'desert') {
                  baseColor = COLORS.desert_base;
                  accentColor = COLORS.desert_accent;
              } else if (tile.biome === 'corruption') {
                  baseColor = COLORS.corruption_base;
                  accentColor = COLORS.corruption_accent;
              } else if (tile.biome === 'outpost') {
                  baseColor = COLORS.outpost_floor;
                  accentColor = COLORS.outpost_floor_detail;
              }

              ctx.fillStyle = tile.variant > 0.5 ? baseColor : accentColor;
              ctx.fillRect(drawX, drawY, TILE_SIZE + 1, TILE_SIZE + 1);
              
              if (tile.biome === 'outpost') {
                 ctx.fillStyle = 'rgba(0,0,0,0.2)';
                 ctx.fillRect(drawX, drawY, TILE_SIZE, 2);
                 ctx.fillRect(drawX, drawY + TILE_SIZE/2, TILE_SIZE, 2);
              }
              else if (tile.variant > 0.8) {
                  ctx.fillStyle = 'rgba(0,0,0,0.1)';
                  ctx.fillRect(drawX + 10, drawY + 10, 4, 4);
                  ctx.fillRect(drawX + 40, drawY + 30, 2, 2);
              }
          }
      }

      // Draw Decorations
      for (let y = 0; y < CHUNK_SIZE_TILES; y++) {
          for (let x = 0; x < CHUNK_SIZE_TILES; x++) {
              const tile = tiles[x][y];
              const drawX = x * TILE_SIZE;
              const drawY = y * TILE_SIZE;

              ctx.save();
              const centerX = drawX + TILE_SIZE/2;
              const bottomY = drawY + TILE_SIZE;
              ctx.translate(centerX, bottomY);
              ctx.scale(tile.scale, tile.scale);
              ctx.translate(-centerX, -bottomY);

              if (tile.decoration === 'grass') drawGrass(ctx, drawX, drawY, tile.biome);
              else if (tile.decoration === 'flower') drawFlower(ctx, drawX, drawY);
              else if (tile.decoration === 'tree') drawDetailedTree(ctx, drawX, drawY, tile.biome);
              else if (tile.decoration === 'cactus') drawCactus(ctx, drawX, drawY);
              else if (tile.decoration === 'spikes') drawSpikes(ctx, drawX, drawY);
              else if (tile.decoration === 'rock') drawDetailedRock(ctx, drawX, drawY, tile.variant);
              else if (tile.decoration === 'crate') drawCrate(ctx, drawX, drawY);
              else if (tile.decoration === 'fence') drawFence(ctx, drawX, drawY);

              ctx.restore();
          }
      }

      return { x: cx, y: cy, canvas: offCanvas, tiles, hasOutpost: isOutpost };
  };

  const getChunk = (cx: number, cy: number): Chunk => {
      const key = getChunkKey(cx, cy);
      if (!chunksRef.current.has(key)) {
          chunksRef.current.set(key, generateChunk(cx, cy));
      }
      return chunksRef.current.get(key)!;
  };

  // --- Visual Generators ---

  const drawFence = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number) => {
      const cx = x + TILE_SIZE/2;
      const cy = y + TILE_SIZE/2;
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(cx - 5, cy - 20, 10, 40); // Post
      ctx.fillRect(cx - 32, cy - 10, 64, 6); // Rail 1
      ctx.fillRect(cx - 32, cy + 5, 64, 6);  // Rail 2
  };

  const drawCactus = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number) => {
      const cx = x + TILE_SIZE/2;
      const cy = y + TILE_SIZE - 5;
      ctx.fillStyle = '#4a7c59';
      ctx.fillRect(cx - 8, cy - 60, 16, 60); // Trunk
      ctx.fillRect(cx + 8, cy - 40, 15, 8); // Arm R
      ctx.fillRect(cx + 23, cy - 55, 8, 23); // Arm R Up
      ctx.fillRect(cx - 20, cy - 30, 12, 8); // Arm L
      ctx.fillRect(cx - 20, cy - 40, 8, 18); // Arm L Up
  };

  const drawSpikes = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number) => {
      const cx = x + TILE_SIZE/2;
      const cy = y + TILE_SIZE - 5;
      ctx.fillStyle = '#3f243f';
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 5, cy - 40); ctx.lineTo(cx, cy);
      ctx.moveTo(cx, cy); ctx.lineTo(cx + 5, cy - 30); ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx - 15, cy); ctx.lineTo(cx - 10, cy - 20); ctx.lineTo(cx - 5, cy);
      ctx.fill();
  };

  const drawGrass = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, biome: string) => {
      ctx.fillStyle = biome === 'corruption' ? '#4a1d4a' : (biome === 'desert' ? '#e6c288' : '#4caf50');
      ctx.fillRect(x + 20, y + 40, 2, 6);
      ctx.fillRect(x + 23, y + 38, 2, 8);
      ctx.fillRect(x + 26, y + 42, 2, 4);
  };

  const drawCrate = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number) => {
      const cx = x + TILE_SIZE/2;
      const cy = y + TILE_SIZE/2;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(cx, cy+18, 16, 6, 0,0,Math.PI*2); ctx.fill();

      ctx.fillStyle = '#5d4037';
      ctx.fillRect(cx - 15, cy - 15, 30, 30);
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 15, cy - 15, 30, 30);
      ctx.beginPath(); ctx.moveTo(cx-15, cy-15); ctx.lineTo(cx+15, cy+15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+15, cy-15); ctx.lineTo(cx-15, cy+15); ctx.stroke();
  };

  const drawFlower = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number) => {
      const cx = x + TILE_SIZE/2;
      const cy = y + TILE_SIZE/2;
      ctx.fillStyle = '#fff';
      for(let i=0; i<5; i++) {
         const ang = (i / 5) * Math.PI * 2;
         ctx.beginPath();
         ctx.arc(cx + Math.cos(ang)*4, cy + Math.sin(ang)*4, 3, 0, Math.PI*2);
         ctx.fill();
      }
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fill();
  };

  const drawDetailedTree = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, biome: string) => {
      if (biome === 'desert') return drawCactus(ctx, x, y); 
      if (biome === 'corruption') return drawSpikes(ctx, x, y);

      const centerX = x + TILE_SIZE / 2;
      const bottomY = y + TILE_SIZE - 5;
      
      let leafColorDark = COLORS.tree_leaves_dark;
      let leafColorMid = COLORS.tree_leaves_mid;
      let leafColorLight = COLORS.tree_leaves_light;

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(centerX, bottomY, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.tree_trunk;
      ctx.fillRect(centerX - 6, bottomY - 25, 12, 25);
      const drawLeafCluster = (lx: number, ly: number, size: number, color: string) => {
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(lx, ly, size, 0, Math.PI * 2); ctx.fill();
      };
      
      drawLeafCluster(centerX - 15, bottomY - 30, 14, leafColorDark);
      drawLeafCluster(centerX + 15, bottomY - 30, 14, leafColorDark);
      drawLeafCluster(centerX, bottomY - 35, 16, leafColorDark);
      drawLeafCluster(centerX - 10, bottomY - 45, 12, leafColorMid);
      drawLeafCluster(centerX + 10, bottomY - 45, 12, leafColorMid);
      drawLeafCluster(centerX, bottomY - 50, 14, leafColorMid);
      drawLeafCluster(centerX, bottomY - 55, 10, leafColorLight);
  };

  const drawDetailedRock = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, x: number, y: number, variant: number) => {
      const cx = x + TILE_SIZE / 2;
      const cy = y + TILE_SIZE / 2 + 10;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(cx, cy + 10, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.rock_base;
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy + 10); ctx.lineTo(cx - 15, cy - 10); ctx.lineTo(cx, cy - 20); ctx.lineTo(cx + 15, cy - 5); ctx.lineTo(cx + 20, cy + 10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = COLORS.rock_highlight;
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy - 5); ctx.lineTo(cx - 5, cy - 15); ctx.lineTo(cx + 5, cy - 15); ctx.lineTo(cx - 5, cy + 5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = COLORS.rock_shadow;
      ctx.beginPath();
      ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx + 20, cy + 10); ctx.lineTo(cx, cy + 10);
      ctx.closePath(); ctx.fill();
  };

  const drawDetailedHouse = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 65, y - 5, 130, 20);
      ctx.fillStyle = '#5d4037'; ctx.fillRect(x - 60, y - 60, 120, 60);
      ctx.fillStyle = '#4e342e';
      for(let i=0; i<5; i++) { ctx.fillRect(x - 60, y - 50 + (i*10), 120, 2); }
      ctx.fillStyle = '#3e2723';
      ctx.beginPath(); ctx.moveTo(x - 70, y - 60); ctx.lineTo(x, y - 110); ctx.lineTo(x + 70, y - 60); ctx.fill();
      ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - 70, y - 60); ctx.lineTo(x, y - 110); ctx.lineTo(x + 70, y - 60); ctx.stroke();
      ctx.fillStyle = '#3e2723'; ctx.fillRect(x - 15, y - 40, 30, 40);
      ctx.fillStyle = '#212121'; ctx.fillRect(x - 12, y - 37, 24, 37);
      
      const drawWindow = (wx: number, wy: number) => {
          ctx.fillStyle = '#4fc3f7'; ctx.fillRect(wx, wy, 24, 24);
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(wx, wy+24); ctx.lineTo(wx+24, wy); ctx.lineTo(wx+24, wy+10); ctx.lineTo(wx+10, wy+24); ctx.fill();
          ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2; ctx.strokeRect(wx, wy, 24, 24);
      };
      drawWindow(x - 50, y - 45); drawWindow(x + 26, y - 45);
      ctx.fillStyle = '#6d4c41'; ctx.fillRect(x - 20, y, 40, 5); ctx.fillRect(x - 25, y + 5, 50, 5);
  };

  const drawDetailedNPC = (ctx: CanvasRenderingContext2D, npc: NPC) => {
      const { x, y, type } = npc;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(x, y, 12, 6, 0,0,Math.PI*2); ctx.fill();
      
      if (type === 'guide') {
          // Old Knight
          ctx.fillStyle = '#b91c1c'; ctx.fillRect(x - 10, y - 25, 20, 25);
          ctx.fillStyle = '#9ca3af'; ctx.fillRect(x - 8, y - 28, 16, 18);
          ctx.fillStyle = '#4b5563'; ctx.fillRect(x - 7, y - 38, 14, 12);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 4, y - 34, 8, 2);
          ctx.fillStyle = '#78350f'; ctx.fillRect(x + 8, y - 40, 3, 40);
          ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(x + 9.5, y - 42, 4, 0, Math.PI * 2); ctx.fill();
      } else {
          // Merchant
          ctx.fillStyle = '#4b5563'; ctx.fillRect(x - 10, y - 25, 20, 25); // Grey Robe
          ctx.fillStyle = '#fbbf24'; ctx.fillRect(x - 8, y - 25, 16, 25); // Gold inner
          ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(x, y - 25, 12, 0, Math.PI*2); ctx.fill(); // Hood
          ctx.fillStyle = '#000'; ctx.fillRect(x - 4, y - 25, 8, 4); // Face shadow
          // Backpack
          ctx.fillStyle = '#5d4037'; ctx.fillRect(x - 14, y - 20, 4, 15);
          ctx.fillStyle = '#8d6e63'; ctx.fillRect(x - 16, y - 30, 6, 10);
      }
  };

  // --- Logic Helpers ---

  const checkNPCInteraction = async () => {
      const p = playerRef.current;
      
      const nearbyNPC = npcsRef.current.find(n => {
          const dist = Math.sqrt((p.x - n.x)**2 + (p.y - n.y)**2);
          return dist < n.interactionRange;
      });

      if (nearbyNPC) {
          setActiveNPC(nearbyNPC);
          keys.current['KeyW'] = false; keys.current['KeyA'] = false; keys.current['KeyS'] = false; keys.current['KeyD'] = false;

          if (nearbyNPC.type === 'merchant') {
              setShowShop(true);
              setNpcMessage("Welcome, traveler! Buying or... buying?");
              // Async fetch persona line
              const pitch = await generateNPCResponse([], "Hello merchant, what do you have?", 'merchant');
              setNpcMessage(pitch);
          } else {
              setShowChat(true);
              setChatHistory([{ sender: 'npc', text: "Welcome to the Safe Zone. Rest here, for the night is dark." }]);
          }
      }
  };

  const buyItem = (item: 'potion' | 'maxHp' | 'maxMana' | 'speed' | 'drone') => {
      const p = playerRef.current;
      const price = SHOP_PRICES[item];
      
      if (p.gold >= price) {
          if (item === 'drone' && p.hasDrone) {
               spawnFloatingText(p.x, p.y - 40, "ALREADY OWNED", "#ff0000");
               return;
          }
          p.gold -= price;
          setGold(p.gold);
          triggerShake(2);
          
          if (item === 'potion') {
              p.health = Math.min(p.maxHealth, p.health + 50);
              spawnFloatingText(p.x, p.y - 40, "+50 HP", COLORS.heal);
          } else if (item === 'maxHp') {
              p.maxHealth += 50;
              p.health += 50;
              spawnFloatingText(p.x, p.y - 40, "MAX HP UP!", COLORS.heal);
          } else if (item === 'maxMana') {
              p.maxMana += 50;
              p.mana += 50;
              spawnFloatingText(p.x, p.y - 40, "MAX MANA UP!", COLORS.mana);
          } else if (item === 'speed') {
              p.xp += 100;
              spawnFloatingText(p.x, p.y - 40, "+100 XP", COLORS.xp);
          } else if (item === 'drone') {
              p.hasDrone = true;
              spawnFloatingText(p.x, p.y - 40, "DRONE ACQUIRED!", "#a855f7");
          }
          
          setHp(p.health);
          setMaxHp(p.maxHealth);
          setMaxMana(p.maxMana);
          setXp(p.xp);
          spawnParticles(p.x, p.y, COLORS.gold, 15);
      } else {
          spawnFloatingText(p.x, p.y - 40, "NOT ENOUGH GOLD", "#ff0000");
      }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || isTyping) return;
      const userText = chatInput;
      setChatHistory(prev => [...prev, { sender: 'player', text: userText }]);
      setChatInput("");
      setIsTyping(true);
      const historyForAI = chatHistory.map(m => ({ role: m.sender, parts: [{ text: m.text }] }));
      const response = await generateNPCResponse(historyForAI, userText, 'guide');
      setChatHistory(prev => [...prev, { sender: 'npc', text: response }]);
      setIsTyping(false);
  };

  const spawnFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
        id: Math.random().toString(),
        x, y, text, color, life: 60, vy: -2
    });
  };

  const triggerShake = (amount: number) => {
      shakeRef.current = amount;
  };

  const triggerHitStop = (frames: number) => {
      hitStopRef.current = frames;
  };

  const spawnDrop = (x: number, y: number, type: 'xp' | 'health' | 'gold', value: number) => {
      dropsRef.current.push({
          id: Math.random().toString(),
          x, y, type, value, life: DROP_LIFE, magnetized: false
      });
  };

  const spawnDecal = (x: number, y: number) => {
      decalsRef.current.push({
          id: Math.random().toString(),
          x, y, type: 'blood', opacity: 0.8, scale: 0.5 + Math.random() * 0.5
      });
      if (decalsRef.current.length > 50) decalsRef.current.shift();
  };

  const checkLevelUp = (p: Player) => {
    if (p.xp >= p.maxXp) {
        p.xp -= p.maxXp;
        p.level++;
        p.maxXp = Math.floor(p.maxXp * 1.5);
        p.maxHealth += 20;
        p.maxMana += 10;
        p.health = p.maxHealth;
        p.mana = p.maxMana;
        p.damage += 5;
        spawnFloatingText(p.x, p.y - 40, "LEVEL UP!", "#fbbf24");
        spawnParticles(p.x, p.y, "#fbbf24", 20);
        setLevel(p.level);
        setMaxXp(p.maxXp);
        setMaxHp(p.maxHealth);
        setMaxMana(p.maxMana);
        triggerShake(5);
    }
    setXp(Math.floor(p.xp));
    setHp(Math.ceil(p.health));
  };

  const handleDash = () => {
    const p = playerRef.current;
    if (p.level < DASH_UNLOCK_LEVEL) {
        spawnFloatingText(p.x, p.y - 50, `Lvl ${DASH_UNLOCK_LEVEL} Required`, "#ff0000");
        return;
    }

    // Cooldown reduces by 10% every 5 levels
    const cdReduction = Math.min(0.5, (p.level - 3) * 0.05);
    const actualCooldown = DASH_COOLDOWN * (1 - cdReduction);

    if (p.dashCooldown <= 0 && !p.isDashing && !p.dead) {
        p.isDashing = true;
        p.dashCooldown = actualCooldown;
        p.invulnerabilityTimer = DASH_DURATION + 5; 
        spawnParticles(p.x, p.y, "#ffffff", 10);
        triggerShake(2);
    }
  };

  const handleMagic = () => {
     const p = playerRef.current;
     if (p.level < FIREBALL_UNLOCK_LEVEL) {
         spawnFloatingText(p.x, p.y - 50, `Lvl ${FIREBALL_UNLOCK_LEVEL} Required`, "#ff0000");
         return;
     }

     // Mana cost reduces slightly with level
     const cost = Math.max(10, FIREBALL_MANA_COST - (p.level * 1));

     if (p.dead || p.mana < cost) return;
     
     p.mana -= cost;
     setMana(Math.floor(p.mana));
     
     const dx = (mouse.current.x - window.innerWidth/2);
     const dy = (mouse.current.y - window.innerHeight/2);
     const angle = Math.atan2(dy, dx);
     
     projectilesRef.current.push({
         id: Math.random().toString(),
         owner: 'player',
         x: p.x, y: p.y - 10,
         vx: Math.cos(angle) * FIREBALL_SPEED,
         vy: Math.sin(angle) * FIREBALL_SPEED,
         life: 60,
         damage: FIREBALL_DAMAGE + (p.level * 5),
         radius: 12,
         color: '#ef4444',
         trail: true
     });
     triggerShake(3);
  };

  const handleAttack = () => {
    const player = playerRef.current;
    if (player.attackCooldown > 0 || player.dead || player.isDashing) return;

    player.state = 'attack';
    player.frameIndex = 0;
    player.attackCooldown = ATTACK_COOLDOWN;

    const attackX = player.x + (player.facing === 1 ? 0 : -ATTACK_RANGE);
    const attackY = player.y - 30;
    const attackW = ATTACK_RANGE;
    const attackH = player.height * PLAYER_SCALE + 40;

    let hitCount = 0;

    enemiesRef.current.forEach(enemy => {
      const overlap = (
        attackX < enemy.x + enemy.width * (enemy.isBoss ? 3 : PLAYER_SCALE) &&
        attackX + attackW > enemy.x &&
        attackY < enemy.y + enemy.height * (enemy.isBoss ? 3 : PLAYER_SCALE) &&
        attackY + attackH > enemy.y
      );

      if (overlap) {
        hitCount++;
        enemy.health -= player.damage;
        enemy.flashTimer = 10;
        const pushAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
        const pushForce = enemy.isBoss ? 2 : 10;
        enemy.vx = Math.cos(pushAngle) * pushForce;
        enemy.vy = Math.sin(pushAngle) * pushForce;
        spawnFloatingText(enemy.x, enemy.y - (enemy.isBoss ? 60 : 20), player.damage.toString(), COLORS.text_damage);
        spawnParticles(enemy.x, enemy.y, COLORS.damage, 5);
        triggerShake(3);
        triggerHitStop(3);
        if (enemy.health <= 0) handleEnemyDeath(enemy);
      }
    });

    checkCrateCollision(attackX, attackY, attackW, attackH);
  };

  const checkCrateCollision = (ax: number, ay: number, aw: number, ah: number) => {
      const cx = Math.floor(playerRef.current.x / CHUNK_PIXEL_SIZE);
      const cy = Math.floor(playerRef.current.y / CHUNK_PIXEL_SIZE);
      const chunk = getChunk(cx, cy);
      for(let x=0; x<CHUNK_SIZE_TILES; x++) {
          for(let y=0; y<CHUNK_SIZE_TILES; y++) {
             const tile = chunk.tiles[x][y];
             if (tile.decoration === 'crate') {
                 const worldX = cx * CHUNK_PIXEL_SIZE + x * TILE_SIZE;
                 const worldY = cy * CHUNK_PIXEL_SIZE + y * TILE_SIZE;
                 if (ax < worldX + TILE_SIZE && ax + aw > worldX && ay < worldY + TILE_SIZE && ay + ah > worldY) {
                     tile.decoration = 'none'; 
                     spawnParticles(worldX + TILE_SIZE/2, worldY + TILE_SIZE/2, '#5d4037', 10);
                     if (Math.random() > 0.5) spawnDrop(worldX + TILE_SIZE/2, worldY + TILE_SIZE/2, 'xp', XP_ORB_VALUE);
                     else spawnDrop(worldX + TILE_SIZE/2, worldY + TILE_SIZE/2, 'health', HEALTH_DROP_VALUE/2);
                 }
             }
          }
      }
  };

  const handleEnemyDeath = (enemy: Enemy) => {
    setScore(s => s + (enemy.isBoss ? 500 : 10) * playerRef.current.level);
    spawnParticles(enemy.x, enemy.y, '#ffffff', enemy.isBoss ? 50 : 10);
    spawnDecal(enemy.x, enemy.y);
    spawnDrop(enemy.x, enemy.y, 'xp', enemy.isBoss ? XP_ORB_VALUE * 20 : XP_ORB_VALUE);
    
    if (Math.random() < GOLD_DROP_CHANCE || enemy.isBoss) {
        const val = Math.floor(GOLD_DROP_VALUE_MIN + Math.random() * (GOLD_DROP_VALUE_MAX - GOLD_DROP_VALUE_MIN)) * (enemy.isBoss ? 5 : 1);
        spawnDrop(enemy.x, enemy.y, 'gold', val);
    }
    
    if (Math.random() < HEALTH_DROP_CHANCE || enemy.isBoss) {
        spawnDrop(enemy.x + 10, enemy.y, 'health', HEALTH_DROP_VALUE);
    }
    if (enemy.isBoss) triggerShake(20);
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random().toString(),
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 30 + Math.random() * 20,
        color, size: 2 + Math.random() * 4
      });
    }
  };

  const isPositionSafe = (x: number, y: number) => {
      const dist = Math.sqrt(x*x + y*y);
      return dist < 300;
  };

  const checkCollision = (x: number, y: number) => {
      if (isPositionSafe(x, y)) return false;
      const cx = Math.floor(x / CHUNK_PIXEL_SIZE);
      const cy = Math.floor(y / CHUNK_PIXEL_SIZE);
      const chunk = getChunk(cx, cy);
      if (chunk.hasOutpost) return false;

      let localX = Math.floor((x - cx * CHUNK_PIXEL_SIZE) / TILE_SIZE);
      let localY = Math.floor((y - cy * CHUNK_PIXEL_SIZE) / TILE_SIZE);
      if (localX < 0) localX = 0; if (localX >= CHUNK_SIZE_TILES) localX = CHUNK_SIZE_TILES - 1;
      if (localY < 0) localY = 0; if (localY >= CHUNK_SIZE_TILES) localY = CHUNK_SIZE_TILES - 1;
      const tile = chunk.tiles[localX][localY];
      return tile.decoration === 'tree' || tile.decoration === 'rock' || tile.decoration === 'crate' || tile.decoration === 'fence' || tile.decoration === 'cactus' || tile.decoration === 'spikes';
  };

  // --- Main Update ---
  const update = () => {
    if (showChat || showShop || gameOver) return;
    
    if (hitStopRef.current > 0) {
        hitStopRef.current--;
        return;
    }

    timeOfDayRef.current += DAY_NIGHT_CYCLE_SPEED;
    if (timeOfDayRef.current > 1) timeOfDayRef.current = 0;

    if (shakeRef.current > 0) shakeRef.current *= 0.9;
    if (shakeRef.current < 0.5) shakeRef.current = 0;

    const player = playerRef.current;
    
    // --- Player Logic ---
    if (!player.dead) {
      if (player.mana < player.maxMana) {
          player.mana = Math.min(player.maxMana, player.mana + MANA_REGEN);
          setMana(Math.floor(player.mana));
      }

      if (player.invulnerabilityTimer > 0) player.invulnerabilityTimer--;
      if (player.dashCooldown > 0) player.dashCooldown--;
      setDashCooldownVisual(player.dashCooldown);

      let dx = 0, dy = 0;
      if (keys.current['KeyW'] || keys.current['ArrowUp']) dy = -1;
      if (keys.current['KeyS'] || keys.current['ArrowDown']) dy = 1;
      if (keys.current['KeyA'] || keys.current['ArrowLeft']) dx = -1;
      if (keys.current['KeyD'] || keys.current['ArrowRight']) dx = 1;

      if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len; dy /= len;
      }

      let currentSpeed = PLAYER_SPEED;
      const biome = getBiomeAt(player.x, player.y);
      if (biome === 'desert') currentSpeed *= 0.9; // Sand slows down slightly

      if (player.isDashing) {
          currentSpeed = DASH_SPEED;
          if (player.dashCooldown < DASH_COOLDOWN - DASH_DURATION) {
              player.isDashing = false;
          }
          if (Math.floor(Date.now() / 50) % 2 === 0) {
              let sprites = assets.walk;
              const img = sprites[player.frameIndex % sprites.length];
              if (img) {
                  ghostTrailsRef.current.push({
                      x: player.x, y: player.y, facing: player.facing, life: 10, sprite: img
                  });
              }
          }
      }

      player.vx = dx * currentSpeed;
      player.vy = dy * currentSpeed;
      
      const nextX = player.x + player.vx;
      const nextY = player.y + player.vy;

      if (!checkCollision(nextX, player.y)) player.x = nextX;
      if (!checkCollision(player.x, nextY)) player.y = nextY;

      if (dx < 0) player.facing = -1;
      if (dx > 0) player.facing = 1;

      if (player.attackCooldown > 0) {
        player.attackCooldown--;
        if (player.attackCooldown < ATTACK_COOLDOWN - 12 && player.state === 'attack' && player.frameIndex === assets.attack.length - 1) {
            player.state = 'idle';
        }
      } else {
        player.state = (Math.abs(dx) > 0 || Math.abs(dy) > 0) ? 'walk' : 'idle';
      }

      // Drone Logic
      if (player.hasDrone) {
          const targetX = player.x + (player.facing === 1 ? -30 : 30);
          const targetY = player.y - 40;
          player.droneX += (targetX - player.droneX) * 0.1;
          player.droneY += (targetY - player.droneY) * 0.1;
          
          if (player.droneCooldown > 0) player.droneCooldown--;
          else {
              // Find nearest enemy
              let nearest = null;
              let minD = DRONE_RANGE;
              enemiesRef.current.forEach(e => {
                  const d = Math.sqrt((e.x - player.x)**2 + (e.y - player.y)**2);
                  if (d < minD) { minD = d; nearest = e; }
              });

              if (nearest) {
                  player.droneCooldown = DRONE_COOLDOWN;
                  const angle = Math.atan2(nearest.y - player.droneY, nearest.x - player.droneX);
                  projectilesRef.current.push({
                      id: Math.random().toString(),
                      owner: 'drone',
                      x: player.droneX, y: player.droneY,
                      vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
                      life: 50, damage: DRONE_DAMAGE, radius: 4, color: '#a855f7'
                  });
              }
          }
      }

    } else if (player.frameIndex >= assets.death.length - 1) {
        setGameOver(true);
    }

    // --- Animation ---
    player.frameTimer++;
    if (player.frameTimer > 8) {
      player.frameTimer = 0;
      let currentSet = assets.walk;
      if (player.state === 'attack') currentSet = assets.attack;
      if (player.state === 'dead') currentSet = assets.death;
      
      if (player.state === 'idle') {
          player.frameIndex = 0;
      } else {
          player.frameIndex++;
          if (player.frameIndex >= currentSet.length) {
            if (player.state === 'dead') player.frameIndex = currentSet.length - 1;
            else if (player.state === 'attack') { player.state = 'idle'; player.frameIndex = 0; }
            else player.frameIndex = 0;
          }
      }
    }

    // --- Drops ---
    dropsRef.current.forEach(drop => {
        drop.life--;
        const dx = player.x - drop.x;
        const dy = player.y - drop.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < PICKUP_RANGE) {
            if (drop.type === 'xp') {
                player.xp += drop.value;
                checkLevelUp(player);
                spawnParticles(player.x, player.y, COLORS.xp, 2);
            } else if (drop.type === 'health') {
                player.health = Math.min(player.maxHealth, player.health + drop.value);
                setHp(Math.ceil(player.health));
                spawnFloatingText(player.x, player.y - 40, `+${drop.value}`, COLORS.heal);
                spawnParticles(player.x, player.y, COLORS.heal, 8);
            } else if (drop.type === 'gold') {
                player.gold += drop.value;
                setGold(player.gold);
                spawnFloatingText(player.x, player.y - 40, `+${drop.value} G`, COLORS.gold);
                spawnParticles(player.x, player.y, COLORS.gold, 5);
            }
            drop.life = 0; 
        } else if (dist < MAGNET_RANGE || drop.magnetized) {
            drop.magnetized = true;
            drop.x += dx * 0.15;
            drop.y += dy * 0.15;
        }
    });
    dropsRef.current = dropsRef.current.filter(d => d.life > 0);

    // --- Projectiles ---
    projectilesRef.current.forEach(proj => {
        proj.life--;
        proj.x += proj.vx;
        proj.y += proj.vy;
        
        // Trail effects
        if (proj.trail || Math.random() > 0.5) {
            particlesRef.current.push({
                id: Math.random().toString(),
                x: proj.x, y: proj.y, vx: 0, vy: 0, life: 10, color: proj.color, size: proj.radius / 2
            });
        }

        if (proj.owner === 'player' || proj.owner === 'drone') {
            enemiesRef.current.forEach(e => {
                if (e.health <= 0) return;
                const dist = Math.sqrt((proj.x - e.x)**2 + (proj.y - e.y)**2);
                if (dist < 30) {
                    e.health -= proj.damage;
                    e.flashTimer = 10;
                    proj.life = 0;
                    spawnParticles(e.x, e.y, proj.color, 10);
                    spawnFloatingText(e.x, e.y - 40, proj.damage.toString(), '#ffcc00');
                    if (e.health <= 0) handleEnemyDeath(e);
                }
            });
        } else {
            // Enemy Projectile
             const dist = Math.sqrt((proj.x - player.x)**2 + (proj.y - player.y)**2);
             if (dist < 20 && player.invulnerabilityTimer <= 0) {
                 player.health -= proj.damage;
                 player.invulnerabilityTimer = 60;
                 proj.life = 0;
                 setHp(Math.ceil(player.health));
                 spawnParticles(player.x, player.y, '#ff0000', 10);
                 spawnFloatingText(player.x, player.y - 30, `-${proj.damage}`, "#ff0000");
                 triggerShake(5);
                 if (player.health <= 0) { player.dead = true; player.state = 'dead'; player.frameIndex = 0; }
             }
        }

        if (checkCollision(proj.x, proj.y)) {
             proj.life = 0;
             spawnParticles(proj.x, proj.y, '#aaa', 5);
             if (proj.owner === 'player') checkCrateCollision(proj.x - 10, proj.y - 10, 20, 20);
        }
    });
    projectilesRef.current = projectilesRef.current.filter(p => p.life > 0);

    // --- Enemy Spawning ---
    const isNight = timeOfDayRef.current > 0.6 && timeOfDayRef.current < 0.9;
    const spawnMultiplier = isNight ? 2 : 1;
    const baseEnemies = (5 + (player.level * 2)) * spawnMultiplier; 
    const maxEnemies = 60 * spawnMultiplier;
    const desiredEnemies = Math.min(baseEnemies, maxEnemies);

    // Boss Check
    const shouldSpawnBoss = player.level % 5 === 0 && player.level > 1;
    const bossExists = enemiesRef.current.some(e => e.isBoss);

    if (shouldSpawnBoss && !bossExists) {
         const angle = Math.random() * Math.PI * 2;
         const dist = 800;
         const bx = player.x + Math.cos(angle) * dist;
         const by = player.y + Math.sin(angle) * dist;
         enemiesRef.current.push({
             id: 'boss_' + Date.now(),
             x: bx, y: by, width: 64, height: 64, vx: 0, vy: 0,
             health: player.level * 300, maxHealth: player.level * 300,
             dead: false, type: 'boss', isBoss: true,
             aggroRange: 2000, attackRange: 100, speed: 2,
             damage: 20 + player.level * 2, flashTimer: 0, animTimer: 0, attackTimer: 0
         });
         spawnFloatingText(player.x, player.y - 100, "BOSS SPAWNED!", "#ff0000");
         triggerShake(10);
    }

    let spawnAttempts = 0;
    while (enemiesRef.current.length < desiredEnemies && spawnAttempts < 5) {
        spawnAttempts++;
        const angle = Math.random() * Math.PI * 2;
        const dist = 700 + Math.random() * 400; 
        const ex = player.x + Math.cos(angle) * dist;
        const ey = player.y + Math.sin(angle) * dist;
        
        const cx = Math.floor(ex / CHUNK_PIXEL_SIZE);
        const cy = Math.floor(ey / CHUNK_PIXEL_SIZE);
        const chunk = getChunk(cx, cy);

        if (!checkCollision(ex, ey) && !chunk.hasOutpost && !isPositionSafe(ex, ey)) {
            const isElite = Math.random() < (player.level * 0.05);
            const biome = getBiomeAt(ex, ey);
            let type: Enemy['type'] = 'slime';
            
            // Biome specific spawning
            if (biome === 'desert') {
                 type = Math.random() > 0.6 ? 'archer' : 'skeleton';
            } else if (biome === 'corruption') {
                 type = Math.random() > 0.5 ? 'skeleton' : (Math.random() > 0.5 ? 'archer' : 'slime');
            } else {
                 type = Math.random() > 0.8 ? 'archer' : 'slime';
            }

            enemiesRef.current.push({
                id: Math.random().toString(),
                x: ex, y: ey, width: 24, height: 24, vx: 0, vy: 0,
                health: (50 + (player.level * 10)) * (isElite ? 2 : 1), 
                maxHealth: (50 + (player.level * 10)) * (isElite ? 2 : 1),
                dead: false,
                type: type,
                isBoss: false,
                aggroRange: isNight ? 1200 : 800, 
                attackRange: type === 'archer' ? ARCHER_RANGE : 40,
                speed: (1.2 + (player.level * 0.05)) * (Math.random() * 0.3 + 0.8) * (isNight ? 1.2 : 1), 
                damage: 5 + Math.floor(player.level * 1.5),
                flashTimer: 0,
                animTimer: Math.random() * 100,
                attackTimer: 0
            });
        }
    }

    // --- Enemy Update ---
    enemiesRef.current.forEach(enemy => {
        if (enemy.flashTimer > 0) enemy.flashTimer--;
        enemy.animTimer++;
        if (enemy.attackTimer > 0) enemy.attackTimer--;
        
        enemy.vx *= 0.85; enemy.vy *= 0.85;

        const dist = Math.sqrt((player.x - enemy.x)**2 + (player.y - enemy.y)**2);
        const isInSafeZone = isPositionSafe(enemy.x, enemy.y);
        const cx = Math.floor(enemy.x / CHUNK_PIXEL_SIZE);
        const cy = Math.floor(enemy.y / CHUNK_PIXEL_SIZE);
        const chunk = getChunk(cx, cy);
        const isInOutpost = chunk.hasOutpost;

        let moveX = 0, moveY = 0;
        const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);

        if ((isInSafeZone || isInOutpost) && !enemy.isBoss) {
            // Run away from safe zone
            const angle = Math.atan2(enemy.y, enemy.x);
            moveX = Math.cos(angle) * (enemy.speed * 1.5);
            moveY = Math.sin(angle) * (enemy.speed * 1.5);
        } else if (!player.dead && dist < enemy.aggroRange && dist > (enemy.isBoss ? 60 : 20)) {
            // Archer Logic
            if (enemy.type === 'archer') {
                if (dist > 250) {
                     moveX = Math.cos(angleToPlayer) * enemy.speed;
                     moveY = Math.sin(angleToPlayer) * enemy.speed;
                } else if (dist < 150) {
                     moveX = -Math.cos(angleToPlayer) * enemy.speed;
                     moveY = -Math.sin(angleToPlayer) * enemy.speed;
                }
                
                if (dist < ARCHER_RANGE && enemy.attackTimer <= 0) {
                    enemy.attackTimer = ARCHER_ATTACK_COOLDOWN;
                    projectilesRef.current.push({
                        id: Math.random().toString(),
                        owner: 'enemy',
                        x: enemy.x, y: enemy.y,
                        vx: Math.cos(angleToPlayer) * ARROW_SPEED,
                        vy: Math.sin(angleToPlayer) * ARROW_SPEED,
                        life: 100, damage: enemy.damage, radius: 4, color: '#fef3c7'
                    });
                }
            } else {
                moveX = Math.cos(angleToPlayer) * enemy.speed;
                moveY = Math.sin(angleToPlayer) * enemy.speed;
            }
        }

        enemy.vx += moveX * 0.2; enemy.vy += moveY * 0.2;

        enemiesRef.current.forEach(other => {
            if (enemy === other) return;
            const d = Math.sqrt((enemy.x - other.x)**2 + (enemy.y - other.y)**2);
            const minSep = enemy.isBoss || other.isBoss ? 60 : 30;
            if (d < minSep) {
                const pushAngle = Math.atan2(enemy.y - other.y, enemy.x - other.x);
                enemy.vx += Math.cos(pushAngle) * 0.5;
                enemy.vy += Math.sin(pushAngle) * 0.5;
            }
        });

        if (!checkCollision(enemy.x + enemy.vx, enemy.y)) enemy.x += enemy.vx; else enemy.vx = 0;
        if (!checkCollision(enemy.x, enemy.y + enemy.vy)) enemy.y += enemy.vy; else enemy.vy = 0;

        // Player Hit Logic (Melee)
        if (enemy.type !== 'archer') {
             const hitDist = enemy.isBoss ? 60 : 30;
             if (dist < hitDist && player.health > 0 && (!isInSafeZone || enemy.isBoss) && player.invulnerabilityTimer <= 0) {
                 player.health -= enemy.damage;
                 player.invulnerabilityTimer = 90;
                 setHp(Math.ceil(player.health));
                 const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                 player.vx = Math.cos(angle) * (enemy.isBoss ? 30 : 15); 
                 player.vy = Math.sin(angle) * (enemy.isBoss ? 30 : 15);
                 player.x += player.vx; player.y += player.vy;
                 spawnFloatingText(player.x, player.y - 30, `-${enemy.damage}`, "#ff0000");
                 spawnParticles(player.x, player.y, '#ff0000', 5);
                 triggerShake(enemy.isBoss ? 15 : 5);
                 if (player.health <= 0) { player.dead = true; player.state = 'dead'; player.frameIndex = 0; }
             }
        }
    });

    enemiesRef.current = enemiesRef.current.filter(e => {
        const dist = Math.sqrt((player.x - e.x)**2 + (player.y - e.y)**2);
        return e.health > 0 && (dist < 1500 || e.isBoss); 
    });

    // --- Visuals Updates ---
    particlesRef.current.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    floatingTextsRef.current.forEach(t => { t.y += t.vy; t.life--; });
    floatingTextsRef.current = floatingTextsRef.current.filter(t => t.life > 0);
    ghostTrailsRef.current.forEach(t => t.life--);
    ghostTrailsRef.current = ghostTrailsRef.current.filter(t => t.life > 0);

    if (Math.random() > 0.5) { 
         rainRef.current.forEach(r => {
             r.y += r.speed;
             r.x -= 2; 
             if (r.y > window.innerHeight) {
                 r.y = -20;
                 r.x = Math.random() * window.innerWidth;
             }
         });
    }

    // --- Camera ---
    let targetCamX = player.x;
    let targetCamY = player.y;
    let targetZoom = 1;
    if (player.isDashing) targetZoom = 0.9;
    if (bossExists) targetZoom = 0.85;

    cameraRef.current.zoom += (targetZoom - cameraRef.current.zoom) * 0.05;
    cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1;
    cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.1;
  };

  const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy) => {
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.flashTimer > 0) ctx.filter = 'brightness(2) contrast(0.5) sepia(1) saturate(5) hue-rotate(180deg)';

      const scale = e.isBoss ? 3 : 1;
      ctx.scale(scale, scale);

      if (e.type === 'slime' || (e.isBoss && e.type !== 'skeleton')) {
          const scaleY = 1 + Math.sin(e.animTimer * 0.1) * 0.1;
          const scaleX = 1 - Math.sin(e.animTimer * 0.1) * 0.1;
          
          ctx.fillStyle = e.isBoss ? '#7f1d1d' : 'rgba(74, 222, 128, 0.8)'; 
          if (e.isBoss) ctx.shadowBlur = 10; ctx.shadowColor = 'red';
          ctx.beginPath();
          ctx.ellipse(0, 5, 12 * scaleX, 10 * scaleY, 0, Math.PI, 0); 
          ctx.bezierCurveTo(15 * scaleX, -15 * scaleY, -15 * scaleX, -15 * scaleY, -12 * scaleX, 5);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath(); ctx.arc(-4, -2, 2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(5, 4, 1.5, 0, Math.PI*2); ctx.fill();

          ctx.fillStyle = '#064e3b';
          ctx.beginPath(); ctx.arc(-4, 0, 2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(4, 0, 2, 0, Math.PI*2); ctx.fill();
      } else {
          // Skeleton / Archer
          const walkBob = Math.abs(Math.sin(e.animTimer * 0.15)) * 3;
          ctx.translate(0, -walkBob);
          
          ctx.fillStyle = e.isBoss ? '#9ca3af' : '#e2e8f0'; 
          ctx.fillRect(-6, -20, 12, 10); // Head
          ctx.fillRect(-8, -18, 2, 6);
          ctx.fillRect(6, -18, 2, 6);
          ctx.fillRect(-5, -8, 10, 8); // Body
          ctx.fillStyle = '#1e293b'; // Ribs
          ctx.fillRect(-3, -7, 6, 1);
          ctx.fillRect(-3, -5, 6, 1);
          ctx.fillRect(-3, -3, 6, 1);
          ctx.fillStyle = '#ff0000'; // Eyes
          ctx.fillRect(-3, -17, 2, 2);
          ctx.fillRect(1, -17, 2, 2);
          ctx.fillStyle = '#94a3b8'; // Arms
          ctx.fillRect(8, -5, 2, 15);
          ctx.fillRect(6, 0, 6, 2);

          if (e.type === 'archer') {
              // Draw Bow
              ctx.strokeStyle = '#78350f';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(12, 0, 8, -Math.PI/2, Math.PI/2);
              ctx.stroke();
              ctx.strokeStyle = '#fff'; // String
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(12, -8); ctx.lineTo(12, 8);
              ctx.stroke();
          }
      }
      ctx.restore();

      const barY = e.isBoss ? e.y - 80 : e.y - 25;
      const barW = e.isBoss ? 100 : 24;
      const barH = e.isBoss ? 8 : 4;
      
      ctx.fillStyle = '#444';
      ctx.fillRect(e.x - barW/2, barY, barW, barH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(e.x - barW/2, barY, barW * (e.health / e.maxHealth), barH);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); 
    if (!ctx) return;

    // Clear with bg color
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const cam = cameraRef.current;
    const shakeX = (Math.random() - 0.5) * shakeRef.current;
    const shakeY = (Math.random() - 0.5) * shakeRef.current;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x + shakeX, -cam.y + shakeY);
    ctx.imageSmoothingEnabled = false;

    // --- Render Chunks ---
    const viewportWidth = canvas.width / cam.zoom;
    const viewportHeight = canvas.height / cam.zoom;
    const startChunkX = Math.floor((cam.x - viewportWidth / 2) / CHUNK_PIXEL_SIZE);
    const endChunkX = Math.floor((cam.x + viewportWidth / 2) / CHUNK_PIXEL_SIZE) + 1;
    const startChunkY = Math.floor((cam.y - viewportHeight / 2) / CHUNK_PIXEL_SIZE);
    const endChunkY = Math.floor((cam.y + viewportHeight / 2) / CHUNK_PIXEL_SIZE) + 1;

    for (let x = startChunkX; x <= endChunkX; x++) {
        for (let y = startChunkY; y <= endChunkY; y++) {
            const chunk = getChunk(x, y);
            ctx.drawImage(chunk.canvas, x * CHUNK_PIXEL_SIZE, y * CHUNK_PIXEL_SIZE);
        }
    }
    
    // --- Decals ---
    decalsRef.current.forEach(d => {
        ctx.save();
        ctx.globalAlpha = d.opacity;
        ctx.translate(d.x, d.y);
        ctx.scale(d.scale, d.scale);
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI*2);
        ctx.arc(5, 5, 6, 0, Math.PI*2);
        ctx.arc(-5, 2, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    });
    ctx.globalAlpha = 1;

    // Safe zone house
    drawDetailedHouse(ctx, 0, -50);

    // NPCs
    npcsRef.current.forEach(npc => {
        drawDetailedNPC(ctx, npc);
        const distToNPC = Math.sqrt((playerRef.current.x - npc.x)**2 + (playerRef.current.y - npc.y)**2);
        if (distToNPC < npc.interactionRange) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText("PRESS 'E'", npc.x, npc.y - 50);
        }
    });

    // Ghost Trails
    ghostTrailsRef.current.forEach(trail => {
        ctx.save();
        ctx.globalAlpha = trail.life / 10;
        ctx.translate(trail.x, trail.y);
        let drawScale = PLAYER_SCALE;
        if ((trail.sprite.height * drawScale) > 80) drawScale = 80 / trail.sprite.height;
        ctx.scale(trail.facing * drawScale, drawScale);
        ctx.drawImage(trail.sprite, -trail.sprite.width / 2, -trail.sprite.height / 2);
        ctx.restore();
    });
    ctx.globalAlpha = 1;

    const renderList: any[] = [
        ...dropsRef.current.map(d => ({ type: 'drop', data: d, y: d.y })),
        ...enemiesRef.current.map(e => ({ type: 'enemy', data: e, y: e.y })),
        ...projectilesRef.current.map(p => ({ type: 'projectile', data: p, y: p.y })),
        { type: 'player', data: playerRef.current, y: playerRef.current.y }
    ];

    renderList.sort((a, b) => a.y - b.y);

    renderList.forEach(item => {
        if (item.type === 'drop') {
            const d = item.data as Drop;
            const floatY = Math.sin(Date.now() / 200) * 3;
            if (d.type === 'xp') {
                ctx.fillStyle = COLORS.xp;
                ctx.beginPath(); ctx.arc(d.x, d.y + floatY - 5, 4, 0, Math.PI * 2); ctx.fill();
            } else if (d.type === 'gold') {
                ctx.fillStyle = COLORS.gold;
                ctx.beginPath(); ctx.arc(d.x, d.y + floatY - 5, 3, 0, Math.PI*2); ctx.fill();
            } else {
                 ctx.fillStyle = COLORS.heal;
                 ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♥', d.x, d.y + floatY);
            }
        }
        else if (item.type === 'player') {
            const p = item.data as Player;
            if (p.invulnerabilityTimer > 0 && Math.floor(Date.now() / 50) % 2 === 0) return;
            
            // Draw Drone
            if (p.hasDrone) {
                const dy = Math.sin(Date.now() / 200) * 5;
                ctx.fillStyle = '#a855f7';
                ctx.beginPath(); ctx.arc(p.droneX, p.droneY + dy, 6, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(p.droneX, p.droneY + dy - 2, 2, 0, Math.PI*2); ctx.fill();
                // Drone shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath(); ctx.ellipse(p.droneX, p.droneY + 30, 4, 2, 0, 0, Math.PI*2); ctx.fill();
            }

            let sprites = assets.walk;
            if (p.state === 'attack') sprites = assets.attack;
            if (p.state === 'dead') sprites = assets.death;
            const img = sprites[p.frameIndex % sprites.length] || sprites[0];
            
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(p.x, p.y + p.height, 12, 6, 0, 0, Math.PI * 2); ctx.fill();

            ctx.save();
            ctx.translate(p.x, p.y);
            let drawScale = PLAYER_SCALE;
            if (img && (img.height * drawScale) > 80) drawScale = 80 / img.height;
            ctx.scale(p.facing * drawScale, drawScale);
            if (img) ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        } else if (item.type === 'enemy') {
            const e = item.data as Enemy;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(e.x, e.y + 10, e.isBoss ? 30 : 10, 5, 0, 0, Math.PI * 2); ctx.fill();
            drawEnemy(ctx, e);
        } else if (item.type === 'projectile') {
            const p = item.data as Projectile;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius/2, 0, Math.PI*2); ctx.fill();
        }
    });

    particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'center';
    floatingTextsRef.current.forEach(t => {
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
    });

    // Crosshair
    if (!gameOver) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const mx = mouse.current.x + cam.x - cx;
        const my = mouse.current.y + cam.y - cy;
        ctx.moveTo(mx - 10, my); ctx.lineTo(mx + 10, my);
        ctx.moveTo(mx, my - 10); ctx.lineTo(mx, my + 10);
        ctx.stroke();
    }

    ctx.restore(); // Return to screen space

    // --- SCREEN SPACE EFFECTS (UI LAYER) ---

    // --- DAY/NIGHT VIGNETTE ---
    // Drawn in screen space so it perfectly follows the camera
    const darkness = Math.sin(timeOfDayRef.current * Math.PI); // 0 to 1
    const vignetteStrength = 0.3 + (darkness * 0.5); // Min 0.3, Max 0.8
    const color = `rgba(0, 0, 20, ${vignetteStrength})`;
    
    // Gradient relative to screen center
    const gradient = ctx.createRadialGradient(cx, cy, canvas.height * 0.3, cx, cy, canvas.height * 0.9);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, color);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ambient Night Tint
    if (darkness > 0.5) {
        ctx.fillStyle = `rgba(10, 20, 50, ${(darkness - 0.5) * 0.3})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // --- WEATHER (RAIN) ---
    // Only rain if darkness is high OR random storm, AND not in desert
    const playerBiome = getBiomeAt(playerRef.current.x, playerRef.current.y);
    const shouldRain = playerBiome !== 'desert' && (darkness > 0.6 || Math.sin(worldSeedRef.current + timeOfDayRef.current * 20) > 0.8);

    if (shouldRain) {
        ctx.save();
        ctx.strokeStyle = 'rgba(170, 200, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        rainRef.current.forEach(r => {
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x - 2, r.y + r.length);
        });
        ctx.stroke();
        ctx.restore();
    }
  };

  const loop = () => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(loop);
  };

  return (
    <>
      <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none select-none">
         <div className="flex items-center gap-2">
            <div className="w-56 h-6 bg-gray-900 border-2 border-gray-600 rounded relative shadow-lg">
               <div className="h-full bg-red-600 transition-all duration-200" style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }} />
               <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold drop-shadow-md">HP {hp}/{maxHp}</span>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-56 h-4 bg-gray-900 border-2 border-gray-600 rounded relative shadow-lg">
               <div className="h-full bg-blue-600 transition-all duration-200" style={{ width: `${Math.max(0, (mana / maxMana) * 100)}%` }} />
               <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold drop-shadow-md">MANA {Math.floor(mana)}/{maxMana}</span>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-56 h-3 bg-gray-900 border border-gray-600 rounded relative">
               <div className="h-full bg-yellow-500 transition-all duration-200" style={{ width: `${Math.max(0, (xp / maxXp) * 100)}%` }} />
               <span className="absolute inset-0 flex items-center justify-center text-[8px] text-black font-bold">LVL {level}</span>
            </div>
         </div>
         <div className="flex gap-4 mt-2">
             <div className="text-yellow-400 text-sm drop-shadow-md font-bold">SCORE: {score}</div>
             <div className="text-amber-300 text-sm drop-shadow-md font-bold">GOLD: {gold}</div>
         </div>
      </div>
      
      {/* Ability UI */}
      <div className="absolute bottom-10 right-10 flex flex-col items-center gap-4 select-none">
           <div className="flex flex-col items-center relative">
             <div className={`w-12 h-12 rounded border-2 flex items-center justify-center font-bold text-xs ${level >= FIREBALL_UNLOCK_LEVEL && mana >= Math.max(10, FIREBALL_MANA_COST - (level * 1)) ? 'border-red-500 bg-red-900/50 text-white' : 'border-gray-700 bg-gray-900 text-gray-600'}`}>
                R-CLK
             </div>
             {level < FIREBALL_UNLOCK_LEVEL && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-[8px] text-red-500 font-bold">LVL {FIREBALL_UNLOCK_LEVEL}</div>}
             <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">Fireball</span>
           </div>

           <div className="flex flex-col items-center relative">
             <div className={`w-12 h-12 rounded border-2 flex items-center justify-center font-bold text-xs relative overflow-hidden ${level >= DASH_UNLOCK_LEVEL && dashCooldownVisual <= 0 ? 'border-blue-400 bg-blue-900/50 text-white' : 'border-gray-600 bg-gray-900 text-gray-500'}`}>
                 SHIFT
                 {dashCooldownVisual > 0 && (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-lg">
                         {Math.ceil(dashCooldownVisual / 60)}
                     </div>
                 )}
             </div>
             {level < DASH_UNLOCK_LEVEL && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-[8px] text-red-500 font-bold">LVL {DASH_UNLOCK_LEVEL}</div>}
             <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">Dash</span>
           </div>
      </div>

      <div className="absolute bottom-4 left-4 text-[10px] text-gray-400 select-none">
          WASD: Move | SPACE: Melee | R-CLICK: Magic | SHIFT: Dash | E: Interact
      </div>

      {/* Chat UI */}
      {showChat && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-auto">
           <div className="w-[600px] bg-neutral-900 border-2 border-yellow-600 rounded-lg p-4 flex flex-col gap-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-neutral-700 pb-2">
                  <h3 className="text-yellow-500 font-bold">{activeNPC?.name}</h3>
                  <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <div ref={chatContainerRef} className="h-64 overflow-y-auto bg-black/40 p-4 rounded border border-neutral-800 flex flex-col gap-3 scroll-smooth">
                  {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.sender === 'player' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded text-xs leading-5 ${
                              msg.sender === 'player' ? 'bg-blue-900/50 text-blue-100 rounded-br-none' : 'bg-yellow-900/30 text-yellow-100 rounded-bl-none border border-yellow-900'
                          }`}>
                              {msg.text}
                          </div>
                      </div>
                  ))}
                  {isTyping && <div className="text-gray-500 text-xs italic">The Knight is thinking...</div>}
              </div>
              <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input ref={chatInputRef} type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-neutral-800 border border-neutral-600 rounded px-4 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                    placeholder="Ask about the dungeon..." />
                  <button type="submit" className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 rounded font-bold text-xs uppercase">Say</button>
              </form>
           </div>
        </div>
      )}

      {/* Shop UI */}
      {showShop && (
         <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-auto">
             <div className="w-[500px] bg-[#2d1b14] border-4 border-[#8d6e63] rounded-sm p-6 flex flex-col gap-6 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                  <div className="flex items-start gap-4 border-b-2 border-[#5d4037] pb-4">
                      <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center border-2 border-yellow-600">
                          <span className="text-2xl">🧙‍♂️</span>
                      </div>
                      <div>
                          <h2 className="text-yellow-500 font-bold text-lg mb-1">{activeNPC?.name}</h2>
                          <p className="text-amber-100/80 text-xs italic">"{npcMessage}"</p>
                      </div>
                      <button onClick={() => setShowShop(false)} className="ml-auto text-gray-400 hover:text-white font-bold">✕</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => buyItem('potion')} className="bg-[#3e2723] hover:bg-[#4e342e] border border-[#5d4037] p-3 rounded flex flex-col items-center gap-1 group">
                          <span className="text-red-500 text-xl">♥</span>
                          <span className="text-white text-xs font-bold">Health Potion</span>
                          <span className="text-[10px] text-gray-400">+50 HP</span>
                          <span className="text-yellow-400 text-xs font-bold mt-1 group-hover:text-yellow-300">{SHOP_PRICES.potion} G</span>
                      </button>
                      
                      <button onClick={() => buyItem('maxHp')} className="bg-[#3e2723] hover:bg-[#4e342e] border border-[#5d4037] p-3 rounded flex flex-col items-center gap-1 group">
                          <span className="text-red-600 text-xl">💪</span>
                          <span className="text-white text-xs font-bold">Vitality Up</span>
                          <span className="text-[10px] text-gray-400">+50 Max HP</span>
                          <span className="text-yellow-400 text-xs font-bold mt-1 group-hover:text-yellow-300">{SHOP_PRICES.maxHp} G</span>
                      </button>

                      <button onClick={() => buyItem('maxMana')} className="bg-[#3e2723] hover:bg-[#4e342e] border border-[#5d4037] p-3 rounded flex flex-col items-center gap-1 group">
                          <span className="text-blue-500 text-xl">🔮</span>
                          <span className="text-white text-xs font-bold">Mana Crystal</span>
                          <span className="text-[10px] text-gray-400">+50 Max Mana</span>
                          <span className="text-yellow-400 text-xs font-bold mt-1 group-hover:text-yellow-300">{SHOP_PRICES.maxMana} G</span>
                      </button>

                      <button onClick={() => buyItem('drone')} className="bg-[#3e2723] hover:bg-[#4e342e] border border-[#5d4037] p-3 rounded flex flex-col items-center gap-1 group col-span-2">
                          <span className="text-purple-400 text-xl">🛸</span>
                          <span className="text-white text-xs font-bold">Combat Drone</span>
                          <span className="text-[10px] text-gray-400">Auto-attacks enemies</span>
                          <span className="text-yellow-400 text-xs font-bold mt-1 group-hover:text-yellow-300">{SHOP_PRICES.drone} G</span>
                      </button>
                  </div>
                  
                  <div className="text-center text-amber-300 text-sm font-bold border-t-2 border-[#5d4037] pt-4">
                      Your Gold: {gold} G
                  </div>
             </div>
         </div>
      )}

      {gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 cursor-auto">
              <h2 className="text-4xl text-red-600 mb-4 animate-bounce font-bold tracking-widest">YOU DIED</h2>
              <div className="text-gray-300 mb-2 text-sm">Level Reached: <span className="text-yellow-500">{level}</span></div>
              <div className="text-gray-300 mb-8 text-sm">Final Score: <span className="text-yellow-500">{score}</span></div>
              <button onClick={onRestart} className="px-8 py-4 bg-white text-black font-bold uppercase hover:bg-gray-200 tracking-wider shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all transform hover:scale-105">Try Again</button>
          </div>
      )}
    </>
  );
};

export default GameCanvas;
