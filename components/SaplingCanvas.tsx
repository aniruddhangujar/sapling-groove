
import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { SaplingGoal, TreeType } from '../types';
import { TREE_CONFIGS, COLORS } from '../constants';

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

  const GRID_SIZE = 64;

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
    const config = TREE_CONFIGS[g.type] || TREE_CONFIGS[TreeType.OAK];
    const currentAccrued = overrideMins ?? g.accruedMinutes;
    const progress = Math.min(1.0, currentAccrued / g.totalTargetMinutes);

    // Handle devicePixelRatio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = s;
    const canvasHeight = s;

    if (canvas.width !== canvasWidth * dpr || canvas.height !== canvasHeight * dpr) {
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;

    const pSize = canvasWidth / GRID_SIZE;

    const setPixel = (x: number, y: number, color: string) => {
      if (x < 6 || x >= GRID_SIZE - 6 || y < 6 || y >= GRID_SIZE - 6) return;
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x * pSize), Math.floor(y * pSize), Math.ceil(pSize), Math.ceil(pSize));
    };

    const drawRect = (x: number, y: number, w: number, h: number, color: string) => {
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
          setPixel(x + i, y + j, color);
        }
      }
    };

    const drawCirclePixel = (cx: number, cy: number, r: number, color: string) => {
      const radiusSq = r * r;
      for (let x = -r; x <= r; x++) {
        for (let y = -r; y <= r; y++) {
          if (x * x + y * y <= radiusSq) {
            setPixel(cx + x, cy + y, color);
          }
        }
      }
    };

    // Animation values — reduced or zero when reduced-motion is active
    const useAnimation = animate && !reducedMotionRef.current;
    const sway = useAnimation ? (Math.sin(frame * 0.03) * 0.5) : 0;
    const wind = useAnimation ? (Math.sin(frame * 0.015) * 0.4) : 0;

    const centerX = GRID_SIZE / 2;
    const baseY = GRID_SIZE - 12;
    const leafColor = g.health < 35 ? COLORS.WILTING : config.color;
    const trunkColor = config.trunk;

    // --- STABLE GROUND ---
    drawRect(8, baseY + 1, GRID_SIZE - 16, 1, '#1a1a1a'); 
    
    // Lush ground cover
    for (let i = 0; i < 10; i++) {
      const gx = 10 + ((sd + i * 14) % (GRID_SIZE - 20));
      const gSway = useAnimation ? Math.sin(frame * 0.03 + i) * 0.8 : 0;
      setPixel(gx, baseY, '#064e3b'); 
      setPixel(Math.floor(gx + gSway), baseY - 1, '#10b981');
      if (i % 4 === 0) setPixel(Math.floor(gx + gSway), baseY - 2, '#fbbf24');
    }

    if (progress < 0.1) {
      const pulse = useAnimation ? Math.abs(Math.sin(frame * 0.08)) > 0.5 : true;
      drawRect(centerX - 1, baseY - 1, 3, 2, trunkColor);
      if (pulse) setPixel(centerX, baseY - 2, leafColor);
      return;
    }

    // --- TREE RENDERING ---
    switch (g.type) {
      case TreeType.CHERRY_BLOSSOM: {
        const trunkH = Math.floor(progress * 16); 
        let currX = centerX;
        for (let i = 0; i < trunkH; i++) {
          const drift = Math.sin(i * 0.3 + sd) * 1.0;
          const tWidth = Math.max(2, Math.floor(4 - (i / trunkH) * 2));
          drawRect(Math.floor(currX + drift - tWidth / 2), baseY - i, tWidth, 1, trunkColor);
          if (i === trunkH - 1) currX += drift;
        }
        if (progress > 0.15) {
          const foliageP = (progress - 0.15) / 0.85;
          const spread = Math.floor(foliageP * 12); 
          for (let j = 0; j < 65; j++) {
            const ang = (j / 65) * Math.PI * 2;
            const dist = (j % 5 === 0) ? spread : (Math.random() * spread);
            const cX = currX + Math.cos(ang + sd) * dist;
            const cY = (baseY - trunkH) + Math.sin(ang + sd) * (dist * 0.5);
            drawCirclePixel(Math.floor(cX + wind), Math.floor(cY), Math.floor(3 + foliageP * 2), leafColor);
            if (j % 15 === 0) setPixel(Math.floor(cX + wind), Math.floor(cY), '#fff');
          }
        }
        break;
      }

      case TreeType.SEQUOIA: {
        const tW = Math.floor(8 + progress * 4); 
        const tH = Math.floor(20 + progress * 6); 
        for (let i = 0; i < tH; i++) {
          const taper = Math.floor((i / tH) * (tW * 0.5));
          const curW = Math.max(4, tW - taper);
          drawRect(centerX - Math.floor(curW / 2), baseY - i, curW, 1, trunkColor);
        }
        if (progress > 0.3) {
          const foliageP = (progress - 0.3) / 0.7;
          for (let i = 0; i < 18; i++) {
            const h = (baseY - tH + 3) + (i * 2.2);
            const side = (i % 2 === 0 ? 1 : -1) * (tW * 0.3 + (i * 0.4));
            drawCirclePixel(Math.floor(centerX + side + wind), Math.floor(h), Math.floor(2 + foliageP * 1.5), leafColor);
          }
        }
        break;
      }

      default: {
        const tW = Math.max(3, Math.floor(3 + progress * 3));
        const tH = Math.floor(16 + progress * 10); 
        drawRect(centerX - Math.floor(tW / 2), baseY - tH, tW, tH + 1, trunkColor);
        if (progress > 0.2) {
          const canopyP = (progress - 0.2) / 0.8;
          const spread = Math.floor(canopyP * 14); 
          for (let k = 0; k < 80; k++) {
            const ang = (k / 80) * Math.PI * 2;
            const dist = (k % 4 === 0) ? (canopyP * spread) : (Math.random() * (canopyP * spread));
            const cx = centerX + Math.cos(ang + k) * dist;
            const cy = (baseY - tH) + Math.sin(ang + k) * (dist * 0.75);
            drawCirclePixel(Math.floor(cx + sway), Math.floor(cy), Math.floor(5 + canopyP * 4), leafColor);
          }
        }
        break;
      }
    }
  }, [animate]);

  // Animation loop — entirely within refs, NO React state updates per frame
  useEffect(() => {
    if (!animate || reducedMotionRef.current) {
      // Draw once statically
      draw(0);
      return;
    }

    const tick = () => {
      frameRef.current = (frameRef.current + 1) % 10000;
      draw(frameRef.current);
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
