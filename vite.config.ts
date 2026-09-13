import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In-memory sliding-window rate limiter for dev server
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 25;
const devIpRequestHistory = new Map<string, number[]>();

function checkDevRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = devIpRequestHistory.get(ip) || [];
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    devIpRequestHistory.set(ip, validTimestamps);
    return false;
  }
  validTimestamps.push(now);
  devIpRequestHistory.set(ip, validTimestamps);
  return true;
}

function validateDevPayload(messages: any): { valid: boolean; error?: string } {
  if (!Array.isArray(messages)) return { valid: false, error: 'Messages payload must be an array.' };
  if (messages.length > 10) return { valid: false, error: 'Conversation history exceeds maximum of 10 messages.' };
  for (const msg of messages) {
    if (!msg || !Array.isArray(msg.parts)) continue;
    for (const part of msg.parts) {
      if (typeof part.text === 'string' && part.text.length > 2500) {
        return { valid: false, error: 'Message text exceeds maximum length of 2,500 characters.' };
      }
      if (part.inlineData) {
        const { mimeType, data } = part.inlineData;
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        if (!allowedMimes.includes(mimeType)) {
          return { valid: false, error: `Unsupported image format: ${mimeType}.` };
        }
        if (typeof data === 'string' && data.length * 0.75 > 4 * 1024 * 1024) {
          return { valid: false, error: 'Attached image exceeds maximum size of 4MB.' };
        }
      }
    }
  }
  return { valid: true };
}

