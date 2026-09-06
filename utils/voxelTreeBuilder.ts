import * as THREE from 'three';
import { TreeType, GrowthStage } from '../types';
import { TREE_CONFIGS, TreePalette, COLORS } from '../constants';

export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: string;
  scale?: number;
}

/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32)
 */
export function createPRNG(seed: number) {
  let s = (Math.abs(seed) ^ 0xdeadbeef) + 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t >>> 0) / 4294967296);
  };
}

/**
 * Spatial Voxel Grid accumulator with duplicate prevention and coordinate snapping
 */
class VoxelGrid {
  private map = new Map<string, VoxelData>();
  public voxelSize: number;

  constructor(voxelSize = 0.078) {
    this.voxelSize = voxelSize;
  }

  public add(x: number, y: number, z: number, color: string, scale = 1.0) {
    // Snap to grid units
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rz = Math.round(z);
    const key = `${rx},${ry},${rz}`;
    this.map.set(key, {
      x: rx * this.voxelSize,
      y: ry * this.voxelSize,
      z: rz * this.voxelSize,
      color,
      scale: scale * this.voxelSize
    });
  }

  public getVoxels(): VoxelData[] {
    return Array.from(this.map.values());
  }
}

/**
 * Directional voxel lighting: evaluates lighting based on normalized coordinates and light source,
 * with support for interior bioluminescent ambient glow
 */
function getShadedLeafColor(
  palette: TreePalette, 
  nx: number, 
  ny: number, 
  nz: number, 
  isWilting: boolean,
  isInnerGlow = false
): string {
  if (isWilting) return COLORS.WILTING;
  if (isInnerGlow) {
    // Warm golden/amber bioluminescence radiating from interior branch lanterns
    return palette.accent || '#fde047';
  }
  // Normalized directional lighting from overhead light shaft (-X, +Y, +Z)
  const bias = -nx * 0.35 + ny * 0.65 + nz * 0.30;
  if (bias > 0.38) return palette.leafHighlight;
  if (bias > 0.05) return palette.leafLight;
  if (bias > -0.30) return palette.leafMid;
  return palette.leafDark;
}

function getShadedBarkColor(palette: TreePalette, nx: number, nz: number, isWilting: boolean): string {
  if (isWilting) return COLORS.DEAD;
  const bias = -nx * 0.6 + nz * 0.4;
  if (bias > 0.35) return palette.trunkLight;
  if (bias > -0.30) return palette.trunkMid;
  return palette.trunkDark;
}

// =========================================================================
// REUSABLE BOTANICAL VOXEL PRIMITIVES (~70% INFRASTRUCTURE)
// =========================================================================

/**
 * Builds a tapered, stepped voxel trunk
 */
function buildVoxelTrunk(
  grid: VoxelGrid,
  baseX: number,
  baseY: number,
  baseZ: number,
  height: number,
  baseRadius: number,
  topRadius: number,
  palette: TreePalette,
  curveX = 0,
  curveZ = 0,
  isWilting = false
) {
  for (let y = 0; y <= height; y++) {
    const t = y / height;
    const r = baseRadius * (1 - t) + topRadius * t;
    const cx = baseX + curveX * t * t;
    const cz = baseZ + curveZ * t * t;

    const ir = Math.max(1, Math.round(r));
    for (let dx = -ir; dx <= ir; dx++) {
      for (let dz = -ir; dz <= ir; dz++) {
        if (dx * dx + dz * dz <= ir * ir + 0.5) {
          const col = getShadedBarkColor(palette, dx / ir, dz / ir, isWilting);
          grid.add(cx + dx, baseY + y, cz + dz, col);
        }
      }
    }
  }
}

/**
 * Builds an angular stepped voxel branch
 */
function buildVoxelBranch(
  grid: VoxelGrid,
  startX: number,
  startY: number,
  startZ: number,
  endX: number,
  endY: number,
  endZ: number,
  thickness: number,
  palette: TreePalette,
  isWilting = false
) {
  const dx = endX - startX;
  const dy = endY - startY;
  const dz = endZ - startZ;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz), 1) * 1.5;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = startX + dx * t;
    const y = startY + dy * t;
    const z = startZ + dz * t;

    const th = Math.max(1, Math.round(thickness * (1 - t * 0.4)));
    for (let ox = -th + 1; ox <= th - 1; ox++) {
      for (let oz = -th + 1; oz <= th - 1; oz++) {
        const col = getShadedBarkColor(palette, ox / th, oz / th, isWilting);
        grid.add(x + ox, y, z + oz, col);
      }
    }
  }
}

/**
 * Builds an organic stepped voxel foliage cluster
 */
function buildVoxelFoliageCluster(
  grid: VoxelGrid,
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number,
  palette: TreePalette,
  density = 0.85,
  prng: () => number,
  isWilting = false
) {
  const irx = Math.max(1, Math.round(rx));
  const iry = Math.max(1, Math.round(ry));
  const irz = Math.max(1, Math.round(rz));

  for (let dy = -iry; dy <= iry; dy++) {
    for (let dx = -irx; dx <= irx; dx++) {
      for (let dz = -irz; dz <= irz; dz++) {
        const normDist = (dx * dx) / (irx * irx) + (dy * dy) / (iry * iry) + (dz * dz) / (irz * irz);
        if (normDist <= 1.05) {
          if (normDist > 0.75 && prng() > density) continue;
          // Bioluminescent glow on interior/underside leaves catching warm branch light
          const isInnerGlow = !isWilting && dy <= 0 && normDist < 0.65 && prng() > 0.65;
          const col = getShadedLeafColor(palette, dx / irx, dy / iry, dz / irz, isWilting, isInnerGlow);
          grid.add(cx + dx, cy + dy, cz + dz, col);
        }
      }
    }
  }
}

