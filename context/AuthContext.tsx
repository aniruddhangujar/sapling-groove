import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthSession, AuthProviderType } from '../types';
import { authService } from '../services/authService';

interface AuthContextValue extends AuthSession {
  isLoading: boolean;
  isConfigured: boolean;
  isGoogleConfigured: boolean;
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
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Subscribe to live Firebase auth state changes
    const unsubscribe = authService.subscribeToAuthState((activeUser) => {
      setUser(activeUser);
      if (activeUser) {
        setProviderType(activeUser.isAnonymous ? 'guest' : 'google');
      } else {
        setProviderType(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const loggedUser = await authService.signInWithGoogle();
      setUser(loggedUser);
      setProviderType('google');
      setShowAuthModal(false);
    } finally {
      setIsLoading(false);
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
  }, []);

  const isConfigured = authService.isConfigured();

  const value: AuthContextValue = {
    user,
    provider: user ? (user.isAnonymous ? 'guest' : providerType || 'google') : null,
    isAuthenticated: Boolean(user && !user.isAnonymous),
    isLoading,
    isConfigured,
    isGoogleConfigured: isConfigured,
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
