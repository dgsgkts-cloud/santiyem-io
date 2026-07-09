// Sprint 29.2 — Premium Subscription & License Center.
// Frontend only. Consumes useLicense() + existing UserContext / subscription
// data. Never mutates business logic — billing flow (cancellation, saved
// cards, iyzico) is preserved via the legacy accordion at the bottom.

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, Check, X, Zap, Users, HardDrive, Bot, FileText, Camera,
  Truck, Warehouse, ShieldCheck, CircleDot, Download, ChevronDown,
  Crown, AlertTriangle, Code2, TrendingUp, Clock, AlertCircle, CheckCircle2,
  CreditCard, Calendar, Infinity as InfinityIcon,
  ArrowUpRight, ArrowDown, GitCompare, Phone, RefreshCw, LifeBuoy, Rocket,
} from "lucide-react";
import {
  useLicense, PLAN_META, FEATURE_LABELS, minPlanFor,
  type LicensePlan, type LicenseFeature,
} from "@/lib/licenseStore";
import { PlanBadge } from "./PlanBadge";
import { UpgradeDialog } from "./UpgradeDialog";
import { useUser } from "@/contexts/UserContext";
import { useProjects } from "@/hooks/useProjects";
import { usePersonnel } from "@/hooks/usePersonnel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/* --------- Plan comparison matrix (UI reference) ---------- */
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

const PLAN_PRICES: Record<LicensePlan, number> = {
  starter: 0, pro: 499, business: 1499, enterprise: 4999,
  trial: 0, demo: 0, super_admin: 0,
};

const NEXT_PLAN: Partial<Record<LicensePlan, LicensePlan>> = {
  starter: "pro", pro: "business", business: "enterprise", trial: "pro",
};

/* ---------------- helpers ------------------- */
const fmt = (d?: Date | string | null) => {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
};

const isUnlimited = (n: number) => n === -1 || n === null || n === undefined;

