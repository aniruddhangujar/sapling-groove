import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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

        const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
        console.log(`[ANI API DEV] Route reached via POST.`);
        console.log(`[ANI API DEV] API key configured: ${key ? 'YES' : 'NO'}`);

        if (!key) {
          console.error("[ANI API DEV] CRITICAL ERROR: GEMINI_API_KEY environment variable is missing.");
          res.writeHead(503, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({
            error: 'GEMINI_API_KEY is not configured in the server environment. Please add it to your environment variables.',
            status: 'unconfigured'
          }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { messages = [], context = {} } = JSON.parse(body || '{}');
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
            if (context.activeSessionMode) {
              contextString += `- Current Mode: ${context.activeSessionMode}\n`;
            }
            if (context.recentSessions && context.recentSessions.length > 0) {
              contextString += `- Recent Sessions: ${context.recentSessions.map((s: any) => `${s.mode} on ${s.goalName} (${s.durationMinutes}m)`).join(', ')}\n`;
            }

            const systemInstruction = `You are Ani, an observant, calm, and thoughtful companion residing inside Sapling—a mindful productivity grove.
Speak with gentle grounding, concise answers (1-3 short paragraphs), and subtle botanical metaphors.
Never sound corporate, cheerleader-like, or robotic.
When asked about goals or stats, reference their actual provided Grove context.` + contextString;

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
            console.error(`[ANI API DEV] Provider error status/message:`, e.message);
            const status = e.status || (e.message.includes('key') ? 401 : 500);
            res.writeHead(status, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ error: e.message, status: 'error' }));
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
              'vendor-react': ['react', 'react-dom']
            }
          }
        }
      }
    };
});
