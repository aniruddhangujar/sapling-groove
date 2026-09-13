import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ChatMessage, 
  UserProfile, 
  SaplingGoal, 
  TreeType, 
  FocusMode, 
  AppTab, 
  TimelineType, 
  AniActionPayload,
  AniGoalProposal 
} from '../types';
import PixelButton from './PixelButton';
import { aniService, buildGroveContext } from '../services/aniService';
import { TREE_CONFIGS } from '../constants';

interface Props {
  profile?: UserProfile;
  activeSessionGoal?: SaplingGoal | null | 'pomodoro';
  onPlantGoal?: (goal: Partial<SaplingGoal>) => void;
  onStartRitual?: (goal: SaplingGoal | 'pomodoro', mode: FocusMode) => void;
  onSelectSoundscape?: (trackId: string) => void;
  onNavigateTab?: (tab: AppTab) => void;
}

const AniChat: React.FC<Props> = ({ 
  profile, 
  activeSessionGoal,
  onPlantGoal,
  onStartRitual,
  onSelectSoundscape,
  onNavigateTab
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('sapling_ani_chat_v3');
      return saved ? JSON.parse(saved) : [
        { 
          role: 'model', 
          parts: [{ 
            text: "Peace in the grove. I'm Ani—your focus co-pilot and grove steward. What intention or project shall we structure today?" 
          }] 
        }
      ];
    } catch {
      return [
        { 
          role: 'model', 
          parts: [{ 
            text: "Peace in the grove. I'm Ani. What intention or project shall we tend to?" 
          }] 
        }
      ];
    }
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Save chat history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sapling_ani_chat_v3', JSON.stringify(messages));
    } catch (e) {
      console.warn("Could not save Ani chat history:", e);
    }
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '20px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 100)}px`;
    }
  }, [input]);

  // Build real, rich Grove context
  const groveContext = useMemo(() => {
    return buildGroveContext(profile, activeSessionGoal);
  }, [profile, activeSessionGoal]);

  // Dynamic Contextual Action Chips based on user's live grove state
  const quickChips = useMemo(() => {
    const activeGoals = (profile?.grove || []).filter(g => !g.isComplete);
    const chips: Array<{ label: string; prompt: string }> = [];

    if (activeGoals.length === 0) {
      chips.push({
        label: "🌱 Plan First Intention",
        prompt: "Help me plant a new intention. I want to build a disciplined daily focus ritual."
      });
      chips.push({
        label: "📋 Decompose a Project",
        prompt: "I have a complex project to finish. Help me break it down into 3 concrete focus milestones."
      });
      chips.push({
        label: "🌲 Which Tree Fits Me?",
        prompt: "Which tree species matches my work style? I do programming, research, and design."
      });
    } else {
      const topGoal = activeGoals[0];
      chips.push({
        label: `⚡ 25m on "${topGoal.name}"`,
        prompt: `Let's start a 25-minute Chronos focus ritual on "${topGoal.name}". Ground my intention.`
      });
      chips.push({
        label: "🧩 Break Down Next Step",
        prompt: `I'm working on "${topGoal.name}". Decompose the next concrete micro-step to make progress.`
      });
      chips.push({
        label: "🌿 Grove Health Check",
        prompt: "Analyze the health of my trees in the soil. Are any wilting or neglected?"
      });
    }

    chips.push({
      label: "🧘 Overcome Procrastination",
      prompt: "I am feeling friction and procrastinating right now. Give me a 3-minute grounding reset to start."
    });

    chips.push({
      label: "📊 Habit Diagnostics",
      prompt: "Analyze my recent session logs and total focus velocity. What insights do my focus patterns reveal?"
    });

    return chips;
  }, [profile]);

  // Universal Send Handler
  const executeSend = useCallback(async (
    textToSend: string, 
    imageToSend: { base64: string; mimeType: string } | null
  ) => {
    const trimmed = textToSend.trim();
    if ((!trimmed && !imageToSend) || isLoading) return;

    setError(null);
    const currentParts: ChatMessage['parts'] = [];
    if (imageToSend) {
      currentParts.push({ inlineData: { mimeType: imageToSend.mimeType, data: imageToSend.base64 } });
    }
    if (trimmed) {
      currentParts.push({ text: trimmed });
    }

    const userMessage: ChatMessage = { role: 'user', parts: currentParts };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    const previousImage = imageToSend;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const response = await aniService.sendMessage(updatedMessages, groveContext);
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: response.text }],
        action: response.action
      }]);
    } catch (err: any) {
      setMessages(messages);
      setInput(trimmed);
      setSelectedImage(previousImage);
      setError(err.message || "Couldn't reach Ani right now. Check your connection or API key and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, groveContext]);

  const handleSend = () => {
    executeSend(input, selectedImage);
  };

  // Action Execution Handler
  const handleExecuteAction = (msgIndex: number, action: AniActionPayload) => {
    if (!action) return;

    if (action.type === 'plant_goal' && action.goalProposal) {
      onPlantGoal?.({
        name: action.goalProposal.name,
        type: action.goalProposal.type || TreeType.PINE,
        timeline: action.goalProposal.timeline || TimelineType.DAY,
        durationInDays: action.goalProposal.durationInDays || 1,
        dailyTargetMinutes: action.goalProposal.dailyTargetMinutes || 25,
        totalTargetMinutes: action.goalProposal.totalTargetMinutes || 25
      });
    } else if (action.type === 'start_ritual') {
      const mode = action.sessionConfig?.mode || 'chronos';
      const goalName = action.sessionConfig?.goalName;
      const matchedGoal = (profile?.grove || []).find(
        g => !g.isComplete && (!goalName || g.name.toLowerCase().includes(goalName.toLowerCase()))
      );
      onStartRitual?.(matchedGoal || 'pomodoro', mode);
    } else if (action.type === 'switch_soundscape' && action.soundscapeId) {
      onSelectSoundscape?.(action.soundscapeId);
    } else if (action.type === 'task_breakdown' && action.breakdownTasks) {
      action.breakdownTasks.forEach(task => {
        onPlantGoal?.({
          name: task.title,
          type: task.treeType || TreeType.PINE,
          timeline: TimelineType.DAY,
          durationInDays: task.durationInDays || 1,
          dailyTargetMinutes: task.dailyMinutes || 25,
          totalTargetMinutes: (task.dailyMinutes || 25) * (task.durationInDays || 1)
        });
      });
    }

    // Mark action as executed in state and storage
    setMessages(prev => {
      const updated = [...prev];
      if (updated[msgIndex]) {
        updated[msgIndex] = { ...updated[msgIndex], actionExecuted: true };
      }
      return updated;
    });
  };

  const handlePlantSingleTask = (msgIndex: number, task: { title: string; treeType: TreeType; dailyMinutes: number; durationInDays: number }) => {
    onPlantGoal?.({
      name: task.title,
      type: task.treeType || TreeType.PINE,
      timeline: TimelineType.DAY,
      durationInDays: task.durationInDays || 1,
      dailyTargetMinutes: task.dailyMinutes || 25,
      totalTargetMinutes: (task.dailyMinutes || 25) * (task.durationInDays || 1)
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedImage({ base64: base64String, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  // Render Action Cards Inside Messages
  const renderActionCard = (action: AniActionPayload, msgIndex: number, isExecuted?: boolean) => {
    if (action.type === 'plant_goal' && action.goalProposal) {
      const p = action.goalProposal;
      const treePalette = TREE_CONFIGS[p.type as TreeType] || TREE_CONFIGS[TreeType.PINE];

      return (
        <div className="mt-3 p-3 bg-[#040e04] border-2 border-green-800/80 pixel-corners shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b border-green-900/50 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: treePalette.color }} />
              <span className="pixel-font text-[7.5px] sm:text-[8px] text-green-300 uppercase tracking-widest font-bold">
                PROPOSED SEED SPECIMEN
              </span>
            </div>
            <span 
              className="pixel-font text-[6.5px] px-1.5 py-0.5 border uppercase font-bold"
              style={{ color: treePalette.color, borderColor: `${treePalette.color}80` }}
            >
              {p.type}
            </span>
          </div>

          <div className="space-y-1 mb-3">
            <h4 className="pixel-font text-xs sm:text-sm text-white font-bold tracking-tight">
              "{p.name}"
            </h4>
            <div className="flex items-center gap-3 text-[9px] text-green-400/90 font-mono">
              <span>RITUAL: <strong className="text-white tabular-nums">{p.dailyTargetMinutes}m</strong> / day</span>
              <span>•</span>
              <span>HORIZON: <strong className="text-white tabular-nums">{p.totalTargetMinutes}m</strong> ({p.durationInDays || 1}d)</span>
            </div>
          </div>

          {isExecuted ? (
            <div className="flex items-center justify-between pt-1">
              <span className="pixel-font text-[7.5px] sm:text-[8px] text-green-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                ✓ SEED PLANTED IN GROVE SOIL
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab?.('grove')}
                className="pixel-font text-[7px] text-green-300 hover:text-white uppercase tracking-wider underline underline-offset-2 transition-colors"
              >
                VIEW IN GROVE →
              </button>
            </div>
          ) : (
            <PixelButton
              variant="success"
              onClick={() => handleExecuteAction(msgIndex, action)}
              className="w-full py-2.5 text-[8px] sm:text-[9px] tracking-widest uppercase h-10 font-bold shadow-[0_0_15px_rgba(34,197,94,0.25)]"
            >
              [ PLANT SEED IN SOIL ]
            </PixelButton>
          )}
        </div>
      );
    }

    if (action.type === 'start_ritual') {
      const mode = action.sessionConfig?.mode || 'chronos';
      const duration = action.sessionConfig?.durationMinutes || 25;
      const goalName = action.sessionConfig?.goalName || groveContext.currentGoalName || 'Pomo Ritual';

      return (
        <div className="mt-3 p-3 bg-[#040e04] border-2 border-emerald-800/80 pixel-corners shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b border-green-900/50 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="pixel-font text-[7.5px] sm:text-[8px] text-emerald-300 uppercase tracking-widest font-bold">
                FOCUS RITUAL READY
              </span>
            </div>
            <span className="pixel-font text-[7px] px-2 py-0.5 border border-emerald-700 bg-emerald-950/40 text-emerald-300 font-bold uppercase tracking-wider">
              {mode.toUpperCase()}
            </span>
          </div>

          <div className="mb-3 space-y-0.5">
            <div className="text-white pixel-font text-xs sm:text-sm font-bold truncate">
              {goalName}
            </div>
            <div className="text-emerald-400/90 text-[9px] font-mono">
              Target Duration: <strong className="text-white tabular-nums">{duration} Minutes</strong>
            </div>
          </div>

          <PixelButton
            variant="primary"
            onClick={() => handleExecuteAction(msgIndex, action)}
            className="w-full py-2.5 text-[8.5px] sm:text-[9.5px] tracking-widest uppercase h-10 font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            ⚡ [ LAUNCH {duration}M RITUAL ]
          </PixelButton>
        </div>
      );
    }

    if (action.type === 'task_breakdown' && action.breakdownTasks && action.breakdownTasks.length > 0) {
      return (
        <div className="mt-3 p-3 bg-[#030c03] border-2 border-green-800/80 pixel-corners shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b border-green-900/50 pb-2 mb-2.5">
            <span className="pixel-font text-[7.5px] sm:text-[8px] text-green-300 uppercase tracking-widest font-bold">
              MILESTONE ROADMAP ({action.breakdownTasks.length} SEEDS)
            </span>
            <span className="pixel-font text-[6.5px] text-green-500 uppercase">
              DECOMPOSED BY ANI
            </span>
          </div>

          <div className="space-y-2 mb-3">
            {action.breakdownTasks.map((t, ti) => {
              const pal = TREE_CONFIGS[t.treeType as TreeType] || TREE_CONFIGS[TreeType.PINE];
              return (
                <div key={ti} className="p-2 border border-green-950/90 bg-[#061406] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pal.color }} />
                      <span className="pixel-font text-[9px] text-white font-bold truncate">
                        {t.title}
                      </span>
                    </div>
                    <span className="text-[8px] text-green-400/80 font-mono block mt-0.5 ml-3">
                      {t.treeType} • <span className="tabular-nums">{t.dailyMinutes}m</span>/day ({t.durationInDays}d)
                    </span>
                  </div>

                  {!isExecuted && (
                    <button
                      type="button"
                      onClick={() => handlePlantSingleTask(msgIndex, t)}
                      className="pixel-font text-[6.5px] px-2 py-1 border border-green-800 hover:border-green-400 bg-[#040e04] text-green-300 hover:text-white uppercase tracking-wider transition-all shrink-0 min-h-[28px]"
                      title="Plant this single seed"
                    >
                      + PLANT
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isExecuted ? (
            <div className="flex items-center justify-between pt-1">
              <span className="pixel-font text-[7.5px] text-green-400 uppercase tracking-wider font-bold">
                ✓ ALL MILESTONES PLANTED IN GROVE
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab?.('grove')}
                className="pixel-font text-[7px] text-green-300 hover:text-white uppercase tracking-wider underline transition-colors"
              >
                VIEW GROVE →
              </button>
            </div>
          ) : (
            <PixelButton
              variant="success"
              onClick={() => handleExecuteAction(msgIndex, action)}
              className="w-full py-2.5 text-[8px] sm:text-[9px] tracking-widest uppercase h-10 font-bold"
            >
              [ ALLOCATE ALL TO GROVE ]
            </PixelButton>
          )}
        </div>
      );
    }

    if (action.type === 'switch_soundscape') {
      return (
        <div className="mt-3 p-3 bg-[#040e04] border border-green-800/80 pixel-corners flex items-center justify-between gap-3">
          <div>
            <span className="pixel-font text-[7px] text-green-400 uppercase tracking-widest block font-bold">
              AMBIENT SOUNDSCAPE
            </span>
            <span className="text-xs text-white pixel-font font-bold">
              {action.soundscapeName || action.soundscapeId?.toUpperCase()}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleExecuteAction(msgIndex, action)}
            className="px-3 py-1.5 border border-green-600 bg-green-950/40 text-green-300 hover:text-white pixel-font text-[7.5px] uppercase tracking-wider transition-colors min-h-[36px]"
          >
            [ TUNE AUDIO ]
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#040a04] relative overflow-hidden">
      {/* HUD Background Grid */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none hud-grid" />

      {/* Header Bar */}
      <div className="px-2.5 xs:px-4 sm:px-6 py-2 sm:py-3 border-b-2 border-green-950/60 bg-[#040a04]/95 backdrop-blur-md flex items-center justify-between z-10 shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-green-900/60 bg-[#061206] flex items-center justify-center relative shadow-[0_0_15px_rgba(34,197,94,0.15)] shrink-0">
             <div className="absolute -top-0.5 -left-0.5 w-1 h-1 bg-green-500" />
             <div className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-green-500" />
             <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400 sm:w-[18px] sm:h-[18px]">
              <circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 xs:gap-2">
              <h2 className="pixel-font text-xs sm:text-sm tracking-wider uppercase font-bold text-white shrink-0">
                ANI
              </h2>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-green-900/50 bg-[#061406] text-[6.5px] sm:text-[7px] pixel-font text-green-400 font-bold uppercase tracking-wider shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                FOCUS ARCHITECT
              </span>
            </div>
            <p className="pixel-font text-[6px] xs:text-[6.5px] sm:text-[7.5px] text-green-500 uppercase tracking-widest font-bold truncate mt-0.5 max-w-[140px] xs:max-w-[220px] sm:max-w-none">
              {groveContext.currentGoalName 
                ? `ACTIVE INTENTION: ${groveContext.currentGoalName} (${groveContext.currentGoalProgress || 0}%)`
                : `${(profile?.grove || []).length} SEEDS IN SOIL • LISTENING`}
            </p>
          </div>
        </div>

        {/* Clear Conversation Shortcut */}
        <button
          onClick={() => {
            if (window.confirm("Reset Ani conversation memory?")) {
              const initial: ChatMessage[] = [
                { role: 'model', parts: [{ text: "Memory refreshed. The soil is clear. What project or intention shall we architect now?" }] }
              ];
              setMessages(initial);
              localStorage.setItem('sapling_ani_chat_v3', JSON.stringify(initial));
            }
          }}
          className="text-green-600 hover:text-green-400 pixel-font text-[6.5px] sm:text-[7.5px] uppercase tracking-wider border border-green-950 px-1.5 xs:px-2 py-1 bg-[#050c05] transition-colors shrink-0"
          title="Reset conversation"
        >
          [ CLEAR ]
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar transition-opacity duration-500 z-10">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[94%] sm:max-w-[85%] relative ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`p-3.5 sm:p-4 border-2 transition-all duration-300 relative pixel-corners shadow-md ${
                msg.role === 'user' 
                  ? 'bg-[#081408] border-green-900/80 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.08)]' 
                  : 'bg-[#061406] border-green-950/90 text-green-200 shadow-[0_0_20px_rgba(0,0,0,0.5)]'
              }`}>
                {msg.role === 'model' && (
                  <div className="absolute -top-2.5 left-2 bg-[#040a04] text-[6.5px] sm:text-[7px] pixel-font px-2 py-0.5 text-green-400 border border-green-800/80 uppercase tracking-widest shadow-sm z-20 font-bold">
                    ANI
                  </div>
                )}
                
                {msg.parts.map((part, pi) => {
                  if ('inlineData' in part) {
                    return (
                      <img 
                        key={pi} 
                        src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                        className="max-w-full rounded border border-green-900 mt-2 shadow-md max-h-48 object-cover" 
                        alt="Botanical Scan" 
                      />
                    );
                  }
                  return (
                    <p key={pi} className="text-xs sm:text-sm leading-relaxed font-sans whitespace-pre-wrap">
                      {part.text}
                    </p>
                  );
                })}

                {/* Render Executable Action Card if present */}
                {msg.action && renderActionCard(msg.action, i, msg.actionExecuted)}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="px-3.5 py-2.5 border border-dashed border-green-800/60 bg-green-950/20 animate-pulse flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
              <span className="pixel-font text-[7.5px] sm:text-[8px] text-green-400 tracking-widest uppercase font-bold">
                Ani is consulting the grove records...
              </span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Bar Overlay with Dynamic Contextual Action Chips */}
      <div className="p-2 sm:p-3 border-t-2 border-green-950/60 bg-[#040a04]/98 backdrop-blur-md z-10 shrink-0 space-y-2">
        {/* Dynamic Contextual Action Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar px-0.5">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => executeSend(chip.prompt, null)}
              disabled={isLoading}
              className="px-2.5 py-1.5 border border-green-900/70 bg-[#061406] hover:bg-[#0c240c] hover:border-green-500 text-green-300 hover:text-white pixel-font text-[6.5px] sm:text-[7.5px] uppercase tracking-wider transition-all whitespace-nowrap shrink-0 shadow-sm flex items-center gap-1.5 disabled:opacity-50 min-h-[32px]"
            >
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="p-2 bg-red-950/40 border border-red-900/60 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200 rounded-sm">
            <span className="pixel-font text-[8px] sm:text-[9px] text-red-400 uppercase tracking-widest leading-relaxed">
              {error}
            </span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 ml-3 text-lg leading-none" aria-label="Dismiss error">×</button>
          </div>
        )}
        
        {/* Note / Botanical Specimen Upload Guidance */}
        {selectedImage && (
          <div className="p-2 bg-[#061406] border border-green-700/60 flex items-center gap-3 animate-in zoom-in duration-200">
            <img 
              src={`data:${selectedImage.mimeType};base64,${selectedImage.base64}`} 
              className="w-12 h-12 object-cover border-2 border-green-500 shrink-0 shadow-md" 
              alt="Scan Preview" 
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="pixel-font text-[7px] text-green-300 uppercase tracking-widest font-bold">
                  BOTANICAL SCAN ATTACHED
                </span>
                <button 
                  onClick={() => setSelectedImage(null)} 
                  className="text-red-400 hover:text-red-200 text-sm leading-none px-1"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
              <p className="text-[8.5px] text-green-400/90 font-mono mt-0.5 leading-tight">
                Ani will analyze your handwritten notes, whiteboard, or to-do list into executable grove seeds.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-1.5 sm:gap-2 items-end min-h-[48px]">
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            className="hidden" 
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()} 
            className={`w-11 h-11 sm:w-12 sm:h-12 border-2 transition-all flex items-center justify-center shrink-0 shadow-sm min-h-[44px] ${
              selectedImage 
                ? 'bg-green-950/60 border-green-400 text-green-300' 
                : 'bg-[#061406] border-green-900/60 text-green-500 hover:border-green-600 hover:text-green-300'
            }`}
            aria-label="Upload Botanical Scan or Notes"
            title="Scan Handwritten Notes, Sticky Notes, or Specimen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="2"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>

          <div className="flex-1 bg-[#061206] border-2 border-green-900/70 focus-within:border-green-400 flex py-3 px-3 transition-all shadow-inner relative items-center">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Ani to plant a seed, start a timer, or decompose a task..."
              className="w-full bg-transparent text-green-100 outline-none text-xs sm:text-sm font-sans placeholder:text-green-800/90 placeholder:font-mono resize-none overflow-y-auto custom-scrollbar block leading-snug"
              style={{ minHeight: '20px', maxHeight: '100px', height: '20px' }}
              rows={1}
            />
          </div>

          <PixelButton 
            onClick={handleSend} 
            disabled={isLoading || (!input.trim() && !selectedImage)} 
            variant="primary" 
            className="h-11 sm:h-12 px-3.5 sm:px-5 text-[8.5px] sm:text-[9.5px] tracking-wider shrink-0 min-h-[44px]"
          >
            SEND
          </PixelButton>
        </div>
      </div>
    </div>
  );
};

export default AniChat;