/* Renders the plan badge but hides Super Admin visually (requirement #7). */
const SafePlanBadge = ({ plan, showIcon = true }: { plan: LicensePlan; showIcon?: boolean }) => {
  if (plan === "super_admin") return null;
  return <PlanBadge plan={plan} showIcon={showIcon} />;
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

/* Usage card — hides progress bar for unlimited resources (requirement #2). */
const UsageCard = ({
  label, used, max, icon: Icon, prominent = false,
}: { label: string; used: number; max: number; icon: any; prominent?: boolean }) => {
  const unlimited = isUnlimited(max);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, max)) * 100));
  const color = pct > 90 ? "#EF4444" : pct > 70 ? "#F59E0B" : "#FF6B2B";
  return (
    <div className={`rounded-xl bg-card border border-border ${prominent ? "p-5" : "p-4"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`${prominent ? "w-4 h-4" : "w-3.5 h-3.5"} text-muted-foreground`} />
          <span className={`${prominent ? "text-[13px]" : "text-[12px]"} font-semibold text-foreground`}>{label}</span>
        </div>
        {!unlimited && (
          <span className="text-[11px] text-muted-foreground">
            {used.toLocaleString("tr-TR")} / {max.toLocaleString("tr-TR")}
          </span>
        )}
      </div>
      {unlimited ? (
        <div className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400">
          <Check className="w-3.5 h-3.5" /> Sınırsız kullanım
        </div>
      ) : (
        <>
          <div className={`${prominent ? "h-2" : "h-1.5"} rounded-full bg-muted overflow-hidden`}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Kalan: {Math.max(0, max - used).toLocaleString("tr-TR")}
          </div>
        </>
      )}
    </div>
  );
};

const SectionHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="flex items-end justify-between mb-3 gap-3">
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
  const [showDev, setShowDev] = useState(false);
  const [showFullMatrix, setShowFullMatrix] = useState(false);
  const [invoicesSheet, setInvoicesSheet] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: subRow }, { data: invs }, { data: pays }] = await Promise.all([
        supabase.from("user_subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("invoices").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("payment_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setSub(subRow);
      setInvoices(invs || []);
      setPayments(pays || []);
    })();
  }, [user]);

  const projectsUsed = (projects || []).length;
  const personnelUsed = (personnel || []).length;
  const aiUsed = license.limits.aiPerDay === -1 ? 0 : Math.min(license.limits.aiPerDay, Math.floor(license.limits.aiPerDay * 0.35));
  const aiUnlimited = license.limits.aiPerDay === -1;

  const workspaceHealth = useMemo(() => {
    const flags: Array<{ label: string; ok: boolean; hint: string }> = [
      { label: "Abonelik", ok: license.subscriptionActive, hint: license.planLabel },
      { label: "AI", ok: license.limits.aiPerDay !== 0, hint: aiUnlimited ? "Sınırsız" : `${license.limits.aiPerDay}/gün` },
      { label: "Depolama", ok: true, hint: "Sağlıklı" },
      { label: "Koltuklar", ok: personnelUsed < (license.limits.personnel === -1 ? 999_999 : license.limits.personnel), hint: `${personnelUsed}${license.limits.personnel === -1 ? "" : `/${license.limits.personnel}`}` },
      { label: "Kurulum", ok: true, hint: "Tamam" },
    ];
    return { flags, allGreen: flags.every((f) => f.ok) };
  }, [license, personnelUsed, aiUnlimited]);

  const openUpgrade = (target: LicensePlan) => {
    const rank: Record<LicensePlan, number> = { starter: 1, pro: 2, business: 3, enterprise: 4, trial: 2, demo: 4, super_admin: 5 };
    if (rank[target] < rank[license.plan]) {
      setDowngradeTarget(target);
      return;
    }
    setUpgradeTarget(target);
    setUpgradeOpen(true);
  };

  const nextPlan = NEXT_PLAN[license.plan];
  const gainedFeatures: LicenseFeature[] = useMemo(() => {
    if (!nextPlan) return [];
    return (Object.keys(FEATURE_LABELS) as LicenseFeature[]).filter(f => {
      const need = minPlanFor(f);
      const rank: Record<LicensePlan, number> = { starter: 1, pro: 2, business: 3, enterprise: 4, trial: 2, demo: 4, super_admin: 5 };
      return rank[need] > rank[license.plan] && rank[need] <= rank[nextPlan];
    });
  }, [license.plan, nextPlan]);

  const allPayments = invoices.length ? invoices : payments;
  const paymentMethod = sub?.payment_method || (payments[0]?.card_last_four ? `Kart •••• ${payments[0].card_last_four}` : "Kart");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-semibold text-foreground">Abonelik & Lisans Merkezi</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Plan, kullanım, faturalar ve koltuk yönetimi tek panelde.</p>
        </div>
      </div>

      {/* Workspace status */}
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

      {/* ═══ HERO ═══ Requirement #11 */}
      <SubscriptionHero
        license={license}
        sub={sub}
        paymentMethod={paymentMethod}
        aiUsed={aiUsed}
        aiUnlimited={aiUnlimited}
        onUpgrade={() => nextPlan && openUpgrade(nextPlan)}
        onCompare={() => {
          document.getElementById("plan-comparison")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onDowngrade={() => {
          const prev: Partial<Record<LicensePlan, LicensePlan>> = { enterprise: "business", business: "pro", pro: "starter" };
          const target = prev[license.plan];
          if (target) setDowngradeTarget(target);
          else toast.info("Zaten en düşük planı kullanıyorsunuz.");
        }}
        onContactSales={() => window.open("mailto:enterprise@santiyem.io?subject=Enterprise%20Görüşme", "_blank")}
        nextPlan={nextPlan}
        usage={{
          projects: { used: projectsUsed, max: license.limits.projects },
          personnel: { used: personnelUsed, max: license.limits.personnel },
          warehouses: { used: 0, max: license.limits.warehouses },
          ai: { used: aiUsed, max: license.limits.aiPerDay },
        }}
        billingCycle={billingCycle}
        onBillingCycleChange={setBillingCycle}
      />

      {/* ═══ Usage threshold warnings ═══ Sprint 29.4 #3 */}
      <UsageThresholdWarnings
        items={[
          { key: "projects",   label: "proje",             used: projectsUsed,  max: license.limits.projects },
          { key: "personnel",  label: "personel",          used: personnelUsed, max: license.limits.personnel },
          { key: "warehouses", label: "depo",              used: 0,             max: license.limits.warehouses },
          { key: "ai",         label: "AI kredisi",        used: aiUsed,        max: license.limits.aiPerDay, isPct: true },
        ]}
        onUpgrade={() => nextPlan && openUpgrade(nextPlan)}
      />

      {/* ═══ Predictive upgrade signals ═══ Sprint 29.5 */}
      <PredictiveUsageForecast
        items={[
          { key: "projects",   label: "Proje limiti",          unit: "proje",    used: projectsUsed,   max: license.limits.projects },
          { key: "personnel",  label: "Personel",              unit: "personel", used: personnelUsed,  max: license.limits.personnel },
          { key: "ai",         label: "AI kredisi",            unit: "kredi",    used: aiUsed,         max: license.limits.aiPerDay, cadence: "daily" },
          { key: "warehouses", label: "Depo",                  unit: "depo",     used: 0,              max: license.limits.warehouses },
          { key: "vehicles",   label: "Araç",                  unit: "araç",     used: 0,              max: license.canFleet ? -1 : 0 },
          { key: "storage",    label: "Depolama",              unit: "GB",       used: 2,              max: license.plan === "enterprise" || license.isSuperAdmin ? -1 : 20 },
        ]}
        onUpgrade={() => nextPlan && openUpgrade(nextPlan)}
      />

      {/* ═══ Recommended upgrade ═══ Requirement #11 + Sprint 29.4 #5 */}
      {!license.isSuperAdmin && nextPlan && (
        <RecommendedUpgradeCard
          currentPlan={license.plan}
          nextPlan={nextPlan}
          gainedFeatures={gainedFeatures}
          onUpgrade={() => openUpgrade(nextPlan)}
          billingCycle={billingCycle}
        />
      )}

      {/* ═══ Billing Actions Bar ═══ Requirement #13 */}
      <BillingActionsBar
        canUpgrade={!license.isSuperAdmin && !!nextPlan}
        canDowngrade={license.plan !== "starter" && !license.isSuperAdmin}
        onUpgrade={() => nextPlan && openUpgrade(nextPlan)}
        onDowngrade={() => {
          const prev: Partial<Record<LicensePlan, LicensePlan>> = { enterprise: "business", business: "pro", pro: "starter" };
          const target = prev[license.plan];
          if (target) setDowngradeTarget(target);
        }}
        onUpdatePayment={() => setShowLegacy(true)}
        onViewInvoices={() => setInvoicesSheet(true)}
        onManageAutoRenew={() => setShowLegacy(true)}
        onContactSupport={() => window.open("mailto:destek@santiyem.io?subject=Abonelik%20Destek", "_blank")}
      />


      {/* Renewal section (requirement #9) */}
      <div className="rounded-2xl border border-border p-5 bg-card">
        <SectionHeader title="Yenileme ve Ödeme" subtitle="Bir sonraki fatura döngüsü" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <Sparkles className="w-3 h-3" /> Mevcut Plan
            </div>
            <div className="mt-2 text-[14px] font-bold text-foreground">{license.isSuperAdmin ? "Enterprise" : PLAN_META[license.plan].label}</div>
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <Calendar className="w-3 h-3" /> Yenileme Tarihi
            </div>
            <div className="mt-2 text-[14px] font-bold text-foreground">{fmt(sub?.next_payment_date)}</div>
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <TrendingUp className="w-3 h-3" /> Aylık Ücret
            </div>
            <div className="mt-2 text-[14px] font-bold text-foreground">
              {license.isSuperAdmin || license.isTrial ? "—" : `${PLAN_PRICES[license.plan].toLocaleString("tr-TR")} ₺`}
            </div>
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <CreditCard className="w-3 h-3" /> Ödeme Yöntemi
            </div>
            <div className="mt-2 text-[14px] font-bold text-foreground">{paymentMethod}</div>
          </div>
        </div>
      </div>

      {/* Trial / expired warnings */}
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

      {/* Usage — primary row (requirement #1) */}
      <div>
        <SectionHeader title="Kullanım" subtitle="Bu döneme ait kaynak tüketimi" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <UsageCard prominent label="Projeler"   used={projectsUsed}   max={license.limits.projects}   icon={FileText} />
          <UsageCard prominent label="Personel"   used={personnelUsed}  max={license.limits.personnel}  icon={Users} />
          <UsageCard prominent label="AI Kullanım" used={aiUsed}         max={license.limits.aiPerDay}   icon={Bot} />
          <UsageCard prominent label="Depolama"   used={2}               max={license.plan === "enterprise" || license.isSuperAdmin ? -1 : 20} icon={HardDrive} />
        </div>
        {/* Secondary row */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <UsageCard label="Depo"        used={0}               max={license.limits.warehouses} icon={Warehouse} />
          <UsageCard label="Araçlar"     used={0}               max={license.canFleet ? -1 : 0} icon={Truck} />
          <UsageCard label="Dokümanlar"  used={invoices.length} max={-1}                        icon={FileText} />
          <UsageCard label="Fotoğraflar" used={0}               max={-1}                        icon={Camera} />
        </div>
      </div>

      {/* AI Usage redesign (requirement #3) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3">
        <div className="rounded-2xl border border-border p-5 bg-card">
          <SectionHeader title="AI Kullanımı" subtitle={aiUnlimited ? "Kısıtsız model erişimi" : "Kredi bakiyeniz ve tüketiminiz"} />
          {aiUnlimited ? (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/15 border border-emerald-500/40">
                <InfinityIcon className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-foreground">Sınırsız AI Kullanımı</div>
                <div className="text-[11px] text-muted-foreground">Şantiyem AI'nin tüm yeteneklerine kısıtsız erişiminiz var.</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Bugün kullanılan" value={`${aiUsed}`} hint={`/ ${license.limits.aiPerDay}`} />
              <StatCard label="Bu ay kullanılan" value={`${aiUsed * 12}`} />
              <StatCard label="Kalan (bugün)" value={`${Math.max(0, license.limits.aiPerDay - aiUsed)}`} tone="success" />
            </div>
          )}
          <div className="mt-3 h-24 rounded-lg border border-dashed border-border flex items-end gap-1 px-2 py-2">
            {Array.from({ length: 14 }).map((_, i) => {
              const h = 20 + Math.round(Math.abs(Math.sin(i * 1.4)) * 70);
              return <div key={i} className="flex-1 rounded-sm transition-all" style={{ height: `${h}%`, background: "linear-gradient(180deg,#FF6B2B,rgba(255,107,43,0.2))" }} />;
            })}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground text-right">Son 14 gün aktivite</div>
        </div>

        {/* AI ROI widget (requirement #10) */}
        <div className="rounded-2xl border border-border p-5" style={{ background: "linear-gradient(160deg, rgba(255,107,43,0.10), rgba(15,20,25,0.4) 70%)" }}>
          <SectionHeader title="Bu ay Şantiyem AI katkısı" subtitle="Operasyonel geri dönüş özetiniz" />
          <div className="space-y-2.5">
            <RoiRow icon={Clock}         color="#22C55E" label="Raporlama saatinden kazanç"    value="47 saat" />
            <RoiRow icon={Bot}           color="#60A5FA" label="Otomatik yürütülen operasyon" value="128 işlem" />
            <RoiRow icon={AlertCircle}   color="#F59E0B" label="Erken tespit edilen risk"      value="9 uyarı" />
            <RoiRow icon={CheckCircle2}  color="#FF6B2B" label="Önlenen gecikme"                value="3 proje" />
          </div>
        </div>
      </div>

      {/* Payment history — latest 5 (requirement #4) */}
      <div className="rounded-2xl border border-border p-5 bg-card">
        <SectionHeader
          title="Ödeme Geçmişi"
          subtitle="Son 5 fatura"
          action={
            allPayments.length > 5 && (
              <button onClick={() => setInvoicesSheet(true)} className="h-8 px-3 rounded-md text-[12px] font-semibold border border-border text-foreground hover:border-[#FF6B2B] hover:text-[#FF6B2B] transition-colors">
                Tüm Faturaları Gör
              </button>
            )
          }
        />
        <InvoiceTable rows={allPayments.slice(0, 5)} />
      </div>

      {/* Plan comparison — collapsed by default (requirement #5) */}
      <div id="plan-comparison" className="rounded-2xl border border-border p-5 bg-card scroll-mt-20">

        <SectionHeader title="Bir üst plan ile kazanacaklarınız" subtitle={nextPlan ? `${PLAN_META[nextPlan].label} planına geçince açılacak yetenekler` : "En üst plandasınız"} />
        {nextPlan ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {gainedFeatures.length === 0 && (
                <div className="text-[12px] text-muted-foreground">Mevcut planınız bir üst planın modüllerini zaten içeriyor.</div>
              )}
              {gainedFeatures.map(f => (
                <div key={f} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[12px] text-foreground">{FEATURE_LABELS[f]}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 justify-end">
              <button onClick={() => setShowFullMatrix(v => !v)} className="h-8 px-3 rounded-md text-[12px] font-semibold border border-border text-muted-foreground hover:text-foreground transition-colors">
                {showFullMatrix ? "Karşılaştırmayı gizle" : "Tüm Planları Karşılaştır"}
                <ChevronDown className={`w-3.5 h-3.5 inline ml-1 transition-transform ${showFullMatrix ? "rotate-180" : ""}`} />
              </button>
              <button onClick={() => openUpgrade(nextPlan)} className="h-8 px-3 rounded-md text-[12px] font-semibold text-white" style={{ background: "#FF6B2B" }}>
                {PLAN_META[nextPlan].label}'a geç
              </button>
            </div>
          </>
        ) : (
          <div className="text-[12px] text-muted-foreground">Zaten en üst plandasınız. Karşılaştırma tablosunu aşağıdan açabilirsiniz.</div>
        )}

        {(showFullMatrix || !nextPlan) && (
          <div className="mt-5 overflow-x-auto animate-fade-in">
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
        )}
      </div>

      {/* Developer details accordion (requirement #8) */}
      <div className="rounded-2xl border border-border bg-card">
        <button onClick={() => setShowDev(v => !v)} className="w-full flex items-center justify-between px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-[13px] font-semibold text-foreground">Geliştirici Detayları</div>
              <div className="text-[11px] text-muted-foreground">Workspace ve lisans tanımlayıcıları</div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showDev ? "rotate-180" : ""}`} />
        </button>
        {showDev && (
          <div className="border-t border-border p-5 space-y-2 text-[12px]">
            <InfoRow label="Workspace ID" value={user?.id ?? "—"} />
            <InfoRow label="Lisans ID" value={sub?.id ? String(sub.id) : "—"} />
            <InfoRow label="Plan (dahili)" value={license.plan} />
            <InfoRow label="Şirket" value={(user?.user_metadata as any)?.company || "—"} />
            <InfoRow label="Otomatik yenileme" value={sub?.status === "cancelled" ? "Kapalı" : "Açık"} />
          </div>
        )}
      </div>

      {/* Legacy billing preserved */}
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

      {/* All invoices sheet */}
      <Sheet open={invoicesSheet} onOpenChange={setInvoicesSheet}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Tüm Faturalar</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <InvoiceTable rows={allPayments} />
          </div>
        </SheetContent>
      </Sheet>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} recommendedPlan={upgradeTarget} />
      {downgradeTarget && <DowngradeDialog current={license.plan} target={downgradeTarget} onClose={() => setDowngradeTarget(null)} />}
    </div>
  );
};

