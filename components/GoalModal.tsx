import React, { useState } from 'react';
import { TimelineType, TreeType, SaplingGoal } from '../types';
import { TREE_CONFIGS } from '../constants';
import PixelButton from './PixelButton';

interface Props {
  onClose: () => void;
  onSubmit: (goal: Partial<SaplingGoal>) => void;
}

const TreeIcon: React.FC<{ type: TreeType; active: boolean }> = ({ type, active }) => {
  const color = TREE_CONFIGS[type]?.color || '#444';
  const displayColor = active ? color : '#333';
  
  const paths: Record<string, React.ReactNode> = {
    [TreeType.OAK]: (
      <path d="M12 3c-3.3 0-6 2.7-6 6 0 2.2 1.2 4.1 3 5.2V21h6v-6.8c1.8-1.1 3-3 3-5.2 0-3.3-2.7-6-6-6z" />
    ),
    [TreeType.CHERRY_BLOSSOM]: (
      <g>
        <path d="M12 21v-4" />
        <circle cx="12" cy="8" r="4" />
        <circle cx="8" cy="11" r="3" />
        <circle cx="16" cy="11" r="3" />
      </g>
    ),
    [TreeType.PINE]: (
      <path d="M12 2L4 16h16L12 2zm0 4l5 10H7L12 6zm0 15v-5" />
    ),
    [TreeType.BAMBOO]: (
      <path d="M9 21V3M15 21V3M7 8l2-2M17 10l-2-2" strokeWidth="2" />
    ),
    [TreeType.CACTUS]: (
      <path d="M12 21V5c0-1.7-1.3-3-3-3S6 3.3 6 5v5m6 0h3c1.7 0 3 1.3 3 3v4" strokeWidth="2" />
    ),
    [TreeType.MAPLE]: (
      <path d="M12 2l2 4 5 1-4 4 1 5-4-2-4 2 1-5-4-4 5-1z" />
    ),
    [TreeType.BAOBAB]: (
      <path d="M7 21h10v-6c0-4-2-6-5-6s-5 2-5 6v6z" />
    ),
    [TreeType.CEDAR]: (
      <path d="M12 2L6 18h12L12 2zm0 6l3 9H9l3-9z" />
    ),
    [TreeType.WILLOW]: (
      <path d="M12 3v18M12 8c-4 0-6 4-6 8M12 10c4 0 6 4 6 8" strokeWidth="2" />
    ),
    [TreeType.SEQUOIA]: (
      <path d="M10 21h4V5l-2-2-2 2v16z" fill="currentColor" />
    ),
    [TreeType.BONSAI]: (
      <path d="M8 21h8M12 21V16M12 16c-3 0-4-2-4-4s2-4 4-4 4 2 4 4-2 4-4 4z" strokeWidth="1.5" />
    )
  };

  return (
    <svg 
      width="28" height="28" viewBox="0 0 24 24" 
      fill={active ? displayColor : "none"} 
      stroke={displayColor} 
      strokeWidth="1.5"
      className="mb-1.5 transition-all duration-300"
    >
      {paths[type] || paths[TreeType.OAK]}
    </svg>
  );
};

const NumberInput: React.FC<{ value: number; onChange: (v: number) => void; label: string }> = ({ value, onChange, label }) => (
  <div className="flex bg-[#0a0a0a] border-2 border-green-950 items-center overflow-hidden h-12">
    <div className="flex-1 text-center py-2">
      <span className="pixel-font text-base text-zinc-100">{value}</span>
    </div>
    <div className="flex flex-col border-l-2 border-green-950 h-full w-10 shrink-0">
      <button 
        type="button"
        onClick={() => onChange(value + 1)} 
        className="flex-1 flex items-center justify-center hover:bg-green-950/40 text-green-500 hover:text-green-300 transition-colors"
        aria-label={`Increase ${label}`}
      >
        <span className="text-[9px]">▲</span>
      </button>
      <button 
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))} 
        className="flex-1 flex items-center justify-center border-t-2 border-green-950 hover:bg-green-950/40 text-green-500 hover:text-green-300 transition-colors"
        aria-label={`Decrease ${label}`}
      >
        <span className="text-[9px]">▼</span>
      </button>
    </div>
  </div>
);

