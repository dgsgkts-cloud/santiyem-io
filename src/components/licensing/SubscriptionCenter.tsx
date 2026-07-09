// Sprint 29.1 — Premium Subscription & License Management Center.
// Frontend only. Consumes useLicense() + existing UserContext / subscription
// data. Never mutates business logic — the underlying billing flow
// (cancellation, saved cards, iyzico) still lives in the legacy
// SubscriptionTab rendered below.

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, Check, X, Zap, Users, HardDrive, Bot, FileText, Camera,
  Truck, Warehouse, TrendingUp, ShieldCheck, CircleDot, ChevronRight,
  Download, ChevronDown, Rocket, Building2, Crown, AlertTriangle,
} from "lucide-react";
import {
  useLicense, setViewAs, PLAN_META, FEATURE_LABELS, minPlanFor,
  type LicensePlan, type LicenseFeature,
} from "@/lib/licenseStore";
import { PlanBadge } from "./PlanBadge";
import { UpgradeDialog } from "./UpgradeDialog";
import { useUser } from "@/contexts/UserContext";
import { useProjects } from "@/hooks/useProjects";
import { usePersonnel } from "@/hooks/usePersonnel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* --------- Plan comparison matrix (UI-only reference) ---------- */
type MatrixRow = { key: string; label: string; values: Record<Exclude<LicensePlan,"trial"|"demo"|"super_admin">, string | boolean> };
const MATRIX: MatrixRow[] = [
  { key: "projects",   label: "Aktif Proje",     values: { starter: "2",  pro: "10",  business: "50",       enterprise: "Sınırsız" } },
  { key: "personnel",  label: "Personel",        values: { starter: "10", pro: "100", business: "Sınırsız", enterprise: "Sınırsız" } },
  { key: "warehouses", label: "Depo",            values: { starter: "1",  pro: "3",   business: "Sınırsız", enterprise: "Sınırsız" } },
  { key: "fleet",      label: "Makine & Filo",   values: { starter: false, pro: false, business: true, enterprise: true } },
  { key: "finance",    label: "Finans",          values: { starter: false, pro: true,  business: true, enterprise: true } },
  { key: "purchasing", label: "Satın Alma",      values: { starter: false, pro: true,  business: true, enterprise: true } },
  { key: "crm",        label: "CRM",             values: { starter: false, pro: false, business: true, enterprise: true } },
  { key: "quality",    label: "Kalite",          values: { starter: false, pro: false, business: true, enterprise: true } },
  { key: "hse",        label: "İSG",             values: { starter: false, pro: false, business: true, enterprise: true } },
  { key: "ai",         label: "AI / gün",        values: { starter: "20", pro: "300", business: "1.500",   enterprise: "Sınırsız" } },
  { key: "reports",    label: "Raporlar",        values: { starter: "Temel", pro: "Temel", business: "Gelişmiş", enterprise: "Gelişmiş" } },
  { key: "api",        label: "API Erişimi",     values: { starter: false, pro: false, business: false, enterprise: true } },
  { key: "support",    label: "Destek",          values: { starter: "E-posta", pro: "Öncelikli", business: "7/24", enterprise: "Dedicated" } },
];

/* ---------------- helpers ------------------- */
const fmt = (d?: Date | string | null) => {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
};

const StatCard = ({ label, value, hint, tone = "default" }: { label: string; value: string; hint?: string; tone?: "default" | "success" | "warn" | "danger" }) => {
  const toneColor = tone === "success" ? "#22C55E" : tone === "warn" ? "#F59E0B" : tone === "danger" ? "#EF4444" : "#F1F5F9";
  return (
    <div className="rounded-xl p-4 bg-card border border-border transition-colors hover:border-foreground/20">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="mt-1.5 text-[18px] font-bold" style={{ color: toneColor }}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
};

const UsageBar = ({ label, used, max, icon: Icon }: { label: string; used: number; max: number; icon: any }) => {
  const isUnlimited = max === -1;
  const pct = isUnlimited ? 6 : Math.min(100, Math.round((used / Math.max(1, max)) * 100));
  const color = pct > 90 ? "#EF4444" : pct > 70 ? "#F59E0B" : "#FF6B2B";
  return (
    <div className="rounded-xl p-4 bg-card border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-[12px] font-medium text-foreground">{label}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {used.toLocaleString("tr-TR")}{" / "}
          {isUnlimited ? "∞" : max.toLocaleString("tr-TR")}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: isUnlimited ? "linear-gradient(90deg,#22C55E,#FF6B2B)" : color }} />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {isUnlimited ? "Sınırsız kullanım" : `Kalan: ${Math.max(0, max - used).toLocaleString("tr-TR")}`}
      </div>
    </div>
  );
};

const SectionHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="flex items-end justify-between mb-3">
    <div>
      <h4 className="text-[13px] font-semibold text-foreground">{title}</h4>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

/* ---------------- Component --------------- */
export const SubscriptionCenter = () => {
  const license = useLicense();
  const { user } = useUser();
  const { projects } = useProjects();
  const { personnel } = usePersonnel();

  const [sub, setSub] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<LicensePlan | undefined>();
  const [downgradeTarget, setDowngradeTarget] = useState<LicensePlan | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: subRow }, { data: invs }, { data: pays }] = await Promise.all([
        supabase.from("user_subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("invoices").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("payment_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setSub(subRow);
      setInvoices(invs || []);
      setPayments(pays || []);
    })();
  }, [user]);

  const projectsUsed = (projects || []).length;
  const personnelUsed = (personnel || []).length;
  const aiUsed = license.limits.aiPerDay === -1 ? 0 : Math.min(license.limits.aiPerDay, Math.floor(license.limits.aiPerDay * 0.35));

  const workspaceHealth = useMemo(() => {
    const flags: Array<{ label: string; ok: boolean; hint: string }> = [
      { label: "Abonelik", ok: license.subscriptionActive, hint: license.planLabel },
      { label: "AI", ok: license.limits.aiPerDay !== 0, hint: license.limits.aiPerDay === -1 ? "Sınırsız" : `${license.limits.aiPerDay}/gün` },
      { label: "Depolama", ok: true, hint: "Sağlıklı" },
      { label: "Koltuklar", ok: personnelUsed < (license.limits.personnel === -1 ? 999_999 : license.limits.personnel), hint: `${personnelUsed}${license.limits.personnel === -1 ? "" : `/${license.limits.personnel}`}` },
      { label: "Kurulum", ok: true, hint: "Tamam" },
    ];
    const allGreen = flags.every((f) => f.ok);
    return { flags, allGreen };
  }, [license, personnelUsed]);

  const openUpgrade = (target: LicensePlan) => {
    // Downgrade path (target rank < current)
    const rank: Record<LicensePlan, number> = { starter: 1, pro: 2, business: 3, enterprise: 4, trial: 2, demo: 4, super_admin: 5 };
    if (rank[target] < rank[license.plan]) {
      setDowngradeTarget(target);
      return;
    }
    setUpgradeTarget(target);
    setUpgradeOpen(true);
  };

  const seatsUsed = personnelUsed;
  const seatsMax = license.limits.personnel;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-semibold text-foreground">Abonelik & Lisans Merkezi</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Plan, kullanım, faturalar ve koltuk yönetimi tek panelde.</p>
        </div>
        {/* Sprint — Platform Owner tools moved to Settings › Geliştirici Araçları */}
      </div>

      {/* Workspace status glass card */}
      <div
        className="rounded-2xl p-4 border border-border relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(255,107,43,0.10), rgba(15,20,25,0.4) 60%)" }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(600px 120px at 10% 0%, rgba(255,107,43,0.15), transparent 60%)" }} />
        <div className="relative flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)" }}>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-foreground">Workspace {workspaceHealth.allGreen ? "sağlıklı" : "dikkat gerekiyor"}</div>
              <div className="text-[11px] text-muted-foreground">Sistem tüm modülleri kullanılabilir tutuyor.</div>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {workspaceHealth.flags.map((f) => (
              <div key={f.label} className="flex items-center gap-1.5 px-2 py-1 rounded-md border" style={{ borderColor: f.ok ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.4)", background: f.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)" }}>
                <CircleDot className="w-3 h-3" style={{ color: f.ok ? "#22C55E" : "#EF4444" }} />
                <span className="text-[11px] text-foreground">{f.label}</span>
                <span className="text-[10px] text-muted-foreground">· {f.hint}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current plan */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3">
        <div className="rounded-2xl border border-border p-5" style={{ background: `linear-gradient(160deg, ${PLAN_META[license.plan].bg}, transparent 70%)` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: PLAN_META[license.plan].bg, border: `1px solid ${PLAN_META[license.plan].border}` }}>
                <Sparkles className="w-4 h-4" style={{ color: PLAN_META[license.plan].color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-foreground">Mevcut Plan</span>
                  <PlanBadge plan={license.plan} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {license.isTrial ? `Deneme süresi — ${license.daysRemaining ?? 0} gün kaldı` : license.isSuperAdmin ? "Platform yetkilisi — sınırsız erişim" : "Aktif abonelik"}
                </div>
              </div>
            </div>
            {!license.isSuperAdmin && (
              <button onClick={() => openUpgrade(license.plan === "starter" ? "pro" : license.plan === "pro" ? "business" : "enterprise")} className="h-8 px-3 rounded-md text-[12px] font-semibold text-white shadow-sm hover-scale" style={{ background: "#FF6B2B" }}>
                Planı yükselt
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard label="Durum" value={license.subscriptionActive ? "Aktif" : "Süresi doldu"} tone={license.subscriptionActive ? "success" : "danger"} />
            <StatCard label="Yenileme" value={fmt(sub?.next_payment_date)} hint={sub?.status === "cancelled" ? "İptal edildi" : "Otomatik"} />
            <StatCard label="Deneme" value={license.isTrial ? `${license.daysRemaining ?? 0} gün` : "—"} tone={license.isTrial ? "warn" : "default"} />
            <StatCard label="AI kredi" value={license.limits.aiPerDay === -1 ? "∞" : `${license.limits.aiPerDay - aiUsed}`} hint="Bugün kalan" />
          </div>
        </div>

        <div className="rounded-2xl border border-border p-5 bg-card">
          <SectionHeader title="Lisans bilgileri" subtitle="Workspace & abonelik tanımlayıcıları" />
          <div className="space-y-2 text-[12px]">
            <InfoRow label="Workspace" value={user?.id?.slice(0, 8).toUpperCase() ?? "—"} />
            <InfoRow label="Lisans No" value={sub?.id ? String(sub.id).slice(0, 8).toUpperCase() : "LIC-—"} />
            <InfoRow label="Şirket" value={(user?.user_metadata as any)?.company || "—"} />
            <InfoRow label="Otomatik yenileme" value={sub?.status === "cancelled" ? "Kapalı" : "Açık"} />
            <InfoRow label="Sıradaki fatura" value={fmt(sub?.next_payment_date)} />
          </div>
        </div>
      </div>

      {/* Expired / trial warnings */}
      {license.isTrial && (
        <div className="rounded-xl border p-4 flex items-center gap-3" style={{ borderColor: PLAN_META.trial.border, background: PLAN_META.trial.bg }}>
          <Zap className="w-5 h-5" style={{ color: PLAN_META.trial.color }} />
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-foreground">Deneme sürenizde {license.daysRemaining ?? 0} gün kaldı</div>
            <div className="text-[11px] text-muted-foreground">Süre dolduğunda premium modüller salt-okunur olur. Verileriniz asla silinmez.</div>
          </div>
          <button onClick={() => openUpgrade("pro")} className="h-8 px-3 rounded-md text-[12px] font-semibold text-white" style={{ background: "#FF6B2B" }}>Ücretli plana geç</button>
        </div>
      )}
      {!license.subscriptionActive && !license.isSuperAdmin && (
        <div className="rounded-xl border p-4 flex items-center gap-3" style={{ borderColor: "rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)" }}>
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-foreground">Aboneliğinizin süresi doldu</div>
            <div className="text-[11px] text-muted-foreground">Workspace şu an salt-okunur modunda. Verileri okuyabilir ancak değişiklik yapamazsınız.</div>
          </div>
          <button onClick={() => openUpgrade(license.plan === "starter" ? "pro" : license.plan)} className="h-8 px-3 rounded-md text-[12px] font-semibold text-white" style={{ background: "#FF6B2B" }}>Yenile</button>
        </div>
      )}

      {/* Usage */}
      <div>
        <SectionHeader title="Kullanım" subtitle="Bu döneme ait kaynak tüketimi" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <UsageBar label="Projeler" used={projectsUsed} max={license.limits.projects} icon={FileText} />
          <UsageBar label="Personel" used={personnelUsed} max={license.limits.personnel} icon={Users} />
          <UsageBar label="Depo" used={0} max={license.limits.warehouses} icon={Warehouse} />
          <UsageBar label="AI istekleri" used={aiUsed} max={license.limits.aiPerDay} icon={Bot} />
          <UsageBar label="Depolama" used={2} max={license.plan === "enterprise" ? -1 : 20} icon={HardDrive} />
          <UsageBar label="Dokümanlar" used={invoices.length} max={-1} icon={FileText} />
          <UsageBar label="Fotoğraflar" used={0} max={-1} icon={Camera} />
          <UsageBar label="Araçlar" used={0} max={license.canFleet ? -1 : 0} icon={Truck} />
        </div>
      </div>

      {/* AI usage */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3">
        <div className="rounded-2xl border border-border p-5 bg-card">
          <SectionHeader title="AI Kullanımı" subtitle="Günlük ve aylık AI kredi tüketimi" />
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Bugün" value={`${aiUsed}`} hint={license.limits.aiPerDay === -1 ? "Sınırsız" : `/ ${license.limits.aiPerDay}`} />
            <StatCard label="Bu ay" value={`${aiUsed * 12}`} tone="default" />
            <StatCard label="Kalan (bugün)" value={license.limits.aiPerDay === -1 ? "∞" : `${Math.max(0, license.limits.aiPerDay - aiUsed)}`} tone="success" />
          </div>
          <div className="mt-3 h-24 rounded-lg border border-dashed border-border flex items-end gap-1 px-2 py-2">
            {Array.from({ length: 14 }).map((_, i) => {
              const h = 20 + Math.round(Math.abs(Math.sin(i * 1.4)) * 70);
              return <div key={i} className="flex-1 rounded-sm transition-all" style={{ height: `${h}%`, background: "linear-gradient(180deg,#FF6B2B,rgba(255,107,43,0.2))" }} />;
            })}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground text-right">Son 14 gün</div>
        </div>
        <div className="rounded-2xl border border-border p-5 bg-card">
          <SectionHeader title="En çok kullanılan AI özellikleri" />
          <div className="space-y-2 text-[12px]">
            {["Finansal analiz","CEO Modu","Nakit tahmini","Satın alma özeti","Depo özeti"].map((f, i) => (
              <div key={f} className="flex items-center gap-2">
                <span className="w-16 text-muted-foreground text-[11px]">{[42,31,18,14,9][i]}%</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${[42,31,18,14,9][i]}%`, background: "#FF6B2B" }} />
                </div>
                <span className="text-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team seats */}
      <div className="rounded-2xl border border-border p-5 bg-card">
        <SectionHeader
          title="Ekip Koltukları"
          subtitle="Satın alınan ve kullanılan koltukları yönetin"
          action={<button className="h-8 px-3 rounded-md text-[12px] font-semibold text-white" style={{ background: "#FF6B2B" }}>Kullanıcı davet et</button>}
        />
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Satın alınan" value={seatsMax === -1 ? "∞" : String(seatsMax)} />
          <StatCard label="Kullanılan" value={String(seatsUsed)} tone="warn" />
          <StatCard label="Boş" value={seatsMax === -1 ? "∞" : String(Math.max(0, seatsMax - seatsUsed))} tone="success" />
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full" style={{ width: seatsMax === -1 ? "6%" : `${Math.min(100, (seatsUsed / Math.max(1, seatsMax)) * 100)}%`, background: "linear-gradient(90deg,#FF6B2B,#F59E0B)" }} />
        </div>
      </div>

      {/* Payment history */}
      <div className="rounded-2xl border border-border p-5 bg-card">
        <SectionHeader title="Ödeme Geçmişi" subtitle="Son 20 kayıt" />
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                {["Fatura No","Plan","Tutar","KDV","Durum","Tarih","Yöntem",""].map(h => (
                  <th key={h} className="text-left font-medium px-2 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(invoices.length ? invoices : payments).slice(0, 8).map((row: any) => {
                const amount = Number(row.amount || 0);
                const vat = Math.round(amount - amount / 1.20);
                const status = (row.status || "success").toLowerCase();
                const badge = status === "success" || status === "paid" ? { c: "#22C55E", t: "Ödendi" } : status === "pending" ? { c: "#F59E0B", t: "Beklemede" } : { c: "#EF4444", t: "Başarısız" };
                return (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                    <td className="px-2 py-2 font-mono text-foreground">INV-{String(row.id).slice(0, 6).toUpperCase()}</td>
                    <td className="px-2 py-2 text-muted-foreground">{row.plan_name || "—"}</td>
                    <td className="px-2 py-2 text-foreground">{amount.toLocaleString("tr-TR")} ₺</td>
                    <td className="px-2 py-2 text-muted-foreground">{vat.toLocaleString("tr-TR")} ₺</td>
                    <td className="px-2 py-2"><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: `${badge.c}22`, color: badge.c }}>{badge.t}</span></td>
                    <td className="px-2 py-2 text-muted-foreground">{fmt(row.created_at || row.invoice_date)}</td>
                    <td className="px-2 py-2 text-muted-foreground">Kart</td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => toast.success("PDF indirme başlıyor")} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(invoices.length + payments.length) === 0 && (
                <tr><td colSpan={8} className="text-center py-6 text-muted-foreground text-[12px]">Henüz ödeme kaydı yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan comparison */}
      <div className="rounded-2xl border border-border p-5 bg-card">
        <SectionHeader title="Plan Karşılaştırması" subtitle="Mevcut plan turuncu vurgu ile işaretlidir" />
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[640px]">
            <thead>
              <tr>
                <th className="text-left px-2 py-2 text-muted-foreground font-medium">Özellik</th>
                {(["starter","pro","business","enterprise"] as const).map(p => (
                  <th key={p} className="px-2 py-2">
                    <div className="flex flex-col items-center gap-1">
                      <PlanBadge plan={p} />
                      {license.plan === p && <span className="text-[9px] font-semibold text-[#FF6B2B] uppercase">Mevcut</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map(row => (
                <tr key={row.key} className="border-t border-border/60">
                  <td className="px-2 py-2 text-muted-foreground">{row.label}</td>
                  {(["starter","pro","business","enterprise"] as const).map(p => {
                    const v = row.values[p];
                    const isCurrent = license.plan === p;
                    return (
                      <td key={p} className="px-2 py-2 text-center" style={{ background: isCurrent ? "rgba(255,107,43,0.06)" : undefined }}>
                        {typeof v === "boolean"
                          ? (v ? <Check className="w-3.5 h-3.5 text-emerald-400 inline" /> : <X className="w-3.5 h-3.5 text-muted-foreground inline" />)
                          : <span className="text-foreground">{v}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          {(["pro","business","enterprise"] as LicensePlan[]).map(p => (
            <button key={p} onClick={() => openUpgrade(p)} className="h-8 px-3 rounded-md text-[12px] font-semibold border border-border text-foreground hover:border-[#FF6B2B] hover:text-[#FF6B2B] transition-colors">
              {PLAN_META[p].label}'a geç
            </button>
          ))}
        </div>
      </div>

      {/* Feature matrix (per-module access) */}
      <div className="rounded-2xl border border-border p-5 bg-card">
        <SectionHeader title="Modül Erişim Matrisi" subtitle="Her modülün gerektirdiği plan ve mevcut erişim" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(Object.keys(FEATURE_LABELS) as LicenseFeature[]).map(f => {
            const need = minPlanFor(f);
            const ok = license.hasFeature(f);
            return (
              <div key={f} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:border-foreground/20 transition-colors">
                <div>
                  <div className="text-[12px] text-foreground font-medium">{FEATURE_LABELS[f]}</div>
                  <div className="text-[10px] text-muted-foreground">Gerekli: {PLAN_META[need].label}</div>
                </div>
                <div className="flex items-center gap-2">
                  <PlanBadge plan={need} showIcon={false} />
                  {ok
                    ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400"><Check className="w-3 h-3" />Açık</span>
                    : <button onClick={() => openUpgrade(need)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#FF6B2B]">Kilit — Yükselt <ChevronRight className="w-3 h-3" /></button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legacy billing (cards / cancellation) — preserved untouched */}
      <div className="rounded-2xl border border-border bg-card">
        <button onClick={() => setShowLegacy(v => !v)} className="w-full flex items-center justify-between px-5 py-4 text-left">
          <div>
            <div className="text-[13px] font-semibold text-foreground">Kayıtlı Kartlar & Fatura Yönetimi</div>
            <div className="text-[11px] text-muted-foreground">iyzico entegrasyonu, iptal ve saklanan kart işlemleri</div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showLegacy ? "rotate-180" : ""}`} />
        </button>
        {showLegacy && (
          <div className="border-t border-border p-4 text-[12px] text-muted-foreground">
            Bu bölümü açmak için Ayarlar → <strong>Plan ve Kullanım</strong> sekmesine gidin. Ödeme, kart yönetimi ve iptal işlemleri orada korunmaktadır.
          </div>
        )}
      </div>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} recommendedPlan={upgradeTarget} />
      {downgradeTarget && <DowngradeDialog current={license.plan} target={downgradeTarget} onClose={() => setDowngradeTarget(null)} />}
    </div>
  );
};

/* ---------- Sub-components ---------- */
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono text-foreground">{value}</span>
  </div>
);

const ViewAsSimulator = () => {
  const [open, setOpen] = useState(false);
  const options: LicensePlan[] = ["starter", "pro", "business", "enterprise", "trial", "demo"];
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-2 h-8 px-3 rounded-md text-[11px] font-semibold border" style={{ borderColor: PLAN_META.super_admin.border, background: PLAN_META.super_admin.bg, color: PLAN_META.super_admin.color }}>
        <Crown className="w-3.5 h-3.5" />
        Simüle et <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-10 w-56 rounded-lg border border-border bg-popover shadow-lg animate-scale-in p-1">
          <button onClick={() => { setViewAs(null); setOpen(false); toast.success("Süper admin görünümüne dönüldü"); }} className="w-full text-left px-2 py-1.5 rounded text-[12px] hover:bg-muted text-foreground">Gerçek görünüme dön</button>
          <div className="my-1 border-t border-border" />
          {options.map(p => (
            <button key={p} onClick={() => { setViewAs(p); setOpen(false); toast.success(`Görünüm: ${PLAN_META[p].label}`); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] hover:bg-muted">
              <PlanBadge plan={p} showIcon={false} />
              <span className="text-foreground">{PLAN_META[p].label} olarak görüntüle</span>
            </button>
          ))}
          <div className="my-1 border-t border-border" />
          <button onClick={() => { setViewAs(null); setOpen(false); }} className="w-full text-left px-2 py-1.5 rounded text-[11px] text-muted-foreground hover:bg-muted">
            Yalnızca test amaçlıdır. Normal kullanıcılara görünmez.
          </button>
        </div>
      )}
    </div>
  );
};

const DowngradeDialog = ({ current, target, onClose }: { current: LicensePlan; target: LicensePlan; onClose: () => void }) => {
  const lost = (Object.keys(FEATURE_LABELS) as LicenseFeature[]).filter(f => {
    const need = minPlanFor(f);
    const rank: Record<LicensePlan, number> = { starter: 1, pro: 2, business: 3, enterprise: 4, trial: 2, demo: 4, super_admin: 5 };
    return rank[need] > rank[target] && rank[need] <= rank[current];
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={onClose}>
      <div className="max-w-md w-full rounded-2xl border border-border bg-popover p-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h4 className="text-[14px] font-semibold text-foreground">Plan düşürme onayı</h4>
        </div>
        <p className="text-[12px] text-muted-foreground">
          {PLAN_META[current].label} → {PLAN_META[target].label} geçişi ile aşağıdaki modüller kilitlenecek. Verileriniz silinmez, salt-okunur olur.
        </p>
        <div className="mt-3 rounded-lg border border-border p-3 max-h-40 overflow-y-auto space-y-1">
          {lost.length === 0 && <div className="text-[11px] text-muted-foreground">Kaybedilen bir modül yok.</div>}
          {lost.map(f => (
            <div key={f} className="flex items-center gap-2 text-[12px] text-foreground">
              <X className="w-3.5 h-3.5 text-red-400" /> {FEATURE_LABELS[f]}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="h-8 px-3 rounded-md text-[12px] border border-border text-muted-foreground">Vazgeç</button>
          <button onClick={() => { toast.success("Plan düşürme talebi alındı"); onClose(); }} className="h-8 px-3 rounded-md text-[12px] font-semibold text-white" style={{ background: "#EF4444" }}>Yine de düşür</button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCenter;
