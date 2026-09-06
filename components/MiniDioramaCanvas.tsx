import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { InstrumentId } from './FeatureInstrumentDrawer';
import { trackWebGLRenderer } from '../utils/webglTracker';

interface MiniDioramaCanvasProps {
  instrumentId: InstrumentId;
  isHovered?: boolean;
  className?: string;
}

/**
 * Creates an animated canvas texture for the POMO incubation face
 */
function createPomoFaceTexture(): { texture: THREE.CanvasTexture; update: (time: number) => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  const update = (time: number) => {
    ctx.fillStyle = '#051307';
    ctx.fillRect(0, 0, 128, 128);

    // Glowing cyber face [ ^   ^ ] or [ •   • ]
    ctx.fillStyle = '#4ade80';
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 8;

    const isBlinking = Math.sin(time * 2.5) > 0.94;

    if (isBlinking) {
      // Blinking slit eyes
      ctx.fillRect(28, 58, 22, 5);
      ctx.fillRect(78, 58, 22, 5);
    } else {
      // Cute curved or rounded eyes
      ctx.beginPath();
      ctx.arc(38, 54, 10, 0, Math.PI * 2);
      ctx.arc(90, 54, 10, 0, Math.PI * 2);
      ctx.fill();

      // Happy curved mouth
      ctx.beginPath();
      ctx.arc(64, 72, 14, 0.2, Math.PI - 0.2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#4ade80';
      ctx.stroke();
    }

    texture.needsUpdate = true;
  };

  return { texture, update };
}

/**
 * Creates an animated cybernetic code screen texture for LOGS
 */
function createLogsScreenTexture(): { texture: THREE.CanvasTexture; update: (time: number) => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  const update = (time: number) => {
    ctx.fillStyle = 'rgba(3, 14, 6, 0.95)';
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#4ade80';
    ctx.font = '8px monospace';

    // Animated scrolling telemetry lines
    const offset = Math.floor(time * 6) % 10;
    const lines = [
      'SYS.FLOW // OK',
      'ACC: 98.4%',
      'STAGE: 04/05',
      'MEM: 412 MB',
      'TREE: OAK_TITAN',
      'SYNC: ACTIVE',
      'STREAK: 14D',
      'LEAF_GEN: 104'
    ];

    lines.forEach((l, i) => {
      const y = ((i - offset + 10) % 8) * 14 + 18;
      ctx.fillText(`> ${l}`, 8, y);
    });

    // Grid status bar at bottom
    ctx.fillStyle = '#22c55e';
    for (let c = 0; c < 8; c++) {
      const h = Math.abs(Math.sin(time * 3 + c)) * 12 + 4;
      ctx.fillRect(8 + c * 14, 120 - h, 10, h);
    }

    texture.needsUpdate = true;
  };

  return { texture, update };
}

/**
 * Creates animated robotic face texture for ANI
 */
function createAniFaceTexture(): { texture: THREE.CanvasTexture; update: (time: number) => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  const update = (time: number) => {
    ctx.fillStyle = '#020904';
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#86efac';
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 10;

    const isBlink = Math.sin(time * 1.8) > 0.95;

    if (isBlink) {
      ctx.fillRect(32, 60, 20, 4);
      ctx.fillRect(76, 60, 20, 4);
    } else {
      // Expressive oval anime eyes
      ctx.beginPath();
      ctx.ellipse(42, 56, 9, 14, 0, 0, Math.PI * 2);
      ctx.ellipse(86, 56, 9, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cheerful subtle smile
      ctx.beginPath();
      ctx.arc(64, 76, 10, 0.2, Math.PI - 0.2);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#86efac';
      ctx.stroke();
    }

    texture.needsUpdate = true;
  };

  return { texture, update };
}

interface DioramaSceneData {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  dioramaGroup: THREE.Group;
  disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] }[];
  updateCallbacks: ((time: number, mouse?: { x: number; y: number }) => void)[];
}