const GoalModal: React.FC<Props> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<TreeType>(TreeType.OAK);
  const [timeline, setTimeline] = useState<TimelineType>(TimelineType.DAY);
  const [durationValue, setDurationValue] = useState(2); 
  const [focusValue, setFocusValue] = useState(4);
  const [focusUnit, setFocusUnit] = useState<'hrs' | 'mins'>('hrs');

  const calculateTotalMinutes = () => {
    let days = durationValue;
    if (timeline === TimelineType.WEEK) days = durationValue * 7;
    if (timeline === TimelineType.MONTH) days = durationValue * 30;
    if (timeline === TimelineType.YEAR) days = durationValue * 365;
    
    const dailyMins = focusUnit === 'hrs' ? focusValue * 60 : focusValue;
    return dailyMins * days;
  };

  const getMaturityText = () => {
    const totalMinutes = calculateTotalMinutes();
    const d = Math.floor(totalMinutes / 1440);
    const h = Math.floor((totalMinutes % 1440) / 60);
    const m = totalMinutes % 60;
    
    let parts = [];
    if (d > 0) parts.push(`${d} ${d === 1 ? 'day' : 'days'}`);
    if (h > 0) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`);
    if (m > 0) {
      if (parts.length > 0) parts.push('and');
      parts.push(`${m} ${m === 1 ? 'min' : 'mins'}`);
    }
    
    if (parts.includes('and')) {
       const andIdx = parts.indexOf('and');
       if (andIdx === parts.length - 1) parts.splice(andIdx, 1);
    }

    return `Tree matures upon reaching ${parts.join(' ')} of focused ritual`;
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    let days = durationValue;
    if (timeline === TimelineType.WEEK) days = durationValue * 7;
    if (timeline === TimelineType.MONTH) days = durationValue * 30;
    if (timeline === TimelineType.YEAR) days = durationValue * 365;

    const dailyTarget = focusUnit === 'hrs' ? focusValue * 60 : focusValue;

    onSubmit({
      name,
      type,
      timeline,
      durationInDays: days,
      dailyTargetMinutes: dailyTarget,
      totalTargetMinutes: calculateTotalMinutes(),
      accruedMinutes: 0,
      startDate: Date.now(),
      isComplete: false,
      health: 100,
      perfectionScore: 1.0
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-2 sm:p-4 z-[150] animate-in fade-in duration-200 backdrop-blur-sm pb-safe pt-safe">
      <div className="bg-[#0f140f] w-full max-w-md max-h-[92vh] border-2 border-green-950/60 flex flex-col relative shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
        
        {/* Header */}
        <header className="px-4 sm:px-5 py-3.5 border-b-2 border-green-950/40 flex justify-between items-center bg-[#070e07] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 inline-block" />
            <h2 className="pixel-font text-xs sm:text-sm text-zinc-100 uppercase tracking-wider">PLANT NEW SEED</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-green-600 hover:text-green-300 text-xl font-bold transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-5">
          <section className="space-y-1.5">
            <label htmlFor="goal-name-input" className="block pixel-font text-[8px] sm:text-[9px] text-green-500 uppercase tracking-[0.2em] font-bold">
              INTENT
            </label>
            <div className="bg-black border-2 border-green-950/60 p-2.5 sm:p-3 flex items-center">
              <input 
                id="goal-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Intent or Goal..."
                className="w-full bg-transparent outline-none pixel-font text-[9px] sm:text-[10px] text-zinc-200 placeholder:text-zinc-700"
                maxLength={40}
              />
            </div>
          </section>

          <section className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="pixel-font text-[8px] sm:text-[9px] text-green-500 uppercase tracking-[0.2em] font-bold">TREE VARIETY</span>
              <span className="pixel-font text-[8px] text-green-400 uppercase font-bold">{type}</span>
            </div>
            <div className="grid grid-cols-2 min-[380px]:grid-cols-3 gap-1.5 sm:gap-2 max-h-44 overflow-y-auto p-1 bg-black/40 border border-green-950/40">
              {Object.values(TreeType).map(t => (
                <button 
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`group flex flex-col items-center justify-center p-2 sm:p-2.5 border-2 transition-all duration-200 min-h-[44px] ${
                    type === t ? 'border-green-500 bg-green-950/40 shadow-sm' : 'border-green-950/40 bg-[#061006] hover:border-green-800'
                  }`}
                >
                  <TreeIcon type={t} active={type === t} />
                  <span className={`pixel-font text-[7px] uppercase tracking-wider text-center line-clamp-1 ${type === t ? 'text-green-300 font-bold' : 'text-zinc-500'}`}>
                    {t}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-1.5">
            <span className="block pixel-font text-[8px] sm:text-[9px] text-green-500 uppercase tracking-[0.2em] font-bold">GOAL HORIZON</span>
            <div className="flex gap-2">
              <div className="w-20 shrink-0">
                <NumberInput value={durationValue} onChange={setDurationValue} label="duration" />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-1.5">
                 {[TimelineType.DAY, TimelineType.WEEK, TimelineType.MONTH, TimelineType.YEAR].map(tl => (
                   <button 
                    key={tl} 
                    type="button"
                    onClick={() => setTimeline(tl)}
                    className={`pixel-font text-[8px] py-2 px-1 border-2 transition-all flex items-center justify-center min-h-[44px] ${
                      timeline === tl ? 'border-green-500 text-white bg-green-900/40 shadow-sm font-bold' : 'border-green-950/40 bg-[#061006] text-zinc-500 hover:text-zinc-300'
                    }`}
                   >
                     {tl.toUpperCase()}
                   </button>
                 ))}
              </div>
            </div>
          </section>

          <section className="space-y-1.5">
            <span className="block pixel-font text-[8px] sm:text-[9px] text-green-500 uppercase tracking-[0.2em] font-bold">DAILY RITUAL</span>
            <div className="flex gap-2">
              <div className="w-20 shrink-0">
                <NumberInput value={focusValue} onChange={setFocusValue} label="daily ritual target" />
              </div>
              <div className="flex-1 flex gap-1.5">
                 {['hrs', 'mins'].map(u => (
                   <button 
                    key={u} 
                    type="button"
                    onClick={() => setFocusUnit(u as any)}
                    className={`flex-1 pixel-font text-[9px] py-2 border-2 transition-all flex items-center justify-center min-h-[44px] ${
                      focusUnit === u ? 'border-green-500 text-white bg-green-900/40 shadow-sm font-bold' : 'border-green-950/40 bg-[#061006] text-zinc-500 hover:text-zinc-300'
                    }`}
                   >
                     {u.toUpperCase()}
                   </button>
                 ))}
              </div>
            </div>
          </section>

          {/* Maturity Projection */}
          <section className="p-2.5 sm:p-3 bg-[#070e07] border border-green-950/50 text-center">
            <p className="pixel-font text-[7.5px] sm:text-[8px] text-green-400 uppercase leading-relaxed tracking-wider">
              {getMaturityText()}
            </p>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t-2 border-green-950/40 bg-[#070e07] shrink-0 flex gap-2 sm:gap-3">
           <PixelButton onClick={onClose} variant="secondary" className="flex-1 py-3 text-[9px] sm:text-[10px] h-11">
             CANCEL
           </PixelButton>
           <PixelButton onClick={handleCreate} variant="success" className="flex-[2] py-3 text-[9px] sm:text-[10px] h-11" disabled={!name.trim()}>
             PLANT SEED
           </PixelButton>
        </div>
      </div>
    </div>
  );
};

export default GoalModal;
