import { UserProfile, FocusSessionLog, SaplingGoal, TreeType } from '../types';
import { calculateGoalVitality, GoalVitalityReport, TreeVitality } from './treeLifecycle';

export type TimeRange = '7d' | '30d' | '90d' | 'all';

export interface OverviewMetrics {
  totalFocusMinutes: number;
  totalSessions: number;
  activeIntentionsCount: number;
  growingTreesCount: number;
  eternalCanopyCount: number;
  avgSessionMinutes: number;
  longestSessionMinutes: number;
  activeDaysCount: number;
}

export interface DayRhythmPoint {
  dateKey: string; // YYYY-MM-DD
  label: string;   // e.g. "SEP 12"
  dayOfWeek: string; // "Mon", "Tue"
  minutes: number;
  sessionCount: number;
  isToday: boolean;
  heightPct: number; // 0 - 100 relative to max day
}

export interface FocusRhythmData {
  days: DayRhythmPoint[];
  maxDayMinutes: number;
  activeDaysCount: number;
  totalDays: number;
  consistencyPct: number;
}

export interface AttentionFieldCell {
  dateKey: string;
  displayDate: string;
  dayOfWeek: number; // 0=Sun, 6=Sat
  minutes: number;
  sessionCount: number;
  level: 0 | 1 | 2 | 3 | 4;
  ariaLabel: string;
  isToday: boolean;
}

export interface SessionPatternsData {
  mostActiveDay: string | null;
  mostActivePeriod: string | null;
  avgSessionMinutes: number;
  longestSession: {
    minutes: number;
    dateLabel: string;
    goalName?: string;
  } | null;
  totalSessions: number;
}

export interface IntentionSummary {
  goal: SaplingGoal;
  vitalityReport: GoalVitalityReport;
  lastTendedText: string;
  remainingMinutes: number;
  projectedDaysLeft?: number;
}

/**
 * Filter session logs by selected time range relative to reference timestamp.
 */
export function filterLogsByRange(
  logs: FocusSessionLog[],
  range: TimeRange,
  now: number = Date.now()
): FocusSessionLog[] {
  if (!logs || !Array.isArray(logs)) return [];

  // Filter out corrupted, zero-duration, or unrealistic future records
  const valid = logs.filter(l => 
    typeof l.durationMinutes === 'number' && 
    l.durationMinutes > 0 && 
    typeof l.startedAt === 'number' && 
    l.startedAt <= now + 60000 // 1 min clock skew tolerance
  );

  if (range === 'all') {
    return [...valid].sort((a, b) => b.startedAt - a.startedAt);
  }

  const rangeDays = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const cutoff = now - rangeDays * 86400000;

  return valid
    .filter(l => l.startedAt >= cutoff)
    .sort((a, b) => b.startedAt - a.startedAt);
}

/**
 * Computes high-level overview metrics across the active range.
 */
