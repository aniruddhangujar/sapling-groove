import { User } from '../types';

const AUTH_USER_KEY = 'sapling_auth_user_v1';

export class AuthService {
  private googleClientId: string | undefined;

  constructor() {
    this.googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  }

  /**
   * Returns whether Google OAuth credentials are configured
   */
  public isGoogleConfigured(): boolean {
    return Boolean(this.googleClientId && this.googleClientId.trim().length > 0);
  }

  /**
   * Retrieves the currently active user (stored in session/local storage)
   */
  public getCurrentUser(): User | null {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY);
      if (!saved) return null;
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  }

  /**
   * Initiates Google Sign-In flow
   * If Google Client ID is configured, triggers standard OAuth.
   * If not configured, returns clear error without faking credentials.
   */
  public async signInWithGoogle(): Promise<User> {
    if (!this.isGoogleConfigured()) {
      throw new Error(
        "Google Sign-In is prepared in the architecture, but VITE_GOOGLE_CLIENT_ID is not configured in the environment."
      );
    }

    // Future OAuth client redirection / popup integration
    // When Google Client ID is supplied, the Google Identity Services client script will mount here.
    throw new Error("Google OAuth initialization pending client credential binding.");
  }

  /**
   * Continues as an anonymous guest user
   */
  public createGuestSession(): User {
    const guestUser: User = {
      id: 'guest_' + Math.random().toString(36).substr(2, 9),
      email: 'guest@sapling.local',
      displayName: 'Grove Wanderer',
      createdAt: Date.now(),
      isAnonymous: true
    };
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(guestUser));
    } catch (e) {}
    return guestUser;
  }

  /**
   * Signs out the user and clears session
   */
  public async signOut(): Promise<void> {
    try {
      localStorage.removeItem(AUTH_USER_KEY);
    } catch (e) {}
  }
}

export const authService = new AuthService();
