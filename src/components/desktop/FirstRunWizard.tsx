import { useState, useCallback, useMemo } from "react";
import { X, ArrowRight, ArrowLeft, Check, Building2, FolderPlus, Users, HardHat, Truck, FileUp, Mail, MessageCircle, Sparkles, Upload, SkipForward } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { usePersonnel } from "@/hooks/usePersonnel";
import { useSubcontractors } from "@/hooks/useSubcontractors";
import { useDocuments } from "@/hooks/useDocuments";
import { useTeam } from "@/hooks/useTeam";
import { getCompanyProfile, saveCompanyProfile } from "@/lib/companyProfile";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

const FIRST_RUN_KEY = "santiyem_first_run_done";
const WELCOME_BRIEF_KEY = "santiyem_show_welcome_brief";

export const isFirstRunDone = () => localStorage.getItem(FIRST_RUN_KEY) === "true";
export const markFirstRunDone = () => localStorage.setItem(FIRST_RUN_KEY, "true");
export const shouldShowWelcomeBrief = () => localStorage.getItem(WELCOME_BRIEF_KEY) === "true";
export const clearWelcomeBrief = () => localStorage.removeItem(WELCOME_BRIEF_KEY);

interface Props {
  open: boolean;
  onClose: () => void;
}

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cols = line.split(sep).map(c => c.trim());
    const row: CsvRow = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
}

const STEPS = [
  { id: 1, label: "Firma", icon: Building2 },
  { id: 2, label: "Proje", icon: FolderPlus },
  { id: 3, label: "Ekip", icon: Users },
  { id: 4, label: "Personel", icon: HardHat },
  { id: 5, label: "Tedarikçi", icon: Truck },
  { id: 6, label: "Belgeler", icon: FileUp },
  { id: 7, label: "E-posta", icon: Mail },
  { id: 8, label: "WhatsApp", icon: MessageCircle },
  { id: 9, label: "AI Brief", icon: Sparkles },
];

