import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, FileSpreadsheet, ListTree, Loader2, Sparkles, Upload, X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  FIELD_LABELS, MAIN_CATEGORIES, PROJECT_TYPES, TEMPLATES, buildItemsFromSheet, fetchSetupSummary,
  makeCode, parseAmount, parseBudgetFile, saveProjectSetup,
  type FieldKey, type ParsedSheet, type ProjectType, type SetupItem, type SetupSummary,
} from "@/lib/finance/projectSetup";

/**
 * "Projenizin kârlılık takibini başlatalım" — proje hazırlama akışı.
 * Kullanıcıdan yalnızca proje geliri ve başlangıç bütçesi istenir;
 * mevcut gider/sipariş/fatura kayıtları otomatik kullanılır.
 * Tüm kayıt işi veritabanı kurulum fonksiyonunda yapılır.
 */

type Mode = "quick" | "excel" | "detail";
type Step = "mode" | "revenue" | "budget" | "categories" | "detail-items" | "excel" | "done";

interface Props {
  projectId: string;
  projectName?: string;
  open: boolean;
  onClose: () => void;
  /** Doğrudan "Bütçeyi Detaylandır" için kullanılabilir. */
  initialMode?: Mode;
  onFinished?: () => void;
}

interface EditItem { id: string; name: string; group?: string; amount: string }

const inputCls =
  "w-full h-12 px-3 rounded-lg bg-background border border-border text-[16px] text-foreground " +
  "outline-none focus:border-primary transition-colors";

