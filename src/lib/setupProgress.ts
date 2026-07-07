// Sprint 20 — Persistent workspace setup progress.
// Tracks which onboarding steps the user has completed so the "Kurulum
// Merkezi" page can always resume from the correct spot.

const KEY = "santiyem_setup_progress_v2";
const LEGACY_DONE_KEY = "santiyem_first_run_done";

export const TOTAL_SETUP_STEPS = 9;

export interface SetupProgress {
  currentStep: number;      // 1..TOTAL_SETUP_STEPS
  completed: number[];      // ids of completed steps
  finished: boolean;        // user reached the success screen
}

const DEFAULT: SetupProgress = {
  currentStep: 1,
  completed: [],
  finished: false,
};

export function loadSetupProgress(): SetupProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SetupProgress;
      return {
        currentStep: Math.max(1, Math.min(TOTAL_SETUP_STEPS, parsed.currentStep || 1)),
        completed: Array.isArray(parsed.completed) ? parsed.completed : [],
        finished: !!parsed.finished,
      };
    }
    // Migrate legacy flag → treat as finished so we don't nag the user again.
    if (localStorage.getItem(LEGACY_DONE_KEY) === "true") {
      return {
        currentStep: TOTAL_SETUP_STEPS,
        completed: Array.from({ length: TOTAL_SETUP_STEPS }, (_, i) => i + 1),
        finished: true,
      };
    }
  } catch {}
  return { ...DEFAULT, completed: [] };
}

export function saveSetupProgress(next: SetupProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    // Keep legacy flag in sync so other code paths that still look at it
    // (e.g. showing the empty-workspace wizard) don't re-open the modal.
    if (next.finished) localStorage.setItem(LEGACY_DONE_KEY, "true");
    window.dispatchEvent(new CustomEvent("setup-progress-changed"));
  } catch {}
}

export function markStepComplete(step: number) {
  const p = loadSetupProgress();
  if (!p.completed.includes(step)) p.completed.push(step);
  p.currentStep = Math.max(p.currentStep, Math.min(TOTAL_SETUP_STEPS, step + 1));
  saveSetupProgress(p);
}

export function setCurrentStep(step: number) {
  const p = loadSetupProgress();
  p.currentStep = Math.max(1, Math.min(TOTAL_SETUP_STEPS, step));
  saveSetupProgress(p);
}

export function markSetupFinished() {
  const p = loadSetupProgress();
  p.finished = true;
  p.completed = Array.from({ length: TOTAL_SETUP_STEPS }, (_, i) => i + 1);
  p.currentStep = TOTAL_SETUP_STEPS;
  saveSetupProgress(p);
}

export function resetSetupProgress() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_DONE_KEY);
    window.dispatchEvent(new CustomEvent("setup-progress-changed"));
  } catch {}
}

export function completionPercent(p: SetupProgress = loadSetupProgress()): number {
  return Math.round((p.completed.length / TOTAL_SETUP_STEPS) * 100);
}

export function isSetupComplete(): boolean {
  const p = loadSetupProgress();
  return p.finished || p.completed.length >= TOTAL_SETUP_STEPS;
}
