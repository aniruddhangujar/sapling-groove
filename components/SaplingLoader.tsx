import React, { useState, useEffect, useRef } from 'react';

interface SaplingLoaderProps {
  isReady: boolean;
  onComplete?: () => void;
  minDisplayMs?: number;
  maxTimeoutMs?: number;
}

export const SaplingLoader: React.FC<SaplingLoaderProps> = ({
  isReady,
  onComplete,
  minDisplayMs = 600,
  maxTimeoutMs = 2200
}) => {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('GERMINATING...');
  const [stageCode, setStageCode] = useState('01 // CULTIVATING SOIL');
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const mountTimeRef = useRef(Date.now());
  const hasTriggeredExitRef = useRef(false);
  const [isFontReady, setIsFontReady] = useState(false);

  // Ensure actual fonts (Press Start 2P, Orbitron, Space Mono) are primed before displaying typography
  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts) {
      Promise.all([
        document.fonts.load('8px "Press Start 2P"'),
        document.fonts.load('bold 16px "Orbitron"'),
        document.fonts.load('8px "Space Mono"')
      ]).then(() => setIsFontReady(true)).catch(() => setIsFontReady(true));
    } else {
      setIsFontReady(true);
    }
  }, []);

  // Check user preference for reduced motion
  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } catch {
      // Fallback if matchMedia is unsupported
    }
  }, []);

  // Natural progressive increment while assets prepare
  useEffect(() => {
    if (isReady || hasTriggeredExitRef.current) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) {
          setStatusText('GERMINATING...');
          setStageCode('01 // CULTIVATING SOIL');
          return prev + 6;
        } else if (prev < 75) {
          setStatusText('GERMINATING...');
          setStageCode('02 // SPROUTING AXIS');
          return prev + 4;
        } else if (prev < 88) {
          setStatusText('AWAKENING...');
          setStageCode('03 // ALIGNING CHAMBER');
          return prev + 1.5;
        }
        return prev;
      });
    }, 90);

    return () => clearInterval(interval);
  }, [isReady]);

  // Handle readiness and trigger elegant exit
  useEffect(() => {
    if (!isReady || hasTriggeredExitRef.current) return;

    const elapsed = Date.now() - mountTimeRef.current;
    const remainingDelay = Math.max(0, minDisplayMs - elapsed);

    const timer = setTimeout(() => {
      hasTriggeredExitRef.current = true;
      setProgress(100);
      setStatusText('GROVE PRIMED');
      setStageCode('04 // FLOURISHING');

      // Brief pause to allow the 100% complete state to register optically (~120ms)
      const exitTimer = setTimeout(() => {
        setIsExiting(true);

        const unmountDuration = prefersReducedMotion ? 100 : 400;
        const unmountTimer = setTimeout(() => {
          setIsMounted(false);
          onComplete?.();
        }, unmountDuration);

        return () => clearTimeout(unmountTimer);
      }, prefersReducedMotion ? 50 : 120);

      return () => clearTimeout(exitTimer);
    }, remainingDelay);

    return () => clearTimeout(timer);
  }, [isReady, minDisplayMs, prefersReducedMotion, onComplete]);

  // Safety maximum timeout fallback (guarantees loader will NEVER trap the user)
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!hasTriggeredExitRef.current) {
        hasTriggeredExitRef.current = true;
        setProgress(100);
        setStatusText('GROVE READY');
        setIsExiting(true);
        setTimeout(() => {
          setIsMounted(false);
          onComplete?.();
        }, prefersReducedMotion ? 50 : 350);
      }
    }, maxTimeoutMs);

    return () => clearTimeout(safetyTimer);
  }, [maxTimeoutMs, prefersReducedMotion, onComplete]);

  if (!isMounted) return null;

  // Segmented progress blocks (10 discrete pixel segments)
  const totalBlocks = 10;
  const filledBlocks = Math.min(totalBlocks, Math.round((progress / 100) * totalBlocks));

  // Botanical Growth Stages (Calculated strictly from real progress)
  const isSproutEmerged = progress >= 35;
  const isLeafUnfurled = progress >= 70;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Sapling is germinating"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#040a04] select-none ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{
        transition: prefersReducedMotion ? 'opacity 0.1s ease-out' : 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Bioluminescent Center Glow */}
      <div 
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] rounded-full bg-gradient-to-b from-green-500/10 via-emerald-950/15 to-transparent blur-3xl" />
      </div>

      {/* Subtle Rising Spores in Background */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {[
            { left: '48%', top: '56%', delay: '0s', duration: '2.4s', size: 'w-1 h-1' },
            { left: '52%', top: '58%', delay: '0.6s', duration: '2.8s', size: 'w-1.5 h-1.5' },
            { left: '46%', top: '62%', delay: '1.2s', duration: '2.2s', size: 'w-1 h-1' },
            { left: '54%', top: '52%', delay: '0.9s', duration: '2.6s', size: 'w-1 h-1' },
            { left: '50%', top: '65%', delay: '0.3s', duration: '3.0s', size: 'w-1.5 h-1.5' },
          ].map((spore, idx) => (
            <div
              key={idx}
              className={`absolute rounded-none bg-[#4ade80] opacity-40 animate-spore-drift ${spore.size}`}
              style={{
                left: spore.left,
                top: spore.top,
                animationDelay: spore.delay,
                animationDuration: spore.duration,
                boxShadow: '0 0 6px rgba(74, 222, 128, 0.7)'
              }}
            />
          ))}
        </div>
      )}

      {/* Main Handcrafted Voxel Germination Column */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-xs w-full">
        
        {/* Handcrafted Voxel Seed / Sprout Specimen */}
        <div 
          className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-5"
          aria-hidden="true"
        >
          {/* Subtle Pedestal Aura */}
          <div className="absolute inset-0 rounded-full bg-[#4ade80]/10 blur-xl animate-pulse" />

          {/* Pixel-Grid Botanical Silhouette */}
          <svg
            viewBox="0 0 32 32"
            className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-[0_0_12px_rgba(74,222,128,0.5)]"
            shapeRendering="crispEdges"
          >
            {/* Soil Basin Voxels */}
            <rect x="11" y="27" width="10" height="2" fill="#0e2a14" />
            <rect x="13" y="29" width="6" height="1" fill="#08180c" />

            {/* Voxel Seed Core (Always Visible, Glowing) */}
            <rect x="14" y="24" width="4" height="3" fill="#15803d" />
            <rect x="15" y="24" width="2" height="2" fill="#4ade80" />
            <rect x="15" y="25" width="1" height="1" fill="#fef08a" />

            {/* Stem Voxels (Germinates when progress >= 35%) */}
            {(isSproutEmerged || prefersReducedMotion) && (
              <>
                <rect x="15" y="20" width="2" height="4" fill="#16a34a" />
                <rect x="15" y="16" width="2" height="4" fill="#22c55e" />
                <rect x="15" y="13" width="2" height="3" fill="#4ade80" />
              </>
            )}

            {/* Cotyledon Leaves (Unfurls when progress >= 70%) */}
            {(isLeafUnfurled || prefersReducedMotion) && (
              <>
                {/* Left Leaf */}
                <rect x="11" y="11" width="3" height="2" fill="#4ade80" />
                <rect x="9" y="10" width="3" height="2" fill="#86efac" />
                <rect x="10" y="12" width="2" height="1" fill="#22c55e" />

                {/* Right Leaf */}
                <rect x="18" y="11" width="3" height="2" fill="#4ade80" />
                <rect x="20" y="10" width="3" height="2" fill="#86efac" />
                <rect x="20" y="12" width="2" height="1" fill="#22c55e" />

                {/* Delicate Apical Sprout Tip */}
                <rect x="15" y="10" width="2" height="3" fill="#86efac" />
                <rect x="15" y="9" width="1" height="1" fill="#fef08a" />
              </>
            )}
          </svg>
        </div>

        {/* Brand Title */}
        <h1 className={`font-orbitron font-bold text-sm sm:text-base text-white tracking-[0.25em] uppercase mb-1 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)] transition-opacity duration-150 ${isFontReady ? 'opacity-100' : 'opacity-0'}`}>
          SAPLING
        </h1>

        {/* Botanical Germination Subtitle */}
        <div className={`pixel-font text-[7px] sm:text-[8px] text-[#4ade80] tracking-[0.18em] uppercase font-bold mb-4 transition-opacity duration-150 ${isFontReady ? 'opacity-100' : 'opacity-0'}`}>
          {statusText}
        </div>

        {/* Restrained Segmented Pixel Block Progress Bar */}
        <div 
          className="flex items-center justify-center gap-1 sm:gap-1.5 py-1 mb-2.5"
          aria-hidden="true"
        >
          {Array.from({ length: totalBlocks }).map((_, i) => {
            const isFilled = i < filledBlocks;
            return (
              <div
                key={i}
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 border transition-all duration-150 ${
                  isFilled
                    ? 'bg-[#4ade80] border-[#86efac] shadow-[0_0_8px_rgba(74,222,128,0.7)]'
                    : 'bg-[#08180c]/80 border-green-950/80'
                }`}
              />
            );
          })}
        </div>

        {/* Stage Telemetry Tag */}
        <div className={`font-display text-[7px] sm:text-[7.5px] text-green-500/80 tracking-widest uppercase transition-opacity duration-150 ${isFontReady ? 'opacity-100' : 'opacity-0'}`}>
          {stageCode}
        </div>
      </div>
    </div>
  );
};

export default SaplingLoader;
