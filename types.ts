
export enum TreeType {
  OAK = 'Oak',
  CHERRY_BLOSSOM = 'Cherry Blossom',
  PINE = 'Pine',
  BAMBOO = 'Bamboo',
  CACTUS = 'Cactus',
  MAPLE = 'Maple',
  BAOBAB = 'Baobab',
  CEDAR = 'Cedar',
  WILLOW = 'Willow',
  SEQUOIA = 'Sequoia',
  BONSAI = 'Bonsai'
}

export enum GrowthStage {
  SEEDLING = 'Seedling', // 0-25%
  SPROUT = 'Sprout',     // 25-50%
  SAPLING = 'Sapling',   // 50-85%
  MATURE = 'Mature'      // 85-100%
}

export enum TimelineType {
  DAY = 'Day',
  WEEK = 'Week',
  MONTH = 'Month',
  YEAR = 'Year'
}

export interface SaplingGoal {
  id: string;
  name: string;
  type: TreeType;
  timeline: TimelineType;
  startDate: number;
  durationInDays: number;
  dailyTargetMinutes: number;
  totalTargetMinutes: number;
  accruedMinutes: number;
  lastFocusDate?: number;
  isComplete: boolean;
  health: number;
  perfectionScore: number;
}

export interface FocusSessionLog {
  id: string;
  goalId?: string;
  goalName: string;
  treeType?: TreeType;
  mode: 'chronos' | 'groove';
  startedAt: number;       // timestamp ms
  endedAt: number;          // timestamp ms
  durationMinutes: number;
  completed: boolean;
}

export interface UserProfile {
  isPremium: boolean;
  totalFocusTime: number;
  grove: SaplingGoal[];
  logs: FocusSessionLog[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: (
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  )[];
}

export type AppTab = 'grove' | 'logs' | 'tasks' | 'ani';

export type FocusMode = 'chronos' | 'groove';

export type PomoVisualMode = 'clock' | 'tree';
