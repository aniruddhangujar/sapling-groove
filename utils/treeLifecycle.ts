import { SaplingGoal, TreeType, TimelineType, FocusSessionLog } from '../types';

export enum TreeVitality {
  THRIVING = 'Thriving',
  HEALTHY = 'Healthy',
  WILTING = 'Wilting',
  SEVERELY_WILTED = 'Severely Wilted'
}

export interface GoalVitalityReport {
  vitality: TreeVitality;
  health: number; // 0 - 100 score
  isWilting: boolean; // health < 40
  isSeverelyWilted: boolean; // health < 25
  isRecovering: boolean; // recently active while rebuilding vitality
  growthPct: number; // 0 - 100 cumulative progress toward intention
  growthStage: 'Seed' | 'Sprout' | 'Sapling' | 'Mature';
  expectedRecentMinutes: number;
  actualRecentMinutes: number;
  recentAdherence: number;
  daysSinceLastFocus?: number;
  poeticStatus: string;
}

// Development-only deterministic time simulation mechanism (Constraint 12)
let simulatedTimeOverride: number | null = null;

export function getNow(): number {
  return simulatedTimeOverride !== null ? simulatedTimeOverride : Date.now();
}

export function setTimeOverride(ms: number | null): void {
  simulatedTimeOverride = ms;
}

/**
 * Returns the cadence in days for the given timeline type.
 * In Sapling Groove, the cadence reflects the expected return rhythm of practice:
 * - DAY: 1 day (daily rhythm, expected every 1-2 days)
 * - WEEK: 2.5 days (accommodates 2-3 day weekend breaks)
 * - MONTH: 3.5 days (semi-weekly practice across the month)
 * - YEAR: 5 days (regular weekly practice for multi-month/year horizons)
 */
export function getCadenceDays(timeline: TimelineType): number {
  switch (timeline) {
    case TimelineType.WEEK:
      return 2.5;
    case TimelineType.MONTH:
      return 3.5;
    case TimelineType.YEAR:
      return 5;
    case TimelineType.DAY:
    default:
      return 1;
  }
}

/**
 * Returns the rolling evaluation window in days for assessing recent adherence.
 * Vitality reflects CURRENT tending of the intention, not cumulative history.
 * - DAY: 3 days rolling window
 * - WEEK: 7 days rolling window (the full week's pacing)
 * - MONTH: 10 days rolling window
 * - YEAR: 14 days rolling window
 */
export function getEvaluationWindowDays(timeline: TimelineType, elapsedDaysSinceStart: number): number {
  let maxWindow: number;
  switch (timeline) {
    case TimelineType.YEAR:
      maxWindow = 14;
      break;
    case TimelineType.MONTH:
      maxWindow = 10;
      break;
    case TimelineType.WEEK:
      maxWindow = 7;
      break;
    case TimelineType.DAY:
    default:
      maxWindow = 3;
      break;
  }
  return Math.min(Math.max(2, Math.floor(elapsedDaysSinceStart)), maxWindow);
}

/**
 * Calculates cumulative growth percentage (0 to 100) from permanent accrued work.
 * Neglect NEVER reduces or resets cumulative growth.
 */
export function calculateCumulativeGrowth(accruedMinutes: number, totalTargetMinutes: number): number {
  const target = Math.max(1, totalTargetMinutes);
  const ratio = Math.min(1.0, Math.max(0.0, accruedMinutes / target));
  return Math.round(ratio * 100);
}

/**
 * Derives growth stage strictly from cumulative progress.
 */
export function calculateGrowthStage(growthPct: number): 'Seed' | 'Sprout' | 'Sapling' | 'Mature' {
  if (growthPct >= 85) return 'Mature';
  if (growthPct >= 50) return 'Sapling';
  if (growthPct >= 25) return 'Sprout';
  return 'Seed';
}

/**
 * Single Authoritative Source of Truth: calculates vitality by evaluating
 * EXPECTED RECENT WORK vs. ACTUAL RECENT WORK aligned with the planted intention,
 * modulated by RECENCY of practice.
 *
 * Invariant: Completed trees (isComplete === true) in the Permanent Canopy NEVER wilt.
 */
