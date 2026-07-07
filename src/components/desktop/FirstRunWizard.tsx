import { useState, useMemo, useEffect } from "react";
import {
  X, ArrowRight, ArrowLeft, Check, Building2, FolderPlus, HardHat, Truck,
  FileUp, Mail, MessageCircle, Sparkles, Upload, Wallet, PartyPopper,
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { usePersonnel } from "@/hooks/usePersonnel";
import { useSubcontractors } from "@/hooks/useSubcontractors";
import { useDocuments } from "@/hooks/useDocuments";
import { getCompanyProfile, saveCompanyProfile } from "@/lib/companyProfile";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import {
  loadSetupProgress, saveSetupProgress, markStepComplete,
  setCurrentStep as persistCurrentStep, markSetupFinished,
  completionPercent, TOTAL_SETUP_STEPS,
} from "@/lib/setupProgress";

// Legacy exports kept for compatibility with older call sites.
const FIRST_RUN_KEY = "santiyem_first_run_done";
const WELCOME_BRIEF_KEY = "santiyem_show_welcome_brief";
export const isFirstRunDone = () =>
  localStorage.getItem(FIRST_RUN_KEY) === "true" || loadSetupProgress().finished;
export const markFirstRunDone = () => {
  localStorage.setItem(FIRST_RUN_KEY, "true");
  markSetupFinished();
};
export const shouldShowWelcomeBrief = () =>
  localStorage.getItem(WELCOME_BRIEF_KEY) === "true";
export const clearWelcomeBrief = () => localStorage.removeItem(WELCOME_BRIEF_KEY);

interface Props {
  /** Modal usage — required only for the overlay variant. */
  open?: boolean;
  onClose?: () => void;
  /** Renders inline (no overlay) for the Settings → Kurulum Merkezi page. */
  inline?: boolean;
}

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(sep).map((c) => c.trim());
    const row: CsvRow = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
}

// Sprint 20 — Step order:
// 1 Company · 2 First Project · 3 Personnel · 4 Suppliers · 5 Documents
// 6 Financial Accounts · 7 Email · 8 WhatsApp · 9 AI Settings
const STEPS = [
  { id: 1, label: "Firma", icon: Building2 },
  { id: 2, label: "İlk Proje", icon: FolderPlus },
  { id: 3, label: "Personel", icon: HardHat },
  { id: 4, label: "Tedarikçi", icon: Truck },
  { id: 5, label: "Belgeler", icon: FileUp },
  { id: 6, label: "Finansal", icon: Wallet },
  { id: 7, label: "E-posta", icon: Mail },
  { id: 8, label: "WhatsApp", icon: MessageCircle },
  { id: 9, label: "AI Ayarları", icon: Sparkles },
];

