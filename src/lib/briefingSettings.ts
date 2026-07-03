// Client-side settings for the AI Executive Daily Briefing.
// Stored in localStorage; no backend changes.

export interface BriefingSettings {
  auto_morning: boolean;
  voice_enabled: boolean;
  dashboard_cards: boolean;
  include_financial: boolean;
  include_risks: boolean;
  include_personnel: boolean;
  include_materials: boolean;
}

export const DEFAULT_BRIEFING_SETTINGS: BriefingSettings = {
  auto_morning: true,
  voice_enabled: true,
  dashboard_cards: true,
  include_financial: true,
  include_risks: true,
  include_personnel: true,
  include_materials: true,
};

const KEY = "briefing_settings_v1";

export function loadBriefingSettings(): BriefingSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_BRIEFING_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_BRIEFING_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_BRIEFING_SETTINGS;
  }
}

export function saveBriefingSettings(s: BriefingSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
}

export function todayShownKey(): string {
  return `briefing_shown_${new Date().toISOString().slice(0, 10)}`;
}

export function wasBriefingShownToday(): boolean {
  try { return !!localStorage.getItem(todayShownKey()); } catch { return false; }
}

export function markBriefingShown() {
  try { localStorage.setItem(todayShownKey(), "1"); } catch { /* noop */ }
}
