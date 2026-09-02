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
 * Intelligent client fallback generator when the server-side AI endpoint
 * is unreachable (e.g. offline, no internet, or missing API key).
 * Synthesizes a calm, context-aware observation rather than a generic canned quote.
 */
function generateContextualFallback(userPrompt: string, context: GroveContext): string {
  const p = userPrompt.toLowerCase();

  if (p.includes('hello') || p.includes('hi') || p.includes('hey')) {
    if (context.currentGoalName) {
      return `Welcome back to the grove. Your ${context.currentGoalSpecies || 'tree'} (${context.currentGoalName}) is currently at ${context.currentGoalProgress || 0}% maturity. What shall we nurture today?`;
    }
    return "Peace in the grove. I'm here watching over your soil. What intention would you like to cultivate today?";
  }

  if (p.includes('how am i doing') || p.includes('progress') || p.includes('stats')) {
    const hours = Math.floor((context.totalFocusMinutes || 0) / 60);
    const mins = Math.round((context.totalFocusMinutes || 0) % 60);
    return `You've synthesized ${hours}H ${mins}M of dedicated focus across your grove so far. Today, you've nourished ${context.todayFocusMinutes || 0} minutes. Consistent, quiet rituals build deep roots.`;
  }

  if (p.includes('goal') || p.includes('intention') || p.includes('current') || p.includes('tree')) {
    if (context.currentGoalName) {
      return `Your active intention is "${context.currentGoalName}"—a ${context.currentGoalSpecies || 'Pine'} tree with ${context.currentGoalAccruedMins || 0}/${context.currentGoalTargetMins || 25} minutes accrued (${context.currentGoalProgress || 0}% evolution). Ready to commence a ritual?`;
    }
    return "You have no active seeds in soil right now. Plant a fresh intention from The Grove, and we'll breathe life into it together.";
  }

  if (p.includes('focus') || p.includes('what should i') || p.includes('help')) {
    if (context.currentGoalName) {
      return `I recommend commencing a 25-minute Chronos ritual on "${context.currentGoalName}". Put away noise, take a slow breath, and let the timer nurture your seed.`;
    }
    return "Choose one small, disciplined task. Give it 20 minutes of uninterrupted stillness. That single seed is enough to start a forest.";
  }

  return "The leaves rustle in quiet agreement. Give your attention to one clear task, and I'll keep watch over your soil.";
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
        throw new Error(`AI Gateway responded with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.text) {
        return {
          text: data.text,
          status: 'ok',
          model: data.model || 'gemini-2.5-flash'
        };
      }
      throw new Error("Empty response from AI service");
    } catch (error: any) {
      console.warn("Ani AI gateway unreachable or offline, using contextual fallback:", error.message);
      
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      let lastText = '';
      if (lastUserMsg) {
        for (const part of lastUserMsg.parts) {
          if ('text' in part && typeof part.text === 'string') {
            lastText = part.text;
            break;
          }
        }
      }
      
      const fallbackText = generateContextualFallback(lastText, context);
      return {
        text: fallbackText,
        status: 'offline'
      };
    }
  }
};
