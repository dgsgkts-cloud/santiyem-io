// One global page-context registry for the single Voice AI microphone.
// Modules publish a short, permission-filtered summary of what the user is
// currently looking at (active filters + real KPI values); the global orb
// appends it to the session instructions. This avoids page-specific mics and
// keeps voice answers on the same records the UI shows.
let current: { scope: string; context: string } | null = null;

export const setVoicePageContext = (scope: string, context: string) => {
  current = context ? { scope, context } : null;
};

export const clearVoicePageContext = (scope: string) => {
  if (current?.scope === scope) current = null;
};

export const getVoicePageContext = () => current?.context ?? null;
