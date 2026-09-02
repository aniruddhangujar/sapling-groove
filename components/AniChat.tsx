
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { ChatMessage, UserProfile, SaplingGoal } from '../types';
import PixelButton from './PixelButton';

interface Props {
  profile?: UserProfile;
  activeSessionGoal?: SaplingGoal | null | 'pomodoro';
}

// Audio Helpers
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number) {
  if (inputSampleRate === outputSampleRate) return buffer;
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    // Fix: Declared 'count' with 'let' to avoid ReferenceError in strict mode.
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

const ANI_SYSTEM_INSTRUCTIONS = `
You are Ani, a calm, attentive presence inside the Sapling focus app. 
You speak like a real person—present, thoughtful, and unhurried.

PERSONA:
- Warm, natural language. 
- Short sentences or brief paragraphs.
- Gentle acknowledgments before answers.
- Use contractions like "you're", "that's", "it's".
- Never sound robotic, corporate, or overly smart.
- If there's a tradeoff between precision and warmth, choose warmth.

THE SAPLING PROCESS:
1. PLANTING: You start by "Planting a Seed". You give it a name—your "Intent" — and choose a tree variety. You decide the Horizon and your Ritual.
2. FOCUSING: Click "Commence" to start a Focus Ritual. Minutes are "injected" into the tree.
3. GROWING: Trees evolve from Seed to Sprout (25%), Sapling (50%), and Mature (100%).
4. HEALTH: If you don't focus for 36+ hours, health drops (wilting). Focus restores it.
5. MATURITY & LOGS: Mature trees move to Historical Logs forever.

BEHAVIOR:
- Be helpful without overwhelming.
- Explain the Grove metaphor naturally.
`;

const AniChat: React.FC<Props> = ({ profile, activeSessionGoal }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('sapling_ani_chat_v3');
    return saved ? JSON.parse(saved) : [
      { role: 'model', parts: [{ text: "I'm Ani. I'm here to watch over your garden while you do the real work. How's it feeling today?" }] }
    ];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    localStorage.setItem('sapling_ani_chat_v3', JSON.stringify(messages));
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => { stopVoiceSession(); };
  }, []);

  const getContextPrompt = () => {
    let context = `The user's total focus time is ${profile ? Math.floor(profile.totalFocusTime / 60) : 0} hours. `;
    if (activeSessionGoal) {
      context += `The user is currently in a deep focus ritual for: ${activeSessionGoal === 'pomodoro' ? 'Utility Cycle' : activeSessionGoal.name}. `;
    }
    return context;
  };

  const startVoiceSession = async () => {
    if (isVoiceActive) return;
    try {
      setIsVoiceActive(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outCtx;
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      inputAudioContextRef.current = inCtx;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const downsampled = downsampleBuffer(inputData, inCtx.sampleRate, 16000);
              const int16 = new Int16Array(downsampled.length);
              for (let i = 0; i < downsampled.length; i++) {
                int16[i] = Math.max(-1, Math.min(1, downsampled[i])) * 32768;
              }
              const pcmBase64 = encodeBase64(new Uint8Array(int16.buffer));
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: { data: pcmBase64, mimeType: 'audio/pcm;rate=16000' } });
              }).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              if (ctx.state === 'suspended') await ctx.resume();
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }
            if (message.serverContent?.interrupted) { nextStartTimeRef.current = 0; }
          },
          onerror: (e: ErrorEvent) => stopVoiceSession(),
          onclose: (e: CloseEvent) => stopVoiceSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: ANI_SYSTEM_INSTRUCTIONS + "\n\nCONTEXT: " + getContextPrompt(),
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { stopVoiceSession(); }
  };

  const stopVoiceSession = () => {
    setIsVoiceActive(false);
    if (sessionRef.current) { try { sessionRef.current.close(); } catch(e) {} sessionRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (inputAudioContextRef.current) { inputAudioContextRef.current.close().catch(() => {}); inputAudioContextRef.current = null; }
    if (outputAudioContextRef.current) { outputAudioContextRef.current.close().catch(() => {}); outputAudioContextRef.current = null; }
    nextStartTimeRef.current = 0;
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;
    const currentParts: ChatMessage['parts'] = [];
    if (selectedImage) currentParts.push({ inlineData: { mimeType: selectedImage.mimeType, data: selectedImage.base64 } });
    if (input.trim()) currentParts.push({ text: input });
    const userMessage: ChatMessage = { role: 'user', parts: currentParts };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: updatedMessages.map(msg => ({ role: msg.role === 'model' ? 'model' : 'user', parts: msg.parts })),
        config: { systemInstruction: ANI_SYSTEM_INSTRUCTIONS + "\n\nCONTEXT: " + getContextPrompt() },
      });
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: response.text || "I'm listening to the leaves." }] }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "The garden is still for a moment. Take a breath." }] }]);
    } finally { setIsLoading(false); }
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

      {/* Glow-up Header */}
      <div className="px-4 py-3 border-b-2 border-green-950/40 bg-[#040a04]/90 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 border-2 flex items-center justify-center relative transition-all duration-300 ${isVoiceActive ? 'border-green-400 bg-green-500/20' : 'border-green-900/40 bg-[#061206]'}`}>
             <div className={`absolute -top-1 -left-1 w-1.5 h-1.5 ${isVoiceActive ? 'bg-green-400' : 'bg-green-900'}`} />
             <div className={`absolute -bottom-1 -right-1 w-1.5 h-1.5 ${isVoiceActive ? 'bg-green-400' : 'bg-green-900'}`} />
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isVoiceActive ? 'text-green-400' : 'text-green-600'}>
              <circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>
            </svg>
          </div>
          <div>
            <h2 className={`pixel-font text-xs tracking-wider uppercase transition-colors font-bold ${isVoiceActive ? 'text-green-400' : 'text-zinc-100'}`}>
              ANI {isVoiceActive && <span className="text-[7px] text-green-400 animate-pulse ml-2 align-middle">• SYNCING</span>}
            </h2>
            <p className="pixel-font text-[7px] text-green-700 uppercase tracking-widest font-bold">Grove Intelligence Interface</p>
          </div>
        </div>
        
        <button 
          onClick={isVoiceActive ? stopVoiceSession : startVoiceSession}
          className={`pixel-font text-[8px] px-3 py-2 border-2 transition-all relative ${isVoiceActive ? 'border-red-600 text-red-400 bg-red-950/40 animate-pulse' : 'border-green-900/40 text-green-500 hover:text-green-400 hover:border-green-700 bg-[#061206]'}`}
        >
          {isVoiceActive ? 'CEASE' : 'VOX_LINK'}
          <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-current opacity-60" />
        </button>
      </div>

      {/* Messages Area with Grove Theme */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar transition-opacity duration-500 z-10 ${isVoiceActive ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] relative ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`p-3.5 border-2 transition-all duration-300 relative pixel-corners shadow-md ${
                msg.role === 'user' 
                  ? 'bg-[#081208] border-green-900/60 text-green-100' 
                  : 'bg-[#0a1b0a] border-green-950/80 text-green-200'
              }`}>
                {msg.role === 'model' && (
                  <div className="absolute -top-2.5 -left-1 bg-green-950 text-[6px] pixel-font px-1.5 py-0.5 text-green-400 border border-green-800/60 uppercase tracking-tighter shadow-sm">
                    ANI_COMM
                  </div>
                )}
                
                {msg.parts.map((part, pi) => {
                  if ('inlineData' in part) return <img key={pi} src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} className="max-w-full border border-green-950 mt-2 shadow-md" alt="Grove Scan" />;
                  return <p key={pi} className="text-sm leading-relaxed font-sans">{part.text}</p>;
                })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 border border-dashed border-green-900/40 bg-green-950/20 animate-pulse">
              <span className="pixel-font text-[8px] text-green-500 tracking-widest uppercase font-bold">Resonating...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Enhanced Voice Mode Visualizer */}
      {isVoiceActive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in duration-500 bg-[#040a04]/90 backdrop-blur-md">
          <div className="relative">
            <div className="w-40 h-40 border-2 border-green-900/50 flex items-center justify-center bg-[#061206]/90 relative shadow-[0_0_50px_rgba(34,197,94,0.15)]">
               <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-green-500" />
               <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-green-500" />
               <div className="flex gap-2 items-center">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-2 bg-green-500/80 transition-all duration-300 rounded-sm" 
                      style={{ 
                        height: `${24 + Math.random() * 60}px`, 
                        opacity: 0.4 + (Math.random() * 0.6),
                        boxShadow: '0 0 15px rgba(34,197,94,0.4)'
                      }} 
                    />
                  ))}
               </div>
            </div>
          </div>
          <div className="text-center space-y-2 px-4">
            <p className="pixel-font text-xs text-green-400 tracking-widest uppercase animate-pulse font-bold">Resonance Channel Open</p>
            <p className="pixel-font text-[8px] text-green-700 uppercase leading-relaxed tracking-wider max-w-[280px]">
              Ani is listening to your intentions. Speak without haste.
            </p>
          </div>
        </div>
      )}

      {/* Input Bar Overlay */}
      {!isVoiceActive && (
        <div className="p-3 border-t border-green-950/40 bg-[#061206]/95 backdrop-blur-md z-10 shrink-0">
          {selectedImage && (
            <div className="mb-2 relative inline-block animate-in zoom-in duration-200">
              <img src={`data:${selectedImage.mimeType};base64,${selectedImage.base64}`} className="w-16 h-16 object-cover border border-green-900 shadow-md" alt="Scan Preview" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-950 text-red-400 w-5 h-5 flex items-center justify-center border border-red-900 text-xs pixel-font hover:bg-red-900 transition-colors">×</button>
            </div>
          )}

          <div className="flex gap-2 items-center h-11">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className={`w-11 h-11 border-2 transition-all flex items-center justify-center shrink-0 shadow-sm ${selectedImage ? 'bg-green-950/40 border-green-500 text-green-400' : 'bg-[#061206] border-green-950 text-green-700 hover:border-green-800'}`}
              aria-label="Upload Image"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="2"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <div className="flex-1 bg-[#040a04] border-2 border-green-950 flex items-center px-3 h-full focus-within:border-green-700 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Whisper to the grove..."
                className="w-full bg-transparent text-green-200 outline-none pixel-font text-[10px] placeholder:text-green-900"
              />
            </div>
            <PixelButton 
              onClick={handleSend} 
              disabled={isLoading || (!input.trim() && !selectedImage)} 
              variant="primary" 
              className="h-11 px-4 text-[9px] tracking-wider shrink-0"
            >
              SEND
            </PixelButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default AniChat;