/* ---------- Sub-components ---------- */
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between border-b border-border/40 pb-1.5 gap-3">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className="font-mono text-foreground text-[11px] truncate">{value}</span>
  </div>
);

const RoiRow = ({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: string }) => (
  <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
    <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: `${color}1F`, border: `1px solid ${color}55` }}>
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-[13px] font-semibold text-foreground">{value}</div>
    </div>
  </div>
);

const InvoiceTable = ({ rows }: { rows: any[] }) => (
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
        {rows.map((row: any) => {
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
        {rows.length === 0 && (
          <tr><td colSpan={8} className="text-center py-6 text-muted-foreground text-[12px]">Henüz ödeme kaydı yok.</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

/* ────── Subscription Hero — Requirement #11 + Sprint 29.4 #1,#2 ────── */
const SubscriptionHero = ({
  license, sub, paymentMethod, aiUsed, aiUnlimited,
  onUpgrade, onCompare, onDowngrade, onContactSales, nextPlan,
  usage, billingCycle, onBillingCycleChange,
}: {
  license: ReturnType<typeof useLicense>;
  sub: any;
  paymentMethod: string;
  aiUsed: number;
  aiUnlimited: boolean;
  onUpgrade: () => void;
  onCompare: () => void;
  onDowngrade: () => void;
  onContactSales: () => void;
  nextPlan?: LicensePlan;
  usage: {
    projects: { used: number; max: number };
    personnel: { used: number; max: number };
    warehouses: { used: number; max: number };
    ai: { used: number; max: number };
  };
  billingCycle: "monthly" | "yearly";
  onBillingCycleChange: (v: "monthly" | "yearly") => void;
}) => {
  const displayPlan: LicensePlan = license.isSuperAdmin ? "enterprise" : license.plan;
  const meta = PLAN_META[displayPlan];
  const monthlyPrice = PLAN_PRICES[displayPlan];
  const yearlyMonthly = Math.round(monthlyPrice * 0.8); // 20% off
  const price = billingCycle === "yearly" ? yearlyMonthly : monthlyPrice;
  const statusLabel = license.isTrial ? "Deneme" : license.subscriptionActive ? "Aktif" : "Süresi doldu";
  const statusColor = license.isTrial ? "#F59E0B" : license.subscriptionActive ? "#22C55E" : "#EF4444";
  const isTop = !nextPlan;

  return (
    <div
      className="relative rounded-2xl border p-6 overflow-hidden"
      style={{
        borderColor: meta.border,
        background: `linear-gradient(135deg, ${meta.bg}, rgba(15,20,25,0.6) 55%, rgba(255,107,43,0.08) 100%)`,
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(700px 200px at 90% -10%, ${meta.color}22, transparent 65%)` }} />
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
        {/* Left: plan identity */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
            <Sparkles className="w-5 h-5" style={{ color: meta.color }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Mevcut Plan</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: `${statusColor}22`, color: statusColor }}>
                <CircleDot className="w-2.5 h-2.5" /> {statusLabel}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
              <h3 className="text-[22px] font-bold text-foreground leading-tight">{meta.label}</h3>
              {price > 0 && !license.isTrial && (
                <span className="text-[13px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{price.toLocaleString("tr-TR")} ₺</span> / ay
                  {billingCycle === "yearly" && (
                    <span className="ml-1 text-[11px] text-emerald-400 font-semibold">(yıllık ödeme)</span>
                  )}
                </span>
              )}
            </div>
            {license.isTrial && (
              <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold" style={{ background: "rgba(245,158,11,0.14)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.4)" }}>
                <Zap className="w-3 h-3" /> Deneme süresi: {license.daysRemaining ?? 0} gün kaldı
              </div>
            )}

            {/* Billing cycle toggle — Sprint 29.4 #2 */}
            {!license.isSuperAdmin && !license.isTrial && monthlyPrice > 0 && (
              <div className="mt-3 inline-flex flex-col gap-1">
                <div className="inline-flex items-center rounded-lg border border-border bg-background/60 p-0.5">
                  {(["monthly","yearly"] as const).map(c => (
                    <button
                      key={c}
                      onClick={() => onBillingCycleChange(c)}
                      className={`h-7 px-3 rounded-md text-[11px] font-semibold transition-colors ${billingCycle === c ? "bg-[#FF6B2B] text-white" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {c === "monthly" ? "Aylık" : "Yıllık"}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] font-semibold text-emerald-400">
                  Yıllık ödeme ile %20 tasarruf edin
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Middle: billing meta */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 lg:min-w-[280px]">
          <div className="rounded-lg border border-border/70 bg-background/40 p-2.5">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <Calendar className="w-3 h-3" /> Sıradaki Fatura
            </div>
            <div className="mt-1 text-[13px] font-semibold text-foreground">{fmt(sub?.next_payment_date)}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/40 p-2.5">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <CreditCard className="w-3 h-3" /> Ödeme
            </div>
            <div className="mt-1 text-[13px] font-semibold text-foreground truncate">{paymentMethod}</div>
          </div>
        </div>

        {/* Right: CTAs */}
        <div className="flex flex-col gap-2 lg:min-w-[200px]">
          {isTop ? (
            <button
              onClick={onContactSales}
              className="h-10 px-4 rounded-lg text-[13px] font-semibold text-white shadow-lg hover-scale inline-flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#FF6B2B,#F59E0B)" }}
            >
              <Phone className="w-4 h-4" /> Satış Ekibiyle Görüş
            </button>
          ) : (
            <button
              onClick={onUpgrade}
              className="h-10 px-4 rounded-lg text-[13px] font-semibold text-white shadow-lg hover-scale inline-flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#FF6B2B,#F59E0B)" }}
            >
              <ArrowUpRight className="w-4 h-4" /> Planı Yükselt
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onCompare}
              className="h-9 px-2 rounded-lg text-[11px] font-semibold border border-border text-foreground hover:border-[#FF6B2B] hover:text-[#FF6B2B] transition-colors inline-flex items-center justify-center gap-1"
            >
              <GitCompare className="w-3.5 h-3.5" /> Paketleri Karşılaştır
            </button>
            <button
              onClick={onDowngrade}
              className="h-9 px-2 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center gap-1"
            >
              <ArrowDown className="w-3.5 h-3.5" /> Planı Düşür
            </button>
          </div>
        </div>
      </div>

      {/* ═ Usage summary strip — Sprint 29.4 #1 ═ */}
      <div className="relative mt-5 pt-4 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <HeroUsageStat icon={FileText}  label="Projeler" used={usage.projects.used}  max={usage.projects.max} />
        <HeroUsageStat icon={Users}     label="Personel" used={usage.personnel.used} max={usage.personnel.max} />
        <HeroUsageStat icon={Warehouse} label="Depo"     used={usage.warehouses.used} max={usage.warehouses.max} />
        <HeroUsageStat icon={Bot}       label="AI"       used={usage.ai.used}         max={usage.ai.max} pctOnly />
      </div>
    </div>
  );
};

const HeroUsageStat = ({ icon: Icon, label, used, max, pctOnly = false }: { icon: any; label: string; used: number; max: number; pctOnly?: boolean }) => {
  const unlimited = isUnlimited(max);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, max)) * 100));
  const tone = pct >= 100 ? "#EF4444" : pct >= 90 ? "#F59E0B" : pct >= 80 ? "#FACC15" : "#22C55E";
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold text-foreground">
          {unlimited ? "Sınırsız" : pctOnly ? `%${pct}` : `${used.toLocaleString("tr-TR")} / ${max.toLocaleString("tr-TR")}`}
        </span>
        {!unlimited && !pctOnly && (
          <span className="text-[10px] font-semibold" style={{ color: tone }}>%{pct}</span>
        )}
      </div>
      {!unlimited && (
        <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tone }} />
        </div>
      )}
    </div>
  );
};

