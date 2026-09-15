import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { SaplingGoal } from '../types';
import { generateVoxelTreeData, buildInstancedVoxelTreeMesh } from '../utils/voxelTreeBuilder';
import { trackWebGLRenderer } from '../utils/webglTracker';

interface Props {
  goal: SaplingGoal;
  size?: number;
  animate?: boolean;
  overrideAccruedMinutes?: number;
  interactiveOrbit?: boolean;
  cameraDistance?: number;
  className?: string;
  isActive?: boolean;
  onActivate?: () => void;
}

const VoxelTreeCanvas: React.FC<Props> = ({
  goal,
  size = 220,
  animate = true,
  overrideAccruedMinutes,
  interactiveOrbit = true,
  cameraDistance = 4.2,
  className = '',
  isActive,
  onActivate
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const isVisibleRef = useRef(true);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isDragging: false, lastX: 0, lastY: 0 });

  const shouldRender = (isActive !== undefined ? isActive : true) && isInView;

  // Viewport intersection observer to mount WebGLRenderer strictly on-demand
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInView(entry.isIntersecting);
      },
      { rootMargin: '250px' }
    );
    observer.observe(mount);

    return () => observer.disconnect();
  }, []);

  const seed = useMemo(() => {
    let s = 0;
    for (let i = 0; i < goal.id.length; i++) s += goal.id.charCodeAt(i);
    return s || 42;
  }, [goal.id]);

  const progress = useMemo(() => {
    const accrued = overrideAccruedMinutes ?? goal.accruedMinutes;
    return Math.min(1.0, Math.max(0.0, accrued / Math.max(1, goal.totalTargetMinutes)));
  }, [goal.accruedMinutes, goal.totalTargetMinutes, overrideAccruedMinutes]);

  const isWilting = goal.health < 40;

  useEffect(() => {
    if (!shouldRender) return;
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const width = mount.clientWidth || size;
    const height = mount.clientHeight || size;

    // Three.js Scene
    const scene = new THREE.Scene();
    scene.background = null;

    // Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 1.1, cameraDistance);

    // Renderer
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
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    const untrackWebGL = trackWebGLRenderer(`VoxelTreeCanvas-${goal.type}`);

    // Tree Group
    const treeGroup = new THREE.Group();
    scene.add(treeGroup);

    // --- CINEMATIC DIRECTIONAL & BIOLOGICAL LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0x0d2812, 2.2);
    scene.add(ambientLight);

    // Overhead Key Light (creates crisp voxel facet highlights and cast shadows)
    const keyLight = new THREE.DirectionalLight(0xdcfce7, 2.8);
    keyLight.position.set(-3, 6, 4);
    scene.add(keyLight);

    // Cyber-Organic Cyan Rim Light (defines silhouette edges)
    const rimLight = new THREE.DirectionalLight(0x2dd4bf, 1.4);
    rimLight.position.set(4, 2, -3);
    scene.add(rimLight);

    // Subtle Amber Ground Bounce Light
    const bounceLight = new THREE.PointLight(0xf59e0b, 0.8, 5);
    bounceLight.position.set(0, -0.8, 1.5);
    scene.add(bounceLight);

    // Generate Voxel Tree InstancedMesh
    const voxels = generateVoxelTreeData(goal.type, progress, seed, isWilting);
    const instancedMesh = buildInstancedVoxelTreeMesh(voxels);
    // Center tree so ground base sits at y = 0
    treeGroup.add(instancedMesh);

    // Pointer Interaction Listeners
    const handleMouseDown = (e: MouseEvent) => {
      if (!interactiveOrbit) return;
      mouseRef.current.isDragging = true;
      mouseRef.current.lastX = e.clientX;
      mouseRef.current.lastY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (mouseRef.current.isDragging && interactiveOrbit) {
        const deltaX = e.clientX - mouseRef.current.lastX;
        const deltaY = e.clientY - mouseRef.current.lastY;
        mouseRef.current.lastX = e.clientX;
        mouseRef.current.lastY = e.clientY;
        mouseRef.current.targetX += deltaX * 0.015;
        mouseRef.current.targetY += deltaY * 0.015;
      } else {
        // Subtle ambient parallax
        const rect = mount.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        if (nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1) {
          mouseRef.current.targetX = nx * 0.4;
          mouseRef.current.targetY = ny * 0.2;
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
      if (!interactiveOrbit || e.touches.length === 0) return;
      mouseRef.current.isDragging = true;
      mouseRef.current.lastX = e.touches[0].clientX;
      mouseRef.current.lastY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (mouseRef.current.isDragging && interactiveOrbit && e.touches.length > 0) {
        const deltaX = e.touches[0].clientX - mouseRef.current.lastX;
        const deltaY = e.touches[0].clientY - mouseRef.current.lastY;
        mouseRef.current.lastX = e.touches[0].clientX;
        mouseRef.current.lastY = e.touches[0].clientY;
        mouseRef.current.targetX += deltaX * 0.015;
        mouseRef.current.targetY += deltaY * 0.015;
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

    // Visibility and Intersection Observers (0% CPU offscreen)
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

    // Static single render if user requested reduced motion
    if (prefersReducedMotion || !animate) {
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

        instancedMesh.geometry.dispose();
        if (Array.isArray(instancedMesh.material)) instancedMesh.material.forEach(m => m.dispose());
        else instancedMesh.material.dispose();
        renderer.dispose();
        untrackWebGL();
        if (mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
      };
    }

    // Smooth Animation Loop
    let animId: number;
    const startTime = performance.now();

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      if (!isVisibleRef.current) return;
      if (renderer.domElement.width <= 0 || renderer.domElement.height <= 0) return;

      const elapsed = (performance.now() - startTime) * 0.001;

      // Smooth camera/tree orientation lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      treeGroup.rotation.y = mouseRef.current.x;
      treeGroup.rotation.x = Math.max(-0.2, Math.min(0.3, mouseRef.current.y));

      // Organic Wind Sway & Biological Breathing
      const sway = Math.sin(elapsed * 1.1) * 0.02;
      treeGroup.rotation.z = sway;
      treeGroup.scale.y = 1.0 + Math.sin(elapsed * 0.7) * 0.008;

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(renderLoop);

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

      instancedMesh.geometry.dispose();
      if (Array.isArray(instancedMesh.material)) instancedMesh.material.forEach(m => m.dispose());
      else instancedMesh.material.dispose();
      renderer.dispose();
      untrackWebGL();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [shouldRender, goal.type, progress, seed, isWilting, animate, interactiveOrbit, cameraDistance, size]);

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center overflow-hidden shrink-0 ${shouldRender ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${className}`}
      style={{ width: '100%', maxWidth: `${size}px`, aspectRatio: '1 / 1' }}
      role="img"
      aria-label={`3D Voxel ${goal.type} tree at ${Math.round(progress * 100)}% growth`}
      onClick={() => {
        if (!shouldRender && onActivate) {
          onActivate();
        }
      }}
    >
      {!shouldRender && (
        <div className="absolute inset-0 flex flex-col items-center justify-center border border-green-900/40 bg-black/50 p-4 text-center select-none group hover:border-[#4ade80]/60 transition-colors">
          <div className="w-10 h-10 rounded-full border border-green-500/30 flex items-center justify-center text-green-400 group-hover:scale-105 group-hover:border-[#4ade80] transition-all shadow-[0_0_12px_rgba(74,222,128,0.2)]">
            <span className="font-orbitron font-bold text-xs">3D</span>
          </div>
          <div className="font-display text-[9px] text-green-400/90 uppercase tracking-widest mt-2">
            {goal.type.toUpperCase()} // STANDBY
          </div>
          <div className="font-display text-[7.5px] text-zinc-500 uppercase tracking-wider mt-0.5 group-hover:text-green-300 transition-colors">
            CLICK OR SCROLL TO ACTIVATE
          </div>
        </div>
      )}
    </div>
  );
};

export default VoxelTreeCanvas;
