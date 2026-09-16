import React from 'react';
import { openExternalSupport } from '../services/supportService';

interface Props {
  onClose: () => void;
  onOpenCommunity?: (tab?: 'feedback' | 'support' | 'contact') => void;
}

const SanctuaryModal: React.FC<Props> = ({ onClose, onOpenCommunity }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[300] animate-in fade-in duration-300 backdrop-blur-md pb-safe pt-safe"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sanctuary-title"
    >
      <div 
        className="bg-[#0e120e] w-full max-w-[380px] border-2 border-emerald-900/60 p-6 sm:p-8 flex flex-col items-center text-center shadow-[0_0_80px_rgba(0,0,0,0.9)] relative rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sanctuary Heart Icon */}
        <div className="mb-6 text-emerald-400 p-3 bg-emerald-950/40 rounded-full border border-emerald-500/30">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>

        <h2 id="sanctuary-title" className="pixel-font text-sm sm:text-base text-white uppercase tracking-wider leading-tight mb-4">
          THE SANCTUARY
        </h2>

        <div className="space-y-3 mb-6 text-zinc-400 text-xs leading-relaxed">
          <p className="font-semibold text-emerald-300">
            Sapling's core experience is free to use.
          </p>
          <p>
            Your grove — your roots, rituals, and voxel canopies — belongs to you. 
            There are no forced paywalls, advertisements, or attention auctions in this soil.
          </p>
          <p className="text-[11px] text-zinc-500">
            If Sapling brings clarity and stillness to your work, voluntary contributions help keep the grove alive and flourishing.
          </p>
        </div>

        <div className="w-full space-y-2.5">
          <button 
            onClick={() => {
              if (onOpenCommunity) {
                onClose();
                onOpenCommunity('support');
              } else {
                openExternalSupport();
              }
            }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-semibold rounded shadow-[0_0_15px_rgba(16,185,129,0.25)] active:scale-[0.98] transition-all pixel-font text-[11px] uppercase tracking-wider"
          >
            Support the Grove ↗
          </button>

          <button 
            onClick={() => {
              if (onOpenCommunity) {
                onClose();
                onOpenCommunity('feedback');
              } else {
                onClose();
              }
            }}
            className="w-full py-2 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/40 text-emerald-300 rounded active:scale-[0.98] transition-all pixel-font text-[10px] uppercase tracking-wider"
          >
            Leave a Field Report
          </button>

          <button 
            onClick={onClose}
            className="w-full py-1.5 text-zinc-500 hover:text-zinc-300 pixel-font text-[9px] uppercase tracking-widest transition-colors"
          >
            Return to Soil
          </button>
        </div>

        <div className="mt-6 w-full border-t border-emerald-950/60 pt-4 flex flex-col items-center">
          <span className="pixel-font text-[8px] text-zinc-600 uppercase tracking-widest font-mono">
            Open Web Sanctuary • No Trackers
          </span>
        </div>
      </div>
    </div>
  );
};

export default SanctuaryModal;
