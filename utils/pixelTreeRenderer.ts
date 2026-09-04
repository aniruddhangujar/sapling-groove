import { TreeType, SaplingGoal } from '../types';
import { TREE_CONFIGS, TreePalette, COLORS } from '../constants';

export const GRID_SIZE = 64;

interface DrawContext {
  ctx: CanvasRenderingContext2D;
  pSize: number;
  frame: number;
  useAnimation: boolean;
  seed: number;
  palette: TreePalette;
  isWilting: boolean;
}

// Bounds-checked safe pixel setter
const setPixel = (dc: DrawContext, x: number, y: number, color: string) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 4 || ix >= GRID_SIZE - 4 || iy < 4 || iy >= GRID_SIZE - 4) return;
  dc.ctx.fillStyle = color;
  dc.ctx.fillRect(
    Math.floor(ix * dc.pSize), 
    Math.floor(iy * dc.pSize), 
    Math.ceil(dc.pSize), 
    Math.ceil(dc.pSize)
  );
};

// Filled rectangle helper
const drawRect = (dc: DrawContext, x: number, y: number, w: number, h: number, color: string) => {
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      setPixel(dc, x + i, y + j, color);
    }
  }
};

// Bresenham-like pixel line for branches and shoots
const drawLine = (dc: DrawContext, x0: number, y0: number, x1: number, y1: number, width: number, color: string) => {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0;
  let cy = y0;

  while (true) {
    drawRect(dc, cx - Math.floor(width / 2), cy - Math.floor(width / 2), width, width, color);
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
};

// Shaded, organic foliage mass (Light coming from top-left: shadow on bottom-right, highlight on top-left)
const drawFoliageCluster = (
  dc: DrawContext,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  shadowColor: string,
  midColor: string,
  lightColor: string,
  highlightColor: string,
  irregularity: number = 0
) => {
  const rMaxSq = rx * ry;
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      // Normalized elliptical distance
      const normDist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      if (normDist > 1.0) continue;

      // Pseudo-random edge breakup based on position
      if (normDist > 0.75 && irregularity > 0) {
        const edgeNoise = Math.sin(dx * 12.5 + dy * 7.2 + dc.seed) * irregularity;
        if (normDist + edgeNoise > 0.95) continue;
      }

      // Lighting gradient: top-left is highlight, center is mid/light, bottom-right is deep shadow
      const lightBias = -dx / rx - dy / ry; // High when top-left (dx < 0, dy < 0)

      let color = midColor;
      if (lightBias > 0.6) {
        color = highlightColor;
      } else if (lightBias > 0.05) {
        color = lightColor;
      } else if (lightBias < -0.45) {
        color = shadowColor;
      }

      setPixel(dc, cx + dx, cy + dy, color);
    }
  }
};

// Restrained, botanical grounding with soil shadow, roots, grass, and tiny moss details
const drawGround = (dc: DrawContext, baseY: number) => {
  const sway = dc.useAnimation ? Math.sin(dc.frame * 0.03) * 0.6 : 0;

  // Dark soil bed underneath
  drawRect(dc, 12, baseY + 1, GRID_SIZE - 24, 2, '#0c150c');
  drawRect(dc, 16, baseY + 2, GRID_SIZE - 32, 1, '#060a06');

  // Grass tufts and soil speckles
  for (let i = 0; i < 9; i++) {
    const gx = 14 + ((dc.seed * 7 + i * 11) % (GRID_SIZE - 28));
    const bladeHeight = (i % 3 === 0) ? 2 : 1;
    const gSway = dc.useAnimation ? Math.sin(dc.frame * 0.035 + i) * 0.5 : 0;
    
    setPixel(dc, gx, baseY, '#093618');
    setPixel(dc, Math.floor(gx + gSway), baseY - bladeHeight, '#15803d');
    if (i % 4 === 0) {
      setPixel(dc, Math.floor(gx + gSway), baseY - bladeHeight - 1, '#4ade80');
    }
  }
};

// ============================================================================
// GROWTH STAGE 1: SEED (0 - 10%)
// Real planted seed in soil mound with subtle root tip and nutrient spore
// ============================================================================
const renderSeed = (dc: DrawContext, baseY: number) => {
  const centerX = GRID_SIZE / 2;
  const pulse = dc.useAnimation ? Math.abs(Math.sin(dc.frame * 0.08)) : 0.8;

  // Small soil mound
  drawRect(dc, centerX - 6, baseY + 1, 12, 2, '#1a291a');
  drawRect(dc, centerX - 4, baseY, 8, 1, '#1f331f');
  drawRect(dc, centerX - 2, baseY - 1, 4, 1, '#2e4a2e');

  // The Seed itself (subtle organic pod)
  setPixel(dc, centerX - 1, baseY - 1, '#5d4037');
  setPixel(dc, centerX, baseY - 1, '#8d6e63');
  setPixel(dc, centerX + 1, baseY - 1, '#4e342e');
  setPixel(dc, centerX, baseY - 2, '#a1887f'); // Seed highlight

  // Downward root filament piercing soil
  setPixel(dc, centerX, baseY + 1, '#a3e635');
  setPixel(dc, centerX + 1, baseY + 2, '#4ade80');

  // Tiny ambient nutrient spore floating above seed
  if (pulse > 0.4) {
    const sporeY = baseY - 4 - Math.floor(pulse * 2);
    setPixel(dc, centerX, sporeY, '#fbbf24');
  }
};

