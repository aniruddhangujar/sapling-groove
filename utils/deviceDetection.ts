/**
 * Defensive utility to detect mobile/tablet browser environments.
 * Used to route mobile devices to signInWithRedirect rather than signInWithPopup,
 * which is blocked or produces auth/internal-error on mobile Chrome.
 */
export function isMobileBrowser(): boolean {
  // Safe in SSR / test / build environments
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Tier 1: Modern Client Hints API (Standard in Chromium on Android)
  // userAgentData.mobile is a boolean specifically designed for this purpose
  const uaData = (navigator as any).userAgentData;
  if (uaData && typeof uaData.mobile === 'boolean') {
    return uaData.mobile;
  }

  // Tier 2: User-Agent pattern match (covers Android, iOS, Windows Phone, Opera Mini, etc.)
  const ua = navigator.userAgent || '';
  const mobileUARegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk/i;
  if (mobileUARegex.test(ua)) {
    return true;
  }

  // Tier 3: Secondary touch / coarse pointer check for tablets/devices where UA might mask as desktop
  // (e.g. iPads requesting desktop site where navigator.maxTouchPoints > 1 and coarse pointer matches)
  const isCoarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const hasTouchPoints = typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;

  if (isCoarsePointer && hasTouchPoints) {
    const screenWidth = typeof window.innerWidth === 'number' ? window.innerWidth : 0;
    const screenHeight = typeof window.innerHeight === 'number' ? window.innerHeight : 0;
    const minDimension = Math.min(screenWidth, screenHeight);
    // Treat as mobile candidate only if viewport dimension is tablet-sized (<= 1024px)
    if (minDimension > 0 && minDimension <= 1024) {
      return true;
    }
  }

  return false;
}