function createDioramaScene(instrumentId: InstrumentId): DioramaSceneData {
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(38, 320 / 240, 0.1, 40);
  camera.position.set(0, 1.15, 3.8);
  camera.lookAt(0, 0.1, 0);

  const disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] }[] = [];
  const updateCallbacks: ((time: number, mouse?: { x: number; y: number }) => void)[] = [];

  // Base Group for Diorama rotation & tilt
  const dioramaGroup = new THREE.Group();
  scene.add(dioramaGroup);

  // --- SHARED LIGHTING ---
  const ambient = new THREE.AmbientLight(0x14532d, 1.2);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
  keyLight.position.set(2.5, 5.0, 3.5);
  scene.add(keyLight);

  const topLight = new THREE.PointLight(0x4ade80, 2.2, 8);
  topLight.position.set(0, 2.2, 0.5);
  scene.add(topLight);

  const rimLight = new THREE.DirectionalLight(0x2dd4bf, 1.4);
  rimLight.position.set(-3, -1, -3);
  scene.add(rimLight);

    // =========================================================================
    // DIORAMA 1: GROOVE — Voxel Tree Plinth with Rising Bioluminescent Spores
    // =========================================================================
    if (instrumentId === 'groove') {
      // 1. Dark metallic pedestal
      const plinthGeo = new THREE.BoxGeometry(1.9, 0.2, 1.9);
      const plinthMat = new THREE.MeshStandardMaterial({
        color: 0x07150a,
        roughness: 0.25,
        metalness: 0.8
      });
      const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
      plinthMesh.position.y = -0.7;
      dioramaGroup.add(plinthMesh);
      disposables.push({ geometry: plinthGeo, material: plinthMat });

      // Neon perimeter track
      const trackGeo = new THREE.BoxGeometry(1.96, 0.03, 1.96);
      const trackMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
      const trackMesh = new THREE.Mesh(trackGeo, trackMat);
      trackMesh.position.y = -0.62;
      dioramaGroup.add(trackMesh);
      disposables.push({ geometry: trackGeo, material: trackMat });

      // Moss top bed
      const mossGeo = new THREE.BoxGeometry(1.8, 0.05, 1.8);
      const mossMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9 });
      const mossMesh = new THREE.Mesh(mossGeo, mossMat);
      mossMesh.position.y = -0.58;
      dioramaGroup.add(mossMesh);
      disposables.push({ geometry: mossGeo, material: mossMat });

      // 2. 3D Voxel Tree
      const treeGroup = new THREE.Group();
      treeGroup.position.set(0, -0.55, 0);
      dioramaGroup.add(treeGroup);

      // Trunk
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.7 });
      const trunkGeo = new THREE.BoxGeometry(0.24, 0.9, 0.24);
      const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
      trunkMesh.position.y = 0.45;
      treeGroup.add(trunkMesh);
      disposables.push({ geometry: trunkGeo, material: trunkMat });

      // Roots
      const rootGeo = new THREE.BoxGeometry(0.55, 0.1, 0.55);
      const rootMesh = new THREE.Mesh(rootGeo, trunkMat);
      rootMesh.position.y = 0.05;
      treeGroup.add(rootMesh);
      disposables.push({ geometry: rootGeo, material: trunkMat });

      // Foliage tiers
      const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 });
      const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.55 });
      const leafMat3 = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.5 });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });

      const tiers = [
        { y: 0.75, rx: 0.95, ry: 0.28, rz: 0.95, mat: leafMat1 },
        { y: 0.95, rx: 0.75, ry: 0.25, rz: 0.75, mat: leafMat2 },
        { y: 1.15, rx: 0.52, ry: 0.22, rz: 0.52, mat: leafMat3 },
        { y: 1.30, rx: 0.32, ry: 0.18, rz: 0.32, mat: leafMat3 }
      ];
      tiers.forEach(t => {
        const geo = new THREE.BoxGeometry(t.rx, t.ry, t.rz);
        const m = new THREE.Mesh(geo, t.mat);
        m.position.y = t.y;
        treeGroup.add(m);
        disposables.push({ geometry: geo, material: t.mat });
      });

      // Internal bioluminescent lantern cube
      const lanternGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const lanternMesh = new THREE.Mesh(lanternGeo, glowMat);
      lanternMesh.position.set(0.12, 0.82, 0.12);
      treeGroup.add(lanternMesh);
      disposables.push({ geometry: lanternGeo, material: glowMat });

      // 3. Floating rising spores
      const sporeCount = 20;
      const sporeGeo = new THREE.BufferGeometry();
      const sporePositions = new Float32Array(sporeCount * 3);
      const sporeSpeeds: number[] = [];

      for (let i = 0; i < sporeCount; i++) {
        sporePositions[i * 3] = (Math.random() - 0.5) * 1.5;
        sporePositions[i * 3 + 1] = Math.random() * 1.5 - 0.5;
        sporePositions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
        sporeSpeeds.push(0.0015 + Math.random() * 0.0025);
      }
      sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePositions, 3));
      const sporeMat = new THREE.PointsMaterial({
        color: 0x86efac,
        size: 0.045,
        transparent: true,
        opacity: 0.85
      });
      const sporePoints = new THREE.Points(sporeGeo, sporeMat);
      dioramaGroup.add(sporePoints);
      disposables.push({ geometry: sporeGeo, material: sporeMat });

      updateCallbacks.push((time) => {
        const pos = sporeGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < sporeCount; i++) {
          pos[i * 3 + 1] += sporeSpeeds[i];
          pos[i * 3] += Math.sin(time * 0.8 + i) * 0.001;
          if (pos[i * 3 + 1] > 1.2) {
            pos[i * 3 + 1] = -0.6;
          }
        }
        sporeGeo.attributes.position.needsUpdate = true;
      });
    }

    // =========================================================================
    // DIORAMA 2: CHRONOS — 3D Mechanical Chronometer with Rotating Hands & Gears
    // =========================================================================
    else if (instrumentId === 'chronos') {
      // 1. Stepped Brass Pedestal
      const baseGeo = new THREE.CylinderGeometry(1.1, 1.25, 0.25, 32);
      const brassMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.35,
        metalness: 0.85
      });
      const baseMesh = new THREE.Mesh(baseGeo, brassMat);
      baseMesh.position.y = -0.7;
      dioramaGroup.add(baseMesh);
      disposables.push({ geometry: baseGeo, material: brassMat });

      // Perimeter glowing ring
      const ringGeo = new THREE.TorusGeometry(1.05, 0.02, 16, 48);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = -0.58;
      dioramaGroup.add(ringMesh);
      disposables.push({ geometry: ringGeo, material: ringMat });

      // 2. Arch Frame
      const archGeo = new THREE.TorusGeometry(0.85, 0.06, 16, 48, Math.PI);
      const archMesh = new THREE.Mesh(archGeo, brassMat);
      archMesh.rotation.z = Math.PI;
      archMesh.position.y = 0.15;
      dioramaGroup.add(archMesh);
      disposables.push({ geometry: archGeo, material: brassMat });

      // Clock housing
      const housingGeo = new THREE.CylinderGeometry(0.78, 0.78, 0.22, 36);
      const housingMesh = new THREE.Mesh(housingGeo, brassMat);
      housingMesh.rotation.x = Math.PI / 2;
      housingMesh.position.y = 0.15;
      dioramaGroup.add(housingMesh);
      disposables.push({ geometry: housingGeo, material: brassMat });

      // Clock face (dark obsidian with glowing tick ring)
      const faceGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.02, 32);
      const faceMat = new THREE.MeshStandardMaterial({
        color: 0x051307,
        roughness: 0.2,
        metalness: 0.9
      });
      const faceMesh = new THREE.Mesh(faceGeo, faceMat);
      faceMesh.rotation.x = Math.PI / 2;
      faceMesh.position.set(0, 0.15, 0.115);
      dioramaGroup.add(faceMesh);
      disposables.push({ geometry: faceGeo, material: faceMat });

      // 12 Clock Hour Ticks
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12;
        const tickGeo = new THREE.BoxGeometry(0.02, 0.08, 0.02);
        const tickMat = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xfef08a : 0x4ade80 });
        const tick = new THREE.Mesh(tickGeo, tickMat);
        tick.position.set(Math.cos(a) * 0.58, 0.15 + Math.sin(a) * 0.58, 0.13);
        tick.rotation.z = a;
        dioramaGroup.add(tick);
        disposables.push({ geometry: tickGeo, material: tickMat });
      }

      // Hands Group
      const handsGroup = new THREE.Group();
      handsGroup.position.set(0, 0.15, 0.14);
      dioramaGroup.add(handsGroup);

      // Hour hand
      const hourGeo = new THREE.BoxGeometry(0.04, 0.32, 0.02);
      const hourMesh = new THREE.Mesh(hourGeo, brassMat);
      hourMesh.position.y = 0.14;
      const hourPivot = new THREE.Group();
      hourPivot.add(hourMesh);
      handsGroup.add(hourPivot);
      disposables.push({ geometry: hourGeo, material: brassMat });

      // Minute hand
      const minGeo = new THREE.BoxGeometry(0.025, 0.48, 0.02);
      const minMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const minMesh = new THREE.Mesh(minGeo, minMat);
      minMesh.position.y = 0.22;
      const minPivot = new THREE.Group();
      minPivot.add(minMesh);
      handsGroup.add(minPivot);
      disposables.push({ geometry: minGeo, material: minMat });

      // Second hand
      const secGeo = new THREE.BoxGeometry(0.012, 0.55, 0.02);
      const secMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
      const secMesh = new THREE.Mesh(secGeo, secMat);
      secMesh.position.y = 0.24;
      const secPivot = new THREE.Group();
      secPivot.add(secMesh);
      handsGroup.add(secPivot);
      disposables.push({ geometry: secGeo, material: secMat });

      // Center gold cap
      const capGeo = new THREE.SphereGeometry(0.05, 16, 16);
      const capMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      handsGroup.add(capMesh);
      disposables.push({ geometry: capGeo, material: capMat });

      // Outer floating gear ring
      const gearRingGeo = new THREE.TorusGeometry(0.92, 0.015, 12, 48);
      const gearRingMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.6
      });
      const gearRingMesh = new THREE.Mesh(gearRingGeo, gearRingMat);
      gearRingMesh.position.set(0, 0.15, 0.05);
      dioramaGroup.add(gearRingMesh);
      disposables.push({ geometry: gearRingGeo, material: gearRingMat });

      updateCallbacks.push((time) => {
        // Slow natural sweep for hours and minutes, deliberate calm tick for seconds
        hourPivot.rotation.z = -time * 0.04;
        minPivot.rotation.z = -time * 0.2;
        secPivot.rotation.z = -Math.floor(time * 1.0) * (Math.PI / 30);
        gearRingMesh.rotation.z = time * 0.05;
      });
    }

    // =========================================================================
    // DIORAMA 3: GROVE — Floating Terrain Sanctuary with 3 Diverse Voxel Trees
    // =========================================================================
    else if (instrumentId === 'grove') {
      // 1. Floating earth chunk with strata
      const islandGeo = new THREE.BoxGeometry(2.1, 0.35, 2.1);
      const soilMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
      const islandMesh = new THREE.Mesh(islandGeo, soilMat);
      islandMesh.position.y = -0.65;
      dioramaGroup.add(islandMesh);
      disposables.push({ geometry: islandGeo, material: soilMat });

      // Rock under-crust (tapered inverted pyramid base)
      const underGeo = new THREE.ConeGeometry(1.2, 0.6, 4);
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.95 });
      const underMesh = new THREE.Mesh(underGeo, rockMat);
      underMesh.rotation.y = Math.PI / 4;
      underMesh.rotation.x = Math.PI;
      underMesh.position.y = -1.1;
      dioramaGroup.add(underMesh);
      disposables.push({ geometry: underGeo, material: rockMat });

      // Lush moss top layer
      const grassGeo = new THREE.BoxGeometry(2.12, 0.08, 2.12);
      const grassMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85 });
      const grassMesh = new THREE.Mesh(grassGeo, grassMat);
      grassMesh.position.y = -0.44;
      dioramaGroup.add(grassMesh);
      disposables.push({ geometry: grassGeo, material: grassMat });

      // 2. TREE 1 (Mature Oak - Center)
      const oakTrunk = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.8, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x4e342e })
      );
      oakTrunk.position.set(0, 0, 0);
      dioramaGroup.add(oakTrunk);
      disposables.push({ geometry: oakTrunk.geometry, material: oakTrunk.material });

      const oakLeaves = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.65, 0.85),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 })
      );
      oakLeaves.position.set(0, 0.55, 0);
      dioramaGroup.add(oakLeaves);
      disposables.push({ geometry: oakLeaves.geometry, material: oakLeaves.material });

      // 3. TREE 2 (Evergreen Pine - Left)
      const pineTrunk = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.6, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x3e2723 })
      );
      pineTrunk.position.set(-0.65, -0.1, -0.2);
      dioramaGroup.add(pineTrunk);
      disposables.push({ geometry: pineTrunk.geometry, material: pineTrunk.material });

      const pineTiers = [
        { y: 0.25, s: 0.55 },
        { y: 0.45, s: 0.42 },
        { y: 0.65, s: 0.28 }
      ];
      pineTiers.forEach(t => {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(t.s, 0.18, t.s),
          new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.65 })
        );
        m.position.set(-0.65, t.y, -0.2);
        dioramaGroup.add(m);
        disposables.push({ geometry: m.geometry, material: m.material });
      });

      // 4. TREE 3 (Cherry Blossom - Right)
      const cherryTrunk = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.65, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x5d4037 })
      );
      cherryTrunk.position.set(0.65, -0.08, 0.2);
      dioramaGroup.add(cherryTrunk);
      disposables.push({ geometry: cherryTrunk.geometry, material: cherryTrunk.material });

      const cherryLeaves = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.5, 0.72),
        new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.6 })
      );
      cherryLeaves.position.set(0.65, 0.45, 0.2);
      dioramaGroup.add(cherryLeaves);
      disposables.push({ geometry: cherryLeaves.geometry, material: cherryLeaves.material });

      // 5. Fireflies / Spores
      const ffCount = 12;
      const ffGeo = new THREE.BufferGeometry();
      const ffPos = new Float32Array(ffCount * 3);
      for (let i = 0; i < ffCount; i++) {
        ffPos[i * 3] = (Math.random() - 0.5) * 1.8;
        ffPos[i * 3 + 1] = Math.random() * 0.9;
        ffPos[i * 3 + 2] = (Math.random() - 0.5) * 1.8;
      }
      ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
      const ffMat = new THREE.PointsMaterial({ color: 0xfde047, size: 0.05 });
      const ffPoints = new THREE.Points(ffGeo, ffMat);
      dioramaGroup.add(ffPoints);
      disposables.push({ geometry: ffGeo, material: ffMat });

      updateCallbacks.push((time) => {
        dioramaGroup.position.y = Math.sin(time * 0.6) * 0.02;
        const pos = ffGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < ffCount; i++) {
          pos[i * 3 + 1] += Math.sin(time * 0.8 + i) * 0.001;
        }
        ffGeo.attributes.position.needsUpdate = true;
      });
    }

    // =========================================================================
    // DIORAMA 4: LOGS — Cybernetic Console with Dual Holographic Code Displays
    // =========================================================================
    else if (instrumentId === 'logs') {
      // 1. Tactical workstation deck
      const deckGeo = new THREE.BoxGeometry(2.1, 0.15, 1.4);
      const deckMat = new THREE.MeshStandardMaterial({ color: 0x07150a, roughness: 0.3, metalness: 0.8 });
      const deckMesh = new THREE.Mesh(deckGeo, deckMat);
      deckMesh.position.set(0, -0.65, 0);
      dioramaGroup.add(deckMesh);
      disposables.push({ geometry: deckGeo, material: deckMat });

      // Illuminated tactile keyboard deck
      const kbGeo = new THREE.BoxGeometry(1.2, 0.02, 0.45);
      const kbMat = new THREE.MeshStandardMaterial({ color: 0x052e16, roughness: 0.4 });
      const kbMesh = new THREE.Mesh(kbGeo, kbMat);
      kbMesh.position.set(0, -0.56, 0.25);
      dioramaGroup.add(kbMesh);
      disposables.push({ geometry: kbGeo, material: kbMat });

      // 2. Dual Angled Holographic Screens
      const { texture: screenTex1, update: updateScreen1 } = createLogsScreenTexture();
      const { texture: screenTex2, update: updateScreen2 } = createLogsScreenTexture();
      disposables.push({ material: new THREE.MeshBasicMaterial({ map: screenTex1 }) });
      disposables.push({ material: new THREE.MeshBasicMaterial({ map: screenTex2 }) });

      const screenGeo = new THREE.PlaneGeometry(0.9, 0.65);
      const screenMat1 = new THREE.MeshBasicMaterial({
        map: screenTex1,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const screen1 = new THREE.Mesh(screenGeo, screenMat1);
      screen1.position.set(-0.52, 0.05, -0.15);
      screen1.rotation.y = Math.PI / 10;
      dioramaGroup.add(screen1);
      disposables.push({ geometry: screenGeo, material: screenMat1 });

      const screenMat2 = new THREE.MeshBasicMaterial({
        map: screenTex2,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const screen2 = new THREE.Mesh(screenGeo, screenMat2);
      screen2.position.set(0.52, 0.05, -0.15);
      screen2.rotation.y = -Math.PI / 10;
      dioramaGroup.add(screen2);
      disposables.push({ geometry: screenGeo, material: screenMat2 });

      // Screen border bezels
      const frameMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
      [screen1, screen2].forEach(sc => {
        const bGeo = new THREE.EdgesGeometry(screenGeo);
        const line = new THREE.LineSegments(bGeo, frameMat);
        sc.add(line);
        disposables.push({ geometry: bGeo, material: frameMat });
      });

      // 3. Central Open Holographic Logbook
      const bookLeft = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 0.45),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, side: THREE.DoubleSide, roughness: 0.5 })
      );
      bookLeft.rotation.x = -Math.PI / 3;
      bookLeft.rotation.y = Math.PI / 12;
      bookLeft.position.set(-0.18, -0.38, 0.1);
      dioramaGroup.add(bookLeft);
      disposables.push({ geometry: bookLeft.geometry, material: bookLeft.material });

      const bookRight = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 0.45),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, side: THREE.DoubleSide, roughness: 0.5 })
      );
      bookRight.rotation.x = -Math.PI / 3;
      bookRight.rotation.y = -Math.PI / 12;
      bookRight.position.set(0.18, -0.38, 0.1);
      dioramaGroup.add(bookRight);
      disposables.push({ geometry: bookRight.geometry, material: bookRight.material });

      updateCallbacks.push((time) => {
        updateScreen1(time);
        updateScreen2(time + 1.5);
      });
    }

    // =========================================================================
    // DIORAMA 5: POMO — Glass Incubation Pod with Pulsing Animated Cyber Core
    // =========================================================================
    else if (instrumentId === 'pomo') {
      // 1. Industrial Stepped Base
      const podBaseGeo = new THREE.CylinderGeometry(0.95, 1.15, 0.3, 32);
      const podBaseMat = new THREE.MeshStandardMaterial({ color: 0x0b1d0c, roughness: 0.3, metalness: 0.8 });
      const podBase = new THREE.Mesh(podBaseGeo, podBaseMat);
      podBase.position.y = -0.7;
      dioramaGroup.add(podBase);
      disposables.push({ geometry: podBaseGeo, material: podBaseMat });

      // Glowing base track
      const baseTrack = new THREE.Mesh(
        new THREE.TorusGeometry(0.96, 0.02, 16, 36),
        new THREE.MeshBasicMaterial({ color: 0x4ade80 })
      );
      baseTrack.rotation.x = Math.PI / 2;
      baseTrack.position.y = -0.58;
      dioramaGroup.add(baseTrack);
      disposables.push({ geometry: baseTrack.geometry, material: baseTrack.material });

      // 2. Glass Incubation Cylinder
      const podGlassGeo = new THREE.CylinderGeometry(0.85, 0.85, 1.4, 32, 1, true);
      const podGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0x052e16,
        transparent: true,
        opacity: 0.3,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.8,
        ior: 1.4,
        side: THREE.DoubleSide
      });
      const podGlass = new THREE.Mesh(podGlassGeo, podGlassMat);
      podGlass.position.y = 0.12;
      dioramaGroup.add(podGlass);
      disposables.push({ geometry: podGlassGeo, material: podGlassMat });

      // 3. Top Suspension Cap
      const podTopGeo = new THREE.CylinderGeometry(0.95, 0.88, 0.22, 32);
      const podTop = new THREE.Mesh(podTopGeo, podBaseMat);
      podTop.position.y = 0.92;
      dioramaGroup.add(podTop);
      disposables.push({ geometry: podTopGeo, material: podBaseMat });

      // 4. Floating Animated Core with Cute Face
      const { texture: pomoTex, update: updatePomoFace } = createPomoFaceTexture();
      disposables.push({ material: new THREE.MeshBasicMaterial({ map: pomoTex }) });

      const coreGroup = new THREE.Group();
      coreGroup.position.set(0, 0.15, 0);
      dioramaGroup.add(coreGroup);

      const coreBoxGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
      const coreBoxMat = new THREE.MeshStandardMaterial({
        color: 0x052e16,
        roughness: 0.4,
        metalness: 0.5
      });
      const coreBox = new THREE.Mesh(coreBoxGeo, coreBoxMat);
      coreGroup.add(coreBox);
      disposables.push({ geometry: coreBoxGeo, material: coreBoxMat });

      const facePlaneGeo = new THREE.PlaneGeometry(0.52, 0.52);
      const facePlaneMat = new THREE.MeshBasicMaterial({ map: pomoTex });
      const facePlane = new THREE.Mesh(facePlaneGeo, facePlaneMat);
      facePlane.position.z = 0.28;
      coreGroup.add(facePlane);
      disposables.push({ geometry: facePlaneGeo, material: facePlaneMat });

      // Floating holographic gyro ring
      const gyroGeo = new THREE.TorusGeometry(0.72, 0.012, 16, 48);
      const gyroMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.7 });
      const gyroRing = new THREE.Mesh(gyroGeo, gyroMat);
      gyroRing.rotation.x = Math.PI / 2.4;
      coreGroup.add(gyroRing);
      disposables.push({ geometry: gyroGeo, material: gyroMat });

      updateCallbacks.push((time) => {
        updatePomoFace(time);
        // Quiet, restrained biological pulsing
        coreGroup.position.y = 0.15 + Math.sin(time * 0.7) * 0.03;
        const breath = 1.0 + Math.sin(time * 0.7) * 0.02;
        coreGroup.scale.set(breath, breath, breath);
        gyroRing.rotation.z = time * 0.15;
      });
    }

    // =========================================================================
    // DIORAMA 6: ANI — 3D Botanical Companion Robot with Interactive Head-Tracking
    // =========================================================================
    else if (instrumentId === 'ani') {
      // 1. Hexagonal Launchpad
      const padGeo = new THREE.CylinderGeometry(1.1, 1.2, 0.22, 6);
      const padMat = new THREE.MeshStandardMaterial({ color: 0x0b1d0c, roughness: 0.35, metalness: 0.8 });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.y = -0.7;
      dioramaGroup.add(pad);
      disposables.push({ geometry: padGeo, material: padMat });

      // Neon pad perimeter
      const padRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.05, 0.02, 16, 6),
        new THREE.MeshBasicMaterial({ color: 0x4ade80 })
      );
      padRing.rotation.x = Math.PI / 2;
      padRing.position.y = -0.58;
      dioramaGroup.add(padRing);
      disposables.push({ geometry: padRing.geometry, material: padRing.material });

      // 2. Robot Body Chassis
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xdde5da,
        roughness: 0.3,
        metalness: 0.2
      });
      const bodyGeo = new THREE.BoxGeometry(0.72, 0.58, 0.62);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.set(0, -0.28, 0);
      dioramaGroup.add(body);
      disposables.push({ geometry: bodyGeo, material: bodyMat });

      // Dark chest panel
      const chestMat = new THREE.MeshBasicMaterial({ color: 0x052e16 });
      const chest = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.32), chestMat);
      chest.position.set(0, -0.28, 0.315);
      dioramaGroup.add(chest);
      disposables.push({ geometry: chest.geometry, material: chestMat });

      // 3. Floating Head Group (Interactive cursor tracking!)
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.28, 0);
      dioramaGroup.add(headGroup);

      const headGeo = new THREE.BoxGeometry(0.85, 0.72, 0.75);
      const head = new THREE.Mesh(headGeo, bodyMat);
      headGroup.add(head);
      disposables.push({ geometry: headGeo, material: bodyMat });

      // Cute Face Screen
      const { texture: aniTex, update: updateAniFace } = createAniFaceTexture();
      disposables.push({ material: new THREE.MeshBasicMaterial({ map: aniTex }) });

      const screenFaceGeo = new THREE.PlaneGeometry(0.72, 0.58);
      const screenFaceMat = new THREE.MeshBasicMaterial({ map: aniTex });
      const screenFace = new THREE.Mesh(screenFaceGeo, screenFaceMat);
      screenFace.position.set(0, 0, 0.38);
      headGroup.add(screenFace);
      disposables.push({ geometry: screenFaceGeo, material: screenFaceMat });

      // Ear knobs
      const earMat = new THREE.MeshStandardMaterial({ color: 0x166534, metalness: 0.7 });
      const earGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16);
      const leftEar = new THREE.Mesh(earGeo, earMat);
      leftEar.rotation.z = Math.PI / 2;
      leftEar.position.set(-0.46, 0, 0);
      headGroup.add(leftEar);

      const rightEar = new THREE.Mesh(earGeo, earMat);
      rightEar.rotation.z = Math.PI / 2;
      rightEar.position.set(0.46, 0, 0);
      headGroup.add(rightEar);
      disposables.push({ geometry: earGeo, material: earMat });

      // 4. Sprouting Green Pixel Leaf Antenna
      const stemGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.28, 12);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x15803d });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(0, 0.48, 0);
      headGroup.add(stem);
      disposables.push({ geometry: stemGeo, material: stemMat });

      // Two cute leaves
      const leafGeo = new THREE.BoxGeometry(0.24, 0.04, 0.14);
      const leafMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
      const leftLeaf = new THREE.Mesh(leafGeo, leafMat);
      leftLeaf.rotation.z = Math.PI / 5;
      leftLeaf.position.set(-0.1, 0.62, 0);
      headGroup.add(leftLeaf);

      const rightLeaf = new THREE.Mesh(leafGeo, leafMat);
      rightLeaf.rotation.z = -Math.PI / 5;
      rightLeaf.position.set(0.1, 0.62, 0);
      headGroup.add(rightLeaf);
      disposables.push({ geometry: leafGeo, material: leafMat });

      updateCallbacks.push((time, mouse) => {
        updateAniFace(time);
        // Head bobs calmly and tracks mouse
        headGroup.position.y = 0.28 + Math.sin(time * 0.8) * 0.012;
        const targetRotY = (mouse?.x ?? 0) * 0.35;
        const targetRotX = -(mouse?.y ?? 0) * 0.2;
        headGroup.rotation.y += (targetRotY - headGroup.rotation.y) * 0.08;
        headGroup.rotation.x += (targetRotX - headGroup.rotation.x) * 0.08;

        // Leaf sways gently in breeze
        leftLeaf.rotation.z = Math.PI / 5 + Math.sin(time * 1.2) * 0.03;
        rightLeaf.rotation.z = -Math.PI / 5 - Math.sin(time * 1.2) * 0.03;
      });
    }

  return { scene, camera, dioramaGroup, disposables, updateCallbacks };
}

