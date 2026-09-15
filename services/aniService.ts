import { ChatMessage, UserProfile, SaplingGoal, FocusSessionLog, AniActionPayload } from '../types';
import { calculateGoalVitality } from '../utils/treeLifecycle';

export interface GroveGoalSummary {
  id: string;
  name: string;
  species: string;
  progress: number;
  accruedMinutes: number;
  targetMinutes: number;
  health: number;
  vitality?: string;
  daysSinceFocus?: number;
}

export interface GroveContext {
  currentGoalName?: string;
  currentGoalSpecies?: string;
  currentGoalProgress?: number;
  currentGoalAccruedMins?: number;
  currentGoalTargetMins?: number;
  allActiveGoals?: GroveGoalSummary[];
  neglectedGoals?: string[];
  completedCanopyCount?: number;
  totalFocusMinutes?: number;
  todayFocusMinutes?: number;
  recentSessions?: Array<{ mode: string; durationMinutes: number; goalName: string }>;
  activeSessionMode?: string;
  soundPreference?: string;
}

export interface AniResponse {
  text: string;
  action?: AniActionPayload;
  status: 'ok' | 'offline' | 'error';
  model?: string;
}

/**
 * Extracts and parses structured action payload embedded in Ani's response
 */
export function parseAniResponse(rawText: string): { cleanText: string; action?: AniActionPayload } {
  if (!rawText) return { cleanText: '' };

  const actionRegex = /<ani_action>([\s\S]*?)<\/ani_action>/i;
  const match = rawText.match(actionRegex);

  if (match) {
    try {
      const jsonStr = match[1].trim();
      const action = JSON.parse(jsonStr) as AniActionPayload;
      const cleanText = rawText.replace(match[0], '').trim();
      return { cleanText, action };
    } catch (e) {
      console.warn("[AniService] Failed to parse ani_action JSON:", e);
      return { cleanText: rawText.replace(match[0], '').trim() };
    }
  }

  // Fallback: check for markdown code block with action JSON
  const jsonBlockRegex = /```(?:json)?\s*(\{\s*"type"\s*:\s*"(?:plant_goal|start_ritual|switch_soundscape|task_breakdown)"[\s\S]*?\})\s*```/i;
  const jsonMatch = rawText.match(jsonBlockRegex);
  if (jsonMatch) {
    try {
      const action = JSON.parse(jsonMatch[1].trim()) as AniActionPayload;
      const cleanText = rawText.replace(jsonMatch[0], '').trim();
      return { cleanText, action };
    } catch (e) {
      // ignore parsing error
    }
  }

  return { cleanText: rawText.trim() };
}

/**
 * Builds a clean, rich context summary of the user's Sapling state
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
      recentSessions: [],
      allActiveGoals: [],
      neglectedGoals: [],
      completedCanopyCount: 0
    };
  }

  const now = Date.now();
  // Calculate today's focus minutes
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayMs = startOfDay.getTime();

  const todayFocusMinutes = (profile.logs || [])
    .filter(log => log.endedAt >= startOfDayMs)
    .reduce((sum, log) => sum + (log.durationMinutes || 0), 0);

  const activeGoals = (profile.grove || []).filter(g => !g.isComplete);
  const completedGoals = (profile.grove || []).filter(g => g.isComplete);

  // Get active goal (first incomplete goal or active session goal)
  const activeGoal = typeof activeSessionGoal === 'object' && activeSessionGoal
    ? activeSessionGoal
    : activeGoals[0];

  const allActiveGoals: GroveGoalSummary[] = activeGoals.map(g => {
    const report = calculateGoalVitality(g, now, profile.logs || []);
    return {
      id: g.id,
      name: g.name,
      species: g.type,
      progress: report.growthPct,
      accruedMinutes: g.accruedMinutes,
      targetMinutes: g.totalTargetMinutes,
      health: report.health,
      vitality: report.vitality,
      daysSinceFocus: report.daysSinceLastFocus
    };
  });

  const neglectedGoals = activeGoals
    .filter(g => {
      const report = calculateGoalVitality(g, now, profile.logs || []);
      return report.isWilting;
    })
    .map(g => g.name);

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
    allActiveGoals,
    neglectedGoals,
    completedCanopyCount: completedGoals.length,
    totalFocusMinutes: profile.totalFocusTime,
    todayFocusMinutes,
    recentSessions,
    activeSessionMode: activeMode,
    soundPreference: profile.preferences?.soundscape
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
        const { cleanText, action } = parseAniResponse(data.text);
        return {
          text: cleanText,
          action,
          status: 'ok',
          model: data.model || 'gemini-2.5-flash'
        };
      }
      throw new Error('EMPTY_RESPONSE');
    } catch (error: any) {
      console.error("[AniService] API call failed:", error);
      // DO NOT mask the error. Pass the actual server/provider error to the UI.
      throw error;
    }
  }
};