// ============================================================================
// GROWTH STAGE 2: SPROUT (10 - 35%)
// Tender curving green stem with 2-3 distinct young leaves
// ============================================================================
const renderSprout = (dc: DrawContext, baseY: number, progress: number) => {
  const centerX = GRID_SIZE / 2;
  const h = Math.floor(5 + ((progress - 0.1) / 0.25) * 5); // 5 to 10 pixels
  const sway = dc.useAnimation ? Math.sin(dc.frame * 0.04) * 0.8 : 0;

  drawGround(dc, baseY);

  // Tiny stem base root flare
  setPixel(dc, centerX - 1, baseY, '#064e3b');
  setPixel(dc, centerX + 1, baseY, '#064e3b');

  // Tender curving stem
  let currX = centerX;
  for (let i = 0; i < h; i++) {
    const curve = Math.sin((i / h) * 1.5) * 1.5;
    currX = centerX + Math.floor(curve + sway * (i / h));
    const stemColor = i < 2 ? '#15803d' : '#22c55e';
    setPixel(dc, currX, baseY - i, stemColor);
  }

  // Left leaf (primary young leaf)
  const tipY = baseY - h;
  setPixel(dc, currX - 1, tipY + 1, '#15803d');
  setPixel(dc, currX - 2, tipY, '#22c55e');
  setPixel(dc, currX - 3, tipY - 1, '#4ade80');
  setPixel(dc, currX - 2, tipY - 1, '#86efac'); // Leaf highlight

  // Right leaf (smaller emerging leaf)
  setPixel(dc, currX + 1, tipY + 2, '#15803d');
  setPixel(dc, currX + 2, tipY + 1, '#22c55e');
  setPixel(dc, currX + 3, tipY, '#4ade80');

  // Terminal bud
  setPixel(dc, currX, tipY - 1, '#86efac');
};

// ============================================================================
// SPECIES 1: OAK (Sturdy, broad rounded canopy, gnarled branching trunk)
// ============================================================================
const renderOak = (dc: DrawContext, baseY: number, isMature: boolean) => {
  const centerX = GRID_SIZE / 2;
  const p = dc.palette;
  const sway = dc.useAnimation ? Math.sin(dc.frame * 0.025) * 0.5 : 0;

  drawGround(dc, baseY);

  // Gnarled root flare
  drawRect(dc, centerX - 5, baseY, 10, 1, p.trunkDark);
  setPixel(dc, centerX - 6, baseY, p.trunkDark);
  setPixel(dc, centerX + 5, baseY, p.trunkDark);

  // Substantial tapered trunk
  const trunkH = isMature ? 16 : 12;
  for (let y = 0; y < trunkH; y++) {
    const taper = Math.floor((y / trunkH) * 3);
    const tw = Math.max(3, (isMature ? 7 : 5) - taper);
    const tx = centerX - Math.floor(tw / 2);
    drawRect(dc, tx, baseY - y, tw, 1, p.trunkMid);
    setPixel(dc, tx, baseY - y, p.trunkDark); // Left shadow
    setPixel(dc, tx + tw - 1, baseY - y, p.trunkLight); // Right highlight
  }

  // Visible branching limbs reaching into canopy
  const forkY = baseY - trunkH + 2;
  drawLine(dc, centerX - 1, forkY, centerX - 8, forkY - 6, 2, p.trunkMid);
  drawLine(dc, centerX + 1, forkY, centerX + 8, forkY - 7, 2, p.trunkMid);
  if (isMature) {
    drawLine(dc, centerX - 6, forkY - 5, centerX - 12, forkY - 10, 1, p.trunkDark);
    drawLine(dc, centerX + 6, forkY - 6, centerX + 11, forkY - 11, 1, p.trunkDark);
  }

  // Multi-lobed, overlapping rounded canopy masses
  const cY = forkY - 6;
  const shadow = dc.isWilting ? COLORS.WILTING : p.leafDark;
  const mid = dc.isWilting ? COLORS.WILTING : p.leafMid;
  const light = dc.isWilting ? '#52525b' : p.leafLight;
  const hl = dc.isWilting ? '#71717a' : p.leafHighlight;

  if (isMature) {
    // Deep center-back foliage
    drawFoliageCluster(dc, centerX + Math.floor(sway), cY - 8, 14, 11, shadow, mid, light, hl, 1);
    // Left broad lobe
    drawFoliageCluster(dc, centerX - 11 + Math.floor(sway * 0.8), cY - 2, 10, 8, shadow, mid, light, hl, 1);
    // Right broad lobe
    drawFoliageCluster(dc, centerX + 11 + Math.floor(sway * 0.8), cY - 3, 10, 8, shadow, mid, light, hl, 1);
    // Crown lobe
    drawFoliageCluster(dc, centerX + Math.floor(sway), cY - 14, 11, 8, shadow, mid, light, hl, 1);
    // Foreground accent cluster
    drawFoliageCluster(dc, centerX - 2 + Math.floor(sway), cY - 5, 8, 6, shadow, mid, light, hl, 1);
  } else {
    // Sapling Oak
    drawFoliageCluster(dc, centerX + Math.floor(sway), cY - 4, 10, 8, shadow, mid, light, hl, 1);
    drawFoliageCluster(dc, centerX - 6 + Math.floor(sway), cY - 1, 7, 6, shadow, mid, light, hl, 1);
    drawFoliageCluster(dc, centerX + 6 + Math.floor(sway), cY - 2, 7, 6, shadow, mid, light, hl, 1);
  }
};

