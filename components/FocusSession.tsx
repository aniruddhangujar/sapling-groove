import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SaplingGoal, PomoVisualMode, TreeType, TimelineType, FocusMode, FocusSessionLog } from '../types';
import PixelButton from './PixelButton';
import SaplingCanvas from './SaplingCanvas';
import { QUOTES, MUSIC_TRACKS } from '../constants';
import { useTimer } from '../hooks/useTimer';
import { soundEngine } from '../utils/audioEngine';

interface Props {
  goal: SaplingGoal | null;
  mode?: FocusMode;
  visualMode?: PomoVisualMode;
  onFinish: (minutes: number, isComplete: boolean, log: FocusSessionLog) => void;
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
    [[7, 7, color], [8, 7, color], [9, 7, color], [7, 8, color], [8, 8, color], [9, 8, color], [10, 7, '#fbbf24']].forEach(
      ([px, py, c]) => drawPixel(px as number, py as number, c as string)
    );
    // Eye
    drawPixel(9, 7, '#000');
    // Wings
    if (wingFlap) {
      drawPixel(7, 6, darkColor);
      drawPixel(8, 6, darkColor);
    } else {
      drawPixel(7, 8, darkColor);
      drawPixel(8, 8, darkColor);
    }
  }, [data, frame]);

  return (
    <div
      className="absolute transition-all duration-300 pointer-events-none z-20"
      style={{
        left: `${Math.max(5, Math.min(95, data.x))}%`,
        top: `${Math.max(10, Math.min(90, data.y))}%`,
        transform: 'translateX(-50%)'
      }}
    >
      <canvas ref={canvasRef} width={size} height={size} style={{ imageRendering: 'pixelated' }} />
    </div>
  );
};