/**
 * Builds root flare and grounded mossy pedestal
 */
function buildVoxelGround(
  grid: VoxelGrid,
  radius: number,
  soilColor: string,
  grassColor: string,
  prng: () => number
) {
  const ir = Math.round(radius);
  for (let dx = -ir; dx <= ir; dx++) {
    for (let dz = -ir; dz <= ir; dz++) {
      const distSq = dx * dx + dz * dz;
      if (distSq <= ir * ir) {
        // Pedestal bed
        grid.add(dx, -1, dz, soilColor);
        if (distSq <= (ir - 1) * (ir - 1) && prng() > 0.25) {
          grid.add(dx, 0, dz, grassColor);
        }
      }
    }
  }
}

// =========================================================================
// SPECIES-SPECIFIC MORPHOLOGY GENERATORS (~30% MORPHOLOGY)
// =========================================================================

/**
 * PINE: Strong triangular tiered silhouette, layered branch tiers
 */
function generatePine(grid: VoxelGrid, stage: GrowthStage, palette: TreePalette, prng: () => number, isWilting: boolean) {
  if (stage === GrowthStage.SEEDLING) {
    buildVoxelTrunk(grid, 0, 0, 0, 4, 1, 1, palette, 0, 0, isWilting);
    buildVoxelFoliageCluster(grid, 0, 5, 0, 2, 2.5, 2, palette, 0.9, prng, isWilting);
    return;
  }
  if (stage === GrowthStage.SPROUT) {
    buildVoxelTrunk(grid, 0, 0, 0, 8, 1.4, 1, palette, 0, 0, isWilting);
    buildVoxelFoliageCluster(grid, 0, 6, 0, 3, 2, 3, palette, 0.85, prng, isWilting);
    buildVoxelFoliageCluster(grid, 0, 9, 0, 2, 2, 2, palette, 0.9, prng, isWilting);
    return;
  }
  if (stage === GrowthStage.SAPLING) {
    buildVoxelTrunk(grid, 0, 0, 0, 14, 2, 1, palette, 0, 0, isWilting);
    buildVoxelFoliageCluster(grid, 0, 8, 0, 5, 2, 5, palette, 0.85, prng, isWilting);
    buildVoxelFoliageCluster(grid, 0, 11, 0, 4, 2, 4, palette, 0.85, prng, isWilting);
    buildVoxelFoliageCluster(grid, 0, 14, 0, 2.5, 2.5, 2.5, palette, 0.9, prng, isWilting);
    return;
  }

  // MATURE PINE
  const trunkH = 22;
  buildVoxelTrunk(grid, 0, 0, 0, trunkH, 2.5, 1, palette, 0.5, 0, isWilting);

  // 4 distinct triangular descending tiers
  buildVoxelFoliageCluster(grid, 0, 9, 0, 7, 2.2, 7, palette, 0.88, prng, isWilting);
  buildVoxelFoliageCluster(grid, 0, 13, 0, 5.5, 2.2, 5.5, palette, 0.88, prng, isWilting);
  buildVoxelFoliageCluster(grid, 0, 17, 0, 4.2, 2.2, 4.2, palette, 0.9, prng, isWilting);
  buildVoxelFoliageCluster(grid, 0, 21, 0, 2.8, 3, 2.8, palette, 0.92, prng, isWilting);
}

/**
 * OAK: Broad sturdy canopy, thick trunk, gnarled branching
 */
