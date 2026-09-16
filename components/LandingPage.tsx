import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TreeType, TimelineType, SaplingGoal, IntentSpecimen } from '../types';
import SaplingCanvas from './SaplingCanvas';
import VoxelTreeCanvas from './VoxelTreeCanvas';
import CyberBotanicalWorld from './CyberBotanicalWorld';
import { FeatureInstrumentDrawer, InstrumentId } from './FeatureInstrumentDrawer';
import MiniDioramaCanvas from './MiniDioramaCanvas';
import SaplingLoader from './SaplingLoader';
import { useAuth } from '../context/AuthContext';

interface Props {
  onEnterApp: (options?: { openNewSeed?: boolean; presetTree?: TreeType; presetName?: string }) => void;
  onOpenAuth: () => void;
  onOpenCommunity?: (tab?: 'feedback' | 'support' | 'contact') => void;
}

const SPECIMENS: IntentSpecimen[] = [
  {
    id: 'focus',
    title: 'FOCUS',
    tagline: 'Quercus Robur // Sturdy Anchor',
    treeType: TreeType.OAK,
    suggestedDurationDays: 45,
    dailyMinutes: 60,
    iconName: 'spa',
    philosophy: 'Ancient resilience built ring by ring through quiet, unyielding daily consistency.'
  },
  {
    id: 'code',
    title: 'CODE',
    tagline: 'Pinus Sylvestris // Evergreen Logic',
    treeType: TreeType.PINE,
    suggestedDurationDays: 30,
    dailyMinutes: 60,
    iconName: 'terminal',
    philosophy: 'Like the pine through winter frost, deep logic requires resilient, quiet endurance.'
  },
  {
    id: 'create',
    title: 'CREATE',
    tagline: 'Prunus Serrulata // Fleeting Artistry',
    treeType: TreeType.CHERRY_BLOSSOM,
    suggestedDurationDays: 14,
    dailyMinutes: 45,
    iconName: 'brush',
    philosophy: 'Artistic intention blossoms through dedicated, unhurried daily craft.'
  },
  {
    id: 'study',
    title: 'STUDY',
    tagline: 'Cedrus Libani // Ancient Wisdom',
    treeType: TreeType.CEDAR,
    suggestedDurationDays: 60,
    dailyMinutes: 90,
    iconName: 'menu_book',
    philosophy: 'Knowledge accumulates slowly, forming enduring rings of deep understanding.'
  },
  {
    id: 'build',
    title: 'BUILD',
    tagline: 'Sequoiadendron // Monumental Architecture',
    treeType: TreeType.SEQUOIA,
    suggestedDurationDays: 90,
    dailyMinutes: 120,
    iconName: 'construction',
    philosophy: 'The titan sequoia grows tallest only by anchoring deeply in quiet discipline.'
  },
  {
    id: 'read',
    title: 'READ',
    tagline: 'Salix Babylonica // Fluid Absorption',
    treeType: TreeType.WILLOW,
    suggestedDurationDays: 21,
    dailyMinutes: 30,
    iconName: 'auto_stories',
    philosophy: 'Yielding yet unbreakable, immersive reading nourishes the active mind.'
  },
  {
    id: 'learn',
    title: 'LEARN',
    tagline: 'Juniperus Procumbens // Deliberate Mastery',
    treeType: TreeType.BONSAI,
    suggestedDurationDays: 30,
    dailyMinutes: 25,
    iconName: 'psychology',
    philosophy: 'Every small daily pruning shapes true mastery over long horizons.'
  },
  {
    id: 'flow',
    title: 'FLOW',
    tagline: 'Phyllostachys // Resilient Rhythm',
    treeType: TreeType.BAMBOO,
    suggestedDurationDays: 21,
    dailyMinutes: 35,
    iconName: 'filter_vintage',
    philosophy: 'Bending gracefully with the prevailing wind, unbroken under sudden stress.'
  },
  {
    id: 'endure',
    title: 'ENDURE',
    tagline: 'Carnegiea Gigantea // Arid Vitality',
    treeType: TreeType.CACTUS,
    suggestedDurationDays: 60,
    dailyMinutes: 45,
    iconName: 'wb_sunny',
    philosophy: 'Thriving where external nourishment is scarce; drawing from deep internal reserves.'
  },
  {
    id: 'craft',
    title: 'CRAFT',
    tagline: 'Acer Palmatum // Vibrant Dedication',
    treeType: TreeType.MAPLE,
    suggestedDurationDays: 30,
    dailyMinutes: 50,
    iconName: 'palette',
    philosophy: 'A spreading crown of delicate, nuanced intention tuned to changing seasons.'
  },
  {
    id: 'shelter',
    title: 'SHELTER',
    tagline: 'Adansonia Digitata // Massive Presence',
    treeType: TreeType.BAOBAB,
    suggestedDurationDays: 90,
    dailyMinutes: 75,
    iconName: 'shield',
    philosophy: 'An immovable trunk providing enduring sanctuary for an entire ecosystem of calm.'
  }
];

const STAGES = [
  { 
    label: 'SEED', 
    stageName: 'The Silent Seed', 
    pct: 0, 
    accrued: 0, 
    status: 'DORMANT POTENTIAL',
    desc: 'An unformed intention sleeping in dark soil. Cellular spark awaiting the heat of dedicated focus.' 
  },
  { 
    label: 'SPROUT', 
    stageName: 'Tender Shoot', 
    pct: 25, 
    accrued: 6, 
    status: 'FIRST VASCULAR NODES',
    desc: 'Vulnerable green breaks the surface. The daily ritual takes root and vascular sap begins to flow.' 
  },
  { 
    label: 'SAPLING', 
    stageName: 'Hardening Stem', 
    pct: 50, 
    accrued: 13, 
    status: 'STEADY SYNTHESIS',
    desc: 'Cellular synthesis accelerates. Focus transforms from conscious effort into an automatic daily rhythm.' 
  },
  { 
    label: 'TREE', 
    stageName: 'Heartwood Canopy', 
    pct: 85, 
    accrued: 21, 
    status: 'RESILIENT CANOPY',
    desc: 'Dense crown withstands distraction. Habit has hardened into character, impervious to digital noise.' 
  },
  { 
    label: 'GROVE', 
    stageName: 'Permanent Monument', 
    pct: 100, 
    accrued: 25, 
    status: 'SANCTUARY MATURITY',
    desc: 'Full morphological maturity reached. A living monument added forever to your personal forest.' 
  }
];

interface CardProps {
  card: {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    image: string;
    action: () => void;
  };
}

