import { useEffect } from "react";

/**
 * Global safety net for a well-known Radix Primitives bug:
 * when a Dialog / Sheet / Dropdown / Popover / Select closes — especially
 * when several close in sequence, or one closes while another was opening —
 * `pointer-events: none` and/or `overflow: hidden` occasionally remain
 * stuck on <body>. Scrollbar dragging still works (browser chrome ignores
 * pointer-events), but mouse-wheel / touchpad / Magic Mouse scrolling stops
 * firing on the page content.
 *
 * This hook observes body's inline style + Radix' scroll-lock attributes
 * and clears the stuck styles as soon as no Radix modal is actually open.
 */
export function useBodyScrollUnlocker() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;

    const hasOpenModal = () =>
      !!document.querySelector(
        [
          '[data-state="open"][role="dialog"]',
          '[data-state="open"][role="alertdialog"]',
          '[data-radix-popper-content-wrapper]',
          '[data-radix-focus-guard]',
        ].join(","),
      );

    const cleanupIfSafe = () => {
      if (hasOpenModal()) return;
      // Only clear values Radix set — leave anything else alone.
      if (body.style.pointerEvents === "none") body.style.pointerEvents = "";
      // Body overflow lock: only clear it, don't fight legitimate app CSS.
      if (body.style.overflow === "hidden") body.style.overflow = "";
      if (body.hasAttribute("data-scroll-locked")) {
        body.removeAttribute("data-scroll-locked");
      }
    };

    // Initial sweep on mount (covers hot reloads mid-modal).
    cleanupIfSafe();

    const observer = new MutationObserver(() => {
      // Defer so Radix' own cleanup runs first if it's about to.
      queueMicrotask(cleanupIfSafe);
    });

    observer.observe(body, {
      attributes: true,
      attributeFilter: ["style", "data-scroll-locked"],
    });

    // Also sweep on route / focus changes as a belt-and-braces measure.
    const onFocus = () => cleanupIfSafe();
    window.addEventListener("focus", onFocus);
    window.addEventListener("popstate", onFocus);

    return () => {
      observer.disconnect();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("popstate", onFocus);
    };
  }, []);
}