export function calculateOverviewMetrics(
  profile: UserProfile,
  range: TimeRange,
  now: number = Date.now()
): OverviewMetrics {
  const filteredLogs = filterLogsByRange(profile.logs || [], range, now);
  const totalFocusMinutes = filteredLogs.reduce((sum, l) => sum + l.durationMinutes, 0);
  const totalSessions = filteredLogs.length;

  const grove = profile.grove || [];
  const activeIntentions = grove.filter(g => !g.isComplete);
  const activeIntentionsCount = activeIntentions.length;
  const growingTreesCount = activeIntentions.filter(g => (g.accruedMinutes || 0) < (g.totalTargetMinutes || 1)).length;
  const eternalCanopyCount = grove.filter(g => g.isComplete).length;

  const avgSessionMinutes = totalSessions > 0 ? Math.round(totalFocusMinutes / totalSessions) : 0;
  const longestSessionMinutes = filteredLogs.reduce((max, l) => Math.max(max, l.durationMinutes), 0);

  // Count distinct active days in range
  const activeDaysSet = new Set<string>();
  filteredLogs.forEach(l => {
    const d = new Date(l.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    activeDaysSet.add(key);
  });

  return {
    totalFocusMinutes,
    totalSessions,
    activeIntentionsCount,
    growingTreesCount,
    eternalCanopyCount,
    avgSessionMinutes,
    longestSessionMinutes,
    activeDaysCount: activeDaysSet.size
  };
}

/**
 * Formats a timestamp into an abbreviated month label e.g. "SEP 12"
 */
function formatShortDate(d: Date): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Calculates daily focus rhythm for the selected range.
 */
export function calculateFocusRhythm(
  logs: FocusSessionLog[],
  range: TimeRange,
  now: number = Date.now()
): FocusRhythmData {
  const rangeDays = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const daysToShow = range === 'all' ? 30 : rangeDays;

  // Aggregate logs by YYYY-MM-DD
  const minutesByDate: Record<string, { minutes: number; count: number }> = {};
  const validLogs = filterLogsByRange(logs, range, now);

  validLogs.forEach(l => {
    const d = new Date(l.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!minutesByDate[key]) {
      minutesByDate[key] = { minutes: 0, count: 0 };
    }
    minutesByDate[key].minutes += l.durationMinutes;
    minutesByDate[key].count += 1;
  });

  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const nowDate = new Date(now);
  const nowKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}`;

  const days: DayRhythmPoint[] = [];

  for (let i = daysToShow - 1; i >= 0; i--) {
    const target = new Date(now - i * 86400000);
    const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    const data = minutesByDate[key] || { minutes: 0, count: 0 };

    days.push({
      dateKey: key,
      label: formatShortDate(target),
      dayOfWeek: weekDayNames[target.getDay()],
      minutes: data.minutes,
      sessionCount: data.count,
      isToday: key === nowKey,
      heightPct: 0 // Will compute after finding max
    });
  }

  const maxDayMinutes = Math.max(1, ...days.map(d => d.minutes));
  days.forEach(d => {
    d.heightPct = d.minutes > 0 ? Math.max(8, Math.round((d.minutes / maxDayMinutes) * 100)) : 0;
  });

  const activeDaysCount = days.filter(d => d.minutes > 0).length;
  const consistencyPct = days.length > 0 ? Math.round((activeDaysCount / days.length) * 100) : 0;

  return {
    days,
    maxDayMinutes,
    activeDaysCount,
    totalDays: days.length,
    consistencyPct
  };
}

/**
 * Calculates Attention Field (calendar heatmap matrix) with 5 intensity levels.
 */
export function calculateAttentionField(
  logs: FocusSessionLog[],
  range: TimeRange,
  now: number = Date.now()
): {
  weeks: AttentionFieldCell[][];
  activeDaysCount: number;
  totalRecordedMinutes: number;
} {
  // Calendar matrix: 5 weeks (35 days) for 7d/30d, 12 weeks for 90d/all
  const weeksCount = range === '90d' || range === 'all' ? 12 : 5;
  const totalDays = weeksCount * 7;

  // Aggregate logs
  const minutesByDate: Record<string, { minutes: number; count: number }> = {};
  const validLogs = filterLogsByRange(logs, 'all', now); // allow full context in calendar

  validLogs.forEach(l => {
    const d = new Date(l.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!minutesByDate[key]) {
      minutesByDate[key] = { minutes: 0, count: 0 };
    }
    minutesByDate[key].minutes += l.durationMinutes;
    minutesByDate[key].count += 1;
  });

  const nowDate = new Date(now);
  const nowKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}`;

  // Find the end date: end of current week (Saturday) or today
  // Let end be today, and align backward
  const cells: AttentionFieldCell[] = [];
  let activeDaysCount = 0;
  let totalRecordedMinutes = 0;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const data = minutesByDate[key] || { minutes: 0, count: 0 };

    if (data.minutes > 0) {
      activeDaysCount++;
      totalRecordedMinutes += data.minutes;
    }

    // 5-tier intensity derivation from real minutes
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (data.minutes >= 120) {
      level = 4;
    } else if (data.minutes >= 60) {
      level = 3;
    } else if (data.minutes >= 25) {
      level = 2;
    } else if (data.minutes > 0) {
      level = 1;
    }

    const displayDate = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    const ariaLabel = data.minutes > 0 
      ? `${displayDate}: ${data.minutes} minutes across ${data.count} focus session${data.count === 1 ? '' : 's'}`
      : `${displayDate}: No focus sessions recorded`;

    cells.push({
      dateKey: key,
      displayDate,
      dayOfWeek: d.getDay(),
      minutes: data.minutes,
      sessionCount: data.count,
      level,
      ariaLabel,
      isToday: key === nowKey
    });
  }

  // Group into weeks of 7 days
  const weeks: AttentionFieldCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return {
    weeks,
    activeDaysCount,
    totalRecordedMinutes
  };
}