const FirstRunWizard = ({ open = true, onClose, inline = false }: Props) => {
  const { user: _user } = useUser();
  const { addProject } = useProjects();
  const { upsertPerson } = usePersonnel();
  const { addSubcontractor } = useSubcontractors();
  const { uploadDocument } = useDocuments();

  const initialProgress = useMemo(() => loadSetupProgress(), []);
  const [step, setStepState] = useState<number>(initialProgress.currentStep);
  const [completed, setCompleted] = useState<number[]>(initialProgress.completed);
  const [finished, setFinished] = useState<boolean>(initialProgress.finished);
  const [busy, setBusy] = useState(false);

  const setStep = (s: number) => {
    const clamped = Math.max(1, Math.min(TOTAL_SETUP_STEPS, s));
    setStepState(clamped);
    persistCurrentStep(clamped);
  };

  const completeStep = (id: number) => {
    setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id]));
    markStepComplete(id);
  };

  // Step 1
  const initialProfile = useMemo(() => getCompanyProfile(), []);
  const [companyName, setCompanyName] = useState(initialProfile.companyName || "");
  const [companyPhone, setCompanyPhone] = useState(initialProfile.phone || "");
  const [companyEmail, setCompanyEmail] = useState(initialProfile.email || "");
  const [companyCity, setCompanyCity] = useState(initialProfile.city || "");

  // Step 2
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [firstProjectId, setFirstProjectId] = useState<string | null>(null);

  // Counters
  const [personnelCount, setPersonnelCount] = useState(0);
  const [supplierCount, setSupplierCount] = useState(0);
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    const onExternal = () => {
      const p = loadSetupProgress();
      setCompleted(p.completed);
      setFinished(p.finished);
    };
    window.addEventListener("setup-progress-changed", onExternal);
    return () => window.removeEventListener("setup-progress-changed", onExternal);
  }, []);

  if (!inline && !open) return null;

  const pct = Math.round((completed.length / TOTAL_SETUP_STEPS) * 100);

  const next = () => setStep(step + 1);
  const back = () => setStep(step - 1);

  const finishLater = () => {
    // Do NOT mark as finished — user is only postponing.
    persistCurrentStep(step);
    if (onClose) onClose();
  };

  const finishAll = () => {
    for (let i = 1; i <= TOTAL_SETUP_STEPS; i++) {
      if (!completed.includes(i)) markStepComplete(i);
    }
    markSetupFinished();
    setFinished(true);
    setCompleted(Array.from({ length: TOTAL_SETUP_STEPS }, (_, i) => i + 1));
  };

  // ── Step handlers ──
  const saveCompany = () => {
    saveCompanyProfile({
      ...initialProfile,
      companyName: companyName.trim(),
      phone: companyPhone.trim(),
      email: companyEmail.trim(),
      city: companyCity.trim(),
    });
    toast.success("Firma bilgileri kaydedildi");
    completeStep(1);
    next();
  };

  const createFirstProject = async () => {
    if (!projectName.trim() || !clientName.trim()) {
      toast.error("Proje adı ve müşteri gerekli");
      return;
    }
    setBusy(true);
    try {
      const p = await addProject({
        name: projectName.trim(),
        client: clientName.trim(),
        location: projectLocation.trim(),
        manager: "",
        site_responsible: "",
        description: "",
        budget: "",
        start_date: "",
        end_date: "",
      } as any);
      if (p?.id) setFirstProjectId(p.id);
      toast.success("İlk projeniz oluşturuldu");
      completeStep(2);
      next();
    } finally { setBusy(false); }
  };

  const importPersonnelCsv = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      let ok = 0;
      for (const r of rows) {
        const full_name = r["ad"] || r["ad_soyad"] || r["isim"] || r["name"] || r["full_name"];
        if (!full_name) continue;
        const phone = r["telefon"] || r["phone"] || "";
        const occupation = r["meslek"] || r["gorev"] || r["occupation"] || "";
        const wageStr = (r["yevmiye"] || r["daily_wage"] || "").replace(",", ".");
        const salaryStr = (r["maas"] || r["monthly_salary"] || "").replace(",", ".");
        const daily = parseFloat(wageStr) || 0;
        const monthly = parseFloat(salaryStr) || 0;
        const employment_type = monthly > 0 ? "monthly_salary" : "daily_wage";
        const res = await upsertPerson(
          { full_name, phone, occupation, employment_type: employment_type as any, daily_wage: daily, monthly_salary: monthly },
          firstProjectId ? [firstProjectId] : [],
        );
        if (res) ok++;
      }
      setPersonnelCount((c) => c + ok);
      if (ok > 0) toast.success(`${ok} personel içe aktarıldı`);
    } catch (e: any) {
      toast.error("CSV okunamadı: " + e.message);
    } finally { setBusy(false); }
  };

  const importSuppliersCsv = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      let ok = 0;
      for (const r of rows) {
        const name = r["ad"] || r["firma"] || r["name"] || r["unvan"];
        if (!name) continue;
        await addSubcontractor.mutateAsync({
          name,
          phone: r["telefon"] || r["phone"] || null,
          specialty: r["uzmanlik"] || r["specialty"] || r["kategori"] || null,
          contact_person: r["yetkili"] || r["contact"] || null,
          description: r["aciklama"] || r["description"] || null,
          project_id: firstProjectId,
          project_ids: firstProjectId ? [firstProjectId] : [],
          contract_amount: 0,
          payment_schedule: [],
          notes: null,
        });
        ok++;
      }
      setSupplierCount((c) => c + ok);
      if (ok > 0) toast.success(`${ok} tedarikçi içe aktarıldı`);
    } catch (e: any) {
      toast.error("CSV okunamadı: " + e.message);
    } finally { setBusy(false); }
  };

  const uploadDocs = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      let ok = 0;
      for (const f of Array.from(files)) {
        if (f.type !== "application/pdf") continue;
        await uploadDocument(f);
        ok++;
      }
      setDocCount((c) => c + ok);
      if (ok > 0) toast.success(`${ok} belge yüklendi`);
    } finally { setBusy(false); }
  };

  const navigateTab = (tab: string) => {
    window.dispatchEvent(new CustomEvent("navigate-tab", { detail: tab }));
    if (onClose) onClose();
  };

  // ── UI pieces ──
  const Header = () => (
    <div className="mb-6">
      <h1
        className="text-[20px] lg:text-[22px] font-semibold text-foreground"
        style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em" }}
      >
        Şantiyenizi birkaç adımda kurun.
      </h1>
      <p className="text-[12.5px] text-muted-foreground mt-1.5">
        Bu bilgiler sayesinde Şantiyem AI şirketinizi tanır ve:
      </p>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-[12px] text-muted-foreground">
        <li>• Belgeleri otomatik doldurur</li>
        <li>• Hakedişleri hızlandırır</li>
        <li>• WhatsApp mesajlarını hazırlar</li>
        <li>• AI önerilerini şirketinize göre kişiselleştirir</li>
      </ul>
    </div>
  );

  const Progress = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between text-[12px] mb-2">
        <span className="text-foreground font-medium">Adım {step} / {TOTAL_SETUP_STEPS}</span>
        <span className="text-muted-foreground">{pct}% Tamamlandı</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: "#FF6B2B" }}
        />
      </div>
      <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = s.id === step;
          const done = completed.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className="flex flex-col items-center gap-1 min-w-[56px] shrink-0 px-1 group"
              title={s.label}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all border"
                style={{
                  backgroundColor: active ? "#FF6B2B" : done ? "#22C55E" : "transparent",
                  borderColor: active ? "#FF6B2B" : done ? "#22C55E" : "hsl(var(--border))",
                  color: active || done ? "white" : "hsl(var(--muted-foreground))",
                }}
              >
                {done && !active ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className="text-[10px] leading-tight text-center max-w-[60px] truncate"
                style={{ color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const NavBar = ({
    onPrimary, primaryLabel, skipTo,
  }: { onPrimary?: () => void; primaryLabel?: string; skipTo?: number }) => (
    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border mt-6">
      <button
        onClick={back}
        disabled={step === 1 || busy}
        className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Geri
      </button>
      <button
        onClick={finishLater}
        className="px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
      >
        Daha Sonra Tamamla
      </button>
      <div className="flex-1" />
      {skipTo && (
        <button
          onClick={() => setStep(skipTo)}
          disabled={busy}
          className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
        >
          Bu adımı atla
        </button>
      )}
      {onPrimary && (
        <button
          onClick={onPrimary}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-1"
          style={{ backgroundColor: "#FF6B2B" }}
        >
          {primaryLabel || "Kaydet ve Devam"} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  const inputCls = "w-full px-3 py-2.5 rounded-lg text-sm bg-background border border-border focus:border-[#FF6B2B] outline-none transition-colors";

  const body = (
    <>
      <Header />
      <Progress />

      {finished ? (
        <div className="text-center py-6 animate-fade-in">
          <div
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 animate-scale-in"
            style={{ backgroundColor: "#22C55E22" }}
          >
            <PartyPopper className="w-10 h-10 text-emerald-500" />
          </div>
          <h2
            className="text-[20px] font-semibold text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Harika! Şirketiniz hazır.
          </h2>
          <p className="text-[13px] text-muted-foreground mt-2">
            Artık Şantiyem AI şirketinizi tanıyor.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
            <button
              onClick={() => navigateTab("dashboard")}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: "#FF6B2B" }}
            >
              Dashboard'a Git
            </button>
            <button
              onClick={() => navigateTab("projects")}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border hover:border-[#FF6B2B]"
            >
              İlk Projeyi Aç
            </button>
          </div>
        </div>
      ) : (
        <>
          {step === 1 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Firma Bilgileri</h2>
              <p className="text-xs text-muted-foreground">PDF çıktılarında ve iletişim mesajlarında görünecek.</p>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Firma Adı*"
                className={inputCls}
                style={{ minWidth: 0 }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="Telefon" className={inputCls} />
                <input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="E-posta" className={inputCls} />
              </div>
              <input value={companyCity} onChange={(e) => setCompanyCity(e.target.value)} placeholder="Şehir" className={inputCls} />
              <NavBar onPrimary={saveCompany} primaryLabel="Kaydet ve Devam" />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">İlk Projenizi Oluşturun</h2>
              <p className="text-xs text-muted-foreground">Personel, tedarikçi ve belgeler bu projeye bağlanabilir.</p>
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Proje Adı*" className={inputCls} />
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Müşteri*" className={inputCls} />
              <input value={projectLocation} onChange={(e) => setProjectLocation(e.target.value)} placeholder="Konum" className={inputCls} />
              <NavBar onPrimary={createFirstProject} primaryLabel={busy ? "Oluşturuluyor…" : "Kaydet ve Devam"} skipTo={3} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Personel Listesini İçe Aktar (CSV)</h2>
              <p className="text-xs text-muted-foreground">Sütunlar: <code>ad, telefon, meslek, yevmiye</code> veya <code>maas</code>. İlk projeye otomatik atanır.</p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-[#FF6B2B]">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm">CSV dosyası seçin</span>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importPersonnelCsv(e.target.files[0])} />
              </label>
              {personnelCount > 0 && <p className="text-xs text-emerald-500">✓ {personnelCount} personel eklendi</p>}
              <NavBar onPrimary={() => { completeStep(3); next(); }} primaryLabel="Kaydet ve Devam" skipTo={4} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Tedarikçi Listesini İçe Aktar (CSV)</h2>
              <p className="text-xs text-muted-foreground">Sütunlar: <code>ad, telefon, uzmanlik, yetkili</code>. İlk projeye bağlanır.</p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-[#FF6B2B]">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm">CSV dosyası seçin</span>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importSuppliersCsv(e.target.files[0])} />
              </label>
              {supplierCount > 0 && <p className="text-xs text-emerald-500">✓ {supplierCount} tedarikçi eklendi</p>}
              <NavBar onPrimary={() => { completeStep(4); next(); }} primaryLabel="Kaydet ve Devam" skipTo={5} />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">İlk Belgelerinizi Yükleyin (PDF)</h2>
              <p className="text-xs text-muted-foreground">Sözleşmeler, projeler, teknik şartnameler — AI belgelerinizi öğrenir.</p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-[#FF6B2B]">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm">PDF dosyalarını seçin (birden fazla)</span>
                <input type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => uploadDocs(e.target.files)} />
              </label>
              {docCount > 0 && <p className="text-xs text-emerald-500">✓ {docCount} belge yüklendi</p>}
              <NavBar onPrimary={() => { completeStep(5); next(); }} primaryLabel="Kaydet ve Devam" skipTo={6} />
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Finansal Hesaplar</h2>
              <p className="text-xs text-muted-foreground">Nakit, banka ve kasa hesaplarınızı ekleyin. Ödemeler / Kasa bölümünden yönetebilirsiniz.</p>
              <button
                onClick={() => { completeStep(6); navigateTab("payments"); }}
                className="w-full py-3 rounded-lg text-sm font-medium border border-border hover:border-[#FF6B2B] flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" /> Ödemeler ve Kasa'ya Git
              </button>
              <NavBar onPrimary={() => { completeStep(6); next(); }} primaryLabel="Kaydet ve Devam" skipTo={7} />
            </div>
          )}

          {step === 7 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">E-posta Sağlayıcınızı Bağlayın</h2>
              <p className="text-xs text-muted-foreground">Kurumsal SMTP veya sağlayıcınızı bağlayarak AI onaylı e-postalarınızı gönderin.</p>
              <button
                onClick={() => { completeStep(7); navigateTab("communication"); }}
                className="w-full py-3 rounded-lg text-sm font-medium border border-border hover:border-[#FF6B2B] flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" /> İletişim Merkezi'ne Git
              </button>
              <NavBar onPrimary={() => { completeStep(7); next(); }} primaryLabel="Kaydet ve Devam" skipTo={8} />
            </div>
          )}

          {step === 8 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">WhatsApp Business Bağlantısı</h2>
              <p className="text-xs text-muted-foreground">WhatsApp Cloud API kimlik bilgilerinizi İletişim Merkezi'nden ekleyin.</p>
              <button
                onClick={() => { completeStep(8); navigateTab("communication"); }}
                className="w-full py-3 rounded-lg text-sm font-medium border border-border hover:border-[#FF6B2B] flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp Ayarlarına Git
              </button>
              <NavBar onPrimary={() => { completeStep(8); next(); }} primaryLabel="Kaydet ve Devam" skipTo={9} />
            </div>
          )}

          {step === 9 && (
            <div className="space-y-3 text-center">
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: "#FF6B2B22" }}>
                <Sparkles className="w-8 h-8 text-[#FF6B2B]" />
              </div>
              <h2 className="text-lg font-semibold">Şantiyem AI Ayarları</h2>
              <p className="text-xs text-muted-foreground">
                Şantiyem AI, girdiğiniz bilgileri kullanarak size özel öneriler üretir. Kurulumu tamamlayarak başlayın.
              </p>
              <div className="text-left text-xs bg-background border border-border rounded-lg p-3 space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Firma</span><span className="truncate ml-2">{companyName || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">İlk proje</span><span className="truncate ml-2">{projectName || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Personel</span><span>{personnelCount}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tedarikçi</span><span>{supplierCount}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Belgeler</span><span>{docCount}</span></div>
              </div>
              <button
                onClick={() => { completeStep(9); finishAll(); }}
                className="w-full py-3 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: "#FF6B2B" }}
              >
                <Sparkles className="w-4 h-4" /> Kurulumu Tamamla
              </button>
              <button onClick={finishLater} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground">
                Daha Sonra Tamamla
              </button>
            </div>
          )}
        </>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-2xl p-5 lg:p-8 bg-card border border-border">
        {body}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative w-full max-w-2xl rounded-2xl p-6 bg-card border border-border max-h-[90vh] overflow-y-auto">
        <button onClick={finishLater} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
        {body}
      </div>
    </div>
  );
};

export { completionPercent };
export default FirstRunWizard;
