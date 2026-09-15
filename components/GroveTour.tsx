import React, { useState, useEffect, useRef, useCallback } from 'react';
import PixelButton from './PixelButton';

export type TourStepId = 
  | 'welcome'
  | 'plant'
  | 'acknowledge'
  | 'chronos'
  | 'groove'
  | 'pomo'
  | 'logs'
  | 'ani'
  | 'living_tree'
  | 'release';

interface GroveTourProps {
  currentStep: TourStepId;
  onStepChange: (nextStep: TourStepId) => void;
  onComplete: () => void;
  onSkip: () => void;
  onOpenGoalModal: () => void;
  onTryChronos: () => void;
  onTryGroove: () => void;
  onTryPomo: () => void;
  onTryLogs: () => void;
  onTryAni: () => void;
  hasActiveGoal: boolean;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export const GroveTour: React.FC<GroveTourProps> = ({
  currentStep,
  onStepChange,
  onComplete,
  onSkip,
  onOpenGoalModal,
  onTryChronos,
  onTryGroove,
  onTryPomo,
  onTryLogs,
  onTryAni,
  hasActiveGoal
}) => {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Map step to target selector in the real Grove UI
  const getTargetSelector = useCallback((step: TourStepId): string | null => {
    switch (step) {
      case 'plant':
        return '[data-tour="plant-seed"]';
      case 'acknowledge':
      case 'living_tree':
        return '[data-tour="hero-tree"]';
      case 'chronos':
        return '[data-tour="chronos-btn"]';
      case 'groove':
        return '[data-tour="groove-btn"]';
      case 'pomo':
        return '[data-tour="nav-pomo"]';
      case 'logs':
        return '[data-tour="nav-logs"]';
      case 'ani':
        return '[data-tour="nav-ani"]';
      case 'welcome':
      case 'release':
      default:
        return null;
    }
  }, []);

  // Update target bounding rectangle dynamically
  const updateRect = useCallback(() => {
    const selector = getTargetSelector(currentStep);
    if (!selector) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(selector);
    if (element) {
      // Scroll into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });
    } else {
      setTargetRect(null);
    }
  }, [currentStep, getTargetSelector]);

  useEffect(() => {
    updateRect();
    const handleResize = () => updateRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    // Short delay to re-measure after scroll settling
    const timer = setTimeout(updateRect, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      clearTimeout(timer);
    };
  }, [updateRect]);

  // Compute smart position for guidance card relative to highlighted target
  const getCardStyle = (): React.CSSProperties => {
    if (!targetRect || typeof window === 'undefined') {
      // Centered fallback for welcome and release (transform-free for 100% animation compatibility)
      return {
        top: '22%',
        left: '14px',
        right: '14px',
        margin: '0 auto',
        maxWidth: '400px',
        boxSizing: 'border-box'
      };
    }

    const windowH = window.innerHeight;
    const windowW = window.innerWidth;
    const isMobile = windowW < 640;

    if (isMobile) {
      // On mobile viewports, anchor cleanly with 14px horizontal margins so it never clips
      if (targetRect.top > windowH * 0.55) {
        return {
          bottom: `${Math.max(12, Math.min(windowH - 120, windowH - targetRect.top + 10))}px`,
          left: '14px',
          right: '14px',
          margin: '0 auto',
          maxWidth: '400px',
          boxSizing: 'border-box'
        };
      }
      return {
        top: `${Math.min(windowH - 240, Math.max(12, targetRect.bottom + 10))}px`,
        left: '14px',
        right: '14px',
        margin: '0 auto',
        maxWidth: '400px',
        boxSizing: 'border-box'
      };
    }

    // Desktop
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const idealLeft = Math.max(20, Math.min(windowW - 440, targetCenterX - 210));

    if (targetRect.top > windowH * 0.55) {
      return {
        bottom: `${Math.max(20, windowH - targetRect.top + 16)}px`,
        left: `${idealLeft}px`,
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        boxSizing: 'border-box'
      };
    }

    return {
      top: `${Math.min(windowH - 240, targetRect.bottom + 16)}px`,
      left: `${idealLeft}px`,
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      boxSizing: 'border-box'
    };
  };

  return (
    <div 
      className="fixed inset-0 z-[120] pointer-events-auto select-none"
      role="region"
      aria-label="Grove Interactive Guide"
    >
      {/* Dimmed backdrop with cutout spotlight */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White background reveals the darkened overlay */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black rectangle cuts out the spotlight aperture */}
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="6"
                fill="black"
                className="transition-all duration-300"
              />
            )}
          </mask>
        </defs>
        {/* Semi-transparent dark curtain with mask cutout */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(3, 8, 3, 0.72)"
          mask="url(#tour-spotlight-mask)"
          className="backdrop-blur-[1.5px]"
        />
      </svg>

      {/* Pulsing botanical focus ring around target */}
      {targetRect && (
        <div
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12
          }}
          className="absolute pointer-events-none rounded border-2 border-green-400 shadow-[0_0_25px_rgba(74,222,128,0.5)] animate-pulse transition-all duration-300"
        />
      )}

      {/* Cyber-Organic Guidance Card */}
      <div
        ref={cardRef}
        style={getCardStyle()}
        className="fixed z-10 p-3.5 xs:p-4 sm:p-5 bg-[#040d04] border-2 border-green-500/70 shadow-[0_10px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(34,197,94,0.2)] text-white animate-in fade-in duration-200"
      >
        {/* Top Header Strip: Guide indicator and subtle skip */}
        <div className="flex items-center justify-between border-b border-green-900/40 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
            <span className="pixel-font text-[7px] xs:text-[7.5px] sm:text-[8px] uppercase tracking-widest text-green-400 font-bold">
              GROVE GUIDE // STEWARD
            </span>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="pixel-font text-[6.5px] xs:text-[7px] text-zinc-500 hover:text-green-300 transition-colors uppercase tracking-wider underline cursor-pointer p-1"
          >
            [ SKIP TOUR ]
          </button>
        </div>

        {/* Dynamic Step Content */}
        {currentStep === 'welcome' && (
          <div className="space-y-2.5">
            <h3 className="pixel-font text-xs xs:text-sm sm:text-base text-green-300 font-bold uppercase tracking-wide">
              WELCOME TO YOUR GROVE.
            </h3>
            <p className="font-editorial text-xs sm:text-sm text-zinc-300 leading-relaxed">
              "This is where your attention takes root."
            </p>
            <p className="text-[10px] sm:text-xs text-green-400/80 font-mono leading-normal">
              A tranquil, student-first sanctuary. Every minute of focused study will grow your botanical tree. Let me show you around.
            </p>
            <div className="pt-2 flex justify-end">
              <PixelButton
                variant="success"
                onClick={() => onStepChange('plant')}
                className="py-2 px-4 text-[7.5px] sm:text-[8.5px] tracking-wider uppercase font-bold min-h-[44px]"
              >
                [ SHOW ME AROUND → ]
              </PixelButton>
            </div>
          </div>
        )}

        {currentStep === 'plant' && (
          <div className="space-y-2.5">
            <h3 className="pixel-font text-xs xs:text-sm sm:text-base text-green-300 font-bold uppercase tracking-wide">
              START HERE.
            </h3>
            <p className="font-editorial text-xs sm:text-sm text-zinc-200 leading-relaxed">
              "Plant your first intention. Tell your Grove what you're going to give your attention to."
            </p>
            <p className="text-[10px] sm:text-xs text-green-400/80 font-mono leading-normal">
              Choose a tree species, daily ritual duration, and time horizon.
            </p>
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onStepChange('chronos')}
                className="pixel-font text-[7px] sm:text-[8px] text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer p-2 min-h-[44px]"
              >
                NEXT →
              </button>
              <PixelButton
                variant="success"
                onClick={() => {
                  onOpenGoalModal();
                }}
                className="py-2 px-3.5 text-[7.5px] sm:text-[8px] tracking-wider uppercase font-bold min-h-[44px]"
              >
                [ PLANT AN INTENTION → ]
              </PixelButton>
            </div>
          </div>
        )}

        {currentStep === 'acknowledge' && (
          <div className="space-y-2.5">
            <h3 className="pixel-font text-xs xs:text-sm sm:text-base text-green-300 font-bold uppercase tracking-wide">
              THERE IT IS.
            </h3>
            <p className="font-editorial text-xs sm:text-sm text-zinc-200 leading-relaxed">
              "Your first seed."
            </p>
            <p className="text-[10px] sm:text-xs text-green-400/80 font-mono leading-normal">
              Soil is prepared. Now let's give it some time and focused ritual to grow.
            </p>
            <div className="pt-2 flex justify-end">
              <PixelButton
                variant="success"
                onClick={() => onStepChange('chronos')}
                className="py-2 px-4 text-[7.5px] sm:text-[8px] tracking-wider uppercase font-bold min-h-[44px]"
              >
                [ CONTINUE → ]
              </PixelButton>
            </div>
          </div>
        )}

        {currentStep === 'chronos' && (
          <div className="space-y-2.5">
            <h3 className="pixel-font text-xs xs:text-sm sm:text-base text-green-300 font-bold uppercase tracking-wide">
              NEED STRUCTURE?
            </h3>
            <p className="font-editorial text-xs sm:text-sm text-zinc-200 leading-relaxed">
              "Try CHRONOS. Set a focus duration and let the Grove keep time for you."
            </p>
            <p className="text-[10px] sm:text-xs text-green-400/80 font-mono leading-normal">
              A timed countdown ritual with tranquil audio synthesizers and clean completion milestones.
            </p>
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onStepChange('groove')}
                className="pixel-font text-[7px] sm:text-[8px] text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer p-2 min-h-[44px]"
              >
                NEXT →
              </button>
              <PixelButton
                variant="primary"
                onClick={onTryChronos}
                className="py-2 px-3 text-[7.5px] sm:text-[8px] tracking-wider uppercase font-bold min-h-[44px]"
              >
                [ TRY CHRONOS ]
              </PixelButton>
            </div>
          </div>
        )}

        {currentStep === 'groove' && (
          <div className="space-y-2.5">
            <h3 className="pixel-font text-xs xs:text-sm sm:text-base text-green-300 font-bold uppercase tracking-wide">
              OR FORGET THE CLOCK.
            </h3>
            <p className="font-editorial text-xs sm:text-sm text-zinc-200 leading-relaxed">
              "GROOVE is for when you just want to start focusing and see where your attention takes you."
            </p>
            <p className="text-[10px] sm:text-xs text-green-400/80 font-mono leading-normal">
              Free-form stopwatch focus without artificial timers or countdown pressure.
            </p>
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onStepChange('pomo')}
                className="pixel-font text-[7px] sm:text-[8px] text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer p-2 min-h-[44px]"
              >
                NEXT →
              </button>
              <PixelButton
                variant="success"
                onClick={onTryGroove}
                className="py-2 px-3 text-[7.5px] sm:text-[8px] tracking-wider uppercase font-bold min-h-[44px]"
              >
                [ TRY GROOVE ]
              </PixelButton>
            </div>
          </div>
        )}

        {currentStep === 'pomo' && (
          <div className="space-y-2.5">
            <h3 className="pixel-font text-xs xs:text-sm sm:text-base text-green-300 font-bold uppercase tracking-wide">
              PREFER A RHYTHM?
            </h3>
            <p className="font-editorial text-xs sm:text-sm text-zinc-200 leading-relaxed">
              "POMO gives you a familiar focus → break cycle."
            </p>
            <p className="text-[10px] sm:text-xs text-green-400/80 font-mono leading-normal">
              25m focus sprints with 5m restoration pauses, paired with tree cultivation.
            </p>
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onStepChange('logs')}
                className="pixel-font text-[7px] sm:text-[8px] text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer p-2 min-h-[44px]"
              >
                NEXT →
              </button>
              <PixelButton
                variant="primary"
                onClick={onTryPomo}
                className="py-2 px-3 text-[7.5px] sm:text-[8px] tracking-wider uppercase font-bold min-h-[44px]"
              >
                [ EXPLORE POMO ]
              </PixelButton>
            </div>
          </div>
        )}

        {currentStep === 'logs' && (
          <div className="space-y-2.5">
            <h3 className="pixel-font text-xs xs:text-sm sm:text-base text-green-300 font-bold uppercase tracking-wide">
              EVERYTHING GETS REMEMBERED.
            </h3>
            <p className="font-editorial text-xs sm:text-sm text-zinc-200 leading-relaxed">
              "LOGS keeps your focus history so you can see the work you've actually put in."
            </p>
            <p className="text-[10px] sm:text-xs text-green-400/80 font-mono leading-normal">
              An unalterable audit log of every study sprint and ritual session.
            </p>
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onStepChange('ani')}
                className="pixel-font text-[7px] sm:text-[8px] text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer p-2 min-h-[44px]"
              >
                NEXT →
              </button>
              <PixelButton
                variant="primary"
                onClick={onTryLogs}
                className="py-2 px-3 text-[7.5px] sm:text-[8px] tracking-wider uppercase font-bold min-h-[44px]"
              >
                [ VIEW LOGS ]
              </PixelButton>
            </div>
          </div>
        )}

        {currentStep === 'ani' && (
          <div className="space-y-2.5">
            <h3 className="pixel-font text-xs xs:text-sm sm:text-base text-green-300 font-bold uppercase tracking-wide">
              AND IF YOU GET STUCK...
            </h3>
            <p className="font-editorial text-xs sm:text-sm text-zinc-200 leading-relaxed">
              "ANI is here. Your focus architect, study companion, and guide when you don't know where to start."
            </p>
            <p className="text-[10px] sm:text-xs text-green-400/80 font-mono leading-normal">
              Ask Ani to break down intimidating study tasks, structure a ritual, or reflect on your rhythm.
            </p>
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onStepChange('living_tree')}
                className="pixel-font text-[7px] sm:text-[8px] text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer p-2 min-h-[44px]"
              >
                NEXT →
              </button>
              <PixelButton
                variant="primary"
                onClick={onTryAni}
                className="py-2 px-3 text-[7.5px] sm:text-[8px] tracking-wider uppercase font-bold min-h-[44px]"
              >
                [ MEET ANI ]
              </PixelButton>
            </div>
          </div>
        )}

        {currentStep === 'living_tree' && (
          <div className="space-y-2.5">
            <h3 className="pixel-font text-xs xs:text-sm sm:text-base text-amber-300 font-bold uppercase tracking-wide">
              ONE LAST THING.
            </h3>
            <p className="font-editorial text-xs sm:text-sm text-zinc-200 leading-relaxed">
              "Your tree isn't a score. It grows when you focus. If you stop tending it, it may wilt."
            </p>
            <div className="p-2 border border-green-900/60 bg-[#020802] space-y-1">
              <p className="text-[10px] sm:text-xs text-green-300 font-mono font-bold">
                GROWTH ≠ VITALITY
              </p>
              <p className="text-[9.5px] sm:text-[10.5px] text-zinc-300 font-mono leading-relaxed">
                Your accumulated focus is permanent and never erased. If neglected, returning with faithful practice revives and restores its vitality.
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <PixelButton
                variant="success"
                onClick={() => onStepChange('release')}
                className="py-2 px-4 text-[7.5px] sm:text-[8px] tracking-wider uppercase font-bold min-h-[44px]"
              >
                [ UNDERSTOOD → ]
              </PixelButton>
            </div>
          </div>
        )}

        {currentStep === 'release' && (
          <div className="space-y-2.5">
            <h3 className="pixel-font text-xs xs:text-sm sm:text-base text-green-300 font-bold uppercase tracking-wide">
              THAT'S YOUR GROVE.
            </h3>
            <p className="font-editorial text-xs sm:text-sm text-zinc-200 leading-relaxed">
              "Everything here is yours to explore."
            </p>
            <p className="text-[10px] sm:text-xs text-green-400/90 font-mono leading-normal">
              Go grow something meaningful.
            </p>
            <div className="pt-2 flex justify-end">
              <PixelButton
                variant="success"
                onClick={onComplete}
                className="py-2 px-4 text-[8px] sm:text-[9px] tracking-wider uppercase font-bold min-h-[44px] shadow-[0_0_20px_rgba(34,197,94,0.4)]"
              >
                [ ENTER THE GROVE → ]
              </PixelButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroveTour;
