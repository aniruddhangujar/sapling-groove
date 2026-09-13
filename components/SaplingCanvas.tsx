import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { SaplingGoal } from '../types';
import { renderPixelTree } from '../utils/pixelTreeRenderer';
import VoxelTreeCanvas from './VoxelTreeCanvas';

interface Props {
  goal: SaplingGoal;
  size?: number;
  animate?: boolean;
  overrideAccruedMinutes?: number; 
  interactiveOrbit?: boolean;
  forceEcoMode?: boolean;
}

let isWebGLAvailableCache: boolean | null = null;
function checkWebGLSupport(): boolean {
  if (isWebGLAvailableCache !== null) return isWebGLAvailableCache;
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    isWebGLAvailableCache = !!(window.WebGLRenderingContext && gl);
    return isWebGLAvailableCache;
  } catch {
    isWebGLAvailableCache = false;
    return false;
  }
}

/**
 * SaplingCanvas: Unified Botanical Tree Canvas
 * Renders high-performance 3D Voxel Botanical Trees via Three.js (single draw call InstancedMesh).
 * Gracefully switches to 2D canvas pixel-tree renderer if WebGL is unavailable or Eco Canopy mode is active.
 * Retains exact species archetype, growth stage, and biological silhouette (Constraint 5, 8, 9, 10).
 */
const SaplingCanvas: React.FC<Props> = ({ 
  goal, 
  size = 200, 
  animate = true, 
  overrideAccruedMinutes,
  interactiveOrbit = true,
  forceEcoMode = false
}) => {
  const webGLSupported = useMemo(() => checkWebGLSupport(), []);
  const use3DVoxel = webGLSupported && !forceEcoMode;

  // 2D Fallback references
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const animIdRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  const seed = useMemo(() => {
    let s = 0;
    for (let i = 0; i < goal.id.length; i++) s += goal.id.charCodeAt(i);
    return s;
  }, [goal.id]);

  const drawDataRef = useRef({ goal, size, overrideAccruedMinutes, seed });
  useEffect(() => {
    drawDataRef.current = { goal, size, overrideAccruedMinutes, seed };
  }, [goal, size, overrideAccruedMinutes, seed]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const draw2DFallback = useCallback((frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { goal: g, size: s, overrideAccruedMinutes: overrideMins, seed: sd } = drawDataRef.current;
    const currentAccrued = overrideMins ?? g.accruedMinutes;
    const progress = Math.min(1.0, currentAccrued / g.totalTargetMinutes);
    const useAnimation = animate && !reducedMotionRef.current;

    renderPixelTree(ctx, g, progress, frame, s, sd, useAnimation);
  }, [animate]);

  const isVisibleRef = useRef(true);
  const lastFrameTimeRef = useRef(0);

  useEffect(() => {
    if (use3DVoxel) return;
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisibleRef.current = entry.isIntersecting;
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [use3DVoxel]);

  useEffect(() => {
    if (use3DVoxel) return;
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [use3DVoxel]);

  useEffect(() => {
    if (use3DVoxel) return;
    if (!animate || reducedMotionRef.current) {
      draw2DFallback(0);
      return;
    }

    const tick = (now: number) => {
      if (isVisibleRef.current && now - lastFrameTimeRef.current >= 33) {
        lastFrameTimeRef.current = now;
        frameRef.current = (frameRef.current + 1) % 10000;
        draw2DFallback(frameRef.current);
      }
      animIdRef.current = requestAnimationFrame(tick);
    };
    animIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (animIdRef.current !== null) {
        cancelAnimationFrame(animIdRef.current);
        animIdRef.current = null;
      }
    };
  }, [animate, draw2DFallback, use3DVoxel]);

  useEffect(() => {
    if (!use3DVoxel) {
      draw2DFallback(frameRef.current);
    }
  }, [goal.accruedMinutes, goal.health, goal.type, overrideAccruedMinutes, size, draw2DFallback, use3DVoxel]);

  // If 3D Voxel rendering is supported, render the genuine 3D Voxel Botanical Tree
  if (use3DVoxel) {
    return (
      <VoxelTreeCanvas 
        goal={goal} 
        size={size} 
        animate={animate} 
        overrideAccruedMinutes={overrideAccruedMinutes}
        interactiveOrbit={interactiveOrbit}
      />
    );
  }

  // 2D Pixel Canvas Fallback
  return (
    <div 
      ref={containerRef}
      className="relative flex items-center justify-center pointer-events-none overflow-hidden shrink-0"
      style={{ width: '100%', maxWidth: `${size}px`, aspectRatio: '1 / 1' }}
      role="img"
      aria-label={`${goal.type} tree at ${Math.round((goal.accruedMinutes / goal.totalTargetMinutes) * 100)}% growth`}
    >
      <canvas 
        ref={canvasRef} 
        style={{ 
          imageRendering: 'pixelated',
          width: '100%',
          height: '100%',
        }}
        className="block" 
      />
    </div>
  );
};

export default SaplingCanvas;
