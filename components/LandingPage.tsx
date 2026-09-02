import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TreeType, TimelineType, SaplingGoal, IntentSpecimen } from '../types';
import SaplingCanvas from './SaplingCanvas';
import PixelButton from './PixelButton';
import { useAuth } from '../context/AuthContext';

interface Props {
  onEnterApp: (options?: { openNewSeed?: boolean; presetTree?: TreeType; presetName?: string }) => void;
  onOpenAuth: () => void;
}

const SPECIMENS: IntentSpecimen[] = [
  {
    id: 'code',
    title: 'CODE',
    tagline: 'Evergreen Logic & Deep Problem Solving',
    treeType: TreeType.PINE,
    suggestedDurationDays: 30,
    dailyMinutes: 60,
    iconName: 'terminal',
    philosophy: 'Like the pine in winter, code requires resilient, quiet endurance.'
  },
  {
    id: 'create',
    title: 'CREATE',
    tagline: 'Fleeting Artistry & Expressive Work',
    treeType: TreeType.CHERRY_BLOSSOM,
    suggestedDurationDays: 14,
    dailyMinutes: 45,
    iconName: 'brush',
    philosophy: 'Artistic intention blossoms through dedicated, unhurried craft.'
  },
  {
    id: 'study',
    title: 'STUDY',
    tagline: 'Ancient Wisdom & Foundational Theory',
    treeType: TreeType.CEDAR,
    suggestedDurationDays: 60,
    dailyMinutes: 90,
    iconName: 'menu_book',
    philosophy: 'Knowledge accumulates slowly, forming rings of deep understanding.'
  },
  {
    id: 'build',
    title: 'BUILD',
    tagline: 'Monumental Architecture & Long Horizons',
    treeType: TreeType.SEQUOIA,
    suggestedDurationDays: 90,
    dailyMinutes: 120,
    iconName: 'construction',
    philosophy: 'The titan sequoia grows tallest only by rooting deeply in discipline.'
  },
  {
    id: 'read',
    title: 'READ',
    tagline: 'Fluid Insight & Meditative Absorption',
    treeType: TreeType.WILLOW,
    suggestedDurationDays: 21,
    dailyMinutes: 30,
    iconName: 'auto_stories',
    philosophy: 'Yielding yet unbreakable, yielding pages nourish the active mind.'
  },
  {
    id: 'learn',
    title: 'LEARN',
    tagline: 'Disciplined Daily Practice & Mastery',
    treeType: TreeType.BONSAI,
    suggestedDurationDays: 30,
    dailyMinutes: 25,
    iconName: 'psychology',
    philosophy: 'Every small daily pruning shapes mastery over time.'
  }
];