// ============================================================================
// SPECIES 2: BONSAI (Artfully twisted trunk, exposed root flare, flat cloud pads)
// ============================================================================
const renderBonsai = (dc: DrawContext, baseY: number, isMature: boolean) => {
  const centerX = GRID_SIZE / 2;
  const p = dc.palette;
  const sway = dc.useAnimation ? Math.sin(dc.frame * 0.02) * 0.4 : 0;

  drawGround(dc, baseY);

  // Twisted roots gripping moss mound
  setPixel(dc, centerX - 7, baseY, p.trunkDark);
  setPixel(dc, centerX - 5, baseY - 1, p.trunkMid);
  setPixel(dc, centerX + 5, baseY, p.trunkDark);
  setPixel(dc, centerX + 4, baseY - 1, p.trunkMid);

  // Sinuous, bent trunk with character knot
  const trunkPoints = [
    { x: centerX - 2, y: baseY },
    { x: centerX - 3, y: baseY - 3 },
    { x: centerX - 1, y: baseY - 6 },
    { x: centerX + 2, y: baseY - 9 },
    { x: centerX + 4, y: baseY - 12 },
    { x: centerX + 1, y: baseY - 15 }
  ];

  for (let i = 0; i < trunkPoints.length - 1; i++) {
    const p0 = trunkPoints[i];
    const p1 = trunkPoints[i + 1];
    const w = isMature ? (i === 0 ? 4 : i === 1 ? 3 : 2) : 2;
    drawLine(dc, p0.x, p0.y, p1.x, p1.y, w, p.trunkMid);
    setPixel(dc, p0.x - 1, p0.y, p.trunkDark);
    setPixel(dc, p1.x + 1, p1.y, p.trunkLight);
  }

  // Branch spurs supporting cloud pads
  drawLine(dc, centerX - 2, baseY - 5, centerX - 10, baseY - 9, 1, p.trunkMid);
  drawLine(dc, centerX + 3, baseY - 10, centerX + 11, baseY - 13, 1, p.trunkMid);
  drawLine(dc, centerX + 1, baseY - 15, centerX - 4, baseY - 18, 1, p.trunkMid);

  const shadow = dc.isWilting ? COLORS.WILTING : p.leafDark;
  const mid = dc.isWilting ? COLORS.WILTING : p.leafMid;
  const light = dc.isWilting ? '#52525b' : p.leafLight;
  const hl = dc.isWilting ? '#71717a' : p.leafHighlight;

  // Flattened horizontal cloud-like foliage pads with deliberate negative space
  // Pad 1: Low Left
  drawFoliageCluster(dc, centerX - 11 + Math.floor(sway), baseY - 10, 8, 4, shadow, mid, light, hl, 1);
  // Pad 2: Mid Right
  drawFoliageCluster(dc, centerX + 12 + Math.floor(sway), baseY - 14, 9, 5, shadow, mid, light, hl, 1);
  // Pad 3: Top Apex Cloud
  drawFoliageCluster(dc, centerX + Math.floor(sway), baseY - 20, 10, 5, shadow, mid, light, hl, 1);

  if (isMature) {
    // Secondary miniature cloud
    drawFoliageCluster(dc, centerX - 5 + Math.floor(sway), baseY - 16, 6, 3, shadow, mid, light, hl, 1);
  }
};

// ============================================================================
// SPECIES 3: PINE (Conical conifer silhouette, straight central trunk, tiered boughs)
// ============================================================================
const renderPine = (dc: DrawContext, baseY: number, isMature: boolean) => {
  const centerX = GRID_SIZE / 2;
  const p = dc.palette;
  const wind = dc.useAnimation ? Math.sin(dc.frame * 0.02) * 0.5 : 0;

  drawGround(dc, baseY);

  // Strong central trunk
  const trunkH = isMature ? 30 : 22;
  const trunkW = isMature ? 3 : 2;
  drawRect(dc, centerX - Math.floor(trunkW / 2), baseY - trunkH, trunkW, trunkH, p.trunkMid);
  drawRect(dc, centerX - Math.floor(trunkW / 2) - 1, baseY, trunkW + 2, 1, p.trunkDark); // Base roots

  const shadow = dc.isWilting ? COLORS.WILTING : p.leafDark;
  const mid = dc.isWilting ? COLORS.WILTING : p.leafMid;
  const light = dc.isWilting ? '#52525b' : p.leafLight;
  const hl = dc.isWilting ? '#71717a' : p.leafHighlight;

  // 4-5 Tiered conical horizontal needle boughs (wider at base, sharp at top)
  const tiers = isMature
    ? [
        { y: baseY - 8, rx: 14, ry: 4 },
        { y: baseY - 14, rx: 12, ry: 4 },
        { y: baseY - 20, rx: 9, ry: 4 },
        { y: baseY - 26, rx: 6, ry: 3 },
        { y: baseY - 31, rx: 3, ry: 3 }
      ]
    : [
        { y: baseY - 7, rx: 10, ry: 3 },
        { y: baseY - 13, rx: 8, ry: 3 },
        { y: baseY - 19, rx: 5, ry: 3 },
        { y: baseY - 23, rx: 3, ry: 2 }
      ];

  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const tierSway = wind * ((i + 1) / tiers.length);
    drawFoliageCluster(dc, centerX + Math.floor(tierSway), t.y, t.rx, t.ry, shadow, mid, light, hl, 0.5);

    // Sharp downward needle tips along bottom edge
    for (let x = -t.rx + 2; x <= t.rx - 2; x += 3) {
      setPixel(dc, centerX + x + Math.floor(tierSway), t.y + t.ry, shadow);
    }
  }

  // Conifer pinnacle tip
  const topY = tiers[tiers.length - 1].y - 3;
  setPixel(dc, centerX + Math.floor(wind), topY, hl);
  setPixel(dc, centerX + Math.floor(wind), topY - 1, light);
};

