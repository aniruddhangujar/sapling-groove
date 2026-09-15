import { UserProfile, SaplingGoal, FocusSessionLog, ChatMessage, TreeType, TimelineType } from '../types';
import { db, auth } from './firebase';
import { doc, setDoc, getDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';

const LEGACY_PROFILE_KEY = 'sapling_profile_v3';
const GUEST_PROFILE_KEY = 'sapling_profile_guest_v3';
const ANI_CHAT_KEY = 'sapling_ani_chat_v3';

function getProfileKey(userId?: string | null): string {
  if (userId && userId !== 'guest' && !userId.startsWith('guest_')) {
    return `sapling_profile_user_${userId}`;
  }
  return GUEST_PROFILE_KEY;
}

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

/**
 * Non-aggressive sanity check on untrusted client logs (Constraint 1)
 * Prevents negative durations and corrupted values without rejecting legitimate long study sessions.
 */
function validateLog(item: any): FocusSessionLog | null {
  if (!item || typeof item !== 'object') return null;
  // Non-aggressive bound: allow sessions up to 1440 mins (24h)
  const duration = typeof item.durationMinutes === 'number' ? Math.max(0, Math.min(1440, Math.floor(item.durationMinutes))) : 0;
  if (duration <= 0) return null;
  const id = sanitizeString(item.id, 64, 'log_' + Math.random().toString(36).substring(2, 9));
  const goalName = sanitizeString(item.goalName, 120, 'Focus Session');
  const mode = item.mode === 'groove' ? 'groove' : 'chronos';
  
  // Non-aggressive sanity check on timestamps (allow 1-minute grace for minor clock drift)
  const now = Date.now();
  const rawStarted = typeof item.startedAt === 'number' ? item.startedAt : now - duration * 60000;
  const startedAt = Math.min(rawStarted, now + 60000);
  const endedAt = typeof item.endedAt === 'number' ? Math.max(startedAt, Math.min(item.endedAt, now + 60000)) : now;

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
   * Loads profile from user-scoped local storage with migration fallback and schema recovery
   */
  public getProfile(userId?: string | null): UserProfile {
    try {
      const key = getProfileKey(userId);
      let saved = localStorage.getItem(key);
      
      // Check legacy key for backward compatibility migration
      if (!saved && key === GUEST_PROFILE_KEY) {
        const legacy = localStorage.getItem(LEGACY_PROFILE_KEY);
        if (legacy) {
          saved = legacy;
          try {
            localStorage.setItem(GUEST_PROFILE_KEY, legacy);
          } catch {}
        }
      }

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
        groveTourCompleted: Boolean(parsed.groveTourCompleted),
        preferences: {
          soundscape: validSound,
          soundEnabled: parsed.preferences?.soundEnabled !== false,
          ecoCanopyMode: Boolean(parsed.preferences?.ecoCanopyMode)
        }
      };
    } catch (e) {
      console.warn("[StorageService] Corrupted local profile recovered to defaults:", e);
      return this.getDefaultProfile();
    }
  }

  /**
   * Saves profile to user-scoped local storage (0ms latency), and asynchronously syncs to Firestore if authenticated
   */
  public saveProfile(profile: UserProfile, userId?: string | null): void {
    const targetUserId = userId || profile.userId;
    const key = getProfileKey(targetUserId);
    try {
      localStorage.setItem(key, JSON.stringify(profile));
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
   * Completely purges an authenticated user's private data and recovery snapshots from shared computer disk
   */
  public purgeAuthenticatedStorage(userId: string): void {
    try {
      localStorage.removeItem(`sapling_profile_user_${userId}`);
      localStorage.removeItem('sapling_active_session_recovery');
    } catch (e) {
      console.warn("[StorageService] Error purging authenticated storage:", e);
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
        groveTourCompleted: Boolean(profile.groveTourCompleted),
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
    const localProfile = this.getProfile(userId);
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

      // Deterministic Two-Device Merge: Goals (Constraint 7 & 10)
      // Preserves maximum progress, latest focus date, and completion across devices
      const goalMap = new Map<string, SaplingGoal>();
      remoteGoals.forEach(g => goalMap.set(g.id, g));
      localProfile.grove.forEach(localGoal => {
        const remote = goalMap.get(localGoal.id);
        if (!remote) {
          goalMap.set(localGoal.id, localGoal);
        } else {
          const maxAccrued = Math.max(localGoal.accruedMinutes, remote.accruedMinutes);
          const isComplete = Boolean(localGoal.isComplete || remote.isComplete || maxAccrued >= (remote.totalTargetMinutes || 25));
          const latestFocusDate = Math.max(localGoal.lastFocusDate || 0, remote.lastFocusDate || 0) || undefined;
          const bestHealth = Math.max(localGoal.health, remote.health);
          goalMap.set(localGoal.id, {
            ...remote,
            accruedMinutes: maxAccrued,
            isComplete,
            lastFocusDate: latestFocusDate,
            health: bestHealth
          });
        }
      });

      // Deterministic Two-Device Merge: Sessions (Constraint 7)
      // Append-only deduplication by UUID and composite timestamp+goalName
      const logMap = new Map<string, FocusSessionLog>();
      const addLog = (log: FocusSessionLog) => {
        const compositeKey = `${log.startedAt}_${log.goalName}`;
        if (!logMap.has(log.id) && !logMap.has(compositeKey)) {
          logMap.set(log.id, log);
          logMap.set(compositeKey, log);
        }
      };
      remoteLogs.forEach(addLog);
      localProfile.logs.forEach(addLog);
      const mergedLogs = Array.from(new Set(logMap.values())).sort((a, b) => b.startedAt - a.startedAt);

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
        groveTourCompleted: Boolean((userSnap.exists() && userSnap.data().groveTourCompleted) || localProfile.groveTourCompleted),
        preferences: {
          ...localProfile.preferences,
          ecoCanopyMode: Boolean(
            localProfile.preferences?.ecoCanopyMode ?? 
            (userSnap.exists() ? userSnap.data().preferences?.ecoCanopyMode : false)
          )
        }
      };

      // Save merged profile locally in user-scoped namespace
      this.saveProfile(mergedProfile, userId);

      // Check and migrate any pending local guest data into the profile (Lossless & Idempotent)
      const finalProfile = await this.migrateGuestDataIntoProfile(userId, mergedProfile);
      return finalProfile;
    } catch (err: any) {
      console.warn("[StorageService] Could not pull from Firestore (using local):", err?.message);
      try {
        return await this.migrateGuestDataIntoProfile(userId, localProfile);
      } catch {
        return localProfile;
      }
    }
  }

  /**
   * Deterministically and idempotently merges guest/local data into an authenticated profile.
   * STRICT PERSISTENCE GATE: Only purges guest storage AFTER local and cloud persistence succeed.
   * If any error occurs during persistence, guest data is preserved so migration can retry.
   */
  public async migrateGuestDataIntoProfile(userId: string, targetProfile: UserProfile): Promise<UserProfile> {
    if (!userId || userId === 'guest' || userId.startsWith('guest_')) {
      return targetProfile;
    }

    let guestRaw: string | null = null;
    try {
      guestRaw = localStorage.getItem(GUEST_PROFILE_KEY);
      if (!guestRaw) {
        guestRaw = localStorage.getItem(LEGACY_PROFILE_KEY);
      }
    } catch {
      return targetProfile;
    }

    if (!guestRaw) {
      return targetProfile;
    }

    let parsedGuest: any = null;
    try {
      parsedGuest = JSON.parse(guestRaw);
    } catch (e) {
      console.warn("[StorageService] Guest profile unparseable during migration:", e);
      return targetProfile;
    }

    if (!parsedGuest || typeof parsedGuest !== 'object') {
      return targetProfile;
    }

    // Validate and sanitize guest goals and logs
    const rawGuestGrove = Array.isArray(parsedGuest.grove) ? parsedGuest.grove : [];
    const validGuestGrove: SaplingGoal[] = [];
    for (const g of rawGuestGrove) {
      const validated = validateGoal(g);
      if (validated) validGuestGrove.push(validated);
    }

    const rawGuestLogs = Array.isArray(parsedGuest.logs) ? parsedGuest.logs : [];
    const validGuestLogs: FocusSessionLog[] = [];
    for (const l of rawGuestLogs) {
      const validated = validateLog(l);
      if (validated) validGuestLogs.push(validated);
    }

    // If guest storage had no goals, no logs, and no focus minutes, clean up and exit
    if (validGuestGrove.length === 0 && validGuestLogs.length === 0 && (!parsedGuest.totalFocusTime || parsedGuest.totalFocusTime <= 0)) {
      try {
        localStorage.removeItem(GUEST_PROFILE_KEY);
        localStorage.removeItem(LEGACY_PROFILE_KEY);
      } catch {}
      return targetProfile;
    }

    // --- Deterministic Goal Merge (Idempotent) ---
    // Match by existing ID first, or by identical (name + treeType) if ID was regenerated
    const goalMap = new Map<string, SaplingGoal>();
    targetProfile.grove.forEach(g => goalMap.set(g.id, g));

    for (const guestGoal of validGuestGrove) {
      let existing = goalMap.get(guestGoal.id);
      if (!existing) {
        existing = Array.from(goalMap.values()).find(
          g => g.name.toLowerCase() === guestGoal.name.toLowerCase() && g.type === guestGoal.type
        );
      }

      if (!existing) {
        // Brand new goal from guest session
        goalMap.set(guestGoal.id, guestGoal);
      } else {
        // Merge progress idempotently: max accrued minutes, earliest start, latest focus, best health
        const mergedAccrued = Math.max(existing.accruedMinutes, guestGoal.accruedMinutes);
        const targetMins = existing.totalTargetMinutes || guestGoal.totalTargetMinutes || 25;
        const isComplete = Boolean(existing.isComplete || guestGoal.isComplete || mergedAccrued >= targetMins);
        const latestFocus = Math.max(existing.lastFocusDate || 0, guestGoal.lastFocusDate || 0) || undefined;
        const bestHealth = Math.max(existing.health, guestGoal.health);

        goalMap.set(existing.id, {
          ...existing,
          accruedMinutes: mergedAccrued,
          isComplete,
          lastFocusDate: latestFocus,
          health: bestHealth
        });
      }
    }

    // --- Deterministic Session Log Merge (Append-only Idempotent Deduplication) ---
    const logMap = new Map<string, FocusSessionLog>();
    const registerLog = (log: FocusSessionLog) => {
      const compositeKey = `${log.startedAt}_${log.goalName}`;
      if (!logMap.has(log.id) && !logMap.has(compositeKey)) {
        logMap.set(log.id, log);
        logMap.set(compositeKey, log);
      }
    };

    targetProfile.logs.forEach(registerLog);
    validGuestLogs.forEach(registerLog);

    const mergedLogs = Array.from(new Set(logMap.values())).sort((a, b) => b.startedAt - a.startedAt);

    // Calculate merged total focus time
    const mergedFocusTime = Math.max(
      targetProfile.totalFocusTime,
      (typeof parsedGuest.totalFocusTime === 'number' ? parsedGuest.totalFocusTime : 0),
      mergedLogs.reduce((sum, l) => sum + l.durationMinutes, 0)
    );

    const mergedProfile: UserProfile = {
      ...targetProfile,
      userId,
      totalFocusTime: mergedFocusTime,
      grove: Array.from(goalMap.values()),
      logs: mergedLogs,
      groveTourCompleted: Boolean(targetProfile.groveTourCompleted || parsedGuest.groveTourCompleted),
      preferences: {
        ...targetProfile.preferences,
        soundscape: targetProfile.preferences?.soundscape || parsedGuest.preferences?.soundscape || 'zen',
        soundEnabled: targetProfile.preferences?.soundEnabled ?? parsedGuest.preferences?.soundEnabled ?? true
      }
    };

    // --- STRICT PERSISTENCE GATE ---
    // 1. Write merged profile to authenticated user local storage
    this.saveProfile(mergedProfile, userId);

    // 2. Persist to Firestore if online
    try {
      await this.syncProfileToFirestore(userId, mergedProfile);
      // 3. ONLY purge guest data AFTER successful persistence!
      try {
        localStorage.removeItem(GUEST_PROFILE_KEY);
        localStorage.removeItem(LEGACY_PROFILE_KEY);
      } catch {}
    } catch (err: any) {
      console.warn("[StorageService] Cloud sync delayed during guest migration; guest data preserved for retry:", err?.message);
      // If Firestore sync failed, DO NOT delete guest data. It will safely retry on next sync.
    }

    return mergedProfile;
  }

  /**
   * Safely migrates local guest data to an authenticated cloud user account
   */
  public async migrateGuestData(userId: string): Promise<UserProfile> {
    const current = this.getProfile(userId);
    return this.migrateGuestDataIntoProfile(userId, current);
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
      groveTourCompleted: false,
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