const HeroTiltCard: React.FC<CardProps> = ({ card }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * 14, y: px * 14 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={card.action}
      style={{
        transform: isHovered 
          ? `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-4px)` 
          : 'perspective(600px) rotateX(0deg) rotateY(0deg) translateY(0px)',
        transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.35s ease-out'
      }}
      className="group relative flex flex-col text-left border border-green-900/60 hover:border-[#4ade80] bg-[#020a03]/90 hover:bg-[#07190a]/95 backdrop-blur-md p-2 sm:p-2.5 transition-colors duration-300 shadow-md hover:shadow-[0_0_25px_rgba(74,222,128,0.3)] cursor-pointer select-none"
    >
      {/* Tactical Corner HUD Accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#4ade80]/40 group-hover:border-[#4ade80]" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#4ade80]/40 group-hover:border-[#4ade80]" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#4ade80]/40 group-hover:border-[#4ade80]" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#4ade80]/40 group-hover:border-[#4ade80]" />

      {/* 3D Real-time WebGL Diorama (Shared WebGLRenderer - Zero Static Images, 1 WebGL Context) */}
      <div className="w-full aspect-[4/3] overflow-hidden bg-black/90 border border-green-950/80 mb-2 relative">
        <MiniDioramaCanvas
          instrumentId={card.id as InstrumentId}
          isHovered={isHovered}
          className="w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020a03]/80 via-transparent to-transparent pointer-events-none" />
        {/* Animated holographic scanline sweep on hover */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#4ade80]/15 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-1000 ease-in-out pointer-events-none" />
        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/85 border border-green-500/40 font-display text-[6.5px] text-[#4ade80] tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          3D LIVE // INTERACT
        </div>
      </div>

      {/* Card Labels */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between">
          <div className="font-orbitron font-bold text-[11px] sm:text-xs text-white group-hover:text-[#4ade80] tracking-wider uppercase transition-colors">
            {card.title}
          </div>
          <span className="text-[#4ade80] text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
        </div>
        <div className="font-display text-[8px] sm:text-[8.5px] text-green-400/90 tracking-wider uppercase font-medium">
          {card.subtitle}
        </div>
        <div className="font-editorial text-[8.5px] sm:text-[9px] text-zinc-400 tracking-normal pt-0.5 line-clamp-1">
          {card.description}
        </div>
      </div>
    </div>
  );
};

const HERO_SPECIES_LIST: TreeType[] = [
  TreeType.OAK,
  TreeType.PINE,
  TreeType.CHERRY_BLOSSOM,
  TreeType.BONSAI,
  TreeType.SEQUOIA,
  TreeType.WILLOW,
  TreeType.MAPLE,
  TreeType.BAMBOO,
  TreeType.CACTUS,
  TreeType.BAOBAB,
  TreeType.CEDAR
];

const SPECIES_BOTANICAL_DATA: Record<TreeType, { scientific: string; origin: string; canopy: string }> = {
  [TreeType.OAK]: { scientific: 'Quercus Robur', origin: 'Ancient Forest', canopy: 'Tiered Horizontal' },
  [TreeType.PINE]: { scientific: 'Pinus Sylvestris', origin: 'Sub-Alpine Taiga', canopy: 'Conical Spires' },
  [TreeType.CHERRY_BLOSSOM]: { scientific: 'Prunus Serrulata', origin: 'Temperate Grove', canopy: 'Delicate Blossom' },
  [TreeType.BONSAI]: { scientific: 'Ficus Retusa', origin: 'Sanctuary Archive', canopy: 'Asymmetric Cloud' },
  [TreeType.SEQUOIA]: { scientific: 'Sequoiadendron Giganteum', origin: 'Titan Valley', canopy: 'Cathedral Dome' },
  [TreeType.WILLOW]: { scientific: 'Salix Babylonica', origin: 'Wetland Basin', canopy: 'Cascading Fronds' },
  [TreeType.MAPLE]: { scientific: 'Acer Palmatum', origin: 'Highland Ridge', canopy: 'Lobed Spreading' },
  [TreeType.BAMBOO]: { scientific: 'Phyllostachys Edulis', origin: 'Bamboo Grove', canopy: 'Segmented Clustered' },
  [TreeType.CACTUS]: { scientific: 'Carnegiea Gigantea', origin: 'Arid Terrarium', canopy: 'Ribbed Columnar' },
  [TreeType.BAOBAB]: { scientific: 'Adansonia Digitata', origin: 'Savanna Terrarium', canopy: 'Bottle Crown' },
  [TreeType.CEDAR]: { scientific: 'Cedrus Libani', origin: 'Mountain Plateau', canopy: 'Layered Boughs' }
};

const InViewGroveCanvas: React.FC<{ goal: SaplingGoal }> = ({ goal }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { rootMargin: '350px' }
    );
    observer.observe(mount);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={mountRef} className="w-full h-full relative">
      {isInView && (
        <CyberBotanicalWorld 
          variant="grove" 
          goal={goal} 
          treeType={TreeType.SEQUOIA}
          progress={1.0}
          interactiveOrbit={true}
          className="w-full h-full"
        />
      )}
    </div>
  );
};