/**
 * Calculates temporal session patterns from real logs.
 */
export function calculateSessionPatterns(
  logs: FocusSessionLog[],
  range: TimeRange = '30d',
  now: number = Date.now()
): SessionPatternsData {
  const filtered = filterLogsByRange(logs, range, now);
  if (filtered.length === 0) {
    return {
      mostActiveDay: null,
      mostActivePeriod: null,
      avgSessionMinutes: 0,
      longestSession: null,
      totalSessions: 0
    };
  }

  // 1. Most active day of week
  const weekdayTotals: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // 2. Most active period
  // Morning (5:00 - 11:59), Afternoon (12:00 - 16:59), Evening (17:00 - 21:59), Night (22:00 - 4:59)
  const periodTotals: Record<'morning' | 'afternoon' | 'evening' | 'night', number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0
  };

  let longestSessionLog: FocusSessionLog | null = null;
  let totalMinutes = 0;

  filtered.forEach(l => {
    totalMinutes += l.durationMinutes;
    const d = new Date(l.startedAt);
    const day = d.getDay();
    weekdayTotals[day] += l.durationMinutes;

    const hour = d.getHours();
    if (hour >= 5 && hour < 12) {
      periodTotals.morning += l.durationMinutes;
    } else if (hour >= 12 && hour < 17) {
      periodTotals.afternoon += l.durationMinutes;
    } else if (hour >= 17 && hour < 22) {
      periodTotals.evening += l.durationMinutes;
    } else {
      periodTotals.night += l.durationMinutes;
    }

    if (!longestSessionLog || l.durationMinutes > longestSessionLog.durationMinutes) {
      longestSessionLog = l;
    }
  });

  // Find max weekday
  let maxWeekday = 0;
  let maxWeekdayMins = -1;
  Object.entries(weekdayTotals).forEach(([dayStr, mins]) => {
    if (mins > maxWeekdayMins) {
      maxWeekdayMins = mins;
      maxWeekday = Number(dayStr);
    }
  });

  const mostActiveDay = maxWeekdayMins > 0 ? weekdayNames[maxWeekday] : null;

  // Find max period
  let maxPeriod: 'morning' | 'afternoon' | 'evening' | 'night' = 'evening';
  let maxPeriodMins = -1;
  (Object.keys(periodTotals) as Array<keyof typeof periodTotals>).forEach(p => {
    if (periodTotals[p] > maxPeriodMins) {
      maxPeriodMins = periodTotals[p];
      maxPeriod = p;
    }
  });

  const periodLabels: Record<'morning' | 'afternoon' | 'evening' | 'night', string> = {
    morning: 'Morning (5 AM – 12 PM)',
    afternoon: 'Afternoon (12 PM – 5 PM)',
    evening: 'Evening (5 PM – 10 PM)',
    night: 'Night (10 PM – 5 AM)'
  };

  const mostActivePeriod = maxPeriodMins > 0 ? periodLabels[maxPeriod] : null;

  let longestSession = null;
  if (longestSessionLog) {
    const d = new Date((longestSessionLog as FocusSessionLog).startedAt);
    longestSession = {
      minutes: (longestSessionLog as FocusSessionLog).durationMinutes,
      dateLabel: formatShortDate(d),
      goalName: (longestSessionLog as FocusSessionLog).goalName
    };
  }

  return {
    mostActiveDay,
    mostActivePeriod,
    avgSessionMinutes: Math.round(totalMinutes / filtered.length),
    longestSession,
    totalSessions: filtered.length
  };
}

/**
 * Formats minutes into standard readable string e.g. "2h 15m" or "45m".
 */