// ============================================================================
// SPECIES 4: CHERRY BLOSSOM (Sinuous dark branches, rose/pink blossom clouds)
// ============================================================================
const renderCherryBlossom = (dc: DrawContext, baseY: number, isMature: boolean) => {
  const centerX = GRID_SIZE / 2;
  const p = dc.palette;
  const wind = dc.useAnimation ? Math.sin(dc.frame * 0.025) * 0.7 : 0;

  drawGround(dc, baseY);

  // Graceful curving trunk
  const trunkH = isMature ? 20 : 14;
  for (let i = 0; i < trunkH; i++) {
    const drift = Math.sin((i / trunkH) * 1.8) * 3;
    const w = isMature ? Math.max(2, Math.floor(4 - (i / trunkH) * 2)) : 2;
    drawRect(dc, Math.floor(centerX + drift - w / 2), baseY - i, w, 1, p.trunkMid);
    setPixel(dc, Math.floor(centerX + drift - w / 2), baseY - i, p.trunkDark);
  }

  const forkX = Math.floor(centerX + Math.sin(1.8) * 3);
  const forkY = baseY - trunkH;

  // Dark sinuous branches peeking through blossom veil
  drawLine(dc, forkX, forkY, forkX - 10, forkY - 8, 2, p.trunkDark);
  drawLine(dc, forkX, forkY, forkX + 9, forkY - 9, 2, p.trunkDark);
  drawLine(dc, forkX, forkY, forkX - 2, forkY - 12, 1, p.trunkDark);

  const shadow = dc.isWilting ? COLORS.WILTING : p.leafDark;
  const mid = dc.isWilting ? COLORS.WILTING : p.leafMid;
  const light = dc.isWilting ? '#9d174d' : p.leafLight;
  const hl = dc.isWilting ? '#be185d' : p.leafHighlight;

  // Layered delicate sakura clouds
  drawFoliageCluster(dc, forkX - 11 + Math.floor(wind), forkY - 9, 9, 7, shadow, mid, light, hl, 1);
  drawFoliageCluster(dc, forkX + 11 + Math.floor(wind), forkY - 10, 9, 7, shadow, mid, light, hl, 1);
  drawFoliageCluster(dc, forkX - 1 + Math.floor(wind), forkY - 15, 11, 8, shadow, mid, light, hl, 1);

  if (isMature) {
    // Drooping flower sprigs
    drawFoliageCluster(dc, forkX - 6 + Math.floor(wind), forkY - 4, 6, 5, shadow, mid, light, hl, 1);
    drawFoliageCluster(dc, forkX + 6 + Math.floor(wind), forkY - 5, 6, 5, shadow, mid, light, hl, 1);

    // Falling blossom petals drifting in the wind
    if (dc.useAnimation) {
      const petal1X = (forkX + Math.floor(dc.frame * 0.3) % 28) - 10;
      const petal1Y = forkY + (Math.floor(dc.frame * 0.25) % 22);
      setPixel(dc, petal1X, petal1Y, p.leafHighlight);

      const petal2X = (forkX - 12 + Math.floor(dc.frame * 0.2) % 24);
      const petal2Y = forkY + 4 + (Math.floor(dc.frame * 0.3) % 18);
      setPixel(dc, petal2X, petal2Y, p.leafLight);
    }
  }
};

// ============================================================================
// SPECIES 5: BAMBOO (Grove of slender vertical culms with joint nodes & angled leaves)
// ============================================================================
const renderBamboo = (dc: DrawContext, baseY: number, isMature: boolean) => {
  const centerX = GRID_SIZE / 2;
  const p = dc.palette;
  const sway = dc.useAnimation ? Math.sin(dc.frame * 0.035) * 0.7 : 0;

  drawGround(dc, baseY);

  // Bamboo grove: 3-4 distinct stalks
  const stalks = isMature
    ? [
        { offsetX: -8, height: 32, nodeDist: 6 },
        { offsetX: -2, height: 38, nodeDist: 7 },
        { offsetX: 5, height: 35, nodeDist: 6 },
        { offsetX: 10, height: 26, nodeDist: 5 }
      ]
    : [
        { offsetX: -4, height: 22, nodeDist: 5 },
        { offsetX: 2, height: 26, nodeDist: 6 }
      ];

  const shadow = dc.isWilting ? COLORS.WILTING : p.leafDark;
  const mid = dc.isWilting ? COLORS.WILTING : p.leafMid;
  const light = dc.isWilting ? '#52525b' : p.leafLight;
  const hl = dc.isWilting ? '#71717a' : p.leafHighlight;

  for (let s = 0; s < stalks.length; s++) {
    const stk = stalks[s];
    const sx = centerX + stk.offsetX;
    const stkSway = sway * (stk.height / 38);

    // Culm vertical stalk
    for (let y = 0; y < stk.height; y++) {
      const cy = baseY - y;
      const cx = Math.floor(sx + stkSway * (y / stk.height));

      // Culm stem with highlight
      setPixel(dc, cx, cy, p.trunkMid);
      setPixel(dc, cx + 1, cy, p.trunkLight);

      // Horizontal joint nodes
      if (y % stk.nodeDist === 0 && y > 2) {
        setPixel(dc, cx - 1, cy, p.trunkDark);
        setPixel(dc, cx, cy, p.trunkDark);
        setPixel(dc, cx + 1, cy, p.trunkDark);
        setPixel(dc, cx + 2, cy, p.trunkDark);

        // Angled leaf sprays emerging from nodes
        if (y > stk.height * 0.35) {
          const dir = (s + y) % 2 === 0 ? 1 : -1;
          const leafLen = 4 + (y % 3);
          for (let l = 1; l <= leafLen; l++) {
            const lx = cx + dir * (l + 1);
            const ly = cy - Math.floor(l * 0.4);
            setPixel(dc, lx, ly, l > 2 ? hl : mid);
          }
        }
      }
    }

    // Apex leaf cluster
    const topX = Math.floor(sx + stkSway);
    const topY = baseY - stk.height;
    setPixel(dc, topX - 2, topY - 1, mid);
    setPixel(dc, topX - 1, topY - 2, light);
    setPixel(dc, topX, topY - 3, hl);
    setPixel(dc, topX + 1, topY - 2, light);
    setPixel(dc, topX + 2, topY - 1, mid);
  }
};

