
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SaplingGoal, PomoVisualMode, TreeType, TimelineType } from '../types';
import PixelButton from './PixelButton';
import SaplingCanvas from './SaplingCanvas';
import { QUOTES, MUSIC_TRACKS } from '../constants';

interface Props {
  goal: SaplingGoal | null; 
  visualMode?: PomoVisualMode;
  onFinish: (minutes: number, isComplete?: boolean, mode?: 'chronos' | 'grove') => void;
  onCancel: () => void;
}

type SessionState = 'active' | 'break_choice' | 'on_break' | 'success';

const BREAK_REMINDERS = [
  "Take a sip of water.",
  "Stretch your back gently.",
  "Rest your eyes on something distant.",
  "Breathe deeply for a moment.",
  "Stand up and move your legs.",
  "You're making great progress.",
  "Release the tension in your hands."
];

interface BirdData {
  id: string;
  type: 'blue' | 'red';
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  perched: boolean;
  spawnedAt: number;
}

const PixelBird: React.FC<{ data: BirdData; frame: number }> = ({ data, frame }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 28;
  const grid = 16;
  const pSize = size / grid;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;

    const drawPixel = (px: number, py: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(px * pSize, py * pSize, pSize, pSize);
    };

    const color = data.type === 'blue' ? '#3b82f6' : '#ef4444';
    const darkColor = data.type === 'blue' ? '#1d4ed8' : '#b91c1c';
    const wingFlap = !data.perched && Math.sin(frame * 0.6) > 0;

    // Body
    [[7,7,color],[8,7,color],[9,7,color],[7,8,color],[8,8,color],[9,8,color],[10,7,'#fbbf24']].forEach(([px,py,c]) => drawPixel(px as number, py as number, c as string));
    // Eye
    drawPixel(9,7,'#000');
    // Wings
    if (wingFlap) {
       drawPixel(7,6,darkColor);
       drawPixel(8,6,darkColor);
    } else {
       drawPixel(7,8,darkColor);
       drawPixel(8,8,darkColor);
    }
  }, [data, frame]);

  return (
    <div 
      className="absolute transition-all duration-300 pointer-events-none z-20" 
      style={{ left: `${Math.max(5, Math.min(95, data.x))}%`, top: `${Math.max(10, Math.min(90, data.y))}%`, transform: 'translateX(-50%)' }}
    >
      <canvas ref={canvasRef} width={size} height={size} style={{ imageRendering: 'pixelated' }} />
    </div>
  );
};

const Butterfly: React.FC<{ frame: number }> = ({ frame }) => {
  const x = useMemo(() => 10 + Math.random() * 80, []);
  const y = useMemo(() => 15 + Math.random() * 45, []);
  const color = useMemo(() => ['#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#fff'][Math.floor(Math.random()*5)], []);
  const bx = Math.max(5, Math.min(95, x + Math.sin(frame * 0.05 + x) * 15));
  const by = Math.max(10, Math.min(85, y + Math.cos(frame * 0.04 + y) * 10));
  const wingOpen = Math.sin(frame * 0.3) > 0;

  return (
    <div 
      className="absolute w-1.5 h-1.5 transition-all duration-100 z-10"
      style={{ left: `${bx}%`, top: `${by}%`, backgroundColor: color, opacity: wingOpen ? 1 : 0.4 }}
    />
  );
};

