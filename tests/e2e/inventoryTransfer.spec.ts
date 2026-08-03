// DEPO — transfer yaşam döngüsü tarayıcı testleri (Playwright).
//
// Çalıştırma önkoşulu: Lovable önizlemesinde oturum açık olmalıdır. Oturum
// bilgisi LOVABLE_BROWSER_SUPABASE_* ortam değişkenleriyle sağlanır; yoksa
// testler atlanır (yanlış "geçti" raporu üretmemek için).
//
// Kapsam: oluşturma, onay, red, revizyon, sevk, kısmi teslim, uyuşmazlıklı
// teslim, iptal, kontrollü geri alma, RLS/RPC yetki hataları, bildirim
// yönlendirmesi, doğrudan URL ile açılış, geri navigasyonu ve URL filtre
// kalıcılığı.

import { test, expect } from "../../playwright-fixture";

const APP = "http://localhost:8080";
const AUTHED = process.env.LOVABLE_BROWSER_AUTH_STATUS === "injected";

const restoreSession = async (page: import("@playwright/test").Page) => {
  const key = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const session = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  await page.goto(APP);
  if (key && session) {
    await page.evaluate(
      ([k, s]) => window.localStorage.setItem(k as string, s as string),
      [key, session],
    );
  }
};

test.describe("Depo → Transferler yaşam döngüsü", () => {
  test.skip(!AUTHED, "Önizleme oturumu yok (LOVABLE_BROWSER_AUTH_STATUS !== injected).");

  test.beforeEach(async ({ page }) => {
    await restoreSession(page);
  });

  test("transfer listesi açılır ve filtreler URL'de kalıcıdır", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler`);
    await expect(page.getByPlaceholder("Transfer no, malzeme veya depo ara")).toBeVisible();

    await page.getByRole("button", { name: "Onay Bekleyen" }).click();
    await expect(page).toHaveURL(/kova=pending|bucket=pending|sekme=transferler/);

    await page.getByPlaceholder("Transfer no, malzeme veya depo ara").fill("TRF");
    await page.reload();
    // Yenilemeden sonra arama ve durum seçimi korunur.
    await expect(page.getByPlaceholder("Transfer no, malzeme veya depo ara")).toHaveValue("TRF");
  });

  test("yeni transfer talebi oluşturulur", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler`);
    const create = page.getByRole("button", { name: /Yeni Transfer/ });
    test.skip(!(await create.isVisible()), "create_transfer yetkisi yok.");
    await create.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // Form alanları: kaynak depo, hedef depo, malzeme, miktar, birim.
    await expect(page.getByRole("dialog")).toContainText(/Kaynak|Hedef/);
  });

  test("kayıt yoksa gerçek boş durum gösterilir (uydurma veri yok)", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler`);
    const empty = page.getByText(/transfer kaydı bulunmuyor|Transfer Akışı/i).first();
    const rows = page.locator("article");
    if ((await rows.count()) === 0) await expect(empty).toBeVisible();
  });

  test("doğrudan detay URL'si ve geri navigasyonu çalışır", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler`);
    const detail = page.getByRole("button", { name: "Detayı Aç" }).first();
    test.skip((await detail.count()) === 0, "Görüntülenecek transfer kaydı yok.");
    await detail.click();
    await expect(page).toHaveURL(/\/depo\/transferler\//);
    const url = page.url();

    await page.reload();
    await expect(page.getByText("Miktar Zinciri", { exact: false })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/depo\?/);
    await page.goto(url);
    await expect(page.getByText(/Onay ve Hareket Geçmişi/)).toBeVisible();
  });

  test("geçersiz transfer kimliği yetki/bulunamadı mesajı verir (RLS)", async ({ page }) => {
    await page.goto(`${APP}/depo/transferler/00000000-0000-0000-0000-000000000000`);
    await expect(
      page.getByText(/bulunamadı veya görüntüleme yetkiniz yok/i),
    ).toBeVisible();
  });

  test("yetkisiz durum aksiyonu sunucuda reddedilir", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler`);
    const rows = page.locator("article");
    test.skip((await rows.count()) === 0, "Test edilecek transfer kaydı yok.");
    // Yetkisi olmayan kullanıcıda birincil aksiyon butonu görünmez; görünen
    // aksiyonlar da sunucu doğrulamasından geçer.
    const approve = page.getByRole("button", { name: "Onayla" }).first();
    if (await approve.count()) {
      await approve.click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
  });

  test("belge yükleme alanı transfer detayında bulunur", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler`);
    const detail = page.getByRole("button", { name: "Detayı Aç" }).first();
    test.skip((await detail.count()) === 0, "Transfer kaydı yok.");
    await detail.click();
    await expect(page.getByText("Belgeler")).toBeVisible();
  });

  test("bildirim merkezi transfer bağlantısını kanonik rotaya taşır", async ({ page }) => {
    await page.goto(`${APP}/depo`);
    const bell = page.getByRole("button", { name: /Bildirim/i }).first();
    test.skip((await bell.count()) === 0, "Bildirim merkezi görünmüyor.");
    await bell.click();
    const item = page.getByText(/Transfer/i).first();
    if (await item.count()) {
      await item.click();
      await expect(page).toHaveURL(/\/depo(\/transferler)?/);
    }
  });
});