// ============================================================================
// SPECIES 6: CACTUS (Saguaro silhouette with ribbed columns, upward arms, flower)
// ============================================================================
const renderCactus = (dc: DrawContext, baseY: number, isMature: boolean) => {
  const centerX = GRID_SIZE / 2;
  const p = dc.palette;

  // Desert soil patch
  drawRect(dc, centerX - 10, baseY + 1, 20, 2, '#272013');
  drawRect(dc, centerX - 8, baseY, 16, 1, '#3d321d');
  setPixel(dc, centerX - 11, baseY + 1, '#1e180d'); // Small pebble
  setPixel(dc, centerX + 11, baseY + 1, '#1e180d');

  const mainH = isMature ? 28 : 18;
  const mainW = 6;
  const mainX = centerX - Math.floor(mainW / 2);

  // Main vertical ribbed column
  for (let y = 0; y < mainH; y++) {
    const cy = baseY - y;
    // Rounded top cap
    const w = (y >= mainH - 2) ? mainW - 2 : mainW;
    const x = (y >= mainH - 2) ? mainX + 1 : mainX;

    drawRect(dc, x, cy, w, 1, p.leafMid);
    // Vertical spine ribs
    setPixel(dc, x, cy, p.leafDark); // Left shadow
    setPixel(dc, x + 2, cy, p.leafLight); // Rib 1
    setPixel(dc, x + 4, cy, p.leafHighlight); // Rib 2
    if (w === mainW) {
      setPixel(dc, x + mainW - 1, cy, p.leafDark); // Right edge
    }
  }

  // Left arm (branching lower, curving up)
  if (isMature) {
    const leftArmY = baseY - 10;
    // Horizontal connector
    drawRect(dc, mainX - 5, leftArmY, 5, 4, p.leafMid);
    drawRect(dc, mainX - 5, leftArmY + 3, 5, 1, p.leafDark);
    // Vertical arm
    const leftArmH = 12;
    for (let y = 0; y < leftArmH; y++) {
      const cy = leftArmY - y;
      drawRect(dc, mainX - 8, cy, 4, 1, p.leafMid);
      setPixel(dc, mainX - 8, cy, p.leafDark);
      setPixel(dc, mainX - 6, cy, p.leafHighlight);
    }

    // Right arm (branching higher, curving up)
    const rightArmY = baseY - 15;
    // Horizontal connector
    drawRect(dc, mainX + mainW, rightArmY, 5, 4, p.leafMid);
    drawRect(dc, mainX + mainW, rightArmY + 3, 5, 1, p.leafDark);
    // Vertical arm
    const rightArmH = 10;
    for (let y = 0; y < rightArmH; y++) {
      const cy = rightArmY - y;
      drawRect(dc, mainX + mainW + 4, cy, 4, 1, p.leafMid);
      setPixel(dc, mainX + mainW + 4, cy, p.leafDark);
      setPixel(dc, mainX + mainW + 6, cy, p.leafHighlight);
    }
  } else {
    // Sapling Cactus has one small emerging arm bud
    drawRect(dc, mainX + mainW, baseY - 8, 3, 3, p.leafMid);
    setPixel(dc, mainX + mainW + 1, baseY - 9, p.leafLight);
  }

  // Desert flowering blossom crown at the top apex
  const topY = baseY - mainH;
  setPixel(dc, centerX - 1, topY - 1, '#f59e0b');
  setPixel(dc, centerX, topY - 2, '#fbbf24');
  setPixel(dc, centerX + 1, topY - 1, '#f59e0b');
  setPixel(dc, centerX, topY - 1, '#ef4444');
};

