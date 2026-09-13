import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthSession, AuthProviderType } from '../types';
import { authService } from '../services/authService';

interface AuthContextValue extends AuthSession {
  isLoading: boolean;
  isConfigured: boolean;
  isGoogleConfigured: boolean;
  redirectError: string | null;
  clearRedirectError: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [providerType, setProviderType] = useState<AuthProviderType>(() => {
    const cached = authService.getCurrentUser();
    if (!cached) return null;
    return cached.isAnonymous ? 'guest' : 'google';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const clearRedirectError = useCallback(() => {
    authService.clearRedirectError();
    setRedirectError(null);
  }, []);

  useEffect(() => {
    let unsubscribeLive: (() => void) | null = null;
    let isMounted = true;

    // Unified auth boot: resolves redirect result first, then falls back to current auth state
    authService.initializeAuth().then((bootUser) => {
      if (!isMounted) return;
      setUser(bootUser);
      if (bootUser) {
        setProviderType(bootUser.isAnonymous ? 'guest' : 'google');
      } else {
        setProviderType(null);
      }
      setRedirectError(authService.getRedirectError());
      setIsLoading(false);

      // Now attach live onAuthStateChanged listener for ongoing auth events (token refresh, signout, etc.)
      unsubscribeLive = authService.subscribeToAuthState((activeUser) => {
        if (!isMounted) return;
        setUser(activeUser);
        if (activeUser) {
          setProviderType(activeUser.isAnonymous ? 'guest' : 'google');
        } else {
          setProviderType(null);
        }
      });
    }).catch((err) => {
      if (!isMounted) return;
      console.error("[AuthProvider] Auth initialization error:", err);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      if (unsubscribeLive) {
        unsubscribeLive();
      }
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setRedirectError(null);
    try {
      const loggedUser = await authService.signInWithGoogle();
      if (loggedUser) {
        setUser(loggedUser);
        setProviderType('google');
        setShowAuthModal(false);
      }
      // On mobile redirect, browser will navigate away to Google
    } catch (err: any) {
      setRedirectError(err.message || 'Google authentication error.');
      throw err;
    } finally {
      if (!authService.isAuthRedirectInProgress()) {
        setIsLoading(false);
      }
    }
  }, []);

  const signInWithGithub = useCallback(async () => {
    setIsLoading(true);
    try {
      const loggedUser = await authService.signInWithGithub();
      setUser(loggedUser);
      setProviderType('github');
      setShowAuthModal(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const loggedUser = await authService.signInWithEmail(email, pass);
      setUser(loggedUser);
      setProviderType('password');
      setShowAuthModal(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pass: string, displayName: string) => {
    setIsLoading(true);
    try {
      const loggedUser = await authService.signUpWithEmail(email, pass, displayName);
      setUser(loggedUser);
      setProviderType('password');
      setShowAuthModal(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await authService.sendPasswordReset(email);
  }, []);

  const continueAsGuest = useCallback(async () => {
    setIsLoading(true);
    try {
      const guestUser = await authService.createGuestSession();
      setUser(guestUser);
      setProviderType('guest');
      setShowAuthModal(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setProviderType(null);
    setRedirectError(null);
  }, []);

  const isConfigured = authService.isConfigured();

  const value: AuthContextValue = {
    user,
    provider: user ? (user.isAnonymous ? 'guest' : providerType || 'google') : null,
    isAuthenticated: Boolean(user && !user.isAnonymous),
    isLoading,
    isConfigured,
    isGoogleConfigured: isConfigured,
    redirectError,
    clearRedirectError,
    showAuthModal,
    setShowAuthModal,
    signInWithGoogle,
    signInWithGithub,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    continueAsGuest,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