function generateOak(grid: VoxelGrid, stage: GrowthStage, palette: TreePalette, prng: () => number, isWilting: boolean) {
  if (stage === GrowthStage.SEEDLING) {
    buildVoxelTrunk(grid, 0, 0, 0, 4, 1.2, 1, palette, 0, 0, isWilting);
    buildVoxelFoliageCluster(grid, 0, 5, 0, 2.5, 2.2, 2.5, palette, 0.88, prng, isWilting);
    return;
  }
  if (stage === GrowthStage.SPROUT) {
    buildVoxelTrunk(grid, 0, 0, 0, 7, 2, 1.5, palette, 0.5, 0, isWilting);
    buildVoxelBranch(grid, 0, 5, 0, -3, 8, 1, 1, palette, isWilting);
    buildVoxelBranch(grid, 0, 5, 0, 3, 8, -1, 1, palette, isWilting);
    buildVoxelFoliageCluster(grid, -3, 8, 1, 3, 2.5, 3, palette, 0.85, prng, isWilting);
    buildVoxelFoliageCluster(grid, 3, 8, -1, 3, 2.5, 3, palette, 0.85, prng, isWilting);
    return;
  }
  if (stage === GrowthStage.SAPLING) {
    buildVoxelTrunk(grid, 0, 0, 0, 12, 3, 2, palette, 0.8, -0.4, isWilting);
    buildVoxelBranch(grid, 0, 8, 0, -5, 13, 2, 1.5, palette, isWilting);
    buildVoxelBranch(grid, 0, 8, 0, 5, 13, -2, 1.5, palette, isWilting);
    buildVoxelFoliageCluster(grid, -5, 13, 2, 4.5, 3.5, 4.5, palette, 0.85, prng, isWilting);
    buildVoxelFoliageCluster(grid, 5, 13, -2, 4.5, 3.5, 4.5, palette, 0.85, prng, isWilting);
    buildVoxelFoliageCluster(grid, 0, 15, 0, 5, 3.8, 5, palette, 0.88, prng, isWilting);
    return;
  }

  // MATURE OAK — Grand botanical specimen directly reflecting the reference image
  // 1. Root flare buttresses grounding the trunk into the pedestal
  buildVoxelBranch(grid, 0, 4, 0, -6, 0, 4, 2.8, palette, isWilting);
  buildVoxelBranch(grid, 0, 4, 0, 6, 0, -4, 2.8, palette, isWilting);
  buildVoxelBranch(grid, 0, 3.5, 0, 4, 0, 5, 2.4, palette, isWilting);
  buildVoxelBranch(grid, 0, 3.5, 0, -5, 0, -4, 2.4, palette, isWilting);
  buildVoxelBranch(grid, 0, 3, 0, 0, 0, -6, 2.0, palette, isWilting);
  buildVoxelBranch(grid, 0, 3, 0, 0, 0, 6, 2.0, palette, isWilting);

  // 2. Lush ground moss, micro-shrubs & illuminated botanical flower voxels
  for (let ox = -8; ox <= 8; ox++) {
    for (let oz = -8; oz <= 8; oz++) {
      const dSq = ox * ox + oz * oz;
      if (dSq > 6 && dSq <= 49 && prng() > 0.35) {
        // Base moss
        grid.add(ox, 0, oz, prng() > 0.4 ? palette.leafDark : palette.leafMid);
        // Little illuminated golden and cyan flower buds
        if (prng() > 0.82) {
          grid.add(ox, 1, oz, prng() > 0.5 ? '#facc15' : '#2dd4bf', 0.85);
        }
      }
    }
  }

  // 3. Thick gnarled central trunk
  buildVoxelTrunk(grid, 0, 0, 0, 19, 5.2, 3.2, palette, 0.8, -0.6, isWilting);

  // 4. Heavy gnarled primary and secondary architectural boughs
  buildVoxelBranch(grid, 0, 10, 0, -10, 16, 4, 3.0, palette, isWilting);
  buildVoxelBranch(grid, -10, 16, 4, -14, 18, 6, 2.0, palette, isWilting);
  buildVoxelBranch(grid, -10, 16, 4, -12, 21, 1, 1.8, palette, isWilting);

  buildVoxelBranch(grid, 0, 11, 0, 10, 17, -4, 3.0, palette, isWilting);
  buildVoxelBranch(grid, 10, 17, -4, 14, 19, -5, 2.0, palette, isWilting);
  buildVoxelBranch(grid, 10, 17, -4, 12, 22, -1, 1.8, palette, isWilting);

  buildVoxelBranch(grid, 0, 12, 0, 3, 18, 9, 2.6, palette, isWilting);
  buildVoxelBranch(grid, 3, 18, 9, 5, 22, 12, 1.8, palette, isWilting);

  buildVoxelBranch(grid, 0, 13, 0, -4, 19, -9, 2.6, palette, isWilting);
  buildVoxelBranch(grid, -4, 19, -9, -6, 23, -11, 1.8, palette, isWilting);

  buildVoxelBranch(grid, -2, 15, 1, -7, 23, -3, 2.0, palette, isWilting);
  buildVoxelBranch(grid, 2, 16, -1, 7, 24, 3, 2.0, palette, isWilting);

  // 5. Internal bioluminescent lanterns nestled in branch crotches
  const innerLanterns = [
    { x: -4, y: 14, z: 2 },
    { x: 4, y: 15, z: -2 },
    { x: 1, y: 16, z: 4 },
    { x: -2, y: 17, z: -4 },
    { x: 0, y: 19, z: 0 },
    { x: -5, y: 20, z: 1 },
    { x: 5, y: 20, z: -1 }
  ];
  for (const lt of innerLanterns) {
    grid.add(lt.x, lt.y, lt.z, '#fde047', 1.2);
    grid.add(lt.x + 1, lt.y, lt.z, '#f59e0b', 0.95);
    grid.add(lt.x - 1, lt.y, lt.z, '#fbbf24', 0.95);
    grid.add(lt.x, lt.y - 1, lt.z, '#d97706', 0.9);
  }

  // 6. Distinct stepped horizontal cloud-pads forming a majestic, tiered illuminated crown
  buildVoxelFoliageCluster(grid, -12, 18, 4, 5.5, 3.2, 5.0, palette, 0.90, prng, isWilting);
  buildVoxelFoliageCluster(grid, 12, 19, -4, 5.5, 3.2, 5.0, palette, 0.90, prng, isWilting);
  buildVoxelFoliageCluster(grid, 3, 20, 9, 5.2, 3.0, 5.2, palette, 0.88, prng, isWilting);
  buildVoxelFoliageCluster(grid, -4, 21, -9, 5.2, 3.0, 5.2, palette, 0.88, prng, isWilting);

  // Mid-tier horizontal foliage terraces
  buildVoxelFoliageCluster(grid, -7, 22, 1, 6.2, 3.2, 5.8, palette, 0.91, prng, isWilting);
  buildVoxelFoliageCluster(grid, 7, 23, -1, 6.2, 3.2, 5.8, palette, 0.91, prng, isWilting);
  buildVoxelFoliageCluster(grid, 1, 23, -5, 5.5, 3.0, 5.5, palette, 0.90, prng, isWilting);
  buildVoxelFoliageCluster(grid, -1, 23, 5, 5.5, 3.0, 5.5, palette, 0.90, prng, isWilting);

  // Upper crown layered pads
  buildVoxelFoliageCluster(grid, 0, 26, 0, 6.5, 3.2, 6.5, palette, 0.92, prng, isWilting);
  buildVoxelFoliageCluster(grid, -2, 28, 1, 4.8, 2.6, 4.8, palette, 0.92, prng, isWilting);
  buildVoxelFoliageCluster(grid, 2, 28, -1, 4.8, 2.6, 4.8, palette, 0.92, prng, isWilting);
  buildVoxelFoliageCluster(grid, 0, 30, 0, 3.6, 2.0, 3.6, palette, 0.94, prng, isWilting);

  // Hanging leaf tendrils catching the under-glow
  const hangingPads = [
    { x: -10, y: 15, z: 3 },
    { x: 10, y: 16, z: -3 },
    { x: 3, y: 17, z: 7 },
    { x: -3, y: 17, z: -7 },
    { x: -6, y: 19, z: 4 },
    { x: 6, y: 20, z: -4 }
  ];
  for (const hp of hangingPads) {
    grid.add(hp.x, hp.y, hp.z, palette.leafLight);
    grid.add(hp.x, hp.y - 1, hp.z, palette.accent || '#fde047', 0.9);
  }
}

