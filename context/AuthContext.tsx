import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthSession } from '../types';
import { authService } from '../services/authService';

interface AuthContextValue extends AuthSession {
  isLoading: boolean;
  isGoogleConfigured: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Check for existing user session
    const existing = authService.getCurrentUser();
    if (existing) {
      setUser(existing);
    }
    setIsLoading(false);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const loggedUser = await authService.signInWithGoogle();
      setUser(loggedUser);
      setShowAuthModal(false);
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
    setIsLoading(false);
  }, []);

  const continueAsGuest = useCallback(() => {
    const guestUser = authService.createGuestSession();
    setUser(guestUser);
    setShowAuthModal(false);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    provider: user ? (user.isAnonymous ? 'guest' : 'google') : null,
    isAuthenticated: Boolean(user && !user.isAnonymous),
    isLoading,
    isGoogleConfigured: authService.isGoogleConfigured(),
    showAuthModal,
    setShowAuthModal,
    signInWithGoogle,
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