const LandingPage: React.FC<Props> = ({ onEnterApp, onOpenAuth }) => {
  const { user, isAuthenticated } = useAuth();
  const [selectedSpecimen, setSelectedSpecimen] = useState<IntentSpecimen>(SPECIMENS[0]);
  const [growthStageIndex, setGrowthStageIndex] = useState(2); // Sapling stage by default
  const particlesRef = useRef<HTMLDivElement>(null);

  // Spore particles generator
  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    container.innerHTML = '';

    const count = window.innerWidth < 640 ? 18 : 36;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      const isAmber = Math.random() > 0.6;
      particle.className = `absolute rounded-full pointer-events-none transition-all ${
        isAmber ? 'bg-amber-400' : 'bg-green-400'
      }`;
      const size = Math.random() * 3 + 1.5;
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const duration = Math.random() * 6 + 5;
      const delay = Math.random() * 5;

      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${left}%`;
      particle.style.top = `${top}%`;
      particle.style.boxShadow = `0 0 8px ${isAmber ? '#f59e0b' : '#22c55e'}`;
      particle.style.opacity = '0.35';
      particle.style.animation = `animateIn ${duration}s ease-in-out ${delay}s infinite alternate`;

      container.appendChild(particle);
    }
  }, []);

  // Hero interactive dummy goal
  const heroGoal: SaplingGoal = useMemo(() => ({
    id: 'hero-seed-goal',
    name: 'Attention Seed',
    type: TreeType.PINE,
    timeline: TimelineType.DAY,
    startDate: Date.now(),
    durationInDays: 1,
    dailyTargetMinutes: 25,
    totalTargetMinutes: 25,
    accruedMinutes: 12,
    isComplete: false,
    health: 100,
    perfectionScore: 1.0
  }), []);

  // Stage preview goal
  const stageGoal: SaplingGoal = useMemo(() => {
    const stageAccrued = [2, 7, 13, 22, 25][growthStageIndex];
    return {
      id: 'stage-preview-goal',
      name: 'Growth Evolution',
      type: TreeType.OAK,
      timeline: TimelineType.DAY,
      startDate: Date.now(),
      durationInDays: 1,
      dailyTargetMinutes: 25,
      totalTargetMinutes: 25,
      accruedMinutes: stageAccrued,
      isComplete: growthStageIndex === 4,
      health: 100,
      perfectionScore: 1.0
    };
  }, [growthStageIndex]);

  // Selected specimen dummy goal
  const specimenGoal: SaplingGoal = useMemo(() => ({
    id: 'specimen-preview-' + selectedSpecimen.id,
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

  return (
    <div className="min-h-screen bg-[#040a04] text-[#dde5da] relative overflow-x-hidden selection:bg-green-500 selection:text-black">
      {/* Bio-Spores & Particles Container */}
      <div ref={particlesRef} className="fixed inset-0 pointer-events-none z-10 overflow-hidden" />

      {/* TOP MINIMAL NAVIGATION */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#040a04]/90 backdrop-blur-md border-b border-green-900/40 px-4 sm:px-8 py-3.5 flex justify-between items-center transition-all pt-safe">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#061206] border border-green-500/60 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-400">
              <path d="M12 21V9M12 9C12 9 8 5 4 5C4 5 4 8 8 11M12 9C12 9 16 5 20 5C20 5 20 8 16 11" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="12" cy="7" r="1.5" fill="#4ade80" />
            </svg>
          </div>
          <span className="pixel-font text-base sm:text-lg text-white uppercase tracking-wider font-bold">
            SAPLING
          </span>
        </div>

        {/* Center Links for Desktop */}
        <nav aria-label="Landing Page Navigation" className="hidden lg:flex items-center gap-6 text-[10px] pixel-font text-green-400/80">
          <a href="#hero" className="hover:text-green-300 transition-colors uppercase tracking-widest">PLANT</a>
          <a href="#growth" className="hover:text-green-300 transition-colors uppercase tracking-widest">GROWTH</a>
          <a href="#specimens" className="hover:text-green-300 transition-colors uppercase tracking-widest">SPECIMENS</a>
          <a href="#ecosystem" className="hover:text-green-300 transition-colors uppercase tracking-widest">ECOSYSTEM</a>
          <a href="#philosophy" className="hover:text-green-300 transition-colors uppercase tracking-widest">MANIFESTO</a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenAuth}
            className="px-3 py-2 border border-green-900/60 bg-[#061406] hover:border-green-600 hover:text-green-200 text-green-400 pixel-font text-[8px] sm:text-[9px] uppercase tracking-wider transition-all min-h-[38px] shadow-sm"
          >
            {isAuthenticated ? `[ ${user?.displayName?.split(' ')[0] || 'USER'} ]` : '[ TERMINAL LOGIN ]'}
          </button>
          <button
            onClick={() => onEnterApp()}
            className="px-3.5 sm:px-4 py-2 bg-green-500 hover:bg-green-400 border border-green-600 text-black pixel-font text-[8px] sm:text-[9px] uppercase tracking-wider font-bold transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[38px]"
          >
            [ ENTER GROVE ]
          </button>
        </div>
      </header>

      {/* SECTION 1: HERO VIEWPORT */}
      <section 
        id="hero" 
        className="min-h-[100svh] w-full flex flex-col items-center justify-center px-4 sm:px-8 relative border-b border-green-900/30 pt-24 pb-16 hud-grid"
      >
        <div className="max-w-4xl w-full mx-auto flex flex-col items-center text-center space-y-6 z-20">
          {/* Terminal Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-2 text-[7.5px] sm:text-[8.5px] pixel-font text-green-400 font-bold bg-[#061406]/90 border border-green-900/60 px-3 py-1.5 pixel-corners shadow-sm">
            <span className="flex items-center gap-1.5 text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              SYSTEM ONLINE
            </span>
            <span className="text-green-700">•</span>
            <span className="text-amber-400">ATTENTION ENGINE READY</span>
          </div>

          {/* Substantial Living Central Visual */}
          <div className="relative w-64 xs:w-72 sm:w-80 md:w-96 aspect-square flex items-center justify-center bg-[#061406]/80 border-2 border-green-950/80 shadow-[0_0_60px_rgba(34,197,94,0.15)] my-2 overflow-hidden p-4">
            <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-green-500/50" />
            <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-green-500/50" />

            <div className="relative w-full h-full flex items-center justify-center">
              <SaplingCanvas goal={heroGoal} size={280} animate={true} />
            </div>

            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[7px] pixel-font text-green-500/80 bg-[#040a04]/90 px-2 py-1 border border-green-900/40">
              <span>PINE SEEDLING // GEN 0</span>
              <span className="text-green-400 font-bold">LIVE SYNC</span>
            </div>
          </div>

          {/* Headlines & Copy */}
          <div className="space-y-3 max-w-2xl mx-auto">
            <h1 className="pixel-font text-2xl xs:text-3xl sm:text-4xl md:text-5xl text-white tracking-tight uppercase leading-tight drop-shadow-[0_0_20px_rgba(34,197,94,0.25)]">
              YOUR ATTENTION<br />IS A SEED.
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-green-300/90 font-serif italic max-w-lg mx-auto leading-relaxed">
              Plant an intention. Focus on what matters. Watch your discipline grow into a living digital forest.
            </p>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md pt-2">
            <PixelButton
              onClick={() => onEnterApp({ openNewSeed: true })}
              variant="success"
              className="flex-1 py-4 text-[10px] sm:text-[11px] tracking-widest shadow-[0_0_25px_rgba(34,197,94,0.35)] h-13"
            >
              [ PLANT YOUR SEED ]
            </PixelButton>
            <PixelButton
              onClick={() => onEnterApp()}
              variant="primary"
              className="flex-1 py-4 text-[10px] sm:text-[11px] tracking-widest h-13"
            >
              [ EXPLORE THE GROVE ]
            </PixelButton>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-green-500/60 pixel-font text-[7px] uppercase tracking-widest pointer-events-none">
          <span>SCROLL TO NURTURE</span>
          <span className="text-xs animate-bounce">↓</span>
        </div>
      </section>

      {/* SECTION 2: THE GROWTH METAPHOR / SCROLL STORY */}
      <section id="growth" className="py-20 sm:py-28 px-4 sm:px-8 border-b border-green-900/30 bg-[#050c05] relative">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="pixel-font text-[8px] sm:text-[9px] text-green-400 uppercase tracking-widest font-bold">
              &gt; THE_GROWTH_CYCLE
            </span>
            <h2 className="pixel-font text-xl xs:text-2xl sm:text-3xl text-white uppercase tracking-tight">
              FOCUS GIVES IT ENERGY.
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-green-300/80 font-serif italic">
              Deep work sessions act as nutrients. Every focused minute materializes as digital biological evolution.
            </p>
          </div>

          {/* Interactive Growth Evolution Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#081408] border-2 border-green-950/80 p-6 sm:p-8 pixel-corners shadow-2xl">
            {/* Left: Canvas Viewport */}
            <div className="md:col-span-6 flex flex-col items-center justify-center">
              <div className="w-56 xs:w-64 sm:w-72 aspect-square bg-[#040a04] border border-green-900/50 flex items-center justify-center p-3 relative shadow-inner">
                <SaplingCanvas goal={stageGoal} size={240} animate={true} />
              </div>
              <div className="mt-3 pixel-font text-[8px] sm:text-[9px] text-green-400 font-bold uppercase tracking-wider">
                STAGE: {['SEEDLING (0%)', 'SPROUT (25%)', 'SAPLING (50%)', 'MATURING (85%)', 'MATURE GROVE (100%)'][growthStageIndex]}
              </div>
            </div>

            {/* Right: Stage Selector & Philosophy */}
            <div className="md:col-span-6 space-y-6">
              <div className="space-y-2">
                <h3 className="pixel-font text-base sm:text-lg text-zinc-100 uppercase tracking-tight">
                  From Silent Seed to Mighty Oak
                </h3>
                <p className="text-xs sm:text-sm text-green-200/90 font-mono leading-relaxed">
                  Unlike disposable to-do lists that vanish when checked, Sapling preserves your discipline as living pixel flora. Missed focus wilts the canopy; steady rituals restore health.
                </p>
              </div>

              {/* Stage Buttons */}
              <div className="grid grid-cols-5 gap-1.5 pt-2">
                {['SEED', 'SPROUT', 'SAPLING', 'TREE', 'GROVE'].map((stg, idx) => (
                  <button
                    key={stg}
                    onClick={() => setGrowthStageIndex(idx)}
                    className={`py-2 px-1 text-center pixel-font text-[7px] sm:text-[8px] uppercase tracking-wider border transition-all ${
                      growthStageIndex === idx
                        ? 'border-green-400 bg-green-500/20 text-white font-bold shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                        : 'border-green-950 bg-[#050c05] text-green-500 hover:border-green-800'
                    }`}
                  >
                    {stg}
                  </button>
                ))}
              </div>

              <div className="p-3 bg-[#040a04] border border-green-950 flex justify-between items-center text-[8px] pixel-font text-green-400">
                <span>ESTIMATED SYNTHESIS:</span>
                <span className="font-bold text-white">{[0, 6, 12, 21, 25][growthStageIndex]} MIN ACCRUED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: WHAT WILL YOU GROW? (SPECIMENS GREENHOUSE) */}
      <section id="specimens" className="py-20 sm:py-28 px-4 sm:px-8 border-b border-green-900/30 bg-[#040a04] hud-grid">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="pixel-font text-[8px] sm:text-[9px] text-green-400 uppercase tracking-widest font-bold">
              &gt; BOTANICAL_SPECIMENS
            </span>
            <h2 className="pixel-font text-xl xs:text-2xl sm:text-3xl text-white uppercase tracking-tight">
              WHAT WILL YOU GROW?
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-green-300/80 font-serif italic">
              Focus is not just the absence of distraction. It is the cultivation of intent.
            </p>
          </div>

          {/* Specimens Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {SPECIMENS.map((specimen) => {
              const isSelected = selectedSpecimen.id === specimen.id;
              return (
                <div
                  key={specimen.id}
                  onClick={() => setSelectedSpecimen(specimen)}
                  className={`cursor-pointer p-5 sm:p-6 border-2 transition-all duration-300 flex flex-col justify-between space-y-4 pixel-corners relative ${
                    isSelected
                      ? 'bg-[#0c180c] border-green-400 shadow-[0_0_25px_rgba(34,197,94,0.2)]'
                      : 'bg-[#061006] border-green-950/80 hover:border-green-800/80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-green-950/60 pb-2.5">
                      <h3 className="pixel-font text-sm sm:text-base text-white uppercase font-bold tracking-wider">
                        {specimen.title}
                      </h3>
                      <span className="pixel-font text-[7.5px] text-green-400 font-bold uppercase bg-[#040a04] px-2 py-0.5 border border-green-900/40">
                        {specimen.treeType}
                      </span>
                    </div>

                    <p className="text-xs text-green-300 font-mono leading-relaxed">
                      {specimen.tagline}
                    </p>

                    <p className="text-xs text-green-400/80 font-serif italic">
                      "{specimen.philosophy}"
                    </p>
                  </div>

                  <div className="pt-2 border-t border-green-950/60 flex items-center justify-between">
                    <div className="text-[7.5px] pixel-font text-green-500">
                      RITUAL: {specimen.dailyMinutes}M / DAY
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEnterApp({ openNewSeed: true, presetTree: specimen.treeType, presetName: specimen.title });
                      }}
                      className="px-2.5 py-1.5 bg-green-950 hover:bg-green-600 border border-green-700 text-green-300 hover:text-black pixel-font text-[7.5px] uppercase font-bold transition-colors"
                    >
                      PLANT SEED →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4: THE REAL SAPLING ECOSYSTEM */}
      <section id="ecosystem" className="py-20 sm:py-28 px-4 sm:px-8 border-b border-green-900/30 bg-[#050c05] relative">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="pixel-font text-[8px] sm:text-[9px] text-green-400 uppercase tracking-widest font-bold">
              &gt; ECOSYSTEM_ARCHITECTURE
            </span>
            <h2 className="pixel-font text-xl xs:text-2xl sm:text-3xl text-white uppercase tracking-tight">
              A COMPLETE FOCUS ENVIRONMENT.
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-green-300/80 font-serif italic">
              Experience the genuine tools of botanical productivity. No fake screenshots or bloated dashboards.
            </p>
          </div>

          {/* Ecosystem Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Terminal 1: THE GROVE */}
            <div className="bg-[#081208] border-2 border-green-950/80 p-5 sm:p-6 pixel-corners flex flex-col justify-between space-y-4 shadow-lg hover:border-green-600/50 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-green-900/40 pb-2">
                  <span className="pixel-font text-xs text-white font-bold">[ GROVE ]</span>
                  <span className="text-[7px] pixel-font text-green-400">LIVING CANOPY</span>
                </div>
                <p className="text-xs text-green-200/90 font-mono leading-relaxed">
                  Your long-term goals planted as trees. Monitor growth percentages, stored focus time, and evolution stages in a unified digital forest.
                </p>
              </div>
              <div className="p-3 bg-[#040a04] border border-green-950 text-[8px] pixel-font text-green-500">
                • SEEDLING → SPROUT → SAPLING → MATURE
              </div>
            </div>

            {/* Terminal 2: CHRONOS */}
            <div className="bg-[#081208] border-2 border-green-950/80 p-5 sm:p-6 pixel-corners flex flex-col justify-between space-y-4 shadow-lg hover:border-green-600/50 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-green-900/40 pb-2">
                  <span className="pixel-font text-xs text-white font-bold">[ CHRONOS ]</span>
                  <span className="text-[7px] pixel-font text-green-400">TEMPORAL RITUAL</span>
                </div>
                <p className="text-xs text-green-200/90 font-mono leading-relaxed">
                  Structured 25-minute Pomodoro countdown sessions with pixel birds, butterflies, ambient soundscapes, and restful sanctuary intervals.
                </p>
              </div>
              <div className="p-3 bg-[#040a04] border border-green-950 text-[8px] pixel-font text-green-500">
                • 25:00 COUNTDOWN + SANCTUARY BREAKS
              </div>
            </div>

            {/* Terminal 3: GROOVE */}
            <div className="bg-[#081208] border-2 border-green-950/80 p-5 sm:p-6 pixel-corners flex flex-col justify-between space-y-4 shadow-lg hover:border-green-600/50 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-green-900/40 pb-2">
                  <span className="pixel-font text-xs text-white font-bold">[ GROOVE ]</span>
                  <span className="text-[7px] pixel-font text-amber-400">FREE-FORM FOCUS</span>
                </div>
                <p className="text-xs text-green-200/90 font-mono leading-relaxed">
                  Free-form elapsed focus with zero artificial countdowns. Watch the tree synthesize in real time and harvest when you reach natural completion.
                </p>
              </div>
              <div className="p-3 bg-[#040a04] border border-green-950 text-[8px] pixel-font text-amber-400">
                • 00:00 → ∞ ELAPSED TIME + LIVE HARVEST
              </div>
            </div>

            {/* Terminal 4: HISTORICAL LOGS */}
            <div className="bg-[#081208] border-2 border-green-950/80 p-5 sm:p-6 pixel-corners flex flex-col justify-between space-y-4 shadow-lg hover:border-green-600/50 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-green-900/40 pb-2">
                  <span className="pixel-font text-xs text-white font-bold">[ LOGS ]</span>
                  <span className="text-[7px] pixel-font text-green-400">DISCIPLINE ARCHIVE</span>
                </div>
                <p className="text-xs text-green-200/90 font-mono leading-relaxed">
                  Every ritual is permanently recorded with exact durations, timestamps, mode tags, and mature flora in the sanctuary archive.
                </p>
              </div>
              <div className="p-3 bg-[#040a04] border border-green-950 text-[8px] pixel-font text-green-500">
                • SESSION LOGS + PERMANENT SANCTUARY
              </div>
            </div>

            {/* Terminal 5: POMO UTILITY */}
            <div className="bg-[#081208] border-2 border-green-950/80 p-5 sm:p-6 pixel-corners flex flex-col justify-between space-y-4 shadow-lg hover:border-green-600/50 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-green-900/40 pb-2">
                  <span className="pixel-font text-xs text-white font-bold">[ POMO ]</span>
                  <span className="text-[7px] pixel-font text-green-400">RAPID FOCUS</span>
                </div>
                <p className="text-xs text-green-200/90 font-mono leading-relaxed">
                  Instant temporal alignment utility allowing on-the-fly toggling between circular countdown Chronos and free-form tree Groove modes.
                </p>
              </div>
              <div className="p-3 bg-[#040a04] border border-green-950 text-[8px] pixel-font text-green-500">
                • QUICK CYCLE INITIATION
              </div>
            </div>

            {/* Terminal 6: ANI AI COMPANION */}
            <div className="bg-[#081208] border-2 border-green-950/80 p-5 sm:p-6 pixel-corners flex flex-col justify-between space-y-4 shadow-lg hover:border-green-600/50 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-green-900/40 pb-2">
                  <span className="pixel-font text-xs text-white font-bold">[ ANI ]</span>
                  <span className="text-[7px] pixel-font text-green-400">GROVE INTELLIGENCE</span>
                </div>
                <p className="text-xs text-green-200/90 font-mono leading-relaxed">
                  A calm, unhurried botanical companion that watches over your grove, provides thoughtful reflection, and listens without haste.
                </p>
              </div>
              <div className="p-3 bg-[#040a04] border border-green-950 text-[8px] pixel-font text-green-500">
                • REFLECTIVE CHAT & VOICE LINK
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: PHILOSOPHY */}
      <section id="philosophy" className="py-24 sm:py-32 px-4 sm:px-8 border-b border-green-900/30 bg-[#040a04] text-center relative hud-grid">
        <div className="max-w-2xl mx-auto space-y-6">
          <span className="pixel-font text-[8px] sm:text-[9px] text-green-500 uppercase tracking-widest font-bold">
            &gt; THE_MANIFESTO
          </span>
          <h2 className="pixel-font text-xl xs:text-2xl sm:text-3xl text-white uppercase tracking-wider leading-relaxed">
            FOCUS IS A FORM<br />OF CULTIVATION.
          </h2>
          <div className="space-y-4 text-sm sm:text-base md:text-lg text-green-300 font-serif italic leading-loose">
            <p>Plant an intention.</p>
            <p>Give it dedicated time.</p>
            <p>Return tomorrow.</p>
            <p className="text-white font-bold not-italic pixel-font text-xs sm:text-sm mt-4 uppercase tracking-widest">
              Let consistency do the growing.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 6: FINAL CALL TO ACTION */}
      <section className="py-24 sm:py-32 px-4 sm:px-8 bg-gradient-to-t from-[#020502] to-[#040a04] text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-8 relative z-20">
          <div className="w-28 h-28 mx-auto bg-[#061406] border border-green-800/60 p-2 pixel-corners shadow-2xl flex items-center justify-center">
            <SaplingCanvas goal={stageGoal} size={100} animate={false} />
          </div>

          <div className="space-y-3">
            <span className="pixel-font text-[8px] text-green-400 uppercase tracking-widest font-bold">
              &gt; THE_FOREST_AWAITS
            </span>
            <h2 className="pixel-font text-2xl xs:text-3xl sm:text-4xl text-white uppercase tracking-tight">
              YOUR NEXT HOUR<br />COULD GROW SOMETHING.
            </h2>
            <p className="text-xs sm:text-sm text-green-300/80 font-serif italic max-w-md mx-auto">
              Step into the grove. Cultivate deep focus in a quiet, digital sanctuary.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-md mx-auto">
            <PixelButton
              onClick={() => onEnterApp()}
              variant="success"
              className="flex-1 py-4 text-[11px] tracking-widest shadow-[0_0_30px_rgba(34,197,94,0.4)] h-13"
            >
              [ ENTER SAPLING ]
            </PixelButton>
            <PixelButton
              onClick={() => onEnterApp({ openNewSeed: true })}
              variant="primary"
              className="flex-1 py-4 text-[10px] tracking-widest h-13"
            >
              [ PLANT YOUR SEED ]
            </PixelButton>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 sm:px-8 border-t border-green-950/60 bg-[#020502] text-center text-green-600/70 pixel-font text-[7px] sm:text-[8px] uppercase tracking-widest space-y-2">
        <div>SAPLING // MINDFUL BOTANICAL FOCUS PROTOCOL</div>
        <div>ONE CODEBASE • WEB • PWA • OFFLINE-READY</div>
      </footer>
    </div>
  );
};

export default LandingPage;
