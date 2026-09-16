import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { SaplingGoal, UserProfile, TimelineType, TreeType, AppTab, PomoVisualMode, FocusMode, FocusSessionLog, AppViewMode } from './types';
import PixelButton from './components/PixelButton';
import SaplingCanvas from './components/SaplingCanvas';
import LandingPage from './components/LandingPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { storageService } from './services/storageService';
import { authService } from './services/authService';
import { soundEngine } from './utils/audioEngine';
import { calculateGoalVitality, applySessionUpdate, TreeVitality } from './utils/treeLifecycle';

// Lazy-loaded App Modules (Loaded on-demand to keep landing page bundle ultra-lean)
const GoalModal = lazy(() => import('./components/GoalModal'));
const FocusSession = lazy(() => import('./components/FocusSession'));
const AniChat = lazy(() => import('./components/AniChat'));
const SanctuaryModal = lazy(() => import('./components/SanctuaryModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const CommunityModal = lazy(() => import('./components/CommunityModal').then(m => ({ default: m.CommunityModal })));
import GroveTour, { TourStepId } from './components/GroveTour';

const SaplingLogo: React.FC = () => (
  <div className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 bg-[#061206] border-2 border-green-800/40 flex items-center justify-center relative shadow-[0_0_20px_rgba(34,197,94,0.15)] overflow-hidden shrink-0">
    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,#22c55e_0.5px,transparent_0.5px)] bg-[length:3px_3px]" />
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="xs:w-5 xs:h-5 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
      <path d="M12 21V9M12 9C12 9 8 5 4 5C4 5 4 8 8 11M12 9C12 9 16 5 20 5C20 5 20 8 16 11" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="7" r="1.5" fill="#4ade80" />
      <path d="M12 21C12 21 15 21 17 19M12 21C12 21 9 21 7 19" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </div>
);

const parseTabFromHash = (rawHash: string): AppTab | null => {
  if (!rawHash) return null;
  const clean = rawHash.replace(/^#\/?/, '').toLowerCase().trim();
  const parts = clean.split('?')[0].split('/');
  const target = parts[0] === 'app' ? parts[1] : parts[0];
  if (target === 'pomo' || target === 'tasks' || target === 'timer') return 'tasks';
  if (target === 'logs' || target === 'history') return 'logs';
  if (target === 'ani' || target === 'chat' || target === 'assistant') return 'ani';
  if (target === 'dashboard' || target === 'stats' || target === 'observatory') return 'dashboard';
  if (target === 'grove' || target === 'trees') return 'grove';
  return null;
};

const parseViewMode = (rawHash: string): AppViewMode => {
  if (!rawHash) return 'landing';
  const clean = rawHash.replace(/^#\/?/, '').toLowerCase().trim();
  const segment = clean.split('?')[0].split('/')[0];
  if (['app', 'grove', 'pomo', 'tasks', 'logs', 'dashboard', 'ani'].includes(segment)) {
    return 'app';
  }
  return 'landing';
};

const SaplingAppContent: React.FC = () => {
  const { showAuthModal, setShowAuthModal, user, isAuthenticated, signOut, isLoading, redirectError } = useAuth();

  // Determine initial view from URL hash
  const [viewMode, setViewMode] = useState<AppViewMode>(() => {
    if (typeof window !== 'undefined') {
      return parseViewMode(window.location.hash);
    }
    return 'landing';
  });

  // Automatically open AuthModal if a redirect error occurred so the user is informed
  useEffect(() => {
    if (redirectError) {
      setShowAuthModal(true);
    }
  }, [redirectError, setShowAuthModal]);

  // If returning from an authenticated mobile redirect, automatically navigate to app mode
  useEffect(() => {
    if (user && !user.isAnonymous) {
      if (viewMode === 'landing') {
        setViewMode('app');
        if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
          window.location.hash = '#/app';
        }
      }
    }
  }, [user?.id, user?.isAnonymous, viewMode]);

  const [lowBatteryDetected, setLowBatteryDetected] = useState(false);
  const [batteryBannerDismissed, setBatteryBannerDismissed] = useState(false);

  const [profile, setProfile] = useState<UserProfile>(() => storageService.getProfile());
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const fromHash = parseTabFromHash(window.location.hash);
      if (fromHash) return fromHash;
      try {
        const stored = localStorage.getItem('sapling_last_tab') as AppTab | null;
        if (stored && ['grove', 'tasks', 'logs', 'dashboard', 'ani'].includes(stored)) {
          return stored;
        }
      } catch {}
    }
    return 'grove';
  });
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSanctuaryModal, setShowSanctuaryModal] = useState(false);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [communityModalTab, setCommunityModalTab] = useState<'feedback' | 'support' | 'contact'>('feedback');
  const [activeSessionGoal, setActiveSessionGoal] = useState<SaplingGoal | null | 'pomodoro'>(null);
  const [sessionMode, setSessionMode] = useState<FocusMode>('chronos');
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number | undefined>(undefined);
  const [pomoVisualMode, setPomoVisualMode] = useState<PomoVisualMode>('clock');
  const [utilityMode, setUtilityMode] = useState<FocusMode>('chronos');
  const [harvestNotice, setHarvestNotice] = useState<string | null>(null);
  const [recoveredSession, setRecoveredSession] = useState<{
    goalId?: string;
    goalName: string;
    mode: FocusMode;
    elapsedSeconds: number;
    targetDurationSeconds?: number;
  } | null>(null);
  const [selectedGroveGoalId, setSelectedGroveGoalId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const [tourStep, setTourStep] = useState<TourStepId>('welcome');
  const navRef = useRef<HTMLElement>(null);
  const [navHeight, setNavHeight] = useState<number>(0);

  const currentGroveGoal = useMemo(() => {
    const active = profile.grove.filter(g => !g.isComplete);
    return active.find(g => g.id === selectedGroveGoalId) || active[0] || null;
  }, [profile.grove, selectedGroveGoalId]);

  // Trigger guided discovery tour on first entry to Grove (settle delay so real Grove renders first)
  useEffect(() => {
    if (viewMode === 'app' && !profile.groveTourCompleted) {
      const timer = setTimeout(() => {
        setIsTourActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [viewMode, profile.groveTourCompleted]);

  const handleTourDismiss = useCallback(() => {
    setIsTourActive(false);
    setProfile(prev => {
      const updated = { ...prev, groveTourCompleted: true };
      storageService.saveProfile(updated);
      return updated;
    });
  }, []);

  // Monitor network connectivity for offline tolerance
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Dynamically measure fixed bottom navigation to guarantee pixel-exact clearance across all mobile and desktop viewports
  useEffect(() => {
    if (!navRef.current) return;
    const updateNavHeight = () => {
      if (navRef.current) {
        setNavHeight(navRef.current.offsetHeight);
      }
    };
    updateNavHeight();
    const observer = new ResizeObserver(updateNavHeight);
    observer.observe(navRef.current);
    window.addEventListener('resize', updateNavHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateNavHeight);
    };
  }, [viewMode]);

  const dummySeedGoal: SaplingGoal = useMemo(() => ({
    id: 'empty-seed-preview',
    name: 'New Intention',
    type: TreeType.OAK,
    timeline: TimelineType.DAY,
    startDate: Date.now(),
    durationInDays: 1,
    dailyTargetMinutes: 25,
    totalTargetMinutes: 25,
    accruedMinutes: 0,
    isComplete: false,
    health: 100,
    perfectionScore: 1.0
  }), []);

  // Sync profile changes to storage (local-first, with background async cloud sync if authenticated)
  useEffect(() => {
    storageService.saveProfile(profile, user && !user.isAnonymous ? user.id : undefined);
  }, [profile, user?.id, user?.isAnonymous]);

  // When user logs in to a verified Google/Email account, pull and merge Firestore profile.
  // When user signs out, purge in-memory state and load fresh guest profile (Constraint 2: Shared Lab Computers)
  useEffect(() => {
    if (user && !user.isAnonymous) {
      storageService.loadProfileFromFirestore(user.id).then(cloudProfile => {
        setProfile(cloudProfile);
      }).catch(err => {
        console.warn("[App] Cloud sync fallback to local storage:", err?.message);
      });
    } else {
      // Complete in-memory state purge on sign-out
      setProfile(storageService.getProfile('guest'));
      setRecoveredSession(null);
      setActiveSessionGoal(null);
      setSelectedGroveGoalId(null);
      try {
        localStorage.removeItem('sapling_active_session_recovery');
      } catch {}
    }
  }, [user?.id, user?.isAnonymous]);

  // Optional Battery Status API detection (Constraint 3 & 4)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('getBattery' in navigator)) return;
    let battery: any = null;
    const updateBattery = (b: any) => {
      if (b.level <= 0.20 && !b.charging) {
        setLowBatteryDetected(true);
      } else {
        setLowBatteryDetected(false);
      }
    };

    (navigator as any).getBattery().then((b: any) => {
      battery = b;
      updateBattery(battery);
      battery.addEventListener('levelchange', () => updateBattery(battery));
      battery.addEventListener('chargingchange', () => updateBattery(battery));
    }).catch(() => {
      // Gracefully ignore if restricted or unsupported
    });

    return () => {
      if (battery) {
        battery.removeEventListener?.('levelchange', () => updateBattery(battery));
        battery.removeEventListener?.('chargingchange', () => updateBattery(battery));
      }
    };
  }, []);

  // Reversible Eco Canopy Toggle (Constraint 3, 9, 10)
  const toggleEcoCanopy = useCallback(() => {
    setProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        ecoCanopyMode: !prev.preferences?.ecoCanopyMode
      }
    }));
  }, []);

  // First-time student detection (Zero focus time & empty/default seeds)
  const isFirstTimeStudent = useMemo(() => {
    return profile.totalFocusTime === 0 && (profile.grove.length === 0 || profile.grove.every(g => g.accruedMinutes === 0));
  }, [profile.totalFocusTime, profile.grove]);

  // 1-Click Starter Intention Launch (<10s time-to-first-focus)
  const handleLaunchStarterPreset = useCallback((presetType: 'algorithm' | 'essay' | 'review') => {
    let presetName = 'Algorithm Sprint';
    let tree = TreeType.PINE;
    let duration = 25;

    if (presetType === 'essay') {
      presetName = 'Deep Essay';
      tree = TreeType.WILLOW;
      duration = 45;
    } else if (presetType === 'review') {
      presetName = 'Rapid Review';
      tree = TreeType.BAMBOO;
      duration = 15;
    }

    let targetGoal = profile.grove.find(g => g.name === presetName && !g.isComplete);
    if (!targetGoal) {
      targetGoal = storageService.addGoal({
        name: presetName,
        type: tree,
        timeline: TimelineType.DAY,
        startDate: Date.now(),
        durationInDays: 1,
        dailyTargetMinutes: duration,
        totalTargetMinutes: duration,
        accruedMinutes: 0,
        isComplete: false,
        health: 100,
        perfectionScore: 1.0
      });
      setProfile(prev => ({
        ...prev,
        grove: [...prev.grove, targetGoal!]
      }));
    }

    startGoalRitual(targetGoal, 'chronos', duration);
  }, [profile.grove]);

  // Check for in-progress session snapshot on boot (does NOT auto-complete session)
  useEffect(() => {
    try {
      const savedRecovery = localStorage.getItem('sapling_active_session_recovery');
      if (savedRecovery) {
        const parsed = JSON.parse(savedRecovery);
        if (parsed && Date.now() - (parsed.updatedAt || 0) < 12 * 60 * 60 * 1000 && parsed.elapsedSeconds > 10) {
          setRecoveredSession(parsed);
        } else {
          localStorage.removeItem('sapling_active_session_recovery');
        }
      }
    } catch {}
  }, []);

  // Stable Tab Switching Handler: updates state, caches in localStorage, and syncs URL hash
  const handleTabChange = useCallback((newTab: AppTab) => {
    setActiveTab(newTab);
    try {
      localStorage.setItem('sapling_last_tab', newTab);
    } catch {}
    const tabSlug = newTab === 'tasks' ? 'pomo' : newTab;
    const targetHash = newTab === 'grove' ? '#/app' : `#/app/${tabSlug}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, []);

  // Handle URL hash and browser history navigation (Back / Forward / direct links)
  useEffect(() => {
    const handleNavigation = () => {
      const targetView = parseViewMode(window.location.hash);
      setViewMode(targetView);
      if (targetView === 'app') {
        const tabFromHash = parseTabFromHash(window.location.hash);
        if (tabFromHash) {
          setActiveTab(tabFromHash);
        }
      }
    };
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  const navigateToApp = useCallback((options?: { openNewSeed?: boolean; presetTree?: TreeType; presetName?: string; tab?: AppTab }) => {
    setViewMode('app');
    const targetTab = options?.tab || activeTab || 'grove';
    const tabSlug = targetTab === 'tasks' ? 'pomo' : targetTab;
    const targetHash = targetTab === 'grove' ? '#/app' : `#/app/${tabSlug}`;
    if (window.location.hash !== targetHash && window.location.hash !== '#app') {
      window.location.hash = targetHash;
    }
    if (options?.openNewSeed) {
      setShowGoalModal(true);
    }
  }, [activeTab]);

  const navigateToLanding = useCallback(() => {
    setViewMode('landing');
    const targetHash = '#/';
    if (window.location.hash !== targetHash && window.location.hash !== '') {
      window.location.hash = targetHash;
    }
  }, []);

  const addGoal = (newGoal: Partial<SaplingGoal>) => {
    const created = storageService.addGoal(newGoal);
    setProfile(prev => ({ ...prev, grove: [...prev.grove, created] }));
    setShowGoalModal(false);
    setSelectedGroveGoalId(created.id);
    if (isTourActive && tourStep === 'plant') {
      setTourStep('acknowledge');
    }
  };

  const handleFocusFinish = (minutes: number, isComplete: boolean, log: FocusSessionLog) => {
    setProfile(prev => {
      // Strict idempotency guard: prevent duplicate recording if log with same ID or timestamp already exists
      const isDuplicate = prev.logs.some(
        existing => existing.id === log.id ||
        (Math.abs(existing.startedAt - log.startedAt) < 2000 && existing.goalName === log.goalName)
      );

      if (isDuplicate) {
        console.warn("[App] Duplicate session finish blocked:", log.id);
        return prev;
      }

      let updatedGrove = prev.grove;
      let harvestedName: string | null = null;

      if (activeSessionGoal && activeSessionGoal !== 'pomodoro') {
        const goalId = (activeSessionGoal as SaplingGoal).id;
        const now = Date.now();
        updatedGrove = prev.grove.map(g => {
          if (g.id === goalId) {
            const updated = applySessionUpdate(g, minutes, isComplete, now);
            if (updated.isComplete && !g.isComplete) {
              harvestedName = updated.name;
            }
            return updated;
          }
          return g;
        });
      }

      if (harvestedName) {
        setHarvestNotice(harvestedName);
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
    setSessionDurationMinutes(undefined);
  };

  const startGoalRitual = (goal: SaplingGoal, mode: FocusMode = 'chronos', durationMinutes?: number) => {
    setSessionMode(mode);
    const validMinutes = typeof durationMinutes === 'number' && !isNaN(durationMinutes) && durationMinutes > 0 ? durationMinutes : undefined;
    setSessionDurationMinutes(validMinutes);
    setActiveSessionGoal(goal);
  };

  const startUtilityRitual = (durationMinutes?: number) => {
    setSessionMode(utilityMode);
    const validMinutes = typeof durationMinutes === 'number' && !isNaN(durationMinutes) && durationMinutes > 0 ? durationMinutes : (utilityMode === 'chronos' ? 25 : undefined);
    setSessionDurationMinutes(validMinutes);
    setActiveSessionGoal('pomodoro');
  };

  // Calm botanical synchronizing state while resolving mobile OAuth redirect
  if (isLoading && authService.isAuthRedirectInProgress()) {
    return (
      <div className="min-h-screen bg-[#061206] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 border-2 border-green-500/80 flex items-center justify-center relative shadow-[0_0_30px_rgba(34,197,94,0.3)] mb-4 animate-pulse">
          <span className="w-3 h-3 bg-green-400" />
        </div>
        <h2 className="pixel-font text-xs text-green-300 uppercase tracking-widest font-bold mb-2">
          SYNCHRONIZING SANCTUARY...
        </h2>
        <p className="font-mono text-[9px] text-green-500/80 tracking-wider">
          RESTORE BIOMETRIC IDENTITY // CONNECTING TO SOIL
        </p>
      </div>
    );
  }

  const handleOpenCommunity = (tab: 'feedback' | 'support' | 'contact' = 'feedback') => {
    setCommunityModalTab(tab);
    setShowCommunityModal(true);
  };

  // If in Public Website Mode, render the Landing Page
  if (viewMode === 'landing') {
    return (
      <>
        <LandingPage 
          onEnterApp={navigateToApp} 
          onOpenAuth={() => setShowAuthModal(true)} 
          onOpenCommunity={handleOpenCommunity}
        />
        {showAuthModal && (
          <Suspense fallback={null}>
            <AuthModal 
              onClose={() => setShowAuthModal(false)} 
              onSuccess={() => navigateToApp()} 
            />
          </Suspense>
        )}
        {showCommunityModal && (
          <Suspense fallback={null}>
            <CommunityModal
              isOpen={showCommunityModal}
              onClose={() => setShowCommunityModal(false)}
              initialTab={communityModalTab}
              currentRoute="/#landing"
              user={user}
            />
          </Suspense>
        )}
      </>
    );
  }

  // --- APPLICATION MODE ---


  const renderGrove = () => {
    const activeGoals = profile.grove.filter(g => !g.isComplete);
    const completedGoals = profile.grove.filter(g => g.isComplete);
    const rawActiveGoal = activeGoals.find(g => g.id === selectedGroveGoalId) || activeGoals[0];

    // Authoritative dynamic vitality derived from intention + session logs (Invariants 1-10)
    const vitalityReport = rawActiveGoal
      ? calculateGoalVitality(rawActiveGoal, Date.now(), profile.logs)
      : null;

    const activeGoal: SaplingGoal | undefined = rawActiveGoal && vitalityReport
      ? { ...rawActiveGoal, health: vitalityReport.health, vitality: vitalityReport.vitality }
      : rawActiveGoal;

    const progressPct = vitalityReport ? vitalityReport.growthPct : 0;

    return (
      <div className="space-y-2.5 sm:space-y-3 p-3 xs:p-4 sm:p-5 animate-in fade-in duration-500 hud-grid flex flex-col">
        <div className="space-y-2.5 sm:space-y-3">
          {/* Tranquil Sanctuary Header */}
          <div className="flex flex-row justify-between items-center border-b border-green-900/30 pb-2.5 sm:pb-3 gap-3 shrink-0">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <h1 className="pixel-font text-sm xs:text-base sm:text-lg text-white uppercase tracking-wider font-bold">
                  The Grove
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setIsTourActive(true);
                    setTourStep('welcome');
                  }}
                  title="Replay Grove Tour"
                  className="pixel-font text-[6.5px] xs:text-[7px] text-zinc-500 hover:text-green-300 border border-green-950/60 bg-[#051105] px-1 py-0.5 ml-0.5 transition-colors cursor-pointer"
                >
                  ? GUIDE
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCommunity('feedback')}
                  title="Community & Field Reports"
                  className="hidden sm:inline-flex pixel-font text-[6.5px] xs:text-[7px] text-zinc-500 hover:text-emerald-300 border border-emerald-950/60 bg-[#051105] px-1 py-0.5 ml-0.5 transition-colors cursor-pointer"
                >
                  COMMUNITY
                </button>
              </div>
              <p className="text-green-400/80 text-[7px] sm:text-[8px] uppercase tracking-widest font-display font-medium">
                Sanctuary of Attention
              </p>
            </div>
            <button 
              data-tour="plant-seed"
              onClick={() => setShowGoalModal(true)} 
              className="px-2.5 xs:px-3 sm:px-4 py-1.5 border border-green-800/80 bg-[#061406] hover:bg-[#0c240c] text-green-300 hover:text-white hover:border-green-400 pixel-font text-[7px] xs:text-[7.5px] sm:text-[8px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1 min-h-[36px]"
            >
              <span>+ NEW SEED</span>
            </button>
          </div>

          {!isOnline && (
            <div className="bg-[#051105] border border-green-800/60 p-2 sm:p-2.5 flex items-center justify-between text-green-400 pixel-font text-[7px] sm:text-[7.5px] uppercase tracking-wider shrink-0 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span>Offline Canopy Mode • Local soil active & protected</span>
              </div>
              <span className="text-zinc-500 font-mono text-[9px]">(Offline)</span>
            </div>
          )}

          {/* Eco Canopy Low-Battery Recommendation Banner (Constraint 3 & 4) */}
          {lowBatteryDetected && !batteryBannerDismissed && !profile.preferences?.ecoCanopyMode && (
            <div className="bg-[#140e04] border-2 border-amber-500/80 p-2.5 sm:p-3 flex items-center justify-between text-amber-300 pixel-font text-[7.5px] sm:text-[8px] uppercase tracking-wider shrink-0 animate-in fade-in shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shrink-0" />
                <span className="truncate">⚡ LOW BATTERY DETECTED // Enable Eco Canopy to preserve power & reduce GPU load</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button 
                  type="button"
                  onClick={() => {
                    setProfile(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        ecoCanopyMode: true
                      }
                    }));
                    setBatteryBannerDismissed(true);
                  }}
                  className="px-2.5 py-1 border border-amber-500 bg-amber-950/70 text-amber-200 hover:text-white font-bold"
                >
                  ENABLE
                </button>
                <button 
                  type="button"
                  onClick={() => setBatteryBannerDismissed(true)}
                  className="text-amber-500 hover:text-amber-200 px-1 text-base leading-none font-bold"
                  aria-label="Dismiss battery alert"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* First-Time Student 10-Second Onboarding Banner (Zero Friction Quick Start) */}
          {isFirstTimeStudent && (
            <div className="bg-[#061406] border-2 border-green-500/70 p-3 sm:p-4 shadow-[0_0_25px_rgba(34,197,94,0.15)] animate-in fade-in shrink-0 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="pixel-font text-[8px] sm:text-[9px] text-green-300 uppercase tracking-wider font-bold">
                    SPROUT YOUR FIRST RITUAL // 10-SECOND QUICK START
                  </span>
                </div>
                <span className="text-[7px] text-green-500 pixel-font uppercase">ZERO FRICTION</span>
              </div>
              <p className="font-editorial text-[11px] sm:text-xs text-green-300/80 leading-snug">
                Every minute of focused study cultivates and grows your cyber-botanical tree. Select a starter ritual preset to begin:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleLaunchStarterPreset('algorithm')}
                  className="px-2.5 py-2 border border-green-700/80 bg-[#081a08] hover:bg-[#0f2e0f] hover:border-green-400 text-left transition-all group"
                >
                  <div className="pixel-font text-[7.5px] text-green-300 group-hover:text-white font-bold uppercase truncate">
                    ⚡ Algorithm Sprint
                  </div>
                  <div className="text-[9px] text-green-500/80 font-mono mt-0.5">25m • Pine Specimen</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunchStarterPreset('essay')}
                  className="px-2.5 py-2 border border-green-700/80 bg-[#081a08] hover:bg-[#0f2e0f] hover:border-green-400 text-left transition-all group"
                >
                  <div className="pixel-font text-[7.5px] text-green-300 group-hover:text-white font-bold uppercase truncate">
                    📜 Deep Essay
                  </div>
                  <div className="text-[9px] text-green-500/80 font-mono mt-0.5">45m • Willow Specimen</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunchStarterPreset('review')}
                  className="px-2.5 py-2 border border-green-700/80 bg-[#081a08] hover:bg-[#0f2e0f] hover:border-green-400 text-left transition-all group"
                >
                  <div className="pixel-font text-[7.5px] text-green-300 group-hover:text-white font-bold uppercase truncate">
                    🌿 Rapid Review
                  </div>
                  <div className="text-[9px] text-green-500/80 font-mono mt-0.5">15m • Bamboo Specimen</div>
                </button>
              </div>
            </div>
          )}

          {recoveredSession && (
            <div className="bg-[#061406] border-2 border-amber-600/70 p-2.5 sm:p-3 flex items-center justify-between shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-in fade-in shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 bg-amber-400 animate-pulse shrink-0" />
                <div className="text-left min-w-0">
                  <span className="pixel-font text-[8px] sm:text-[8.5px] text-amber-300 uppercase tracking-wider block font-bold truncate">
                    IN-PROGRESS RITUAL: "{recoveredSession.goalName}"
                  </span>
                  <span className="text-[9px] text-amber-400/90 font-mono">
                    {Math.floor(recoveredSession.elapsedSeconds / 60)} minutes preserved from previous session.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button 
                  onClick={() => {
                    const matched = profile.grove.find(g => g.id === recoveredSession.goalId);
                    const rec = recoveredSession;
                    const durationMins = rec.targetDurationSeconds ? Math.round(rec.targetDurationSeconds / 60) : undefined;
                    setRecoveredSession(null);
                    localStorage.removeItem('sapling_active_session_recovery');
                    if (matched) {
                      startGoalRitual(matched, rec.mode, durationMins);
                    } else {
                      setUtilityMode(rec.mode);
                      startUtilityRitual(durationMins);
                    }
                  }}
                  className="pixel-font text-[7px] sm:text-[7.5px] text-amber-200 hover:text-white border border-amber-500/80 bg-[#140e04] px-2.5 py-1 uppercase tracking-widest transition-colors font-bold shadow-sm"
                >
                  RESUME →
                </button>
                <button 
                  onClick={() => {
                    setRecoveredSession(null);
                    localStorage.removeItem('sapling_active_session_recovery');
                  }}
                  className="text-amber-500 hover:text-amber-200 px-1 text-base leading-none font-bold"
                  aria-label="Dismiss recovery"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {harvestNotice && (
            <div className="bg-green-950/70 border-2 border-green-500/50 p-2.5 sm:p-3 flex items-center justify-between shadow-[0_0_20px_rgba(34,197,94,0.2)] animate-in fade-in shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 animate-pulse shrink-0" />
                <div className="text-left">
                  <span className="pixel-font text-[8px] sm:text-[8.5px] text-green-300 uppercase tracking-wider block font-bold">
                    FLORA HARVESTED: "{harvestNotice}"
                  </span>
                  <span className="text-[9px] text-green-400/90 font-mono">
                    Matured to 100% and safely archived in Sanctuary Logs.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={() => { handleTabChange('logs'); setHarvestNotice(null); }}
                  className="pixel-font text-[7px] sm:text-[7.5px] text-green-300 hover:text-white border border-green-700/60 bg-[#061406] px-2 py-1 uppercase tracking-widest transition-colors font-bold"
                >
                  LOGS →
                </button>
                <button 
                  onClick={() => setHarvestNotice(null)}
                  className="text-green-500 hover:text-green-200 px-1 text-base leading-none font-bold"
                  aria-label="Dismiss notice"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Intention Selector Drawer when multiple active seeds exist */}
          {activeGoals.length > 1 && (
            <div className="flex items-center gap-1.5 xs:gap-2 overflow-x-auto pb-1 custom-scrollbar shrink-0">
              <span className="pixel-font text-[6.5px] xs:text-[7px] text-green-500 uppercase tracking-widest shrink-0">
                INTENTIONS ({activeGoals.length}):
              </span>
              {activeGoals.map(g => {
                const isSel = g.id === activeGoal.id;
                const pPct = Math.min(100, Math.round((g.accruedMinutes / g.totalTargetMinutes) * 100));
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroveGoalId(g.id)}
                    className={`px-2.5 xs:px-3 py-1 border pixel-font text-[6.5px] xs:text-[7px] sm:text-[7.5px] uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5 min-h-[32px] ${
                      isSel
                        ? 'border-green-400 bg-green-500/20 text-white shadow-[0_0_12px_rgba(34,197,94,0.3)] font-bold'
                        : 'border-green-950 bg-[#061206] text-green-400 hover:border-green-800'
                    }`}
                  >
                    <span className="whitespace-nowrap">{g.name}</span>
                    <span className="text-[6px] text-green-300 opacity-80">{pPct}%</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeGoals.length === 0 ? (
            /* Poetic & Inspiring Empty State */
            <div className="relative flex flex-col items-center justify-center py-8 sm:py-14 text-center max-w-md mx-auto">
              <div data-tour="hero-tree" className="relative w-48 sm:w-56 aspect-square flex items-center justify-center mb-2">
                <div className="absolute inset-0 rounded-full bg-green-500/5 blur-2xl pointer-events-none" />
                <SaplingCanvas 
                  goal={dummySeedGoal} 
                  size={200} 
                  animate={true} 
                  forceEcoMode={Boolean(profile.preferences?.ecoCanopyMode)}
                />
              </div>
              <h2 className="pixel-font text-sm sm:text-base text-white uppercase tracking-tight mb-1 font-bold">
                YOUR SOIL IS WAITING
              </h2>
              <p className="font-editorial text-xs sm:text-sm text-green-300/80 leading-relaxed mb-4 max-w-xs">
                Every forest begins with a single, quiet dedication of attention. Plant an intention to cultivate your first tree.
              </p>
              <PixelButton
                data-tour="plant-seed"
                variant="success"
                onClick={() => setShowGoalModal(true)}
                className="py-2.5 px-5 text-[8.5px] sm:text-[9px] tracking-widest uppercase h-10 sm:h-11 shadow-[0_0_20px_rgba(34,197,94,0.3)] font-bold"
              >
                [ PLANT YOUR SEED ]
              </PixelButton>
            </div>
          ) : (
            /* Hero Living Sanctuary Pedestal */
            <div className="relative flex flex-col items-center justify-center py-1 sm:py-3 text-center">
              {/* Ambient Soil Aura */}
              <div className="absolute inset-0 max-w-md mx-auto rounded-full bg-gradient-to-b from-green-500/5 via-green-950/20 to-transparent blur-3xl pointer-events-none" />

              {/* Active Specimen Subtitle / Archetype */}
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-green-900/50 bg-[#061406]/80 text-[6px] xs:text-[6.5px] sm:text-[7px] pixel-font text-green-400 uppercase tracking-widest mb-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span>SPECIMEN // {activeGoal.type.toUpperCase()}</span>
              </div>

              {/* Intention Title */}
              <h2 className="pixel-font text-base xs:text-lg sm:text-xl md:text-2xl text-white uppercase tracking-tight max-w-md mx-auto px-4 truncate drop-shadow-md font-bold">
                {activeGoal.name}
              </h2>

              {/* Horizon & Biological Ethos */}
              <p className="font-editorial text-[11px] sm:text-xs text-green-300/80 mt-0.5 max-w-md mx-auto italic">
                {activeGoal.timeline} Ritual • {activeGoal.dailyTargetMinutes}m daily intention
              </p>

              {/* Hero Tree Canvas Showcase */}
              <div data-tour="hero-tree" className="relative z-10 w-36 xs:w-44 sm:w-48 aspect-square flex items-center justify-center my-0.5">
                <SaplingCanvas 
                  goal={activeGoal} 
                  size={190} 
                  animate={true} 
                  forceEcoMode={Boolean(profile.preferences?.ecoCanopyMode)}
                />
              </div>

              {/* Grounding Telemetry & Biological Maturation */}
              <div className="w-full max-w-sm sm:max-w-md mx-auto space-y-2 sm:space-y-2.5 px-2 sm:px-4">
                {/* Maturation & Vitality Telemetry */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[6.5px] xs:text-[7px] sm:text-[7.5px] pixel-font text-green-300 uppercase tracking-wider font-bold">
                    <span>
                      {vitalityReport?.growthStage === 'Seed' ? 'STAGE 1: SEED' : vitalityReport?.growthStage === 'Sprout' ? 'STAGE 2: SPROUT' : vitalityReport?.growthStage === 'Sapling' ? 'STAGE 3: SAPLING' : 'STAGE 4: MATURE'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {vitalityReport && (
                        <span className={`px-1.5 py-0.5 text-[5.5px] xs:text-[6px] sm:text-[6.5px] border ${
                          vitalityReport.vitality === TreeVitality.THRIVING
                            ? 'border-green-500/60 text-green-300 bg-green-950/40'
                            : vitalityReport.vitality === TreeVitality.HEALTHY
                            ? 'border-emerald-500/60 text-emerald-300 bg-emerald-950/40'
                            : vitalityReport.isRecovering
                            ? 'border-amber-500/60 text-amber-300 bg-amber-950/40 animate-pulse'
                            : vitalityReport.vitality === TreeVitality.WILTING
                            ? 'border-amber-600/60 text-amber-400 bg-amber-950/30'
                            : 'border-zinc-700 text-zinc-400 bg-zinc-900/50'
                        }`}>
                          VITALITY: {vitalityReport.vitality.toUpperCase()}{vitalityReport.isRecovering ? ' • RECOVERING' : ''}
                        </span>
                      )}
                      <span className="text-white">{progressPct}% EVOLUTION</span>
                    </div>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-[#050c05] w-full border border-green-900/60 overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all duration-1000"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[6px] xs:text-[6.5px] sm:text-[7px] text-green-500 pixel-font uppercase tracking-widest pt-0.5">
                    <span>STORED: {Math.floor(activeGoal.accruedMinutes / 60)}H {Math.round(activeGoal.accruedMinutes % 60)}M</span>
                    <span>HORIZON: {activeGoal.totalTargetMinutes}M</span>
                  </div>
                  {vitalityReport && (
                    <div className="text-center pt-0.5">
                      <p className="font-editorial text-[10px] sm:text-[11px] text-green-300/80 italic">
                        {vitalityReport.poeticStatus}
                      </p>
                    </div>
                  )}
                </div>

                {/* Primary Cultivation Actions */}
                <div data-tour="focus-actions" className="flex flex-row items-center justify-center gap-1.5 xs:gap-2 pt-1 w-full max-w-full">
                  <PixelButton 
                    data-tour="groove-btn"
                    variant="success"
                    onClick={() => startGoalRitual(activeGoal, 'groove')}
                    className="flex-1 py-2.5 sm:py-3 text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] tracking-wider xs:tracking-widest uppercase h-10 xs:h-11 sm:h-12 shadow-[0_0_25px_rgba(34,197,94,0.25)] font-bold whitespace-nowrap min-w-0 px-2 xs:px-4"
                    aria-label={`Start Groove focus session for ${activeGoal.name}`}
                  >
                    <span className="hidden xs:inline">[ COMMENCE GROOVE ]</span>
                    <span className="xs:hidden">[ GROOVE ]</span>
                  </PixelButton>
                  <PixelButton 
                    data-tour="chronos-btn"
                    variant="primary"
                    onClick={() => startGoalRitual(activeGoal, 'chronos')}
                    className="px-2.5 xs:px-4 sm:w-32 py-2.5 sm:py-3 text-[7px] xs:text-[8px] sm:text-[8.5px] tracking-wider uppercase h-10 xs:h-11 sm:h-12 whitespace-nowrap shrink-0"
                    aria-label={`Start Chronos countdown for ${activeGoal.name}`}
                  >
                    CHRONOS
                  </PixelButton>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Permanent Canopy of Matured Trees (Grove History) */}
        {completedGoals.length > 0 && (
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-green-950/60 max-w-4xl mx-auto space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-400" />
                <h3 className="pixel-font text-[7.5px] sm:text-[8.5px] text-green-300 uppercase tracking-widest font-bold">
                  PERMANENT CANOPY ({completedGoals.length})
                </h3>
              </div>
              <button 
                onClick={() => handleTabChange('logs')}
                className="pixel-font text-[6.5px] sm:text-[7px] text-green-500 hover:text-green-300 uppercase tracking-wider transition-colors"
              >
                VIEW ARCHIVES →
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
              {completedGoals.map(cg => (
                <div key={cg.id} className="flex flex-col items-center text-center p-1.5 border border-green-950/60 bg-[#061206]/50 hover:border-green-800 transition-all">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                    <SaplingCanvas 
                      goal={cg} 
                      size={70} 
                      animate={false} 
                      forceEcoMode={Boolean(profile.preferences?.ecoCanopyMode)}
                    />
                  </div>
                  <span className="pixel-font text-[6px] sm:text-[6.5px] text-green-300 uppercase truncate w-full mt-1 font-bold">
                    {cg.name}
                  </span>
                  <span className="text-[5.5px] text-green-500 pixel-font uppercase">
                    {cg.type}
                  </span>
                </div>
              ))}
            </div>
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
      <div className="p-3 xs:p-4 sm:p-6 flex flex-col min-h-full space-y-3 sm:space-y-5 animate-in fade-in duration-700 hud-grid max-w-xl mx-auto justify-between pb-3 sm:pb-4">
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
                className={`px-4 xs:px-5 sm:px-8 py-2 sm:py-2.5 border-2 pixel-font text-[7.5px] sm:text-[9px] uppercase tracking-widest transition-all min-h-[38px] sm:min-h-[42px] ${
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
                className={`px-4 xs:px-5 sm:px-8 py-2 sm:py-2.5 border-2 pixel-font text-[7.5px] sm:text-[9px] uppercase tracking-widest transition-all min-h-[38px] sm:min-h-[42px] ${
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
           <div className="relative w-48 xs:w-56 sm:w-64 md:w-68 h-48 xs:h-56 sm:h-64 md:h-68 flex items-center justify-center bg-[#061206]/70 border-2 border-green-950/60 shadow-2xl group overflow-hidden p-3 sm:p-6">
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
                        <h2 className="pixel-font text-2xl xs:text-3xl sm:text-5xl text-white select-none tracking-tighter leading-none shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                          25:00
                        </h2>
                        <span className="pixel-font text-[7px] sm:text-[8px] text-green-400 uppercase mt-2 sm:mt-4 tracking-[0.2em] font-bold">
                          READY
                        </span>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-between p-3 sm:p-4 bg-[#040a04] animate-in zoom-in-95 fade-in duration-300">
                  <div className="z-20 px-2.5 py-1 bg-[#050c05]/95 border border-green-800/70 pixel-corners shadow-md flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="pixel-font text-xs xs:text-sm sm:text-base text-white tracking-tight">00:00 → ∞</span>
                  </div>
                  <div className="relative flex items-center justify-center flex-1 my-auto">
                    <SaplingCanvas 
                      goal={dummyGoal} 
                      size={160} 
                      forceEcoMode={Boolean(profile.preferences?.ecoCanopyMode)}
                    />
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

        <div className="pt-2 pb-1 w-full">
          <PixelButton 
            onClick={() => startUtilityRitual(utilityMode === 'chronos' ? 25 : undefined)} 
            variant="success"
            className="w-full py-3 sm:py-4 text-[9px] xs:text-[10px] sm:text-xs border-2 tracking-[0.2em] sm:tracking-[0.4em] uppercase shadow-[0_10px_40px_rgba(34,197,94,0.2)] h-11 sm:h-12"
          >
            {utilityMode === 'chronos' ? 'BEGIN CYCLE' : 'COMMENCE GROOVE'}
          </PixelButton>
        </div>
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
                    <SaplingCanvas 
                      goal={goal} 
                      size={100} 
                      animate={false} 
                      forceEcoMode={Boolean(profile.preferences?.ecoCanopyMode)}
                    />
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

  const renderDashboard = () => (
    <Suspense fallback={
      <div className="p-8 sm:p-14 text-center border-2 border-green-950/60 bg-[#061206]/50 max-w-md mx-auto my-12 animate-pulse">
        <span className="w-2 h-2 inline-block bg-emerald-400 mr-2 animate-ping" />
        <span className="pixel-font text-[9px] text-emerald-400 uppercase tracking-widest font-bold">
          SYNCHRONIZING OBSERVATORY...
        </span>
      </div>
    }>
      <Dashboard
        profile={profile}
        onStartFocus={(goalId, mode) => {
          if (goalId) {
            const matched = profile.grove.find(g => g.id === goalId);
            if (matched) {
              startGoalRitual(matched, mode || 'chronos', 25);
              return;
            }
          }
          startUtilityRitual(25);
        }}
        onNavigateTab={handleTabChange}
        onOpenCommunity={handleOpenCommunity}
      />
    </Suspense>
  );

  return (
    <div className="app-shell-viewport flex flex-col w-full max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto border-x-2 border-green-950/30 bg-[#040a04] relative shadow-2xl overflow-hidden">
      <header className="px-3 py-2 sm:px-6 sm:py-4 md:px-8 md:py-5 border-b-2 border-green-950/20 bg-[#040a04]/95 backdrop-blur-md sticky top-0 z-[60] pt-safe shrink-0">
        {/* Responsive Container: 2-tier on mobile (< sm:), single row on sm: and up */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          
          {/* Top Tier (Mobile) / Left Section (Desktop) */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 min-w-0">
            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 min-w-0">
              <SaplingLogo />
              <span className="pixel-font text-xs xs:text-base sm:text-2xl md:text-3xl tracking-tight text-white drop-shadow-md shrink-0">
                SAPLING
              </span>
            </div>

            {/* On Desktop: Surface Manifesto Navigation Button sits next to Logo */}
            <button
              onClick={navigateToLanding}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 border border-green-800/80 bg-[#061406] text-green-300 hover:text-white hover:border-green-400 pixel-font text-[8px] uppercase tracking-wider transition-all shrink-0 shadow-sm min-h-[36px]"
              title="Return to Public Website / Manifesto"
            >
              <span>← SURFACE</span>
            </button>

            {/* On Mobile: Controls (Eco Canopy Toggle & Sign In/Out) align to right of Top Row */}
            <div className="flex sm:hidden items-center gap-1.5 shrink-0">
              {/* Reversible Eco Canopy Mode Toggle */}
              <button
                type="button"
                onClick={toggleEcoCanopy}
                className={`flex items-center gap-1 px-2 py-1.5 border pixel-font text-[7.5px] uppercase tracking-wider transition-all shrink-0 min-h-[36px] ${
                  profile.preferences?.ecoCanopyMode
                    ? 'border-emerald-400 bg-emerald-950/70 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-bold'
                    : 'border-green-800/70 bg-[#061406] text-green-400 hover:border-green-500 hover:text-green-200'
                }`}
                title={profile.preferences?.ecoCanopyMode ? "Eco Canopy Active (2D mode). Tap to switch to 3D Voxel." : "3D Voxel Active. Tap to switch to 2D Eco Canopy."}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${profile.preferences?.ecoCanopyMode ? 'bg-emerald-400' : 'bg-green-500'}`} />
                <span>
                  {profile.preferences?.ecoCanopyMode ? 'ECO' : '3D'}
                  <span className="hidden xs:inline">{profile.preferences?.ecoCanopyMode ? ' (2D)' : ' VOXEL'}</span>
                </span>
              </button>

              {/* User Sign In / Sign Out */}
              {user && !user.isAnonymous ? (
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-1 px-2 py-1.5 border border-zinc-700 bg-zinc-950/80 text-zinc-300 hover:text-red-300 hover:border-red-700 pixel-font text-[7.5px] uppercase tracking-wider transition-all shrink-0 min-h-[36px]"
                  title="Sign out & purge private session data"
                >
                  <span>SIGN OUT</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-1 px-2 py-1.5 border border-green-800/80 bg-[#061406] text-green-300 hover:text-white hover:border-green-400 pixel-font text-[7.5px] uppercase tracking-wider transition-all shrink-0 min-h-[36px]"
                  title="Sign in to save your grove to cloud"
                >
                  <span>SIGN IN</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Tier (Mobile) / Right Section (Desktop) */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 min-w-0 w-full sm:w-auto">
            {/* On Mobile: Surface Button on the left of Bottom Row */}
            <button
              onClick={navigateToLanding}
              className="flex sm:hidden items-center gap-1 px-2 py-1.5 border border-green-800/80 bg-[#061406] text-green-300 hover:text-white hover:border-green-400 pixel-font text-[7.5px] uppercase tracking-wider transition-all shrink-0 shadow-sm min-h-[36px]"
              title="Return to Public Website / Manifesto"
            >
              <span>← SURFACE</span>
            </button>

            {/* On Desktop: Controls (Eco Toggle & Sign In) */}
            <div className="hidden sm:flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={toggleEcoCanopy}
                className={`flex items-center gap-1 px-2.5 py-1.5 border pixel-font text-[7.5px] uppercase tracking-wider transition-all shrink-0 min-h-[36px] ${
                  profile.preferences?.ecoCanopyMode
                    ? 'border-emerald-400 bg-emerald-950/70 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-bold'
                    : 'border-green-800/70 bg-[#061406] text-green-400 hover:border-green-500 hover:text-green-200'
                }`}
                title={profile.preferences?.ecoCanopyMode ? "Eco Canopy Active (2D low-power mode). Click to switch to 3D Voxel." : "3D Voxel Active. Click to switch to 2D Eco Canopy for Chromebooks/battery saving."}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${profile.preferences?.ecoCanopyMode ? 'bg-emerald-400' : 'bg-green-500'}`} />
                <span>{profile.preferences?.ecoCanopyMode ? 'ECO (2D)' : '3D VOXEL'}</span>
              </button>

              {user && !user.isAnonymous ? (
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-zinc-700 bg-zinc-950/80 text-zinc-300 hover:text-red-300 hover:border-red-700 pixel-font text-[7.5px] uppercase tracking-wider transition-all shrink-0 min-h-[36px]"
                  title="Sign out & purge private session data from this computer"
                >
                  <span>SIGN OUT</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-green-800/80 bg-[#061406] text-green-300 hover:text-white hover:border-green-400 pixel-font text-[7.5px] uppercase tracking-wider transition-all shrink-0 min-h-[36px]"
                  title="Sign in to save your grove to cloud"
                >
                  <span>SIGN IN</span>
                </button>
              )}
            </div>

            {/* Total Focus Counter with tabular-nums: Both Mobile and Desktop */}
            <div className="text-right flex flex-row sm:flex-col items-center sm:items-end gap-1 sm:gap-0 shrink-0">
              <span className="pixel-font text-[6.5px] sm:text-[7px] text-green-400/90 uppercase tracking-wider font-bold whitespace-nowrap">
                <span className="hidden xs:inline">TOTAL </span>FOCUS:
              </span>
              <span className="pixel-font text-xs sm:text-base md:text-lg text-green-300 font-bold tracking-tight whitespace-nowrap tabular-nums">
                {Math.floor(profile.totalFocusTime / 60)}H {Math.round(profile.totalFocusTime % 60)}M
              </span>
            </div>
          </div>

        </div>
      </header>

      <main 
        id="main-content" 
        className={`flex-1 min-h-0 ${activeTab === 'ani' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto pb-6 sm:pb-8'}`}
      >
        {activeTab === 'grove' && renderGrove()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'logs' && renderLogs()}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'ani' && (
          <Suspense fallback={
            <div className="p-8 sm:p-14 text-center border-2 border-green-950/60 bg-[#061206]/50 max-w-md mx-auto my-12 animate-pulse">
              <span className="w-2 h-2 inline-block bg-green-400 mr-2 animate-ping" />
              <span className="pixel-font text-[9px] text-green-400 uppercase tracking-widest font-bold">
                CONNECTING TO ANI SATELLITE...
              </span>
            </div>
          }>
            <AniChat 
              profile={profile} 
              activeSessionGoal={activeSessionGoal} 
              onPlantGoal={addGoal}
              onStartRitual={(goal, mode, duration) => {
                if (goal === 'pomodoro') {
                  setUtilityMode(mode);
                  startUtilityRitual(duration);
                } else {
                  startGoalRitual(goal, mode, duration);
                }
              }}
              onSelectSoundscape={(trackId) => {
                soundEngine.playTrack(trackId);
                setProfile(prev => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    soundscape: trackId
                  }
                }));
              }}
              onNavigateTab={(tab) => handleTabChange(tab)}
            />
          </Suspense>
        )}
      </main>

      {/* BOTTOM NAVIGATION WITH CLEAR, CONTRAST-ENHANCED VISIBILITY & SAFE-AREA CLEARANCE */}
      <nav 
        ref={navRef}
        aria-label="Main navigation" 
        className="shrink-0 z-[60] border-t-2 border-green-900/50 bg-[#040a04] px-1 pt-1.5 pb-safe-nav xs:px-2 xs:pt-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3 grid grid-cols-5 gap-0.5 xs:gap-1 sm:gap-2 shadow-[0_-10px_25px_rgba(0,0,0,0.8)]"
      >
        {[
          { id: 'grove', label: 'GROVE', icon: <path d="M7 14l5-5 5 5M12 9v12 M5 5h14v14H5z" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" /> },
          { id: 'tasks', label: 'POMO', icon: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" /> },
          { id: 'logs', label: 'LOGS', icon: <rect x="6" y="6" width="12" height="12" fill="currentColor" /> },
          { 
            id: 'dashboard', 
            label: 'DASH', 
            fullLabel: 'DASHBOARD', 
            icon: (
              <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="7.5" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
              </g>
            )
          },
          { id: 'ani', label: 'ANI', icon: <g fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></g> }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              data-tour={`nav-${tab.id === 'tasks' ? 'pomo' : tab.id}`}
              type="button"
              onClick={() => handleTabChange(tab.id as AppTab)}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 py-1 sm:py-2 transition-all duration-200 min-h-[44px] group cursor-pointer select-none active:scale-[0.97]"
            >
              <div className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-11 sm:h-11 flex items-center justify-center border-2 transition-all ${
                isActive 
                  ? 'border-green-400 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.35)] bg-green-500/20' 
                  : 'border-green-800/70 bg-[#061406] text-green-400 group-hover:text-green-200 group-hover:border-green-600 shadow-sm'
              }`}>
                <svg width="14" height="14" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24">
                  {tab.icon}
                </svg>
              </div>
              <span className={`pixel-font text-[6px] xs:text-[7px] sm:text-[8px] tracking-tight xs:tracking-wider sm:tracking-widest font-bold transition-colors ${
                isActive ? 'text-green-300' : 'text-green-400 group-hover:text-green-200'
              }`}>
                <span className="sm:hidden">{tab.label}</span>
                <span className="hidden sm:inline">{tab.fullLabel || tab.label}</span>
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
            onOpenCommunity={handleOpenCommunity}
          />
        )}
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)} 
          />
        )}
        {showCommunityModal && (
          <CommunityModal
            isOpen={showCommunityModal}
            onClose={() => setShowCommunityModal(false)}
            initialTab={communityModalTab}
            currentRoute={`/#${activeTab}`}
            user={user}
          />
        )}
        
        {activeSessionGoal && (
          <FocusSession 
            goal={activeSessionGoal === 'pomodoro' ? null : activeSessionGoal}
            mode={sessionMode}
            visualMode={activeSessionGoal === 'pomodoro' ? pomoVisualMode : 'tree'}
            durationMinutes={sessionDurationMinutes}
            onFinish={handleFocusFinish}
            onCancel={() => {
              setActiveSessionGoal(null);
              setSessionDurationMinutes(undefined);
            }}
            forceEcoMode={Boolean(profile.preferences?.ecoCanopyMode)}
          />
        )}
      </Suspense>

      {/* Guided First-Time Grove Discovery Tour */}
      {isTourActive && !activeSessionGoal && !showGoalModal && !showSanctuaryModal && !showAuthModal && viewMode === 'app' && activeTab === 'grove' && (
        <GroveTour
          currentStep={tourStep}
          onStepChange={setTourStep}
          onComplete={handleTourDismiss}
          onSkip={handleTourDismiss}
          onOpenGoalModal={() => setShowGoalModal(true)}
          onTryChronos={() => {
            if (currentGroveGoal) {
              startGoalRitual(currentGroveGoal, 'chronos', 25);
            } else {
              startUtilityRitual(25);
            }
          }}
          onTryGroove={() => {
            if (currentGroveGoal) {
              startGoalRitual(currentGroveGoal, 'groove');
            } else {
              setUtilityMode('groove');
              startUtilityRitual();
            }
          }}
          onTryDashboard={() => handleTabChange('dashboard')}
          onTryLogs={() => handleTabChange('logs')}
          onTryAni={() => handleTabChange('ani')}
          onTryPomo={() => handleTabChange('tasks')}
          hasActiveGoal={Boolean(currentGroveGoal)}
        />
      )}
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
