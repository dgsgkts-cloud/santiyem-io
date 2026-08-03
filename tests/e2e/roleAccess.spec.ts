// DEPO E2E — rol bazlı oturum testleri (izole E2E test şirketi).
//
// Oturum durumları depo dışında (E2E_STATE_DIR) tutulur; parola ve kimlik
// bilgileri kaynak kodda değildir. Durum dosyaları yoksa testler atlanır.

import { test, expect } from "@playwright/test";
import { APP, hasState, loadSession, overflow, voiceFabCount, type E2ERole } from "./session";

const ROLES: E2ERole[] = ["admin", "source", "dest", "readonly", "outsider"];

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
    await expect(page.getByText(/kayıt · sayfa \d+ \/ \d+/).first()).toBeVisible();
    await expect(page).not.toHaveURL(/sf=99999/);
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test("filtreler yenilemeden sonra korunur", async ({ page }) => {
    await loadSession(page, "admin");
    const url = `${APP}/depo?sekme=transferler&d=transit&sir=oldest&sf=2`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    expect(page.url()).toContain("sekme=transferler");
    expect(page.url()).toContain("sir=oldest");
  });
});