// ============================================================================
// SPECIES 7: MAPLE (Broad spreading branches, angular lobed canopy, amber tips)
// ============================================================================
const renderMaple = (dc: DrawContext, baseY: number, isMature: boolean) => {
  const centerX = GRID_SIZE / 2;
  const p = dc.palette;
  const wind = dc.useAnimation ? Math.sin(dc.frame * 0.025) * 0.5 : 0;

  drawGround(dc, baseY);

  // Strong spreading trunk
  const trunkH = isMature ? 16 : 11;
  for (let y = 0; y < trunkH; y++) {
    const tw = Math.max(3, (isMature ? 6 : 4) - Math.floor((y / trunkH) * 2));
    const tx = centerX - Math.floor(tw / 2);
    drawRect(dc, tx, baseY - y, tw, 1, p.trunkMid);
    setPixel(dc, tx, baseY - y, p.trunkDark);
  }

  // Spreading branches
  const forkY = baseY - trunkH + 2;
  drawLine(dc, centerX - 1, forkY, centerX - 10, forkY - 6, 2, p.trunkMid);
  drawLine(dc, centerX + 1, forkY, centerX + 10, forkY - 7, 2, p.trunkMid);
  drawLine(dc, centerX, forkY, centerX, forkY - 10, 2, p.trunkMid);

  const shadow = dc.isWilting ? COLORS.WILTING : p.leafDark;
  const mid = dc.isWilting ? COLORS.WILTING : p.leafMid;
  const light = dc.isWilting ? '#78350f' : p.leafLight;
  const hl = dc.isWilting ? '#9a3412' : p.leafHighlight;

  // Angular, lobed maple leaf foliage masses with warm amber accents
  const cY = forkY - 6;
  if (isMature) {
    drawFoliageCluster(dc, centerX + Math.floor(wind), cY - 10, 13, 9, shadow, mid, light, hl, 1);
    drawFoliageCluster(dc, centerX - 12 + Math.floor(wind * 0.8), cY - 3, 9, 7, shadow, mid, light, hl, 1);
    drawFoliageCluster(dc, centerX + 12 + Math.floor(wind * 0.8), cY - 4, 9, 7, shadow, mid, light, hl, 1);
    drawFoliageCluster(dc, centerX - 4 + Math.floor(wind), cY - 5, 8, 6, shadow, mid, light, hl, 1);

    // Subtle warm autumn red-amber tip pixels along outer edges
    setPixel(dc, centerX - 14, cY - 3, p.accent || '#dc2626');
    setPixel(dc, centerX + 14, cY - 4, p.accent || '#dc2626');
    setPixel(dc, centerX, cY - 16, p.accent || '#dc2626');
  } else {
    drawFoliageCluster(dc, centerX + Math.floor(wind), cY - 4, 9, 7, shadow, mid, light, hl, 1);
    drawFoliageCluster(dc, centerX - 7 + Math.floor(wind), cY - 1, 6, 5, shadow, mid, light, hl, 1);
    drawFoliageCluster(dc, centerX + 7 + Math.floor(wind), cY - 2, 6, 5, shadow, mid, light, hl, 1);
  }
};

// ============================================================================
// SPECIES 8: BAOBAB (Giant bottle-shaped massive trunk dominating silhouette)
// ============================================================================
const renderBaobab = (dc: DrawContext, baseY: number, isMature: boolean) => {
  const centerX = GRID_SIZE / 2;
  const p = dc.palette;
  const sway = dc.useAnimation ? Math.sin(dc.frame * 0.02) * 0.4 : 0;

  drawGround(dc, baseY);

  // Massive bottle-shaped trunk base (very wide, unmistakable silhouette)
  const baseW = isMature ? 16 : 10;
  const topW = isMature ? 10 : 6;
  const trunkH = isMature ? 24 : 16;

  for (let y = 0; y < trunkH; y++) {
    const curW = Math.floor(baseW - ((y / trunkH) * (baseW - topW)));
    const tx = centerX - Math.floor(curW / 2);
    drawRect(dc, tx, baseY - y, curW, 1, p.trunkMid);
    // Deep textured bark ridges and shadow
    setPixel(dc, tx, baseY - y, p.trunkDark);
    setPixel(dc, tx + 1, baseY - y, p.trunkDark);
    if (y % 4 === 0) setPixel(dc, tx + 3, baseY - y, p.trunkLight);
    setPixel(dc, tx + curW - 2, baseY - y, p.trunkLight);
    setPixel(dc, tx + curW - 1, baseY - y, p.trunkDark);
  }

  // Heavy, short spreading branches atop the giant trunk
  const forkY = baseY - trunkH;
  drawLine(dc, centerX - 3, forkY, centerX - 10, forkY - 6, 3, p.trunkMid);
  drawLine(dc, centerX + 3, forkY, centerX + 10, forkY - 6, 3, p.trunkMid);
  drawLine(dc, centerX, forkY, centerX, forkY - 5, 2, p.trunkMid);

  const shadow = dc.isWilting ? COLORS.WILTING : p.leafDark;
  const mid = dc.isWilting ? COLORS.WILTING : p.leafMid;
  const light = dc.isWilting ? '#52525b' : p.leafLight;
  const hl = dc.isWilting ? '#71717a' : p.leafHighlight;

  // Compact, sparse canopy crowning the giant trunk
  const cY = forkY - 6;
  drawFoliageCluster(dc, centerX + Math.floor(sway), cY - 4, 8, 5, shadow, mid, light, hl, 1);
  drawFoliageCluster(dc, centerX - 10 + Math.floor(sway), cY - 2, 6, 4, shadow, mid, light, hl, 1);
  drawFoliageCluster(dc, centerX + 10 + Math.floor(sway), cY - 2, 6, 4, shadow, mid, light, hl, 1);
};