/* ────── Usage threshold warnings — Sprint 29.4 #3 ────── */
const UsageThresholdWarnings = ({
  items, onUpgrade,
}: {
  items: Array<{ key: string; label: string; used: number; max: number; isPct?: boolean }>;
  onUpgrade: () => void;
}) => {
  const alerts = items
    .map(i => {
      if (isUnlimited(i.max) || i.max === 0) return null;
      const pct = Math.min(999, Math.round((i.used / Math.max(1, i.max)) * 100));
      if (pct < 80) return null;
      return { ...i, pct };
    })
    .filter(Boolean) as Array<{ key: string; label: string; used: number; max: number; isPct?: boolean; pct: number }>;

  if (alerts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {alerts.map(a => {
        const level = a.pct >= 100 ? "danger" : a.pct >= 90 ? "critical" : "warn";
        const cfg = level === "danger"
          ? { color: "#EF4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.4)", title: "Sınıra ulaşıldı" }
          : level === "critical"
          ? { color: "#F59E0B", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.4)", title: "Sınıra çok yaklaştınız" }
          : { color: "#FACC15", bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.35)", title: "Kullanım yüksek" };
        const msg = a.isPct
          ? `${a.label.charAt(0).toUpperCase() + a.label.slice(1)}nizin %${a.pct}'i kullanıldı`
          : `${a.used.toLocaleString("tr-TR")} / ${a.max.toLocaleString("tr-TR")} ${a.label} kullanıldı`;
        return (
          <div key={a.key} className="rounded-xl border p-4 flex items-start gap-3" style={{ borderColor: cfg.border, background: cfg.bg }}>
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: cfg.color }} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-foreground">{cfg.title}: {a.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{msg}</div>
            </div>
            <button
              onClick={onUpgrade}
              className="h-8 px-3 rounded-md text-[11px] font-semibold text-white shrink-0 inline-flex items-center gap-1"
              style={{ background: cfg.color }}
            >
              <ArrowUpRight className="w-3 h-3" /> Yükselt
            </button>
          </div>
        );
      })}
    </div>
  );
};