export function calculateGoalVitality(
  goal: SaplingGoal,
  nowMs = getNow(),
  logs: FocusSessionLog[] = []
): GoalVitalityReport {
  const growthPct = calculateCumulativeGrowth(goal.accruedMinutes, goal.totalTargetMinutes);
  const growthStage = calculateGrowthStage(growthPct);

  // 1. Permanent Canopy Protection (Constraint 10 & Correction 3)
  // If explicitly completed/harvested, it is immortal and immune to inactivity
  if (goal.isComplete) {
    const daysSince = goal.lastFocusDate
      ? Math.max(0, (nowMs - goal.lastFocusDate) / (1000 * 60 * 60 * 24))
      : undefined;

    return {
      vitality: TreeVitality.THRIVING,
      health: 100,
      isWilting: false,
      isSeverelyWilted: false,
      isRecovering: false,
      growthPct: 100,
      growthStage: 'Mature',
      expectedRecentMinutes: 0,
      actualRecentMinutes: 0,
      recentAdherence: 1.0,
      daysSinceLastFocus: daysSince !== undefined ? Math.floor(daysSince) : undefined,
      poeticStatus: 'Eternal Canopy • Matured & Immortalized'
    };
  }

  const cadenceDays = getCadenceDays(goal.timeline);
  const referenceStart = goal.startDate || nowMs;
  const elapsedDaysSinceStart = Math.max(0, (nowMs - referenceStart) / (1000 * 60 * 60 * 24));

  // 2. Freshly planted seed at t=0 (Correction 6)
  // When newly planted, no expectations have been missed yet.
  if (elapsedDaysSinceStart < 0.2 && !goal.lastFocusDate && goal.accruedMinutes === 0) {
    return {
      vitality: TreeVitality.THRIVING,
      health: 100,
      isWilting: false,
      isSeverelyWilted: false,
      isRecovering: false,
      growthPct: 0,
      growthStage: 'Seed',
      expectedRecentMinutes: 0,
      actualRecentMinutes: 0,
      recentAdherence: 1.0,
      daysSinceLastFocus: undefined,
      poeticStatus: 'Fresh Seedling • Soil Ready for Intention'
    };
  }

  // 3. Sliding Recent Evaluation Window (Correction 2: Recent Adherence, NOT cumulative)
  // Evaluates rolling intention window: 3 days (DAY), 7 days (WEEK), 10 days (MONTH), 14 days (YEAR)
  const windowDays = getEvaluationWindowDays(goal.timeline, elapsedDaysSinceStart);
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const windowStartMs = nowMs - windowMs;

  const dailyTarget = goal.dailyTargetMinutes > 0 
    ? goal.dailyTargetMinutes 
    : Math.max(15, Math.round(goal.totalTargetMinutes / Math.max(1, goal.durationInDays)));
  const expectedRecentMinutes = windowDays * dailyTarget;

  // Compute actual work completed in this recent window from logs
  let actualRecentMinutes = 0;
  const goalLogs = logs.filter(l => l.goalId === goal.id);

  if (goalLogs.length > 0) {
    actualRecentMinutes = goalLogs
      .filter(l => l.startedAt >= windowStartMs && l.durationMinutes > 0)
      .reduce((sum, l) => sum + l.durationMinutes, 0);
  } else if (goal.lastFocusDate) {
    // If explicit logs are not passed, estimate recent work from last session recency
    const elapsedSinceLast = (nowMs - goal.lastFocusDate) / (1000 * 60 * 60 * 24);
    if (elapsedSinceLast <= cadenceDays * 1.2) {
      const cadenceFactor = Math.max(0.7, 1 - (elapsedSinceLast / (cadenceDays * 1.5)) * 0.3);
      actualRecentMinutes = expectedRecentMinutes * cadenceFactor;
    }
  }

  // Recent adherence ratio: how faithfully recent sessions met the intention's expected pace
  const recentAdherence = expectedRecentMinutes > 0
    ? Math.min(1.2, actualRecentMinutes / expectedRecentMinutes)
    : 1.0;

  // 4. Recency of Practice (Inactivity decay)
  const lastActiveTimestamp = goal.lastFocusDate ?? goal.startDate;
  const inactiveDays = Math.max(0, (nowMs - lastActiveTimestamp) / (1000 * 60 * 60 * 24));
  const gracePeriodDays = cadenceDays * 1.5;

  let recencyScore = 1.0;
  if (inactiveDays > gracePeriodDays) {
    const unattendedIntervals = (inactiveDays - gracePeriodDays) / cadenceDays;
    // Exponential decay per unattended cadence interval down to a safe floor of 0.15
    recencyScore = Math.max(0.15, Math.exp(-0.45 * unattendedIntervals));
  }

  // 5. Dynamic Health Score (0 - 100)
  // Combines Recent Adherence (55%) and Recency (45%)
  const vitalityRatio = (recentAdherence * 0.55) + (recencyScore * 0.45);
  // Clamp between 15% floor (never 0, never dead, never deleted) and 100%
  const health = Math.round(Math.max(15, Math.min(100, vitalityRatio * 100)));

  // 6. Primary Vitality Classification (Correction 5)
  let vitality: TreeVitality;
  if (health >= 85) {
    vitality = TreeVitality.THRIVING;
  } else if (health >= 70) {
    vitality = TreeVitality.HEALTHY;
  } else if (health >= 35) {
    vitality = TreeVitality.WILTING;
  } else {
    vitality = TreeVitality.SEVERELY_WILTED;
  }

  const isWilting = vitality === TreeVitality.WILTING || vitality === TreeVitality.SEVERELY_WILTED;
  const isSeverelyWilted = vitality === TreeVitality.SEVERELY_WILTED;

  // 7. Recovery Modifier (Correction 5: isRecovering is a modifier, not a primary state)
  // A tree is recovering if its health is below healthy (< 70) but the user returned within recent cadence
  const isRecovering = health < 70 && goal.lastFocusDate !== undefined && inactiveDays <= (cadenceDays * 1.2);

  // Poetic, non-punitive narrative messaging (Constraint 15)
  let poeticStatus = 'Grove in Harmony • Intention Sustained';
  if (isRecovering) {
    poeticStatus = 'Reviving Soil • Practice Resumed';
  } else if (isSeverelyWilted) {
    poeticStatus = 'Grove Has Been Waiting • Return to Practice';
  } else if (isWilting) {
    poeticStatus = 'Leaves Wilting • Practice Awaiting Attention';
  } else if (vitality === TreeVitality.THRIVING) {
    poeticStatus = 'Deep Roots • Vigorous Botanical Growth';
  }

  return {
    vitality,
    health,
    isWilting,
    isSeverelyWilted,
    isRecovering,
    growthPct,
    growthStage,
    expectedRecentMinutes,
    actualRecentMinutes,
    recentAdherence,
    daysSinceLastFocus: Math.floor(inactiveDays),
    poeticStatus
  };
}

/**
 * Handles completing a session: increments cumulative growth, records lastFocusDate,
 * and handles transition to Permanent Canopy if matured.
 * Does NOT add arbitrary +15 points; health is re-derived continuously from updated state.
 */
export function applySessionUpdate(
  goal: SaplingGoal,
  sessionMinutes: number,
  isExplicitComplete = false,
  nowMs = getNow()
): SaplingGoal {
  const newAccrued = goal.accruedMinutes + sessionMinutes;
  const isMatured = isExplicitComplete || newAccrued >= goal.totalTargetMinutes;

  return {
    ...goal,
    accruedMinutes: newAccrued,
    lastFocusDate: nowMs,
    isComplete: isMatured,
    // Store latest derived health for backward compatibility, but runtime derives dynamically
    health: isMatured ? 100 : calculateGoalVitality({
      ...goal,
      accruedMinutes: newAccrued,
      lastFocusDate: nowMs
    }, nowMs).health
  };
}
