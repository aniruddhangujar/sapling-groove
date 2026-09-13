import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  signInAnonymously,
  User as FirebaseUser
} from 'firebase/auth';
import { User } from '../types';
import { auth, googleProvider, githubProvider, isFirebaseConfigured } from './firebase';
import { storageService } from './storageService';

const AUTH_USER_KEY = 'sapling_auth_user_v1';

export class AuthService {
  /**
   * Returns whether Firebase authentication is configured in the environment
   */
  public isConfigured(): boolean {
    return isFirebaseConfigured();
  }

  /**
   * Translates Firebase user instance to Sapling User model
   */
  private mapFirebaseUser(fbUser: FirebaseUser): User {
    return {
      id: fbUser.uid,
      email: fbUser.email || `${fbUser.uid.substring(0, 8)}@sapling.local`,
      displayName: fbUser.displayName || (fbUser.isAnonymous ? 'Grove Wanderer' : 'Botanical Operative'),
      avatarUrl: fbUser.photoURL || undefined,
      createdAt: fbUser.metadata.creationTime ? new Date(fbUser.metadata.creationTime).getTime() : Date.now(),
      isAnonymous: fbUser.isAnonymous
    };
  }

  /**
   * Retrieves the currently active user cached in localStorage
   */
  public getCurrentUser(): User | null {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY);
      if (!saved) return null;
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }

  /**
   * Saves user model to localStorage
   */
  public saveUser(user: User | null): void {
    try {
      if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    } catch {}
  }

  /**
   * Subscribes to real-time auth state changes
   */
  public subscribeToAuthState(callback: (user: User | null) => void): () => void {
    if (!auth) {
      // Offline fallback: check cached user
      callback(this.getCurrentUser());
      return () => {};
    }

    return onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const user = this.mapFirebaseUser(fbUser);
        this.saveUser(user);
        callback(user);
      } else {
        const cached = this.getCurrentUser();
        // If cached is not an offline guest, clear it
        if (!cached?.isAnonymous) {
          this.saveUser(null);
          callback(null);
        } else {
          callback(cached);
        }
      }
    });
  }

  /**
   * Initiates Google Sign-In flow via popup
   */
  public async signInWithGoogle(): Promise<User> {
    if (!this.isConfigured() || !auth) {
      throw new Error(
        "Firebase is not configured in .env.local. Add your VITE_FIREBASE_* credentials to enable live Google sign-in."
      );
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = this.mapFirebaseUser(result.user);
      this.saveUser(user);
      return user;
    } catch (err: any) {
      throw new Error(this.formatAuthError(err));
    }
  }

  /**
   * Initiates GitHub Sign-In flow via popup
   */
  public async signInWithGithub(): Promise<User> {
    if (!this.isConfigured() || !auth) {
      throw new Error(
        "Firebase is not configured in .env.local. Add your VITE_FIREBASE_* credentials to enable live GitHub sign-in."
      );
    }

    try {
      const result = await signInWithPopup(auth, githubProvider);
      const user = this.mapFirebaseUser(result.user);
      this.saveUser(user);
      return user;
    } catch (err: any) {
      throw new Error(this.formatAuthError(err));
    }
  }

  /**
   * Signs in with Email and Password
   */
  public async signInWithEmail(email: string, pass: string): Promise<User> {
    if (!this.isConfigured() || !auth) {
      throw new Error(
        "Firebase is not configured in .env.local. Add your VITE_FIREBASE_* credentials to enable email sign-in."
      );
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const user = this.mapFirebaseUser(result.user);
      this.saveUser(user);
      return user;
    } catch (err: any) {
      throw new Error(this.formatAuthError(err));
    }
  }

  /**
   * Registers a new account with Email, Password, and Display Name
   */
  public async signUpWithEmail(email: string, pass: string, displayName: string): Promise<User> {
    if (!this.isConfigured() || !auth) {
      throw new Error(
        "Firebase is not configured in .env.local. Add your VITE_FIREBASE_* credentials to register new accounts."
      );
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (displayName.trim()) {
        await updateProfile(result.user, { displayName: displayName.trim() });
      }
      const user = this.mapFirebaseUser(result.user);
      if (displayName.trim()) {
        user.displayName = displayName.trim();
      }
      this.saveUser(user);
      return user;
    } catch (err: any) {
      throw new Error(this.formatAuthError(err));
    }
  }

  /**
   * Sends password reset email
   */
  public async sendPasswordReset(email: string): Promise<void> {
    if (!this.isConfigured() || !auth) {
      throw new Error("Firebase is not configured in .env.local.");
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      throw new Error(this.formatAuthError(err));
    }
  }

  /**
   * Continues as an anonymous guest user
   */
  public async createGuestSession(): Promise<User> {
    if (this.isConfigured() && auth) {
      try {
        const result = await signInAnonymously(auth);
        const user = this.mapFirebaseUser(result.user);
        user.displayName = 'Grove Wanderer';
        this.saveUser(user);
        return user;
      } catch {
        // Fallback to local offline guest if anonymous auth is not enabled in Firebase
      }
    }

    const guestUser: User = {
      id: 'guest_' + Math.random().toString(36).substring(2, 9),
      email: 'guest@sapling.local',
      displayName: 'Grove Wanderer',
      createdAt: Date.now(),
      isAnonymous: true
    };
    this.saveUser(guestUser);
    return guestUser;
  }

  /**
   * Signs out the user, clears sessions, and purges authenticated local cache
   */
  public async signOut(): Promise<void> {
    const currentUid = auth?.currentUser?.uid || this.getCurrentUser()?.id;
    if (auth && auth.currentUser) {
      try {
        await firebaseSignOut(auth);
      } catch {}
    }
    this.saveUser(null);
    if (currentUid && !currentUid.startsWith('guest_')) {
      storageService.purgeAuthenticatedStorage(currentUid);
    }
  }

  /**
   * Translates Firebase auth errors into human-readable terminal telemetry
   */
  public formatAuthError(err: any): string {
    const code = err?.code || '';
    switch (code) {
      case 'auth/popup-closed-by-user':
        return 'Authentication window closed before completion.';
      case 'auth/cancelled-popup-request':
        return 'Authentication request cancelled.';
      case 'auth/popup-blocked':
        return 'Authentication popup was blocked by your browser. Please allow popups for this site.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email using a different sign-in method.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email cipher or security key.';
      case 'auth/email-already-in-use':
        return 'A seed profile with this email address already exists.';
      case 'auth/weak-password':
        return 'Security key is too short. Must be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/too-many-requests':
        return 'Access temporarily restricted due to repeated attempts. Please wait a moment.';
      case 'auth/operation-not-allowed':
        return 'This authentication provider is not enabled in your Firebase project console.';
      case 'auth/unauthorized-domain':
        return 'Current domain is not authorized in Firebase Console > Authentication > Settings > Authorized domains.';
      default:
        return err?.message || 'Authentication error encountered.';
    }
  }
}

export const authService = new AuthService();
