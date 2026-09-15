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

export enum TreeVitality {
  THRIVING = 'Thriving',
  HEALTHY = 'Healthy',
  WILTING = 'Wilting',
  SEVERELY_WILTED = 'Severely Wilted'
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
  vitality?: TreeVitality;
}

export interface FocusSessionLog {
  id: string;
  goalId?: string;
  goalName: string;
  treeType?: TreeType;
  mode: 'chronos' | 'groove';
  startedAt: number;       // timestamp ms
  endedAt: number;         // timestamp ms
  durationMinutes: number;
  completed: boolean;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  isAnonymous: boolean;
}

export type AuthProviderType = 'google' | 'github' | 'password' | 'guest' | null;

export interface AuthSession {
  user: User | null;
  provider: AuthProviderType;
  isAuthenticated: boolean;
}

export interface UserProfile {
  userId?: string;
  isPremium: boolean;
  totalFocusTime: number;
  grove: SaplingGoal[];
  logs: FocusSessionLog[];
  groveTourCompleted?: boolean;
  preferences?: {
    soundscape?: string;
    soundEnabled?: boolean;
    ecoCanopyMode?: boolean;
  };
}

export type AniActionType = 
  | 'plant_goal' 
  | 'start_ritual' 
  | 'switch_soundscape'
  | 'task_breakdown';

export interface AniGoalProposal {
  name: string;
  type: TreeType;
  timeline?: TimelineType;
  durationInDays?: number;
  dailyTargetMinutes: number;
  totalTargetMinutes: number;
}

export interface AniActionPayload {
  type: AniActionType;
  goalProposal?: AniGoalProposal;
  sessionConfig?: {
    mode: FocusMode;
    goalId?: string;
    goalName?: string;
    durationMinutes?: number;
  };
  soundscapeId?: string;
  soundscapeName?: string;
  breakdownTasks?: Array<{
    title: string;
    treeType: TreeType;
    dailyMinutes: number;
    durationInDays: number;
  }>;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: (
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  )[];
  action?: AniActionPayload;
  actionExecuted?: boolean;
}

export type AppTab = 'grove' | 'logs' | 'tasks' | 'dashboard' | 'ani';

export type FocusMode = 'chronos' | 'groove';

export type PomoVisualMode = 'clock' | 'tree';

export type AppViewMode = 'landing' | 'app';

export interface IntentSpecimen {
  id: string;
  title: string;
  tagline: string;
  treeType: TreeType;
  suggestedDurationDays: number;
  dailyMinutes: number;
  iconName: string;
  philosophy: string;
}