// ============================================================================
// SPECIES 9: CEDAR (Stately, dense conical evergreen, darker blue-green needles)
// ============================================================================
const renderCedar = (dc: DrawContext, baseY: number, isMature: boolean) => {
  const centerX = GRID_SIZE / 2;
  const p = dc.palette;
  const wind = dc.useAnimation ? Math.sin(dc.frame * 0.02) * 0.4 : 0;

  drawGround(dc, baseY);

  // Strong vertical trunk
  const trunkH = isMature ? 32 : 22;
  drawRect(dc, centerX - 1, baseY - trunkH, 3, trunkH, p.trunkMid);
  drawRect(dc, centerX - 2, baseY, 5, 1, p.trunkDark);

  const shadow = dc.isWilting ? COLORS.WILTING : p.leafDark;
  const mid = dc.isWilting ? COLORS.WILTING : p.leafMid;
  const light = dc.isWilting ? '#0d9488' : p.leafLight;
  const hl = dc.isWilting ? '#2dd4bf' : p.leafHighlight;

  // Layered, dense horizontal shelves of blue-green needles
  const shelves = isMature
    ? [
        { y: baseY - 10, rx: 13, ry: 5 },
        { y: baseY - 17, rx: 11, ry: 5 },
        { y: baseY - 24, rx: 8, ry: 4 },
        { y: baseY - 30, rx: 5, ry: 3 }
      ]
    : [
        { y: baseY - 8, rx: 9, ry: 4 },
        { y: baseY - 15, rx: 7, ry: 4 },
        { y: baseY - 21, rx: 4, ry: 3 }
      ];

  for (let i = 0; i < shelves.length; i++) {
    const s = shelves[i];
    const sW = wind * ((i + 1) / shelves.length);
    drawFoliageCluster(dc, centerX + Math.floor(sW), s.y, s.rx, s.ry, shadow, mid, light, hl, 0.5);
  }

  // Spire apex
  const topY = shelves[shelves.length - 1].y - 4;
  setPixel(dc, centerX + Math.floor(wind), topY, hl);
  setPixel(dc, centerX + Math.floor(wind), topY - 1, light);
};

// ============================================================================
// SPECIES 10: WILLOW (Drooping weeping branches cascading downward to the soil)
// ============================================================================
const renderWillow = (dc: DrawContext, baseY: number, isMature: boolean) => {
  const centerX = GRID_SIZE / 2;
  const p = dc.palette;
  const wind = dc.useAnimation ? Math.sin(dc.frame * 0.03) * 0.8 : 0;

  drawGround(dc, baseY);

  // Central gnarled trunk
  const trunkH = isMature ? 22 : 16;
  for (let y = 0; y < trunkH; y++) {
    const tw = isMature ? 4 : 3;
    const tx = centerX - Math.floor(tw / 2);
    drawRect(dc, tx, baseY - y, tw, 1, p.trunkMid);
    setPixel(dc, tx, baseY - y, p.trunkDark);
  }

  // Arching limbs that reach out and curve downward
  const forkY = baseY - trunkH + 2;
  drawLine(dc, centerX - 1, forkY, centerX - 12, forkY - 4, 2, p.trunkMid);
  drawLine(dc, centerX + 1, forkY, centerX + 12, forkY - 4, 2, p.trunkMid);
  drawLine(dc, centerX, forkY, centerX, forkY - 8, 2, p.trunkMid);

  const shadow = dc.isWilting ? COLORS.WILTING : p.leafDark;
  const mid = dc.isWilting ? COLORS.WILTING : p.leafMid;
  const light = dc.isWilting ? '#52525b' : p.leafLight;
  const hl = dc.isWilting ? '#71717a' : p.leafHighlight;

  // Upper canopy dome
  const domeY = forkY - 6;
  drawFoliageCluster(dc, centerX, domeY, isMature ? 16 : 11, 7, shadow, mid, light, hl, 1);

  // Cascading vertical weep strands hanging downward towards ground
  const strands = isMature
    ? [
        { x: centerX - 16, startY: domeY, len: 14 },
        { x: centerX - 12, startY: domeY - 2, len: 18 },
        { x: centerX - 8, startY: domeY, len: 20 },
        { x: centerX - 4, startY: domeY + 1, len: 16 },
        { x: centerX + 4, startY: domeY + 1, len: 16 },
        { x: centerX + 8, startY: domeY, len: 20 },
        { x: centerX + 12, startY: domeY - 2, len: 18 },
        { x: centerX + 16, startY: domeY, len: 14 }
      ]
    : [
        { x: centerX - 10, startY: domeY, len: 10 },
        { x: centerX - 6, startY: domeY, len: 12 },
        { x: centerX + 6, startY: domeY, len: 12 },
        { x: centerX + 10, startY: domeY, len: 10 }
      ];

  for (let i = 0; i < strands.length; i++) {
    const s = strands[i];
    const strandSway = wind * (i % 2 === 0 ? 1 : 0.7);

    for (let l = 0; l < s.len; l++) {
      const cy = s.startY + l;
      if (cy >= baseY) break;
      const wave = Math.sin((l / s.len) * Math.PI + (dc.frame * 0.05 + i)) * 1.5;
      const cx = Math.floor(s.x + strandSway + wave);

      // Shaded hanging leaves
      const col = (l % 4 === 0) ? hl : (l % 2 === 0 ? light : mid);
      setPixel(dc, cx, cy, col);
      if (l % 3 === 0 && l < s.len - 2) {
        setPixel(dc, cx + 1, cy, shadow);
      }
    }
  }
};