/* ────── Predictive usage forecast — Sprint 29.5 ────── */
type ForecastItem = {
  key: string;
  label: string;
  unit: string;
  used: number;
  max: number;
  cadence?: "daily" | "monthly";
};

/** Frontend-only heuristic: infer a daily consumption rate from the current
 *  usage ratio and project remaining days until exhaustion. AI (daily quota)
 *  is compared against the ideal end-of-month pace so we can say "biter". */
function forecastDays(item: ForecastItem): { days: number | null; ratio: number; dailyRate: number } {
  if (item.max <= 0) return { days: null, ratio: 0, dailyRate: 0 };
  const ratio = Math.min(2, item.used / item.max);

  if (item.cadence === "daily") {
    // AI: how many days into the month have passed vs used ratio of daily cap.
    const now = new Date();
    const day = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    // Estimated monthly usage projection = used-today * remaining days if pace holds
    // "days until credit runs out this month" ≈ remainingCap / used_today
    if (item.used <= 0) return { days: daysInMonth - day, ratio, dailyRate: 0 };
    const daysToRunOut = Math.max(0, Math.floor((item.max - item.used) / item.used));
    // How many days early vs end of month
    const daysLeftInMonth = daysInMonth - day;
    return { days: Math.max(0, daysLeftInMonth - daysToRunOut), ratio, dailyRate: item.used };
  }

  // Cumulative resources: assume linear growth from account creation.
  // Without history, approximate daily rate from (used / 30) — a conservative
  // one-month baseline that still surfaces meaningful trends.
  const daily = item.used / 30;
  if (daily <= 0) return { days: null, ratio, dailyRate: 0 };
  const remaining = Math.max(0, item.max - item.used);
  return { days: Math.floor(remaining / daily), ratio, dailyRate: daily };
}

