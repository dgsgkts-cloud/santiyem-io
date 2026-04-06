/**
 * Aggressively cleans up iyzico checkout overlays/modals from the DOM
 * and restores body scrolling + pointer events.
 */
export function cleanupIyzicoOverlay() {
  // Restore body & html scrolling and interaction
  document.body.style.overflow = '';
  document.body.style.pointerEvents = '';
  document.documentElement.style.overflow = '';

  // Remove iyzico iframes
  document.querySelectorAll('iframe[src*="iyzico"], iframe[src*="iyzipay"]').forEach(el => el.remove());

  // Remove iyzico containers and overlays
  document.querySelectorAll(
    '[class*="iyzico"], [id*="iyzico"], [class*="iyzi"], [id*="iyzi"]'
  ).forEach(el => el.remove());

  // Remove any leftover fixed overlay/backdrop elements
  document.querySelectorAll('div[style*="position: fixed"]').forEach(el => {
    const htmlEl = el as HTMLElement;
    const bg = htmlEl.style.backgroundColor;
    if (
      bg === 'rgba(0, 0, 0, 0.5)' ||
      bg === 'rgba(0,0,0,0.5)' ||
      bg === 'rgba(0, 0, 0, 0.8)' ||
      bg === 'rgba(0,0,0,0.8)' ||
      bg.includes('rgba(0') ||
      htmlEl.classList.contains('bg-black/80') ||
      htmlEl.classList.contains('bg-black/60')
    ) {
      // Check if it's likely an iyzico overlay (high z-index)
      const zIndex = parseInt(htmlEl.style.zIndex || '0');
      if (zIndex >= 200) {
        htmlEl.remove();
      }
    }
  });

  // Remove modal backdrop classes
  document.querySelectorAll('[class*="overlay"], [class*="backdrop"], [class*="modal-backdrop"]').forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'absolute') {
      const zIndex = parseInt(style.zIndex || '0');
      if (zIndex >= 200) {
        (el as HTMLElement).remove();
      }
    }
  });
}

/**
 * Listens for iyzico postMessage events, Escape key, and cleans up when the modal closes.
 * Returns a cleanup function to remove the listeners.
 */
export function listenForIyzicoClose(): () => void {
  const messageHandler = (event: MessageEvent) => {
    if (typeof event.data === 'string') {
      if (
        event.data.includes('iyzico') ||
        event.data.includes('checkout') ||
        event.data === 'modal-closed'
      ) {
        cleanupIyzicoOverlay();
      }
    }
    if (typeof event.data === 'object' && event.data !== null) {
      const d = event.data as Record<string, unknown>;
      if (
        d.type === 'iyzicoCheckoutFormResult' ||
        d.type === 'iyzico:closed' ||
        d.status === 'closed' ||
        d.status ||
        d.token
      ) {
        cleanupIyzicoOverlay();
      }
    }
  };

  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanupIyzicoOverlay();
    }
  };

  window.addEventListener('message', messageHandler);
  document.addEventListener('keydown', keyHandler);

  return () => {
    window.removeEventListener('message', messageHandler);
    document.removeEventListener('keydown', keyHandler);
  };
}
