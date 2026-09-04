import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TreeType, TimelineType, SaplingGoal, IntentSpecimen } from '../types';
import SaplingCanvas from './SaplingCanvas';
import { useAuth } from '../context/AuthContext';

interface Props {
  onEnterApp: (options?: { openNewSeed?: boolean; presetTree?: TreeType; presetName?: string }) => void;
  onOpenAuth: () => void;
}

const SPECIMENS: IntentSpecimen[] = [
  {
    id: 'code',
    title: 'CODE',
    tagline: 'Pinus Sylvestris // Evergreen Logic',
    treeType: TreeType.PINE,
    suggestedDurationDays: 30,
    dailyMinutes: 60,
    iconName: 'terminal',
    philosophy: 'Like the pine through winter, deep logic requires resilient, quiet endurance.'
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
  }
];

const STAGES = [
  { label: 'SEED', title: 'The Silent Seed', pct: 0, accrued: 0, desc: 'An unformed intention sleeping in dark soil. Requires initial spark of dedication.' },
  { label: 'SPROUT', title: 'First Tender Shoot', pct: 25, accrued: 6, desc: 'Vulnerable green breaks the surface. The ritual begins to take hold.' },
  { label: 'SAPLING', title: 'Hardening Stem', pct: 50, accrued: 13, desc: 'Cellular synthesis accelerates. Focus becomes a steady, automatic rhythm.' },
  { label: 'TREE', title: 'Deep Heartwood', pct: 85, accrued: 21, desc: 'Strong canopy withstands distraction. Habit has hardened into character.' },
  { label: 'GROVE', title: 'Living Ecosystem', pct: 100, accrued: 25, desc: 'Full maturity reached. A permanent monument added to your sanctuary.' }
];