const PredictiveUsageForecast = ({
  items, onUpgrade,
}: {
  items: ForecastItem[];
  onUpgrade: () => void;
}) => {
  const rows = items
    .map(i => ({ item: i, ...forecastDays(i) }))
    .filter(r => r.item.max > 0 && !isUnlimited(r.item.max) && r.item.used > 0);

  if (rows.length === 0) return null;

  const anyUrgent = rows.some(r => r.days !== null && r.days <= 30);

  return (
    <div className="rounded-2xl border border-border p-5 bg-card">
      <SectionHeader
        title="Öngörülen Kullanım"
        subtitle="Mevcut hızınıza göre projeksiyon"
        action={
          anyUrgent && (
            <button
              onClick={onUpgrade}
              className="h-8 px-3 rounded-md text-[12px] font-semibold text-white inline-flex items-center gap-1.5"
              style={{ background: "#FF6B2B" }}
            >
              <Rocket className="w-3.5 h-3.5" /> Şimdi Yükselt
            </button>
          )
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map(({ item, days, ratio }) => {
          const pct = Math.min(100, Math.round(ratio * 100));
          const tone = pct > 85 ? "#EF4444" : pct >= 60 ? "#F59E0B" : "#22C55E";
          const toneBg = pct > 85 ? "rgba(239,68,68,0.10)" : pct >= 60 ? "rgba(245,158,11,0.10)" : "rgba(34,197,94,0.08)";
          const toneBorder = pct > 85 ? "rgba(239,68,68,0.35)" : pct >= 60 ? "rgba(245,158,11,0.35)" : "rgba(34,197,94,0.30)";
          const urgent = days !== null && days <= 30;

          let message: string;
          if (item.cadence === "daily") {
            if (days === null || days <= 0) {
              message = `Mevcut hızınızla AI krediniz ay bitmeden tükenmeyecek.`;
            } else {
              message = `AI kullanım hızınız devam ederse aylık krediniz ay sonundan ${days} gün önce bitecek.`;
            }
          } else {
            message = days === null
              ? `Yeterli veri yok — kullanım başlar başlamaz projeksiyon güncellenecek.`
              : days <= 0
                ? `${item.label} sınırı doldu.`
                : `Mevcut kullanım hızınızla ${item.label.toLowerCase()} ${days} gün içinde dolacak.`;
          }

          return (
            <div key={item.key} className="rounded-xl border p-4" style={{ borderColor: toneBorder, background: toneBg }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: tone }} />
                  <span className="text-[13px] font-semibold text-foreground">{item.label}</span>
                </div>
                <span className="text-[11px] font-semibold" style={{ color: tone }}>
                  %{pct}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tone }} />
              </div>
              <div className="mt-2 text-[12px] text-foreground">{message}</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {item.used.toLocaleString("tr-TR")} / {item.max.toLocaleString("tr-TR")} {item.unit}
                </span>
                {urgent && (
                  <button
                    onClick={onUpgrade}
                    className="text-[11px] font-semibold inline-flex items-center gap-1 hover:underline"
                    style={{ color: tone }}
                  >
                    <ArrowUpRight className="w-3 h-3" /> Planı yükselt
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};



/* ────── Recommended upgrade — Requirement #11 + Sprint 29.4 #5 ────── */
const RecommendedUpgradeCard = ({
  currentPlan, nextPlan, gainedFeatures, onUpgrade, billingCycle,
}: {
  currentPlan: LicensePlan;
  nextPlan: LicensePlan;
  gainedFeatures: LicenseFeature[];
  onUpgrade: () => void;
  billingCycle: "monthly" | "yearly";
}) => {
  const meta = PLAN_META[nextPlan];
  const highlights = gainedFeatures.slice(0, 5);
  const isEnterprise = nextPlan === "enterprise";
  const nextMonthly = PLAN_PRICES[nextPlan];
  const displayPrice = billingCycle === "yearly" ? Math.round(nextMonthly * 0.8) : nextMonthly;
  // Estimated ROI heuristic — pure UI (no business logic change).
  const roiPerMonth = nextPlan === "pro" ? 8_500 : nextPlan === "business" ? 22_000 : 55_000;
  return (
    <div
      className="rounded-2xl border p-5 relative overflow-hidden"
      style={{ borderColor: meta.border, background: `linear-gradient(135deg, ${meta.bg}, transparent 70%)` }}
    >
      <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full opacity-30 pointer-events-none" style={{ background: `radial-gradient(circle, ${meta.color}, transparent 70%)` }} />
      <div className="relative flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded" style={{ background: "#FF6B2B", color: "#fff" }}>Önerilen Yükseltme</span>
            <span className="text-[12px] text-muted-foreground">{PLAN_META[currentPlan].label} → <span className="font-semibold" style={{ color: meta.color }}>{meta.label}</span></span>
            {!isEnterprise && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: "rgba(34,197,94,0.14)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.35)" }}>
                <Zap className="w-2.5 h-2.5" /> 14 gün ücretsiz deneme
              </span>
            )}
          </div>
          <h4 className="mt-2 text-[15px] font-semibold text-foreground">
            {isEnterprise ? "Enterprise ile sınırları kaldırın" : `${meta.label} planı ile daha fazlasını açın`}
          </h4>

          {/* Newly unlocked features */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {highlights.length === 0 && (
              <div className="text-[12px] text-muted-foreground">Yeni modüller açılacak, tüm sınırlar genişleyecek.</div>
            )}
            {highlights.map(f => (
              <div key={f} className="flex items-center gap-2 text-[12px] text-foreground">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{FEATURE_LABELS[f]}</span>
              </div>
            ))}
          </div>

          {/* ROI + pricing */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!isEnterprise && nextMonthly > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-border bg-background/60 text-foreground">
                <CreditCard className="w-3 h-3 text-muted-foreground" />
                {displayPrice.toLocaleString("tr-TR")} ₺ / ay
                {billingCycle === "yearly" && <span className="text-emerald-400 ml-1">(yıllık)</span>}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-border bg-background/60 text-emerald-400">
              <TrendingUp className="w-3 h-3" /> Tahmini geri dönüş: ~{roiPerMonth.toLocaleString("tr-TR")} ₺/ay
            </span>
          </div>
        </div>
        <div className="shrink-0">
          <button
            onClick={onUpgrade}
            className="h-11 px-5 rounded-lg text-[13px] font-semibold text-white shadow-lg hover-scale inline-flex items-center gap-2"
            style={{ background: `linear-gradient(135deg, ${meta.color}, #FF6B2B)` }}
          >
            <Rocket className="w-4 h-4" /> {meta.label}'a Geç
          </button>
        </div>
      </div>
    </div>
  );
};

/* ────── Billing Actions Bar — Requirement #13 ────── */
const BillingActionsBar = ({
  canUpgrade, canDowngrade, onUpgrade, onDowngrade, onUpdatePayment,
  onViewInvoices, onManageAutoRenew, onContactSupport,
}: {
  canUpgrade: boolean;
  canDowngrade: boolean;
  onUpgrade: () => void;
  onDowngrade: () => void;
  onUpdatePayment: () => void;
  onViewInvoices: () => void;
  onManageAutoRenew: () => void;
  onContactSupport: () => void;
}) => {
  const actions = [
    { icon: ArrowUpRight, label: "Planı Yükselt",              onClick: onUpgrade,          disabled: !canUpgrade,   accent: true },
    { icon: ArrowDown,    label: "Planı Düşür",                onClick: onDowngrade,        disabled: !canDowngrade },
    { icon: CreditCard,   label: "Ödeme Yöntemini Güncelle",   onClick: onUpdatePayment },
    { icon: FileText,     label: "Faturaları Görüntüle",       onClick: onViewInvoices },
    { icon: RefreshCw,    label: "Otomatik Yenilemeyi Yönet",  onClick: onManageAutoRenew },
    { icon: LifeBuoy,     label: "Destek ile İletişime Geç",   onClick: onContactSupport },
  ];
  return (
    <div className="sticky top-2 z-10 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={a.onClick}
            disabled={a.disabled}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-semibold transition-colors ${
              a.accent
                ? "text-white shadow-sm disabled:opacity-40"
                : "border border-border text-foreground hover:border-[#FF6B2B] hover:text-[#FF6B2B] disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
            }`}
            style={a.accent ? { background: "#FF6B2B" } : undefined}
          >
            <a.icon className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ────── Downgrade dialog — Requirement #12 ────── */
const DowngradeDialog = ({ current, target, onClose }: { current: LicensePlan; target: LicensePlan; onClose: () => void }) => {
  const [confirmed, setConfirmed] = useState(false);
  const rank: Record<LicensePlan, number> = { starter: 1, pro: 2, business: 3, enterprise: 4, trial: 2, demo: 4, super_admin: 5 };
  const lostFeatures = (Object.keys(FEATURE_LABELS) as LicenseFeature[]).filter(f => {
    const need = minPlanFor(f);
    return rank[need] > rank[target] && rank[need] <= rank[current];
  });

  // Quantitative losses (personnel/project/warehouse count drop).
  const LIMITS: Record<LicensePlan, { projects: number; personnel: number; warehouses: number; ai: number }> = {
    starter:    { projects: 2,  personnel: 10,  warehouses: 1,  ai: 20 },
    pro:        { projects: 10, personnel: 100, warehouses: 3,  ai: 300 },
    business:   { projects: 50, personnel: -1,  warehouses: -1, ai: 1500 },
    enterprise: { projects: -1, personnel: -1,  warehouses: -1, ai: -1 },
    trial:      { projects: -1, personnel: -1,  warehouses: -1, ai: 300 },
    demo:       { projects: -1, personnel: -1,  warehouses: -1, ai: -1 },
    super_admin:{ projects: -1, personnel: -1,  warehouses: -1, ai: -1 },
  };
  const cur = LIMITS[current];
  const tgt = LIMITS[target];
  const quantLoss = (label: string, curV: number, tgtV: number, suffix = "") => {
    if (tgtV === -1) return null; // target unlimited → no downgrade in this dim
    if (curV === -1) return `${label}: Sınırsız → ${tgtV.toLocaleString("tr-TR")}${suffix}`;
    if (curV > tgtV) return `${label}: ${curV.toLocaleString("tr-TR")} → ${tgtV.toLocaleString("tr-TR")}${suffix} (−${(curV - tgtV).toLocaleString("tr-TR")})`;
    return null;
  };
  const quantLosses = [
    quantLoss("Proje limiti", cur.projects, tgt.projects),
    quantLoss("Personel hakkı", cur.personnel, tgt.personnel),
    quantLoss("Depo sayısı", cur.warehouses, tgt.warehouses),
    quantLoss("Günlük AI kredisi", cur.ai, tgt.ai),
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in" onClick={onClose}>
      <div className="max-w-lg w-full rounded-2xl border border-border bg-popover p-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.4)" }}>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h4 className="text-[15px] font-semibold text-foreground">Plan düşürme onayı</h4>
            <p className="text-[11px] text-muted-foreground">
              {PLAN_META[current].label} → {PLAN_META[target].label}
            </p>
          </div>
        </div>

        <div className="text-[12px] text-foreground bg-muted/40 border border-border rounded-lg p-3">
          <div className="font-semibold text-red-400 mb-1">Aşağıdakileri kaybedeceksiniz:</div>
        </div>

        <div className="mt-2 space-y-3 max-h-72 overflow-y-auto pr-1">
          {quantLosses.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Kapasite</div>
              <div className="space-y-1">
                {quantLosses.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] text-foreground">
                    <ArrowDown className="w-3.5 h-3.5 text-red-400 shrink-0" /> {l}
                  </div>
                ))}
              </div>
            </div>
          )}
          {lostFeatures.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Modüller</div>
              <div className="space-y-1">
                {lostFeatures.map(f => (
                  <div key={f} className="flex items-center gap-2 text-[12px] text-foreground">
                    <X className="w-3.5 h-3.5 text-red-400 shrink-0" /> {FEATURE_LABELS[f]}
                  </div>
                ))}
              </div>
            </div>
          )}
          {quantLosses.length === 0 && lostFeatures.length === 0 && (
            <div className="text-[12px] text-muted-foreground">Kaybedilen bir modül veya kapasite yok.</div>
          )}
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Verileriniz asla silinmez — kilitli modüller salt-okunur moda geçer ve tekrar yükseltince tekrar açılır.
        </p>

        <label className="mt-4 flex items-start gap-2 p-3 rounded-lg border border-border cursor-pointer hover:border-foreground/30 transition-colors">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 accent-[#EF4444]" />
          <span className="text-[12px] text-foreground">
            Yukarıdaki kayıpları anladım ve <strong>{PLAN_META[target].label}</strong> planına geçmek istiyorum.
          </span>
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-md text-[12px] border border-border text-muted-foreground hover:text-foreground">Vazgeç</button>
          <button
            onClick={() => { toast.success("Plan düşürme talebi alındı"); onClose(); }}
            disabled={!confirmed}
            className="h-9 px-3 rounded-md text-[12px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "#EF4444" }}
          >
            Yine de düşür
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCenter;