const Butterfly: React.FC<{ frame: number }> = ({ frame }) => {
  const x = useMemo(() => 10 + Math.random() * 80, []);
  const y = useMemo(() => 15 + Math.random() * 45, []);
  const color = useMemo(() => ['#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#fff'][Math.floor(Math.random() * 5)], []);
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

const FocusSession: React.FC<Props> = ({
  goal,
  mode = 'chronos',
  visualMode = 'clock',
  onFinish,
  onCancel
}) => {
  const remainingToMaturityMinutes = goal 
    ? Math.max(1, goal.totalTargetMinutes - goal.accruedMinutes) 
    : 25;
  const targetDurationSeconds = goal 
    ? Math.min(goal.dailyTargetMinutes, remainingToMaturityMinutes) * 60 
    : 25 * 60;
  
  const [sessionState, setSessionState] = useState<SessionState>('active');
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [breakReminderIdx, setBreakReminderIdx] = useState(0);
  const [selectedMusic, setSelectedMusic] = useState(MUSIC_TRACKS[1]); // Default to 'zen' Ambient Resonance
  const [isMusicEnabled, setIsMusicEnabled] = useState(true); // Enabled by default on ritual start
  const [showSettings, setShowSettings] = useState(false);
  const [breakDuration, setBreakDuration] = useState(5);
  const [frame, setFrame] = useState(0);
  const [birds, setBirds] = useState<BirdData[]>([]);
  const [accruedMins, setAccruedMins] = useState(0);

  const startTimestampRef = useRef<number>(Date.now());
  const focusMode: FocusMode = mode === 'groove' ? 'groove' : 'chronos';

  // Fallback dummy goal for Pomodoro mode tree visualization
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

  // Main ritual timer
  const handleRitualComplete = useCallback(() => {
    soundEngine.pause();
    const minutes = Math.max(1, Math.round(targetDurationSeconds / 60));
    setAccruedMins(minutes);

    const currentAccrued = goal ? goal.accruedMinutes : 0;
    const totalTarget = goal ? goal.totalTargetMinutes : minutes;
    const isMatured = (currentAccrued + minutes) >= totalTarget;

    if (isMatured || focusMode === 'groove') {
      setSessionState('success');
    } else {
      setSessionState('break_choice');
    }
  }, [focusMode, targetDurationSeconds, goal]);

  const timer = useTimer({
    mode: focusMode,
    targetSeconds: targetDurationSeconds,
    onComplete: handleRitualComplete
  });

  // Break timer (timestamp-based countdown)
  const breakTimer = useTimer({
    mode: 'chronos',
    targetSeconds: breakDuration * 60,
    onComplete: () => {
      setSessionState('success');
    }
  });

  // Start sound when ritual is running and music is enabled
  useEffect(() => {
    if (isMusicEnabled && selectedMusic.id !== 'none' && (timer.isRunning || breakTimer.isRunning)) {
      soundEngine.playTrack(selectedMusic.id);
    } else if (!timer.isRunning && !breakTimer.isRunning) {
      soundEngine.pause();
    } else if (!isMusicEnabled || selectedMusic.id === 'none') {
      soundEngine.stop();
    }
  }, [isMusicEnabled, selectedMusic, timer.isRunning, breakTimer.isRunning]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      soundEngine.stop();
    };
  }, []);

  // Frame animation loop for break nature creatures
  useEffect(() => {
    if (sessionState !== 'on_break') return;
    let animId: number;
    const tick = () => {
      setFrame(f => (f + 1) % 10000);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [sessionState]);

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
      setBirds(prev => {
        if (prev.length < 3 && Math.random() > 0.8) {
          const side = Math.random() > 0.5 ? -10 : 110;
          return [
            ...prev,
            {
              id: Math.random().toString(36).substr(2, 5),
              type: Math.random() > 0.5 ? 'blue' : 'red',
              x: side,
              y: 40 + Math.random() * 40,
              targetX: 20 + Math.random() * 60,
              targetY: 70 + Math.random() * 10,
              perched: false,
              spawnedAt: Date.now()
            }
          ];
        }
        return prev.map(b => {
          let nx = b.x;
          let ny = b.y;
          let np = b.perched;
          const dx = b.targetX - b.x;
          const dy = b.targetY - b.y;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            nx += dx * 0.06;
            ny += dy * 0.06;
          } else {
            np = true;
          }
          return { ...b, x: nx, y: ny, perched: np };
        });
      });
    }, 100);
    return () => clearInterval(interval);
  }, [sessionState]);

  const startBreak = () => {
    setSessionState('on_break');
    breakTimer.reset();
    breakTimer.start();
    if (isMusicEnabled && selectedMusic.id !== 'none') {
      soundEngine.playTrack(selectedMusic.id);
    }
  };

  const createLogEntry = (durationMinutes: number, completed: boolean): FocusSessionLog => ({
    id: 'log_' + Math.random().toString(36).substr(2, 9),
    goalId: goal?.id,
    goalName: goal?.name || (focusMode === 'groove' ? 'Groove Session' : 'Pomodoro Session'),
    treeType: goal?.type || TreeType.PINE,
    mode: focusMode,
    startedAt: startTimestampRef.current,
    endedAt: Date.now(),
    durationMinutes,
    completed
  });

  const handleFinishSession = (isComplete: boolean) => {
    soundEngine.stop();
    const totalMinutesSpent = sessionState === 'active'
      ? Math.floor(timer.elapsedSeconds / 60)
      : accruedMins;

    const finalMinutes = Math.max(0, totalMinutesSpent);
    const log = createLogEntry(finalMinutes, isComplete);
    onFinish(finalMinutes, isComplete, log);
  };

  const handleGrooveEndRitual = () => {
    timer.pause();
    soundEngine.pause();
    const elapsedMinutes = Math.floor(timer.elapsedSeconds / 60);
    const finalMinutes = Math.max(1, elapsedMinutes);
    setAccruedMins(finalMinutes);
    setSessionState('success');
  };

  const handleAutoSaveExit = () => {
    soundEngine.stop();
    const elapsedMinutes = Math.floor(timer.elapsedSeconds / 60);
    if (elapsedMinutes > 0) {
      const log = createLogEntry(elapsedMinutes, false);
      onFinish(elapsedMinutes, false, log);
    } else {
      onCancel();
    }
  };

  const handleToggleSound = () => {
    if (isMusicEnabled) {
      setIsMusicEnabled(false);
      soundEngine.stop();
    } else {
      setIsMusicEnabled(true);
      const track = selectedMusic.id === 'none' ? MUSIC_TRACKS[1] : selectedMusic;
      setSelectedMusic(track);
      if (timer.isRunning || breakTimer.isRunning) {
        soundEngine.playTrack(track.id);
      }
    }
  };

  const handleSelectTrack = (track: typeof MUSIC_TRACKS[0]) => {
    setSelectedMusic(track);
    if (track.id === 'none') {
      setIsMusicEnabled(false);
      soundEngine.stop();
    } else {
      setIsMusicEnabled(true);
      if (timer.isRunning || breakTimer.isRunning) {
        soundEngine.playTrack(track.id);
      }
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  const activeGoalForCanvas = goal || pomoDummyGoal;
  const currentElapsedSeconds = sessionState === 'on_break' ? breakTimer.elapsedSeconds : timer.elapsedSeconds;
  const currentElapsedMins = Math.floor(timer.elapsedSeconds / 60);

  // Success / Harvest Screen
  if (sessionState === 'success') {
    const isMatured = goal 
      ? (goal.accruedMinutes + accruedMins >= goal.totalTargetMinutes)
      : true;

    return (
      <div className="fixed inset-0 bg-[#040a04] z-[200] flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in fade-in duration-500 overflow-y-auto pb-safe">
        <div className="space-y-6 w-full max-w-xs sm:max-w-sm flex flex-col items-center my-auto">
          <div className="w-14 h-14 bg-green-950/50 border-2 border-green-500/60 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="text-green-400">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" />
            </svg>
          </div>
          <div className="space-y-1">
            <span className="inline-block pixel-font text-[8px] sm:text-[9px] text-green-400 uppercase tracking-widest px-2.5 py-1 bg-green-950/60 border border-green-800/60">
              {isMatured ? 'FLORA HARVESTED' : 'RITUAL SYNTHESIZED'}
            </span>
            <h1 className="pixel-font text-base sm:text-lg md:text-xl text-white uppercase tracking-[0.2em] pt-1">
              {isMatured ? 'HARVEST COMPLETE' : 'RITUAL COMPLETE'}
            </h1>
            <p className="pixel-font text-[9px] text-green-300 uppercase tracking-widest mt-1 font-bold">
              {isMatured 
                ? `Flora Matured to 100% (+${accruedMins}M Focused)` 
                : `Growth Synthesized: +${accruedMins}M`}
            </p>
          </div>
          <div className="bg-[#0a160a] border-2 border-green-500/40 w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center relative shadow-[0_0_30px_rgba(34,197,94,0.2)] overflow-hidden p-2">
            <SaplingCanvas
              goal={activeGoalForCanvas}
              size={220}
              overrideAccruedMinutes={activeGoalForCanvas.accruedMinutes + accruedMins}
            />
          </div>
          <PixelButton
            onClick={() => handleFinishSession(isMatured)}
            variant="success"
            className="w-full py-4 text-[10px] sm:text-[11px] tracking-widest mt-2 h-12 shadow-lg"
          >
            {isMatured ? 'HARVEST & RETURN TO GROVE' : 'RETURN TO THE GROVE'}
          </PixelButton>
        </div>
      </div>
    );
  }

  // Break Choice Screen (Chronos only)
  if (sessionState === 'break_choice') {
    return (
      <div className="fixed inset-0 bg-[#040a04] z-[200] flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in fade-in duration-300 overflow-y-auto pb-safe">
        <div className="space-y-6 w-full max-w-xs sm:max-w-sm my-auto">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-14 h-14 bg-green-950/30 border-2 border-green-500/30 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z M6 1v3 M10 1v3 M14 1v3" />
              </svg>
            </div>
            <h1 className="pixel-font text-sm sm:text-base text-white uppercase tracking-wider">Ritual Peak</h1>
            <p className="pixel-font text-[9px] text-green-400 uppercase tracking-widest font-bold">
              Time Synthesized: +{accruedMins}M
            </p>
          </div>

          <div className="bg-[#0a160a] p-5 border border-green-950/40 space-y-4">
            <p className="pixel-font text-[8px] text-green-500 uppercase tracking-widest text-center font-bold">
              Sanctuary Interval
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map(d => (
                <button
                  key={d}
                  onClick={() => setBreakDuration(d)}
                  className={`py-3 pixel-font text-[9px] border-2 transition-all flex items-center justify-center min-h-[44px] ${
                    breakDuration === d
                      ? 'bg-green-600 border-green-400 text-black shadow-md font-bold'
                      : 'bg-[#050c05] border-green-900/40 text-green-500 hover:border-green-600'
                  }`}
                >
                  {d}M
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <PixelButton onClick={startBreak} variant="success" className="w-full py-4 text-[10px] tracking-wider h-12">
              START SANCTUARY BREAK
            </PixelButton>
            <button
              onClick={() => setSessionState('success')}
              className="w-full py-3 pixel-font text-[9px] text-green-600 hover:text-green-400 uppercase tracking-widest underline underline-offset-4 min-h-[44px]"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isChronos = focusMode === 'chronos';
  const displayTimerSeconds = sessionState === 'on_break' ? breakTimer.displaySeconds : timer.displaySeconds;
  const isTimerRunning = sessionState === 'on_break' ? breakTimer.isRunning : timer.isRunning;
  const timerProgress = sessionState === 'on_break' ? breakTimer.progress : timer.progress;

  return (
    <div className="fixed inset-0 bg-[#040a04] z-[100] flex flex-col justify-between p-3 sm:p-5 md:p-6 text-center animate-in fade-in duration-500 overflow-hidden select-none pb-safe pt-safe">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none hud-grid" />

      {/* HEADER HUD */}
      <div className="w-full max-w-md mx-auto pt-1 sm:pt-2 z-10 shrink-0">
        <div className="flex justify-between items-center px-2 py-2 border-b border-green-900/30">
          <div className="text-left">
            <h2 className="pixel-font text-[9px] sm:text-[10px] text-green-400 uppercase tracking-wider font-bold truncate max-w-[160px] sm:max-w-[200px]">
              {sessionState === 'on_break'
                ? 'SANCTUARY'
                : goal
                ? goal.name
                : isChronos
                ? 'CHRONOS RITUAL'
                : 'GROOVE RITUAL'}
            </h2>
            <div className={`pixel-font text-[7px] mt-0.5 ${sessionState === 'on_break' ? 'text-blue-400' : 'text-green-400'}`}>
              {sessionState === 'on_break'
                ? '• REST INTERVAL'
                : isChronos
                ? `• +${currentElapsedMins}M FOCUS`
                : '• FREE-FORM GROWTH'}
            </div>
          </div>
          <div className="text-right">
            <div className="pixel-font text-[6px] text-green-500 uppercase tracking-widest font-bold">
              {isChronos ? 'TARGET' : 'MODE'}
            </div>
            <div className="pixel-font text-[10px] sm:text-xs text-green-300 font-bold">
              {isChronos ? formatTime(targetDurationSeconds) : 'GROOVE'}
            </div>
          </div>
        </div>
      </div>

      {/* RITUAL VIEWPORT — Comfortable Internal Padding & Spacing */}
      <div className="relative w-full max-w-[250px] xs:max-w-[280px] sm:max-w-[320px] md:max-w-[340px] max-h-[38vh] sm:max-h-none aspect-square mx-auto border-2 border-green-950/60 bg-[#061206]/70 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden my-auto shrink-0 p-2.5 xs:p-3 sm:p-5">
        {/* Subtle Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <span className="pixel-font text-xs uppercase tracking-[2em] text-green-500">
            {sessionState === 'on_break' ? 'REST' : isChronos ? 'CHRONOS' : 'GROOVE'}
          </span>
        </div>

        {/* Corner Bracket Details */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-green-500/40 pointer-events-none" />
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-green-500/40 pointer-events-none" />

        {/* Nature details during Break mode */}
        {sessionState === 'on_break' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <Butterfly key={i} frame={frame + i * 120} />
            ))}
          </div>
        )}

        {/* Birds during break */}
        {sessionState === 'on_break' && birds.map(bird => (
          <PixelBird key={bird.id} data={bird} frame={frame} />
        ))}

        {/* Visual Content: Timer Circle with Breathing Room */}
        <div className="w-full h-full flex flex-col items-center justify-center z-10 relative">
          {visualMode === 'clock' && isChronos && sessionState !== 'on_break' ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Circular SVG Timer: viewBox 120 120, radius 46, circumference 289.03 */}
              <svg viewBox="0 0 120 120" className="w-[78%] h-[78%] sm:w-[80%] sm:h-[80%] transform -rotate-90 drop-shadow-[0_0_15px_rgba(34,197,94,0.25)]">
                <circle cx="60" cy="60" r="46" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-green-950/50" />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  stroke="currentColor"
                  strokeWidth="5.5"
                  fill="transparent"
                  strokeDasharray="289.03"
                  strokeDashoffset={`${289.03 * (1 - timerProgress)}`}
                  strokeLinecap="round"
                  className="text-green-400 shadow-[0_0_20px_#22c55e] transition-all duration-300"
                />
              </svg>
              {/* Centered Timer HUD */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <h2 className="pixel-font text-3xl xs:text-4xl sm:text-5xl text-white select-none tracking-tighter leading-none shadow-md">
                  {formatTime(displayTimerSeconds)}
                </h2>
                <span className="pixel-font text-[7px] sm:text-[8px] text-green-400 uppercase mt-2.5 sm:mt-3 tracking-wider font-bold">
                  {isTimerRunning ? 'Active' : 'Paused'}
                </span>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-between py-1">
              {/* Top HUD Badge for Timer */}
              <div className="z-20 px-3 py-1 bg-[#050c05]/95 border border-green-800/70 pixel-corners shadow-md flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isTimerRunning ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`} />
                <span className="pixel-font text-base sm:text-lg text-white tracking-tight">
                  {formatTime(displayTimerSeconds)}
                </span>
              </div>

              {/* Tree Canvas in Tree / Groove Mode */}
              <div className="relative flex-1 flex items-center justify-center w-full my-auto overflow-hidden">
                <SaplingCanvas
                  goal={activeGoalForCanvas}
                  size={200}
                  overrideAccruedMinutes={activeGoalForCanvas.accruedMinutes + currentElapsedSeconds / 60}
                />
              </div>

              {/* Bottom Tree Growth Status */}
              <div className="z-20 text-center">
                <span className="pixel-font text-[7.5px] sm:text-[8px] text-green-400 uppercase tracking-widest font-bold">
                  {sessionState === 'on_break'
                    ? 'SANCTUARY REST'
                    : goal
                    ? `${goal.type} Growth`
                    : isChronos
                    ? 'Chronos Growth'
                    : 'Groove Growth'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONTROLS & ENHANCED MOTIVATIONAL QUOTE */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-3 sm:space-y-4 z-10 shrink-0 pb-1">
        {/* Readable Motivational Quote / Reminder */}
        <div className="min-h-[44px] sm:min-h-[52px] flex items-center justify-center px-4 py-1 max-w-sm sm:max-w-md mx-auto text-center">
          <p className="text-green-300 text-sm xs:text-base sm:text-lg font-serif italic text-center font-normal tracking-wide leading-snug drop-shadow-sm">
            "{sessionState === 'on_break' ? BREAK_REMINDERS[breakReminderIdx] : quote}"
          </p>
        </div>

        {/* Action Controls */}
        <div className="w-full flex justify-between items-center gap-1.5 xs:gap-2 sm:gap-3 px-1 xs:px-2">
          {/* Sound / Music Toggle Button */}
          <button
            onClick={handleToggleSound}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowSettings(true);
            }}
            className={`w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12 border-2 transition-all bg-[#0a160a] pixel-corners flex items-center justify-center shrink-0 shadow-md ${
              isMusicEnabled && selectedMusic.id !== 'none'
                ? 'border-green-400 text-green-300 bg-green-950/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                : 'border-green-900/60 text-green-600 hover:border-green-700'
            }`}
            aria-label={isMusicEnabled ? `Ambient Audio: ${selectedMusic.name}` : "Sound Muted"}
            title="Click to toggle sound, or open sound settings"
          >
            <svg width="18" height="18" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
              {isMusicEnabled && selectedMusic.id !== 'none' ? (
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              ) : (
                <path d="M4.27 3L3 4.27l9 9v.28c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-1.73l4.27 4.27L20.27 21 21.54 19.73 4.27 3zM14 7h4V3h-6v5.18l2 2V7z" />
              )}
            </svg>
          </button>

          {/* Sound Settings Gear Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-10 xs:w-9 xs:h-11 sm:w-10 sm:h-12 border-2 border-green-900/50 bg-[#061206] text-green-400 hover:border-green-600 hover:text-green-200 transition-all pixel-corners flex items-center justify-center shrink-0 shadow-md text-xs pixel-font"
            aria-label="Select ambient soundscape"
            title="Select soundscape"
          >
            ♫
          </button>

          {/* Primary COMMENCE / HALT Button */}
          {sessionState === 'on_break' ? (
            <PixelButton
              variant={breakTimer.isRunning ? 'secondary' : 'primary'}
              onClick={() => {
                if (breakTimer.isRunning) {
                  breakTimer.pause();
                } else {
                  breakTimer.resume();
                }
              }}
              className="flex-1 py-2.5 xs:py-3 sm:py-3.5 text-[9px] xs:text-[10px] sm:text-[11px] tracking-[0.15em] xs:tracking-[0.25em] h-10 xs:h-11 sm:h-12 shadow-lg"
            >
              {breakTimer.isRunning ? 'PAUSE REST' : 'RESUME REST'}
            </PixelButton>
          ) : isChronos ? (
            <PixelButton
              variant={timer.isRunning ? 'secondary' : 'primary'}
              onClick={() => {
                if (timer.isRunning) {
                  timer.pause();
                } else {
                  if (timer.isComplete) {
                    timer.reset();
                    timer.start();
                  } else {
                    timer.resume();
                  }
                }
              }}
              className="flex-1 py-2.5 xs:py-3 sm:py-3.5 text-[9px] xs:text-[10px] sm:text-[11px] tracking-[0.15em] xs:tracking-[0.25em] h-10 xs:h-11 sm:h-12 shadow-lg"
            >
              {timer.isRunning ? 'HALT' : 'COMMENCE'}
            </PixelButton>
          ) : (
            <div className="flex-1 flex gap-1.5 xs:gap-2">
              <PixelButton
                variant={timer.isRunning ? 'secondary' : 'primary'}
                onClick={() => {
                  if (timer.isRunning) {
                    timer.pause();
                  } else {
                    if (timer.isComplete) {
                      timer.reset();
                      timer.start();
                    } else {
                      timer.resume();
                    }
                  }
                }}
                className="flex-1 py-2.5 xs:py-3 text-[8.5px] xs:text-[9px] sm:text-[10px] tracking-[0.15em] xs:tracking-[0.2em] h-10 xs:h-11 sm:h-12 shadow-lg"
              >
                {timer.isRunning ? 'PAUSE' : 'GROW'}
              </PixelButton>
              <PixelButton
                variant="success"
                onClick={handleGrooveEndRitual}
                className="flex-1 py-2.5 xs:py-3 text-[8.5px] xs:text-[9px] sm:text-[10px] tracking-[0.15em] xs:tracking-[0.2em] h-10 xs:h-11 sm:h-12 shadow-lg whitespace-nowrap"
              >
                HARVEST
              </PixelButton>
            </div>
          )}

          {/* Exit Button */}
          <button
            onClick={handleAutoSaveExit}
            className="w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12 border-2 border-green-950 bg-[#0a160a] text-green-500 hover:text-red-400 hover:border-red-900/60 transition-all pixel-corners flex items-center justify-center shrink-0 shadow-md"
            aria-label="Exit Session"
          >
            <svg width="18" height="18" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Music Selector Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#040a04]/95 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xs bg-[#0a160a] border-2 border-green-950/80 p-5 sm:p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5 border-b border-green-900/40 pb-3">
              <h3 className="pixel-font text-[9px] text-green-300 uppercase tracking-widest font-bold">
                Ambient Soundscape
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-green-400 text-2xl leading-none hover:text-green-200 transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              {MUSIC_TRACKS.map(track => {
                const isSelected = selectedMusic.id === track.id && (track.id === 'none' ? !isMusicEnabled : isMusicEnabled);
                return (
                  <button
                    key={track.id}
                    onClick={() => handleSelectTrack(track)}
                    className={`text-[9px] pixel-font w-full p-3 text-left border-2 transition-all flex items-center justify-between min-h-[44px] ${
                      isSelected
                        ? 'border-green-400 bg-green-950/50 text-green-200 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
                        : 'border-green-950/60 bg-[#050c05] text-green-400/80 hover:border-green-700 hover:text-green-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{track.name}</div>
                      <div className="text-[7px] text-green-500/70 font-sans mt-0.5">{track.desc}</div>
                    </div>
                    {isSelected && (
                      <span className="text-green-400 font-bold text-[8px] border border-green-500 px-1.5 py-0.5">
                        ACTIVE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <PixelButton onClick={() => setShowSettings(false)} className="w-full mt-5 py-3 text-[9px] h-11" variant="success">
              CONFIRM
            </PixelButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusSession;