const FocusSession: React.FC<Props> = ({ goal, visualMode = 'clock', onFinish, onCancel }) => {
  const initialDuration = goal ? goal.dailyTargetMinutes * 60 : 25 * 60;
  
  const [sessionState, setSessionState] = useState<SessionState>('active');
  const [seconds, setSeconds] = useState(initialDuration);
  const [isActive, setIsActive] = useState(false);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [breakReminderIdx, setBreakReminderIdx] = useState(0);
  const [selectedMusic, setSelectedMusic] = useState(MUSIC_TRACKS[1]); 
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [breakDuration, setBreakDuration] = useState(5); 
  const [accruedMins, setAccruedMins] = useState(0);
  const [frame, setFrame] = useState(0);
  const [birds, setBirds] = useState<BirdData[]>([]);
  
  const initialSecondsRef = useRef(initialDuration);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Dummy goal for Pomodoro mode tree visualization - PINE is very grove-like
  const pomoDummyGoal: SaplingGoal = useMemo(() => ({
    id: 'pomo-session-tree',
    name: 'Pomo Session',
    type: TreeType.PINE,
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

  useEffect(() => {
    let animId: number;
    const tick = () => {
      setFrame(f => f + 1);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(s => s - 1);
      }, 1000);
    } else if (seconds === 0 && isActive) {
      handleStepComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  // Break Reminder Cycling
  useEffect(() => {
    if (sessionState !== 'on_break') return;
    const interval = setInterval(() => {
      setBreakReminderIdx(prev => (prev + 1) % BREAK_REMINDERS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [sessionState]);

  // Bird Nature Logic for Break
  useEffect(() => {
    if (sessionState !== 'on_break') {
      setBirds([]);
      return;
    }
    const interval = setInterval(() => {
      if (birds.length < 3 && Math.random() > 0.85) {
        const side = Math.random() > 0.5 ? -10 : 110;
        setBirds(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 5),
          type: Math.random() > 0.5 ? 'blue' : 'red',
          x: side,
          y: 40 + Math.random() * 40,
          targetX: 20 + Math.random() * 60,
          targetY: 70 + Math.random() * 10,
          perched: false,
          spawnedAt: Date.now()
        }]);
      }
      setBirds(prev => {
        return prev.map(b => {
          let nx = b.x;
          let ny = b.y;
          let np = b.perched;
          const dx = b.targetX - b.x;
          const dy = b.targetY - b.y;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            nx += dx * 0.05;
            ny += dy * 0.05;
          } else {
            np = true;
          }
          return { ...b, x: nx, y: ny, perched: np };
        });
      });
    }, 100);
    return () => clearInterval(interval);
  }, [sessionState, birds.length]);

  const handleStepComplete = () => {
    setIsActive(false);
    if (sessionState === 'active') {
      const actualMins = Math.max(1, Math.floor((initialSecondsRef.current - seconds) / 60));
      setAccruedMins(actualMins);
      setSessionState('break_choice');
    } else if (sessionState === 'on_break') {
      setSessionState('success');
    }
  };

  const startBreak = () => {
    setSeconds(breakDuration * 60);
    initialSecondsRef.current = breakDuration * 60;
    setSessionState('on_break');
    setIsActive(true);
  };

  const handleAutoSaveExit = () => {
    const totalMinutesSpent = (sessionState === 'active') 
      ? Math.floor((initialSecondsRef.current - seconds) / 60) 
      : accruedMins;
    const isComp = seconds === 0;
    onFinish(totalMinutesSpent, isComp, visualMode === 'clock' ? 'chronos' : 'grove');
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  const currentAccruingMins = Math.floor((initialSecondsRef.current - seconds) / 60);
  const elapsedSeconds = initialSecondsRef.current - seconds;
  const progressPercent = initialSecondsRef.current > 0 ? (seconds / initialSecondsRef.current) : 1;

  const activeGoalForCanvas = goal || pomoDummyGoal;

  if (sessionState === 'success') {
    return (
      <div className="fixed inset-0 bg-[#040a04] z-[200] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 overflow-y-auto">
        <div className="space-y-6 w-full max-w-xs sm:max-w-sm flex flex-col items-center my-auto">
          <div className="w-12 h-12 bg-green-950/40 border-2 border-green-500/40 flex items-center justify-center shadow-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-green-400">
               <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h1 className="pixel-font text-base sm:text-lg text-white uppercase tracking-[0.25em]">Ritual Complete</h1>
            <p className="pixel-font text-[8px] text-green-500 uppercase tracking-widest mt-1">Growth Synthesized: +{accruedMins}M</p>
          </div>
          <div className="bg-[#0a160a] border-2 border-green-950/60 w-56 h-56 flex items-center justify-center relative shadow-2xl overflow-hidden p-2">
             <SaplingCanvas goal={activeGoalForCanvas} size={200} overrideAccruedMinutes={activeGoalForCanvas.accruedMinutes + accruedMins} />
          </div>
          <PixelButton 
            onClick={() => onFinish(accruedMins, true, visualMode === 'clock' ? 'chronos' : 'grove')} 
            variant="success" 
            className="w-full py-4 text-[11px] tracking-widest mt-2"
          >
            RETURN TO THE GROVE
          </PixelButton>
        </div>
      </div>
    );
  }

  if (sessionState === 'break_choice') {
    return (
      <div className="fixed inset-0 bg-[#040a04] z-[200] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 overflow-y-auto">
        <div className="space-y-6 w-full max-w-xs sm:max-w-sm my-auto">
           <div className="flex flex-col items-center space-y-3">
              <div className="w-14 h-14 bg-green-950/30 border-2 border-green-500/30 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z M6 1v3 M10 1v3 M14 1v3" />
                </svg>
              </div>
              <h1 className="pixel-font text-base sm:text-lg text-white uppercase tracking-wider">Ritual Peak</h1>
              <p className="pixel-font text-[8px] text-green-400 uppercase tracking-widest font-bold">Time Synthesized: +{accruedMins}M</p>
           </div>
           
           <div className="bg-[#0a160a] p-5 border border-green-950/40 space-y-4">
              <p className="pixel-font text-[8px] text-green-600 uppercase tracking-widest text-center font-bold">Sanctuary Interval</p>
              <div className="grid grid-cols-4 gap-2">
                 {[5, 10, 15, 20].map(d => (
                   <button 
                     key={d} 
                     onClick={() => setBreakDuration(d)}
                     className={`py-3 pixel-font text-[8px] border-2 transition-all flex items-center justify-center ${breakDuration === d ? 'bg-green-600 border-green-400 text-black shadow-md font-bold' : 'bg-[#050c05] border-green-900/30 text-green-700'}`}
                   >
                     {d}M
                   </button>
                 ))}
              </div>
           </div>

           <div className="space-y-3 pt-2">
              <PixelButton onClick={startBreak} variant="success" className="w-full py-4 text-[10px] tracking-wider">START SANCTUARY BREAK</PixelButton>
              <button 
                onClick={() => setSessionState('success')} 
                className="w-full py-3 pixel-font text-[8px] text-green-700 hover:text-green-400 uppercase tracking-widest underline underline-offset-4"
              >
                Skip for now
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#040a04] z-[100] flex flex-col justify-between p-4 sm:p-6 text-center animate-in fade-in duration-500 overflow-hidden select-none">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none hud-grid" />

      {/* HEADER HUD */}
      <div className="w-full max-w-md mx-auto pt-2 z-10 shrink-0">
        <div className="flex justify-between items-center px-2 py-2 border-b border-green-950/40">
          <div className="text-left">
            <h2 className="pixel-font text-[10px] text-green-400 uppercase tracking-wider font-bold truncate max-w-[180px]">
              {sessionState === 'on_break' ? 'SANCTUARY' : (goal ? goal.name : 'FOCUS RITUAL')}
            </h2>
            <div className={`pixel-font text-[7px] mt-0.5 ${sessionState === 'on_break' ? 'text-blue-400' : 'text-green-600'}`}>
              {sessionState === 'on_break' ? '• REST MODE' : `• +${currentAccruingMins}M SYNCED`}
            </div>
          </div>
          <div className="text-right">
            <div className="pixel-font text-[6px] text-green-800 uppercase tracking-widest font-bold">TARGET</div>
            <div className="pixel-font text-xs text-green-400 font-bold">{formatTime(initialSecondsRef.current)}</div>
          </div>
        </div>
      </div>

      {/* RITUAL VIEWPORT */}
      <div className="relative w-full max-w-[300px] sm:max-w-[340px] aspect-square mx-auto border-2 border-green-950/40 bg-[#061206]/60 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden my-auto shrink-0">
        
        {/* Subtle Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
           <span className="pixel-font text-xs uppercase tracking-[2em] text-green-500">{sessionState === 'on_break' ? 'REST' : 'SYNC'}</span>
        </div>
        
        {/* Nature details for breaks */}
        {sessionState === 'on_break' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(6)].map((_, i) => <Butterfly key={i} frame={frame + (i * 120)} />)}
          </div>
        )}

        {/* Birds */}
        {sessionState === 'on_break' && birds.map(bird => (
          <PixelBird key={bird.id} data={bird} frame={frame} />
        ))}

        {/* Visual Content */}
        <div className="w-full h-full flex flex-col items-center justify-center p-4 z-10 relative">
          {visualMode === 'clock' ? (
            <div className="relative w-full h-full flex items-center justify-center">
               <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] transform -rotate-90 drop-shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                  <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-green-950/40" />
                  <circle 
                    cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="5" fill="transparent" 
                    strokeDasharray="263.89" 
                    strokeDashoffset={`${263.89 * (1 - progressPercent)}`}
                    strokeLinecap="round"
                    className="text-green-500 shadow-[0_0_20px_#22c55e] transition-all duration-1000"
                  />
               </svg>
               {/* Centered Timer HUD Layer */}
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <h2 className="pixel-font text-4xl sm:text-5xl text-white select-none tracking-tighter leading-none">
                    {formatTime(seconds)}
                  </h2>
                  <span className="pixel-font text-[7px] text-green-600 uppercase mt-3 tracking-widest font-bold">
                    {isActive ? 'Ritual Active' : 'Paused'}
                  </span>
               </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-between py-2">
              {/* Top/Overlay HUD Badge for Timer */}
              <div className="z-20 px-3 py-1 bg-[#050c05]/90 border border-green-900/60 pixel-corners shadow-md flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                <span className="pixel-font text-xl text-white tracking-tight">{formatTime(seconds)}</span>
              </div>

              {/* Tree Canvas in Grove Mode */}
              <div className="relative flex-1 flex items-center justify-center w-full my-auto overflow-hidden">
                <SaplingCanvas 
                  goal={activeGoalForCanvas} 
                  size={240} 
                  overrideAccruedMinutes={activeGoalForCanvas.accruedMinutes + (elapsedSeconds / 60)} 
                />
              </div>

              {/* Bottom Tree Growth Status */}
              <div className="z-20 text-center">
                <span className="pixel-font text-[7px] text-green-700 uppercase tracking-widest font-bold">
                  {goal ? `${goal.type} Growth` : 'Grove Focus'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONTROLS & QUOTE */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-4 z-10 shrink-0 pb-2">
        {/* Quote / Reminder Text */}
        <div className="min-h-[36px] flex items-center justify-center px-4">
           <p className="text-green-700 text-[10px] sm:text-[11px] italic text-center font-bold tracking-wider leading-relaxed line-clamp-2 max-w-[320px]">
            "{sessionState === 'on_break' ? BREAK_REMINDERS[breakReminderIdx] : quote}"
           </p>
        </div>

        {/* Action Controls */}
        <div className="w-full flex justify-between items-center gap-3 px-2">
          {/* Sound / Music Toggle */}
          <button 
            onClick={() => setShowSettings(true)}
            className={`w-12 h-12 border-2 transition-all bg-[#0a160a] pixel-corners flex items-center justify-center shrink-0 shadow-md ${isMusicEnabled ? 'border-green-500 text-green-400' : 'border-green-950 text-green-800'}`}
            aria-label="Sound Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </button>

          {/* Primary COMMENCE / HALT Button */}
          <PixelButton 
            variant={isActive ? 'secondary' : 'primary'}
            onClick={() => setIsActive(!isActive)}
            className="flex-1 py-3.5 text-[10px] sm:text-[11px] tracking-[0.3em] h-12 shadow-lg"
          >
            {isActive ? 'HALT' : 'COMMENCE'}
          </PixelButton>

          {/* Exit Button */}
          <button 
            onClick={handleAutoSaveExit} 
            className="w-12 h-12 border-2 border-green-950 bg-[#0a160a] text-green-800 hover:text-red-400 hover:border-red-900/60 transition-all pixel-corners flex items-center justify-center shrink-0 shadow-md"
            aria-label="Exit Session"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Music Selector Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#040a04]/95 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xs bg-[#0a160a] border-2 border-green-950/60 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-green-950/40 pb-3">
               <h3 className="pixel-font text-[9px] text-green-500 uppercase tracking-widest font-bold">Ambient Audio</h3>
               <button onClick={() => setShowSettings(false)} className="text-green-700 text-2xl leading-none hover:text-green-400 transition-colors">×</button>
            </div>
            <div className="space-y-2">
              {MUSIC_TRACKS.map(track => (
                <button
                  key={track.id}
                  onClick={() => { setSelectedMusic(track); setIsMusicEnabled(track.id !== 'none'); }}
                  className={`text-[9px] pixel-font w-full p-3.5 text-left border-2 transition-all ${selectedMusic.id === track.id ? 'border-green-500 bg-green-950/40 text-white shadow-sm' : 'border-green-950/40 bg-[#050c05] text-green-800 hover:border-green-800'}`}
                >
                  {track.name}
                </button>
              ))}
            </div>
            <PixelButton onClick={() => setShowSettings(false)} className="w-full mt-6 py-3 text-[9px]" variant="success">CONFIRM</PixelButton>
          </div>
        </div>
      )}

      {isMusicEnabled && selectedMusic.url && (
        <audio ref={audioRef} loop src={selectedMusic.url} style={{ display: 'none' }} />
      )}
    </div>
  );
};

export default FocusSession;
