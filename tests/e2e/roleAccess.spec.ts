// DEPO E2E — rol bazlı oturum testleri (izole E2E test şirketi).
//
// Oturum durumları depo dışında (E2E_STATE_DIR) tutulur; parola ve kimlik
// bilgileri kaynak kodda değildir. Durum dosyaları yoksa testler atlanır.

import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const APP = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const STATE_DIR = process.env.E2E_STATE_DIR ?? "";
const ROLES = ["admin", "source", "dest", "readonly", "outsider"] as const;

const statePath = (role: string) => path.join(STATE_DIR, `state-${role}.json`);
const hasState = (role: string) => !!STATE_DIR && fs.existsSync(statePath(role));

const loadSession = async (page: Page, role: string) => {
  const raw = JSON.parse(fs.readFileSync(statePath(role), "utf8"));
  const ls: { name: string; value: string }[] = raw.origins?.[0]?.localStorage ?? [];
  await page.goto(APP);
  await page.evaluate((items) => {
    for (const it of items) window.localStorage.setItem(it.name, it.value);
  }, ls);
};

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const voiceFabCount = (page: Page) =>
  page.evaluate(
    () =>
      document.querySelectorAll(
        '[data-voice-fab],[aria-label*="Sesli"],[aria-label*="Voice"],[aria-label*="Asistan"]',
      ).length,
  );

for (const role of ROLES) {
  test.describe(`rol: ${role}`, () => {
    test.skip(!hasState(role), "E2E oturum durumu yok (E2E_STATE_DIR).");

    test("oturum açılır ve depo transfer listesi yüklenir", async ({ page }) => {
      await loadSession(page, role);
      await page.goto(`${APP}/depo?sekme=transferler`, { waitUntil: "networkidle" });
      await expect(page).not.toHaveURL(/\/login/);
      expect(await overflow(page)).toBeLessThanOrEqual(1);
    });

    test("tek bir Sesli Asistan düğmesi vardır", async ({ page }) => {
      await loadSession(page, role);
      await page.goto(`${APP}/depo?sekme=transferler`, { waitUntil: "networkidle" });
      expect(await voiceFabCount(page)).toBeLessThanOrEqual(1);
    });
  });
}

test.describe("URL durumu ve sayfalama (admin)", () => {
  test.skip(!hasState("admin"), "E2E oturum durumu yok (E2E_STATE_DIR).");

  test("aralık dışı sayfa numarası normalize edilir", async ({ page }) => {
    await loadSession(page, "admin");
    await page.goto(`${APP}/depo?sekme=transferler&sf=99999`, { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/\/login/);
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test("filtreler yenilemeden sonra korunur", async ({ page }) => {
    await loadSession(page, "admin");
    const url = `${APP}/depo?sekme=transferler&kova=transit&sir=oldest&sf=2`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    expect(page.url()).toContain("sekme=transferler");
  });
});
