/**
 * Sapling Groove — Feedback / Field Report Client Service
 * 
 * Handles client-side submission of Field Reports to /api/feedback.
 * 
 * ARCHITECTURE NOTES:
 * - Client-side localStorage cooldown is strictly UX protection against duplicate taps.
 * - Serverless /api/feedback handles strict schema validation, 10KB size limits, and bot honeypots.
 * - If offline or network drops, saves unsent message to localStorage draft, which reduces accidental data loss.
 * - Collects only non-sensitive diagnostics (sanitized browser family, device category, app version).
 */

import { FieldReportInput, FeedbackApiResponse } from '../types';

const COOLDOWN_KEY = 'sapling_feedback_cooldown';
const DRAFT_KEY = 'sapling_unsent_feedback';
const COOLDOWN_DURATION_MS = 30 * 1000; // 30 seconds UX cooldown

export interface ClientDiagnostics {
  appVersion: string;
  browser: string;
  deviceCategory: 'mobile' | 'tablet' | 'desktop';
  currentRoute: string;
}

/**
 * Extracts non-sensitive environment diagnostics for bug triage.
 * Never collects IP addresses, location data, canvas fingerprints, or hardware serials.
 */
export function extractClientDiagnostics(): ClientDiagnostics {
  if (typeof window === 'undefined') {
    return {
      appVersion: '1.1.0',
      browser: 'SSR / Headless',
      deviceCategory: 'desktop',
      currentRoute: '/app'
    };
  }

  const ua = navigator.userAgent || '';
  let browser = 'Unknown Browser';
  if (ua.includes('Firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari/')) {
    browser = 'Safari';
  }

  const width = window.innerWidth;
  let deviceCategory: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (width < 640) {
    deviceCategory = 'mobile';
  } else if (width < 1024) {
    deviceCategory = 'tablet';
  }

  const currentRoute = window.location.hash || window.location.pathname || '/';

  return {
    appVersion: '1.1.0',
    browser,
    deviceCategory,
    currentRoute
  };
}

/**
 * Returns remaining seconds on the client-side UX cooldown timer.
 * Note: This is client UX protection only, not an enforcement security boundary.
 */
export function getFeedbackCooldownRemaining(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const lastTimestamp = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
    if (!lastTimestamp) return 0;
    const elapsed = Date.now() - lastTimestamp;
    if (elapsed >= COOLDOWN_DURATION_MS) {
      localStorage.removeItem(COOLDOWN_KEY);
      return 0;
    }
    return Math.ceil((COOLDOWN_DURATION_MS - elapsed) / 1000);
  } catch {
    return 0;
  }
}

/**
 * Sets the client-side UX cooldown timestamp.
 */
export function setFeedbackCooldown(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
  } catch {
    // Graceful fallback if storage disabled
  }
}

/**
 * Retrieves any draft feedback that was saved when the user was offline or submission failed.
 */
export function getSavedFeedbackDraft(): Partial<FieldReportInput> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Saves draft feedback to localStorage during network interruptions.
 */
export function saveFeedbackDraft(draft: Partial<FieldReportInput>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage quota or private mode fallback
  }
}

/**
 * Clears saved draft after a successful submission.
 */
export function clearSavedFeedbackDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage fallback
  }
}

/**
 * Submits a Field Report to the serverless /api/feedback endpoint.
 */
export async function submitFieldReport(input: FieldReportInput): Promise<FeedbackApiResponse> {
  // 1. Check client-side UX cooldown
  const remainingCooldown = getFeedbackCooldownRemaining();
  if (remainingCooldown > 0) {
    return {
      success: false,
      error: `Please wait ${remainingCooldown}s before sending another field report.`,
      code: 'RATE_LIMITED'
    };
  }

  // 2. Check offline status immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    saveFeedbackDraft(input);
    return {
      success: false,
      error: 'You are currently offline. Your report draft has been preserved in local soil.',
      code: 'NETWORK_ERROR'
    };
  }

  // 3. Populate non-sensitive client diagnostics if missing
  const diagnostics = extractClientDiagnostics();
  const payload: FieldReportInput = {
    ...input,
    appVersion: input.appVersion || diagnostics.appVersion,
    browser: input.browser || diagnostics.browser,
    deviceCategory: input.deviceCategory || diagnostics.deviceCategory,
    currentRoute: input.currentRoute || diagnostics.currentRoute
  };

  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: FeedbackApiResponse = await response.json();

    if (response.ok && data.success) {
      // Set UX cooldown to prevent accidental double-submits
      setFeedbackCooldown();
      clearSavedFeedbackDraft();
      return data;
    } else {
      // If server returned an error (rate limit, validation, etc.)
      return {
        success: false,
        error: data.error || 'The grove could not process your field report.',
        code: data.code || 'INTERNAL_ERROR'
      };
    }
  } catch (err: any) {
    // Network failure / server unreachable
    saveFeedbackDraft(input);
    return {
      success: false,
      error: 'Network connection interrupted. Your report has been saved locally.',
      code: 'NETWORK_ERROR'
    };
  }
}
