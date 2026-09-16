import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
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
const AUTH_REDIRECT_MARKER = 'sapling_auth_redirect_in_progress';

export class AuthService {
  private redirectError: string | null = null;
  private initPromise: Promise<User | null> | null = null;
  private googleAuthInFlight: Promise<User | null> | null = null;
  private hasProcessedRedirect = false;

  /**
   * Returns whether Firebase authentication is configured in the environment
   */
  public isConfigured(): boolean {
    return isFirebaseConfigured();
  }

  /**
   * Checks if an OAuth redirect is currently in flight (auxiliary state)
   */
  public isAuthRedirectInProgress(): boolean {
    try {
      return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(AUTH_REDIRECT_MARKER) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Retrieves any error that occurred during redirect result resolution
   */
  public getRedirectError(): string | null {
    return this.redirectError;
  }

  /**
   * Clears transient redirect error
   */
  public clearRedirectError(): void {
    this.redirectError = null;
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
   * Subscribes to real-time auth state changes after initial auth boot
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
   * Dedicated redirect result handler.
   * Safely calls getRedirectResult(auth), processes the resulting user when present,
   * catches and classifies redirect errors, and never crashes startup.
   */
  public async handleRedirectResult(): Promise<User | null> {
    if (!auth) return null;
    if (this.hasProcessedRedirect) return null;
    this.hasProcessedRedirect = true;

    try {
      const redirectResult = await getRedirectResult(auth);
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(AUTH_REDIRECT_MARKER);
        }
      } catch {}

      if (redirectResult && redirectResult.user) {
        const saplingUser = this.mapFirebaseUser(redirectResult.user);
        this.saveUser(saplingUser);
        return saplingUser;
      }
      return null;
    } catch (err: any) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(AUTH_REDIRECT_MARKER);
        }
      } catch {}

      // Log non-sensitive diagnostics
      console.error("[AuthService] Redirect result error:", {
        code: err?.code,
        message: err?.message
      });

