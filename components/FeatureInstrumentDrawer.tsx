import React, { useState, useEffect } from 'react';
import { TreeType } from '../types';

export type InstrumentId = 'groove' | 'chronos' | 'grove' | 'logs' | 'pomo' | 'ani';

interface Props {
  instrumentId: InstrumentId | null;
  onClose: () => void;
  onEnterApp: (options?: { openNewSeed?: boolean; presetTree?: TreeType; presetName?: string }) => void;
}

export const FeatureInstrumentDrawer: React.FC<Props> = ({
  instrumentId,
  onClose,
  onEnterApp
}) => {
  // Groove interactive state
  const [grooveSound, setGrooveSound] = useState<'binaural' | 'rain' | 'forest'>('forest');
  const [grooveActive, setGrooveActive] = useState(false);
  const [grooveSeconds, setGrooveSeconds] = useState(0);

  // Chronos interactive state
  const [selectedRitual, setSelectedRitual] = useState<'25-5' | '50-10' | '90-20'>('50-10');

  // Pomo interactive state
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);

  // Ani interactive state
  const [aniInput, setAniInput] = useState('');
  const [aniMessages, setAniMessages] = useState<Array<{ sender: 'ani' | 'user'; text: string }>>([
    {
      sender: 'ani',
      text: 'Greetings, traveler. The grove is quiet and receptive. What intention are you tending today?'
    }
  ]);

  // Groove timer tick
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (grooveActive) {
      timer = setInterval(() => {
        setGrooveSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [grooveActive]);

  // Pomo timer tick
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (pomoRunning && pomoSeconds > 0) {
      timer = setInterval(() => {
        setPomoSeconds(s => s - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [pomoRunning, pomoSeconds]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendAniMessage = (overrideText?: string) => {
    const textToSend = overrideText || aniInput;
    if (!textToSend.trim()) return;

    const userMsg = { sender: 'user' as const, text: textToSend };
    setAniMessages(prev => [...prev, userMsg]);
    setAniInput('');

    // Generate responsive botanical reply
    setTimeout(() => {
      let botReply = 'Focus gathers quietly like morning dew on cedar leaves. Anchor your attention, and growth will follow naturally.';
      const lower = textToSend.toLowerCase();
      if (lower.includes('code') || lower.includes('pine')) {
        botReply = 'For deep programming logic, Pinus Sylvestris (Pine) is resilient. Its needle clusters reflect linear discipline in cold digital environments.';
      } else if (lower.includes('distract') || lower.includes('tired')) {
        botReply = 'Even the ancient Redwood rests between seasonal growth rings. Take three deep breaths, release the noise, and plant a small 15-minute seed.';
      } else if (lower.includes('how') || lower.includes('germinat')) {
        botReply = 'Every minute of focused presence synthesizes cellular wood in real time. Your temporal investment is permanently recorded as unique voxel branch geometry.';
      }
      setAniMessages(prev => [...prev, { sender: 'ani', text: botReply }]);
    }, 600);
  };

  if (!instrumentId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Tactical Container Box */}
      <div 
        className="relative w-full max-w-2xl bg-[#040d05]/95 border border-green-500/60 p-6 sm:p-8 shadow-[0_0_50px_rgba(74,222,128,0.25)] text-[#dde5da] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Tactical Corner HUD Accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#4ade80]" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#4ade80]" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#4ade80]" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#4ade80]" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-green-900/60 pb-3 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="font-orbitron font-bold text-base sm:text-lg text-white tracking-widest uppercase">
              INSTRUMENT // {instrumentId.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-2.5 py-1 border border-green-800/80 hover:border-green-400 text-green-400 font-display text-xs tracking-wider transition-colors press-tactile cursor-pointer"
          >
            [ ESC // CLOSE ]
          </button>
        </div>

        {/* Instrument Specific Dynamic Content */}
        {instrumentId === 'groove' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <img 
                src="/assets/cards/card-groove.jpg" 
                alt="Groove" 
                className="w-24 h-24 object-cover border border-green-500/40 rounded-sm shadow-md"
              />
              <div className="space-y-1">
                <h3 className="font-orbitron text-xl font-bold text-white">FREE-FORM FOCUS</h3>
                <p className="font-editorial text-sm text-zinc-300">
                  No rigid timer boundaries. Immerse in open-ended creative flow while your voxel specimen grows organically.
                </p>
                <div className="font-display text-[10px] text-green-400 uppercase tracking-wider">
                  SYS STATUS: {grooveActive ? 'LIVE FLOW RECORDING' : 'READY TO COMMENCE'}
                </div>
              </div>
            </div>

            {/* Interactive Flow Clock Simulator */}
            <div className="border border-green-900/50 bg-[#061909]/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-display text-zinc-500 tracking-wider">ACTIVE FLOW ELAPSED</div>
                <div className="font-orbitron text-3xl text-[#86efac] font-bold tabular-nums">
                  {formatTime(grooveSeconds)}
                </div>
              </div>

              {/* Soundscapes */}
              <div className="flex gap-2">
                {(['forest', 'rain', 'binaural'] as const).map(snd => (
                  <button
                    key={snd}
                    onClick={() => setGrooveSound(snd)}
                    className={`px-3 py-1.5 border text-[10px] font-display uppercase tracking-wider transition-colors ${
                      grooveSound === snd 
                        ? 'border-[#4ade80] bg-[#4ade80]/20 text-white font-bold' 
                        : 'border-green-900/60 text-green-400/70 hover:text-green-200'
                    }`}
                  >
                    {snd === 'binaural' ? '40Hz BINAURAL' : `${snd.toUpperCase()} HARMONY`}
                  </button>
                ))}
              </div>

              {/* Live Play/Pause Toggle */}
              <button
                onClick={() => setGrooveActive(!grooveActive)}
                className="px-4 py-2 border border-[#4ade80] bg-[#4ade80]/20 hover:bg-[#4ade80] text-[#86efac] hover:text-black font-orbitron font-bold text-xs tracking-wider transition-all press-tactile"
              >
                {grooveActive ? '[ PAUSE FLOW ]' : '[ START FLOW ]'}
              </button>
            </div>

            {/* Launch Action */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  onEnterApp();
                }}
                className="px-6 py-2.5 border border-[#4ade80] bg-[#4ade80] text-black font-orbitron font-bold text-xs tracking-widest uppercase hover:bg-[#86efac] transition-all shadow-[0_0_20px_rgba(74,222,128,0.4)] press-tactile"
              >
                LAUNCH GROOVE IN APP →
              </button>
            </div>
          </div>
        )}

        {instrumentId === 'chronos' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <img 
                src="/assets/cards/card-chronos.jpg" 
                alt="Chronos" 
                className="w-24 h-24 object-cover border border-amber-500/40 rounded-sm shadow-md"
              />
              <div className="space-y-1">
                <h3 className="font-orbitron text-xl font-bold text-white">STRUCTURED RITUALS</h3>
                <p className="font-editorial text-sm text-zinc-300">
                  Sacred focus arcs paired with dedicated rest intervals. Proven cognitive cadences engineered for endurance.
                </p>
                <div className="font-display text-[10px] text-amber-400 uppercase tracking-wider">
                  PRESET: {selectedRitual.replace('-', ' // REST ')} MINUTES
                </div>
              </div>
            </div>

            {/* Interactive Ritual Interval Selector */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: '25-5', title: 'CLASSIC', focus: '25m FOCUS', rest: '5m REST', desc: 'Standard Pomodoro cadence' },
                { id: '50-10', title: 'DEEP WORK', focus: '50m FOCUS', rest: '10m REST', desc: 'Sustained cognitive immersion' },
                { id: '90-20', title: 'ULTRADIAN', focus: '90m FOCUS', rest: '20m REST', desc: 'Full biological focus wave' }
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRitual(r.id as any)}
                  className={`p-3 border text-left transition-all ${
                    selectedRitual === r.id
                      ? 'border-[#f59e0b] bg-[#f59e0b]/15 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                      : 'border-green-950/70 bg-[#061406]/60 hover:border-green-800'
                  }`}
                >
                  <div className="font-orbitron font-bold text-xs text-white">{r.title}</div>
                  <div className="font-display text-[10px] text-amber-400 pt-0.5">{r.focus}</div>
                  <div className="font-editorial text-[9px] text-zinc-400 pt-1">{r.desc}</div>
                </button>
              ))}
            </div>

            {/* Launch Action */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  onEnterApp();
                }}
                className="px-6 py-2.5 border border-[#f59e0b] bg-[#f59e0b] text-black font-orbitron font-bold text-xs tracking-widest uppercase hover:bg-amber-300 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] press-tactile"
              >
                COMMENCE RITUAL →
              </button>
            </div>
          </div>
        )}

        {instrumentId === 'grove' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <img 
                src="/assets/cards/card-grove.jpg" 
                alt="Grove" 
                className="w-24 h-24 object-cover border border-green-500/40 rounded-sm shadow-md"
              />
              <div className="space-y-1">
                <h3 className="font-orbitron text-xl font-bold text-white">A LIVING HISTORY</h3>
                <p className="font-editorial text-sm text-zinc-300">
                  Every focused interval leaves a permanent living artifact in your sanctuary. Explore your historical botanical grove.
                </p>
                <div className="font-display text-[10px] text-green-400 uppercase tracking-wider">
                  FOREST DENSITY: 42 MATURE SPECIMENS // 11 SPECIES
                </div>
              </div>
            </div>

            {/* Grove Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 border border-green-950 bg-[#051508]/80 text-center font-display">
              <div className="p-2 border border-green-900/40">
                <div className="text-zinc-500 text-[8.5px]">CANOPY COVER</div>
                <div className="text-white text-base font-bold font-orbitron">84.2%</div>
              </div>
              <div className="p-2 border border-green-900/40">
                <div className="text-zinc-500 text-[8.5px]">TOTAL HOURS</div>
                <div className="text-[#4ade80] text-base font-bold font-orbitron">128.5h</div>
              </div>
              <div className="p-2 border border-green-900/40">
                <div className="text-zinc-500 text-[8.5px]">OLDEST TREE</div>
                <div className="text-amber-400 text-base font-bold font-orbitron">OAK // 90D</div>
              </div>
              <div className="p-2 border border-green-900/40">
                <div className="text-zinc-500 text-[8.5px]">PERFECTION</div>
                <div className="text-emerald-400 text-base font-bold font-orbitron">98.4%</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  onEnterApp();
                }}
                className="px-6 py-2.5 border border-[#4ade80] bg-[#4ade80] text-black font-orbitron font-bold text-xs tracking-widest uppercase hover:bg-[#86efac] transition-all shadow-[0_0_20px_rgba(74,222,128,0.4)] press-tactile"
              >
                ENTER FULL SANCTUARY GROVE →
              </button>
            </div>
          </div>
        )}

        {instrumentId === 'logs' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <img 
                src="/assets/cards/card-logs.jpg" 
                alt="Logs" 
                className="w-24 h-24 object-cover border border-cyan-500/40 rounded-sm shadow-md"
              />
              <div className="space-y-1">
                <h3 className="font-orbitron text-xl font-bold text-white">TRACK YOUR JOURNEY</h3>
                <p className="font-editorial text-sm text-zinc-300">
                  Granular chronological records of every minute spent in discipline. Trace your evolution over days, weeks, and seasons.
                </p>
                <div className="font-display text-[10px] text-cyan-400 uppercase tracking-wider">
                  TELEMETRY: STREAK 7 DAYS // ALL SYSTEMS NOMINAL
                </div>
              </div>
            </div>

            {/* Weekly Heatmap Activity Preview */}
            <div className="p-3 border border-green-950 bg-[#051508]/80 space-y-2">
              <div className="flex justify-between font-display text-[9px] text-zinc-400">
                <span>RECENT DISCIPLINE PULSES</span>
                <span className="text-cyan-400">28 SESSIONS THIS MONTH</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div className="text-[8px] font-display text-zinc-500">{day}</div>
                    <div className={`w-full h-8 border flex items-center justify-center font-display text-[9px] font-bold ${
                      idx < 5 
                        ? 'border-green-500 bg-[#4ade80]/20 text-[#86efac]' 
                        : idx === 5 
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300' 
                          : 'border-green-950 bg-black/40 text-zinc-600'
                    }`}>
                      {idx < 5 ? `${(idx + 1) * 45}m` : idx === 5 ? '90m' : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  onEnterApp();
                }}
                className="px-6 py-2.5 border border-cyan-400 bg-cyan-400 text-black font-orbitron font-bold text-xs tracking-widest uppercase hover:bg-cyan-300 transition-all shadow-[0_0_20px_rgba(45,212,191,0.4)] press-tactile"
              >
                OPEN LOG ARCHIVES →
              </button>
            </div>
          </div>
        )}

        {instrumentId === 'pomo' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <img 
                src="/assets/cards/card-pomo.jpg" 
                alt="Pomo" 
                className="w-24 h-24 object-cover border border-emerald-500/40 rounded-sm shadow-md"
              />
              <div className="space-y-1">
                <h3 className="font-orbitron text-xl font-bold text-white">POMO // IMMEDIATE UTILITY</h3>
                <p className="font-editorial text-sm text-zinc-300">
                  Zero friction. Zero configuration. Launch a 25-minute focus burst instantly whenever clarity is required.
                </p>
                <div className="font-display text-[10px] text-emerald-400 uppercase tracking-wider">
                  STATUS: {pomoRunning ? 'COUNTDOWN IN PROGRESS' : 'READY TO ENGAGE'}
                </div>
              </div>
            </div>

            {/* Live Functional Countdown Clock */}
            <div className="p-5 border border-emerald-500/50 bg-[#06180a]/90 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <div className="font-display text-[9.5px] text-zinc-400 tracking-wider">STANDARD INTERVAL</div>
                <div className="font-orbitron text-4xl text-[#4ade80] font-black tracking-tight tabular-nums">
                  {formatTime(pomoSeconds)}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPomoRunning(!pomoRunning)}
                  className="px-5 py-2.5 border border-[#4ade80] bg-[#4ade80] text-black font-orbitron font-bold text-xs tracking-widest uppercase hover:bg-[#86efac] transition-all press-tactile"
                >
                  {pomoRunning ? '[ PAUSE ]' : '[ START ]'}
                </button>
                <button
                  onClick={() => {
                    setPomoRunning(false);
                    setPomoSeconds(25 * 60);
                  }}
                  className="px-3 py-2.5 border border-green-900/80 hover:border-green-400 text-green-400 font-display text-xs tracking-wider transition-colors press-tactile"
                >
                  [ RESET ]
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  onEnterApp();
                }}
                className="px-6 py-2.5 border border-[#4ade80] bg-[#4ade80] text-black font-orbitron font-bold text-xs tracking-widest uppercase hover:bg-[#86efac] transition-all shadow-[0_0_20px_rgba(74,222,128,0.4)] press-tactile"
              >
                COMMENCE IN MAIN APP →
              </button>
            </div>
          </div>
        )}

        {instrumentId === 'ani' && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <img 
                src="/assets/cards/card-ani.jpg" 
                alt="Ani" 
                className="w-20 h-20 object-cover border border-emerald-400/50 rounded-sm shadow-md"
              />
              <div className="space-y-1">
                <h3 className="font-orbitron text-xl font-bold text-white">ANI // BOTANICAL COMPANION</h3>
                <p className="font-editorial text-sm text-zinc-300">
                  A gentle cybernetic intelligence tending the threshold between intention and execution.
                </p>
                <div className="font-display text-[10px] text-emerald-400 uppercase tracking-wider">
                  LINK: ACTIVE // NEURAL RESONANCE 100%
                </div>
              </div>
            </div>

            {/* Interactive Chat Stream Box */}
            <div className="h-44 border border-green-950 bg-[#020803]/90 p-3 overflow-y-auto space-y-2.5 font-editorial text-xs">
              {aniMessages.map((m, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-sm max-w-[85%] ${
                    m.sender === 'ani'
                      ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-200 self-start'
                      : 'bg-green-900/30 border border-green-600/40 text-white ml-auto text-right'
                  }`}
                >
                  <div className="font-display text-[8px] text-zinc-500 uppercase pb-0.5">
                    {m.sender === 'ani' ? '🌱 ANI INTELLIGENCE' : 'USER INTENTION'}
                  </div>
                  <p className="leading-relaxed">{m.text}</p>
                </div>
              ))}
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                '🌱 Recommend a tree for deep coding',
                '✨ How does germination wood synthesis work?',
                '🧘 I feel distracted today'
              ].map(chip => (
                <button
                  key={chip}
                  onClick={() => handleSendAniMessage(chip)}
                  className="px-2.5 py-1 border border-green-900/60 hover:border-green-400 bg-green-950/30 text-green-300 font-display text-[9px] tracking-wider rounded-sm transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input message form */}
            <form 
              onSubmit={e => {
                e.preventDefault();
                handleSendAniMessage();
              }}
              className="flex gap-2"
            >
              <input 
                type="text"
                value={aniInput}
                onChange={e => setAniInput(e.target.value)}
                placeholder="Ask Ani about focus, trees, or rituals..."
                className="flex-1 bg-[#041005] border border-green-800/80 focus:border-[#4ade80] px-3 py-2 text-xs font-editorial text-white placeholder-zinc-500 outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 border border-[#4ade80] bg-[#4ade80] text-black font-orbitron font-bold text-xs tracking-wider uppercase hover:bg-[#86efac] transition-all press-tactile"
              >
                SEND
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