/**
 * BONSAI: Small but highly intentional, twisted S-trunk, exposed roots, asymmetric compact pads
 */
function generateBonsai(grid: VoxelGrid, stage: GrowthStage, palette: TreePalette, prng: () => number, isWilting: boolean) {
  if (stage === GrowthStage.SEEDLING) {
    buildVoxelTrunk(grid, 0, 0, 0, 3, 1, 0.8, palette, 0.8, 0, isWilting);
    buildVoxelFoliageCluster(grid, 1, 4, 0, 1.8, 1.5, 1.8, palette, 0.9, prng, isWilting);
    return;
  }
  if (stage === GrowthStage.SPROUT) {
    buildVoxelTrunk(grid, 0, 0, 0, 6, 1.6, 1, palette, 2.0, -0.8, isWilting);
    buildVoxelFoliageCluster(grid, 3, 7, -1, 3, 1.8, 2.5, palette, 0.9, prng, isWilting);
    return;
  }

  // SAPLING & MATURE BONSAI
  // Exposed root flare
  buildVoxelBranch(grid, 0, 0, 0, -2, -1, 1, 1.2, palette, isWilting);
  buildVoxelBranch(grid, 0, 0, 0, 2, -1, -1, 1.2, palette, isWilting);

  // Twisted S-trunk
  buildVoxelBranch(grid, 0, 0, 0, 4, 6, -1, 2.2, palette, isWilting);
  buildVoxelBranch(grid, 4, 6, -1, 2, 11, 2, 1.8, palette, isWilting);
  buildVoxelBranch(grid, 2, 11, 2, -3, 14, 0, 1.4, palette, isWilting);

  // Distinct compact cloud-like foliage pads
  buildVoxelFoliageCluster(grid, 5, 7, -2, 3.8, 1.8, 3.2, palette, 0.92, prng, isWilting);
  buildVoxelFoliageCluster(grid, 3, 12, 3, 3.5, 1.8, 3.0, palette, 0.92, prng, isWilting);
  buildVoxelFoliageCluster(grid, -4, 15, 0, 4.2, 2.0, 3.8, palette, 0.94, prng, isWilting);
}

/**
 * CHERRY BLOSSOM: Dark branching, irregular canopy, delicate pink blossom clusters
 */
function generateCherryBlossom(grid: VoxelGrid, stage: GrowthStage, palette: TreePalette, prng: () => number, isWilting: boolean) {
  if (stage === GrowthStage.SEEDLING) {
    buildVoxelTrunk(grid, 0, 0, 0, 4, 1, 0.8, palette, 0.4, 0, isWilting);
    buildVoxelFoliageCluster(grid, 0, 5, 0, 2, 1.8, 2, palette, 0.85, prng, isWilting);
    return;
  }
  if (stage === GrowthStage.SPROUT) {
    buildVoxelTrunk(grid, 0, 0, 0, 8, 1.8, 1.2, palette, 0.8, -0.4, isWilting);
    buildVoxelBranch(grid, 0, 6, 0, -3, 9, 1, 1, palette, isWilting);
    buildVoxelFoliageCluster(grid, -3, 9, 1, 3, 2, 3, palette, 0.85, prng, isWilting);
    buildVoxelFoliageCluster(grid, 1, 10, 0, 3, 2, 3, palette, 0.85, prng, isWilting);
    return;
  }

  // MATURE CHERRY BLOSSOM
  buildVoxelTrunk(grid, 0, 0, 0, 15, 3.2, 1.8, palette, 1.5, -0.5, isWilting);
  // Asymmetric delicate branching
  buildVoxelBranch(grid, 1, 9, 0, -6, 14, 2, 1.5, palette, isWilting);
  buildVoxelBranch(grid, 1, 11, 0, 6, 16, -2, 1.5, palette, isWilting);
  buildVoxelBranch(grid, -6, 14, 2, -9, 16, 4, 1.0, palette, isWilting);

  // Soft pink blossom cloud clusters
  buildVoxelFoliageCluster(grid, -8, 16, 3, 4.5, 2.5, 4.0, palette, 0.88, prng, isWilting);
  buildVoxelFoliageCluster(grid, 6, 17, -2, 5.0, 2.8, 4.5, palette, 0.88, prng, isWilting);
  buildVoxelFoliageCluster(grid, -1, 18, 1, 5.5, 3.2, 5.0, palette, 0.90, prng, isWilting);
}

