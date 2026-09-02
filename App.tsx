import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { SaplingGoal, UserProfile, TimelineType, TreeType, AppTab, PomoVisualMode, FocusMode, FocusSessionLog, AppViewMode } from './types';
import PixelButton from './components/PixelButton';
import SaplingCanvas from './components/SaplingCanvas';
import LandingPage from './components/LandingPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { storageService } from './services/storageService';

// Lazy-loaded App Modules (Loaded on-demand to keep landing page bundle ultra-lean)
const GoalModal = lazy(() => import('./components/GoalModal'));
const FocusSession = lazy(() => import('./components/FocusSession'));
const AniChat = lazy(() => import('./components/AniChat'));
const SanctuaryModal = lazy(() => import('./components/SanctuaryModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));

const SaplingLogo: React.FC = () => (
  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#061206] border-2 border-green-800/40 flex items-center justify-center relative shadow-[0_0_20px_rgba(34,197,94,0.15)] overflow-hidden shrink-0">
    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,#22c55e_0.5px,transparent_0.5px)] bg-[length:3px_3px]" />
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
      <path d="M12 21V9M12 9C12 9 8 5 4 5C4 5 4 8 8 11M12 9C12 9 16 5 20 5C20 5 20 8 16 11" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="7" r="1.5" fill="#4ade80" />
      <path d="M12 21C12 21 15 21 17 19M12 21C12 21 9 21 7 19" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </div>
);

const SaplingAppContent: React.FC = () => {
  const { showAuthModal, setShowAuthModal, user, isAuthenticated } = useAuth();

  // Determine initial view from URL hash
  const [viewMode, setViewMode] = useState<AppViewMode>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#app' || hash === '#grove') return 'app';
    }
    return 'landing';
  });

  const [profile, setProfile] = useState<UserProfile>(() => storageService.getProfile());
  const [activeTab, setActiveTab] = useState<AppTab>('grove');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSanctuaryModal, setShowSanctuaryModal] = useState(false);
  const [activeSessionGoal, setActiveSessionGoal] = useState<SaplingGoal | null | 'pomodoro'>(null);
  const [sessionMode, setSessionMode] = useState<FocusMode>('chronos');
  const [pomoVisualMode, setPomoVisualMode] = useState<PomoVisualMode>('clock');
  const [utilityMode, setUtilityMode] = useState<FocusMode>('chronos');

  // Sync profile changes to storage
  useEffect(() => {
    storageService.saveProfile(profile);
  }, [profile]);

  // Handle URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#app' || hash === '#grove') {
        setViewMode('app');
      } else if (hash === '#landing' || hash === '#manifesto' || hash === '') {
        setViewMode('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToApp = useCallback((options?: { openNewSeed?: boolean; presetTree?: TreeType; presetName?: string }) => {
    setViewMode('app');
    window.location.hash = 'app';
    if (options?.openNewSeed) {
      setShowGoalModal(true);
    }
  }, []);

  const navigateToLanding = useCallback(() => {
    setViewMode('landing');
    window.location.hash = 'landing';
  }, []);

  const addGoal = (newGoal: Partial<SaplingGoal>) => {
    const created = storageService.addGoal(newGoal);
    setProfile(prev => ({ ...prev, grove: [...prev.grove, created] }));
    setShowGoalModal(false);
  };

  const handleFocusFinish = (minutes: number, isComplete: boolean, log: FocusSessionLog) => {
    setProfile(prev => {
      let updatedGrove = prev.grove;
      if (activeSessionGoal && activeSessionGoal !== 'pomodoro') {
        updatedGrove = prev.grove.map(g => {
          if (g.id === (activeSessionGoal as SaplingGoal).id) {
            const newAccrued = g.accruedMinutes + minutes;
            const complete = newAccrued >= g.totalTargetMinutes;
            return {
              ...g,
              accruedMinutes: newAccrued,
              lastFocusDate: Date.now(),
              isComplete: complete,
              health: Math.min(100, g.health + 15)
            };
          }
          return g;
        });
      }

      const newLogs = log.durationMinutes > 0 ? [log, ...prev.logs] : prev.logs;
      const updatedProfile: UserProfile = {
        ...prev,
        grove: updatedGrove,
        totalFocusTime: prev.totalFocusTime + minutes,
        logs: newLogs
      };

      storageService.saveProfile(updatedProfile);
      return updatedProfile;
    });

    setActiveSessionGoal(null);
  };

  const startGoalRitual = (goal: SaplingGoal, mode: FocusMode = 'chronos') => {
    setSessionMode(mode);
    setActiveSessionGoal(goal);
  };

  const startUtilityRitual = () => {
    setSessionMode(utilityMode);
    setActiveSessionGoal('pomodoro');
  };

  // If in Public Website Mode, render the Landing Page
  if (viewMode === 'landing') {
    return (
      <>
        <LandingPage 
          onEnterApp={navigateToApp} 
          onOpenAuth={() => setShowAuthModal(true)} 
        />
        {showAuthModal && (
          <Suspense fallback={null}>
            <AuthModal 
              onClose={() => setShowAuthModal(false)} 
              onSuccess={() => navigateToApp()} 
            />
          </Suspense>
        )}
      </>
    );
  }

  // --- APPLICATION MODE ---

  const renderGrove = () => {
    const activeGoals = profile.grove.filter(g => !g.isComplete);
    return (
      <div className="space-y-6 sm:space-y-8 md:space-y-10 p-4 sm:p-6 md:p-8 animate-in fade-in duration-500 hud-grid min-h-full">
        <div className="flex flex-row justify-between items-end border-b border-green-900/30 pb-5 sm:pb-6 gap-3">
          <div className="space-y-1">
            <h1 className="pixel-font text-lg xs:text-xl sm:text-2xl text-white uppercase tracking-[0.15em] sm:tracking-[0.2em]">
              The Grove
            </h1>
            <p className="text-green-400 text-[9px] sm:text-[10px] uppercase tracking-widest font-bold">
              Natural Intentions
            </p>
          </div>
          <PixelButton 
            onClick={() => setShowGoalModal(true)} 
            variant="success" 
            className="h-11 sm:h-12 px-3 sm:px-4 text-[9px] sm:text-[10px] whitespace-nowrap"
          >
            + NEW SEED
          </PixelButton>
        </div>

        {activeGoals.length === 0 ? (
          <div className="border-2 border-green-900/30 p-8 sm:p-14 md:p-20 text-center bg-[#061206]/50 relative">
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-green-500/50" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-green-500/50" />
            <p className="pixel-font text-[10px] sm:text-xs uppercase tracking-[0.4em] sm:tracking-[0.5em] text-green-400 mb-4 font-bold">
              Empty Soil
            </p>
            <p className="text-green-300/80 text-[11px] sm:text-xs leading-relaxed uppercase tracking-widest max-w-xs mx-auto">
              Plant a seed to begin your botanical focus ritual.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {activeGoals.map(goal => {
              const progressPct = Math.min(100, Math.round((goal.accruedMinutes / goal.totalTargetMinutes) * 100));
              return (
                <div 
                  key={goal.id} 
                  className="group relative bg-[#0a160a] border-2 border-green-950/70 p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 hover:border-green-500/50 transition-all duration-300 shadow-2xl"
                >
                  <div className="absolute top-0 left-0 w-2 h-2 bg-green-500/30" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500/30" />
                  
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-stretch">
                    <div className="bg-[#050c05] border border-green-900/40 flex items-center justify-center shrink-0 w-44 sm:w-44 aspect-square relative overflow-hidden shadow-[inset_0_0_30px_rgba(34,197,94,0.05)]">
                      <SaplingCanvas goal={goal} size={180} />
                    </div>

                    <div className="flex-1 flex flex-col justify-between w-full space-y-4">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <h3 className="pixel-font text-base sm:text-lg text-zinc-100 uppercase tracking-tighter truncate">
                            {goal.name}
                          </h3>
                          <p className="pixel-font text-[7px] sm:text-[8px] text-green-400 uppercase tracking-widest font-bold">
                            {goal.type} • {goal.timeline}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[7px] sm:text-[8px] pixel-font text-green-300 uppercase tracking-widest font-bold">
                            <span>Evolution</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="h-1.5 bg-[#050c05] w-full border border-green-950/60 overflow-hidden">
                            <div 
                              className="h-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all duration-1000" 
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col xs:flex-row items-stretch xs:items-end gap-2 sm:gap-3 pt-2">
                        <div className="bg-[#050c05] p-2.5 sm:p-3 border border-green-900/40 flex-1">
                          <div className="text-green-400 mb-0.5 uppercase text-[6px] sm:text-[7px] tracking-widest pixel-font font-bold">
                            Stored Focus
                          </div>
                          <div className="text-green-300 font-bold text-xs sm:text-sm leading-none whitespace-nowrap">
                            {Math.floor(goal.accruedMinutes / 60)}H {Math.round(goal.accruedMinutes % 60)}M
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-1">
                          <PixelButton 
                            className="flex-1 py-3 text-[8px] sm:text-[9px] shadow-lg h-11 whitespace-nowrap" 
                            variant="primary"
                            onClick={() => startGoalRitual(goal, 'chronos')}
                            aria-label={`Start Chronos ritual for ${goal.name}`}
                          >
                            CHRONOS
                          </PixelButton>
                          <PixelButton 
                            className="flex-1 py-3 text-[8px] sm:text-[9px] shadow-lg h-11 whitespace-nowrap" 
                            variant="success"
                            onClick={() => startGoalRitual(goal, 'groove')}
                            aria-label={`Start Groove ritual for ${goal.name}`}
                          >
                            GROOVE
                          </PixelButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderTasks = () => {
    const dummyGoal: SaplingGoal = {
      id: 'pomo-preview',
      name: 'Pomo Ritual',
      type: TreeType.PINE,
      timeline: TimelineType.DAY,
      startDate: Date.now(),
      durationInDays: 1,
      dailyTargetMinutes: 25,
      totalTargetMinutes: 25,
      accruedMinutes: 10,
      isComplete: false,
      health: 100,
      perfectionScore: 1.0
    };

    return (
      <div className="p-3.5 sm:p-6 md:p-10 flex flex-col h-full space-y-4 sm:space-y-6 animate-in fade-in duration-700 hud-grid max-w-xl mx-auto justify-between">
        <div className="text-center space-y-2 sm:space-y-3">
           <h1 className="pixel-font text-base xs:text-lg sm:text-2xl md:text-3xl text-white uppercase tracking-[0.2em] sm:tracking-[0.4em]">
             Pomo Utility
           </h1>
           <p className="text-green-400 text-[7.5px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold">
             {utilityMode === 'chronos' ? 'Structured Countdown Ritual' : 'Free-Form Elapsed Focus'}
           </p>
           
           <div className="flex justify-center gap-2 pt-1 sm:pt-2">
              <button 
                type="button"
                onClick={() => setUtilityMode('chronos')}
                className={`px-4 xs:px-5 sm:px-8 py-2 sm:py-3 border-2 pixel-font text-[7.5px] sm:text-[9px] uppercase tracking-widest transition-all min-h-[40px] sm:min-h-[44px] ${
                  utilityMode === 'chronos' 
                    ? 'border-green-400 bg-green-950/50 text-white shadow-[0_0_20px_rgba(34,197,94,0.25)] font-bold' 
                    : 'border-green-800/60 bg-[#061406] text-green-400 hover:text-green-200 hover:border-green-600'
                }`}
              >
                CHRONOS
              </button>
              <button 
                type="button"
                onClick={() => setUtilityMode('groove')}
                className={`px-4 xs:px-5 sm:px-8 py-2 sm:py-3 border-2 pixel-font text-[7.5px] sm:text-[9px] uppercase tracking-widest transition-all min-h-[40px] sm:min-h-[44px] ${
                  utilityMode === 'groove' 
                    ? 'border-green-400 bg-green-950/50 text-white shadow-[0_0_20px_rgba(34,197,94,0.25)] font-bold' 
                    : 'border-green-800/60 bg-[#061406] text-green-400 hover:text-green-200 hover:border-green-600'
                }`}
              >
                GROOVE
              </button>
           </div>
        </div>

        {/* Comfortable Spacing for Circular Timer Viewport */}
        <div className="relative flex flex-col items-center justify-center my-auto py-1 sm:py-2">
           <div className="relative w-56 xs:w-64 sm:w-76 h-56 xs:h-64 sm:h-76 flex items-center justify-center bg-[#061206]/70 border-2 border-green-950/60 shadow-2xl group overflow-hidden p-3 sm:p-6">
              <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-green-500/50 group-hover:border-green-400 transition-all z-20" />
              <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-green-500/50 group-hover:border-green-400 transition-all z-20" />

              {utilityMode === 'chronos' ? (
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="relative w-[78%] h-[78%] sm:w-[80%] sm:h-[80%]">
                      <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(34,197,94,0.25)]">
                        <circle cx="60" cy="60" r="46" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-green-950/50" />
                        <circle 
                          cx="60" cy="60" r="46" stroke="currentColor" strokeWidth="5.5" fill="transparent" 
                          strokeDasharray="289.03" 
                          strokeDashoffset="72.25" 
                          className="text-green-400"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <h2 className="pixel-font text-3xl xs:text-4xl sm:text-5xl text-white select-none tracking-tighter leading-none shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                          25:00
                        </h2>
                        <span className="pixel-font text-[7px] sm:text-[8px] text-green-400 uppercase mt-3 sm:mt-5 tracking-[0.25em] font-bold">
                          Countdown Ready
                        </span>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-between p-3 sm:p-4 bg-[#040a04] animate-in zoom-in-95 fade-in duration-300">
                  <div className="z-20 px-2.5 py-1 bg-[#050c05]/95 border border-green-800/70 pixel-corners shadow-md flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="pixel-font text-sm xs:text-base sm:text-lg text-white tracking-tight">00:00 → ∞</span>
                  </div>
                  <div className="relative flex items-center justify-center flex-1 my-auto">
                    <SaplingCanvas goal={dummyGoal} size={180} />
                  </div>
                  <div className="z-20 text-center mb-1">
                    <span className="pixel-font text-[7px] sm:text-[8px] text-green-400 uppercase tracking-[0.2em] font-bold">
                      Free-Form Growth
                    </span>
                  </div>
                </div>
              )}
           </div>
        </div>

        <PixelButton 
          onClick={startUtilityRitual} 
          variant="success"
          className="w-full py-4 sm:py-5 text-[10px] sm:text-xs border-2 tracking-[0.25em] sm:tracking-[0.4em] uppercase shadow-[0_10px_40px_rgba(34,197,94,0.2)] h-12 sm:h-14"
        >
          {utilityMode === 'chronos' ? 'BEGIN CYCLE' : 'COMMENCE GROOVE'}
        </PixelButton>
      </div>
    );
  };

  const renderLogs = () => {
    const completedGoals = profile.grove.filter(g => g.isComplete);
    const sessionLogs = profile.logs || [];

    const formatDate = (timestamp: number) => {
      const d = new Date(timestamp);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-700 hud-grid min-h-full">
        <div className="text-center space-y-1 border-b border-green-900/30 pb-4">
          <h1 className="pixel-font text-lg xs:text-xl sm:text-2xl text-white uppercase tracking-[0.25em] font-bold">
            Historical Logs
          </h1>
          <p className="text-green-400 text-[8px] sm:text-[9px] uppercase tracking-widest font-bold">
            Archive of Focus Rituals & Mature Flora
          </p>
        </div>

        {/* Section: Session Logs */}
        <div className="space-y-3">
          <h2 className="pixel-font text-[10px] sm:text-xs text-green-400 uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500" />
            Recent Rituals ({sessionLogs.length})
          </h2>

          {sessionLogs.length === 0 ? (
            <div className="border border-green-950/60 bg-[#061206]/40 p-8 text-center">
              <p className="pixel-font text-[9px] uppercase tracking-widest text-green-400 font-bold">No Rituals Logged Yet</p>
              <p className="text-green-400/80 text-[10px] mt-1">Complete a Chronos or Groove ritual to record your history.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sessionLogs.slice(0, 20).map(log => (
                <div 
                  key={log.id} 
                  className="bg-[#0a160a] border border-green-950/70 p-3.5 flex items-center justify-between shadow-md hover:border-green-700/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[7px] pixel-font px-1.5 py-0.5 uppercase font-bold border ${
                        log.mode === 'groove' 
                          ? 'bg-amber-950/40 text-amber-400 border-amber-800/50' 
                          : 'bg-green-950/40 text-green-400 border-green-800/50'
                      }`}>
                        {log.mode}
                      </span>
                      <h4 className="pixel-font text-[10px] text-zinc-100 truncate max-w-[140px] sm:max-w-[180px]">
                        {log.goalName}
                      </h4>
                    </div>
                    <p className="text-[10px] text-green-400/80 font-mono">
                      {formatDate(log.startedAt)}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="pixel-font text-xs text-green-300 font-bold">
                      +{log.durationMinutes}M
                    </div>
                    <span className={`text-[6px] pixel-font uppercase ${log.completed ? 'text-green-400' : 'text-zinc-400'}`}>
                      {log.completed ? 'COMPLETED' : 'PARTIAL'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Matured Trees */}
        <div className="space-y-3 pt-4 border-t border-green-950/40">
          <h2 className="pixel-font text-[10px] sm:text-xs text-green-400 uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500" />
            Matured Grove ({completedGoals.length})
          </h2>

          {completedGoals.length === 0 ? (
            <div className="border border-green-950/60 bg-[#061206]/40 p-6 text-center">
              <p className="pixel-font text-[9px] uppercase tracking-widest text-green-400 font-bold">No Matured Trees Yet</p>
              <p className="text-green-400/80 text-[10px] mt-1">Nurture a seed to 100% evolution to enter the permanent sanctuary.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {completedGoals.map(goal => (
                <div key={goal.id} className="bg-[#0a160a] border border-green-950/70 p-4 text-center relative group shadow-2xl">
                  <div className="w-24 h-24 mx-auto">
                    <SaplingCanvas goal={goal} size={100} animate={false} />
                  </div>
                  <h4 className="pixel-font text-[9px] mt-3 text-green-300 uppercase truncate font-bold">{goal.name}</h4>
                  <div className="mt-1 text-[7px] text-green-400 pixel-font uppercase tracking-widest font-bold">Matured</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen h-[100dvh] flex flex-col max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto border-x-2 border-green-950/30 bg-[#040a04] relative shadow-2xl overflow-hidden">
      <header className="px-4 py-3.5 sm:px-6 sm:py-4 md:px-8 md:py-5 border-b-2 border-green-950/20 flex justify-between items-center bg-[#040a04]/95 backdrop-blur-md sticky top-0 z-[60] pt-safe">
        <div className="flex items-center gap-3 sm:gap-4">
          <SaplingLogo />
          <span className="pixel-font text-xl xs:text-2xl md:text-3xl tracking-tighter text-white drop-shadow-md">
            SAPLING
          </span>
          {/* Universal Surface / Manifesto Navigation Button */}
          <button
            onClick={navigateToLanding}
            className="flex items-center gap-1 px-2.5 py-1 border border-green-800/80 bg-[#061406] text-green-300 hover:text-white hover:border-green-400 pixel-font text-[7.5px] sm:text-[8px] uppercase tracking-wider transition-all ml-1 shadow-sm"
            title="Return to Public Website / Manifesto"
          >
            <span>← SURFACE</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right flex flex-col items-end min-w-[85px]">
             <div className="pixel-font text-[6px] sm:text-[7px] text-green-400 uppercase tracking-widest mb-0.5 font-bold">
               Total Focus
             </div>
             <div className="pixel-font text-sm sm:text-base md:text-lg text-green-300 font-bold tracking-tight">
                {Math.floor(profile.totalFocusTime / 60)}H {Math.round(profile.totalFocusTime % 60)}M
             </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 overflow-y-auto pb-28 sm:pb-32">
        {activeTab === 'grove' && renderGrove()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'logs' && renderLogs()}
        {activeTab === 'ani' && (
          <Suspense fallback={
            <div className="p-8 sm:p-14 text-center border-2 border-green-950/60 bg-[#061206]/50 max-w-md mx-auto my-12 animate-pulse">
              <span className="w-2 h-2 inline-block bg-green-400 mr-2 animate-ping" />
              <span className="pixel-font text-[9px] text-green-400 uppercase tracking-widest font-bold">
                CONNECTING TO ANI SATELLITE...
              </span>
            </div>
          }>
            <AniChat profile={profile} activeSessionGoal={activeSessionGoal} />
          </Suspense>
        )}
      </main>

      {/* BOTTOM NAVIGATION WITH CLEAR, CONTRAST-ENHANCED VISIBILITY */}
      <nav 
        aria-label="Main navigation" 
        className="fixed bottom-0 left-0 right-0 max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto bg-[#040a04]/98 backdrop-blur-md border-t-2 border-green-900/40 p-2 sm:p-3 md:p-4 grid grid-cols-4 gap-1.5 sm:gap-2 z-[60] pb-safe"
      >
        {[
          { id: 'grove', label: 'GROVE', icon: <path d="M7 14l5-5 5 5M12 9v12 M5 5h14v14H5z" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" /> },
          { id: 'tasks', label: 'POMO', icon: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" /> },
          { id: 'logs', label: 'LOGS', icon: <rect x="6" y="6" width="12" height="12" fill="currentColor" /> },
          { id: 'ani', label: 'ANI', icon: <g fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></g> }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AppTab)}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 transition-all duration-200 min-h-[48px] group"
            >
              <div className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center border-2 transition-all ${
                isActive 
                  ? 'border-green-400 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.35)] bg-green-500/20' 
                  : 'border-green-800/70 bg-[#061406] text-green-400 group-hover:text-green-200 group-hover:border-green-600 shadow-sm'
              }`}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  {tab.icon}
                </svg>
              </div>
              <span className={`pixel-font text-[7.5px] sm:text-[8px] tracking-widest font-bold transition-colors ${
                isActive ? 'text-green-300' : 'text-green-400 group-hover:text-green-200'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      <Suspense fallback={null}>
        {showGoalModal && <GoalModal onClose={() => setShowGoalModal(false)} onSubmit={addGoal} />}
        {showSanctuaryModal && (
          <SanctuaryModal 
            onClose={() => setShowSanctuaryModal(false)} 
            onUnlock={() => setProfile(prev => ({ ...prev, isPremium: true }))} 
          />
        )}
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)} 
          />
        )}
        
        {activeSessionGoal && (
          <FocusSession 
            goal={activeSessionGoal === 'pomodoro' ? null : activeSessionGoal}
            mode={sessionMode}
            visualMode={activeSessionGoal === 'pomodoro' ? pomoVisualMode : 'tree'}
            onFinish={handleFocusFinish}
            onCancel={() => setActiveSessionGoal(null)}
          />
        )}
      </Suspense>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SaplingAppContent />
    </AuthProvider>
  );
};

export default App;