interface SubscriberData {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  isHovered: boolean;
  mouse: { x: number; y: number; targetX: number; targetY: number };
  isVisible: boolean;
  observer: IntersectionObserver;
}

/**
 * Shared Diorama Manager
 * Renders all 6 miniature 3D dioramas using a SINGLE shared THREE.WebGLRenderer.
 * Each instrument blits its frame buffer into an HTML 2D canvas context.
 * Result: 6 real-time 3D models with 0 static images, using EXACTLY 1 WebGL context total!
 */
class SharedDioramaManager {
  private renderer: THREE.WebGLRenderer | null = null;
  private scenes: Map<InstrumentId, DioramaSceneData> = new Map();
  private subscribers: Map<InstrumentId, SubscriberData> = new Map();
  private animId: number | null = null;
  private clock = new THREE.Clock();
  private untrackWebGL: (() => void) | null = null;

  register(
    instrumentId: InstrumentId,
    canvas: HTMLCanvasElement,
    isHovered: boolean
  ): () => void {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return () => {};

    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(320, 240, false);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      this.untrackWebGL = trackWebGLRenderer('SharedMiniDioramas');
    }

    if (!this.scenes.has(instrumentId)) {
      this.scenes.set(instrumentId, createDioramaScene(instrumentId));
    }

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const observer = new IntersectionObserver(
      ([entry]) => {
        const sub = this.subscribers.get(instrumentId);
        if (sub) {
          sub.isVisible = entry.isIntersecting && !document.hidden;
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    this.subscribers.set(instrumentId, {
      canvas,
      ctx,
      isHovered,
      mouse,
      isVisible: true,
      observer
    });

    if (!this.animId) {
      this.startLoop();
    }

    return () => {
      observer.disconnect();
      this.subscribers.delete(instrumentId);
      if (this.subscribers.size === 0) {
        this.cleanup();
      }
    };
  }

  setHovered(instrumentId: InstrumentId, isHovered: boolean) {
    const sub = this.subscribers.get(instrumentId);
    if (sub) {
      sub.isHovered = isHovered;
    }
  }

  setMouse(instrumentId: InstrumentId, x: number, y: number) {
    const sub = this.subscribers.get(instrumentId);
    if (sub) {
      sub.mouse.targetX = x;
      sub.mouse.targetY = y;
    }
  }

  private startLoop() {
    const loop = () => {
      this.animId = requestAnimationFrame(loop);
      if (this.subscribers.size === 0 || !this.renderer) return;

      const time = this.clock.getElapsedTime();

      for (const [id, sub] of this.subscribers.entries()) {
        if (!sub.isVisible) continue;
        const sceneData = this.scenes.get(id);
        if (!sceneData) continue;

        // Smooth mouse damping
        sub.mouse.x += (sub.mouse.targetX - sub.mouse.x) * 0.1;
        sub.mouse.y += (sub.mouse.targetY - sub.mouse.y) * 0.1;

        // Base diorama subtle rotation + interactive mouse parallax
        const baseRotY = Math.sin(time * 0.35) * 0.06;
        sceneData.dioramaGroup.rotation.y = baseRotY + sub.mouse.x * 0.25;
        sceneData.dioramaGroup.rotation.x = sub.mouse.y * 0.15;

        // When card is hovered, pop forward slightly
        const targetScale = sub.isHovered ? 1.08 : 1.0;
        sceneData.dioramaGroup.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.1
        );

        // Run instrument specific updates
        sceneData.updateCallbacks.forEach(cb => cb(time, sub.mouse));

        // Render scene on the shared WebGLRenderer
        this.renderer.render(sceneData.scene, sceneData.camera);

        // Blit directly to the card's 2D canvas
        sub.ctx.clearRect(0, 0, sub.canvas.width, sub.canvas.height);
        sub.ctx.drawImage(this.renderer.domElement, 0, 0, sub.canvas.width, sub.canvas.height);
      }
    };

    this.animId = requestAnimationFrame(loop);
  }

  private cleanup() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    for (const sceneData of this.scenes.values()) {
      sceneData.disposables.forEach(d => {
        d.geometry?.dispose();
        if (Array.isArray(d.material)) d.material.forEach(m => m.dispose());
        else d.material?.dispose();
      });
    }
    this.scenes.clear();

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    if (this.untrackWebGL) {
      this.untrackWebGL();
      this.untrackWebGL = null;
    }
  }
}

const dioramaManager = new SharedDioramaManager();

export const MiniDioramaCanvas: React.FC<MiniDioramaCanvasProps> = ({
  instrumentId,
  isHovered = false,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    return dioramaManager.register(instrumentId, canvas, isHovered);
  }, [instrumentId]);

  useEffect(() => {
    dioramaManager.setHovered(instrumentId, isHovered);
  }, [instrumentId, isHovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    dioramaManager.setMouse(instrumentId, Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
  };

  const handleMouseLeave = () => {
    dioramaManager.setMouse(instrumentId, 0, 0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`w-full h-full relative flex items-center justify-center overflow-hidden select-none ${className}`}
      aria-label={`3D ${instrumentId.toUpperCase()} Miniature Diorama`}
    >
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="w-full h-full object-cover pointer-events-none"
      />
    </div>
  );
};

export default MiniDioramaCanvas;

