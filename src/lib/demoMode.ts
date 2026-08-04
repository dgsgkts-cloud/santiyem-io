// Demo mode runtime flag + external-message interception.
// The flag is written by useDemoAccount() once the demo state is known so
// non-React code (communication client) can short-circuit real delivery.

export interface DemoPreviewPayload {
  channel: string;
  recipient: string;
  recipientName?: string;
  project?: string;
  subject?: string;
  body: string;
  timestamp: string;
}

let demoActive = false;

export const setDemoModeActive = (active: boolean) => {
  demoActive = active;
};

export const isDemoMode = () => demoActive;

export const DEMO_PREVIEW_EVENT = "demo-message-preview";

/**
 * Show the "message not sent" preview instead of calling a real provider.
 * Returns true when the send was intercepted (demo account only).
 */
export const interceptExternalSend = (payload: Omit<DemoPreviewPayload, "timestamp">): boolean => {
  if (!demoActive) return false;
  const detail: DemoPreviewPayload = { ...payload, timestamp: new Date().toISOString() };
  window.dispatchEvent(new CustomEvent(DEMO_PREVIEW_EVENT, { detail }));
  return true;
};
