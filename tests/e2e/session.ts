// DEPO E2E — rol bazlı oturum yükleyici.
//
// Oturum durumları depo dışında tutulur (E2E_STATE_DIR); parola ve token
// kaynak kodda değildir. Durum dosyası yoksa ilgili test atlanır.

import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

export const APP = process.env.E2E_BASE_URL ?? "http://localhost:8080";
export const STATE_DIR = process.env.E2E_STATE_DIR ?? "";

export type E2ERole = "admin" | "source" | "dest" | "readonly" | "outsider";

export const statePath = (role: E2ERole) => path.join(STATE_DIR, `state-${role}.json`);
export const hasState = (role: E2ERole) => !!STATE_DIR && fs.existsSync(statePath(role));

/**
 * Oturumu yükler ve kurulum sihirbazını kapatır.
 *
 * İlk çalıştırma sihirbazı (FirstRunWizard) modal olarak tüm sayfayı kapladığı
 * için test ortamında `santiyem_first_run_done` bayrağı kurulur. Bu yalnızca
 * yerel tarayıcı durumudur; üretim verisine dokunmaz.
 */
export const loadSession = async (page: Page, role: E2ERole) => {
  const raw = JSON.parse(fs.readFileSync(statePath(role), "utf8"));
  const items: { name: string; value: string }[] = raw.origins?.[0]?.localStorage ?? [];
  await page.goto(APP);
  await page.evaluate((ls) => {
    for (const it of ls) window.localStorage.setItem(it.name, it.value);
    window.localStorage.setItem("santiyem_first_run_done", "true");
    window.localStorage.setItem(
      "santiyem_setup_progress_v2",
      JSON.stringify({ finished: true, steps: {}, step: 9 }),
    );
    window.localStorage.setItem("santiyem_theme", "dark");
  }, items);
};

/** Yatay taşma (px). 1 px'ten fazlası kabul edilmez. */
export const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Sayfadaki Sesli Asistan düğmesi sayısı. */
export const voiceFabCount = (page: Page) =>
  page.evaluate(
    () =>
      document.querySelectorAll(
        '[data-voice-fab],[aria-label*="Sesli"],[aria-label*="Voice"],[aria-label*="Asistan"]',
      ).length,
  );

/** Seed edilmiş yaşam döngüsü kayıtları (E2E kiracısı). */
export const lifecycleIds = (): Record<string, string> => {
  const file = process.env.E2E_TRANSFERS_JSON ?? path.join(STATE_DIR, "transfers.json");
  if (!STATE_DIR || !fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")).lifecycle ?? {};
  } catch {
    return {};
  }
};
