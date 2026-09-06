/**
 * Global WebGLRenderer Lifecycle Tracker
 * Tracks live THREE.WebGLRenderer instances to enforce the hard ceiling <= 4.
 */

declare global {
  interface Window {
    __activeWebGLRenderers?: number;
    __activeWebGLRendererNames?: string[];
  }
}

export function trackWebGLRenderer(name: string): () => void {
  if (typeof window === 'undefined') return () => {};

  if (window.__activeWebGLRenderers === undefined) {
    window.__activeWebGLRenderers = 0;
  }
  if (!window.__activeWebGLRendererNames) {
    window.__activeWebGLRendererNames = [];
  }

  window.__activeWebGLRenderers++;
  window.__activeWebGLRendererNames.push(name);
  console.log(`[WebGL +1] Created: ${name}. Total active: ${window.__activeWebGLRenderers} (${window.__activeWebGLRendererNames.join(', ')})`);

  return () => {
    if (window.__activeWebGLRenderers !== undefined && window.__activeWebGLRenderers > 0) {
      window.__activeWebGLRenderers--;
      if (window.__activeWebGLRendererNames) {
        const idx = window.__activeWebGLRendererNames.indexOf(name);
        if (idx !== -1) window.__activeWebGLRendererNames.splice(idx, 1);
      }
      console.log(`[WebGL -1] Disposed: ${name}. Total active: ${window.__activeWebGLRenderers} (${window.__activeWebGLRendererNames?.join(', ')})`);
    }
  };
}
