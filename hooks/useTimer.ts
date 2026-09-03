import { useState, useEffect, useRef, useCallback } from 'react';

export interface TimerState {
  displaySeconds: number;
  elapsedSeconds: number;
  isRunning: boolean;
  isComplete: boolean;
  progress: number; // 0..1 for Chronos (1 = full, 0 = done), ignored for Groove
}

interface TimerOptions {
  mode: 'chronos' | 'groove';
  targetSeconds?: number; // Required for chronos
  onComplete?: () => void;
}

interface TimerControls extends TimerState {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  getElapsedMinutes: () => number;
}

/**
 * Timestamp-based timer hook.
 * Source of truth is wall-clock timestamps, NOT decremented state.
 * Resistant to tab switching, browser throttling, and mobile backgrounding.
 * UI updates every ~250ms to balance accuracy and performance.
 */
export function useTimer({ mode, targetSeconds, onComplete }: TimerOptions): TimerControls {
  const initialTargetSeconds = targetSeconds ?? (mode === 'chronos' ? 25 * 60 : undefined);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [displaySeconds, setDisplaySeconds] = useState(
    mode === 'chronos' ? (initialTargetSeconds ?? 25 * 60) : 0
  );

  // Timestamp refs — authoritative source of truth
  const startTimeRef = useRef<number | null>(null);
  const pausedElapsedRef = useRef(0); // Accumulated elapsed time before current run
  const targetSecondsRef = useRef<number | undefined>(initialTargetSeconds);
  const onCompleteRef = useRef(onComplete);
  const modeRef = useRef(mode);

  // Keep refs in sync with props
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    targetSecondsRef.current = targetSeconds ?? (mode === 'chronos' ? 25 * 60 : undefined);
  }, [targetSeconds, mode]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Calculate current elapsed seconds from timestamps
  const getElapsed = useCallback((): number => {
    if (!startTimeRef.current) return pausedElapsedRef.current;
    const sinceStart = (Date.now() - startTimeRef.current) / 1000;
    return pausedElapsedRef.current + sinceStart;
  }, []);

  // UI update interval — runs every 250ms when timer is active
  useEffect(() => {
    if (!isRunning || isComplete) return;

    const updateDisplay = () => {
      const elapsed = getElapsed();

      if (modeRef.current === 'chronos') {
        const target = targetSecondsRef.current ?? (25 * 60);
        const remaining = Math.max(0, target - elapsed);
        setDisplaySeconds(Math.ceil(remaining));

        if (remaining <= 0) {
          setIsRunning(false);
          setIsComplete(true);
          setDisplaySeconds(0);
          startTimeRef.current = null;
          pausedElapsedRef.current = target;
          onCompleteRef.current?.();
          return;
        }
      } else {
        // Groove: count up until target deadline (if defined) or open-ended
        const target = targetSecondsRef.current;
        if (target && target > 0 && elapsed >= target) {
          setIsRunning(false);
          setIsComplete(true);
          setDisplaySeconds(Math.floor(target));
          startTimeRef.current = null;
          pausedElapsedRef.current = target;
          onCompleteRef.current?.();
          return;
        }

        setDisplaySeconds(Math.floor(elapsed));
      }
    };

    // Update immediately on start
    updateDisplay();

    const interval = setInterval(updateDisplay, 250);
    return () => clearInterval(interval);
  }, [isRunning, isComplete, getElapsed]);

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    pausedElapsedRef.current = 0;
    setIsComplete(false);
    setIsRunning(true);
    if (modeRef.current === 'chronos') {
      setDisplaySeconds(targetSecondsRef.current ?? 25 * 60);
    } else {
      setDisplaySeconds(0);
    }
  }, []);

  const pause = useCallback(() => {
    if (!isRunning || !startTimeRef.current) return;
    // Accumulate elapsed time and clear start
    pausedElapsedRef.current = getElapsed();
    startTimeRef.current = null;
    setIsRunning(false);
  }, [isRunning, getElapsed]);

  const resume = useCallback(() => {
    if (isRunning || isComplete) return;
    startTimeRef.current = Date.now();
    setIsRunning(true);
  }, [isRunning, isComplete]);

  const reset = useCallback(() => {
    startTimeRef.current = null;
    pausedElapsedRef.current = 0;
    setIsRunning(false);
    setIsComplete(false);
    if (modeRef.current === 'chronos') {
      setDisplaySeconds(targetSecondsRef.current ?? 25 * 60);
    } else {
      setDisplaySeconds(0);
    }
  }, []);

  const getElapsedMinutes = useCallback((): number => {
    return Math.floor(getElapsed() / 60);
  }, [getElapsed]);

  // Progress for Chronos ring visualization
  const elapsedSeconds = getElapsed();
  const effectiveTarget = targetSeconds ?? 25 * 60;
  const progress = mode === 'chronos'
    ? Math.max(0, Math.min(1, 1 - (elapsedSeconds / effectiveTarget)))
    : 0;

  return {
    displaySeconds,
    elapsedSeconds: Math.floor(elapsedSeconds),
    isRunning,
    isComplete,
    progress,
    start,
    pause,
    resume,
    reset,
    getElapsedMinutes,
  };
}