/**
 * BAMBOO: Clustered multiple slender segmented culms, narrow leaves
 */
function generateBamboo(grid: VoxelGrid, stage: GrowthStage, palette: TreePalette, prng: () => number, isWilting: boolean) {
  const culmCount = stage === GrowthStage.SEEDLING ? 1 : stage === GrowthStage.SPROUT ? 2 : 4;
  const offsets = [
    { x: 0, z: 0, h: 18 },
    { x: 2, z: -1, h: 16 },
    { x: -2, z: 1, h: 15 },
    { x: 1, z: 2, h: 17 }
  ];

  for (let c = 0; c < culmCount; c++) {
    const { x, z, h } = offsets[c];
    const actualH = stage === GrowthStage.SEEDLING ? 5 : stage === GrowthStage.SPROUT ? 9 : h;

    for (let y = 0; y <= actualH; y++) {
      const isNode = y % 4 === 0;
      const col = isNode ? palette.trunkDark : palette.trunkMid;
      grid.add(x, y, z, col);
      if (isNode) {
        grid.add(x + 0.5, y, z, palette.trunkLight);
      }
    }

    // Leaf sprays at top
    if (stage !== GrowthStage.SEEDLING) {
      buildVoxelFoliageCluster(grid, x + 1, actualH - 1, z, 2.2, 1.5, 1.5, palette, 0.8, prng, isWilting);
      buildVoxelFoliageCluster(grid, x - 1, actualH + 1, z, 2.5, 1.8, 1.8, palette, 0.85, prng, isWilting);
    }
  }
}

/**
 * CACTUS: Voxel desert specimen, thick body, branching arms, ribbed
 */
function generateCactus(grid: VoxelGrid, stage: GrowthStage, palette: TreePalette, prng: () => number, isWilting: boolean) {
  const h = stage === GrowthStage.SEEDLING ? 4 : stage === GrowthStage.SPROUT ? 8 : 16;
  const r = stage === GrowthStage.SEEDLING ? 1.2 : 2.2;

  // Central ribbed column
  for (let y = 0; y <= h; y++) {
    const ir = Math.round(r);
    for (let dx = -ir; dx <= ir; dx++) {
      for (let dz = -ir; dz <= ir; dz++) {
        if (dx * dx + dz * dz <= ir * ir) {
          const isRib = (Math.abs(dx) === ir || Math.abs(dz) === ir);
          const col = isRib ? palette.leafHighlight : getShadedLeafColor(palette, dx, 0, dz, isWilting);
          grid.add(dx, y, dz, col);
        }
      }
    }
  }

  // Branching arms for Sapling and Mature
  if (stage === GrowthStage.SAPLING || stage === GrowthStage.MATURE) {
    // Left arm
    buildVoxelBranch(grid, -2, 7, 0, -5, 7, 0, 1.5, palette, isWilting);
    buildVoxelBranch(grid, -5, 7, 0, -5, 13, 0, 1.5, palette, isWilting);

    // Right arm
    buildVoxelBranch(grid, 2, 9, 0, 5, 9, 0, 1.5, palette, isWilting);
    buildVoxelBranch(grid, 5, 9, 0, 5, 14, 0, 1.5, palette, isWilting);
  }
}

/**
 * MAPLE: Architecturally divided spreading crown, wide angular boughs, lobed flat foliage fans,
 * pronounced asymmetry, and visible negative space between tiers (unmistakably distinct from Oak).
 */
