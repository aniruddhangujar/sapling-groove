import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TreeType, SaplingGoal } from '../types';
import { generateVoxelTreeData, buildInstancedVoxelTreeMesh } from '../utils/voxelTreeBuilder';
import { trackWebGLRenderer } from '../utils/webglTracker';

interface Props {
  className?: string;
  variant?: 'hero' | 'ambient' | 'grove';
  goal?: SaplingGoal;
  treeType?: TreeType;
  progress?: number;
  interactiveOrbit?: boolean;
  onReady?: () => void;
}

/**
 * Creates an organic leaf/spore texture for interactive biological particles
 */
function createLeafTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Stylized botanical leaf shape with glowing vein
    ctx.clearRect(0, 0, 64, 64);
    ctx.save();
    ctx.translate(32, 32);
    ctx.rotate(Math.PI / 4);

    // Leaf body
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.3, 'rgba(74, 222, 128, 0.9)');
    grad.addColorStop(0.7, 'rgba(22, 163, 74, 0.6)');
    grad.addColorStop(1, 'rgba(4, 10, 4, 0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Central vein highlight
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const CyberBotanicalWorld: React.FC<Props> = ({
  className = '',
  variant = 'hero',
  goal,
  treeType,
  progress,
  interactiveOrbit = true,
  onReady
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(true);
  const mouseRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    pointerWorld: new THREE.Vector3(999, 999, 0)
  });

  const activeType = treeType || goal?.type || TreeType.OAK;
  const activeProgress = progress ?? (goal ? goal.accruedMinutes / Math.max(1, goal.totalTargetMinutes) : 1.0);
  const activeSeed = goal?.startDate || 42;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const width = mount.clientWidth || 380;
    const height = mount.clientHeight || 500;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null;
    if (variant === 'grove') {
      scene.fog = new THREE.FogExp2(0x040a04, 0.035);
    }

    // Camera
    const camera = new THREE.PerspectiveCamera(
      variant === 'grove' ? 44 : 38,
      width / height,
      0.1,
      100
    );
    if (variant === 'grove') {
      camera.position.set(0, 1.8, 9.2);
    } else {
      camera.position.set(0, 0.42, 5.8);
    }

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    const initialPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(initialPixelRatio);
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    // Track WebGLRenderer creation/disposal
    const untrackWebGL = trackWebGLRenderer(`CyberBotanicalWorld-${variant}`);

    // World Group
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] }[] = [];

    // --- LIGHTING INFRASTRUCTURE ---
    // Deep emerald ambient allowing crisp geometric facet contrast
    const ambientLight = new THREE.AmbientLight(0x14532d, 0.85);
    scene.add(ambientLight);

    // Warm downward directional sunlight matching the glowing ceiling ring
    const keyLight = new THREE.DirectionalLight(0xfef08a, 3.2);
    keyLight.position.set(0, 8, 2);
    scene.add(keyLight);

    // Overhead Volumetric Spotlight aligned with the central light shaft
    const topSpot = new THREE.SpotLight(0x86efac, 5.0, 24, Math.PI / 3.8, 0.35, 1.0);
    topSpot.position.set(0, 6.5, 0.5);
    topSpot.target.position.set(0, -0.5, 0);
    scene.add(topSpot);
    scene.add(topSpot.target);

    // Cyan Rim Light for crisp volumetric silhouette
    const rimLight = new THREE.DirectionalLight(0x2dd4bf, 1.8);
    rimLight.position.set(-4.5, -1, -4);
    scene.add(rimLight);

    // Warm Amber Pedestal Floor Bounce (gentle wet-floor reflection)
    const amberBaseLight = new THREE.PointLight(0xf59e0b, 0.6, 9);
    amberBaseLight.position.set(0, -2.4, 2.2);
    scene.add(amberBaseLight);

    // --- HERO CULTIVATION CHAMBER + 3D VOXEL SPECIMEN ---
    if (variant === 'hero') {

      // 2. CENTRAL HIGH-DENSITY 3D VOXEL SPECIMEN
      // Sits directly on the illuminated circular pedestal inside the chamber
      const voxels = generateVoxelTreeData(activeType, activeProgress, activeSeed, false, 0.075);
      const treeMesh = buildInstancedVoxelTreeMesh(voxels);
      treeMesh.position.set(0, -1.82, 0);
      treeMesh.scale.set(1.22, 1.22, 1.22);
      worldGroup.add(treeMesh);
      disposables.push({ geometry: treeMesh.geometry, material: treeMesh.material });

      // 3. INTERNAL BIOLUMINESCENT CANOPY LANTERNS (Warm golden inner glow)
      const coreLight1 = new THREE.PointLight(0xfde047, 5.2, 4.5, 1.1);
      coreLight1.position.set(0, 0.1, 0.35);
      worldGroup.add(coreLight1);

      const coreLight2 = new THREE.PointLight(0xf59e0b, 4.2, 4.0, 1.1);
      coreLight2.position.set(0, 0.65, -0.3);
      worldGroup.add(coreLight2);

      // 10. BOTANICAL DIVERSITY IN THE SURROUNDING WORLD
      // Render diverse tree species across background bio-terraces disappearing into atmospheric depth
      const bgTrees = [
        { type: TreeType.CHERRY_BLOSSOM, pos: [5.6, -0.2, -5.2], scale: 0.72, prog: 0.95, seed: 101 },
        { type: TreeType.SEQUOIA, pos: [-5.4, 0.6, -7.5], scale: 0.85, prog: 1.0, seed: 202 },
        { type: TreeType.WILLOW, pos: [-3.8, -1.2, -3.6], scale: 0.68, prog: 0.85, seed: 303 },
        { type: TreeType.PINE, pos: [-2.0, 1.2, -6.0], scale: 0.62, prog: 0.9, seed: 404 },
        { type: TreeType.MAPLE, pos: [7.2, -0.6, -6.8], scale: 0.7, prog: 0.9, seed: 505 },
        { type: TreeType.BONSAI, pos: [3.4, -1.3, -2.8], scale: 0.55, prog: 1.0, seed: 606 }
      ];

      bgTrees.forEach(bt => {
        const btVoxels = generateVoxelTreeData(bt.type, bt.prog, bt.seed, false, 0.09);
        const btMesh = buildInstancedVoxelTreeMesh(btVoxels);
        btMesh.position.set(bt.pos[0], bt.pos[1], bt.pos[2]);
        btMesh.scale.set(bt.scale, bt.scale, bt.scale);
        worldGroup.add(btMesh);
        disposables.push({ geometry: btMesh.geometry, material: btMesh.material });
      });

      // Subtle atmospheric biological depth glow (deep moss green, no wireframe)
      const distantAmbientDepth = new THREE.PointLight(0x064e3b, 1.8, 16);
      distantAmbientDepth.position.set(7.5, 0.5, -7.5);
      worldGroup.add(distantAmbientDepth);
    }

    // --- GROVE SANCTUARY WORLD (Alternative View) ---
    if (variant === 'grove') {
      const centralVoxels = generateVoxelTreeData(activeType, Math.max(activeProgress, 0.85), activeSeed, false, 0.08);
      const centralTree = buildInstancedVoxelTreeMesh(centralVoxels);
      centralTree.position.set(0, -1.2, 0);
      centralTree.scale.set(1.15, 1.15, 1.15);
      worldGroup.add(centralTree);
      disposables.push({ geometry: centralTree.geometry, material: centralTree.material });

      const leftVoxels = generateVoxelTreeData(TreeType.CEDAR, 0.9, 101, false, 0.08);
      const leftTree = buildInstancedVoxelTreeMesh(leftVoxels);
      leftTree.position.set(-3.6, -1.0, -2.8);
      worldGroup.add(leftTree);
      disposables.push({ geometry: leftTree.geometry, material: leftTree.material });

      const rightVoxels = generateVoxelTreeData(TreeType.CHERRY_BLOSSOM, 0.9, 202, false, 0.08);
      const rightTree = buildInstancedVoxelTreeMesh(rightVoxels);
      rightTree.position.set(3.8, -1.0, -3.2);
      worldGroup.add(rightTree);
      disposables.push({ geometry: rightTree.geometry, material: rightTree.material });

      const groundGeo = new THREE.CylinderGeometry(8, 9, 0.4, 48);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x061506,
        roughness: 0.8,
        metalness: 0.2
      });
      const groundMesh = new THREE.Mesh(groundGeo, groundMat);
      groundMesh.position.y = -1.4;
      worldGroup.add(groundMesh);
      disposables.push({ geometry: groundGeo, material: groundMat });
    }

    // --- INTERACTIVE BIOLOGICAL LEAF & SPORE PARTICLE SYSTEM ---
    // Floating leaves and spores that react to mouse/touch brushing!
    const leafCount = variant === 'hero' ? 140 : 80;
    const leafGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(leafCount * 3);
    const colors = new Float32Array(leafCount * 3);
    const velocities = new Float32Array(leafCount * 3); // vx, vy, vz
    const basePositions = new Float32Array(leafCount * 3);
    const speeds = new Float32Array(leafCount);
    const phases = new Float32Array(leafCount);
    const scales = new Float32Array(leafCount);

    const leafTexture = createLeafTexture();

    const colorEmerald = new THREE.Color(0x4ade80);
    const colorMint = new THREE.Color(0x86efac);
    const colorAmber = new THREE.Color(0xfbbf24);
    const colorGold = new THREE.Color(0xf59e0b);

    for (let i = 0; i < leafCount; i++) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * (variant === 'grove' ? 12.0 : 8.5);
      const y = (Math.random() - 0.5) * 6.5;
      const z = (Math.random() - 0.5) * (variant === 'grove' ? 10.0 : 6.0);

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      basePositions[i3] = x;
      basePositions[i3 + 1] = y;
      basePositions[i3 + 2] = z;

      velocities[i3] = 0;
      velocities[i3 + 1] = 0;
      velocities[i3 + 2] = 0;

      const rnd = Math.random();
      const c = rnd > 0.75 ? colorAmber : (rnd > 0.5 ? colorGold : (rnd > 0.25 ? colorEmerald : colorMint));
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;

      // Calmed ambient biological spore drift
      speeds[i] = 0.0012 + Math.random() * 0.0028;
      phases[i] = Math.random() * Math.PI * 2;
      scales[i] = 0.15 + Math.random() * 0.2;
    }

    leafGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    leafGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const leafMat = new THREE.PointsMaterial({
      size: 0.24,
      map: leafTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9
    });

    const leafParticles = new THREE.Points(leafGeo, leafMat);
    scene.add(leafParticles);
    disposables.push({ geometry: leafGeo, material: leafMat });

    // Helper: update pointer 3D world position for leaf brushing
    const raycaster = new THREE.Raycaster();
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const tempVec = new THREE.Vector3();

    const updatePointerWorld = (clientX: number, clientY: number) => {
      const rect = mount.getBoundingClientRect();
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
      raycaster.ray.intersectPlane(planeZ, tempVec);
      if (tempVec) {
        mouseRef.current.pointerWorld.copy(tempVec);

        // BRUSHING LEAF PARTICLES: Apply interactive impulse force
        const brushRadius = 2.4;
        for (let i = 0; i < leafCount; i++) {
          const i3 = i * 3;
          const px = positions[i3];
          const py = positions[i3 + 1];
          const pz = positions[i3 + 2];

          const dx = px - tempVec.x;
          const dy = py - tempVec.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < brushRadius * brushRadius) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / brushRadius) * 0.14;
            // Push outward and slightly upward with organic flutter
            velocities[i3] += (dx / Math.max(0.01, dist)) * force;
            velocities[i3 + 1] += (dy / Math.max(0.01, dist)) * force + 0.035;
            velocities[i3 + 2] += (Math.random() - 0.5) * force * 0.5;
          }
        }
      }
    };

    // Pointer Event Handlers
    const handleMouseDown = (e: MouseEvent) => {
      if (!interactiveOrbit) return;
      mouseRef.current.isDragging = true;
      mouseRef.current.lastX = e.clientX;
      mouseRef.current.lastY = e.clientY;
      updatePointerWorld(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      updatePointerWorld(e.clientX, e.clientY);

      if (mouseRef.current.isDragging && interactiveOrbit) {
        const deltaX = e.clientX - mouseRef.current.lastX;
        const deltaY = e.clientY - mouseRef.current.lastY;
        mouseRef.current.lastX = e.clientX;
        mouseRef.current.lastY = e.clientY;
        mouseRef.current.targetX += deltaX * 0.012;
        mouseRef.current.targetY += deltaY * 0.012;
      } else {
        const rect = mount.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        if (nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1) {
          mouseRef.current.targetX = nx * 0.35;
          mouseRef.current.targetY = ny * 0.18;
        }
      }
    };

    const handleMouseUp = () => {
      mouseRef.current.isDragging = false;
    };

    mount.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Touch Support for Mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      mouseRef.current.isDragging = true;
      mouseRef.current.lastX = e.touches[0].clientX;
      mouseRef.current.lastY = e.touches[0].clientY;
      updatePointerWorld(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      updatePointerWorld(e.touches[0].clientX, e.touches[0].clientY);

      if (mouseRef.current.isDragging && interactiveOrbit) {
        const deltaX = e.touches[0].clientX - mouseRef.current.lastX;
        const deltaY = e.touches[0].clientY - mouseRef.current.lastY;
        mouseRef.current.lastX = e.touches[0].clientX;
        mouseRef.current.lastY = e.touches[0].clientY;
        mouseRef.current.targetX += deltaX * 0.012;
        mouseRef.current.targetY += deltaY * 0.012;
      }
    };

    const handleTouchEnd = () => {
      mouseRef.current.isDragging = false;
    };

    mount.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    // Container ResizeObserver Handler
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rawW = entry.contentRect.width;
        const rawH = entry.contentRect.height;
        const w = Math.floor(rawW);
        const h = Math.floor(rawH);
        if (w <= 0 || h <= 0) return;

        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        const pr = Math.min(window.devicePixelRatio || 1, 2);
        if (renderer.getPixelRatio() !== pr) {
          renderer.setPixelRatio(pr);
        }
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(mount);

    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisibleRef.current = entry.isIntersecting && !document.hidden;
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(mount);

    // Static single render if reduced motion
    if (prefersReducedMotion) {
      if (renderer.domElement.width > 0 && renderer.domElement.height > 0) {
        renderer.render(scene, camera);
      }
      return () => {
        mount.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        mount.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        resizeObserver.disconnect();
        document.removeEventListener('visibilitychange', handleVisibility);
        observer.disconnect();

        leafTexture.dispose();
        disposables.forEach(d => {
          d.geometry?.dispose();
          if (Array.isArray(d.material)) d.material.forEach(m => m.dispose());
          else d.material?.dispose();
        });
        renderer.dispose();
        untrackWebGL();
        if (mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
      };
    }

    // Animation Loop
    let animId: number;
    const startTime = performance.now();
    let hasReportedReady = false;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isVisibleRef.current) return;
      if (renderer.domElement.width <= 0 || renderer.domElement.height <= 0) return;

      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Smooth pointer parallax easing
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.045;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.045;

      worldGroup.rotation.y = mouseRef.current.x;
      worldGroup.rotation.x = Math.max(-0.2, Math.min(0.25, -mouseRef.current.y));

      // Organic wind sway and breathing
      const sway = Math.sin(elapsedTime * 1.1) * 0.015;
      worldGroup.rotation.z = sway;

      // Drifting and Brushable Leaves Simulation
      const posAttr = leafGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < leafCount; i++) {
        const i3 = i * 3;

        // Apply velocities from brush impulse
        arr[i3] += velocities[i3];
        arr[i3 + 1] += velocities[i3 + 1];
        arr[i3 + 2] += velocities[i3 + 2];

        // Velocity damping
        velocities[i3] *= 0.92;
        velocities[i3 + 1] *= 0.92;
        velocities[i3 + 2] *= 0.92;

        // Ambient gentle upward drift & sine sway
        arr[i3 + 1] += speeds[i];
        arr[i3] += Math.sin(elapsedTime * 0.8 + phases[i]) * 0.003;

        // Wrap around ceiling to bottom
        if (arr[i3 + 1] > 3.8) {
          arr[i3 + 1] = -2.8;
          arr[i3] = (Math.random() - 0.5) * (variant === 'grove' ? 12.0 : 8.0);
          velocities[i3] = 0;
          velocities[i3 + 1] = 0;
        }
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);

      if (!hasReportedReady) {
        hasReportedReady = true;
        onReady?.();
      }
    };

    animId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      mount.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      mount.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      observer.disconnect();

      leafTexture.dispose();
      disposables.forEach(d => {
        d.geometry?.dispose();
        if (Array.isArray(d.material)) d.material.forEach(m => m.dispose());
        else d.material?.dispose();
      });
      renderer.dispose();
      untrackWebGL();

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [variant, activeType, activeProgress, activeSeed, interactiveOrbit]);

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing ${className}`}
      role="region"
      aria-label="3D Cyber-Botanical Voxel Sanctuary"
    />
  );
};

export default CyberBotanicalWorld;