const LandingPage: React.FC<Props> = ({ onEnterApp, onOpenAuth }) => {
  const { user, isAuthenticated } = useAuth();
  const [selectedSpecimen, setSelectedSpecimen] = useState<IntentSpecimen>(SPECIMENS[0]);
  const [activeStageIndex, setActiveStageIndex] = useState(2); // Sapling stage
  const sporesContainerRef = useRef<HTMLDivElement>(null);

  // Restrained, slow ascending spores generator (only in key environmental moments)
  useEffect(() => {
    const container = sporesContainerRef.current;
    if (!container) return;
    container.innerHTML = '';

    // Modest particle count for atmosphere without visual clutter or CPU drain
    const count = window.innerWidth < 640 ? 14 : 24;
    for (let i = 0; i < count; i++) {
      const spore = document.createElement('div');
      const isAmber = Math.random() > 0.65;
      const size = Math.random() * 2.5 + 1.5;
      const left = Math.random() * 100;
      const top = 30 + Math.random() * 65;
      const duration = Math.random() * 8 + 7;
      const delay = Math.random() * 6;

      spore.className = 'absolute rounded-full pointer-events-none';
      spore.style.width = `${size}px`;
      spore.style.height = `${size}px`;
      spore.style.left = `${left}%`;
      spore.style.top = `${top}%`;
      spore.style.backgroundColor = isAmber ? '#fbbf24' : '#4ade80';
      spore.style.boxShadow = `0 0 6px ${isAmber ? 'rgba(251,191,36,0.5)' : 'rgba(74,222,128,0.5)'}`;
      spore.style.animation = `rise-spore ${duration}s ease-in-out ${delay}s infinite`;

      container.appendChild(spore);
    }
  }, []);

  // Hero interactive live pine seedling goal
  const heroGoal: SaplingGoal = useMemo(() => ({
    id: 'hero-pine-seed',
    name: 'Attention Seed',
    type: TreeType.PINE,
    timeline: TimelineType.DAY,
    startDate: Date.now(),
    durationInDays: 1,
    dailyTargetMinutes: 25,
    totalTargetMinutes: 25,
    accruedMinutes: 9,
    isComplete: false,
    health: 100,
    perfectionScore: 1.0
  }), []);

  // Growth Stage Explorer goal
  const stageGoal: SaplingGoal = useMemo(() => {
    const current = STAGES[activeStageIndex];
    return {
      id: 'growth-stage-goal',
      name: current.title,
      type: TreeType.OAK,
      timeline: TimelineType.DAY,
      startDate: Date.now(),
      durationInDays: 1,
      dailyTargetMinutes: 25,
      totalTargetMinutes: 25,
      accruedMinutes: current.accrued,
      isComplete: current.pct === 100,
      health: 100,
      perfectionScore: 1.0
    };
  }, [activeStageIndex]);

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
    accruedMinutes: Math.round(selectedSpecimen.dailyMinutes * selectedSpecimen.suggestedDurationDays * 0.45),
    isComplete: false,
    health: 100,
    perfectionScore: 1.0
  }), [selectedSpecimen]);

  // Culmination mature tree goal
  const matureGoal: SaplingGoal = useMemo(() => ({
    id: 'mature-grove-portal',
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
      {/* Restrained Environmental Rising Spores */}
      <div ref={sporesContainerRef} className="fixed inset-0 pointer-events-none z-0 overflow-hidden" />

      {/* TOP NAVIGATION — Clean, Dignified, Restrained */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#040a04]/90 backdrop-blur-md border-b border-green-950/70 px-4 sm:px-8 py-3 flex justify-between items-center transition-all pt-safe">
        {/* Brand Mark */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#081408] border border-green-600/40 flex items-center justify-center relative shadow-[0_0_12px_rgba(74,222,128,0.2)]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-[#4ade80]">
              <path d="M12 21V9M12 9C12 9 8 5 4 5C4 5 4 8 8 11M12 9C12 9 16 5 20 5C20 5 20 8 16 11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              <circle cx="12" cy="7" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <span className="font-display text-sm tracking-widest text-zinc-100 font-bold uppercase">
            SAPLING
          </span>
        </div>

        {/* Editorial Section Markers (Desktop) */}
        <nav aria-label="Landing Page Navigation" className="hidden md:flex items-center gap-8 font-display text-[11px] tracking-wider text-green-400/70">
          <a href="#growth" className="hover:text-[#4ade80] transition-colors">01 // GROWTH</a>
          <a href="#herbarium" className="hover:text-[#4ade80] transition-colors">02 // HERBARIUM</a>
          <a href="#ecosystem" className="hover:text-[#4ade80] transition-colors">03 // ECOSYSTEM</a>
          <a href="#philosophy" className="hover:text-[#4ade80] transition-colors">04 // MANIFESTO</a>
        </nav>

        {/* Action Threshold */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenAuth}
            className="px-3 py-1.5 border border-green-900/50 hover:border-green-600/80 text-green-400/90 hover:text-green-200 font-display text-[10px] sm:text-xs tracking-wider transition-all min-h-[38px] flex items-center"
          >
            {isAuthenticated 
              ? `[ ${user?.displayName?.split(' ')[0] || 'USER'} ]` 
              : <span className="hidden sm:inline">[ LOGIN ]</span>}
            {!isAuthenticated && <span className="sm:hidden">[ LOGIN ]</span>}
          </button>
          <button
            onClick={() => onEnterApp()}
            className="px-4 py-1.5 bg-[#4ade80] hover:bg-[#22c55e] text-black font-display font-bold text-[10px] sm:text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(74,222,128,0.3)] min-h-[38px] flex items-center"
          >
            [ ENTER GROVE ]
          </button>
        </div>
      </header>

      {/* SECTION 1: HERO — Atmospheric, Botanical-First Composition */}
      <section 
        id="hero" 
        className="min-h-[92svh] sm:min-h-[100svh] w-full flex flex-col justify-center px-4 sm:px-8 lg:px-12 relative border-b border-green-950/60 pt-20 sm:pt-24 pb-14 dither-grid"
      >
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center z-10">
          {/* Left Column: Monumental Headline & Narrative */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 text-green-500 font-display text-[10px] sm:text-xs tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
              <span>BOTANICAL ATTENTION PROTOCOL // GEN.001</span>
            </div>

            <h1 className="font-display text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.08]">
              YOUR ATTENTION<br />
              <span className="text-[#4ade80]">IS A SEED.</span>
            </h1>

            <p className="font-editorial text-base sm:text-lg md:text-xl text-zinc-300 font-normal leading-relaxed max-w-xl">
              Plant an intention. Give it dedicated focus. Watch your real-world discipline slowly synthesize into a living, permanent digital canopy.
            </p>

            {/* Clear Action Hierarchy */}
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3 pt-3">
              <button
                onClick={() => onEnterApp({ openNewSeed: true })}
                className="px-6 py-3.5 bg-[#4ade80] hover:bg-[#22c55e] text-black font-display font-bold text-xs sm:text-sm tracking-widest uppercase shadow-[0_0_25px_rgba(74,222,128,0.35)] transition-all min-h-[46px] flex items-center justify-center text-center"
              >
                [ PLANT YOUR SEED ]
              </button>
              <button
                onClick={() => onEnterApp()}
                className="px-6 py-3.5 border border-green-800/80 hover:border-green-500 bg-[#061206]/60 hover:bg-[#0c1f0c] text-green-300 font-display text-xs sm:text-sm tracking-widest uppercase transition-all min-h-[46px] flex items-center justify-center text-center"
              >
                [ EXPLORE THE GROVE ]
              </button>
            </div>
          </div>

          {/* Right Column: Grounded Living Specimen Pedestal */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center mt-2 lg:mt-0">
            <div className="relative w-64 xs:w-72 sm:w-80 md:w-88 aspect-square flex flex-col items-center justify-center">
              {/* Subtle ambient soil halo */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-green-500/10 via-green-950/20 to-transparent blur-2xl pointer-events-none" />

              {/* The living Pine seedling Canvas */}
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                <SaplingCanvas goal={heroGoal} size={300} animate={true} />
              </div>

              {/* Minimal botanical ground telemetry */}
              <div className="w-full mt-2 pt-2 border-t border-green-900/40 flex justify-between items-center font-display text-[9px] text-green-500/80 tracking-wider">
                <span>PINUS SYLVESTRIS</span>
                <span className="text-[#4ade80] font-bold">LAT 45.3 // SEEDLING</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quiet scroll indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 font-display text-[9px] text-green-600/70 tracking-widest pointer-events-none">
          <span>SCROLL TO NURTURE</span>
          <span className="text-xs">↓</span>
        </div>
      </section>

      {/* SECTION 2: THE GROWTH CYCLE — Interactive Biological Incubator */}
      <section id="growth" className="py-20 sm:py-28 px-4 sm:px-8 border-b border-green-950/60 bg-[#050c05] relative">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Section Introduction */}
          <div className="space-y-3 max-w-2xl">
            <span className="font-display text-[10px] text-green-500 tracking-widest uppercase">
              01 // THE GROWTH CYCLE
            </span>
            <h2 className="font-display text-2xl sm:text-4xl text-white uppercase font-bold tracking-tight">
              FOCUS GIVES IT LIFE.
            </h2>
            <p className="font-editorial text-base sm:text-lg text-zinc-300/90 leading-relaxed">
              Disposable to-do lists vanish when checked off. In Sapling, every focused minute materializes as cellular growth. Missed focus wilts the canopy; steady rituals restore health.
            </p>
          </div>

          {/* Interactive Biological Stage Explorer */}
          <div className="border border-green-900/50 bg-[#081208]/90 p-6 sm:p-10 shadow-2xl space-y-8">
            {/* Top: 5-Stage Tactile Axis */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-3 border-b border-green-950/70 pb-6">
              {STAGES.map((stg, idx) => {
                const isActive = activeStageIndex === idx;
                return (
                  <button
                    key={stg.label}
                    onClick={() => setActiveStageIndex(idx)}
                    className={`py-2 sm:py-3 px-1 sm:px-3 text-center transition-all min-h-[44px] flex flex-col items-center justify-center ${
                      isActive
                        ? 'bg-green-950/60 border border-[#4ade80] text-white shadow-[0_0_12px_rgba(74,222,128,0.25)]'
                        : 'bg-transparent border border-green-950 text-green-600 hover:border-green-800 hover:text-green-400'
                    }`}
                  >
                    <span className="font-display text-[9px] sm:text-xs font-bold tracking-wider">{stg.label}</span>
                    <span className="font-display text-[8px] opacity-70 hidden sm:inline">{stg.pct}%</span>
                  </button>
                );
              })}
            </div>

            {/* Center: Stage Showcase with Single Canvas */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-5 flex flex-col items-center justify-center">
                <div className="w-56 sm:w-64 aspect-square flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full bg-green-500/5 blur-xl pointer-events-none" />
                  <SaplingCanvas goal={stageGoal} size={240} animate={true} />
                </div>
                <div className="font-display text-[10px] text-green-400 tracking-wider text-center mt-2">
                  STAGE {activeStageIndex + 1} OF 5 // {STAGES[activeStageIndex].pct}% MATURATION
                </div>
              </div>

              <div className="md:col-span-7 space-y-4 text-left">
                <div className="inline-block px-2 py-0.5 border border-green-800/60 bg-green-950/30 text-green-400 font-display text-[9px] tracking-widest uppercase">
                  MORPHOLOGY
                </div>
                <h3 className="font-display text-xl sm:text-2xl text-white font-bold tracking-tight">
                  {STAGES[activeStageIndex].title}
                </h3>
                <p className="font-editorial text-sm sm:text-base text-zinc-300 leading-relaxed">
                  {STAGES[activeStageIndex].desc}
                </p>
                <div className="pt-2 flex items-center justify-between border-t border-green-950 font-display text-[10px] text-green-400/90">
                  <span>ESTIMATED NUTRIENT ACCRUAL:</span>
                  <span className="text-white font-bold">{STAGES[activeStageIndex].accrued} / 25 MINUTES</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: WHAT WILL YOU GROW? — The Living Botanical Herbarium */}
      <section id="herbarium" className="py-20 sm:py-28 px-4 sm:px-8 border-b border-green-950/60 bg-[#040a04] relative dither-grid">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Introduction */}
          <div className="space-y-3 max-w-2xl">
            <span className="font-display text-[10px] text-green-500 tracking-widest uppercase">
              02 // BOTANICAL HERBARIUM
            </span>
            <h2 className="font-display text-2xl sm:text-4xl text-white uppercase font-bold tracking-tight">
              WHAT WILL YOU GROW?
            </h2>
            <p className="font-editorial text-base sm:text-lg text-zinc-300/90 leading-relaxed">
              Focus is not merely the avoidance of noise. It is the active cultivation of intent. Select an intention to inspect its paired species and discipline parameters.
            </p>
          </div>

          {/* Herbarium Split Layout — ONE Single Canvas Engine */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Specimen Index Drawer */}
            <div className="lg:col-span-5 space-y-2">
              <div className="font-display text-[10px] text-green-600 uppercase tracking-widest px-1 pb-1">
                ARCHIVAL SPECIMENS [ SELECT ONE ]
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                {SPECIMENS.map((specimen) => {
                  const isSelected = selectedSpecimen.id === specimen.id;
                  return (
                    <button
                      key={specimen.id}
                      onClick={() => setSelectedSpecimen(specimen)}
                      className={`w-full text-left p-3 sm:p-4 border transition-all flex flex-col justify-between min-h-[48px] ${
                        isSelected
                          ? 'border-[#4ade80] bg-[#0c1a0c] text-white shadow-[0_0_15px_rgba(74,222,128,0.2)]'
                          : 'border-green-950/80 bg-[#061006]/80 text-zinc-400 hover:border-green-800 hover:text-zinc-200'
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
                      <span className="font-editorial text-xs text-zinc-400 line-clamp-1 mt-1">
                        {specimen.tagline.split('//')[1] || specimen.tagline}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Active Specimen Cultivation Plate (Uses SINGLE SaplingCanvas) */}
            <div className="lg:col-span-7 border border-green-900/60 bg-[#081408] p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-green-950 pb-4 gap-2">
                <div>
                  <span className="font-display text-[9px] text-[#4ade80] tracking-widest uppercase">
                    SPECIMEN // {selectedSpecimen.id.toUpperCase()}
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl text-white font-bold tracking-tight">
                    {selectedSpecimen.title} — {selectedSpecimen.treeType}
                  </h3>
                </div>
                <div className="font-display text-[10px] text-green-400 bg-black/50 px-3 py-1.5 border border-green-900/50 self-start sm:self-auto">
                  RITUAL: {selectedSpecimen.dailyMinutes}M / DAY
                </div>
              </div>

              {/* Single Central Canvas Preview */}
              <div className="w-full flex flex-col items-center justify-center py-4 relative">
                <div className="w-56 sm:w-64 aspect-square flex items-center justify-center">
                  <SaplingCanvas goal={specimenGoal} size={240} animate={true} />
                </div>
                <div className="font-display text-[9px] text-green-500 tracking-wider text-center mt-2">
                  {selectedSpecimen.tagline}
                </div>
              </div>

              {/* Philosophy & Direct Action */}
              <div className="space-y-4 pt-2 border-t border-green-950">
                <p className="font-editorial text-sm sm:text-base text-zinc-300 italic leading-relaxed">
                  "{selectedSpecimen.philosophy}"
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="font-display text-[10px] text-green-500">
                    RECOMMENDED HORIZON: {selectedSpecimen.suggestedDurationDays} DAYS
                  </div>
                  <button
                    onClick={() => onEnterApp({ 
                      openNewSeed: true, 
                      presetTree: selectedSpecimen.treeType, 
                      presetName: selectedSpecimen.title 
                    })}
                    className="px-5 py-2.5 bg-[#4ade80] hover:bg-[#22c55e] text-black font-display font-bold text-[10px] sm:text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(74,222,128,0.3)] min-h-[42px] flex items-center justify-center"
                  >
                    [ CULTIVATE THIS SEED ]
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: THE ECOSYSTEM — Quiet Editorial Field Guide */}
      <section id="ecosystem" className="py-20 sm:py-28 px-4 sm:px-8 border-b border-green-950/60 bg-[#050c05] relative">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Introduction */}
          <div className="space-y-3 max-w-2xl">
            <span className="font-display text-[10px] text-green-500 tracking-widest uppercase">
              03 // ECOSYSTEM ARCHITECTURE
            </span>
            <h2 className="font-display text-2xl sm:text-4xl text-white uppercase font-bold tracking-tight">
              A COMPLETE FOCUS ENVIRONMENT.
            </h2>
            <p className="font-editorial text-base sm:text-lg text-zinc-300/90 leading-relaxed">
              Sapling is an interconnected ecosystem of mindful focus instruments. Not disconnected widgets, but branches of one unified digital forest.
            </p>
          </div>

          {/* Architectural Layout with Distinct Weights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 1. THE GROVE — The Living Sanctuary (Dominant Feature) */}
            <div className="lg:col-span-12 border border-green-900/60 bg-[#081408] p-6 sm:p-8 space-y-4">
              <div className="flex justify-between items-center border-b border-green-950 pb-3">
                <span className="font-display text-sm sm:text-base text-white font-bold">[ GROVE ]</span>
                <span className="font-display text-[9px] text-[#4ade80] tracking-widest uppercase">CANOPY SANCTUARY</span>
              </div>
              <p className="font-editorial text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl">
                Your persistent botanical forest. Every intention roots here as a live pixel tree. Monitor growth percentages, stored focus minutes, and seasonal health in a serene, living ecosystem with ambient audio and nature details.
              </p>
            </div>

            {/* 2. CHRONOS — Structured Temporal Ritual */}
            <div className="lg:col-span-6 border border-green-900/40 bg-[#071007] p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-green-950 pb-3">
                <span className="font-display text-xs sm:text-sm text-white font-bold">[ CHRONOS ]</span>
                <span className="font-display text-[9px] text-amber-400 tracking-widest uppercase">25:00 RITUAL</span>
              </div>
              <p className="font-editorial text-sm text-zinc-300 leading-relaxed">
                Structured countdown sessions for disciplined work sprints. Accompanied by pixel birds, floating butterflies, ambient soundscapes, and restorative sanctuary intervals.
              </p>
              <div className="font-display text-[9px] text-green-500 pt-2 border-t border-green-950">
                • POMODORO CADENCE + SANCTUARY BREAKS
              </div>
            </div>

            {/* 3. GROOVE — Unbounded Open Flow */}
            <div className="lg:col-span-6 border border-green-900/40 bg-[#071007] p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-green-950 pb-3">
                <span className="font-display text-xs sm:text-sm text-white font-bold">[ GROOVE ]</span>
                <span className="font-display text-[9px] text-[#4ade80] tracking-widest uppercase">00:00 → ∞ FLOW</span>
              </div>
              <p className="font-editorial text-sm text-zinc-300 leading-relaxed">
                Free-form elapsed focus with zero artificial countdown anxiety. Watch your tree synthesize wood in real time, harvesting only when your flow naturally reaches completion.
              </p>
              <div className="font-display text-[9px] text-green-500 pt-2 border-t border-green-950">
                • OPEN ELAPSED TIME + REAL-TIME SYNTHESIS
              </div>
            </div>

            {/* 4. LOGS — Historical Ring Archive */}
            <div className="lg:col-span-6 border border-green-950 bg-[#060c06] p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-display text-xs text-zinc-200 font-bold">[ LOGS ]</span>
                <span className="font-display text-[8px] text-green-500 uppercase">ARCHIVE</span>
              </div>
              <p className="font-editorial text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Permanent records of every session with exact durations, timestamps, mode tags, and completed flora permanently housed in the sanctuary archive.
              </p>
            </div>

            {/* 5. POMO — Rapid Utility Launcher */}
            <div className="lg:col-span-6 border border-green-950 bg-[#060c06] p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-display text-xs text-zinc-200 font-bold">[ POMO ]</span>
                <span className="font-display text-[8px] text-green-500 uppercase">UTILITY</span>
              </div>
              <p className="font-editorial text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Instant focus alignment allowing on-the-fly toggling between circular countdown Chronos and free-form tree Groove modes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: ANI — The Spirit of the Garden */}
      <section id="ani" className="py-20 sm:py-28 px-4 sm:px-8 border-b border-green-950/60 bg-[#040a04] relative dither-grid">
        <div className="max-w-4xl mx-auto border border-green-900/60 bg-[#071307] p-8 sm:p-12 shadow-2xl space-y-8">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80] animate-pulse shadow-[0_0_10px_#4ade80]" />
            <span className="font-display text-[10px] text-[#4ade80] tracking-widest uppercase font-bold">
              GROVE INTELLIGENCE // COMPANION CONSOLE
            </span>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl text-white font-bold tracking-tight">
              ANI UNDERSTANDS THE GARDEN.
            </h2>
            <div className="space-y-1 font-display text-sm sm:text-base text-zinc-300 leading-relaxed">
              <div><span className="text-[#4ade80] font-bold">YOU</span> cultivate.</div>
              <div><span className="text-[#4ade80] font-bold">SAPLING</span> records growth.</div>
              <div><span className="text-[#4ade80] font-bold">ANI</span> understands the garden.</div>
            </div>
          </div>

          {/* Authentic Companion Dialogue Excerpt */}
          <div className="border-l-2 border-[#4ade80] pl-4 sm:pl-6 py-2 bg-black/30 text-zinc-300 font-editorial text-base sm:text-lg italic leading-relaxed">
            "Your grove breathes quietly today. The hours you poured into the Sequoia are beginning to weather. Rest well tonight; consistency will do the rest tomorrow."
          </div>

          <p className="font-editorial text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Ani is not an urgent chatbot demanding your attention. It is a calm, unhurried companion that observes your grove, offers thoughtful reflections, and respects your silence.
          </p>
        </div>
      </section>

      {/* SECTION 6: THE MANIFESTO — Visual Silence & Emotional Resonance */}
      <section id="philosophy" className="py-28 sm:py-40 px-4 sm:px-8 border-b border-green-950/60 bg-[#030703] text-center relative">
        <div className="max-w-2xl mx-auto space-y-8">
          <span className="font-display text-[10px] text-green-500 tracking-widest uppercase">
            04 // THE MANIFESTO
          </span>

          <h2 className="font-display text-2xl sm:text-4xl text-white font-bold tracking-tight leading-snug">
            FOCUS IS A FORM<br />OF CULTIVATION.
          </h2>

          <div className="space-y-3 font-editorial text-lg sm:text-2xl text-zinc-300 font-normal leading-relaxed">
            <p>Plant an intention.</p>
            <p>Give it dedicated time.</p>
            <p>Return tomorrow.</p>
            <p className="text-[#4ade80] font-display text-xs sm:text-sm pt-4 tracking-widest uppercase font-bold">
              Let consistency do the growing.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 7: FINAL CULMINATION — The Mature Canopy Threshold */}
      <section className="py-24 sm:py-36 px-4 sm:px-8 bg-gradient-to-t from-[#020502] to-[#040a04] text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-8 relative z-10">
          {/* Majestic mature tree canopy */}
          <div className="w-36 h-36 sm:w-44 sm:h-44 mx-auto flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full bg-green-500/10 blur-2xl pointer-events-none" />
            <SaplingCanvas goal={matureGoal} size={170} animate={true} />
          </div>

          <div className="space-y-3">
            <span className="font-display text-[10px] text-green-500 tracking-widest uppercase">
              THE FOREST AWAITS
            </span>
            <h2 className="font-display text-2xl xs:text-3xl sm:text-5xl text-white font-bold tracking-tight">
              YOUR NEXT HOUR<br />COULD GROW SOMETHING.
            </h2>
            <p className="font-editorial text-sm sm:text-base text-zinc-300 max-w-md mx-auto leading-relaxed">
              Step into the grove. Cultivate deep focus in a quiet, digital sanctuary.
            </p>
          </div>

          {/* Singular magnetic action threshold */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto pt-2">
            <button
              onClick={() => onEnterApp()}
              className="w-full sm:flex-1 py-4 px-6 bg-[#4ade80] hover:bg-[#22c55e] text-black font-display font-bold text-xs sm:text-sm tracking-widest uppercase shadow-[0_0_30px_rgba(74,222,128,0.4)] transition-all min-h-[48px] flex items-center justify-center"
            >
              [ ENTER SAPLING ]
            </button>
            <button
              onClick={() => onEnterApp({ openNewSeed: true })}
              className="w-full sm:flex-1 py-4 px-6 border border-green-800 hover:border-green-500 text-green-300 font-display text-xs sm:text-sm tracking-widest uppercase transition-all min-h-[48px] flex items-center justify-center"
            >
              [ PLANT A SEED ]
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER — Dignified Botanical Colophon */}
      <footer className="py-8 px-4 sm:px-8 border-t border-green-950/80 bg-[#020502] text-center font-display text-[8px] sm:text-[9px] text-green-600/80 uppercase tracking-widest space-y-2">
        <div>SAPLING // MINDFUL BOTANICAL FOCUS PROTOCOL</div>
        <div>LOCAL-FIRST • ZERO TRACKERS • WEB & PWA</div>
      </footer>
    </div>
  );
};

export default LandingPage;
