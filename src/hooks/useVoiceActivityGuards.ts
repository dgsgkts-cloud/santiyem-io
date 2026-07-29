// ============================================================
// src/hooks/useVoiceActivityGuards.ts
// Sprint 32.2 — decides when Always Listening must suspend.
// Privacy rule: the microphone is only allowed to run while the
// app is genuinely in the foreground and the user is not typing
// or interacting with a blocking surface.
// ============================================================

import { useEffect, useState } from "react";

export type VoicePauseReason =
  | "background"
  | "typing"
  | "dialog"
  | "file-picker"
  | "permission";

export interface VoiceActivityGuards {
  /** Non-empty → wake-word detection must be paused. */
  reasons: VoicePauseReason[];
  paused: boolean;
}

const FILE_PICKER_GRACE_MS = 500;

function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  const node = el as HTMLElement;
  const tag = node.tagName;
  if (tag === "TEXTAREA") return true;
  if (node.isContentEditable) return true;
  if (tag === "INPUT") {
    const type = (node as HTMLInputElement).type;
    // Buttons/checkboxes don't open a keyboard.
    return !["button", "submit", "reset", "checkbox", "radio", "range", "color"].includes(type);
  }
  return false;
}

/** Radix dialogs, sheets and popovers all expose an open data-state. */
function hasOpenDialog(): boolean {
  return !!document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
  );
}

export function useVoiceActivityGuards(enabled: boolean): VoiceActivityGuards {
  const [reasons, setReasons] = useState<VoicePauseReason[]>([]);

  useEffect(() => {
    if (!enabled) { setReasons([]); return; }

    let filePickerOpen = false;
    let permissionPending = false;
    let filePickerTimer: number | null = null;

    const evaluate = () => {
      const next: VoicePauseReason[] = [];
      // Backgrounded tab, locked screen or minimised window.
      if (document.hidden || !document.hasFocus()) next.push("background");
      if (isTextEntry(document.activeElement)) next.push("typing");
      if (hasOpenDialog()) next.push("dialog");
      if (filePickerOpen) next.push("file-picker");
      if (permissionPending) next.push("permission");

      setReasons((prev) =>
        prev.length === next.length && prev.every((r, i) => r === next[i]) ? prev : next,
      );
    };

    // --- file picker / camera capture ---------------------------------
    // Clicking a file input blurs the window; we clear the flag once focus
    // returns, which also covers the native camera sheet on mobile.
    const onClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const input = target?.closest?.('input[type="file"]') as HTMLInputElement | null;
      if (!input) return;
      filePickerOpen = true;
      evaluate();
    };
    const clearFilePicker = () => {
      if (!filePickerOpen) return;
      if (filePickerTimer) window.clearTimeout(filePickerTimer);
      filePickerTimer = window.setTimeout(() => {
        filePickerOpen = false;
        evaluate();
      }, FILE_PICKER_GRACE_MS);
    };

    // --- microphone permission ----------------------------------------
    // While the browser prompt is on screen we must not hold the mic.
    const onPermissionRequest = () => { permissionPending = true; evaluate(); };
    const onPermissionSettled = () => { permissionPending = false; evaluate(); };

    const onFocus = () => { clearFilePicker(); evaluate(); };

    document.addEventListener("visibilitychange", evaluate);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", evaluate);
    window.addEventListener("pagehide", evaluate);
    document.addEventListener("focusin", evaluate);
    document.addEventListener("focusout", evaluate);
    document.addEventListener("click", onClick, true);
    document.addEventListener("change", clearFilePicker, true);
    window.addEventListener("voice-permission-request", onPermissionRequest);
    window.addEventListener("voice-permission-settled", onPermissionSettled);

    // Dialogs mount/unmount without firing focus events reliably.
    const observer = new MutationObserver(evaluate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "role", "aria-hidden"],
    });

    evaluate();

    return () => {
      observer.disconnect();
      if (filePickerTimer) window.clearTimeout(filePickerTimer);
      document.removeEventListener("visibilitychange", evaluate);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", evaluate);
      window.removeEventListener("pagehide", evaluate);
      document.removeEventListener("focusin", evaluate);
      document.removeEventListener("focusout", evaluate);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("change", clearFilePicker, true);
      window.removeEventListener("voice-permission-request", onPermissionRequest);
      window.removeEventListener("voice-permission-settled", onPermissionSettled);
    };
  }, [enabled]);

  return { reasons, paused: reasons.length > 0 };
}
