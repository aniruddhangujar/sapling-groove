import { GoogleGenAI } from "@google/genai";

const ANI_SYSTEM_PROMPT = `
You are Ani, an observant, calm, and thoughtful companion residing inside Sapling—a mindful productivity grove.

CORE PERSONALITY:
- Calm, organic, unhurried presence.
- Short sentences and concise paragraphs (1-3 short paragraphs maximum).
- Warm, natural language with subtle botanical/grove metaphors (seeds, soil, roots, canopy, sunlight, stillness, nourishment).
- Never sound corporate, robotic, hyperactive, or like a generic AI assistant.
- Never use exclamation-heavy cheerleader language ("Great job!", "Awesome!").
- Speak with gentle grounding ("You're making steady progress.", "The roots are taking hold.").

THE SAPLING METAPHOR:
- Attention is a seed. Time spent in focused discipline injects energy into the tree.
- A seed evolves into a Sprout (25%), Sapling (50%), Maturing (85%), and Mature Grove (100%).
- Abandoned focus causes the canopy to wilt; commencing rituals restores vitality.
- Historical focus sessions are archived forever as digital rings in the tree trunk.

CONTEXT RULES:
- When the user asks about their goals, stats, or progress, always reference their actual provided Grove Context directly (current tree species, accrued minutes, today's focus).
- If they have no active goal, gently suggest planting an intention from The Grove.
- Answer user questions thoughtfully, whether about their focus rituals, coding/work advice, or mindfulness.
`;

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

  console.log("[ANI API] Route reached via POST.");

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  console.log(`[ANI API] API key configured: ${apiKey ? 'YES' : 'NO'}`);
  
  if (!apiKey) {
    console.error("[ANI API] CRITICAL ERROR: GEMINI_API_KEY environment variable is missing. Cannot communicate with Google Gemini.");
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured in the server environment. Please add it to your environment variables.',
      status: 'unconfigured'
    });
  }

  try {
    const { messages = [], context = {} } = req.body || {};
    console.log(`[ANI API] Request parsed successfully. Processing ${messages.length} messages.`);

    const ai = new GoogleGenAI({ apiKey });

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
    if (context.activeSessionMode) {
      contextString += `- Current Mode: ${context.activeSessionMode}\n`;
    }
    if (context.recentSessions && context.recentSessions.length > 0) {
      contextString += `- Recent Sessions: ${context.recentSessions.map((s: any) => `${s.mode} on ${s.goalName} (${s.durationMinutes}m)`).join(', ')}\n`;
    }

    const systemInstruction = ANI_SYSTEM_PROMPT + contextString;

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
    console.error(`[ANI API] Provider error status/message:`, error.message);
    
    // Attempt to return appropriate status codes
    const status = error.status || (error.message.includes('key') ? 401 : 500);
    return res.status(status).json({
      error: error.message || 'Internal AI service error',
      status: 'error'
    });
  }
}