// ============================================================================
// SPECIES 11: SEQUOIA (Monumental titan, massive fluted red-brown trunk, high canopy)
// ============================================================================
const renderSequoia = (dc: DrawContext, baseY: number, isMature: boolean) => {
  const centerX = GRID_SIZE / 2;
  const p = dc.palette;
  const wind = dc.useAnimation ? Math.sin(dc.frame * 0.015) * 0.4 : 0;

  drawGround(dc, baseY);

  // Massive fluted buttress roots
  const baseW = isMature ? 14 : 9;
  const topW = isMature ? 7 : 5;
  const trunkH = isMature ? 38 : 26;

  drawRect(dc, centerX - Math.floor(baseW / 2) - 2, baseY, baseW + 4, 1, p.trunkDark);

  // Towering monumental trunk rising high into canvas
  for (let y = 0; y < trunkH; y++) {
    const curW = Math.max(3, Math.floor(baseW - ((y / trunkH) * (baseW - topW))));
    const tx = centerX - Math.floor(curW / 2);
    const cy = baseY - y;

    drawRect(dc, tx, cy, curW, 1, p.trunkMid);
    // Deep vertical bark fissures in characteristic red-brown
    setPixel(dc, tx, cy, p.trunkDark);
    setPixel(dc, tx + 1, cy, p.trunkDark);
    if (curW > 5) {
      setPixel(dc, tx + Math.floor(curW / 2), cy, p.trunkDark);
      setPixel(dc, tx + Math.floor(curW / 2) + 1, cy, p.trunkLight);
    }
    setPixel(dc, tx + curW - 1, cy, p.trunkLight);
  }

  const shadow = dc.isWilting ? COLORS.WILTING : p.leafDark;
  const mid = dc.isWilting ? COLORS.WILTING : p.leafMid;
  const light = dc.isWilting ? '#16a34a' : p.leafLight;
  const hl = dc.isWilting ? '#4ade80' : p.leafHighlight;

  // High, majestic layered canopy concentrated on the upper portion
  const topY = baseY - trunkH;
  if (isMature) {
    // Upper crown
    drawFoliageCluster(dc, centerX + Math.floor(wind), topY - 5, 8, 6, shadow, mid, light, hl, 1);
    // Main upper mass
    drawFoliageCluster(dc, centerX + Math.floor(wind), topY + 2, 11, 7, shadow, mid, light, hl, 1);
    // Lower left branch pad
    drawFoliageCluster(dc, centerX - 8 + Math.floor(wind * 0.8), topY + 7, 7, 5, shadow, mid, light, hl, 1);
    // Lower right branch pad
    drawFoliageCluster(dc, centerX + 8 + Math.floor(wind * 0.8), topY + 9, 7, 5, shadow, mid, light, hl, 1);
    // Mid trunk tuft
    drawFoliageCluster(dc, centerX - 5 + Math.floor(wind * 0.6), topY + 15, 5, 3, shadow, mid, light, hl, 1);
  } else {
    // Sapling Sequoia
    drawFoliageCluster(dc, centerX + Math.floor(wind), topY, 8, 6, shadow, mid, light, hl, 1);
    drawFoliageCluster(dc, centerX - 5 + Math.floor(wind), topY + 5, 5, 4, shadow, mid, light, hl, 1);
    drawFoliageCluster(dc, centerX + 5 + Math.floor(wind), topY + 7, 5, 4, shadow, mid, light, hl, 1);
  }
};

// ============================================================================
// SPECIES DISPATCHER
// ============================================================================
const renderSpecies = (dc: DrawContext, species: TreeType, baseY: number, isMature: boolean) => {
  switch (species) {
    case TreeType.OAK:
      renderOak(dc, baseY, isMature);
      break;
    case TreeType.BONSAI:
      renderBonsai(dc, baseY, isMature);
      break;
    case TreeType.PINE:
      renderPine(dc, baseY, isMature);
      break;
    case TreeType.CHERRY_BLOSSOM:
      renderCherryBlossom(dc, baseY, isMature);
      break;
    case TreeType.BAMBOO:
      renderBamboo(dc, baseY, isMature);
      break;
    case TreeType.CACTUS:
      renderCactus(dc, baseY, isMature);
      break;
    case TreeType.MAPLE:
      renderMaple(dc, baseY, isMature);
      break;
    case TreeType.BAOBAB:
      renderBaobab(dc, baseY, isMature);
      break;
    case TreeType.CEDAR:
      renderCedar(dc, baseY, isMature);
      break;
    case TreeType.WILLOW:
      renderWillow(dc, baseY, isMature);
      break;
    case TreeType.SEQUOIA:
      renderSequoia(dc, baseY, isMature);
      break;
    default:
      renderOak(dc, baseY, isMature);
      break;
  }
};

// ============================================================================
// MASTER PIXEL TREE RENDERER
// Operates with zero per-frame object allocation and deterministic output
// ============================================================================
export const renderPixelTree = (
  ctx: CanvasRenderingContext2D,
  goal: SaplingGoal,
  progress: number,
  frame: number,
  size: number,
  seed: number,
  useAnimation: boolean
) => {
  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = size;
  const canvasHeight = size;

  // Sync canvas dimensions with DPR
  const targetW = canvasWidth * dpr;
  const targetH = canvasHeight * dpr;
  if (ctx.canvas.width !== targetW || ctx.canvas.height !== targetH) {
    ctx.canvas.width = targetW;
    ctx.canvas.height = targetH;
    ctx.scale(dpr, dpr);
  }

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.imageSmoothingEnabled = false;

  const pSize = canvasWidth / GRID_SIZE;
  const baseY = GRID_SIZE - 12; // Base ground line at y = 52
  const palette = TREE_CONFIGS[goal.type] || TREE_CONFIGS[TreeType.OAK];
  const isWilting = goal.health < 35;

  const dc: DrawContext = {
    ctx,
    pSize,
    frame,
    useAnimation,
    seed,
    palette,
    isWilting
  };

  // 4 Botanical Growth Stages:
  // 1. SEED (0 - 12%)
  if (progress < 0.12) {
    renderSeed(dc, baseY);
    return;
  }

  // 2. SPROUT (12 - 35%)
  if (progress < 0.35) {
    renderSprout(dc, baseY, progress);
    return;
  }

  // 3. SAPLING (35 - 70%)
  if (progress < 0.70) {
    renderSpecies(dc, goal.type, baseY, false);
    return;
  }

  // 4. MATURE (70 - 100%)
  renderSpecies(dc, goal.type, baseY, true);
};
