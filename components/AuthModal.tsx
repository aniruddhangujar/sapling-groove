import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PixelButton from './PixelButton';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

const AuthModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { isGoogleConfigured, signInWithGoogle, continueAsGuest } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error.');
      setIsSigningIn(false);
    }
  };

  const handleGuestEntry = () => {
    continueAsGuest();
    onSuccess?.();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-3 sm:p-4 z-[250] animate-in fade-in duration-200 backdrop-blur-md pb-safe pt-safe"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-[#0c130c] w-full max-w-sm border-2 border-green-950/80 p-5 sm:p-7 flex flex-col relative shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Terminal Corner Brackets */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-green-500/50" />
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-green-500/50" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-green-900/40 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 animate-pulse" />
            <h2 id="auth-modal-title" className="pixel-font text-xs sm:text-sm text-white uppercase tracking-wider font-bold">
              TERMINAL ACCESS
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-7 h-7 flex items-center justify-center text-green-500 hover:text-green-300 text-lg font-bold transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Body Content */}
        <div className="space-y-4 text-center">
          <div className="p-3 bg-[#061006] border border-green-950/60 text-left space-y-1">
            <div className="text-[7.5px] pixel-font text-green-500 uppercase tracking-widest font-bold">
              &gt; PROTOCOL_STATUS
            </div>
            <p className="text-xs text-green-300/90 font-mono leading-relaxed">
              Authenticate to preserve your grove across the solarpunk lattice.
            </p>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-950/30 border border-red-900/60 text-left text-[9px] text-red-300 font-mono">
              {errorMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleAuth}
              disabled={isSigningIn}
              className="w-full py-3.5 px-4 bg-[#081808] hover:bg-[#0e2c0e] border-2 border-green-600 text-green-200 pixel-corners flex items-center justify-center gap-3 transition-all duration-200 shadow-md min-h-[46px] group"
            >
              {/* Google G Logo in Retro Vector */}
              <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                <path fill="#4ade80" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#22c55e" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#e3aa00" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#86efac" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span className="pixel-font text-[9px] uppercase tracking-wider font-bold group-hover:text-white">
                {isSigningIn ? 'AUTHENTICATING...' : 'CONTINUE WITH GOOGLE'}
              </span>
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-[1px] bg-green-950 flex-1" />
              <span className="pixel-font text-[7px] text-green-600 uppercase tracking-widest font-bold">OR</span>
              <div className="h-[1px] bg-green-950 flex-1" />
            </div>

            {/* Guest Mode Button */}
            <PixelButton
              onClick={handleGuestEntry}
              variant="secondary"
              className="w-full py-3 text-[9px] min-h-[44px]"
            >
              CONTINUE AS GUEST
            </PixelButton>
          </div>

          <p className="pixel-font text-[6.5px] text-green-600/80 uppercase tracking-widest pt-2">
            Guest sessions store all data locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
