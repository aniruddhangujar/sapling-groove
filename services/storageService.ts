import { UserProfile, SaplingGoal, FocusSessionLog, ChatMessage, TreeType, TimelineType } from '../types';
import { db, auth } from './firebase';
import { doc, setDoc, getDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';

const PROFILE_KEY = 'sapling_profile_v3';
const ANI_CHAT_KEY = 'sapling_ani_chat_v3';

function sanitizeString(str: any, maxLen = 120, fallback = ''): string {
  if (typeof str !== 'string') return fallback;
  const clean = str.replace(/[<>]/g, '').trim();
  return clean.slice(0, maxLen);
}

function validateGoal(item: any): SaplingGoal | null {
  if (!item || typeof item !== 'object') return null;
  const id = sanitizeString(item.id, 64, 'intent_' + Math.random().toString(36).substring(2, 9));
  const name = sanitizeString(item.name, 120, 'Untitled Intent');
  const type = Object.values(TreeType).includes(item.type) ? item.type : TreeType.OAK;
  const timeline = Object.values(TimelineType).includes(item.timeline) ? item.timeline : TimelineType.DAY;
  const accruedMinutes = typeof item.accruedMinutes === 'number' && item.accruedMinutes >= 0 ? Math.floor(item.accruedMinutes) : 0;
  const totalTargetMinutes = typeof item.totalTargetMinutes === 'number' && item.totalTargetMinutes > 0 ? Math.floor(item.totalTargetMinutes) : 25;
  const dailyTargetMinutes = typeof item.dailyTargetMinutes === 'number' && item.dailyTargetMinutes > 0 ? Math.floor(item.dailyTargetMinutes) : 25;
  const durationInDays = typeof item.durationInDays === 'number' && item.durationInDays > 0 ? Math.floor(item.durationInDays) : 1;
  const startDate = typeof item.startDate === 'number' && item.startDate > 0 ? item.startDate : Date.now();
  const health = typeof item.health === 'number' ? Math.max(0, Math.min(100, item.health)) : 100;
  const isComplete = Boolean(item.isComplete || accruedMinutes >= totalTargetMinutes);

  return {
    id,
    name,
    type,
    timeline,
    startDate,
    durationInDays,
    dailyTargetMinutes,
    totalTargetMinutes,
    accruedMinutes,
    lastFocusDate: typeof item.lastFocusDate === 'number' ? item.lastFocusDate : undefined,
    isComplete,
    health,
    perfectionScore: typeof item.perfectionScore === 'number' ? item.perfectionScore : 1.0
  };
}

function validateLog(item: any): FocusSessionLog | null {
  if (!item || typeof item !== 'object') return null;
  const duration = typeof item.durationMinutes === 'number' ? Math.max(0, Math.min(720, Math.floor(item.durationMinutes))) : 0;
  if (duration <= 0) return null;
  const id = sanitizeString(item.id, 64, 'log_' + Math.random().toString(36).substring(2, 9));
  const goalName = sanitizeString(item.goalName, 120, 'Focus Session');
  const mode = item.mode === 'groove' ? 'groove' : 'chronos';
  const startedAt = typeof item.startedAt === 'number' ? item.startedAt : Date.now() - duration * 60000;
  const endedAt = typeof item.endedAt === 'number' ? item.endedAt : Date.now();

  return {
    id,
    goalId: item.goalId ? sanitizeString(item.goalId, 64) : undefined,
    goalName,
    treeType: Object.values(TreeType).includes(item.treeType) ? item.treeType : undefined,
    mode,
    startedAt,
    endedAt,
    durationMinutes: duration,
    completed: Boolean(item.completed)
  };
}

export class StorageService {
  /**
   * Loads profile from local storage with robust schema validation and error recovery
   */
  public getProfile(): UserProfile {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (!saved) {
        return this.getDefaultProfile();
      }
      const parsed = JSON.parse(saved);

      const rawGrove = Array.isArray(parsed.grove) ? parsed.grove : [];
      const validGrove: SaplingGoal[] = [];
      for (const g of rawGrove) {
        const validated = validateGoal(g);
        if (validated) validGrove.push(validated);
      }

      const rawLogs = Array.isArray(parsed.logs) ? parsed.logs : [];
      const validLogs: FocusSessionLog[] = [];
      for (const l of rawLogs) {
        const validated = validateLog(l);
        if (validated) validLogs.push(validated);
      }

      const soundPref = parsed.preferences?.soundscape;
      const validSound = ['zen', 'nature', 'rain', 'none'].includes(soundPref) ? soundPref : 'zen';

      return {
        userId: parsed.userId ? sanitizeString(parsed.userId, 128) : undefined,
        isPremium: Boolean(parsed.isPremium),
        totalFocusTime: typeof parsed.totalFocusTime === 'number' && parsed.totalFocusTime >= 0 
          ? parsed.totalFocusTime 
          : validLogs.reduce((sum, l) => sum + l.durationMinutes, 0),
        grove: validGrove,
        logs: validLogs,
        preferences: {
          soundscape: validSound,
          soundEnabled: parsed.preferences?.soundEnabled !== false
        }
      };
    } catch (e) {
      console.warn("[StorageService] Corrupted local profile recovered to defaults:", e);
      return this.getDefaultProfile();
    }
  }

  /**
   * Saves profile to storage locally (0ms latency), and asynchronously syncs to Firestore if authenticated
   */
  public saveProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn("[StorageService] Error saving profile to localStorage:", e);
    }

    // Local-first async cloud sync: only sync to cloud when authenticated with real Firebase Auth
    if (db && auth?.currentUser && !auth.currentUser.isAnonymous) {
      const uid = auth.currentUser.uid;
      this.syncProfileToFirestore(uid, profile).catch(err => {
        console.debug("[StorageService] Offline/async Firestore sync queued:", err?.message);
      });
    }
  }

  /**
   * Adds a new goal to the grove locally and schedules cloud sync
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
      name: sanitizeString(newGoal.name, 120, 'Untitled Intent'),
      type: newGoal.type || TreeType.OAK,
      timeline: newGoal.timeline || TimelineType.DAY,
      durationInDays: Math.max(1, newGoal.durationInDays || 7),
      dailyTargetMinutes: Math.max(1, newGoal.dailyTargetMinutes || 25),
      totalTargetMinutes: Math.max(1, newGoal.totalTargetMinutes || 175),
      ...newGoal
    };

    profile.grove = [...profile.grove, goal];
    this.saveProfile(profile);
    return goal;
  }

  /**
   * Records a focus session log with strict deduplication (idempotency)
   */
  public recordSessionLog(log: FocusSessionLog): void {
    if (log.durationMinutes <= 0) return;
    const profile = this.getProfile();

    // Idempotency check: prevent duplicate logs within 2-second timestamp window or duplicate IDs
    const isDuplicate = profile.logs.some(
      existing => existing.id === log.id || 
      (Math.abs(existing.startedAt - log.startedAt) < 2000 && existing.goalName === log.goalName)
    );

    if (isDuplicate) {
      console.warn("[StorageService] Duplicate session log prevented:", log.id);
      return;
    }

    profile.logs = [log, ...profile.logs];
    profile.totalFocusTime += log.durationMinutes;
    this.saveProfile(profile);

    // Sync session document directly to Firestore users/{uid}/sessions/{log.id}
    if (db && auth?.currentUser && !auth.currentUser.isAnonymous) {
      const uid = auth.currentUser.uid;
      const sessionDocRef = doc(db, 'users', uid, 'sessions', log.id);
      setDoc(sessionDocRef, {
        id: log.id,
        goalId: log.goalId || null,
        goalName: sanitizeString(log.goalName, 120, 'Focus Session'),
        treeType: log.treeType || null,
        mode: log.mode,
        startedAt: log.startedAt,
        endedAt: log.endedAt,
        durationMinutes: log.durationMinutes,
        completed: Boolean(log.completed),
        createdAt: serverTimestamp()
      }).catch(err => {
        console.debug("[StorageService] Session log cloud sync delayed:", err?.message);
      });
    }
  }

  /**
   * Synchronizes local profile to Firestore path users/{userId}
   */
  public async syncProfileToFirestore(userId: string, profile: UserProfile): Promise<void> {
    if (!db || !userId) return;

    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        userId,
        displayName: sanitizeString(auth?.currentUser?.displayName, 80, 'Botanical Operative'),
        email: sanitizeString(auth?.currentUser?.email, 120, ''),
        isPremium: Boolean(profile.isPremium),
        totalFocusTime: profile.totalFocusTime,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });

      // Sync active and completed goals to subcollection users/{userId}/goals
      for (const goal of profile.grove) {
        const goalRef = doc(db, 'users', userId, 'goals', goal.id);
        await setDoc(goalRef, {
          id: goal.id,
          name: sanitizeString(goal.name, 120),
          type: goal.type,
          timeline: goal.timeline,
          startDate: goal.startDate,
          durationInDays: goal.durationInDays,
          dailyTargetMinutes: goal.dailyTargetMinutes,
          totalTargetMinutes: goal.totalTargetMinutes,
          accruedMinutes: goal.accruedMinutes,
          lastFocusDate: goal.lastFocusDate || null,
          isComplete: goal.isComplete,
          health: goal.health,
          perfectionScore: goal.perfectionScore,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      // Sync preferences to users/{userId}/preferences/app
      const prefRef = doc(db, 'users', userId, 'preferences', 'app');
      await setDoc(prefRef, {
        soundscape: profile.preferences?.soundscape || 'zen',
        soundEnabled: profile.preferences?.soundEnabled !== false,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err: any) {
      console.warn("[StorageService] Firestore sync skipped (offline or network error):", err?.message);
    }
  }

  /**
   * Deterministically loads and merges remote Firestore profile into local storage
   */
  public async loadProfileFromFirestore(userId: string): Promise<UserProfile> {
    const localProfile = this.getProfile();
    if (!db || !userId) return localProfile;

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      // Fetch remote goals
      const goalsCol = collection(db, 'users', userId, 'goals');
      const goalsSnap = await getDocs(goalsCol);
      const remoteGoals: SaplingGoal[] = [];
      goalsSnap.forEach(docSnap => {
        const validated = validateGoal(docSnap.data());
        if (validated) remoteGoals.push(validated);
      });

      // Fetch remote sessions
      const sessionsCol = collection(db, 'users', userId, 'sessions');
      const sessionsSnap = await getDocs(sessionsCol);
      const remoteLogs: FocusSessionLog[] = [];
      sessionsSnap.forEach(docSnap => {
        const validated = validateLog(docSnap.data());
        if (validated) remoteLogs.push(validated);
      });

      // Deterministic Merge: Goals
      const goalMap = new Map<string, SaplingGoal>();
      // Put remote goals first
      remoteGoals.forEach(g => goalMap.set(g.id, g));
      // Merge local goals: keep local if more accrued minutes or newer focus date
      localProfile.grove.forEach(localGoal => {
        const remote = goalMap.get(localGoal.id);
        if (!remote) {
          goalMap.set(localGoal.id, localGoal);
        } else {
          if (localGoal.accruedMinutes > remote.accruedMinutes) {
            goalMap.set(localGoal.id, { ...remote, accruedMinutes: localGoal.accruedMinutes, health: localGoal.health });
          }
        }
      });

      // Deterministic Merge: Sessions (Union by ID, sorted newest first)
      const logMap = new Map<string, FocusSessionLog>();
      remoteLogs.forEach(l => logMap.set(l.id, l));
      localProfile.logs.forEach(l => logMap.set(l.id, l));
      const mergedLogs = Array.from(logMap.values()).sort((a, b) => b.startedAt - a.startedAt);

      const mergedTotalFocusTime = Math.max(
        userSnap.exists() ? (userSnap.data().totalFocusTime || 0) : 0,
        localProfile.totalFocusTime,
        mergedLogs.reduce((sum, l) => sum + l.durationMinutes, 0)
      );

      const mergedProfile: UserProfile = {
        userId,
        isPremium: Boolean(userSnap.exists() ? userSnap.data().isPremium : localProfile.isPremium),
        totalFocusTime: mergedTotalFocusTime,
        grove: Array.from(goalMap.values()),
        logs: mergedLogs,
        preferences: localProfile.preferences
      };

      // Save merged profile locally
      localStorage.setItem(PROFILE_KEY, JSON.stringify(mergedProfile));
      return mergedProfile;
    } catch (err: any) {
      console.warn("[StorageService] Could not pull from Firestore (using local):", err?.message);
      return localProfile;
    }
  }

  /**
   * Safely migrates local guest data to an authenticated cloud user account
   */
  public async migrateGuestData(userId: string): Promise<UserProfile> {
    const profile = this.getProfile();
    profile.userId = userId;
    this.saveProfile(profile);
    await this.syncProfileToFirestore(userId, profile);
    return profile;
  }

  /**
   * Loads Ani AI chat history
   */
  public getAniChatHistory(): ChatMessage[] {
    try {
      const saved = localStorage.getItem(ANI_CHAT_KEY);
      if (!saved) return this.getDefaultAniChat();
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : this.getDefaultAniChat();
    } catch {
      return this.getDefaultAniChat();
    }
  }

  /**
   * Saves Ani AI chat history
   */
  public saveAniChatHistory(messages: ChatMessage[]): void {
    try {
      localStorage.setItem(ANI_CHAT_KEY, JSON.stringify(messages.slice(-30)));
    } catch (e) {
      console.warn("[StorageService] Error saving Ani chat:", e);
    }
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

  private getDefaultAniChat(): ChatMessage[] {
    return [
      { role: 'model', parts: [{ text: "Peace in the grove. I'm Ani—your focus co-pilot and grove steward. What intention shall we tend to?" }] }
    ];
  }
}

export const storageService = new StorageService();