export function formatMinutes(mins: number): string {
  if (mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Returns intention summaries reusing calculateGoalVitality to ensure
 * Growth and Vitality stay separated.
 */
export function calculateIntentionSummaries(
  profile: UserProfile,
  now: number = Date.now()
): IntentionSummary[] {
  const grove = profile.grove || [];
  const logs = profile.logs || [];

  return grove
    .filter(g => !g.isComplete)
    .map(goal => {
      const vitalityReport = calculateGoalVitality(goal, now, logs);
      const remainingMinutes = Math.max(0, goal.totalTargetMinutes - goal.accruedMinutes);

      let lastTendedText = 'Awaiting first ritual';
      if (goal.lastFocusDate) {
        const diffDays = Math.floor((now - goal.lastFocusDate) / 86400000);
        if (diffDays <= 0) {
          lastTendedText = 'Tended today';
        } else if (diffDays === 1) {
          lastTendedText = 'Tended yesterday';
        } else {
          lastTendedText = `Tended ${diffDays} days ago`;
        }
      }

      const daily = goal.dailyTargetMinutes || 25;
      const projectedDaysLeft = remainingMinutes > 0 ? Math.ceil(remainingMinutes / daily) : 0;

      return {
        goal,
        vitalityReport,
        lastTendedText,
        remainingMinutes,
        projectedDaysLeft
      };
    })
    .sort((a, b) => b.vitalityReport.growthPct - a.vitalityReport.growthPct);
}

/**
 * Generates 3-5 deterministic, reflective observations based strictly on actual data.
 * Zero AI, zero fake gamification scores, purely observational.
 */
export function generateDeterministicObservations(
  profile: UserProfile,
  range: TimeRange = '30d',
  now: number = Date.now()
): string[] {
  const filteredLogs = filterLogsByRange(profile.logs || [], range, now);
  const observations: string[] = [];

  if (filteredLogs.length === 0) {
    observations.push("Your observatory is quiet. Practice begins with your next intention.");
    if (profile.grove && profile.grove.length > 0) {
      observations.push(`You have ${profile.grove.length} planted intention${profile.grove.length === 1 ? '' : 's'} waiting for soil attention.`);
    }
    return observations;
  }

  const patterns = calculateSessionPatterns(profile.logs || [], range, now);
  const rhythm = calculateFocusRhythm(profile.logs || [], range, now);

  // 1. Consistency observation
  if (rhythm.activeDaysCount > 0) {
    observations.push(
      `You gave attention on ${rhythm.activeDaysCount} of the last ${rhythm.totalDays} days (${rhythm.consistencyPct}% consistency).`
    );
  }

  // 2. Temporal peak observation
  if (patterns.mostActivePeriod) {
    observations.push(
      `Your attention gathers most reliably during the ${patterns.mostActivePeriod.toLowerCase()}.`
    );
  }

  // 3. Day of week observation
  if (patterns.mostActiveDay) {
    observations.push(
      `${patterns.mostActiveDay} is your most active day for focused practice in this window.`
    );
  }

  // 4. Peak session observation
  if (patterns.longestSession && patterns.longestSession.minutes >= 20) {
    const dur = formatMinutes(patterns.longestSession.minutes);
    const onGoal = patterns.longestSession.goalName ? ` for "${patterns.longestSession.goalName}"` : '';
    observations.push(
      `Your deepest continuous session was ${dur}${onGoal} on ${patterns.longestSession.dateLabel}.`
    );
  }

  // 5. Intention distribution observation
  const activeIntentions = calculateIntentionSummaries(profile, now);
  if (activeIntentions.length > 0) {
    const highestGrowth = activeIntentions[0];
    if (highestGrowth.vitalityReport.growthPct > 0) {
      observations.push(
        `"${highestGrowth.goal.name}" leads your grove evolution at ${highestGrowth.vitalityReport.growthPct}% maturity.`
      );
    }
  }

  // 6. Eternal Canopy observation if applicable
  const completed = (profile.grove || []).filter(g => g.isComplete);
  if (completed.length > 0) {
    observations.push(
      `${completed.length} matured tree${completed.length === 1 ? '' : 's'} are permanently preserved in your Eternal Canopy.`
    );
  }

  return observations.slice(0, 5);
}