const FirstRunWizard = ({ open, onClose }: Props) => {
  const { user } = useUser();
  const { addProject } = useProjects();
  const { upsertPerson } = usePersonnel();
  const { addSubcontractor } = useSubcontractors();
  const { uploadDocument } = useDocuments();
  const { team, createTeam, inviteMember } = useTeam();

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Step 1 — Company
  const initialProfile = useMemo(() => getCompanyProfile(), []);
  const [companyName, setCompanyName] = useState(initialProfile.companyName || "");
  const [companyPhone, setCompanyPhone] = useState(initialProfile.phone || "");
  const [companyEmail, setCompanyEmail] = useState(initialProfile.email || "");
  const [companyCity, setCompanyCity] = useState(initialProfile.city || "");

  // Step 2 — First project
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [firstProjectId, setFirstProjectId] = useState<string | null>(null);

  // Step 3 — Invites
  const [inviteEmails, setInviteEmails] = useState("");

  // Step 4/5 counts
  const [personnelCount, setPersonnelCount] = useState(0);
  const [supplierCount, setSupplierCount] = useState(0);

  // Step 6 — Docs
  const [docCount, setDocCount] = useState(0);

  if (!open) return null;

  const finish = () => {
    localStorage.setItem(WELCOME_BRIEF_KEY, "true");
    markFirstRunDone();
    onClose();
    // Navigate to dashboard to show the brief
    setTimeout(() => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "dashboard" })), 100);
  };

  const skipAll = () => {
    markFirstRunDone();
    onClose();
  };

  const next = () => setStep(s => Math.min(9, s + 1));
  const back = () => setStep(s => Math.max(1, s - 1));

  // Step handlers
  const saveCompany = () => {
    saveCompanyProfile({ ...initialProfile, companyName: companyName.trim(), phone: companyPhone.trim(), email: companyEmail.trim(), city: companyCity.trim() });
    toast.success("Firma bilgileri kaydedildi");
    next();
  };

  const createFirstProject = async () => {
    if (!projectName.trim() || !clientName.trim()) { toast.error("Proje adı ve müşteri gerekli"); return; }
    setBusy(true);
    try {
      const p = await addProject({
        name: projectName.trim(), client: clientName.trim(), location: projectLocation.trim(),
        manager: "", site_responsible: "", description: "", budget: "", start_date: "", end_date: "",
      } as any);
      if (p?.id) setFirstProjectId(p.id);
      toast.success("İlk projeniz oluşturuldu");
      next();
    } finally { setBusy(false); }
  };

  const sendInvites = async () => {
    const emails = inviteEmails.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(e => /.+@.+\..+/.test(e));
    if (emails.length === 0) { next(); return; }
    setBusy(true);
    try {
      let t = team;
      if (!t) {
        t = await createTeam(companyName.trim() || "Ekibim");
      }
      if (!t) { toast.error("Ekip davetleri için Ofis planı gerekiyor. Bu adımı geçebilirsiniz."); setBusy(false); return; }
      let ok = 0;
      for (const email of emails) {
        const r = await inviteMember(email, "editor");
        if (r) ok++;
      }
      toast.success(`${ok} davet gönderildi`);
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
      setPersonnelCount(c => c + ok);
      toast.success(`${ok} personel içe aktarıldı`);
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
      setSupplierCount(c => c + ok);
      toast.success(`${ok} tedarikçi içe aktarıldı`);
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
      setDocCount(c => c + ok);
      if (ok > 0) toast.success(`${ok} belge yüklendi`);
    } finally { setBusy(false); }
  };

  const goToEmailSetup = () => {
    onClose();
    markFirstRunDone();
    localStorage.setItem(WELCOME_BRIEF_KEY, "true");
    setTimeout(() => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "communication" })), 100);
  };

  const goToWhatsAppSetup = () => {
    onClose();
    markFirstRunDone();
    localStorage.setItem(WELCOME_BRIEF_KEY, "true");
    setTimeout(() => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "communication" })), 100);
  };

  const Progress = () => (
    <div className="flex items-center justify-between gap-1 mb-6 px-1 overflow-x-auto">
      {STEPS.map(s => {
        const Icon = s.icon;
        const active = s.id === step;
        const done = s.id < step;
        return (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className="flex flex-col items-center gap-1 min-w-[52px] shrink-0"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: active ? "#FF6B2B" : done ? "#22C55E" : "hsl(var(--muted))",
                color: (active || done) ? "white" : "hsl(var(--muted-foreground))",
              }}
            >
              {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            </div>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </button>
        );
      })}
    </div>
  );

  const NavBar = ({ onPrimary, primaryLabel, skipTo }: { onPrimary?: () => void; primaryLabel?: string; skipTo?: number }) => (
    <div className="flex items-center gap-2 pt-4 border-t border-border mt-4">
      <button
        onClick={back}
        disabled={step === 1 || busy}
        className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Geri
      </button>
      <button
        onClick={skipAll}
        className="px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground"
      >
        Tümünü Atla
      </button>
      <div className="flex-1" />
      {skipTo && (
        <button
          onClick={() => setStep(skipTo)}
          disabled={busy}
          className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <SkipForward className="w-4 h-4" /> Atla
        </button>
      )}
      {onPrimary && (
        <button
          onClick={onPrimary}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 flex items-center gap-1"
          style={{ backgroundColor: "#FF6B2B" }}
        >
          {primaryLabel || "Devam"} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative w-full max-w-2xl rounded-2xl p-6 bg-card border border-border max-h-[90vh] overflow-y-auto">
        <button onClick={skipAll} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
        <h1 className="text-center text-lg font-bold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Şantiyem Kurulumu
        </h1>
        <p className="text-center text-xs text-muted-foreground mb-4">
          10 dakikada üretime hazır olun — Adım {step}/9
        </p>
        <Progress />

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Firma Bilgileri</h2>
            <p className="text-xs text-muted-foreground">PDF çıktılarınızda ve iletişim mesajlarında görünecek.</p>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Firma Adı*" className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border" />
            <div className="grid grid-cols-2 gap-2">
              <input value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} placeholder="Telefon" className="px-3 py-2 rounded-lg text-sm bg-background border border-border" />
              <input value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} placeholder="E-posta" className="px-3 py-2 rounded-lg text-sm bg-background border border-border" />
            </div>
            <input value={companyCity} onChange={e => setCompanyCity(e.target.value)} placeholder="Şehir" className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border" />
            <NavBar onPrimary={saveCompany} primaryLabel="Kaydet ve Devam" />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">İlk Projenizi Oluşturun</h2>
            <p className="text-xs text-muted-foreground">Personel, tedarikçi ve belgeler bu projeye bağlanacak.</p>
            <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Proje Adı*" className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border" />
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Müşteri*" className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border" />
            <input value={projectLocation} onChange={e => setProjectLocation(e.target.value)} placeholder="Konum" className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border" />
            <NavBar onPrimary={createFirstProject} primaryLabel={busy ? "Oluşturuluyor…" : "Projeyi Oluştur"} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Ekibinizi Davet Edin</h2>
            <p className="text-xs text-muted-foreground">E-posta adreslerini virgül veya boşlukla ayırın. (Ofis planı gerektirir — atlayabilirsiniz.)</p>
            <textarea value={inviteEmails} onChange={e => setInviteEmails(e.target.value)} rows={3} placeholder="ali@sirket.com, veli@sirket.com" className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border" />
            <NavBar onPrimary={sendInvites} primaryLabel={busy ? "Gönderiliyor…" : "Davet Gönder"} skipTo={4} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Personel Listesini İçe Aktar (CSV)</h2>
            <p className="text-xs text-muted-foreground">Sütunlar: <code>ad, telefon, meslek, yevmiye</code> veya <code>maas</code>. İlk projeye otomatik atanır.</p>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-[#FF6B2B]">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm">CSV dosyası seçin</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => e.target.files?.[0] && importPersonnelCsv(e.target.files[0])} />
            </label>
            {personnelCount > 0 && <p className="text-xs text-emerald-500">✓ {personnelCount} personel eklendi</p>}
            <NavBar onPrimary={next} primaryLabel="Devam" skipTo={5} />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Tedarikçi Listesini İçe Aktar (CSV)</h2>
            <p className="text-xs text-muted-foreground">Sütunlar: <code>ad, telefon, uzmanlik, yetkili</code>. İlk projeye bağlanır.</p>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-[#FF6B2B]">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm">CSV dosyası seçin</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => e.target.files?.[0] && importSuppliersCsv(e.target.files[0])} />
            </label>
            {supplierCount > 0 && <p className="text-xs text-emerald-500">✓ {supplierCount} tedarikçi eklendi</p>}
            <NavBar onPrimary={next} primaryLabel="Devam" skipTo={6} />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">İlk Belgelerinizi Yükleyin (PDF)</h2>
            <p className="text-xs text-muted-foreground">Sözleşmeler, projeler, teknik şartnameler — AI belgelerinizi öğrenir.</p>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-[#FF6B2B]">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm">PDF dosyalarını seçin (birden fazla)</span>
              <input type="file" accept="application/pdf" multiple className="hidden" onChange={e => uploadDocs(e.target.files)} />
            </label>
            {docCount > 0 && <p className="text-xs text-emerald-500">✓ {docCount} belge yüklendi</p>}
            <NavBar onPrimary={next} primaryLabel="Devam" skipTo={7} />
          </div>
        )}

        {step === 7 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">E-posta Sağlayıcınızı Bağlayın</h2>
            <p className="text-xs text-muted-foreground">Kurumsal SMTP veya sağlayıcınızı bağlayarak AI onaylı e-postalarınızı gönderin. İletişim Merkezi'nden yönetebilirsiniz.</p>
            <button onClick={goToEmailSetup} className="w-full py-3 rounded-lg text-sm font-medium border border-border hover:border-[#FF6B2B] flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" /> İletişim Merkezi'ne Git
            </button>
            <NavBar onPrimary={next} primaryLabel="Şimdilik Atla" skipTo={8} />
          </div>
        )}

        {step === 8 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">WhatsApp Business Bağlantısı (Opsiyonel)</h2>
            <p className="text-xs text-muted-foreground">WhatsApp Cloud API kimlik bilgilerinizi İletişim Merkezi'nden ekleyin. Bu adım atlanabilir.</p>
            <button onClick={goToWhatsAppSetup} className="w-full py-3 rounded-lg text-sm font-medium border border-border hover:border-[#FF6B2B] flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> WhatsApp Ayarlarına Git
            </button>
            <NavBar onPrimary={next} primaryLabel="Şimdilik Atla" skipTo={9} />
          </div>
        )}

        {step === 9 && (
          <div className="space-y-3 text-center">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: "#FF6B2B22" }}>
              <Sparkles className="w-8 h-8 text-[#FF6B2B]" />
            </div>
            <h2 className="text-lg font-semibold">Hazırsınız! İlk Yönetim Brief'inizi Oluşturalım</h2>
            <p className="text-xs text-muted-foreground">
              Şantiyem AI, şu ana kadar bildiklerini özetleyecek — ne öğrenildi, ne eksik ve önerilen sonraki adımlar.
            </p>
            <div className="text-left text-xs bg-background border border-border rounded-lg p-3 space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Firma</span><span>{companyName || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">İlk proje</span><span>{projectName || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Personel</span><span>{personnelCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tedarikçi</span><span>{supplierCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Belgeler</span><span>{docCount}</span></div>
            </div>
            <button
              onClick={finish}
              className="w-full py-3 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: "#FF6B2B" }}
            >
              <Sparkles className="w-4 h-4" /> İlk Yönetim Brief'ini Oluştur
            </button>
            <button onClick={skipAll} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground">
              Daha sonra
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirstRunWizard;
