import React, { useState, useMemo } from 'react';
import { UserProfile, FocusMode, AppTab, TreeType, TreeVitality } from '../types';
import { 
  TimeRange, 
  calculateOverviewMetrics, 
  calculateFocusRhythm, 
  calculateAttentionField, 
  calculateSessionPatterns, 
  calculateIntentionSummaries, 
  generateDeterministicObservations,
  formatMinutes
} from '../utils/dashboardAnalytics';
import PixelButton from './PixelButton';

interface DashboardProps {
  profile: UserProfile;
  onStartFocus: (goalId?: string, mode?: FocusMode) => void;
  onNavigateTab: (tab: AppTab) => void;
}

// Botanical species glyph symbols for cyber-organic visual identification
const SPECIES_ICONS: Record<string, string> = {
  [TreeType.OAK]: '🌳',
  [TreeType.CHERRY_BLOSSOM]: '🌸',
  [TreeType.PINE]: '🌲',
  [TreeType.BAMBOO]: '🎋',
  [TreeType.CACTUS]: '🌵',
  [TreeType.MAPLE]: '🍁',
  [TreeType.BAOBAB]: '🪵',
  [TreeType.CEDAR]: '🌿',
  [TreeType.WILLOW]: '🌾',
  [TreeType.SEQUOIA]: '🏛️',
  [TreeType.BONSAI]: '🪴'
};