function generateMaple(grid: VoxelGrid, stage: GrowthStage, palette: TreePalette, prng: () => number, isWilting: boolean) {
  if (stage === GrowthStage.SEEDLING) {
    buildVoxelTrunk(grid, 0, 0, 0, 4, 1, 0.7, palette, 0.4, 0, isWilting);
    buildVoxelFoliageCluster(grid, 1, 5, 0, 2.4, 1.4, 2.0, palette, 0.88, prng, isWilting);
    return;
  }
  if (stage === GrowthStage.SPROUT) {
    buildVoxelTrunk(grid, 0, 0, 0, 8, 1.8, 1.1, palette, 0.6, -0.3, isWilting);
    buildVoxelBranch(grid, 0, 5, 0, -4, 8, 1, 1.2, palette, isWilting);
    buildVoxelBranch(grid, 0, 6, 0, 4, 9, -1, 1.2, palette, isWilting);
    buildVoxelFoliageCluster(grid, -4, 9, 1, 3.8, 1.6, 3.2, palette, 0.88, prng, isWilting);
    buildVoxelFoliageCluster(grid, 4, 10, -1, 3.6, 1.6, 3.0, palette, 0.88, prng, isWilting);
    buildVoxelFoliageCluster(grid, 0, 11, 0, 3.2, 1.6, 3.0, palette, 0.90, prng, isWilting);
    return;
  }

  // SAPLING & MATURE MAPLE
  const isMature = stage === GrowthStage.MATURE;
  const h = isMature ? 18 : 13;
  const spreadScale = isMature ? 1.0 : 0.75;

  // 1. Slender, graceful upright trunk with gentle natural taper (distinct from Oak's gnarled massive base)
  buildVoxelTrunk(grid, 0, 0, 0, h, 2.2 * spreadScale, 1.3 * spreadScale, palette, 0.6, -0.4, isWilting);

  // 2. Wide, angular horizontal bough divergence (45°-60° spread)
  // Low wide-reaching left bough (asymmetric lower horizontal tier)
  const b1x = -9 * spreadScale;
  const b1y = (h - 3);
  const b1z = 3 * spreadScale;
  buildVoxelBranch(grid, 0, h - 8, 0, b1x * 0.6, b1y - 2, b1z * 0.6, 1.8 * spreadScale, palette, isWilting);
  buildVoxelBranch(grid, b1x * 0.6, b1y - 2, b1z * 0.6, b1x, b1y, b1z, 1.4 * spreadScale, palette, isWilting);
  // Outer fork on left bough
  buildVoxelBranch(grid, b1x, b1y, b1z, b1x - 3 * spreadScale, b1y + 1, b1z + 2 * spreadScale, 1.1 * spreadScale, palette, isWilting);

  // High reaching right bough (steep upward diagonal)
  const b2x = 8 * spreadScale;
  const b2y = (h - 1);
  const b2z = -3 * spreadScale;
  buildVoxelBranch(grid, 0, h - 6, 0, b2x * 0.5, b2y - 2, b2z * 0.5, 1.8 * spreadScale, palette, isWilting);
  buildVoxelBranch(grid, b2x * 0.5, b2y - 2, b2z * 0.5, b2x, b2y, b2z, 1.4 * spreadScale, palette, isWilting);
  // High fork on right bough
  buildVoxelBranch(grid, b2x, b2y, b2z, b2x + 3 * spreadScale, b2y + 3, b2z - 1, 1.1 * spreadScale, palette, isWilting);

  // Rear-reaching deep bough
  const b3x = -2 * spreadScale;
  const b3y = (h - 2);
  const b3z = -8 * spreadScale;
  buildVoxelBranch(grid, 0, h - 5, 0, b3x, b3y, b3z, 1.5 * spreadScale, palette, isWilting);

  // Front-reaching forward bough
  const b4x = 4 * spreadScale;
  const b4y = (h - 4);
  const b4z = 7 * spreadScale;
  buildVoxelBranch(grid, 0, h - 7, 0, b4x, b4y, b4z, 1.5 * spreadScale, palette, isWilting);

  // Central upper leader branch
  buildVoxelBranch(grid, 0, h - 3, 0, 0, h + 3, 0, 1.4 * spreadScale, palette, isWilting);

  // 3. Flatter, lobed, wide horizontal foliage masses with visible negative space
  // Left fan: Wide horizontal spread, distinctly separated from trunk
  buildVoxelFoliageCluster(grid, b1x - 2 * spreadScale, b1y + 1, b1z + 1, 5.2 * spreadScale, 1.8 * spreadScale, 4.4 * spreadScale, palette, 0.88, prng, isWilting);
  buildVoxelFoliageCluster(grid, b1x + 1, b1y + 2, b1z - 1, 4.0 * spreadScale, 1.6 * spreadScale, 3.6 * spreadScale, palette, 0.88, prng, isWilting);

  // Right fan: Elevated, lobed crown tier
  buildVoxelFoliageCluster(grid, b2x + 2 * spreadScale, b2y + 3, b2z, 4.8 * spreadScale, 1.8 * spreadScale, 4.2 * spreadScale, palette, 0.88, prng, isWilting);
  buildVoxelFoliageCluster(grid, b2x - 1, b2y + 2, b2z - 2 * spreadScale, 4.2 * spreadScale, 1.6 * spreadScale, 3.8 * spreadScale, palette, 0.88, prng, isWilting);

  // Rear fan
  buildVoxelFoliageCluster(grid, b3x, b3y + 1, b3z - 1, 4.6 * spreadScale, 1.7 * spreadScale, 4.2 * spreadScale, palette, 0.88, prng, isWilting);

  // Front lower fan
  buildVoxelFoliageCluster(grid, b4x + 1, b4y + 1, b4z + 1, 4.6 * spreadScale, 1.7 * spreadScale, 4.0 * spreadScale, palette, 0.88, prng, isWilting);

  // Central elevated spire fan (distinct gap underneath for open candelabra silhouette)
  buildVoxelFoliageCluster(grid, 0, h + 4, 0, 4.4 * spreadScale, 2.0 * spreadScale, 4.2 * spreadScale, palette, 0.90, prng, isWilting);
  buildVoxelFoliageCluster(grid, 0, h + 6, 0, 2.6 * spreadScale, 1.4 * spreadScale, 2.6 * spreadScale, palette, 0.92, prng, isWilting);

  // 4. Autumn amber sap accents in crotches and fan tips
  if (isMature) {
    const accents = [
      { x: b1x * 0.5, y: b1y - 1, z: b1z * 0.5 },
      { x: b2x * 0.5, y: b2y - 1, z: b2z * 0.5 },
      { x: 0, y: h - 1, z: 0 },
      { x: b1x - 3 * spreadScale, y: b1y, z: b1z + 2 * spreadScale },
      { x: b2x + 3 * spreadScale, y: b2y + 2, z: b2z }
    ];
    for (const a of accents) {
      grid.add(Math.round(a.x), Math.round(a.y), Math.round(a.z), '#f59e0b', 0.95);
    }
  }
}