      this.redirectError = this.formatAuthError(err);
      // Never crash startup on redirect failure
      return null;
    }
  }

  /**
   * Unified authentication initialization sequence to prevent race conditions
   * between getRedirectResult and onAuthStateChanged.
   */
  public async initializeAuth(): Promise<User | null> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      if (!auth) {
        return this.getCurrentUser();
      }

      // Step 1: Process redirect result first
      const redirectUser = await this.handleRedirectResult();
      if (redirectUser) {
        return redirectUser;
      }

      // Step 2: If redirect result had no user, check if already signed in
      if (auth.currentUser) {
        const activeUser = this.mapFirebaseUser(auth.currentUser);
        this.saveUser(activeUser);
        return activeUser;
      }

      // Step 3: Await initial auth state resolution
      return new Promise<User | null>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
          unsubscribe();
          if (fbUser) {
            const user = this.mapFirebaseUser(fbUser);
            this.saveUser(user);
            resolve(user);
          } else {
            const cached = this.getCurrentUser();
            if (cached?.isAnonymous) {
              resolve(cached);
            } else {
              this.saveUser(null);
              resolve(null);
            }
          }
        }, (err) => {
          console.error("[AuthService] Initial auth state error:", {
            code: (err as any)?.code,
            message: err?.message
          });
          resolve(this.getCurrentUser());
        });
      });
    })();

    return this.initPromise;
  }

  /**
   * Checks whether the current production environment has aligned authDomain
   * (e.g. via Vercel reverse proxy or custom domain) to safely support redirect
   * authentication without hitting third-party storage partitioning restrictions.
   */
  public isRedirectAuthSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const currentHost = window.location.hostname;
    const configuredAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '';
    // Supported if running on same domain as authDomain or custom reverse proxy
    return Boolean(configuredAuthDomain && configuredAuthDomain === currentHost);
  }

  /**
   * Universal Popup-First Google Sign-In:
   * Uses signInWithPopup() as the primary authentication flow across desktop and mobile.
   * This bypasses third-party storage partitioning restrictions (Chrome M115+, Safari ITP)
   * while the app is hosted on Vercel with sapling-13e4f.firebaseapp.com authDomain.
   * If popup is blocked, only falls back to redirect if the infrastructure is configured for it.
   */
  public async signInWithGoogle(): Promise<User | null> {
    if (!this.isConfigured() || !auth) {
      throw new Error(
        "Firebase is not configured in .env.local. Add your VITE_FIREBASE_* credentials to enable live Google sign-in."
      );
    }

    // Protect against duplicate concurrent popup requests
    if (this.googleAuthInFlight) {
      return this.googleAuthInFlight;
    }

    this.googleAuthInFlight = (async () => {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = this.mapFirebaseUser(result.user);
        this.saveUser(user);
        return user;
      } catch (err: any) {
        const code = err?.code || '';

        // If and ONLY IF popup fails specifically due to environment/popup restrictions:
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          // Only attempt redirect if production has verified redirect infrastructure (aligned authDomain)
          if (this.isRedirectAuthSupported()) {
            console.warn("[AuthService] Popup restricted; falling back to configured redirect auth.");
            try {
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(AUTH_REDIRECT_MARKER, 'google');
              }
              await signInWithRedirect(auth, googleProvider);
              return null;
            } catch (redirectErr: any) {
              try {
                if (typeof sessionStorage !== 'undefined') {
                  sessionStorage.removeItem(AUTH_REDIRECT_MARKER);
                }
              } catch {}
              throw new Error(this.formatAuthError(redirectErr));
            }
          }

          // If redirect infrastructure is not configured, show clear actionable instruction instructing the user to allow popups / retry
          if (code === 'auth/popup-blocked') {
            throw new Error(
              'Your browser blocked the Google sign-in window. Please allow popups for this site and try again.'
            );
          } else {
            throw new Error(
              'Popup authentication is not supported or restricted in this browser environment. Please allow popups or open this site in a standard mobile browser (Chrome/Safari).'
            );
          }
        }

        // For all other errors (unauthorized-domain, network failure, user cancellation, etc.), show error without redirecting
        throw new Error(this.formatAuthError(err));
      } finally {
        this.googleAuthInFlight = null;
      }
    })();

    return this.googleAuthInFlight;
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
    this.redirectError = null;
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(AUTH_REDIRECT_MARKER);
      }
    } catch {}
    if (currentUid && !currentUid.startsWith('guest_')) {
      storageService.purgeAuthenticatedStorage(currentUid);
    }
  }

  /**
   * Translates Firebase auth errors into human-readable terminal telemetry
   * Logs non-sensitive diagnostics to console while returning clear messages to UI
   */
  public formatAuthError(err: any): string {
    const code = typeof err?.code === 'string' ? err.code : '';
    const message = typeof err?.message === 'string' ? err.message : '';
    const name = typeof err?.name === 'string' ? err.name : 'AuthError';

    // Safe diagnostic logging: strictly captures code, name, message, and non-sensitive appName
    // NEVER logs access tokens, refresh tokens, passwords, API keys, or OAuth credentials
    if (typeof window !== 'undefined') {
      console.error("[Auth Diagnostic]", {
        code: code || 'unknown_code',
        name,
        message: message || 'No error message provided',
        appName: err?.customData?.appName,
        tenantId: err?.customData?.tenantId
      });
    }

    if (code === 'auth/internal-error' || message.includes('auth/internal-error')) {
      return 'Google could not complete the connection. Please try again.';
    }
    if (code === 'auth/popup-blocked' || message.includes('popup-blocked')) {
      return 'Your browser blocked the Google sign-in window. Please allow popups for this site and try again.';
    }
    if (
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/popup-closed-by-user' ||
      message.includes('popup-closed-by-user') ||
      message.includes('cancelled-popup-request')
    ) {
      return 'Sign-in was cancelled before completion. Please try again.';
    }
    if (code === 'auth/operation-not-supported-in-this-environment' || message.includes('operation-not-supported')) {
      return 'Popup authentication is restricted in this browser environment. Please allow popups or open this site in a standard mobile browser (Chrome/Safari).';
    }
    if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
      return 'Network communication failed. Please check your internet connection and retry.';
    }
    if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
      return 'Current domain is not authorized in Firebase Console > Authentication > Settings > Authorized domains.';
    }
    if (code === 'auth/configuration-not-found' || message.includes('configuration-not-found')) {
      return 'Authentication configuration not found for this project. Please check Firebase configuration.';
    }
    if (code === 'auth/account-exists-with-different-credential') {
      return 'An account already exists with the same email using a different sign-in method.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email cipher or security key.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'A seed profile with this email address already exists.';
    }
    if (code === 'auth/weak-password') {
      return 'Security key is too short. Must be at least 6 characters.';
    }
    if (code === 'auth/invalid-email') {
      return 'Invalid email address format.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Access temporarily restricted due to repeated attempts. Please wait a moment.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'This authentication provider is not enabled in your Firebase project console.';
    }

    // Strip raw "Firebase: Error (...)" text for clean presentation
    if (message.startsWith('Firebase:')) {
      return 'Google could not complete the connection. Please try again.';
    }

    return message || 'Authentication encountered an unexpected issue. Please try again.';
  }
}

export const authService = new AuthService();
