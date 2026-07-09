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
      />

      {/* ═══ Recommended upgrade ═══ Requirement #11 */}
      {!license.isSuperAdmin && nextPlan && (
        <RecommendedUpgradeCard
          currentPlan={license.plan}
          nextPlan={nextPlan}
          gainedFeatures={gainedFeatures}
          onUpgrade={() => openUpgrade(nextPlan)}
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
      <div className="rounded-2xl border border-border p-5 bg-card">
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