/**
 * BAOBAB: Massive bottle-shaped trunk, wide root footprint, high branching crown
 */
function generateBaobab(grid: VoxelGrid, stage: GrowthStage, palette: TreePalette, prng: () => number, isWilting: boolean) {
  if (stage === GrowthStage.SEEDLING) {
    buildVoxelTrunk(grid, 0, 0, 0, 4, 2, 1.5, palette, 0, 0, isWilting);
    buildVoxelFoliageCluster(grid, 0, 5, 0, 2.5, 1.5, 2.5, palette, 0.85, prng, isWilting);
    return;
  }

  // Giant bottle trunk
  const h = stage === GrowthStage.SPROUT ? 7 : 13;
  const baseR = stage === GrowthStage.SPROUT ? 3.5 : 5.5;
  const topR = stage === GrowthStage.SPROUT ? 2.5 : 3.5;
  buildVoxelTrunk(grid, 0, 0, 0, h, baseR, topR, palette, 0, 0, isWilting);

  // High compact canopy
  buildVoxelBranch(grid, 0, h, 0, -4, h + 3, 1, 2, palette, isWilting);
  buildVoxelBranch(grid, 0, h, 0, 4, h + 3, -1, 2, palette, isWilting);

  buildVoxelFoliageCluster(grid, -4, h + 4, 1, 4.5, 2.2, 4, palette, 0.9, prng, isWilting);
  buildVoxelFoliageCluster(grid, 4, h + 4, -1, 4.5, 2.2, 4, palette, 0.9, prng, isWilting);
  buildVoxelFoliageCluster(grid, 0, h + 5, 0, 5, 2.5, 5, palette, 0.92, prng, isWilting);
}

/**
 * CEDAR: Dense evergreen, conical layered silhouette, ancient strength
 */
function generateCedar(grid: VoxelGrid, stage: GrowthStage, palette: TreePalette, prng: () => number, isWilting: boolean) {
  const h = stage === GrowthStage.SEEDLING ? 4 : stage === GrowthStage.SPROUT ? 8 : 18;
  buildVoxelTrunk(grid, 0, 0, 0, h, 2.8, 1.2, palette, 0.3, 0, isWilting);

  if (stage === GrowthStage.SEEDLING) {
    buildVoxelFoliageCluster(grid, 0, 4, 0, 2.2, 2.5, 2.2, palette, 0.9, prng, isWilting);
    return;
  }

  // Dense conical tiers
  buildVoxelFoliageCluster(grid, 0, 7, 0, 6, 2.2, 6, palette, 0.9, prng, isWilting);
  buildVoxelFoliageCluster(grid, 0, 11, 0, 4.8, 2.2, 4.8, palette, 0.9, prng, isWilting);
  buildVoxelFoliageCluster(grid, 0, 15, 0, 3.5, 2.2, 3.5, palette, 0.92, prng, isWilting);
  buildVoxelFoliageCluster(grid, 0, 18, 0, 2.2, 2.5, 2.2, palette, 0.94, prng, isWilting);
}

/**
 * WILLOW: Outward arching branches with long downward cascading foliage strands
 */
function generateWillow(grid: VoxelGrid, stage: GrowthStage, palette: TreePalette, prng: () => number, isWilting: boolean) {
  const h = stage === GrowthStage.SEEDLING ? 4 : stage === GrowthStage.SPROUT ? 7 : 14;
  buildVoxelTrunk(grid, 0, 0, 0, h, 2.5, 1.8, palette, 0.6, -0.4, isWilting);

  if (stage === GrowthStage.SEEDLING) {
    buildVoxelFoliageCluster(grid, 0, 4, 0, 2.5, 2, 2.5, palette, 0.88, prng, isWilting);
    return;
  }

  // Outward arches
  buildVoxelBranch(grid, 0, h - 2, 0, -5, h + 1, 2, 1.5, palette, isWilting);
  buildVoxelBranch(grid, 0, h - 2, 0, 5, h + 1, -2, 1.5, palette, isWilting);

  // Drooping foliage canopy
  buildVoxelFoliageCluster(grid, 0, h + 2, 0, 5.5, 3.0, 5.5, palette, 0.85, prng, isWilting);

  // Cascading downward strands
  const strandPositions = [
    { x: -5, z: 2 }, { x: 5, z: -2 }, { x: -3, z: -4 }, { x: 3, z: 4 },
    { x: -4, z: -1 }, { x: 4, z: 1 }
  ];

  strandPositions.forEach(sp => {
    const len = 4 + Math.round(prng() * 4);
    for (let dy = 0; dy <= len; dy++) {
      const col = getShadedLeafColor(palette, sp.x, -dy, sp.z, isWilting);
      grid.add(sp.x, h - dy, sp.z, col);
    }
  });
}

