import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PixelButton from './PixelButton';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthTab = 'oauth' | 'email' | 'guest';
type EmailMode = 'signin' | 'signup' | 'reset';

const AuthModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { 
    isConfigured, 
    signInWithGoogle, 
    signInWithGithub, 
    signInWithEmail, 
    signUpWithEmail, 
    sendPasswordReset, 
    continueAsGuest 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>('oauth');
  const [emailMode, setEmailMode] = useState<EmailMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, onClose]);

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setIsProcessing(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGithubAuth = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setIsProcessing(true);
    try {
      await signInWithGithub();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'GitHub authentication error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (emailMode === 'reset') {
      setIsProcessing(true);
      try {
        await sendPasswordReset(email.trim());
        setStatusMsg('Password reset instructions sent to your email.');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to send password reset email.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your security cipher key (password).');
      return;
    }

    setIsProcessing(true);
    try {
      if (emailMode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, displayName.trim() || 'Botanical Operative');
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGuestEntry = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setIsProcessing(true);
    try {
      await continueAsGuest();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Guest session initialization error.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-3 sm:p-4 z-[250] animate-in fade-in duration-200 backdrop-blur-md pb-safe pt-safe"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-[#081208] w-full max-w-md border-2 border-green-950/90 p-5 sm:p-7 flex flex-col relative shadow-[0_0_80px_rgba(0,0,0,0.98)] overflow-hidden">
        {/* Terminal Corner Brackets */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-green-500/60" />
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-green-500/60" />
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-green-500/60" />
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-green-500/60" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-green-900/50 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-400 animate-pulse rounded-none shadow-[0_0_8px_#22c55e]" />
            <div>
              <h2 id="auth-modal-title" className="pixel-font text-xs sm:text-sm text-white uppercase tracking-wider font-bold">
                IDENTITY LATTICE
              </h2>
              <p className="text-[7px] font-mono text-green-500/80 tracking-widest uppercase">
                TERMINAL // ACCESS GATE
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isProcessing}
            className="w-7 h-7 flex items-center justify-center text-green-500 hover:text-green-300 text-lg font-bold transition-colors disabled:opacity-50"
            aria-label="Close authentication modal"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 border border-green-950 bg-[#040b04] p-1 mb-4">
          <button
            type="button"
            onClick={() => { setActiveTab('oauth'); setErrorMsg(null); }}
            className={`py-1.5 px-2 text-[7.5px] pixel-font uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
              activeTab === 'oauth'
                ? 'bg-green-500/20 text-white border border-green-400/80 shadow-[0_0_10px_rgba(74,222,128,0.2)] font-bold'
                : 'text-green-400/70 hover:text-green-200 border border-transparent'
            }`}
          >
            <span>SOCIAL</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('email'); setErrorMsg(null); }}
            className={`py-1.5 px-2 text-[7.5px] pixel-font uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
              activeTab === 'email'
                ? 'bg-green-500/20 text-white border border-green-400/80 shadow-[0_0_10px_rgba(74,222,128,0.2)] font-bold'
                : 'text-green-400/70 hover:text-green-200 border border-transparent'
            }`}
          >
            <span>EMAIL</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('guest'); setErrorMsg(null); }}
            className={`py-1.5 px-2 text-[7.5px] pixel-font uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
              activeTab === 'guest'
                ? 'bg-green-500/20 text-white border border-green-400/80 shadow-[0_0_10px_rgba(74,222,128,0.2)] font-bold'
                : 'text-green-400/70 hover:text-green-200 border border-transparent'
            }`}
          >
            <span>GUEST</span>
          </button>
        </div>

        {/* Status / Error Diagnostic Telemetry */}
        {errorMsg && (
          <div className="mb-4 p-2.5 bg-red-950/40 border border-red-900/80 text-left text-[8.5px] text-red-300 font-mono flex items-start gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <span className="text-red-400 font-bold">!</span>
            <div className="flex-1 leading-snug">{errorMsg}</div>
          </div>
        )}

        {statusMsg && (
          <div className="mb-4 p-2.5 bg-green-950/40 border border-green-700/80 text-left text-[8.5px] text-green-300 font-mono flex items-start gap-2">
            <span className="text-green-400 font-bold">✓</span>
            <div className="flex-1 leading-snug">{statusMsg}</div>
          </div>
        )}

        {/* Tab 1: Social OAuth (Google & GitHub) */}
        {activeTab === 'oauth' && (
          <div className="space-y-3">
            <div className="p-2.5 bg-[#040e04] border border-green-950 text-left space-y-0.5">
              <div className="text-[7px] pixel-font text-green-500 uppercase tracking-widest font-bold">
                &gt; OAUTH_CHANNELS
              </div>
              <p className="text-[10px] text-green-300/80 font-mono leading-relaxed">
                Connect via external biometric identity provider to synchronize your grove across devices.
              </p>
            </div>

            {/* Google Sign-In */}
            <button
              onClick={handleGoogleAuth}
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-[#0a180a] hover:bg-[#102c10] border-2 border-green-600/80 hover:border-green-400 text-green-200 pixel-corners flex items-center justify-center gap-3 transition-all duration-200 shadow-md min-h-[46px] group press-tactile disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                <path fill="#4ade80" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#22c55e" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#e3aa00" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#86efac" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span className="pixel-font text-[8.5px] sm:text-[9px] uppercase tracking-wider font-bold group-hover:text-white">
                {isProcessing ? 'AUTHENTICATING...' : 'CONTINUE WITH GOOGLE'}
              </span>
            </button>

            {/* GitHub Sign-In */}
            <button
              onClick={handleGithubAuth}
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-[#0a180a] hover:bg-[#102c10] border-2 border-green-700/80 hover:border-green-400 text-green-200 pixel-corners flex items-center justify-center gap-3 transition-all duration-200 shadow-md min-h-[46px] group press-tactile disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-[#4ade80] group-hover:text-white transition-colors">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span className="pixel-font text-[8.5px] sm:text-[9px] uppercase tracking-wider font-bold group-hover:text-white">
                {isProcessing ? 'AUTHENTICATING...' : 'CONTINUE WITH GITHUB'}
              </span>
            </button>

            {!isConfigured && (
              <div className="p-2 border border-yellow-700/60 bg-yellow-950/20 text-[7.5px] font-mono text-yellow-300/90 leading-relaxed text-left">
                <span className="font-bold text-yellow-400">[ADVISORY]</span> Firebase keys pending in .env.local. You can also explore via the Guest tab below.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Email / Password Form */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div className="flex border-b border-green-950 pb-2 mb-2 gap-4">
              <button
                type="button"
                onClick={() => { setEmailMode('signin'); setErrorMsg(null); }}
                className={`text-[8px] pixel-font uppercase tracking-widest pb-1 transition-colors ${
                  emailMode === 'signin' ? 'text-[#4ade80] border-b-2 border-[#4ade80] font-bold' : 'text-green-700 hover:text-green-400'
                }`}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => { setEmailMode('signup'); setErrorMsg(null); }}
                className={`text-[8px] pixel-font uppercase tracking-widest pb-1 transition-colors ${
                  emailMode === 'signup' ? 'text-[#4ade80] border-b-2 border-[#4ade80] font-bold' : 'text-green-700 hover:text-green-400'
                }`}
              >
                REGISTER SEED
              </button>
              <button
                type="button"
                onClick={() => { setEmailMode('reset'); setErrorMsg(null); }}
                className={`text-[8px] pixel-font uppercase tracking-widest pb-1 transition-colors ml-auto ${
                  emailMode === 'reset' ? 'text-[#4ade80] border-b-2 border-[#4ade80] font-bold' : 'text-green-700 hover:text-green-400'
                }`}
              >
                RECOVER
              </button>
            </div>

            {/* Display Name (Register only) */}
            {emailMode === 'signup' && (
              <div className="text-left space-y-1">
                <label className="text-[7.5px] pixel-font text-green-500 uppercase tracking-widest block">
                  CODENAME / OPERATIVE NAME:
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Sylvan Vanguard"
                  className="w-full bg-[#040e04] border border-green-800/80 focus:border-[#4ade80] focus:ring-1 focus:ring-[#4ade80] text-green-100 font-mono text-xs px-3 py-2 outline-none transition-all"
                  maxLength={40}
                />
              </div>
            )}

            {/* Email Field */}
            <div className="text-left space-y-1">
              <label className="text-[7.5px] pixel-font text-green-500 uppercase tracking-widest block">
                COMMUNICATION ADDRESS (EMAIL):
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operative@domain.com"
                className="w-full bg-[#040e04] border border-green-800/80 focus:border-[#4ade80] focus:ring-1 focus:ring-[#4ade80] text-green-100 font-mono text-xs px-3 py-2 outline-none transition-all"
              />
            </div>

            {/* Password Field (Sign In & Sign Up) */}
            {emailMode !== 'reset' && (
              <div className="text-left space-y-1">
                <label className="text-[7.5px] pixel-font text-green-500 uppercase tracking-widest block">
                  SECURITY CIPHER (PASSWORD):
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#040e04] border border-green-800/80 focus:border-[#4ade80] focus:ring-1 focus:ring-[#4ade80] text-green-100 font-mono text-xs px-3 py-2 outline-none transition-all"
                  minLength={6}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-[#0a220a] hover:bg-[#133e13] border-2 border-green-500 text-[#86efac] pixel-corners flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_0_15px_rgba(34,197,94,0.2)] min-h-[44px] group press-tactile disabled:opacity-50 mt-2"
            >
              <span className="pixel-font text-[8.5px] uppercase tracking-wider font-bold group-hover:text-white">
                {isProcessing ? 'PROCESSING...' : emailMode === 'signin' ? '[ AUTHENTICATE ]' : emailMode === 'signup' ? '[ INITIALIZE SEED ]' : '[ TRANSMIT RESET CIPHER ]'}
              </span>
            </button>
          </form>
        )}

        {/* Tab 3: Guest Access */}
        {activeTab === 'guest' && (
          <div className="space-y-4 text-center">
            <div className="p-3 bg-[#040e04] border border-green-950 text-left space-y-1.5">
              <div className="text-[7.5px] pixel-font text-green-500 uppercase tracking-widest font-bold">
                &gt; LOCAL_SOIL_PROTOCOL
              </div>
              <p className="text-[10.5px] text-green-300/90 font-mono leading-relaxed">
                Guest sessions store all data locally inside your browser cache. Perfect for private exploration without registering credentials.
              </p>
            </div>

            <PixelButton
              onClick={handleGuestEntry}
              variant="success"
              className="w-full py-3.5 text-[9px] min-h-[46px] shadow-[0_0_20px_rgba(34,197,94,0.25)]"
            >
              [ ENTER AS GUEST (OFFLINE SOIL) ]
            </PixelButton>

            <p className="pixel-font text-[6.5px] text-green-600/80 uppercase tracking-widest">
              You can connect an account later to backup your grove to the cloud.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
