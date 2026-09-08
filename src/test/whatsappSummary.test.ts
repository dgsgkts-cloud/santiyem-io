import { describe, expect, it } from "vitest";
import {
  MAX_TOPICS,
  buildSummaryPayload,
  isDue,
  money,
  periodKey,
  renderSummaryMessage,
  zonedNow,
  type SummarySnapshot,
} from "../../supabase/functions/_shared/whatsapp/summary";

const snapshot = (over: Partial<SummarySnapshot> = {}): SummarySnapshot => ({
  active_project_count: 6,
  ready_count: 6,
  portfolio_forecast_profit: 42_800_000,
  portfolio_expected_profit: 49_600_000,
  portfolio_profit_erosion: 6_800_000,
  projects: [
    { id: "p1", name: "Arsuz Konut", is_ready: true },
    { id: "p2", name: "Defne Konut", is_ready: true },
  ],
  top_risks: [],
  ...over,
});

describe("WhatsApp yönetici özeti", () => {
  it("C) rakamları backend payload'ından birebir taşır", () => {
    const p = buildSummaryPayload(snapshot(), [], { kind: "daily_summary", link: "https://x/y" });
    expect(p.portfolio_forecast_profit).toBe(42_800_000);
    expect(p.portfolio_profit_erosion).toBe(6_800_000);
    const msg = renderSummaryMessage(p);
    expect(msg).toContain("₺42,8M");
    expect(msg).toContain("₺6,8M");
  });

  it("D) risk yoksa kısa 'kritik değişiklik yok' mesajı", () => {
    const msg = renderSummaryMessage(
      buildSummaryPayload(snapshot(), [], { kind: "daily_summary", link: "https://x/y" }),
    );
    expect(msg).toContain("kritik yeni bir değişiklik görünmüyor");
  });

  it("E) 3'ten fazla konu olsa da yalnızca en önemli 3'ü gönderilir", () => {
    const insights = [1, 2, 3, 4, 5].map((i) => ({
      project_id: "p1",
      title: `Konu ${i}`,
      priority: i,
      financial_impact: 100_000 * i,
      metadata: { severity: i === 1 ? "critical" : "medium" },
    }));
    const p = buildSummaryPayload(snapshot(), insights, { kind: "daily_summary", link: "https://x/y" });
    expect(p.top_topics).toHaveLength(MAX_TOPICS);
    expect(p.top_topics[0].headline).toBe("Konu 1");
    expect(p.top_topics[0].severity).toBe("critical");
  });

  it("risk motoru kayıtları içgörüleri tamamlar ve tekrar etmez", () => {
    const p = buildSummaryPayload(
      snapshot({
        top_risks: [
          { id: "r1", project_id: "p2", project_name: "Defne Konut", severity: "critical", title: "Beton maliyeti kârı baskılıyor", financial_impact: 735_000 },
          { id: "r2", project_id: "p2", project_name: "Defne Konut", severity: "critical", title: "Beton maliyeti kârı baskılıyor", financial_impact: 735_000 },
        ],
      }),
      [{ project_id: "p1", title: "Kâr kaybı arttı", priority: 1, financial_impact: null, metadata: { severity: "high" } }],
      { kind: "daily_summary", link: "https://x/y" },
    );
    expect(p.top_topics).toHaveLength(2);
    expect(renderSummaryMessage(p)).toContain("Tahmini etki: ₺735.000");
  });

  it("hazır proje yoksa 0 TL göstermez, hazırlık ister", () => {
    const p = buildSummaryPayload(
      snapshot({ ready_count: 0, portfolio_forecast_profit: 0, portfolio_profit_erosion: 0 }),
      [],
      { kind: "daily_summary", link: "https://x/y" },
    );
    const msg = renderSummaryMessage(p);
    expect(msg).toContain("başlangıç bütçesi bekleniyor");
    expect(msg).not.toContain("Toplam tahmini final kâr");
  });

  it("deneme özeti açıkça işaretlenir", () => {
    const p = buildSummaryPayload(snapshot(), [], { kind: "test_summary", link: "https://x/y" });
    expect(renderSummaryMessage(p)).toContain("Deneme Özeti");
  });

  it("H) devre dışı alıcı veya opt-in yoksa gönderim planlanmaz", () => {
    const base = { preferred_time: "08:00", timezone: "Europe/Istanbul", weekday: 1 } as const;
    const at = new Date("2026-09-08T06:30:00Z"); // 09:30 İstanbul
    expect(isDue({ ...base, summary_frequency: "daily", is_active: true, opt_in: true }, at).due).toBe(true);
    expect(isDue({ ...base, summary_frequency: "daily", is_active: false, opt_in: true }, at).due).toBe(false);
    expect(isDue({ ...base, summary_frequency: "daily", is_active: true, opt_in: false }, at).due).toBe(false);
    expect(isDue({ ...base, summary_frequency: "off", is_active: true, opt_in: true }, at).due).toBe(false);
  });

  it("saat ve saat dilimi sunucu saatine göre değil alıcıya göre çalışır", () => {
    const early = new Date("2026-09-08T03:00:00Z"); // 06:00 İstanbul
    expect(isDue({ summary_frequency: "daily", preferred_time: "08:00", timezone: "Europe/Istanbul", weekday: 1, is_active: true, opt_in: true }, early).due).toBe(false);
    expect(isDue({ summary_frequency: "daily", preferred_time: "08:00", timezone: "Europe/London", weekday: 1, is_active: true, opt_in: true }, new Date("2026-09-08T07:10:00Z")).due).toBe(true);
  });

  it("haftalık özet yalnızca seçilen günde gönderilir", () => {
    const monday = new Date("2026-09-07T06:00:00Z");
    const tuesday = new Date("2026-09-08T06:00:00Z");
    const r = { summary_frequency: "weekly", preferred_time: "08:00", timezone: "Europe/Istanbul", weekday: 1, is_active: true, opt_in: true } as const;
    expect(isDue(r, monday).kind).toBe("weekly_summary");
    expect(isDue(r, monday).due).toBe(true);
    expect(isDue(r, tuesday).due).toBe(false);
  });

  it("F) aynı gün için dönem anahtarı sabittir (duplicate koruması)", () => {
    const a = zonedNow(new Date("2026-09-08T06:00:00Z"), "Europe/Istanbul");
    const b = zonedNow(new Date("2026-09-08T09:00:00Z"), "Europe/Istanbul");
    expect(periodKey("daily_summary", a)).toBe(periodKey("daily_summary", b));
    expect(periodKey("weekly_summary", a)).toBe(periodKey("weekly_summary", b));
    expect(periodKey("test_summary", a)).not.toBe(periodKey("test_summary", b, new Date("2026-09-08T09:00:01Z")));
  });

  it("para biçimi kısa ve okunur", () => {
    expect(money(735_000)).toBe("₺735.000");
    expect(money(42_800_000)).toBe("₺42,8M");
  });
});