/**
 * SEQUOIA: Monumental titan, fluted stepped base, towering vertical height, high majestic crown
 */
function generateSequoia(grid: VoxelGrid, stage: GrowthStage, palette: TreePalette, prng: () => number, isWilting: boolean) {
  const h = stage === GrowthStage.SEEDLING ? 5 : stage === GrowthStage.SPROUT ? 10 : 25;
  const baseR = stage === GrowthStage.SEEDLING ? 1.5 : stage === GrowthStage.SPROUT ? 3 : 5.2;
  const topR = stage === GrowthStage.SEEDLING ? 1 : stage === GrowthStage.SPROUT ? 1.8 : 2.5;

  // Towering fluted trunk
  buildVoxelTrunk(grid, 0, 0, 0, h, baseR, topR, palette, 0.4, 0, isWilting);

  // Root flares at base
  if (stage === GrowthStage.MATURE) {
    buildVoxelBranch(grid, 0, 0, 0, -4, 2, 1, 2.5, palette, isWilting);
    buildVoxelBranch(grid, 0, 0, 0, 4, 2, -1, 2.5, palette, isWilting);
    buildVoxelBranch(grid, 0, 0, 0, 0, 2, 4, 2.5, palette, isWilting);
  }

  // High monumental canopy
  buildVoxelFoliageCluster(grid, 0, h - 3, 0, 5.5, 3, 5.5, palette, 0.88, prng, isWilting);
  buildVoxelFoliageCluster(grid, 0, h + 1, 0, 4.5, 3.5, 4.5, palette, 0.9, prng, isWilting);
  buildVoxelFoliageCluster(grid, 0, h + 4, 0, 3.0, 3.0, 3.0, palette, 0.92, prng, isWilting);
}

// =========================================================================
// MASTER DETERMINISTIC VOXEL TREE GENERATOR
// =========================================================================

export function generateVoxelTreeData(
  treeType: TreeType,
  progress: number,
  seed = 42,
  isWilting = false,
  voxelSize = 0.075
): VoxelData[] {
  const prng = createPRNG(seed);
  const palette = TREE_CONFIGS[treeType] || TREE_CONFIGS[TreeType.PINE];
  const grid = new VoxelGrid(voxelSize);

  // Determine stage from progress
  let stage = GrowthStage.SEEDLING;
  if (progress >= 0.85) stage = GrowthStage.MATURE;
  else if (progress >= 0.50) stage = GrowthStage.SAPLING;
  else if (progress >= 0.25) stage = GrowthStage.SPROUT;

  // Generate ground pedestal
  const groundR = stage === GrowthStage.SEEDLING ? 3 : stage === GrowthStage.SPROUT ? 4.5 : 7;
  buildVoxelGround(grid, groundR, '#081408', '#0f2e14', prng);

  // Generate species morphology
  switch (treeType) {
    case TreeType.PINE:
      generatePine(grid, stage, palette, prng, isWilting);
      break;
    case TreeType.OAK:
      generateOak(grid, stage, palette, prng, isWilting);
      break;
    case TreeType.BONSAI:
      generateBonsai(grid, stage, palette, prng, isWilting);
      break;
    case TreeType.CHERRY_BLOSSOM:
      generateCherryBlossom(grid, stage, palette, prng, isWilting);
      break;
    case TreeType.BAMBOO:
      generateBamboo(grid, stage, palette, prng, isWilting);
      break;
    case TreeType.CACTUS:
      generateCactus(grid, stage, palette, prng, isWilting);
      break;
    case TreeType.MAPLE:
      generateMaple(grid, stage, palette, prng, isWilting);
      break;
    case TreeType.BAOBAB:
      generateBaobab(grid, stage, palette, prng, isWilting);
      break;
    case TreeType.CEDAR:
      generateCedar(grid, stage, palette, prng, isWilting);
      break;
    case TreeType.WILLOW:
      generateWillow(grid, stage, palette, prng, isWilting);
      break;
    case TreeType.SEQUOIA:
      generateSequoia(grid, stage, palette, prng, isWilting);
      break;
    default:
      generateOak(grid, stage, palette, prng, isWilting);
      break;
  }

  return grid.getVoxels();
}

/**
 * Builds an ultra-high performance Three.js InstancedMesh from voxel data.
 * Exactly 1 draw call for the entire tree!
 */
export function buildInstancedVoxelTreeMesh(voxels: VoxelData[]): THREE.InstancedMesh {
  const count = voxels.length;
  // Shared 1x1x1 cube geometry
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.55,
    metalness: 0.05
  });

  const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
  instancedMesh.castShadow = true;
  instancedMesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const v = voxels[i];
    const s = v.scale ?? 0.09;
    dummy.position.set(v.x, v.y, v.z);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);

    color.set(v.color);
    instancedMesh.setColorAt(i, color);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
  }

  return instancedMesh;
}
