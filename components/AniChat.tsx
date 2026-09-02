import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChatMessage, UserProfile, SaplingGoal } from '../types';
import PixelButton from './PixelButton';
import { aniService, buildGroveContext } from '../services/aniService';

interface Props {
  profile?: UserProfile;
  activeSessionGoal?: SaplingGoal | null | 'pomodoro';
}

const AniChat: React.FC<Props> = ({ profile, activeSessionGoal }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('sapling_ani_chat_v3');
      return saved ? JSON.parse(saved) : [
        { role: 'model', parts: [{ text: "Peace in the grove. I'm Ani—here watching over your soil while you do the deep work. What intention are we tending to?" }] }
      ];
    } catch {
      return [
        { role: 'model', parts: [{ text: "Peace in the grove. I'm Ani. What intention are we tending to?" }] }
      ];
    }
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save chat history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sapling_ani_chat_v3', JSON.stringify(messages));
    } catch (e) {
      console.warn("Could not save Ani chat history:", e);
    }
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build real, structured Grove context
  const groveContext = useMemo(() => {
    return buildGroveContext(profile, activeSessionGoal);
  }, [profile, activeSessionGoal]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && !selectedImage) || isLoading) return;

    const currentParts: ChatMessage['parts'] = [];
    if (selectedImage) {
      currentParts.push({ inlineData: { mimeType: selectedImage.mimeType, data: selectedImage.base64 } });
    }
    if (trimmed) {
      currentParts.push({ text: trimmed });
    }

    const userMessage: ChatMessage = { role: 'user', parts: currentParts };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const response = await aniService.sendMessage(updatedMessages, groveContext);
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: response.text }]
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: "The garden is still for a moment. Steady your breath and try again." }]
      }]);
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="flex flex-col h-full bg-[#040a04] relative overflow-hidden">
      {/* HUD Background Grid */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none hud-grid" />

      {/* Header Bar */}
      <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-b-2 border-green-950/60 bg-[#040a04]/95 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-green-900/60 bg-[#061206] flex items-center justify-center relative shadow-[0_0_15px_rgba(34,197,94,0.15)] shrink-0">
             <div className="absolute -top-0.5 -left-0.5 w-1 h-1 bg-green-500" />
             <div className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-green-500" />
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
              <circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="pixel-font text-xs sm:text-sm tracking-wider uppercase font-bold text-white truncate">
                ANI
              </h2>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-green-900/50 bg-[#061406] text-[6.5px] sm:text-[7px] pixel-font text-green-400 font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                GROVE COMPANION
              </span>
            </div>
            <p className="pixel-font text-[6.5px] sm:text-[7.5px] text-green-500 uppercase tracking-widest font-bold truncate mt-0.5">
              {groveContext.currentGoalName 
                ? `TENDING: ${groveContext.currentGoalName} (${groveContext.currentGoalProgress || 0}%)`
                : 'LISTENING TO THE SOIL'}
            </p>
          </div>
        </div>

        {/* Clear Conversation Shortcut */}
        <button
          onClick={() => {
            if (window.confirm("Reset Ani conversation memory?")) {
              const initial: ChatMessage[] = [
                { role: 'model', parts: [{ text: "Memory refreshed. The soil is clear. What shall we focus on now?" }] }
              ];
              setMessages(initial);
              localStorage.setItem('sapling_ani_chat_v3', JSON.stringify(initial));
            }
          }}
          className="text-green-600 hover:text-green-400 pixel-font text-[7px] sm:text-[7.5px] uppercase tracking-wider border border-green-950 px-2 py-1 bg-[#050c05] transition-colors"
          title="Reset conversation"
        >
          [ CLEAR ]
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar transition-opacity duration-500 z-10">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[92%] sm:max-w-[82%] relative ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`p-3 sm:p-4 border-2 transition-all duration-300 relative pixel-corners shadow-md ${
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
                        alt="Grove Scan" 
                      />
                    );
                  }
                  return (
                    <p key={pi} className="text-xs sm:text-sm leading-relaxed font-sans whitespace-pre-wrap">
                      {part.text}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="px-3.5 py-2.5 border border-dashed border-green-800/60 bg-green-950/20 animate-pulse flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
              <span className="pixel-font text-[7.5px] sm:text-[8px] text-green-400 tracking-widest uppercase font-bold">
                Ani is listening to the leaves...
              </span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Bar Overlay — Fully Mobile Optimized */}
      <div className="p-2 sm:p-3 border-t-2 border-green-950/60 bg-[#040a04]/98 backdrop-blur-md z-10 shrink-0 pb-safe">
        {selectedImage && (
          <div className="mb-2 relative inline-block animate-in zoom-in duration-200">
            <img 
              src={`data:${selectedImage.mimeType};base64,${selectedImage.base64}`} 
              className="w-14 h-14 object-cover border-2 border-green-600 shadow-md" 
              alt="Scan Preview" 
            />
            <button 
              onClick={() => setSelectedImage(null)} 
              className="absolute -top-2 -right-2 bg-red-950 text-red-400 w-5 h-5 flex items-center justify-center border border-red-800 text-xs pixel-font hover:bg-red-900 transition-colors"
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex gap-1.5 sm:gap-2 items-center min-h-[48px]">
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
            aria-label="Upload Image Scan"
            title="Scan Botanical Specimen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="2"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>

          <div className="flex-1 bg-[#061206] border-2 border-green-900/70 focus-within:border-green-400 flex items-center px-3 h-11 sm:h-12 transition-all shadow-inner">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Whisper to Ani..."
              className="w-full bg-transparent text-green-100 outline-none text-xs sm:text-sm font-sans placeholder:text-green-800 placeholder:font-mono"
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
