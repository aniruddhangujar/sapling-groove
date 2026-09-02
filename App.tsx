
import React, { useState, useEffect, useCallback } from 'react';
import { SaplingGoal, UserProfile, TimelineType, TreeType, AppTab, PomoVisualMode } from './types';
import PixelButton from './components/PixelButton';
import SaplingCanvas from './components/SaplingCanvas';
import GoalModal from './components/GoalModal';
import FocusSession from './components/FocusSession';
import AniChat from './components/AniChat';
import SanctuaryModal from './components/SanctuaryModal';
import { COLORS } from './constants';

const SaplingLogo: React.FC = () => (
  <div className="w-10 h-10 bg-[#061206] border-2 border-green-800/40 flex items-center justify-center relative shadow-[0_0_20px_rgba(34,197,94,0.15)] overflow-hidden">
    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,#22c55e_0.5px,transparent_0.5px)] bg-[length:3px_3px]" />
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
      <path d="M12 21V9M12 9C12 9 8 5 4 5C4 5 4 8 8 11M12 9C12 9 16 5 20 5C20 5 20 8 16 11" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="7" r="1.5" fill="#4ade80" />
      <path d="M12 21C12 21 15 21 17 19M12 21C12 21 9 21 7 19" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </div>
);

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('sapling_profile_v3');
    try {
      return saved ? JSON.parse(saved) : { isPremium: false, totalFocusTime: 0, grove: [] };
    } catch (e) {
      return { isPremium: false, totalFocusTime: 0, grove: [] };
    }
  });

  const [activeTab, setActiveTab] = useState<AppTab>('grove');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSanctuaryModal, setShowSanctuaryModal] = useState(false);
  const [activeSessionGoal, setActiveSessionGoal] = useState<SaplingGoal | null | 'pomodoro'>(null);
  const [pomoVisualMode, setPomoVisualMode] = useState<PomoVisualMode>('clock');

  useEffect(() => {
    localStorage.setItem('sapling_profile_v3', JSON.stringify(profile));
  }, [profile]);

  const addGoal = (newGoal: Partial<SaplingGoal>) => {
    const goal: SaplingGoal = {
      id: Math.random().toString(36).substr(2, 9),
      accruedMinutes: 0,
      isComplete: false,
      health: 100,
      perfectionScore: 1.0,
      startDate: Date.now(),
      ...newGoal
    } as SaplingGoal;
    setProfile(prev => ({ ...prev, grove: [...prev.grove, goal] }));
    setShowGoalModal(false);
  };

  const handleFocusFinish = (minutes: number) => {
    if (activeSessionGoal === 'pomodoro') {
      setProfile(prev => ({ ...prev, totalFocusTime: prev.totalFocusTime + minutes }));
    } else if (activeSessionGoal) {
      setProfile(prev => {
        const updatedGrove = prev.grove.map(g => {
          if (g.id === (activeSessionGoal as SaplingGoal).id) {
            const newAccrued = g.accruedMinutes + minutes;
            const isComplete = newAccrued >= g.totalTargetMinutes;
            return {
              ...g,
              accruedMinutes: newAccrued,
              lastFocusDate: Date.now(),
              isComplete,
              health: Math.min(100, g.health + 15)
            };
          }
          return g;
        });
        return { ...prev, grove: updatedGrove, totalFocusTime: prev.totalFocusTime + minutes };
      });
    }
    setActiveSessionGoal(null);
  };

  const renderGrove = () => {
    const activeGoals = profile.grove.filter(g => !g.isComplete);
    return (
      <div className="space-y-8 md:space-y-12 p-6 md:p-8 animate-in fade-in duration-500 hud-grid min-h-full">
        <div className="flex flex-row justify-between items-end border-b border-green-900/20 pb-8 gap-4">
          <div className="space-y-2">
            <h1 className="pixel-font text-xl md:text-2xl text-white uppercase tracking-[0.2em]">The Grove</h1>
            <p className="text-green-800 text-[10px] uppercase tracking-widest font-bold">Natural Intentions</p>
          </div>
          <PixelButton onClick={() => setShowGoalModal(true)} variant="success" className="h-12 px-4 whitespace-nowrap">+ NEW SEED</PixelButton>
        </div>

        {activeGoals.length === 0 ? (
          <div className="border-2 border-green-900/10 p-16 md:p-24 text-center bg-[#061206]/40 relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-900/30" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-900/30" />
            <p className="pixel-font text-[10px] uppercase tracking-[0.5em] text-green-900 mb-6">Empty Soil</p>
            <p className="text-green-700/60 text-[11px] leading-relaxed uppercase tracking-widest">Plant a seed to begin the ritual.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10">
            {activeGoals.map(goal => (
              <div key={goal.id} className="group relative bg-[#0a160a] border-2 border-green-950/40 p-6 md:p-8 flex flex-col gap-6 hover:border-green-500/40 transition-all duration-300 shadow-2xl">
                <div className="absolute top-0 left-0 w-2 h-2 bg-green-500/10" />
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500/10" />
                
                <div className="flex flex-col sm:flex-row gap-6 md:gap-8">
                  <div className="bg-[#050c05] border border-green-900/20 flex items-center justify-center shrink-0 w-full sm:w-48 aspect-square relative overflow-hidden shadow-[inset_0_0_30px_rgba(34,197,94,0.05)]">
                    <SaplingCanvas goal={goal} size={180} />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="pixel-font text-xl text-zinc-100 uppercase tracking-tighter truncate">{goal.name}</h3>
                        <p className="pixel-font text-[7px] text-green-800 uppercase tracking-widest font-bold">{goal.type} • {goal.timeline}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[7px] pixel-font text-green-900 uppercase tracking-widest">
                          <span>Evolution</span>
                          <span>{Math.round((goal.accruedMinutes / goal.totalTargetMinutes) * 100)}%</span>
                        </div>
                        <div className="h-[4px] bg-[#050c05] w-full">
                          <div 
                            className="h-full bg-green-600 shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all duration-1000" 
                            style={{ width: `${Math.min(100, (goal.accruedMinutes / goal.totalTargetMinutes) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row items-end gap-4 mt-6">
                      <div className="flex-1 bg-[#050c05] p-3 border border-green-900/10">
                        <div className="text-green-900 mb-0.5 uppercase text-[6px] tracking-widest pixel-font font-bold">Stored Focus</div>
                        <div className="text-green-400 font-bold text-xs leading-none whitespace-nowrap">{Math.floor(goal.accruedMinutes / 60)}H {Math.round(goal.accruedMinutes % 60)}M</div>
                      </div>
                      <PixelButton 
                        className="flex-1 py-3 text-[9px] shadow-lg" 
                        variant="primary"
                        onClick={() => setActiveSessionGoal(goal)}
                      >
                        COMMENCE
                      </PixelButton>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
      accruedMinutes: 5,
      isComplete: false,
      health: 100,
      perfectionScore: 1.0
    };

    return (
      <div className="p-8 md:p-12 flex flex-col h-full space-y-10 animate-in fade-in duration-700 hud-grid">
        <div className="text-center space-y-4">
           <h1 className="pixel-font text-2xl md:text-3xl text-white uppercase tracking-[0.4em]">Pomo Utility</h1>
           <p className="text-green-900 text-[10px] uppercase tracking-[0.2em] font-bold">Temporal Alignment Active</p>
           
           <div className="flex justify-center gap-2 mt-4 relative z-50">
              <button 
                key="btn-chronos"
                onClick={() => setPomoVisualMode('clock')}
                className={`px-8 py-3 border-2 pixel-font text-[8px] uppercase tracking-widest transition-all ${pomoVisualMode === 'clock' ? 'border-green-600 bg-green-950/30 text-white shadow-[0_0_20px_rgba(34,197,94,0.15)]' : 'border-green-900/10 bg-[#061206]/40 text-green-900 hover:text-green-500'}`}
              >
                CHRONOS
              </button>
              <button 
                key="btn-grove"
                onClick={() => setPomoVisualMode('tree')}
                className={`px-8 py-3 border-2 pixel-font text-[8px] uppercase tracking-widest transition-all ${pomoVisualMode === 'tree' ? 'border-green-600 bg-green-950/30 text-white shadow-[0_0_20px_rgba(34,197,94,0.15)]' : 'border-green-900/10 bg-[#061206]/40 text-green-900 hover:text-green-500'}`}
              >
                GROVE
              </button>
           </div>
        </div>

        <div className="relative flex-1 flex flex-col items-center justify-center">
           <div className="relative w-72 md:w-80 h-72 md:h-80 flex items-center justify-center bg-[#061206]/60 border-2 border-green-950/20 shadow-2xl group overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-green-500/30 group-hover:border-green-500 transition-all z-20" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-green-500/30 group-hover:border-green-500 transition-all z-20" />

              {pomoVisualMode === 'clock' ? (
                <div key="view-clock" className="absolute inset-0 flex items-center justify-center">
                   <div className="relative w-[90%] h-[90%]">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-[0_0_12px_rgba(34,197,94,0.2)]">
                        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1.5" fill="transparent" className="text-green-950/30" />
                        <circle 
                          cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="5" fill="transparent" 
                          strokeDasharray="282.7" 
                          strokeDashoffset="70.67" 
                          className="text-green-500"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <h2 className="pixel-font text-5xl text-white select-none tracking-tighter leading-none mt-2 shadow-[0_0_10px_rgba(0,0,0,0.5)]">25:00</h2>
                        <span className="pixel-font text-[8px] text-green-800 uppercase mt-12 tracking-[0.4em] font-bold">Cycle Ready</span>
                      </div>
                   </div>
                </div>
              ) : (
                <div key="view-tree" className="absolute inset-0 flex flex-col items-center justify-center bg-[#040a04] p-4 animate-in zoom-in-95 fade-in duration-300">
                  <div className="relative flex items-center justify-center mb-8">
                    <SaplingCanvas goal={dummyGoal} size={280} />
                  </div>
                  <div className="absolute bottom-10 flex flex-col items-center">
                    <h2 className="pixel-font text-3xl text-white select-none tracking-tighter leading-none shadow-lg">25:00</h2>
                    <span className="pixel-font text-[7px] text-green-800 uppercase mt-4 tracking-[0.3em] font-bold">Temporal Nature</span>
                  </div>
                </div>
              )}
           </div>
        </div>

        <PixelButton 
          onClick={() => setActiveSessionGoal('pomodoro')} 
          variant="success"
          className="w-full py-8 md:py-10 text-[14px] border-2 tracking-[0.5em] uppercase shadow-[0_10px_50px_rgba(34,197,94,0.2)]"
        >
          Begin Cycle
        </PixelButton>
      </div>
    );
  };

  const renderSanctuary = () => {
    const completed = profile.grove.filter(g => g.isComplete);
    return (
      <div className="p-8 space-y-10 animate-in fade-in duration-700 hud-grid min-h-full">
        <h1 className="pixel-font text-xl text-green-800 uppercase tracking-[0.5em] text-center font-bold">Historical Logs</h1>
        {completed.length === 0 ? (
          <div className="text-center py-40 opacity-20">
             <p className="pixel-font text-[12px] uppercase tracking-[0.6em] text-green-900">Empty Archive</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-8">
            {completed.map(goal => (
              <div key={goal.id} className="bg-[#0a160a] border border-green-950/40 p-8 text-center relative group shadow-2xl">
                <SaplingCanvas goal={goal} size={120} animate={false} />
                <h4 className="pixel-font text-[10px] mt-8 text-green-500 uppercase truncate">{goal.name}</h4>
                <div className="mt-4 text-[7px] text-green-900 pixel-font uppercase tracking-widest font-bold">Matured</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto border-x-2 border-green-950/30 bg-[#040a04] relative shadow-2xl overflow-hidden">
      <header className="px-6 py-5 md:px-8 md:py-6 border-b-2 border-green-950/20 flex justify-between items-center bg-[#040a04]/95 backdrop-blur-md sticky top-0 z-[60]">
        <div className="flex items-center gap-4">
          <SaplingLogo />
          <span className="pixel-font text-2xl md:text-3xl tracking-tighter text-white drop-shadow-md">SAPLING</span>
        </div>
        <div className="text-right flex flex-col items-end min-w-[100px]">
           <div className="pixel-font text-[7px] text-green-800 uppercase tracking-widest mb-0.5 font-bold">Total Focus</div>
           <div className="pixel-font text-base md:text-lg text-green-400 font-bold tracking-tight">
              {Math.floor(profile.totalFocusTime / 60)}H {Math.round(profile.totalFocusTime % 60)}M
           </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        {activeTab === 'grove' && renderGrove()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'sanctuary' && renderSanctuary()}
        {activeTab === 'ani' && <AniChat profile={profile} activeSessionGoal={activeSessionGoal} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-[#040a04] border-t-2 border-green-950/20 p-4 md:p-6 grid grid-cols-4 gap-2 md:gap-4 z-[60]">
        {[
          { id: 'grove', label: 'GROVE', icon: <path d="M7 14l5-5 5 5M12 9v12 M5 5h14v14H5z" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" /> },
          { id: 'tasks', label: 'POMO', icon: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" /> },
          { id: 'sanctuary', label: 'LOGS', icon: <rect x="6" y="6" width="12" height="12" fill="currentColor" /> },
          { id: 'ani', label: 'ANI', icon: <g fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></g> }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AppTab)}
            className={`flex flex-col items-center gap-3 transition-all duration-300 ${activeTab === tab.id ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}
          >
            <div className={`w-12 h-12 flex items-center justify-center border-2 transition-all ${activeTab === tab.id ? 'border-green-500 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] bg-green-500/10' : 'border-green-950/30 text-green-950'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                {tab.icon}
              </svg>
            </div>
            <span className={`pixel-font text-[8px] tracking-widest ${activeTab === tab.id ? 'text-green-500' : 'text-green-900'}`}>{tab.label}</span>
          </button>
        ))}
      </nav>

      {showGoalModal && <GoalModal onClose={() => setShowGoalModal(false)} onSubmit={addGoal} />}
      {showSanctuaryModal && <SanctuaryModal onClose={() => setShowSanctuaryModal(false)} onUnlock={() => setProfile(prev => ({...prev, isPremium: true}))} />}
      
      {activeSessionGoal && (
        <FocusSession 
          goal={activeSessionGoal === 'pomodoro' ? null : activeSessionGoal}
          visualMode={activeSessionGoal === 'pomodoro' ? pomoVisualMode : 'tree'}
          onFinish={handleFocusFinish}
          onCancel={() => setActiveSessionGoal(null)}
        />
      )}
    </div>
  );
};

export default App;
