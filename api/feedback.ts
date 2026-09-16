import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// In-memory sliding-window IP rate limiter
// NOTE: Best-effort per serverless container instance only (not globally synchronized across instances).
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_SUBMISSIONS = 5;
const ipRequestHistory = new Map<string, number[]>();

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRequestHistory.get(ip) || [];
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= RATE_LIMIT_MAX_SUBMISSIONS) {
    ipRequestHistory.set(ip, validTimestamps);
    return false;
  }
  
  validTimestamps.push(now);
  ipRequestHistory.set(ip, validTimestamps);
  return true;
}

const ALLOWED_CATEGORIES = ['bug', 'feature', 'ux', 'appreciation', 'other'] as const;
const ALLOWED_DEVICE_CATEGORIES = ['mobile', 'tablet', 'desktop'] as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PAYLOAD_BYTES = 10 * 1024; // 10 KB

// Helper to get or initialize Firestore server-side
function getServerDb() {
  const env = process.env;
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    return null;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp({
    apiKey,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
  });

  return getFirestore(app);
}

export default async function handler(req: any, res: any) {
  // CORS & method verification
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Only POST is accepted.',
      code: 'INVALID_PAYLOAD'
    });
  }

  // 1. Hard body-size check (reject oversized payloads before processing)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({
      success: false,
      error: 'Payload exceeds maximum allowed size of 10KB.',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }

  // 2. Best-effort serverless IP rate limiting
  const forwardedFor = req.headers['x-forwarded-for'];
  const clientIp = (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0] : req.socket?.remoteAddress || '127.0.0.1').trim();
  
  if (!checkIpRateLimit(clientIp)) {
    return res.status(429).json({
      success: false,
      error: 'The grove is receiving many observations. Please wait a few minutes before submitting another report.',
      code: 'RATE_LIMITED'
    });
  }

  try {
    const body = req.body || {};

    // 3. Honeypot check for automated bot scrapers
    // If hp_bot_trap is populated, silently acknowledge without saving to foil spam bots
    if (body.hp_bot_trap && typeof body.hp_bot_trap === 'string' && body.hp_bot_trap.trim().length > 0) {
      return res.status(200).json({
        success: true,
        reportId: 'rep_ack_' + Date.now().toString(36),
        message: 'Field report received.'
      });
    }

    // 4. Schema validation
    const category = typeof body.category === 'string' ? body.category.toLowerCase().trim() : '';
    if (!ALLOWED_CATEGORIES.includes(category as any)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feedback category specified.',
        code: 'INVALID_PAYLOAD'
      });
    }

    const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
    if (rawMessage.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Report message must be at least 3 characters.',
        code: 'INVALID_PAYLOAD'
      });
    }
    if (rawMessage.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Report message cannot exceed 2,000 characters.',
        code: 'INVALID_PAYLOAD'
      });
    }

    let sanitizedEmail: string | undefined = undefined;
    if (body.contactEmail && typeof body.contactEmail === 'string') {
      const trimmedEmail = body.contactEmail.trim();
      if (trimmedEmail.length > 0) {
        if (trimmedEmail.length > 100 || !EMAIL_REGEX.test(trimmedEmail)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid contact email format provided.',
            code: 'INVALID_PAYLOAD'
          });
        }
        sanitizedEmail = trimmedEmail;
      }
    }

    const appVersion = typeof body.appVersion === 'string' ? body.appVersion.slice(0, 20) : '1.0.0';
    const browser = typeof body.browser === 'string' ? body.browser.slice(0, 100) : 'Unknown';
    const deviceCategory = ALLOWED_DEVICE_CATEGORIES.includes(body.deviceCategory) ? body.deviceCategory : 'desktop';
    const currentRoute = typeof body.currentRoute === 'string' ? body.currentRoute.slice(0, 100) : '/app';
    const isGuest = body.isGuest !== false;
    const userId = (!isGuest && typeof body.userId === 'string') ? body.userId.slice(0, 128) : null;

    const reportId = 'rep_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

    // 5. Explicit, sanitized document construction (NEVER pass arbitrary client body)
    const cleanDocument = {
      id: reportId,
      category,
      message: rawMessage,
      ...(sanitizedEmail ? { contactEmail: sanitizedEmail } : {}),
      appVersion,
      browser,
      deviceCategory,
      currentRoute,
      createdAt: Date.now(),
      userId,
      isGuest
    };

    // 6. Persistence
    const db = getServerDb();
    if (db) {
      await addDoc(collection(db, 'feedback'), cleanDocument);
    }

    // 7. Non-sensitive operational logging (NO email, NO message content, NO raw IP)
    console.log('[Feedback API] Field report recorded:', {
      reportId,
      category,
      deviceCategory,
      createdAt: cleanDocument.createdAt
    });

    return res.status(200).json({
      success: true,
      reportId,
      message: 'Field report received. Thanks for helping the Grove grow.'
    });

  } catch (err: any) {
    // Safe error handling without leaking internal stack traces or secrets
    console.error('[Feedback API] Processing error occurred.');
    return res.status(500).json({
      success: false,
      error: 'Your report could not be transmitted. Please try again shortly.',
      code: 'INTERNAL_ERROR'
    });
  }
}
