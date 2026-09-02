import { ChatMessage, UserProfile, SaplingGoal, FocusSessionLog } from '../types';

export interface GroveContext {
  currentGoalName?: string;
  currentGoalSpecies?: string;
  currentGoalProgress?: number;
  currentGoalAccruedMins?: number;
  currentGoalTargetMins?: number;
  totalFocusMinutes?: number;
  todayFocusMinutes?: number;
  recentSessions?: Array<{ mode: string; durationMinutes: number; goalName: string }>;
  activeSessionMode?: string;
}

export interface AniResponse {
  text: string;
  status: 'ok' | 'offline' | 'error';
  model?: string;
}

/**
 * Builds a clean, focused context summary of the user's Sapling state
 * without dumping sensitive or redundant localStorage objects.
 */
export function buildGroveContext(
  profile?: UserProfile,
  activeSessionGoal?: SaplingGoal | null | 'pomodoro',
  activeMode?: string
): GroveContext {
  if (!profile) {
    return {
      totalFocusMinutes: 0,
      todayFocusMinutes: 0,
      recentSessions: []
    };
  }

  // Calculate today's focus minutes
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayMs = startOfDay.getTime();

  const todayFocusMinutes = (profile.logs || [])
    .filter(log => log.endedAt >= startOfDayMs)
    .reduce((sum, log) => sum + (log.durationMinutes || 0), 0);

  // Get active goal (first incomplete goal or active session goal)
  const activeGoal = typeof activeSessionGoal === 'object' && activeSessionGoal
    ? activeSessionGoal
    : (profile.grove || []).find(g => !g.isComplete);

  // Recent 3 session summaries
  const recentSessions = (profile.logs || [])
    .slice(0, 3)
    .map(log => ({
      mode: log.mode,
      durationMinutes: log.durationMinutes,
      goalName: log.goalName
    }));

  const progress = activeGoal && activeGoal.totalTargetMinutes > 0
    ? Math.min(100, Math.round((activeGoal.accruedMinutes / activeGoal.totalTargetMinutes) * 100))
    : 0;

  return {
    currentGoalName: activeGoal ? activeGoal.name : undefined,
    currentGoalSpecies: activeGoal ? activeGoal.type : undefined,
    currentGoalProgress: activeGoal ? progress : undefined,
    currentGoalAccruedMins: activeGoal ? activeGoal.accruedMinutes : undefined,
    currentGoalTargetMins: activeGoal ? activeGoal.totalTargetMinutes : undefined,
    totalFocusMinutes: profile.totalFocusTime,
    todayFocusMinutes,
    recentSessions,
    activeSessionMode: activeMode
  };
}

/**
 * Primary Ani Service client
 */
export const aniService = {
  async sendMessage(
    messages: ChatMessage[],
    context: GroveContext
  ): Promise<AniResponse> {
    const recentMessages = messages.slice(-8); // Bounded recent conversation window

    try {
      const response = await fetch('/api/ani', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: recentMessages,
          context
        })
      });

      if (!response.ok) {
        let errorMessage = 'API_ERROR';
        try {
          const errorData = await response.json();
          if (errorData.error) errorMessage = errorData.error;
        } catch (e) {
          // ignore parsing error
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.text) {
        return {
          text: data.text,
          status: 'ok',
          model: data.model || 'gemini-2.5-flash'
        };
      }
      throw new Error('EMPTY_RESPONSE');
    } catch (error: any) {
      console.warn("Ani AI gateway unreachable or offline:", error.message);
      throw new Error("Couldn't reach Ani right now. Check the connection and try again.");
    }
  }
};