const LandingPage: React.FC<Props> = ({ onEnterApp, onOpenAuth, onOpenCommunity }) => {
  const { user, isAuthenticated } = useAuth();
  const [selectedSpecimen, setSelectedSpecimen] = useState<IntentSpecimen>(SPECIMENS[0]);
  const [activeStageIndex, setActiveStageIndex] = useState(2); // Start at Sapling stage
  const [customProgress, setCustomProgress] = useState<number | null>(null);

  // Live hero tree species selection (Directly fulfilling user directive)
  const [heroTreeType, setHeroTreeType] = useState<TreeType>(TreeType.OAK);
  const [activeDrawer, setActiveDrawer] = useState<InstrumentId | null>(null);

  // Botanical Loader Readiness State (Signals when real assets and hero scene are primed)
  const [isHeroCanvasReady, setIsHeroCanvasReady] = useState(false);
  const [isFontsReady, setIsFontsReady] = useState(false);
  const [isBackdropReady, setIsBackdropReady] = useState(false);

  useEffect(() => {
    // Check fonts readiness
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => setIsFontsReady(true)).catch(() => setIsFontsReady(true));
    } else {
      setIsFontsReady(true);
    }

    // Check background environmental matte readiness
    const img = new Image();
    img.src = '/assets/environment-backdrop.jpg?v=3';
    if (img.complete) {
      setIsBackdropReady(true);
    } else {
      img.onload = () => setIsBackdropReady(true);
      img.onerror = () => setIsBackdropReady(true);
    }
  }, []);

  const isPageReady = isHeroCanvasReady && isFontsReady && isBackdropReady;

  // Mutually Exclusive Specimen Context: Germination and Herbarium NEVER mount WebGLRenderers concurrently
  const germinationSectionRef = useRef<HTMLElement>(null);
  const herbariumSectionRef = useRef<HTMLElement>(null);
  const [activeSpecimenSection, setActiveSpecimenSection] = useState<'germination' | 'herbarium' | null>(null);

  useEffect(() => {
    const germEl = germinationSectionRef.current;
    const herbEl = herbariumSectionRef.current;
    if (!germEl || !herbEl) return;

    const ratios = { germination: 0, herbarium: 0 };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === germEl) {
            ratios.germination = entry.isIntersecting ? entry.intersectionRatio : 0;
          } else if (entry.target === herbEl) {
            ratios.herbarium = entry.isIntersecting ? entry.intersectionRatio : 0;
          }
        }

        // Deallocate both if neither section is intersecting
        if (ratios.germination <= 0.02 && ratios.herbarium <= 0.02) {
          setActiveSpecimenSection(null);
        } else if (ratios.germination >= ratios.herbarium) {
          // Germination has priority when higher or equal visibility
          setActiveSpecimenSection('germination');
        } else {
          setActiveSpecimenSection('herbarium');
        }
      },
      {
        threshold: [0, 0.05, 0.2, 0.5, 0.8],
        rootMargin: '100px 0px 100px 0px'
      }
    );

    observer.observe(germEl);
    observer.observe(herbEl);

    return () => observer.disconnect();
  }, []);

  // Hero interactive live specimen goal
  const heroGoal: SaplingGoal = useMemo(() => ({
    id: `hero-${heroTreeType.toLowerCase()}-live-specimen`,
    name: `${heroTreeType} Specimen`,
    type: heroTreeType,
    timeline: TimelineType.MONTH,
    startDate: 1042,
    durationInDays: 42,
    dailyTargetMinutes: 60,
    totalTargetMinutes: 42 * 60,
    accruedMinutes: 42 * 60,
    isComplete: true,
    health: 100,
    perfectionScore: 1.0
  }), [heroTreeType]);

  // 6 Core Botanical Feature Instruments directly reflecting the reference image bottom bar
  const featureInstruments = useMemo(() => [
    {
      id: 'groove',
      title: 'GROOVE',
      subtitle: 'FREE-FORM FOCUS',
      description: 'NO PRESSURE. JUST FLOW.',
      image: '/assets/cards/card-groove.jpg',
      action: () => setActiveDrawer('groove')
    },
    {
      id: 'chronos',
      title: 'CHRONOS',
      subtitle: 'STRUCTURED RITUALS',
      description: 'FOCUS → REST → GROW.',
      image: '/assets/cards/card-chronos.jpg',
      action: () => setActiveDrawer('chronos')
    },
    {
      id: 'grove',
      title: 'GROVE',
      subtitle: 'A LIVING HISTORY',
      description: 'EVERY SESSION LEAVES SOMETHING BEHIND.',
      image: '/assets/cards/card-grove.jpg',
      action: () => setActiveDrawer('grove')
    },
    {
      id: 'logs',
      title: 'LOGS',
      subtitle: 'TRACK YOUR JOURNEY',
      description: 'SMALL STEPS. BIG CHANGE.',
      image: '/assets/cards/card-logs.jpg',
      action: () => setActiveDrawer('logs')
    },
    {
      id: 'pomo',
      title: 'POMO',
      subtitle: 'A SIMPLE UTILITY',
      description: 'FOCUS WHEN YOU NEED IT.',
      image: '/assets/cards/card-pomo.jpg',
      action: () => setActiveDrawer('pomo')
    },
    {
      id: 'ani',
      title: 'ANI',
      subtitle: 'A QUIET PRESENCE',
      description: '"What are you tending today?"',
      image: '/assets/cards/card-ani.jpg',
      action: () => setActiveDrawer('ani')
    }
  ], []);

  // Growth Stage Explorer goal (dynamic based on slider/stage)
  const stageGoal: SaplingGoal = useMemo(() => {
    const currentStage = STAGES[activeStageIndex];
    const accrued = customProgress !== null 
      ? Math.round((customProgress / 100) * 25) 
      : currentStage.accrued;
    const isComp = customProgress !== null ? customProgress >= 100 : currentStage.pct === 100;

    return {
      id: 'growth-stage-goal',
      name: currentStage.stageName,
      type: TreeType.OAK,
      timeline: TimelineType.DAY,
      startDate: Date.now(),
      durationInDays: 1,
      dailyTargetMinutes: 25,
      totalTargetMinutes: 25,
      accruedMinutes: accrued,
      isComplete: isComp,
      health: 100,
      perfectionScore: 1.0
    };
  }, [activeStageIndex, customProgress]);

  // Herbarium single active specimen goal
  const specimenGoal: SaplingGoal = useMemo(() => ({
    id: `herbarium-${selectedSpecimen.id}`,
    name: selectedSpecimen.title,
    type: selectedSpecimen.treeType,
    timeline: TimelineType.MONTH,
    startDate: Date.now(),
    durationInDays: selectedSpecimen.suggestedDurationDays,
    dailyTargetMinutes: selectedSpecimen.dailyMinutes,
    totalTargetMinutes: selectedSpecimen.dailyMinutes * selectedSpecimen.suggestedDurationDays,
    accruedMinutes: Math.round(selectedSpecimen.dailyMinutes * selectedSpecimen.suggestedDurationDays * 0.48),
    isComplete: false,
    health: 100,
    perfectionScore: 1.0
  }), [selectedSpecimen]);

  // Sanctuary culmination mature titan sequoia
  const matureGoal: SaplingGoal = useMemo(() => ({
    id: 'mature-grove-monument',
    name: 'Sanctuary Canopy',
    type: TreeType.SEQUOIA,
    timeline: TimelineType.YEAR,
    startDate: Date.now(),
    durationInDays: 365,
    dailyTargetMinutes: 60,
    totalTargetMinutes: 365 * 60,
    accruedMinutes: 365 * 60,
    isComplete: true,
    health: 100,
    perfectionScore: 1.0
  }), []);

  return (
    <div className="min-h-screen bg-[#040a04] text-[#dde5da] relative overflow-x-hidden selection:bg-[#4ade80] selection:text-black">
      {/* Botanical Lightweight Germination Loader */}
      <SaplingLoader
        isReady={isPageReady}
        minDisplayMs={750}
        maxTimeoutMs={2200}
      />

      {/* TOP NAVIGATION — Cyber-Botanical Architectural Header (Matching reference image) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#040a04]/90 backdrop-blur-md border-b border-green-950/70 px-4 sm:px-8 py-3 flex justify-between items-center transition-all pt-safe">
        {/* Brand Mark */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#081508] border border-green-500/50 flex items-center justify-center relative shadow-[0_0_12px_rgba(74,222,128,0.3)]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-[#4ade80]">
              <path d="M12 21V9M12 9C12 9 8 5 4 5C4 5 4 8 8 11M12 9C12 9 16 5 20 5C20 5 20 8 16 11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              <circle cx="12" cy="7" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <span className="font-orbitron text-sm sm:text-base tracking-[0.2em] text-white font-bold uppercase">
            SAPLING
          </span>
        </div>

        {/* Navigation Markers */}
        <nav aria-label="Landing Page Navigation" className="hidden lg:flex items-center gap-8 font-display text-[11px] tracking-widest text-green-400/80">
          <a href="#chamber" className="text-[#4ade80] font-bold border-b border-[#4ade80] pb-0.5">HOME</a>
          <a href="#ecosystem" className="hover:text-[#4ade80] transition-colors">GROVE</a>
          <a href="#herbarium" className="hover:text-[#4ade80] transition-colors">ABOUT</a>
          <a href="#manifesto" className="hover:text-[#4ade80] transition-colors">MANIFESTO</a>
        </nav>

        {/* Action Threshold */}
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="hidden xl:inline font-display text-[10px] text-green-500/80 tracking-widest uppercase">
            — A CALMER TOMORROW →
          </span>
          <button
            onClick={onOpenAuth}
            className="px-3 py-1.5 border border-green-900/60 hover:border-green-600/80 text-green-400/90 hover:text-green-200 font-display text-[10px] sm:text-xs tracking-wider transition-all min-h-[38px] flex items-center press-tactile"
          >
            {isAuthenticated 
              ? `[ ${user?.displayName?.split(' ')[0] || 'USER'} ]` 
              : <span className="hidden sm:inline">[ LOGIN ]</span>}
            {!isAuthenticated && <span className="sm:hidden">[ LOGIN ]</span>}
          </button>
          <button
            onClick={() => onEnterApp({ openNewSeed: true })}
            className="px-4 py-1.5 border border-[#4ade80]/90 bg-[#061e0a]/80 hover:bg-[#4ade80] hover:text-black text-[#86efac] font-orbitron font-bold text-[10px] sm:text-xs tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(74,222,128,0.3)] min-h-[38px] flex items-center press-tactile"
          >
            [ PLANT A SEED ]
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* SECTION 1: HERO — ASYMMETRIC CINEMATIC CYBER-BOTANICAL WORLD             */}
      {/* ========================================================================= */}
      <section 
        id="chamber" 
        className="min-h-[100svh] w-full flex flex-col justify-between px-4 sm:px-8 lg:px-12 relative border-b border-green-950/70 pt-16 sm:pt-20 pb-2 overflow-hidden"
      >
        {/* CINEMATIC ENVIRONMENTAL BACKDROP — Cyber-Botanical Metropolis Matte */}
        <div 
          className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
          aria-hidden="true"
        >
          <img 
            src="/assets/environment-backdrop.jpg?v=3" 
            alt="" 
            className="w-full h-full object-cover object-center opacity-75 sm:opacity-85 filter brightness-95 contrast-105" 
          />
          {/* Depth vignettes blending seamlessly into dark cyber-emerald tones */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#040a04] via-transparent to-[#040a04]/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#040a04]/90 via-transparent to-[#040a04]/90" />
          <div className="absolute inset-0 bg-[#040a04]/30 backdrop-blur-[0.5px]" />
        </div>

        {/* UNIFIED RESPONSIVE HERO COMPOSITION (ONE WebGL Canvas, Responsive Hierarchy) */}
        <div className="max-w-[1440px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 xl:gap-8 items-center z-10 my-auto py-2 lg:py-4">
          
          {/* Column 1: Monumental Narrative & Primary Action (Desktop: Left col-span-4 / Mobile: Top Order 1) */}
          <div className="lg:col-span-4 space-y-4 lg:space-y-5 text-center lg:text-left order-1">
            {/* Category Subtitle */}
            <div className="font-display text-[9px] sm:text-[10px] lg:text-[10.5px] text-green-400/90 tracking-widest uppercase font-medium">
              A DIGITAL GROVE FOR A MORE INTENTIONAL YOU
            </div>

            {/* Asymmetric Monumental Headline */}
            <h1 className="font-orbitron text-3xl xs:text-4xl sm:text-5xl xl:text-6xl font-black text-white tracking-tight leading-[0.98] lg:leading-[0.96] drop-shadow-[0_0_30px_rgba(74,222,128,0.25)]">
              FOCUS<br />
              GROWS<br />
              <span className="text-[#4ade80] drop-shadow-[0_0_40px_rgba(74,222,128,0.5)]">WORLDS</span>
            </h1>

            {/* Narrative Body Copy */}
            <div className="font-editorial text-sm sm:text-base xl:text-lg text-zinc-300 font-light leading-relaxed max-w-md mx-auto lg:mx-0">
              <p>Your attention is a seed.</p>
              <p>Focus becomes growth.</p>
            </div>

            {/* Primary Action Button (Desktop) */}
            <div className="hidden lg:block pt-1">
              <button
                onClick={() => onEnterApp({ openNewSeed: true })}
                className="px-7 py-3 border border-[#4ade80] bg-[#051c09]/90 hover:bg-[#4ade80] text-[#86efac] hover:text-black font-orbitron font-bold text-xs sm:text-sm tracking-widest uppercase shadow-[0_0_25px_rgba(74,222,128,0.35)] transition-all flex items-center gap-2.5 press-tactile"
              >
                <span>🌱</span>
                <span>PLANT A SEED →</span>
              </button>
            </div>

            {/* Social Proof / Community Avatar Stack (Desktop) */}
            <div className="hidden lg:flex items-center gap-3 pt-1">
              <div className="flex -space-x-2 overflow-hidden">
                {[
                  { initials: 'EL', bg: 'bg-emerald-950 border-emerald-500/60 text-emerald-300' },
                  { initials: 'RN', bg: 'bg-green-950 border-green-500/60 text-green-300' },
                  { initials: 'KZ', bg: 'bg-teal-950 border-teal-500/60 text-teal-300' },
                  { initials: 'MJ', bg: 'bg-lime-950 border-lime-500/60 text-lime-300' }
                ].map((av, idx) => (
                  <div 
                    key={idx} 
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-[9px] font-display font-bold shadow-sm ${av.bg}`}
                  >
                    {av.initials}
                  </div>
                ))}
              </div>
              <span className="font-display text-[8.5px] tracking-wider text-green-400/80 uppercase">
                JOIN A GROWING COMMUNITY OF FOCUSED MINDS
              </span>
            </div>
          </div>

          {/* Column 2: 3D Cultivation Chamber Housing 3D Voxel Specimen — EXACTLY ONE CANVAS MOUNT */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative order-2 w-full">
            <div className="relative w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[500px] xl:max-w-[530px] h-[300px] sm:h-[370px] lg:h-[500px] xl:h-[530px] flex items-center justify-center cursor-grab active:cursor-grabbing">
              {/* The Single Responsive Three.js Hero Canvas */}
              <CyberBotanicalWorld 
                variant="hero" 
                goal={heroGoal} 
                treeType={heroTreeType}
                progress={1.0}
                interactiveOrbit={true}
                onReady={() => setIsHeroCanvasReady(true)}
                className="z-0" 
              />

              {/* Ambient Pedestal Glow */}
              <div className="absolute inset-0 chamber-glow pointer-events-none z-1" />

              {/* Mobile/Tablet Touch Interaction Overlay */}
              <div className="lg:hidden absolute inset-x-2 bottom-1 z-20 flex justify-between items-center font-display text-[7.5px] text-green-400/90 tracking-wider bg-[#040a04]/90 backdrop-blur-md px-2.5 py-1 border border-green-800/40 pointer-events-none">
                <span className="font-bold">SPECIMEN // {heroTreeType.toUpperCase()}</span>
                <span className="text-[#4ade80]">DRAG TO ROTATE // BRUSH LEAVES</span>
              </div>
            </div>
          </div>

          {/* Column 3: Botanical Accession Plate + Species Switcher (Desktop: Right col-span-3 / Mobile: Bottom Order 3) */}
          <div className="lg:col-span-3 flex flex-col justify-between w-full text-left order-3 space-y-3.5 lg:space-y-0 lg:h-[480px] lg:py-2">
            
            {/* Mobile Species Accession Strip: Smooth horizontal touch scroll with >=44px touch targets */}
            <div className="lg:hidden w-full space-y-2">
              <div className="flex items-center justify-between text-[8px] font-display text-green-400/90 uppercase tracking-wider px-1">
                <span>BOTANICAL ARCHIVE</span>
                <span className="text-zinc-500">SCROLL TO SELECT SPECIMEN →</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1 -mx-1 touch-pan-x">
                {HERO_SPECIES_LIST.map(t => {
                  const isSelected = heroTreeType === t;
                  const label = t === TreeType.CHERRY_BLOSSOM ? 'CHERRY' : t.toUpperCase();
                  return (
                    <button
                      key={t}
                      onClick={() => setHeroTreeType(t)}
                      className={`min-h-[44px] px-3.5 py-2 whitespace-nowrap text-[9px] font-display uppercase tracking-wider transition-all cursor-pointer shrink-0 rounded-none flex items-center gap-1.5 press-tactile ${
                        isSelected
                          ? 'border border-[#4ade80] bg-[#0d3314] text-[#86efac] font-bold shadow-[0_0_12px_rgba(74,222,128,0.35)]'
                          : 'border border-green-900/60 bg-[#020a03]/80 text-green-400/70 hover:border-green-600 hover:text-green-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#4ade80]' : 'bg-green-800'}`} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Primary Action Button: Prominently visible right under selector */}
              <div className="pt-1.5">
                <button
                  onClick={() => onEnterApp({ openNewSeed: true })}
                  className="w-full min-h-[46px] border border-[#4ade80] bg-[#051c09]/95 hover:bg-[#4ade80] text-[#86efac] hover:text-black font-orbitron font-bold text-xs tracking-widest uppercase shadow-[0_0_20px_rgba(74,222,128,0.35)] transition-all flex items-center justify-center gap-2 press-tactile"
                >
                  <span>🌱</span>
                  <span>PLANT A SEED →</span>
                </button>
              </div>
            </div>

            {/* Botanical Accession Plate: Clean, editorial museum-grade specimen record */}
            <div className="p-3.5 sm:p-4 bg-[#030e05]/95 backdrop-blur-md border border-green-500/40 font-display text-[9px] space-y-3 shadow-[0_0_20px_rgba(74,222,128,0.15)]">
              <div className="border-b border-green-900/50 pb-2 flex items-center justify-between">
                <div>
                  <div className="text-zinc-500 text-[7px] uppercase tracking-widest">ACCESSION RECORD</div>
                  <div className="text-green-400 font-bold tracking-wider font-orbitron text-xs">
                    {heroTreeType.toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-500 text-[7px] uppercase tracking-widest">CANOPY</div>
                  <div className="text-green-300 text-[8px] tracking-wide">
                    {SPECIES_BOTANICAL_DATA[heroTreeType]?.canopy || 'Voxelized'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[8px]">
                <div>
                  <div className="text-zinc-500 text-[7px] uppercase tracking-widest">TAXON</div>
                  <div className="text-zinc-300 italic font-editorial text-[10px]">
                    {SPECIES_BOTANICAL_DATA[heroTreeType]?.scientific || 'Specimen'}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500 text-[7px] uppercase tracking-widest">DEVELOPMENT</div>
                  <div className="text-[#4ade80] font-bold tracking-wider">MATURE</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[8px]">
                <div>
                  <div className="text-zinc-500 text-[7px] uppercase tracking-widest">ORIGIN HABITAT</div>
                  <div className="text-zinc-300">
                    {SPECIES_BOTANICAL_DATA[heroTreeType]?.origin || 'Sanctuary'}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500 text-[7px] uppercase tracking-widest">RECORDED SESSIONS</div>
                  <div className="text-white font-bold tabular-nums">42 UNITS</div>
                </div>
              </div>

              {/* Desktop Species Selector Strip: Clean horizontal accession strip */}
              <div className="hidden lg:block pt-2 border-t border-green-900/50">
                <div className="text-zinc-500 text-[7px] uppercase tracking-widest pb-1.5 flex items-center justify-between">
                  <span>SPECIMEN TAXONOMY</span>
                  <span className="text-green-500/80">11 CULTIVARS</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {HERO_SPECIES_LIST.map(t => {
                    const isSelected = heroTreeType === t;
                    const label = t === TreeType.CHERRY_BLOSSOM ? 'CHERRY' : t.toUpperCase();
                    return (
                      <button
                        key={t}
                        onClick={() => setHeroTreeType(t)}
                        className={`px-2 py-1 text-[7.5px] font-display uppercase tracking-wider transition-all cursor-pointer ${
                          isSelected
                            ? 'border border-[#4ade80] bg-[#0d3314] text-[#86efac] font-bold shadow-[0_0_8px_rgba(74,222,128,0.3)]'
                            : 'border border-green-900/60 bg-black/60 text-green-400/80 hover:border-green-500 hover:text-green-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Far Right Atmospheric Copy (Desktop) */}
            <div className="hidden lg:block font-display text-[10px] text-green-400/80 tracking-widest leading-relaxed pt-2">
              <span className="text-white font-bold">REAL</span><br />
              trees for a<br />
              brighter<br />
              tomorrow.
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* THE 6-CARD INTERACTIVE FEATURE INSTRUMENTS BAR (Directly matching image)  */}
        {/* ========================================================================= */}
        <div className="w-full max-w-[1440px] mx-auto z-10 pt-2 pb-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 xl:gap-2.5">
            {featureInstruments.map((card) => (
              <HeroTiltCard key={card.id} card={card} />
            ))}
          </div>
        </div>

        {/* BOTTOM TICKER / STATUS BAR (Directly matching image footer) */}
        <div className="w-full border-t border-green-950/80 bg-[#020702]/90 backdrop-blur-md px-4 sm:px-8 py-1.5 flex flex-col sm:flex-row items-center justify-between gap-1.5 font-display text-[8px] sm:text-[8.5px] text-green-500/80 tracking-widest uppercase z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-[#4ade80]">🌱</span>
            <span>DISCIPLINE TODAY / A BRIGHTER TOMORROW</span>
          </div>
          <a href="#germination" className="flex flex-col items-center group text-green-400/90 hover:text-[#4ade80] transition-colors cursor-pointer">
            <span className="text-[7.5px]">SCROLL TO EXPLORE</span>
            <span className="animate-bounce text-[9px]">↓</span>
          </a>
          <div>
            <span>SAPLING v1.0 / CULTIVATING BETTER DAYS TOGETHER</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: GERMINATION AXIS — INTERACTIVE MATURATION SCRUBBER (NO AUTH)  */}
      {/* ========================================================================= */}
      <section 
        ref={germinationSectionRef}
        id="germination" 
        className="py-20 sm:py-28 px-4 sm:px-8 border-b border-green-950/60 bg-[#050d05] relative"
      >
        <div className="max-w-5xl mx-auto space-y-10 sm:space-y-12">
          {/* Section Introduction */}
          <div className="space-y-3 max-w-2xl text-left">
            <span className="font-display text-[10px] text-green-500 tracking-widest uppercase">
              02 // THE GERMINATION AXIS
            </span>
            <h2 className="font-display text-2xl sm:text-4xl text-white uppercase font-bold tracking-tight">
              ATTENTION BECOMES CELLULAR GROWTH.
            </h2>
            <p className="font-editorial text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed text-pretty">
              Every completed focus interval triggers real-time wood synthesis. Touch the axis to scrub through the morphological evolution of your specimen.
            </p>
          </div>

          {/* Interactive Biological Chamber Interface */}
          <div className="border border-green-900/50 bg-[#081508]/95 p-5 sm:p-10 shadow-2xl space-y-6 sm:space-y-8 relative overflow-hidden">
            {/* Interactive Axis Selector Tabs */}
            <div className="grid grid-cols-5 gap-1 sm:gap-3 border-b border-green-950/80 pb-4 sm:pb-6">
              {STAGES.map((stg, idx) => {
                const isActive = activeStageIndex === idx && customProgress === null;
                return (
                  <button
                    key={stg.label}
                    onClick={() => {
                      setActiveStageIndex(idx);
                      setCustomProgress(null);
                    }}
                    className={`py-2 sm:py-3 px-1 sm:px-3 text-center transition-all min-h-[44px] flex flex-col items-center justify-center press-tactile ${
                      isActive
                        ? 'bg-green-950/70 border border-[#4ade80] text-white shadow-[0_0_12px_rgba(74,222,128,0.25)]'
                        : 'bg-transparent border border-green-950/80 text-green-600/90 hover:border-green-800 hover:text-green-400'
                    }`}
                  >
                    <span className="font-display text-[8px] xs:text-[9px] sm:text-xs font-bold tracking-wider">{stg.label}</span>
                    <span className="font-display text-[7px] sm:text-[8px] opacity-70 hidden sm:inline tabular-nums">{stg.pct}%</span>
                  </button>
                );
              })}
            </div>

            {/* Continuous Tactile Scrubber Track */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center font-display text-[9px] text-green-500/80 tracking-wider">
                <span>TACTILE MATURATION SCRUBBER</span>
                <span className="text-white font-bold tabular-nums">
                  {customProgress !== null ? `${customProgress}%` : `${STAGES[activeStageIndex].pct}%`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={customProgress !== null ? customProgress : STAGES[activeStageIndex].pct}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCustomProgress(val);
                  const closest = STAGES.reduce((prev, curr, idx) => 
                    Math.abs(curr.pct - val) < Math.abs(STAGES[prev].pct - val) ? idx : prev
                  , 0);
                  setActiveStageIndex(closest);
                }}
                className="w-full accent-[#4ade80] bg-green-950/60 h-2 rounded-none cursor-pointer"
                aria-label="Tree maturation progress slider"
              />
            </div>

            {/* Specimen Showcase with Interactive 3D Voxel Botanical Canvas */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center pt-2">
              <div className="md:col-span-5 flex flex-col items-center justify-center">
                <div className="w-52 sm:w-64 aspect-square flex items-center justify-center relative cursor-grab active:cursor-grabbing">
                  <div className="absolute inset-0 rounded-full bg-green-500/5 blur-xl pointer-events-none" />
                  <VoxelTreeCanvas 
                    goal={stageGoal} 
                    size={250} 
                    interactiveOrbit={true} 
                    isActive={activeSpecimenSection === 'germination'}
                    onActivate={() => setActiveSpecimenSection('germination')}
                  />
                </div>
                <div className="font-display text-[9px] sm:text-[10px] text-green-400 tracking-wider text-center mt-2">
                  // {STAGES[activeStageIndex].status}
                </div>
              </div>

              <div className="md:col-span-7 space-y-3 sm:space-y-4 text-left">
                <div className="inline-block px-2.5 py-0.5 border border-green-800/60 bg-green-950/40 text-green-400 font-display text-[9px] tracking-widest uppercase">
                  MORPHOLOGICAL PHASE
                </div>
                <h3 className="font-display text-xl sm:text-3xl text-white font-bold tracking-tight">
                  {STAGES[activeStageIndex].stageName}
                </h3>
                <p className="font-editorial text-sm sm:text-base text-zinc-300 leading-relaxed">
                  {STAGES[activeStageIndex].desc}
                </p>
                <div className="pt-3 flex items-center justify-between border-t border-green-950/90 font-display text-[9px] sm:text-[10px] text-green-400/90">
                  <span>DISCIPLINE EQUIVALENT:</span>
                  <span className="text-white font-bold tabular-nums">
                    {stageGoal.accruedMinutes} / 25 ACCRUED FOCUS MINUTES
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: ARCHIVAL HERBARIUM — INTENTIONS AS BOTANICAL CULTIVATION      */}
      {/* ========================================================================= */}
      <section 
        ref={herbariumSectionRef}
        id="herbarium" 
        className="py-20 sm:py-28 px-4 sm:px-8 border-b border-green-950/60 bg-[#040a04] relative dither-grid"
      >
        <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12">
          {/* Section Header */}
          <div className="space-y-3 max-w-2xl text-left">
            <span className="font-display text-[10px] text-green-500 tracking-widest uppercase">
              03 // ARCHIVAL HERBARIUM
            </span>
            <h2 className="font-display text-2xl sm:text-4xl text-white uppercase font-bold tracking-tight">
              WHAT WILL YOU GROW?
            </h2>
            <p className="font-editorial text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed text-pretty">
              Focus is not the avoidance of distraction; it is the deliberate cultivation of intent.
              Select an intention to inspect its paired botanical species and discipline cadence.
            </p>
          </div>

          {/* Herbarium Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Specimen Index Drawer */}
            <div className="lg:col-span-5 space-y-2">
              <div className="font-display text-[10px] text-green-600 uppercase tracking-widest px-1 pb-1">
                ARCHIVAL SPECIMENS [ SELECT ONE ]
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-[520px] overflow-y-auto pr-1.5 custom-scrollbar">
                {SPECIMENS.map((specimen) => {
                  const isSelected = selectedSpecimen.id === specimen.id;
                  return (
                    <button
                      key={specimen.id}
                      onClick={() => setSelectedSpecimen(specimen)}
                      className={`w-full text-left p-3 sm:p-3.5 border transition-all flex flex-col justify-between min-h-[48px] press-tactile ${
                        isSelected
                          ? 'border-[#4ade80] bg-[#0d1d0d] text-white shadow-[0_0_15px_rgba(74,222,128,0.2)]'
                          : 'border-green-950/80 bg-[#061206]/80 text-zinc-400 hover:border-green-800 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-display text-xs sm:text-sm font-bold tracking-wider">
                          {specimen.title}
                        </span>
                        <span className="font-display text-[8px] text-[#4ade80] tracking-widest uppercase">
                          {specimen.treeType}
                        </span>
                      </div>
                      <span className="font-editorial text-xs text-zinc-400 line-clamp-1 mt-0.5">
                        {specimen.tagline.split('//')[1] || specimen.tagline}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Active Specimen Cultivation Plate */}
            <div className="lg:col-span-7 border border-green-900/60 bg-[#071607] p-5 sm:p-8 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-green-950 pb-4 gap-2">
                <div>
                  <span className="font-display text-[9px] text-[#4ade80] tracking-widest uppercase">
                    SPECIMEN ARCHIVE // {selectedSpecimen.id.toUpperCase()}
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl text-white font-bold tracking-tight">
                    {selectedSpecimen.title} — {selectedSpecimen.treeType}
                  </h3>
                </div>
                <div className="font-display text-[10px] text-green-400 bg-black/60 px-3 py-1.5 border border-green-900/50 self-start sm:self-auto tabular-nums">
                  RITUAL: {selectedSpecimen.dailyMinutes}M / DAY
                </div>
              </div>

              {/* Single Central 3D Voxel Botanical Specimen Preview */}
              <div className="w-full flex flex-col items-center justify-center py-3 relative">
                <div className="w-60 sm:w-72 md:w-80 aspect-square flex items-center justify-center cursor-grab active:cursor-grabbing">
                  <VoxelTreeCanvas 
                    goal={specimenGoal} 
                    size={300} 
                    interactiveOrbit={true} 
                    isActive={activeSpecimenSection === 'herbarium'}
                    onActivate={() => setActiveSpecimenSection('herbarium')}
                  />
                </div>
                <div className="font-display text-[9px] text-green-500 tracking-wider text-center mt-2">
                  {selectedSpecimen.tagline} // DRAG TO ROTATE 3D VOXEL SPECIMEN
                </div>
              </div>

              {/* Botanical Philosophy & Action Threshold */}
              <div className="space-y-4 pt-2 border-t border-green-950">
                <p className="font-editorial text-sm sm:text-base text-zinc-300 italic leading-relaxed">
                  "{selectedSpecimen.philosophy}"
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="font-display text-[10px] text-green-500 tabular-nums">
                    RECOMMENDED HORIZON: {selectedSpecimen.suggestedDurationDays} DAYS
                  </div>
                  <button
                    onClick={() => onEnterApp({ 
                      openNewSeed: true, 
                      presetTree: selectedSpecimen.treeType, 
                      presetName: selectedSpecimen.title 
                    })}
                    className="px-6 py-3 bg-[#4ade80] hover:bg-[#22c55e] text-black font-display font-bold text-[10px] sm:text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(74,222,128,0.3)] min-h-[44px] flex items-center justify-center press-tactile"
                  >
                    [ CULTIVATE THIS SEED ]
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: SANCTUARY ARCHITECTURE — NO CARD GRIDS (LIVING INSTRUMENTS)   */}
      {/* ========================================================================= */}
      <section id="ecosystem" className="py-20 sm:py-28 px-4 sm:px-8 border-b border-green-950/60 bg-[#050d05] relative">
        <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12">
          {/* Section Introduction */}
          <div className="space-y-3 max-w-2xl text-left">
            <span className="font-display text-[10px] text-green-500 tracking-widest uppercase">
              04 // ECOSYSTEM ARCHITECTURE
            </span>
            <h2 className="font-display text-2xl sm:text-4xl text-white uppercase font-bold tracking-tight">
              A COMPLETE FOCUS SANCTUARY.
            </h2>
            <p className="font-editorial text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed text-pretty">
              Sapling avoids disconnected widgets. Each instrument is an architectural organ of one unified digital forest.
            </p>
          </div>

          {/* Architectural Blueprint Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            {/* 1. GROVE — Sanctuary Hub (Dominant Monumental Anchor) */}
            <div className="lg:col-span-12 border border-green-900/60 bg-[#081808] p-6 sm:p-10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-green-950 pb-4 gap-2">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80] shadow-[0_0_8px_#4ade80]" />
                  <span className="font-display text-base sm:text-lg text-white font-bold tracking-wider">
                    [ THE GROVE ]
                  </span>
                </div>
                <span className="font-display text-[9px] text-[#4ade80] tracking-widest uppercase">
                  PERSISTENT CANOPY SANCTUARY
                </span>
              </div>
              <p className="font-editorial text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed max-w-3xl">
                Your permanent botanical grove. Every completed intention takes root here as a living pixel tree.
                Watch accrued minutes translate into towering trunks, listen to ambient natural audio, and inspect your accumulated discipline over seasons.
              </p>
              <div className="font-display text-[9px] sm:text-[10px] text-green-500/90 pt-2 flex flex-wrap gap-4">
                <span>• PERMANENT WOOD SYNTHESIS</span>
                <span>• LIVING TREE SPECIES</span>
                <span>• RESTORATIVE AUDIO ENGINE</span>
              </div>
            </div>

            {/* 2. GROOVE — Free-form Flow Instrument */}
            <div className="lg:col-span-6 border border-green-900/50 bg-[#061406] p-6 sm:p-8 space-y-4">
              <div className="flex justify-between items-center border-b border-green-950 pb-3">
                <span className="font-display text-sm sm:text-base text-white font-bold">[ GROOVE ]</span>
                <span className="font-display text-[9px] text-[#4ade80] tracking-widest uppercase">00:00 → ∞ FREE-FORM</span>
              </div>
              <p className="font-editorial text-sm text-zinc-300 leading-relaxed">
                Zero countdown. Zero artificial pressure. Just unencumbered flow.
                Start the session and watch your tree synthesize cellular wood in real time, harvesting only when your natural concentration finishes.
              </p>
              <div className="font-display text-[9px] text-green-500 pt-2 border-t border-green-950">
                • OPEN ELAPSED TIME + LIVE WOOD SYNTHESIS
              </div>
            </div>

            {/* 3. CHRONOS — Structured Temporal Ritual */}
            <div className="lg:col-span-6 border border-green-900/50 bg-[#061406] p-6 sm:p-8 space-y-4">
              <div className="flex justify-between items-center border-b border-green-950 pb-3">
                <span className="font-display text-sm sm:text-base text-white font-bold">[ CHRONOS ]</span>
                <span className="font-display text-[9px] text-amber-400 tracking-widest uppercase">25:00 → 00:00 RITUAL</span>
              </div>
              <p className="font-editorial text-sm text-zinc-300 leading-relaxed">
                Structured countdown sessions for disciplined work sprints. Accompanied by pixel birds, floating butterflies, ambient soundscapes, and restorative sanctuary intervals.
              </p>
              <div className="font-display text-[9px] text-amber-500/90 pt-2 border-t border-green-950">
                • POMODORO INTERVALS + SANCTUARY BREAKS
              </div>
            </div>

            {/* 4. LOGS — Growth Rings Archive */}
            <div className="lg:col-span-6 border border-green-950 bg-[#040d04] p-5 sm:p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-display text-xs sm:text-sm text-zinc-200 font-bold">[ LOGS ]</span>
                <span className="font-display text-[8px] text-green-500 uppercase">ARCHIVE</span>
              </div>
              <p className="font-editorial text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Permanent records of every session with exact durations, timestamps, mode tags, and completed flora permanently housed in the sanctuary archive.
              </p>
            </div>

            {/* 5. POMO — Rapid Utility Launcher */}
            <div className="lg:col-span-6 border border-green-950 bg-[#040d04] p-5 sm:p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-display text-xs sm:text-sm text-zinc-200 font-bold">[ POMO ]</span>
                <span className="font-display text-[8px] text-green-500 uppercase">RAPID UTILITY</span>
              </div>
              <p className="font-editorial text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Instant focus alignment allowing on-the-fly toggling between circular countdown Chronos and free-form tree Groove modes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: ANI — A QUIET SANCTUARY COMPANION                             */}
      {/* ========================================================================= */}
      <section id="ani" className="py-20 sm:py-28 px-4 sm:px-8 border-b border-green-950/60 bg-[#040a04] relative dither-grid">
        <div className="max-w-4xl mx-auto border border-green-900/60 bg-[#071507] p-6 sm:p-12 shadow-2xl space-y-6 sm:space-y-7">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80] animate-pulse shadow-[0_0_10px_#4ade80]" />
            <span className="font-display text-[10px] text-[#4ade80] tracking-widest uppercase font-bold">
              GROVE COMPANION CONSOLE // OBSERVER
            </span>
          </div>

          <div className="space-y-4 text-left">
            <h2 className="font-display text-2xl sm:text-4xl text-white font-bold tracking-tight">
              A QUIET PRESENCE IN THE GROVE.
            </h2>
            <div className="space-y-1 font-display text-sm sm:text-base text-zinc-300 leading-relaxed">
              <div><span className="text-[#4ade80] font-bold">YOU</span> cultivate focus.</div>
              <div><span className="text-[#4ade80] font-bold">SAPLING</span> records biological growth.</div>
              <div><span className="text-[#4ade80] font-bold">ANI</span> understands the grove.</div>
            </div>
          </div>

          {/* Authentic Companion Dialogue Excerpt */}
          <div className="border-l-2 border-[#4ade80] pl-4 sm:pl-6 py-3 bg-black/40 text-zinc-300 font-editorial text-sm sm:text-lg italic leading-relaxed text-left">
            "Your grove breathes quietly today. The hours you poured into the Sequoia are beginning to weather. Rest well tonight; consistency will do the rest tomorrow."
          </div>

          <p className="font-editorial text-xs sm:text-sm text-zinc-400 leading-relaxed text-left">
            Ani is not an urgent chatbot demanding your attention. It is a calm, unhurried companion that observes your grove, offers thoughtful reflections, and respects your silence.
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6: THE MANIFESTO — QUIET SECTION (MOMENT OF SILENCE)              */}
      {/* ========================================================================= */}
      <section id="manifesto" className="py-28 sm:py-40 px-4 sm:px-8 border-b border-green-950/60 bg-[#020702] text-center relative">
        <div className="max-w-2xl mx-auto space-y-8 sm:space-y-9">
          <span className="font-display text-[10px] text-green-500 tracking-widest uppercase">
            05 // THE SANCTUARY MANIFESTO
          </span>

          <h2 className="font-display text-2xl sm:text-4xl text-white font-bold tracking-tight leading-snug">
            YOU DO NOT NEED<br />
            TO OPTIMIZE EVERYTHING.
          </h2>

          <div className="space-y-3 font-editorial text-lg sm:text-2xl text-zinc-300 font-light leading-relaxed">
            <p>Some things simply need your attention.</p>
            <p className="text-[#4ade80] font-display text-xs sm:text-sm pt-4 tracking-widest uppercase font-bold">
              Plant an intention. Let consistency do the growing.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 7: FINAL CULMINATION — THE MATURE CANOPY THRESHOLD               */}
      {/* ========================================================================= */}
      <section className="py-24 sm:py-36 px-4 sm:px-8 bg-gradient-to-t from-[#020502] to-[#040a04] text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-7 sm:space-y-8 relative z-10">
          {/* Majestic mature tree canopy — Monumental 3D Voxel Titan Sequoia Sanctuary */}
          <div className="w-full max-w-2xl h-[360px] sm:h-[440px] mx-auto flex items-center justify-center relative cursor-grab active:cursor-grabbing">
            <div className="absolute inset-0 rounded-full bg-green-500/10 blur-3xl pointer-events-none" />
            <InViewGroveCanvas goal={matureGoal} />
            <div className="absolute bottom-2 inset-x-0 font-display text-[8px] sm:text-[8.5px] text-green-500/80 tracking-widest uppercase pointer-events-none">
              TITAN SEQUOIA // PERMANENT MATURE GROVE CANOPY
            </div>
          </div>

          <div className="space-y-3">
            <span className="font-display text-[10px] text-green-500 tracking-widest uppercase">
              THE SANCTUARY AWAITS
            </span>
            <h2 className="font-display text-2xl xs:text-3xl sm:text-5xl text-white font-bold tracking-tight">
              THIS IS YOUR GROVE.<br />
              IT STARTS WITH ONE SEED.
            </h2>
            <p className="font-editorial text-sm sm:text-base md:text-lg text-zinc-300 max-w-md mx-auto leading-relaxed text-pretty">
              Step into the cyber-botanical world. Turn your attention into something permanent.
            </p>
          </div>

          {/* Singular magnetic action threshold */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto pt-2">
            <button
              onClick={() => onEnterApp({ openNewSeed: true })}
              className="w-full sm:flex-1 py-4 px-6 bg-[#4ade80] hover:bg-[#22c55e] text-black font-display font-bold text-xs sm:text-sm tracking-widest uppercase shadow-[0_0_30px_rgba(74,222,128,0.4)] transition-all min-h-[50px] flex items-center justify-center press-tactile"
            >
              [ PLANT A SEED ]
            </button>
            <button
              onClick={() => onEnterApp()}
              className="w-full sm:flex-1 py-4 px-6 border border-green-800 hover:border-green-500 text-green-300 font-display text-xs sm:text-sm tracking-widest uppercase transition-all min-h-[50px] flex items-center justify-center press-tactile"
            >
              [ ENTER GROVE ]
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER — 3-Column Community, Project, & Support Colophon */}
      <footer className="border-t border-green-950/80 bg-[#020502] text-zinc-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          
          {/* Column 1: Project Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="font-orbitron text-sm tracking-widest text-white font-bold uppercase">
                SAPLING GROOVE
              </span>
            </div>
            <p className="font-editorial text-xs sm:text-sm text-zinc-400 leading-relaxed">
              A mindful cyber-botanical productivity environment. Cultivate focus, watch your procedural canopies evolve, and anchor your daily intentions in stillness.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 font-display text-[9px] uppercase tracking-wider text-green-500">
              <a href="#manifesto" className="hover:text-green-300 transition-colors">[ MANIFESTO ]</a>
              <span>•</span>
              <a href="#ecosystem" className="hover:text-green-300 transition-colors">[ GROVE ]</a>
              <span>•</span>
              <a 
                href="https://github.com/aniruddhangujar/sapling-groove" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-green-300 transition-colors"
              >
                [ GITHUB ↗ ]
              </a>
            </div>
          </div>

          {/* Column 2: Community & Field Reports */}
          <div className="space-y-4">
            <div className="font-display text-[10px] text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-2">
              <span>COMMUNITY // FIELD REPORT</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-editorial">
              Notice a defect, have a feature vision, or wish to share your experience? Field reports are triaged directly by the creator.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => onOpenCommunity?.('feedback')}
                className="w-full text-left px-3 py-2 bg-[#051105] hover:bg-[#0c240c] border border-green-900/60 hover:border-green-500/60 rounded font-display text-[10px] text-emerald-300 uppercase tracking-wider transition-all min-h-[36px] flex items-center justify-between group cursor-pointer"
              >
                <span>[ 📝 LEAVE A FIELD REPORT ]</span>
                <span className="text-zinc-600 group-hover:text-emerald-400">→</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCommunity?.('contact')}
                className="w-full text-left px-3 py-2 bg-[#051105] hover:bg-[#0c240c] border border-green-900/60 hover:border-green-500/60 rounded font-display text-[10px] text-zinc-400 hover:text-zinc-200 uppercase tracking-wider transition-all min-h-[36px] flex items-center justify-between group cursor-pointer"
              >
                <span>[ ✉ CONTACT & CHANNELS ]</span>
                <span className="text-zinc-600 group-hover:text-emerald-400">→</span>
              </button>
            </div>
          </div>

          {/* Column 3: Support the Grove */}
          <div className="space-y-4">
            <div className="font-display text-[10px] text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-2">
              <span>SUPPORT THE GROVE</span>
            </div>
            <div className="bg-[#051105] border border-emerald-950/80 p-3 rounded space-y-2">
              <p className="font-display text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                Sapling's core experience is free to use.
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-editorial">
                Built for deep study and undistracted thought. Voluntary donations help cover serverless compute, soundscape synthesis, and continuous maintenance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenCommunity?.('support')}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-black font-display font-bold text-[10px] tracking-widest uppercase rounded shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>[ SUPPORT VIA GITHUB SPONSORS ↗ ]</span>
            </button>
          </div>

        </div>

        {/* Bottom Colophon Strip */}
        <div className="border-t border-green-950/80 py-6 px-4 sm:px-8 text-center font-display text-[8px] sm:text-[9px] text-green-600/80 uppercase tracking-widest space-y-1.5">
          <div>SAPLING // CYBER-BOTANICAL FOCUS PROTOCOL • v1.1.0</div>
          <div>LOCAL-FIRST • ZERO TRACKERS • WEB & PWA</div>
        </div>
      </footer>

      {/* Interactive Tactical Instrument Drawer */}
      <FeatureInstrumentDrawer
        instrumentId={activeDrawer}
        onClose={() => setActiveDrawer(null)}
        onEnterApp={onEnterApp}
      />
    </div>
  );
};

export default LandingPage;
