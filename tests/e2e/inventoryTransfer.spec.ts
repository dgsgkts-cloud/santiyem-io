// DEPO — transfer yaşam döngüsü tarayıcı testleri (Playwright).
//
// Önkoşul: izole E2E kiracısı için oturum durumları (E2E_STATE_DIR) üretilmiş
// olmalıdır. Durum dosyası yoksa testler atlanır — yanlış "geçti" raporu
// üretilmez.
//
// Kapsam: liste ve filtre kalıcılığı, sunucu tarafı sayfalama, aralık dışı
// sayfa normalizasyonu, deterministik boş durum, detay rotası, RLS reddi,
// yaşam döngüsü durumlarına göre eylem görünürlüğü, belge alanı, bildirim
// yönlendirmesi ve mobil belge işlemleri.

import { test, expect } from "../../playwright-fixture";
import { APP, hasState, loadSession, lifecycleIds } from "./session";

const SEARCH = "Transfer no, malzeme veya depo ara";
/** Hiçbir kayıtla eşleşmeyecek deterministik arama — boş durum testi için. */
const NO_MATCH = "E2E-BOS-DURUM-ESLESME-YOK-9137";

test.describe("Depo → Transferler yaşam döngüsü", () => {
  test.skip(!hasState("admin"), "E2E oturum durumu yok (E2E_STATE_DIR).");

  test.beforeEach(async ({ page }) => {
    await loadSession(page, "admin");
  });

  test("transfer listesi açılır ve filtreler URL'de kalıcıdır", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler`);
    await expect(page.getByPlaceholder(SEARCH)).toBeVisible();

    await page.getByPlaceholder(SEARCH).fill("TRF");
    await expect(page).toHaveURL(/q=TRF/);
    await page.reload();
    await expect(page.getByPlaceholder(SEARCH)).toHaveValue("TRF");
  });

  test("yeni transfer talebi formu açılır", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler`);
    const create = page.getByRole("button", { name: /Yeni Transfer/ });
    await expect(create).toBeVisible();
    await create.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Kaynak/);
    await expect(dialog).toContainText(/Hedef/);
  });

  test("eşleşme olmayan aramada gerçek boş durum gösterilir (uydurma veri yok)", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler&q=${NO_MATCH}`);
    await expect(page.getByPlaceholder(SEARCH)).toHaveValue(NO_MATCH);
    await expect(page.getByText(/bulunamadı|bulunmuyor|uyan/i).first()).toBeVisible();
    await expect(page.locator("article")).toHaveCount(0);
  });

  test("doğrudan detay URL'si, yenileme ve geri navigasyonu çalışır", async ({ page }) => {
    const ids = lifecycleIds();
    const id = ids.in_transit ?? Object.values(ids)[0];
    test.skip(!id, "Seed edilmiş transfer kaydı yok (transfers.json).");

    await page.goto(`${APP}/depo?sekme=transferler`);
    await page.goto(`${APP}/depo/transferler/${id}`);
    await expect(page.getByText("Miktar Özeti")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Miktar Özeti")).toBeVisible();

    await page.getByRole("link", { name: /Listeye dön/ }).click();
    await expect(page).toHaveURL(/\/depo\?/);
  });

  test("geçersiz transfer kimliği yetki/bulunamadı mesajı verir (RLS)", async ({ page }) => {
    await page.goto(`${APP}/depo/transferler/00000000-0000-0000-0000-000000000000`);
    await expect(page.getByText(/bulunamadı veya görüntüleme yetkiniz yok/i)).toBeVisible();
  });

  test("kapanmış kayıtlarda durum değiştiren eylem sunulmaz", async ({ page }) => {
    const ids = lifecycleIds();
    test.skip(!ids.cancelled, "Seed edilmiş iptal kaydı yok.");
    await page.goto(`${APP}/depo/transferler/${ids.cancelled}`);
    await expect(page.getByText("İptal Edildi").first()).toBeVisible();
    for (const label of ["Onayla", "Sevk Et", "Teslim Al", "Reddet"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
    }
  });

  test("onay bekleyen kayıtta onay/red eylemleri açılır", async ({ page }) => {
    const ids = lifecycleIds();
    test.skip(!ids.pending_approval, "Seed edilmiş onay bekleyen kayıt yok.");
    await page.goto(`${APP}/depo/transferler/${ids.pending_approval}`);
    const approve = page.getByRole("button", { name: "Onayla", exact: true });
    await expect(approve).toBeVisible();
    await approve.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("belge yükleme alanı transfer detayında bulunur", async ({ page }) => {
    const ids = lifecycleIds();
    const id = ids.completed ?? Object.values(ids)[0];
    test.skip(!id, "Seed edilmiş transfer kaydı yok.");
    await page.goto(`${APP}/depo/transferler/${id}`);
    await expect(page.getByText("Belgeler").first()).toBeVisible();
  });

  test("bildirim merkezi transfer bağlantısını kanonik rotaya taşır", async ({ page }) => {
    await page.goto(`${APP}/depo`);
    const bell = page.getByRole("button", { name: /Bildirim/i }).first();
    test.skip((await bell.count()) === 0, "Bildirim merkezi görünmüyor.");
    await bell.click();
    const item = page.getByText(/Transfer/i).first();
    test.skip((await item.count()) === 0, "Transfer bildirimi yok.");
    await item.click();
    await expect(page).toHaveURL(/\/depo(\/transferler)?/);
  });
});

test.describe("Depo → Transferler sunucu tarafı sayfalama", () => {
  test.skip(!hasState("admin"), "E2E oturum durumu yok (E2E_STATE_DIR).");

  test.beforeEach(async ({ page }) => {
    await loadSession(page, "admin");
  });

  test("toplam kayıt sayısı ve sayfa göstergesi sunucudan gelir", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler`);
    await expect(page.getByText(/kayıt · sayfa \d+ \/ \d+/).first()).toBeVisible();
  });

  test("sayfa değişimi URL'e yazılır ve yenilemeden sonra korunur", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler`);
    const next = page.getByRole("button", { name: "Sonraki" });
    test.skip((await next.count()) === 0, "Tek sayfalık veri kümesi.");
    await next.click();
    await expect(page).toHaveURL(/sf=2/);
    await page.reload();
    await expect(page).toHaveURL(/sf=2/);
    await expect(page.getByText(/sayfa 2 \//)).toBeVisible();
  });

  test("filtre değişimi sayfayı 1'e döndürür", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler&sf=2`);
    await page.getByPlaceholder(SEARCH).fill("TRF");
    await expect(page).not.toHaveURL(/sf=2/);
  });

  test("aralık dışı sayfa numarası son geçerli sayfaya normalize edilir", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler&sf=9999`);
    await expect(page.getByText(/kayıt · sayfa \d+ \/ \d+/).first()).toBeVisible();
    await expect(page).not.toHaveURL(/sf=9999/);
    const shown = await page.getByText(/kayıt · sayfa \d+ \/ \d+/).first().innerText();
    const m = shown.match(/sayfa (\d+) \/ (\d+)/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe(m![2]);
    await expect(page).toHaveURL(new RegExp(`sf=${m![2]}`));
  });

  test("geçersiz sayfa parametresi ilk sayfaya normalize edilir", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler&sf=abc`);
    await expect(page.getByText(/sayfa 1 \//).first()).toBeVisible();
    await expect(page).not.toHaveURL(/sf=/);
  });

  test("boşalan filtre sonucunda sayfa 1'e iner", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler&q=${NO_MATCH}&sf=5`);
    await expect(page.getByPlaceholder(SEARCH)).toHaveValue(NO_MATCH);
    await expect(page).not.toHaveURL(/sf=5/);
  });

  test("detaydan geri dönüşte sayfa ve filtreler korunur", async ({ page }) => {
    await page.goto(`${APP}/depo?sekme=transferler&sf=2`);
    const detail = page.getByRole("button", { name: "Detayı Aç" }).first();
    test.skip((await detail.count()) === 0, "Kayıt yok.");
    await detail.click();
    await expect(page).toHaveURL(/\/depo\/transferler\//);
    await page.getByRole("link", { name: /Listeye dön/ }).click();
    await expect(page).toHaveURL(/sf=2/);
  });

  test("mobilde belge işlemleri hover olmadan erişilebilir", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const ids = lifecycleIds();
    const id = ids.completed ?? Object.values(ids)[0];
    test.skip(!id, "Seed edilmiş transfer kaydı yok.");
    await page.goto(`${APP}/depo/transferler/${id}`);
    await expect(page.getByText("Belgeler").first()).toBeVisible();
    const download = page.getByLabel("Belgeyi indir").first();
    test.skip((await download.count()) === 0, "Yüklenmiş belge yok.");
    await expect(download).toBeVisible();
  });
});