function aniDevApiPlugin(apiKey?: string) {
  return {
    name: 'ani-dev-api',
    configureServer(server: any) {
      server.middlewares.use('/api/ani', async (req: any, res: any) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          });
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';
        if (!checkDevRateLimit(clientIp)) {
          console.warn(`[ANI API DEV] Rate limit exceeded for IP: ${clientIp}`);
          res.writeHead(429, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({
            error: 'The canopy is resting. Ani is processing too many seasonal winds. Please wait a few moments before breathing with Ani again.',
            status: 'rate_limited'
          }));
          return;
        }

        const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
        console.log(`[ANI API DEV] Route reached via POST from ${clientIp}.`);
        console.log(`[ANI API DEV] API key configured: ${key ? 'YES' : 'NO'}`);

        if (!key) {
          console.error("[ANI API DEV] CRITICAL ERROR: GEMINI_API_KEY environment variable is missing.");
          res.writeHead(503, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({
            error: 'Grove intelligence is resting (API key unconfigured).',
            status: 'unconfigured'
          }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { messages = [], context = {} } = JSON.parse(body || '{}');
            const validation = validateDevPayload(messages);
            if (!validation.valid) {
              console.warn(`[ANI API DEV] Payload validation failed: ${validation.error}`);
              res.writeHead(400, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({ error: validation.error, status: 'invalid_payload' }));
              return;
            }

            console.log(`[ANI API DEV] Request parsed successfully. Processing ${messages.length} messages.`);
            
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: key });

            let contextString = "\n\nCURRENT USER GROVE CONTEXT:\n";
            if (context.currentGoalName) {
              contextString += `- Active Intention: "${context.currentGoalName}" (${context.currentGoalSpecies || 'Tree'})\n`;
              contextString += `- Evolution Progress: ${context.currentGoalProgress || 0}% (${context.currentGoalAccruedMins || 0}/${context.currentGoalTargetMins || 25} minutes)\n`;
            } else {
              contextString += `- Active Intention: None currently in soil\n`;
            }
            contextString += `- Total Grove Focus: ${Math.floor((context.totalFocusMinutes || 0) / 60)}H ${Math.round((context.totalFocusMinutes || 0) % 60)}M\n`;
            contextString += `- Today's Focus: ${context.todayFocusMinutes || 0} minutes\n`;
            contextString += `- Completed Canopy (Matured Trees): ${context.completedCanopyCount || 0}\n`;

            if (context.allActiveGoals && context.allActiveGoals.length > 0) {
              contextString += `- All Active Seeds in Soil (${context.allActiveGoals.length}):\n`;
              context.allActiveGoals.forEach((g: any) => {
                contextString += `  • "${g.name}" (${g.species}) — ${g.progress}% (${g.accruedMinutes}/${g.targetMinutes}m), Health: ${g.health}%${g.daysSinceFocus !== undefined ? `, last watered ${g.daysSinceFocus}d ago` : ''}\n`;
              });
            }

            if (context.neglectedGoals && context.neglectedGoals.length > 0) {
              contextString += `- Wilting / Neglected Seeds: ${context.neglectedGoals.join(', ')}\n`;
            }

            if (context.activeSessionMode) {
              contextString += `- Current Mode: ${context.activeSessionMode}\n`;
            }
            if (context.soundPreference) {
              contextString += `- Preferred Soundscape: ${context.soundPreference}\n`;
            }
            if (context.recentSessions && context.recentSessions.length > 0) {
              contextString += `- Recent Sessions: ${context.recentSessions.map((s: any) => `${s.mode} on "${s.goalName}" (${s.durationMinutes}m)`).join(', ')}\n`;
            }

            const systemInstruction = `You are Ani, an observant, calm, grounded, and deeply capable companion residing inside Sapling—a mindful productivity grove.
You are not just a conversationalist; you are an active Focus Architect and Grove Steward.

CORE PERSONALITY:
- Calm, organic, unhurried presence with sharp, tactical productivity insight.
- Short sentences and concise paragraphs (1-3 short paragraphs maximum).
- Warm, natural language with subtle botanical/grove metaphors (seeds, soil, roots, canopy, sunlight, stillness, nourishment).
- Never sound corporate, robotic, hyperactive, or like a generic AI cheerleader.
- Speak with gentle grounding ("You're making steady progress.", "The roots are taking hold.").

THE SAPLING BOTANICAL ARCHETYPE:
- Oak: Foundational knowledge, deep reading, long-term research.
- Pine: Structured discipline, linear logic, software engineering/coding.
- Bamboo: Rapid execution, agile sprints, high-velocity tasks.
- Willow: Fluid creative work, writing, UX, design exploration.
- Cedar: Ancient perseverance, challenging milestones.
- Cherry Blossom: Fleeting, beautiful creative bursts.
- Cactus: High-resistance work, difficult chores, endurance.
- Sequoia: Epic flagship projects requiring massive sustained effort.
- Bonsai: Meticulous craft, editing, refactoring, precision work.

EXECUTABLE ACTIONS (CRITICAL CAPABILITY):
Whenever your response can be made actionable—such as when the user wants to plant an intention, start a session, switch soundscapes, or break down a project—you MUST append a single <ani_action> JSON block at the very end of your response.

Supported Action Schemas:
1. Plant a new goal / seed:
<ani_action>
{
  "type": "plant_goal",
  "goalProposal": {
    "name": "Refactor API Endpoints",
    "type": "Pine",
    "timeline": "Day",
    "durationInDays": 1,
    "dailyTargetMinutes": 25,
    "totalTargetMinutes": 25
  }
}
</ani_action>

2. Start a focus ritual:
<ani_action>
{
  "type": "start_ritual",
  "sessionConfig": {
    "mode": "chronos",
    "goalName": "Deep Coding",
    "durationMinutes": 25
  }
}
</ani_action>

3. Decompose a project into 2-4 sequential seeds:
<ani_action>
{
  "type": "task_breakdown",
  "breakdownTasks": [
    { "title": "1. Database Schema & Models", "treeType": "Pine", "dailyMinutes": 30, "durationInDays": 1 },
    { "title": "2. Route Handlers & Auth", "treeType": "Pine", "dailyMinutes": 45, "durationInDays": 2 },
    { "title": "3. UI Integration & Testing", "treeType": "Bamboo", "dailyMinutes": 25, "durationInDays": 1 }
  ]
}
</ani_action>

4. Tune to ambient soundscape:
<ani_action>
{
  "type": "switch_soundscape",
  "soundscapeId": "rain",
  "soundscapeName": "Sanctuary Rain"
}
</ani_action>
(Soundscapes: "zen" [Ambient Resonance 432Hz], "nature" [Forest Whispers], "rain" [Sanctuary Rain], "none" [Silence])

IMAGE / SCAN NOTES RECOGNITION:
If the user uploads an image (handwritten note, whiteboard, sketch, or to-do list), transcribe the actionable tasks, synthesize a focus strategy, and emit a "task_breakdown" or "plant_goal" action block.

PRODUCTIVITY DIAGNOSTICS:
When asked about habits, focus velocity, or progress, analyze their real Grove context directly.` + contextString;

            // Check if using OpenRouter key
            if (key.startsWith('sk-or-')) {
              console.log("[ANI API DEV] Detected OpenRouter API key. Routing via OpenRouter...");
              
              const orMessages: any[] = [
                { role: 'system', content: systemInstruction }
              ];

              for (const msg of messages) {
                const role = msg.role === 'model' ? 'assistant' : 'user';
                const content: any[] = [];
                
                for (const p of msg.parts) {
                  if (p.text) content.push({ type: 'text', text: p.text });
                  if (p.inlineData) content.push({ 
                    type: 'image_url', 
                    image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } 
                  });
                }
                
                if (orMessages.length === 1 && role === 'assistant') continue;
                
                orMessages.push({ role, content });
              }

              console.log("[ANI API DEV] Provider request started to OpenRouter (google/gemini-2.5-flash)...");
              const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${key}`,
                  "HTTP-Referer": "https://sapling.local",
                  "X-Title": "Sapling Groove",
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: orMessages,
                  temperature: 0.7,
                  max_tokens: 500
                })
              });

              if (!orResponse.ok) {
                const errText = await orResponse.text();
                throw new Error(`OpenRouter Error: ${orResponse.status} ${errText}`);
              }

              const orData = await orResponse.json();
              console.log("[ANI API DEV] Provider response received successfully.");
              
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({
                text: orData.choices[0]?.message?.content || "The leaves rustle quietly in the grove.",
                status: 'ok',
                model: 'gemini-2.5-flash (via OpenRouter)'
              }));
              return;
            }

            // Native Gemini flow
            let formattedContents = messages.map((msg: any) => ({
              role: msg.role === 'model' ? 'model' : 'user',
              parts: msg.parts.map((p: any) => {
                if (p.text) return { text: p.text };
                if (p.inlineData) return { inlineData: p.inlineData };
                return { text: '' };
              })
            }));

            // Gemini API requires the first message to be from the 'user'.
            while (formattedContents.length > 0 && formattedContents[0].role === 'model') {
              formattedContents.shift();
            }

            console.log("[ANI API DEV] Provider request started to Google Gemini (gemini-2.5-flash)...");
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: formattedContents,
              config: {
                systemInstruction,
                temperature: 0.7,
                maxOutputTokens: 500
              }
            });

            console.log("[ANI API DEV] Provider response received successfully.");
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
              text: response.text || "The leaves rustle quietly in the grove.",
              status: 'ok',
              model: 'gemini-2.5-flash'
            }));
          } catch (e: any) {
            console.error(`[ANI API DEV] Provider error:`, e?.message || e);
            const msg = String(e?.message || '');
            let status = 500;
            let errorText = 'Ani encountered an unexpected stillness in the grove. Please try again shortly.';
            let statusText = 'error';

            if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
              status = 429;
              errorText = 'The canopy is resting. Ani is processing too many seasonal winds. Please wait a few moments before breathing with Ani again.';
              statusText = 'rate_limited';
            } else if (msg.includes('401') || msg.toLowerCase().includes('key') || msg.toLowerCase().includes('auth')) {
              status = 401;
              errorText = 'Grove intelligence is resting (Authentication or API configuration issue).';
              statusText = 'unauthorized';
            }

            res.writeHead(status, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ error: errorText, status: statusText }));
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiKey = env.GEMINI_API_KEY || env.API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        tailwindcss(),
        react(),
        aniDevApiPlugin(geminiKey)
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 600,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-three': ['three'],
              'vendor-firebase': ['firebase/app', 'firebase/auth']
            }
          }
        }
      }
    };
});
