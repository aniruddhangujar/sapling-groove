
import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { SaplingGoal, TreeType } from '../types';
import { renderPixelTree } from '../utils/pixelTreeRenderer';

interface Props {
  goal: SaplingGoal;
  size?: number;
  animate?: boolean;
  overrideAccruedMinutes?: number; 
}

const SaplingCanvas: React.FC<Props> = ({ goal, size = 200, animate = true, overrideAccruedMinutes }) => {
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

  // Memoize values that the draw function needs
  const drawDataRef = useRef({ goal, size, overrideAccruedMinutes, seed });
  useEffect(() => {
    drawDataRef.current = { goal, size, overrideAccruedMinutes, seed };
  }, [goal, size, overrideAccruedMinutes, seed]);

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const draw = useCallback((frame: number) => {
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

  // IntersectionObserver to pause animation when scrolled out of viewport
  useEffect(() => {
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
  }, []);

  // Visibilitychange listener to pause animation when tab is in background
  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Animation loop — entirely within refs, NO React state updates per frame, throttled to 30fps
  useEffect(() => {
    if (!animate || reducedMotionRef.current) {
      // Draw once statically
      draw(0);
      return;
    }

    const tick = (now: number) => {
      // Pace to ~30 FPS (33ms) for calm pixel sway and minimal CPU overhead
      if (isVisibleRef.current && now - lastFrameTimeRef.current >= 33) {
        lastFrameTimeRef.current = now;
        frameRef.current = (frameRef.current + 1) % 10000;
        draw(frameRef.current);
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
  }, [animate, draw]);

  // Redraw when meaningful props change (without animation loop restart)
  useEffect(() => {
    draw(frameRef.current);
  }, [goal.accruedMinutes, goal.health, goal.type, overrideAccruedMinutes, size, draw]);

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
