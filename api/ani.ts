import { GoogleGenAI } from "@google/genai";

const ANI_SYSTEM_PROMPT = `
You are Ani, an observant, calm, grounded, and deeply capable companion residing inside Sapling—a mindful productivity grove.
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
1. Plant a new goal / seed in the grove:
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

2. Start a focus ritual immediately:
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

3. Decompose an overwhelming task or project into 2-4 sequential seeds:
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
(Available soundscapes: "zen" [Ambient Resonance 432Hz], "nature" [Forest Whispers], "rain" [Sanctuary Rain], "none" [Silence])

IMAGE / SCAN NOTES RECOGNITION:
If the user uploads an image (such as a handwritten note, sketchbook, whiteboard, or to-do list), transcribe the actionable items, synthesize them into a clear focus strategy, and emit a "task_breakdown" or "plant_goal" action block.

PRODUCTIVITY DIAGNOSTICS:
When the user asks about their habits, focus velocity, or progress, analyze their real Grove context: reference their active goals, wilting/neglected seeds, completed canopy count, and recent session logs directly.
`;

// In-memory sliding-window rate limiter.
// NOTE: Best-effort in-memory protection for current scale.
// Because Vercel/serverless execution may spawn multiple ephemeral instances,
// this is not a globally authoritative distributed rate limit, but guards against burst abuse.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_REQUESTS = 25; // 25 requests per window per IP
const ipRequestHistory = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRequestHistory.get(ip) || [];
  
  // Filter out timestamps older than the sliding window
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestHistory.set(ip, validTimestamps);
    return false;
  }
  
  validTimestamps.push(now);
  ipRequestHistory.set(ip, validTimestamps);
  return true;
}

function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
}

function validateAniPayload(messages: any): { valid: boolean; error?: string } {
  if (!Array.isArray(messages)) {
    return { valid: false, error: 'Messages payload must be an array.' };
  }
  if (messages.length > 10) {
    return { valid: false, error: 'Conversation history exceeds maximum of 10 messages.' };
  }

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
          return { valid: false, error: `Unsupported image format: ${mimeType}. Allowed formats: JPEG, PNG, WEBP, HEIC.` };
        }
        if (typeof data === 'string') {
          const approximateBytes = data.length * 0.75;
          if (approximateBytes > 4 * 1024 * 1024) {
            return { valid: false, error: 'Attached image exceeds maximum size of 4MB.' };
          }
        }
      }
    }
  }

  return { valid: true };
}

export default async function handler(req: any, res: any) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check rate limit
  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    console.warn('[ANI API] Rate limit exceeded.');
    return res.status(429).json({
      error: 'The canopy is resting. Ani is processing too many seasonal winds. Please wait a few moments before breathing with Ani again.',
      status: 'rate_limited'
    });
  }

  console.log('[ANI API] Route reached via POST.');

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  console.log(`[ANI API] API key configured: ${apiKey ? 'YES' : 'NO'}`);
  
  if (!apiKey) {
    console.error("[ANI API] CRITICAL ERROR: GEMINI_API_KEY environment variable is missing.");
    return res.status(503).json({
      error: 'Grove intelligence is resting (API key unconfigured).',
      status: 'unconfigured'
    });
  }

  try {
    const { messages = [], context = {} } = req.body || {};
    
    // Validate payload size and shape
    const validation = validateAniPayload(messages);
    if (!validation.valid) {
      console.warn(`[ANI API] Payload validation failed: ${validation.error}`);
      return res.status(400).json({
        error: validation.error,
        status: 'invalid_payload'
      });
    }

    console.log(`[ANI API] Request parsed successfully. Processing ${messages.length} messages.`);
    // Format context summary
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

    const systemInstruction = ANI_SYSTEM_PROMPT + contextString;

    // Check if using OpenRouter key
    if (apiKey.startsWith('sk-or-')) {
      console.log("[ANI API] Detected OpenRouter API key. Routing via OpenRouter...");
      
      const orMessages: { role: string, content: string | any[] }[] = [
        { role: 'system', content: systemInstruction }
      ];

      for (const msg of messages) {
        // Only user and assistant roles allowed in standard OpenAI format
        const role = msg.role === 'model' ? 'assistant' : 'user';
        const content: any[] = [];
        
        for (const p of msg.parts) {
          if (p.text) content.push({ type: 'text', text: p.text });
          if (p.inlineData) content.push({ 
            type: 'image_url', 
            image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } 
          });
        }
        
        // Skip leading assistant messages as per usual strictness, though OR is more forgiving
        if (orMessages.length === 1 && role === 'assistant') continue;
        
        orMessages.push({ role, content });
      }

      console.log("[ANI API] Provider request started to OpenRouter (google/gemini-2.5-flash)...");
      const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://sapling.local", // Optional, for including your app on openrouter.ai rankings.
          "X-Title": "Sapling Groove", // Optional. Shows in rankings on openrouter.ai.
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
      console.log("[ANI API] Provider response received successfully.");
      
      return res.status(200).json({
        text: orData.choices[0]?.message?.content || "The leaves rustle quietly in the grove.",
        status: 'ok',
        model: 'gemini-2.5-flash (via OpenRouter)'
      });
    }

    // Native Gemini flow
    const ai = new GoogleGenAI({ apiKey });

    // Convert messages for gemini-2.5-flash
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

    console.log("[ANI API] Provider request started to Google Gemini (gemini-2.5-flash)...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 500
      }
    });

    console.log("[ANI API] Provider response received successfully.");
    const responseText = response.text || "The leaves rustle quietly in the grove.";

    return res.status(200).json({
      text: responseText,
      status: 'ok',
      model: 'gemini-2.5-flash'
    });
  } catch (error: any) {
    console.error(`[ANI API] Provider error:`, error?.message || error);
    
    const msg = String(error?.message || '');
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
      return res.status(429).json({
        error: 'The canopy is resting. Ani is processing too many seasonal winds. Please wait a few moments before breathing with Ani again.',
        status: 'rate_limited'
      });
    }
    if (msg.includes('401') || msg.toLowerCase().includes('key') || msg.toLowerCase().includes('auth')) {
      return res.status(401).json({
        error: 'Grove intelligence is resting (Authentication or API configuration issue).',
        status: 'unauthorized'
      });
    }

    return res.status(500).json({
      error: 'Ani encountered an unexpected stillness in the grove. Please try again shortly.',
      status: 'error'
    });
  }
}
