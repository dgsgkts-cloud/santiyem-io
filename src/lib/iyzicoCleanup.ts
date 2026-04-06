/**
 * Cleans up iyzico checkout overlays/modals from the DOM
 * and restores body scrolling + pointer events.
 */
export function cleanupIyzicoOverlay() {
  // Remove iyzico containers
  document.querySelectorAll(
    '[id*="iyzico-checkout-container"], [class*="iyzico"], [id*="iyzico"]'
  ).forEach((el) => {
    (el as HTMLElement).style.display = "none";
    (el as HTMLElement).style.pointerEvents = "none";
  });

  // Remove any leftover overlay/backdrop elements injected by iyzico
  document.querySelectorAll(
    '[class*="overlay"], [class*="backdrop"], [class*="modal-backdrop"]'
  ).forEach((el) => {
    // Only remove elements that look like full-screen overlays
    const style = window.getComputedStyle(el);
    if (style.position === "fixed" || style.position === "absolute") {
      (el as HTMLElement).style.display = "none";
      (el as HTMLElement).style.pointerEvents = "none";
    }
  });

  // Restore body & html scrolling and interaction
  document.body.style.overflow = "auto";
  document.body.style.pointerEvents = "auto";
  document.documentElement.style.overflow = "auto";
}

/**
 * Listens for iyzico postMessage events and cleans up when the modal closes.
 * Returns a cleanup function to remove the listener.
 */
export function listenForIyzicoClose(): () => void {
  const handler = (event: MessageEvent) => {
    // iyzico sends messages when checkout completes or closes
    if (
      typeof event.data === "string" &&
      (event.data.includes("iyzico") ||
        event.data.includes("iyzico") ||
        event.data.includes("checkout"))
    ) {
      cleanupIyzicoOverlay();
    }
    // iyzico also sends object messages
    if (typeof event.data === "object" && event.data !== null) {
      const d = event.data as Record<string, unknown>;
      if (d.type === "iyzicoCheckoutFormResult" || d.status || d.token) {
        cleanupIyzicoOverlay();
      }
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