export default function ProjectSetupWizard({
  projectId, projectName, open, onClose, initialMode, onFinished,
}: Props) {
  const qc = useQueryClient();
  const [summary, setSummary] = useState<SetupSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode | null>(initialMode ?? null);
  const [step, setStep] = useState<Step>(initialMode ? "revenue" : "mode");

  const [revenue, setRevenue] = useState("");
  const [budget, setBudget] = useState("");
  const [categories, setCategories] = useState<EditItem[]>([]);
  const [detailItems, setDetailItems] = useState<EditItem[]>([]);
  const [projectType, setProjectType] = useState<ProjectType>("Konut");

  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, number>>>({});
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Mevcut kayıtları oku — kullanıcı hiçbir şeyi ikinci kez girmez.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchSetupSummary(projectId)
      .then((s) => {
        if (cancelled) return;
        setSummary(s);
        const rev = s.original_revenue ?? s.contract_amount ?? 0;
        setRevenue(rev ? String(rev) : "");
        setBudget(s.total_budget ? String(s.total_budget) : "");
      })
      .catch(() => toast.error("Proje bilgileri okunamadı."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [open, projectId]);

  useEffect(() => {
    if (!open) {
      setMode(initialMode ?? null);
      setStep(initialMode ? "revenue" : "mode");
      setSheet(null);
      setCategories([]);
      setDetailItems([]);
    }
  }, [open, initialMode]);

  const excelItems = useMemo(
    () => (sheet ? buildItemsFromSheet(sheet, mapping) : []),
    [sheet, mapping],
  );
  const excelTotal = useMemo(() => excelItems.reduce((s, i) => s + i.amount, 0), [excelItems]);
  const detailTotal = useMemo(
    () => detailItems.reduce((s, i) => s + parseAmount(i.amount), 0),
    [detailItems],
  );
  const categoryTotal = useMemo(
    () => categories.reduce((s, i) => s + parseAmount(i.amount), 0),
    [categories],
  );

  const startMode = (m: Mode) => {
    setMode(m);
    if (m === "detail") {
      const tpl = TEMPLATES[projectType];
      setDetailItems(
        tpl.flatMap((g) =>
          g.items.length
            ? g.items.map((n) => ({ id: `${g.group}-${n}`, name: n, group: g.group, amount: "" }))
            : [{ id: g.group, name: g.group, amount: "" }],
        ),
      );
    }
    setStep("revenue");
  };

  const applyTemplate = (t: ProjectType) => {
    setProjectType(t);
    const tpl = TEMPLATES[t];
    setDetailItems(
      tpl.flatMap((g) =>
        g.items.length
          ? g.items.map((n) => ({ id: `${g.group}-${n}`, name: n, group: g.group, amount: "" }))
          : [{ id: g.group, name: g.group, amount: "" }],
      ),
    );
  };

  const persist = async (items: SetupItem[], totalBudget: number) => {
    setSaving(true);
    try {
      const rev = parseAmount(revenue);
      const res = await saveProjectSetup({
        projectId,
        originalRevenue: rev > 0 ? rev : null,
        totalBudget,
        items,
      });
      setSummary(res);
      qc.invalidateQueries({ queryKey: ["portfolio-financials"] });
      qc.invalidateQueries({ queryKey: ["project-financials", projectId] });
      qc.invalidateQueries({ queryKey: ["cost-code-financials", projectId] });
      setStep("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kurulum kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const saveQuick = () => {
    const total = parseAmount(budget);
    if (total <= 0) { toast.error("Başlangıç bütçesini girin."); return; }
    const items: SetupItem[] = categories
      .filter((c) => c.name.trim())
      .map((c, i) => ({
        code: makeCode(c.name, i),
        name: c.name.trim(),
        amount: parseAmount(c.amount),
      }));
    persist(items, total);
  };

  const saveDetailed = () => {
    const items: SetupItem[] = detailItems
      .filter((c) => c.name.trim() && parseAmount(c.amount) > 0)
      .map((c, i) => ({
        code: makeCode(c.name, i),
        name: c.name.trim(),
        amount: parseAmount(c.amount),
        parent_code: c.group ? makeCode(c.group, 900) : undefined,
        parent_name: c.group,
      }));
    if (!items.length) { toast.error("En az bir iş kalemine tutar girin."); return; }
    persist(items, Math.max(detailTotal, parseAmount(budget)));
  };

  const saveExcel = () => {
    if (!excelItems.length) { toast.error("İçe aktarılacak iş kalemi bulunamadı."); return; }
    persist(excelItems, excelTotal);
  };

  const pickFile = async (file: File) => {
    setParsing(true);
    try {
      const parsed = await parseBudgetFile(file);
      if (!parsed.rows.length) { toast.error("Dosyada okunabilir satır bulunamadı."); return; }
      setSheet(parsed);
      setMapping(parsed.mapping);
    } catch {
      toast.error("Dosya okunamadı. Excel (.xlsx) veya CSV deneyin.");
    } finally {
      setParsing(false);
    }
  };

  const back = () => {
    if (step === "revenue") { if (initialMode) { onClose(); return; } setStep("mode"); setMode(null); return; }
    if (step === "budget" || step === "excel" || step === "detail-items") { setStep("revenue"); return; }
    if (step === "categories") { setStep("budget"); return; }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="p-0 gap-0 w-[calc(100vw-1.5rem)] sm:max-w-[560px] max-h-[88vh] overflow-hidden flex flex-col"
      >
        {/* Başlık */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-border/70 shrink-0">
          {step !== "done" && (
            <button type="button" onClick={back} aria-label="Geri"
              className="w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-foreground truncate">
              {step === "done" ? "Projeniz hazır" : "Projenizin kârlılık takibini başlatalım"}
            </p>
            {projectName && (
              <p className="text-[12px] text-muted-foreground truncate">{projectName}</p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Kapat"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 sm:px-5 py-4"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          {loading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Proje bilgileri okunuyor…
            </div>
          ) : step === "mode" ? (
            <div className="space-y-3">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Mevcut Şantiyem giderleriniz otomatik kullanılacak. Başlangıç bütçenizi eklemeniz yeterli.
              </p>
              <ModeCard
                icon={<FileSpreadsheet className="w-5 h-5" />}
                title="Excel'den Yükle"
                text="Mevcut bütçe veya keşif dosyanızı kullanın."
                badge="ÖNERİLEN"
                onClick={() => startMode("excel")}
              />
              <ModeCard
                icon={<Sparkles className="w-5 h-5" />}
                title="Hızlı Kurulum"
                text="Toplam bütçe ve ana iş kalemleriyle birkaç dakikada başlayın."
                onClick={() => startMode("quick")}
              />
              <ModeCard
                icon={<ListTree className="w-5 h-5" />}
                title="Detaylı Kurulum"
                text="Miktar, birim fiyat ve alt iş kalemlerini detaylı girin."
                onClick={() => startMode("detail")}
              />
            </div>
          ) : step === "revenue" ? (
            <div className="space-y-4">
              <Field
                label="Bu projeden toplam ne kadar gelir bekliyorsunuz?"
                hint={
                  summary?.contract_amount && !summary?.original_revenue
                    ? `Sözleşme bedelinden dolduruldu: ${formatCurrency(summary.contract_amount)}`
                    : "İşverenden bu proje karşılığında almayı beklediğiniz toplam tutar."
                }
              >
                <input
                  className={inputCls} inputMode="decimal" value={revenue}
                  onChange={(e) => setRevenue(e.target.value)} placeholder="0"
                />
              </Field>
              <PrimaryButton
                onClick={() => setStep(mode === "excel" ? "excel" : mode === "detail" ? "detail-items" : "budget")}
              >
                Devam
              </PrimaryButton>
            </div>
          ) : step === "budget" ? (
            <div className="space-y-4">
              <Field
                label="Projeyi tamamlamak için başlangıçta ne kadar maliyet öngörülmüştü?"
                hint="Tek bir toplam tutar yeterli. İş kalemlerini sonra detaylandırabilirsiniz."
              >
                <input
                  className={inputCls} inputMode="decimal" value={budget}
                  onChange={(e) => setBudget(e.target.value)} placeholder="0"
                />
              </Field>
              <PrimaryButton onClick={() => setStep("categories")}>Devam</PrimaryButton>
            </div>
          ) : step === "categories" ? (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                İsterseniz ana iş kalemlerini seçin ve bütçelerini yazın. Boş bırakılan tutarlar
                genel proje bütçesinde kalır.
              </p>
              <div className="flex flex-wrap gap-2">
                {MAIN_CATEGORIES.map((c) => {
                  const active = categories.some((x) => x.name === c);
                  return (
                    <button
                      key={c} type="button"
                      onClick={() =>
                        setCategories((prev) =>
                          active ? prev.filter((x) => x.name !== c) : [...prev, { id: c, name: c, amount: "" }])
                      }
                      className={`h-11 px-3 rounded-lg text-[14px] border transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>

              {categories.length > 0 && (
                <ul className="space-y-2">
                  {categories.map((c, i) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <span className="flex-1 min-w-0 text-[14px] text-foreground truncate">{c.name}</span>
                      <input
                        className={`${inputCls} w-[42%] max-w-[180px]`} inputMode="decimal"
                        value={c.amount} placeholder="Bütçe"
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}

              {categoryTotal > parseAmount(budget) && (
                <p className="text-[12px] text-destructive">
                  Kalem bütçeleri toplamı ({formatCurrency(categoryTotal)}) başlangıç bütçesini aşıyor.
                </p>
              )}

              <div className="space-y-2">
                <PrimaryButton onClick={saveQuick} disabled={saving}>
                  {saving ? "Kaydediliyor…" : "Kurulumu Tamamla"}
                </PrimaryButton>
                <button type="button" onClick={saveQuick} disabled={saving}
                  className="w-full h-11 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                  Şimdi detaylandırmak istemiyorum
                </button>
              </div>
            </div>
          ) : step === "detail-items" ? (
            <div className="space-y-4">
              <Field label="Proje türü" hint="Şablon yalnızca başlangıç önerisidir; kalemleri değiştirebilirsiniz.">
                <select
                  className={inputCls} value={projectType}
                  onChange={(e) => applyTemplate(e.target.value as ProjectType)}
                >
                  {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <ul className="space-y-2">
                {detailItems.map((it, i) => (
                  <li key={it.id} className="flex items-center gap-2">
                    <input
                      className={`${inputCls} flex-1 min-w-0`} value={it.name}
                      onChange={(e) =>
                        setDetailItems((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    />
                    <input
                      className={`${inputCls} w-[34%] max-w-[150px]`} inputMode="decimal"
                      value={it.amount} placeholder="Bütçe"
                      onChange={(e) =>
                        setDetailItems((prev) => prev.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
                    />
                    <button type="button" aria-label="Kalemi kaldır"
                      onClick={() => setDetailItems((prev) => prev.filter((_, j) => j !== i))}
                      className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>

              <button type="button"
                onClick={() => setDetailItems((prev) => [...prev, { id: `yeni-${prev.length}-${Date.now()}`, name: "", amount: "" }])}
                className="text-[13px] font-medium text-primary hover:underline">
                + İş kalemi ekle
              </button>

              <p className="text-[13px] text-muted-foreground">
                Toplam bütçe: <span className="font-semibold text-foreground">{formatCurrency(detailTotal)}</span>
              </p>
              <PrimaryButton onClick={saveDetailed} disabled={saving}>
                {saving ? "Kaydediliyor…" : "Kurulumu Tamamla"}
              </PrimaryButton>
            </div>
          ) : step === "excel" ? (
            <div className="space-y-4">
              {!sheet ? (
                <>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Bütçe veya keşif dosyanızı yükleyin. İş kodu, iş kalemi, miktar, birim, birim fiyat
                    ve tutar kolonları okunur.
                  </p>
                  <input
                    ref={fileRef} type="file" className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }}
                  />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={parsing}
                    className="w-full min-h-[120px] rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors">
                    {parsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    <span className="text-[14px]">{parsing ? "Dosya okunuyor…" : "Dosya seç"}</span>
                    <span className="text-[12px]">.xlsx, .xls veya .csv</span>
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-medium text-foreground">Kolon eşleştirme</p>
                  <div className="space-y-2">
                    {(Object.keys(FIELD_LABELS) as FieldKey[]).map((key) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-[38%] shrink-0 text-[13px] text-muted-foreground">
                          {FIELD_LABELS[key]}
                        </span>
                        <select
                          className={`${inputCls} flex-1 min-w-0`}
                          value={mapping[key] ?? -1}
                          onChange={(e) =>
                            setMapping((prev) => {
                              const v = Number(e.target.value);
                              const next = { ...prev };
                              if (v < 0) delete next[key]; else next[key] = v;
                              return next;
                            })}
                        >
                          <option value={-1}>Kullanılmıyor</option>
                          {sheet.headers.map((h, i) => <option key={`${h}-${i}`} value={i}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-border/70 bg-muted/40 p-3 space-y-1">
                    <p className="text-[13px] text-foreground">
                      <span className="font-semibold">{excelItems.length}</span> iş kalemi bulundu
                    </p>
                    <p className="text-[13px] text-foreground">
                      Toplam bütçe:{" "}
                      <span className="font-semibold">{formatCurrency(excelTotal)}</span>
                    </p>
                    {(summary?.budget_item_count ?? 0) > 0 && (
                      <p className="text-[12px] text-muted-foreground">
                        Bu projede zaten bütçe kalemleri var. Aynı iş kodları güncellenir, kopya oluşmaz.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <PrimaryButton onClick={saveExcel} disabled={saving || !excelItems.length}>
                      {saving ? "İçe aktarılıyor…" : "Bütçeyi İçe Aktar"}
                    </PrimaryButton>
                    <button type="button" onClick={() => setSheet(null)}
                      className="w-full h-11 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                      Başka dosya seç
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[14px] font-medium" style={{ color: "#22C55E" }}>
                <CheckCircle2 className="w-5 h-5" /> Kurulum tamamlandı
              </div>
              <dl className="rounded-lg border border-border/70 divide-y divide-border/60">
                <SummaryRow label="Proje Geliri" value={summary?.original_revenue ?? summary?.contract_amount ?? 0} />
                <SummaryRow label="Başlangıç Bütçesi" value={summary?.total_budget ?? 0} />
                <SummaryRow label="Mevcut kayıtlardan bulunan gerçekleşen maliyet" value={summary?.actual_cost ?? 0} />
                <SummaryRow label="Açık siparişler" value={summary?.open_commitments ?? 0} />
                <SummaryRow label="Taşeron maliyetleri" value={summary?.subcontractor_cost ?? 0} />
              </dl>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Bu tutarlar mevcut Şantiyem kayıtlarınızdan otomatik alınır; ikinci kez girmeniz gerekmez.
              </p>
              <PrimaryButton onClick={() => { onFinished?.(); onClose(); }}>Kârlılığı Gör</PrimaryButton>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({
  icon, title, text, badge, onClick,
}: { icon: React.ReactNode; title: string; text: string; badge?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full text-left rounded-lg border border-border/80 bg-background p-4 flex items-start gap-3 hover:border-primary/60 transition-colors"
      style={{ minHeight: 68 }}>
      <span className="text-muted-foreground shrink-0 mt-0.5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-medium text-foreground">{title}</span>
          {badge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/12 text-primary">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[14px] font-medium text-foreground">{label}</span>
      {hint && <span className="mt-1 block text-[12px] text-muted-foreground leading-relaxed">{hint}</span>}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function PrimaryButton({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="w-full h-12 rounded-lg bg-primary text-primary-foreground text-[15px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60">
      {children}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-[14px] font-semibold text-foreground shrink-0">{formatCurrency(value)}</dd>
    </div>
  );
}
