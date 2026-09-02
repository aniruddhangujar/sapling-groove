import { UserProfile, SaplingGoal, FocusSessionLog, ChatMessage } from '../types';

const PROFILE_KEY = 'sapling_profile_v3';
const ANI_CHAT_KEY = 'sapling_ani_chat_v3';

export class StorageService {
  /**
   * Loads profile from local storage with safe defaults
   */
  public getProfile(): UserProfile {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (!saved) {
        return this.getDefaultProfile();
      }
      const parsed = JSON.parse(saved);
      return {
        userId: parsed.userId,
        isPremium: Boolean(parsed.isPremium),
        totalFocusTime: Number(parsed.totalFocusTime) || 0,
        grove: Array.isArray(parsed.grove) ? parsed.grove : [],
        logs: Array.isArray(parsed.logs) ? parsed.logs : [],
        preferences: parsed.preferences || {}
      };
    } catch (e) {
      console.warn("StorageService: Error loading profile, using defaults", e);
      return this.getDefaultProfile();
    }
  }

  /**
   * Saves profile to storage
   */
  public saveProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn("StorageService: Error saving profile to localStorage", e);
    }
  }

  /**
   * Adds a new goal to the grove
   */
  public addGoal(newGoal: Partial<SaplingGoal>): SaplingGoal {
    const profile = this.getProfile();
    const goal: SaplingGoal = {
      id: 'intent_' + Math.random().toString(36).substr(2, 9),
      accruedMinutes: 0,
      isComplete: false,
      health: 100,
      perfectionScore: 1.0,
      startDate: Date.now(),
      name: newGoal.name || 'Untitled Intent',
      type: newGoal.type!,
      timeline: newGoal.timeline!,
      durationInDays: newGoal.durationInDays || 7,
      dailyTargetMinutes: newGoal.dailyTargetMinutes || 25,
      totalTargetMinutes: newGoal.totalTargetMinutes || 175,
      ...newGoal
    } as SaplingGoal;

    profile.grove = [...profile.grove, goal];
    this.saveProfile(profile);
    return goal;
  }

  /**
   * Records a focus session log
   */
  public recordSessionLog(log: FocusSessionLog): void {
    if (log.durationMinutes <= 0) return;
    const profile = this.getProfile();
    profile.logs = [log, ...profile.logs];
    this.saveProfile(profile);
  }

  /**
   * Loads Ani AI chat history
   */
  public getAniChatHistory(): ChatMessage[] {
    try {
      const saved = localStorage.getItem(ANI_CHAT_KEY);
      if (!saved) {
        return [
          { role: 'model', parts: [{ text: "I'm Ani. I'm here to watch over your garden while you do the real work. How's it feeling today?" }] }
        ];
      }
      return JSON.parse(saved);
    } catch (e) {
      return [
        { role: 'model', parts: [{ text: "I'm Ani. I'm here to watch over your garden while you do the real work. How's it feeling today?" }] }
      ];
    }
  }

  /**
   * Saves Ani AI chat history
   */
  public saveAniChatHistory(messages: ChatMessage[]): void {
    try {
      localStorage.setItem(ANI_CHAT_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn("StorageService: Error saving Ani chat", e);
    }
  }

  /**
   * Prepares local data to be associated with an authenticated account
   */
  public async migrateLocalDataToAccount(userId: string): Promise<UserProfile> {
    const profile = this.getProfile();
    profile.userId = userId;
    this.saveProfile(profile);
    return profile;
  }

  private getDefaultProfile(): UserProfile {
    return {
      isPremium: false,
      totalFocusTime: 0,
      grove: [],
      logs: [],
      preferences: {
        soundscape: 'zen',
        soundEnabled: true
      }
    };
  }
}

export const storageService = new StorageService();