const Dashboard: React.FC<DashboardProps> = ({ profile, onStartFocus, onNavigateTab }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [hoveredRhythmDay, setHoveredRhythmDay] = useState<string | null>(null);

  const now = useMemo(() => Date.now(), []);

  // Compute deterministic analytics
  const metrics = useMemo(() => calculateOverviewMetrics(profile, timeRange, now), [profile, timeRange, now]);
  const rhythm = useMemo(() => calculateFocusRhythm(profile.logs || [], timeRange, now), [profile.logs, timeRange, now]);
  const attentionField = useMemo(() => calculateAttentionField(profile.logs || [], timeRange, now), [profile.logs, timeRange, now]);
  const patterns = useMemo(() => calculateSessionPatterns(profile.logs || [], timeRange, now), [profile.logs, timeRange, now]);
  const intentionSummaries = useMemo(() => calculateIntentionSummaries(profile, now), [profile, now]);
  const observations = useMemo(() => generateDeterministicObservations(profile, timeRange, now), [profile, timeRange, now]);

  const hasLogs = (profile.logs || []).length > 0;
  const activeRhythmDay = rhythm.days.find(d => d.dateKey === hoveredRhythmDay) || rhythm.days[rhythm.days.length - 1];

  return (
    <div className="p-3 xs:p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300 hud-grid">
      
      {/* 1. OBSERVATORY HEADER STRIP */}
      <header className="border-b border-green-900/40 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <h1 className="pixel-font text-xs xs:text-sm sm:text-base text-white tracking-wider font-bold uppercase">
              DASHBOARD // FOCUS OBSERVATORY
            </h1>
            <span className="hidden sm:inline-block pixel-font text-[7px] text-green-500/80 border border-green-900/60 px-1 py-0.5 bg-[#030d03]">
              // OBS-01
            </span>
          </div>
          <p className="text-green-300/80 text-xs sm:text-sm font-editorial italic">
            "Observe where your attention has been growing."
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-[#030d03] border border-green-950 p-1">
          {(['7d', '30d', '90d', 'all'] as TimeRange[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-2 py-1.5 pixel-font text-[6.5px] xs:text-[7px] sm:text-[7.5px] uppercase tracking-wider transition-all min-h-[32px] cursor-pointer ${
                timeRange === r
                  ? 'border border-green-400 bg-green-500/20 text-white font-bold shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                  : 'text-zinc-400 hover:text-green-300 border border-transparent hover:border-green-900'
              }`}
              aria-pressed={timeRange === r}
              aria-label={`Show analytics for ${r === '7d' ? 'last 7 days' : r === '30d' ? 'last 30 days' : r === '90d' ? 'last 90 days' : 'all time'}`}
            >
              {r === '7d' ? '7 DAYS' : r === '30d' ? '30 DAYS' : r === '90d' ? '90 DAYS' : 'ALL'}
            </button>
          ))}
        </div>
      </header>

      {/* 2. PRIMARY OVERVIEW METRICS STRIP (Compact Cards) */}
      <section aria-label="Primary Overview Metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <div className="bg-[#051105] border border-green-900/40 p-2.5 sm:p-3 relative overflow-hidden group hover:border-green-700/60 transition-colors">
          <div className="text-green-500/80 pixel-font text-[6.5px] sm:text-[7px] uppercase tracking-wider font-bold">
            TOTAL FOCUS ({timeRange.toUpperCase()})
          </div>
          <div className="pixel-font text-sm xs:text-base sm:text-lg md:text-xl text-green-300 font-bold tracking-tight mt-1 tabular-nums">
            {formatMinutes(metrics.totalFocusMinutes)}
          </div>
          <div className="text-[9px] text-zinc-400 font-mono mt-0.5">
            {metrics.activeDaysCount} active days
          </div>
        </div>

        <div className="bg-[#051105] border border-green-900/40 p-2.5 sm:p-3 relative overflow-hidden group hover:border-green-700/60 transition-colors">
          <div className="text-green-500/80 pixel-font text-[6.5px] sm:text-[7px] uppercase tracking-wider font-bold">
            SESSIONS
          </div>
          <div className="pixel-font text-sm xs:text-base sm:text-lg md:text-xl text-green-300 font-bold tracking-tight mt-1 tabular-nums">
            {metrics.totalSessions}
          </div>
          <div className="text-[9px] text-zinc-400 font-mono mt-0.5">
            {metrics.avgSessionMinutes > 0 ? `~${metrics.avgSessionMinutes}m avg duration` : 'No logs'}
          </div>
        </div>

        <div className="bg-[#051105] border border-green-900/40 p-2.5 sm:p-3 relative overflow-hidden group hover:border-green-700/60 transition-colors">
          <div className="text-green-500/80 pixel-font text-[6.5px] sm:text-[7px] uppercase tracking-wider font-bold">
            ACTIVE INTENTIONS
          </div>
          <div className="pixel-font text-sm xs:text-base sm:text-lg md:text-xl text-emerald-300 font-bold tracking-tight mt-1 tabular-nums">
            {metrics.activeIntentionsCount}
          </div>
          <div className="text-[9px] text-emerald-500/80 font-mono mt-0.5">
            {metrics.growingTreesCount} cultivating
          </div>
        </div>

        <div className="bg-[#051105] border border-green-900/40 p-2.5 sm:p-3 relative overflow-hidden group hover:border-green-700/60 transition-colors">
          <div className="text-green-500/80 pixel-font text-[6.5px] sm:text-[7px] uppercase tracking-wider font-bold">
            GROWING TREES
          </div>
          <div className="pixel-font text-sm xs:text-base sm:text-lg md:text-xl text-emerald-300 font-bold tracking-tight mt-1 tabular-nums">
            {metrics.growingTreesCount}
          </div>
          <div className="text-[9px] text-zinc-400 font-mono mt-0.5">
            In active soil
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#051105] border border-green-900/40 p-2.5 sm:p-3 relative overflow-hidden group hover:border-green-700/60 transition-colors">
          <div className="text-green-500/80 pixel-font text-[6.5px] sm:text-[7px] uppercase tracking-wider font-bold">
            ETERNAL CANOPY
          </div>
          <div className="pixel-font text-sm xs:text-base sm:text-lg md:text-xl text-amber-300 font-bold tracking-tight mt-1 tabular-nums">
            {metrics.eternalCanopyCount}
          </div>
          <div className="text-[9px] text-amber-500/80 font-mono mt-0.5">
            Matured to 100%
          </div>
        </div>
      </section>

      {/* 3. CONTINUOUS OBSERVATORY SURFACE: FOCUS RHYTHM & ATTENTION FIELD */}
      <section className="space-y-4 pt-2 border-t border-green-950/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* FOCUS RHYTHM (Integrated Botanical Stem Graph) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-400" />
                <h2 className="pixel-font text-[8.5px] sm:text-[9.5px] text-green-300 uppercase tracking-widest font-bold">
                  FOCUS RHYTHM // {timeRange.toUpperCase()}
                </h2>
              </div>
              <span className="pixel-font text-[7px] sm:text-[8px] text-green-400/90 font-mono tabular-nums">
                {rhythm.activeDaysCount} OF {rhythm.totalDays} DAYS ({rhythm.consistencyPct}%)
              </span>
            </div>

            {/* Active Hover / Focus Readout Strip */}
            <div className="p-2 border border-green-950 bg-[#030c03] flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 text-[10px] sm:text-xs">
                {activeRhythmDay ? `${activeRhythmDay.label} (${activeRhythmDay.dayOfWeek})` : 'Hover a day'}
              </span>
              <span className="text-green-300 font-bold text-[10px] sm:text-xs tabular-nums">
                {activeRhythmDay && activeRhythmDay.minutes > 0
                  ? `${formatMinutes(activeRhythmDay.minutes)} • ${activeRhythmDay.sessionCount} session${activeRhythmDay.sessionCount === 1 ? '' : 's'}`
                  : 'Quiet day (0m)'}
              </span>
            </div>

            {/* SVG Botanical Stems Chart with custom scroll protection */}
            <div className="overflow-x-auto pb-2 custom-scrollbar">
              <div 
                className="h-36 sm:h-40 min-w-[280px] sm:min-w-[340px] flex items-end justify-between gap-1 pt-4 px-1 border-b border-green-900/60"
                role="region"
                aria-label="Daily focus minutes stem chart"
              >
                {rhythm.days.map((d) => {
                  const isHovered = hoveredRhythmDay === d.dateKey;
                  const barHeight = d.heightPct;
                  return (
                    <button
                      key={d.dateKey}
                      type="button"
                      onMouseEnter={() => setHoveredRhythmDay(d.dateKey)}
                      onFocus={() => setHoveredRhythmDay(d.dateKey)}
                      className="flex-1 flex flex-col items-center justify-end h-full group focus:outline-none cursor-pointer py-1"
                      aria-label={`${d.label}: ${d.minutes} minutes in ${d.sessionCount} sessions`}
                    >
                      {/* Vertical Pixel Stem */}
                      <div className="w-full flex justify-center items-end h-[100px]">
                        {d.minutes > 0 ? (
                          <div 
                            style={{ height: `${barHeight}%` }}
                            className={`w-full max-w-[8px] sm:max-w-[10px] transition-all duration-200 relative ${
                              isHovered 
                                ? 'bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]' 
                                : d.isToday
                                  ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                                  : 'bg-green-600/80 hover:bg-green-400'
                            }`}
                          >
                            {/* Stem terminal bud / node */}
                            <div className={`w-full h-1 sm:h-1.5 ${isHovered ? 'bg-white' : 'bg-emerald-300'}`} />
                          </div>
                        ) : (
                          <div className="w-1 h-1 bg-green-950/60 rounded-full mb-0.5" />
                        )}
                      </div>
                      
                      {/* Day Label */}
                      <span className={`text-[6px] xs:text-[7px] font-mono mt-1 transition-colors truncate ${
                        d.isToday 
                          ? 'text-green-300 font-bold' 
                          : isHovered 
                            ? 'text-white font-bold' 
                            : 'text-zinc-500'
                      }`}>
                        {d.dayOfWeek[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="text-[9px] text-zinc-500 font-mono flex items-center justify-between">
              <span>← Earlier days</span>
              <span>Today (right) →</span>
            </div>
          </div>

          {/* ATTENTION FIELD (Calendar Heatmap Matrix) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400" />
                <h2 className="pixel-font text-[8.5px] sm:text-[9.5px] text-green-300 uppercase tracking-widest font-bold">
                  ATTENTION FIELD
                </h2>
              </div>
              <span className="text-[7.5px] font-mono text-zinc-400">
                {attentionField.totalRecordedMinutes > 0 ? formatMinutes(attentionField.totalRecordedMinutes) : 'Quiet'}
              </span>
            </div>

            <p className="text-[10px] sm:text-[11px] font-editorial text-zinc-300/80 leading-relaxed">
              Botanical density mapping attention given to your practice across recent weeks.
            </p>

            {/* Matrix Container */}
            <div className="p-3 border border-green-950 bg-[#030a03] overflow-x-auto custom-scrollbar">
              <div 
                className="grid gap-1 min-w-[200px]"
                style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                role="grid"
                aria-label="Attention Field Calendar Matrix"
              >
                {/* Weekday headers */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div key={idx} className="text-center text-[7px] font-mono text-zinc-500 pb-1">
                    {day}
                  </div>
                ))}

                {/* Heatmap cells */}
                {attentionField.weeks.flatMap((week, wIdx) => 
                  week.map((cell) => {
                    let bgClass = 'bg-[#071307] border border-green-950/40 text-transparent'; // Level 0: Soil
                    if (cell.level === 1) bgClass = 'bg-green-900/60 border border-green-800/80';
                    if (cell.level === 2) bgClass = 'bg-green-700/80 border border-green-500/80';
                    if (cell.level === 3) bgClass = 'bg-green-500 border border-green-400 shadow-[0_0_5px_rgba(34,197,94,0.4)]';
                    if (cell.level === 4) bgClass = 'bg-emerald-400 border border-white shadow-[0_0_10px_rgba(52,211,153,0.7)]';

                    return (
                      <div
                        key={cell.dateKey}
                        tabIndex={0}
                        aria-label={cell.ariaLabel}
                        title={cell.ariaLabel}
                        className={`aspect-square rounded-xs flex items-center justify-center text-[8px] transition-transform hover:scale-115 focus:scale-115 focus:outline-none cursor-pointer ${bgClass} ${
                          cell.isToday ? 'ring-1 ring-emerald-300' : ''
                        }`}
                      >
                        {cell.level === 4 ? '•' : ''}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Heatmap Intensity Legend */}
              <div className="flex items-center justify-between text-[7px] font-mono text-zinc-500 pt-3 border-t border-green-950/50 mt-2">
                <span>LESS FOCUS</span>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-[#071307] border border-green-950/40" title="0 minutes" />
                  <span className="w-2.5 h-2.5 bg-green-900/60 border border-green-800" title="1-24 minutes" />
                  <span className="w-2.5 h-2.5 bg-green-700/80 border border-green-500" title="25-59 minutes" />
                  <span className="w-2.5 h-2.5 bg-green-500 border border-green-400" title="60-119 minutes" />
                  <span className="w-2.5 h-2.5 bg-emerald-400 border border-white" title="120+ minutes" />
                </div>
                <span>THRIVING</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CONTINUOUS OBSERVATORY SURFACE: SESSION PATTERNS & REFLECTIVE OBSERVATIONS */}
      <section className="space-y-4 pt-2 border-t border-green-950/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* SESSION PATTERNS (Telemetry Grid) */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-400" />
              <h2 className="pixel-font text-[8.5px] sm:text-[9.5px] text-green-300 uppercase tracking-widest font-bold">
                SESSION PATTERNS // TELEMETRY
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="p-3 border border-green-900/40 bg-[#040e04] space-y-1">
                <span className="pixel-font text-[6.5px] text-green-500 uppercase tracking-wider block font-bold">
                  MOST ACTIVE DAY
                </span>
                <p className="pixel-font text-xs sm:text-sm text-green-300 font-bold uppercase">
                  {patterns.mostActiveDay || 'Pending data'}
                </p>
                <span className="text-[8.5px] text-zinc-400 font-mono block">
                  {patterns.mostActiveDay ? 'Peak concentration cadence' : 'Requires session records'}
                </span>
              </div>

              <div className="p-3 border border-green-900/40 bg-[#040e04] space-y-1">
                <span className="pixel-font text-[6.5px] text-green-500 uppercase tracking-wider block font-bold">
                  MOST ACTIVE PERIOD
                </span>
                <p className="pixel-font text-xs sm:text-sm text-green-300 font-bold uppercase">
                  {patterns.mostActivePeriod ? patterns.mostActivePeriod.split('(')[0].trim() : 'Pending data'}
                </p>
                <span className="text-[8.5px] text-zinc-400 font-mono block">
                  {patterns.mostActivePeriod ? patterns.mostActivePeriod : 'Natural focus window'}
                </span>
              </div>

              <div className="p-3 border border-green-900/40 bg-[#040e04] space-y-1">
                <span className="pixel-font text-[6.5px] text-green-500 uppercase tracking-wider block font-bold">
                  AVERAGE SESSION
                </span>
                <p className="pixel-font text-xs sm:text-sm text-green-300 font-bold tabular-nums">
                  {patterns.avgSessionMinutes > 0 ? `${patterns.avgSessionMinutes} MIN` : '0 MIN'}
                </p>
                <span className="text-[8.5px] text-zinc-400 font-mono block">
                  Average single ritual duration
                </span>
              </div>

              <div className="p-3 border border-green-900/40 bg-[#040e04] space-y-1">
                <span className="pixel-font text-[6.5px] text-green-500 uppercase tracking-wider block font-bold">
                  LONGEST SESSION
                </span>
                <p className="pixel-font text-xs sm:text-sm text-emerald-300 font-bold tabular-nums">
                  {patterns.longestSession ? formatMinutes(patterns.longestSession.minutes) : '0 MIN'}
                </p>
                <span className="text-[8.5px] text-zinc-400 font-mono block truncate">
                  {patterns.longestSession ? `Achieved on ${patterns.longestSession.dateLabel}` : 'Peak continuous focus'}
                </span>
              </div>
            </div>
          </div>

          {/* OBSERVATIONS // FROM YOUR GROVE */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-400" />
              <h2 className="pixel-font text-[8.5px] sm:text-[9.5px] text-green-300 uppercase tracking-widest font-bold">
                OBSERVATIONS // FROM YOUR GROVE
              </h2>
            </div>

            <div className="p-3.5 sm:p-4 border border-green-950 bg-[#020802] space-y-3 min-h-[140px]">
              <div className="space-y-2">
                {observations.map((obs, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-zinc-300 font-editorial leading-relaxed">
                    <span className="text-emerald-400 font-mono font-bold shrink-0 mt-0.5">&gt;</span>
                    <span>{obs}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-green-950/60 text-[8px] text-zinc-500 font-mono">
                // Factual telemetry derived from verifiable practice records.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. YOUR GROVE // CURRENT INTENTIONS (Compact Cards with Growth vs Vitality) */}
      <section className="space-y-4 pt-2 border-t border-green-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-400" />
            <h2 className="pixel-font text-[8.5px] sm:text-[9.5px] text-green-300 uppercase tracking-widest font-bold">
              YOUR GROVE // CURRENT INTENTIONS ({intentionSummaries.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('grove')}
            className="pixel-font text-[7px] sm:text-[7.5px] text-zinc-400 hover:text-green-300 transition-colors uppercase tracking-wider cursor-pointer"
          >
            VIEW IN GROVE →
          </button>
        </div>

        {intentionSummaries.length === 0 ? (
          <div className="p-6 border border-green-950 bg-[#030c03] text-center space-y-2 max-w-md mx-auto">
            <p className="pixel-font text-[8px] text-green-400 uppercase tracking-wider font-bold">
              NO ACTIVE INTENTIONS GROWING
            </p>
            <p className="text-xs text-zinc-400 font-editorial">
              Your soil is resting. Plant an intention to cultivate your next specimen.
            </p>
            <div className="pt-2">
              <PixelButton
                variant="success"
                onClick={() => onNavigateTab('grove')}
                className="py-1.5 px-3 text-[7.5px] uppercase font-bold"
              >
                [ PLANT NEW SEED ]
              </PixelButton>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {intentionSummaries.map(({ goal, vitalityReport, lastTendedText, remainingMinutes }) => {
              const icon = SPECIES_ICONS[goal.type] || '🌱';
              const isWilted = vitalityReport.vitality === TreeVitality.WILTING || vitalityReport.vitality === TreeVitality.SEVERELY_WILTED;
              
              return (
                <div 
                  key={goal.id}
                  className={`p-3.5 border transition-all ${
                    isWilted 
                      ? 'border-amber-900/60 bg-[#0a0802]' 
                      : 'border-green-900/40 bg-[#051105] hover:border-green-700/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0" role="img" aria-label={goal.type}>
                        {icon}
                      </span>
                      <div className="min-w-0">
                        <h3 className="pixel-font text-xs text-white uppercase font-bold truncate">
                          {goal.name}
                        </h3>
                        <span className="text-[8px] text-green-400 font-mono block truncate">
                          {goal.type} Specimen • {goal.timeline} Horizon
                        </span>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <span className={`pixel-font text-[6.5px] px-1.5 py-0.5 uppercase tracking-wider font-bold shrink-0 ${
                      vitalityReport.vitality === TreeVitality.THRIVING
                        ? 'border border-emerald-500/80 bg-emerald-950/70 text-emerald-300'
                        : vitalityReport.vitality === TreeVitality.HEALTHY
                          ? 'border border-green-500/80 bg-green-950/70 text-green-300'
                          : vitalityReport.vitality === TreeVitality.WILTING
                            ? 'border border-amber-500/80 bg-amber-950/70 text-amber-300'
                            : 'border border-red-500/80 bg-red-950/70 text-red-300'
                    }`}>
                      {vitalityReport.vitality}
                    </span>
                  </div>

                  {/* Dual Meters: Growth vs Vitality (Separated per Core Invariant) */}
                  <div className="space-y-2 mt-3 pt-2.5 border-t border-green-950/50">
                    {/* Growth Progress (Permanent) */}
                    <div>
                      <div className="flex items-center justify-between text-[7px] font-mono text-zinc-400 mb-1">
                        <span className="text-green-400 uppercase font-bold">GROWTH (PERMANENT)</span>
                        <span className="tabular-nums font-bold text-white">{vitalityReport.growthPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#020802] border border-green-950 overflow-hidden">
                        <div 
                          style={{ width: `${vitalityReport.growthPct}%` }}
                          className="h-full bg-green-400 transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* Vitality Meter (Practice Adherence) */}
                    <div>
                      <div className="flex items-center justify-between text-[7px] font-mono text-zinc-400 mb-1">
                        <span className="text-emerald-400 uppercase font-bold">VITALITY (HEALTH)</span>
                        <span className="tabular-nums font-bold text-white">{vitalityReport.health}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#020802] border border-green-950 overflow-hidden">
                        <div 
                          style={{ width: `${vitalityReport.health}%` }}
                          className={`h-full transition-all duration-300 ${
                            vitalityReport.health >= 70 
                              ? 'bg-emerald-400' 
                              : vitalityReport.health >= 40 
                                ? 'bg-green-500' 
                                : vitalityReport.health >= 25 
                                  ? 'bg-amber-400' 
                                  : 'bg-red-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Stats & Focus CTA */}
                  <div className="mt-3 pt-2 border-t border-green-950/50 flex items-center justify-between">
                    <div className="text-[8px] font-mono text-zinc-400">
                      <span>{lastTendedText}</span>
                      <span className="block text-[7px] text-zinc-500">{remainingMinutes}m remaining</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartFocus(goal.id, 'chronos')}
                      className="pixel-font text-[7px] text-green-300 hover:text-white border border-green-800/80 bg-[#040e04] hover:bg-[#0c240c] px-2 py-1 uppercase tracking-wider font-bold transition-all cursor-pointer min-h-[32px] flex items-center"
                      title={`Start ritual for ${goal.name}`}
                    >
                      FOCUS →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. OBSERVATORY EMPTY STATE NOTICE (When Zero Sessions Recorded) */}
      {!hasLogs && (
        <section aria-label="Observatory Empty Notice" className="p-4 sm:p-6 border-2 border-green-700/60 bg-[#030d03] text-center space-y-2.5 max-w-lg mx-auto shadow-[0_0_25px_rgba(34,197,94,0.15)]">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h3 className="pixel-font text-xs sm:text-sm text-green-300 uppercase tracking-wider font-bold">
              YOUR OBSERVATORY IS QUIET
            </h3>
          </div>
          <p className="font-editorial text-xs sm:text-sm text-zinc-300/90 leading-relaxed">
            "Begin a focus session and your attention field will start taking shape."
          </p>
          <div className="pt-2">
            <PixelButton
              variant="success"
              onClick={() => onStartFocus()}
              className="py-2 px-4 text-[8px] uppercase tracking-wider font-bold min-h-[44px]"
            >
              [ BEGIN FOCUS ]
            </PixelButton>
          </div>
        </section>
      )}

    </div>
  );
};

export default Dashboard;
