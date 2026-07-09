// Sprint M1.9 — Reports module rebuilt on the Responsive Design System.
// PageShell + SectionCard + ResponsiveGrid + ResponsiveTable + KpiCard.
// Frontend only. Reuses existing hooks; no schema/business-logic change.
//
// 8 report tabs: Kar/Zarar, Nakit Akışı, Karar Geçmişi, Finans Özeti,
// Proje Karlılık, Personel Maliyetleri, Satın Alma Analitiği, Depo Analitiği.
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useProjects } from "@/hooks/useProjects";
import { useProjectExpenses } from "@/hooks/useProjectExpenses";
import { useCashPayments } from "@/hooks/useCashPayments";
import { useCashCollections } from "@/hooks/useCashCollections";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import { usePersonnel } from "@/hooks/usePersonnel";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  AreaChart, Area, Legend, CartesianGrid, PieChart, Pie, Cell,
  LineChart, Line,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, History, BarChart3, Activity,
  Inbox, Users, PackageSearch, Warehouse, ShoppingCart, LineChart as LineIcon,
  PiggyBank, Building2,
} from "lucide-react";
import { PageShell, SectionCard, ResponsiveGrid, ResponsiveTable, KpiCard, type ResponsiveColumn } from "@/components/ui/responsive";
import { getRecent, getPinned, type RecentItem, type PinnedItem } from "@/lib/workspaceStore";
import { formatCurrencyShort as fmtShort, formatCurrencyFull as fmtFull } from "@/lib/formatCurrency";

type Tab =
  | "pnl" | "cashflow" | "decisions" | "finance"
  | "project-profit" | "personnel-cost" | "purchasing" | "warehouse";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "finance",         label: "Finans Özeti",         icon: PiggyBank },
  { id: "pnl",             label: "Kâr / Zarar",          icon: BarChart3 },
  { id: "cashflow",        label: "Nakit Akışı",          icon: Activity },
  { id: "project-profit",  label: "Proje Karlılık",       icon: Building2 },
  { id: "personnel-cost",  label: "Personel Maliyetleri", icon: Users },
  { id: "purchasing",      label: "Satın Alma",           icon: ShoppingCart },
  { id: "warehouse",       label: "Depo Analitiği",       icon: Warehouse },
  { id: "decisions",       label: "Karar Geçmişi",        icon: History },
];

const MONTHS = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];

const chartAxis = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };
const gridStroke = "hsl(var(--border) / 0.4)";
const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
};

// ─────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("finance");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <PageShell
      title="Raporlar"
      subtitle="Şirketin finansal ve operasyonel gerçek zamanlı raporları."
    >
      <div className="space-y-4">
        <TabStrip tab={tab} setTab={setTab} />
        <div className="space-y-4" key={tab}>
          {tab === "finance"        && <FinanceOverviewTab />}
          {tab === "pnl"            && <PnLTab />}
          {tab === "cashflow"       && <CashFlowTab />}
          {tab === "project-profit" && <ProjectProfitTab />}
          {tab === "personnel-cost" && <PersonnelCostTab />}
          {tab === "purchasing"     && <PurchasingTab />}
          {tab === "warehouse"      && <WarehouseTab />}
          {tab === "decisions"      && <DecisionsTab />}
        </div>
        <p className="text-fs-xs text-muted-foreground/70 pt-2">
          Aktif rapor: <span className="text-foreground/80">{active.label}</span>
        </p>
      </div>
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────
function TabStrip({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="-mx-1 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 px-1 py-1 min-w-max">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                "inline-flex items-center gap-2 px-3.5 h-10 rounded-xl text-fs-sm font-medium border transition-colors touch-target whitespace-nowrap",
                active
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-card/60 border-border/60 text-muted-foreground hover:text-foreground hover:border-border",
              ].join(" ")}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Shared monthly aggregations used by several tabs.
function useMonthlyTotals() {
  const { user } = useUser();
  const { expenses } = useProjectExpenses();
  const { payments } = useCashPayments();
  const { collections } = useCashCollections();

  const { data: allHakedis = [] } = useQuery({
    queryKey: ["reports_all_hakedis"],
    queryFn: async () => {
      const { data } = await supabase.from("project_hakedis").select("*");
      return data || [];
    },
    enabled: !!user,
  });

  const year = new Date().getFullYear();
  const monthNow = new Date().getMonth();

  const monthly = useMemo(() => {
    return MONTHS.slice(0, monthNow + 1).map((m, i) => {
      const gelir = allHakedis
        .filter((h: any) => { const d = new Date(h.created_at); return d.getMonth() === i && d.getFullYear() === year; })
        .reduce((s: number, h: any) => s + Number(h.net || 0), 0);
      const gider = expenses
        .filter((e) => { const d = new Date(e.expense_date); return d.getMonth() === i && d.getFullYear() === year; })
        .reduce((s, e) => s + Number(e.amount), 0);
      const cashIn = (collections || [])
        .filter((c: any) => { const d = new Date(c.collection_date || c.created_at); return d.getMonth() === i && d.getFullYear() === year; })
        .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      const cashOut = (payments || [])
        .filter((p: any) => { const d = new Date(p.payment_date || p.created_at); return d.getMonth() === i && d.getFullYear() === year; })
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      return { month: m, gelir, gider, kar: gelir - gider, cashIn, cashOut, net: cashIn - cashOut };
    });
  }, [allHakedis, expenses, payments, collections, year, monthNow]);

  const totals = useMemo(() => {
    const ciro = monthly.reduce((s, m) => s + m.gelir, 0);
    const gider = monthly.reduce((s, m) => s + m.gider, 0);
    const cashIn = monthly.reduce((s, m) => s + m.cashIn, 0);
    const cashOut = monthly.reduce((s, m) => s + m.cashOut, 0);
    return { ciro, gider, kar: ciro - gider, marj: ciro > 0 ? ((ciro - gider) / ciro) * 100 : 0, cashIn, cashOut, net: cashIn - cashOut };
  }, [monthly]);

  return { monthly, totals, allHakedis };
}

// ─────────────────────────────────────────────────────────
// TAB — Finans Özeti
function FinanceOverviewTab() {
  const { monthly, totals } = useMonthlyTotals();
  const { accounts = [] } = useCashAccounts();
  const cashOnHand = (accounts || []).reduce((s, a) => s + Number(a.balance || 0), 0);

  const kpis = [
    { label: "Kasa & Banka",  value: fmtShort(cashOnHand), hint: `${accounts?.length ?? 0} hesap`, icon: Wallet,      accent: "#10b981" },
    { label: "Yıllık Ciro",   value: fmtShort(totals.ciro), hint: "Hakediş toplamı",              icon: TrendingUp,  accent: "#3b82f6" },
    { label: "Yıllık Gider",  value: fmtShort(totals.gider), hint: "Tüm proje harcamaları",       icon: TrendingDown, accent: "#ef4444" },
    { label: "Net Kâr",       value: fmtShort(totals.kar), hint: `Marj %${totals.marj.toFixed(1)}`, icon: DollarSign, accent: totals.kar >= 0 ? "#22c55e" : "#ef4444" },
  ];

  return (
    <div className="space-y-4">
      <ResponsiveGrid variant="kpi">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} icon={k.icon} accent={k.accent} />
        ))}
      </ResponsiveGrid>

      <SectionCard title="Ciro vs. Gider (Aylık)" subtitle="Bu yıl için aylık karşılaştırma">
        <ChartFrame empty={monthly.every((m) => !m.gelir && !m.gider)} height={280}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="month" tick={chartAxis} axisLine={false} />
            <YAxis tick={chartAxis} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
            <ReTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtFull(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="gelir" stroke="#3b82f6" strokeWidth={2} name="Ciro" dot={false} />
            <Line type="monotone" dataKey="gider" stroke="#ef4444" strokeWidth={2} name="Gider" dot={false} />
            <Line type="monotone" dataKey="kar"   stroke="#22c55e" strokeWidth={2} name="Kâr"   dot={false} />
          </LineChart>
        </ChartFrame>
      </SectionCard>

      <SectionCard title="Kasa & Banka Hesapları" subtitle={`${accounts?.length ?? 0} aktif hesap`}>
        <ResponsiveTable
          rows={accounts || []}
          rowKey={(r) => r.id}
          empty={<EmptyBlock label="Henüz tanımlı kasa/banka hesabı yok." />}
          columns={[
            { key: "name", header: "Hesap", primary: true, cell: (r) => (
              <div className="min-w-0">
                <div className="font-medium text-foreground truncate">{r.name}</div>
                {r.bank_name && <div className="text-fs-xs text-muted-foreground truncate">{r.bank_name}</div>}
              </div>
            )},
            { key: "type",    header: "Tip",    cell: (r) => <Chip>{r.account_type}</Chip> },
            { key: "iban",    header: "IBAN",   cell: (r) => <span className="font-mono tabular-nums text-fs-xs">{r.iban ?? "—"}</span> },
            { key: "balance", header: "Bakiye", align: "right", cell: (r) => (
              <span className={`font-mono tabular-nums font-medium ${Number(r.balance) < 0 ? "text-destructive" : "text-emerald-500"}`}>
                {fmtFull(Number(r.balance || 0))}
              </span>
            )},
          ] as ResponsiveColumn<any>[]}
        />
      </SectionCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB — P&L
function PnLTab() {
  const { monthly, totals } = useMonthlyTotals();
  return (
    <div className="space-y-4">
      <ResponsiveGrid variant="kpi">
        <KpiCard label="Toplam Ciro"    value={fmtShort(totals.ciro)}  hint="Yıl toplamı"                icon={TrendingUp}    accent="#3b82f6" />
        <KpiCard label="Toplam Gider"   value={fmtShort(totals.gider)} hint="Tüm harcamalar"             icon={TrendingDown}  accent="#ef4444" />
        <KpiCard label="Net Kâr"        value={fmtShort(totals.kar)}   hint={`Marj %${totals.marj.toFixed(1)}`} icon={DollarSign} accent={totals.kar >= 0 ? "#22c55e" : "#ef4444"} />
        <KpiCard label="Ort. Aylık Kâr" value={fmtShort(totals.kar / Math.max(monthly.length, 1))} hint={`${monthly.length} ay ortalaması`} icon={Wallet} accent="#FF6B2B" />
      </ResponsiveGrid>

      <SectionCard title="Gelir — Gider — Net Kâr" subtitle="Aylık kırılım">
        <ChartFrame empty={monthly.every((m) => !m.gelir && !m.gider)} height={320}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="month" tick={chartAxis} axisLine={false} />
            <YAxis tick={chartAxis} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
            <ReTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtFull(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="gelir" fill="#3b82f6" radius={[6,6,0,0]} name="Hakediş Geliri" />
            <Bar dataKey="gider" fill="#ef4444" radius={[6,6,0,0]} name="Gider" />
            <Bar dataKey="kar"   fill="#22c55e" radius={[6,6,0,0]} name="Net Kâr" />
          </BarChart>
        </ChartFrame>
      </SectionCard>

      <SectionCard title="Aylık Detay" subtitle="Tüm aylar">
        <ResponsiveTable
          rows={monthly}
          rowKey={(r) => r.month}
          empty={<EmptyBlock label="Bu yıl için hareket yok." />}
          columns={[
            { key: "month", header: "Ay", primary: true, cell: (r) => <span className="font-medium">{r.month}</span> },
            { key: "gelir", header: "Ciro",  align: "right", cell: (r) => <Money v={r.gelir} tone="blue" /> },
            { key: "gider", header: "Gider", align: "right", cell: (r) => <Money v={r.gider} tone="red" /> },
            { key: "kar",   header: "Net Kâr", align: "right", cell: (r) => <Money v={r.kar} tone={r.kar >= 0 ? "green" : "red"} /> },
          ] as ResponsiveColumn<any>[]}
        />
      </SectionCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB — Cashflow
function CashFlowTab() {
  const { monthly, totals } = useMonthlyTotals();
  return (
    <div className="space-y-4">
      <ResponsiveGrid variant="kpi">
        <KpiCard label="Tahsilat"        value={fmtShort(totals.cashIn)}  hint="Yıl toplamı" icon={TrendingUp}    accent="#22c55e" />
        <KpiCard label="Ödeme"           value={fmtShort(totals.cashOut)} hint="Yıl toplamı" icon={TrendingDown}  accent="#ef4444" />
        <KpiCard label="Net Nakit"       value={fmtShort(totals.net)}     hint="Tahsilat − Ödeme" icon={Wallet}   accent={totals.net >= 0 ? "#22c55e" : "#ef4444"} />
        <KpiCard label="Ort. Aylık Akış" value={fmtShort(totals.net / Math.max(monthly.length, 1))} hint={`${monthly.length} ay`} icon={Activity} accent="#FF6B2B" />
      </ResponsiveGrid>

      <SectionCard title="Aylık Nakit Akışı">
        <ChartFrame empty={monthly.every((m) => !m.cashIn && !m.cashOut)} height={300}>
          <AreaChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="month" tick={chartAxis} axisLine={false} />
            <YAxis tick={chartAxis} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
            <ReTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtFull(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="cashIn"  stroke="#22c55e" fill="#22c55e33" name="Tahsilat" />
            <Area type="monotone" dataKey="cashOut" stroke="#ef4444" fill="#ef444433" name="Ödeme" />
            <Area type="monotone" dataKey="net"     stroke="#FF6B2B" fill="#FF6B2B33" name="Net Akış" />
          </AreaChart>
        </ChartFrame>
      </SectionCard>

      <SectionCard title="Aylık Akış Tablosu">
        <ResponsiveTable
          rows={monthly}
          rowKey={(r) => r.month}
          empty={<EmptyBlock label="Nakit hareketi yok." />}
          columns={[
            { key: "month",   header: "Ay",       primary: true, cell: (r) => <span className="font-medium">{r.month}</span> },
            { key: "cashIn",  header: "Tahsilat", align: "right", cell: (r) => <Money v={r.cashIn} tone="green" /> },
            { key: "cashOut", header: "Ödeme",    align: "right", cell: (r) => <Money v={r.cashOut} tone="red" /> },
            { key: "net",     header: "Net",      align: "right", cell: (r) => <Money v={r.net} tone={r.net >= 0 ? "green" : "red"} /> },
          ] as ResponsiveColumn<any>[]}
        />
      </SectionCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB — Project Profitability
function ProjectProfitTab() {
  const { projects } = useProjects();
  const { expenses } = useProjectExpenses();
  const { allHakedis } = useMonthlyTotals();

  const perProject = useMemo(() => {
    return projects.map((p) => {
      const hk = allHakedis.filter((h: any) => h.project_id === p.id).reduce((s: number, h: any) => s + Number(h.net || 0), 0);
      const ex = expenses.filter((e) => e.project_id === p.id).reduce((s, e) => s + Number(e.amount), 0);
      const kar = hk - ex;
      return { id: p.id, name: p.name, hakedis: hk, gider: ex, kar, marj: hk > 0 ? (kar / hk) * 100 : 0 };
    }).sort((a, b) => b.kar - a.kar);
  }, [projects, allHakedis, expenses]);

  const totalHk = perProject.reduce((s, p) => s + p.hakedis, 0);
  const totalEx = perProject.reduce((s, p) => s + p.gider, 0);
  const totalKr = totalHk - totalEx;
  const bestMargin = perProject.length ? Math.max(...perProject.map((p) => p.marj)) : 0;

  return (
    <div className="space-y-4">
      <ResponsiveGrid variant="kpi">
        <KpiCard label="Aktif Proje"    value={projects.length} hint="Toplam"        icon={Building2}   accent="#3b82f6" />
        <KpiCard label="Toplam Hakediş" value={fmtShort(totalHk)} hint="Tüm projeler" icon={TrendingUp}  accent="#22c55e" />
        <KpiCard label="Toplam Gider"   value={fmtShort(totalEx)} hint="Tüm projeler" icon={TrendingDown} accent="#ef4444" />
        <KpiCard label="En Yüksek Marj" value={`%${bestMargin.toFixed(1)}`} hint={perProject[0]?.name ?? "—"} icon={LineIcon} accent="#FF6B2B" />
      </ResponsiveGrid>

      <SectionCard title="Proje Bazlı Kâr Sıralaması">
        <ChartFrame empty={perProject.length === 0} height={300}>
          <BarChart data={perProject.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis type="number" tick={chartAxis} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
            <YAxis type="category" dataKey="name" tick={chartAxis} axisLine={false} width={110} />
            <ReTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtFull(v)} />
            <Bar dataKey="kar" name="Net Kâr" radius={[0,6,6,0]}>
              {perProject.slice(0, 8).map((p, i) => (
                <Cell key={i} fill={p.kar >= 0 ? "#22c55e" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ChartFrame>
      </SectionCard>

      <SectionCard title="Proje Kâr / Zarar Detayı">
        <ResponsiveTable
          rows={perProject}
          rowKey={(r) => r.id}
          empty={<EmptyBlock label="Henüz proje yok." />}
          columns={[
            { key: "name",    header: "Proje",   primary: true, cell: (r) => <span className="font-medium truncate">{r.name}</span> },
            { key: "hakedis", header: "Hakediş", align: "right", cell: (r) => <Money v={r.hakedis} tone="blue" /> },
            { key: "gider",   header: "Gider",   align: "right", cell: (r) => <Money v={r.gider} tone="red" /> },
            { key: "kar",     header: "Net Kâr", align: "right", cell: (r) => <Money v={r.kar} tone={r.kar >= 0 ? "green" : "red"} /> },
            { key: "marj",    header: "Marj",    align: "right", cell: (r) => (
              <span className={`inline-flex px-2 py-0.5 rounded-full text-fs-xs font-semibold ${r.kar >= 0 ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}`}>
                %{r.marj.toFixed(1)}
              </span>
            )},
          ] as ResponsiveColumn<any>[]}
        />
      </SectionCard>

      <p className="text-fs-xs text-muted-foreground/70">
        Toplam net: <span className={totalKr >= 0 ? "text-emerald-500" : "text-destructive"}>{fmtFull(totalKr)}</span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB — Personnel Cost
function PersonnelCostTab() {
  const { personnel = [] } = usePersonnel() as { personnel: any[] };

  const rows = useMemo(() => {
    return (personnel || []).map((p) => {
      const type = p.employment_type as string;
      const monthlyCost =
        type === "daily_wage" ? Number(p.daily_wage || 0) * 26 :
        type === "monthly_salary" ? Number(p.monthly_salary || 0) :
        Number(p.daily_wage || 0) * 26; // subcontractor crew rough
      const label =
        type === "daily_wage" ? "Yevmiyeli" :
        type === "monthly_salary" ? "Maktu Aylık" :
        "Taşeron Ekibi";
      return { id: p.id, name: p.full_name || p.name || "—", role: p.role || "—", type: label, monthly: monthlyCost };
    }).sort((a, b) => b.monthly - a.monthly);
  }, [personnel]);

  const monthlyTotal = rows.reduce((s, r) => s + r.monthly, 0);
  const dailyTotal = monthlyTotal / 26;
  const avgSalary = rows.length ? monthlyTotal / rows.length : 0;

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.type, (map.get(r.type) || 0) + r.monthly);
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [rows]);

  const pieColors = ["#3b82f6", "#FF6B2B", "#22c55e", "#a855f7"];

  return (
    <div className="space-y-4">
      <ResponsiveGrid variant="kpi">
        <KpiCard label="Toplam Personel"  value={rows.length}                icon={Users}       accent="#3b82f6" />
        <KpiCard label="Aylık Maliyet"    value={fmtShort(monthlyTotal)} hint="Tahmini brüt" icon={DollarSign} accent="#ef4444" />
        <KpiCard label="Günlük Ort."      value={fmtShort(dailyTotal)}   hint="~26 iş günü"  icon={Activity}    accent="#f59e0b" />
        <KpiCard label="Kişi Başı Ort."   value={fmtShort(avgSalary)}    hint="Aylık"        icon={Wallet}      accent="#22c55e" />
      </ResponsiveGrid>

      <ResponsiveGrid variant="section">
        <SectionCard title="Personel Tipine Göre Maliyet">
          <ChartFrame empty={byType.length === 0} height={260}>
            <PieChart>
              <Pie data={byType} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {byType.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtFull(v)} />
            </PieChart>
          </ChartFrame>
        </SectionCard>

        <SectionCard title="En Yüksek Maliyetli Personel">
          <ChartFrame empty={rows.length === 0} height={260}>
            <BarChart data={rows.slice(0, 6)} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis type="number" tick={chartAxis} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
              <YAxis type="category" dataKey="name" tick={chartAxis} axisLine={false} width={100} />
              <ReTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtFull(v)} />
              <Bar dataKey="monthly" fill="#FF6B2B" radius={[0,6,6,0]} name="Aylık" />
            </BarChart>
          </ChartFrame>
        </SectionCard>
      </ResponsiveGrid>

      <SectionCard title="Personel Detay Tablosu">
        <ResponsiveTable
          rows={rows}
          rowKey={(r) => r.id}
          empty={<EmptyBlock label="Personel kaydı yok." />}
          columns={[
            { key: "name",    header: "Ad Soyad",  primary: true, cell: (r) => <span className="font-medium truncate">{r.name}</span> },
            { key: "role",    header: "Görev",     cell: (r) => <span className="text-muted-foreground">{r.role}</span> },
            { key: "type",    header: "Tip",       cell: (r) => <Chip>{r.type}</Chip> },
            { key: "monthly", header: "Aylık Maliyet", align: "right", cell: (r) => <Money v={r.monthly} tone="red" /> },
          ] as ResponsiveColumn<any>[]}
        />
      </SectionCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB — Purchasing Analytics
function PurchasingTab() {
  const { user } = useUser();
  const { data: entries = [] } = useQuery({
    queryKey: ["reports_material_entries"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("material_entries").select("id,supplier,total_amount,entry_date,quantity,material_id").order("entry_date", { ascending: false });
      return data || [];
    },
  });
  const { data: materials = [] } = useQuery({
    queryKey: ["reports_materials_list"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("materials").select("id,name,unit");
      return data || [];
    },
  });
  const matById = useMemo(() => Object.fromEntries((materials as any[]).map((m) => [m.id, m])), [materials]);

  const total = (entries as any[]).reduce((s, e) => s + Number(e.total_amount || 0), 0);
  const monthlyTotal = (entries as any[])
    .filter((e) => { const d = new Date(e.entry_date); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((s, e) => s + Number(e.total_amount || 0), 0);

  const bySupplier = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries as any[]) {
      const k = e.supplier || "Diğer";
      map.set(k, (map.get(k) || 0) + Number(e.total_amount || 0));
    }
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [entries]);

  const monthlySeries = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries as any[]) {
      const d = new Date(e.entry_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + Number(e.total_amount || 0));
    }
    return Array.from(map, ([month, value]) => ({ month: month.slice(2), value })).sort((a, b) => a.month.localeCompare(b.month));
  }, [entries]);

  return (
    <div className="space-y-4">
      <ResponsiveGrid variant="kpi">
        <KpiCard label="Toplam Satın Alma" value={fmtShort(total)}        icon={ShoppingCart} accent="#3b82f6" />
        <KpiCard label="Bu Ay"             value={fmtShort(monthlyTotal)} hint="Aylık"        icon={TrendingUp} accent="#22c55e" />
        <KpiCard label="Aktif Tedarikçi"   value={bySupplier.length}      hint="Toplam"       icon={Users}      accent="#FF6B2B" />
        <KpiCard label="İşlem Sayısı"      value={(entries as any[]).length} hint="Toplam giriş" icon={Activity} accent="#a855f7" />
      </ResponsiveGrid>

      <ResponsiveGrid variant="section">
        <SectionCard title="En Büyük Tedarikçiler">
          <ChartFrame empty={bySupplier.length === 0} height={260}>
            <BarChart data={bySupplier.slice(0, 6)} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis type="number" tick={chartAxis} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
              <YAxis type="category" dataKey="name" tick={chartAxis} axisLine={false} width={110} />
              <ReTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtFull(v)} />
              <Bar dataKey="value" fill="#FF6B2B" radius={[0,6,6,0]} name="Alım" />
            </BarChart>
          </ChartFrame>
        </SectionCard>

        <SectionCard title="Aylık Satın Alma Trendi">
          <ChartFrame empty={monthlySeries.length === 0} height={260}>
            <AreaChart data={monthlySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="month" tick={chartAxis} axisLine={false} />
              <YAxis tick={chartAxis} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
              <ReTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtFull(v)} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f633" name="Aylık" />
            </AreaChart>
          </ChartFrame>
        </SectionCard>
      </ResponsiveGrid>

      <SectionCard title="Son Satın Almalar" subtitle={`${(entries as any[]).length} kayıt`}>
        <ResponsiveTable
          rows={(entries as any[]).slice(0, 20)}
          rowKey={(r) => r.id}
          empty={<EmptyBlock label="Henüz satın alma kaydı yok." />}
          columns={[
            { key: "material", header: "Malzeme", primary: true, cell: (r) => (
              <span className="font-medium truncate">{(matById as any)[r.material_id]?.name ?? "Bilinmiyor"}</span>
            )},
            { key: "supplier", header: "Tedarikçi", cell: (r) => <span className="text-muted-foreground">{r.supplier || "—"}</span> },
            { key: "qty",      header: "Miktar",   align: "right", cell: (r) => <span className="tabular-nums">{Number(r.quantity).toLocaleString("tr-TR")} {(matById as any)[r.material_id]?.unit ?? ""}</span> },
            { key: "date",     header: "Tarih",    cell: (r) => <span className="text-muted-foreground text-fs-xs">{new Date(r.entry_date).toLocaleDateString("tr-TR")}</span> },
            { key: "total",    header: "Tutar",    align: "right", cell: (r) => <Money v={Number(r.total_amount || 0)} tone="blue" /> },
          ] as ResponsiveColumn<any>[]}
        />
      </SectionCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB — Warehouse Analytics
function WarehouseTab() {
  const { user } = useUser();
  const { data: materials = [] } = useQuery({
    queryKey: ["reports_wh_materials"],
    enabled: !!user,
    queryFn: async () => (await supabase.from("materials").select("id,name,unit,min_stock,project_id")).data || [],
  });
  const { data: entries = [] } = useQuery({
    queryKey: ["reports_wh_entries"],
    enabled: !!user,
    queryFn: async () => (await supabase.from("material_entries").select("material_id,quantity,total_amount,entry_date")).data || [],
  });
  const { data: exits = [] } = useQuery({
    queryKey: ["reports_wh_exits"],
    enabled: !!user,
    queryFn: async () => (await supabase.from("material_exits").select("material_id,quantity,exit_date")).data || [],
  });

  const rows = useMemo(() => {
    return (materials as any[]).map((m) => {
      const entered = (entries as any[]).filter((e) => e.material_id === m.id).reduce((s, e) => s + Number(e.quantity || 0), 0);
      const exited  = (exits as any[]).filter((e) => e.material_id === m.id).reduce((s, e) => s + Number(e.quantity || 0), 0);
      const stock = entered - exited;
      const value = (entries as any[]).filter((e) => e.material_id === m.id).reduce((s, e) => s + Number(e.total_amount || 0), 0);
      const critical = Number(m.min_stock || 0) > 0 && stock < Number(m.min_stock);
      return { id: m.id, name: m.name, unit: m.unit, stock, entered, exited, value, min_stock: Number(m.min_stock || 0), critical };
    }).sort((a, b) => Number(b.critical) - Number(a.critical) || b.value - a.value);
  }, [materials, entries, exits]);

  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const criticalCount = rows.filter((r) => r.critical).length;
  const totalIn = (entries as any[]).reduce((s, e) => s + Number(e.quantity || 0), 0);
  const totalOut = (exits as any[]).reduce((s, e) => s + Number(e.quantity || 0), 0);

  return (
    <div className="space-y-4">
      <ResponsiveGrid variant="kpi">
        <KpiCard label="Malzeme Türü"    value={rows.length}                icon={PackageSearch} accent="#3b82f6" />
        <KpiCard label="Toplam Değer"    value={fmtShort(totalValue)}       icon={DollarSign}    accent="#22c55e" />
        <KpiCard label="Kritik Stok"     value={criticalCount} hint="Min. altında" icon={TrendingDown} accent={criticalCount > 0 ? "#ef4444" : "#64748b"} />
        <KpiCard label="Hareket (Miktar)" value={`${totalIn.toLocaleString("tr-TR")} / ${totalOut.toLocaleString("tr-TR")}`} hint="Giriş / Çıkış" icon={Activity} accent="#FF6B2B" />
      </ResponsiveGrid>

      <SectionCard title="En Değerli Stoklar">
        <ChartFrame empty={rows.length === 0} height={280}>
          <BarChart data={rows.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis type="number" tick={chartAxis} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
            <YAxis type="category" dataKey="name" tick={chartAxis} axisLine={false} width={120} />
            <ReTooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtFull(v)} />
            <Bar dataKey="value" fill="#22c55e" radius={[0,6,6,0]} name="Stok Değeri" />
          </BarChart>
        </ChartFrame>
      </SectionCard>

      <SectionCard title="Depo Envanteri">
        <ResponsiveTable
          rows={rows}
          rowKey={(r) => r.id}
          empty={<EmptyBlock label="Malzeme tanımlı değil." />}
          columns={[
            { key: "name",    header: "Malzeme",  primary: true, cell: (r) => (
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">{r.name}</span>
                {r.critical && <span className="text-fs-xs px-1.5 py-0.5 rounded bg-red-500/15 text-red-500">Kritik</span>}
              </div>
            )},
            { key: "stock",   header: "Stok",     align: "right", cell: (r) => <span className={`tabular-nums font-medium ${r.critical ? "text-red-500" : "text-foreground"}`}>{r.stock.toLocaleString("tr-TR")} {r.unit}</span> },
            { key: "min",     header: "Min",      align: "right", cell: (r) => <span className="tabular-nums text-muted-foreground">{r.min_stock ? `${r.min_stock} ${r.unit}` : "—"}</span> },
            { key: "in",      header: "Giren",    align: "right", cell: (r) => <span className="tabular-nums text-emerald-500">{r.entered.toLocaleString("tr-TR")}</span> },
            { key: "out",     header: "Çıkan",    align: "right", cell: (r) => <span className="tabular-nums text-red-500">{r.exited.toLocaleString("tr-TR")}</span> },
            { key: "value",   header: "Değer",    align: "right", cell: (r) => <Money v={r.value} tone="blue" /> },
          ] as ResponsiveColumn<any>[]}
        />
      </SectionCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TAB — Decisions history
function DecisionsTab() {
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [pinned, setPinned] = useState<PinnedItem[]>([]);

  useEffect(() => {
    const load = () => { setRecent(getRecent()); setPinned(getPinned()); };
    load();
    window.addEventListener("santiyem-recent-changed", load);
    window.addEventListener("santiyem-pinned-changed", load);
    return () => {
      window.removeEventListener("santiyem-recent-changed", load);
      window.removeEventListener("santiyem-pinned-changed", load);
    };
  }, []);

  const fmtTs = (ts: number) =>
    new Date(ts).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const recentCols: ResponsiveColumn<RecentItem>[] = [
    { key: "label", header: "Kayıt", primary: true, cell: (r) => (
      <div className="min-w-0">
        <div className="font-medium truncate">{r.label}</div>
        {r.sub && <div className="text-fs-xs text-muted-foreground truncate">{r.sub}</div>}
      </div>
    )},
    { key: "kind", header: "Tip", cell: (r) => <Chip>{r.kind}</Chip> },
    { key: "ts",   header: "Zaman", align: "right", cell: (r) => <span className="text-muted-foreground text-fs-xs">{fmtTs(r.ts)}</span> },
  ];

  return (
    <ResponsiveGrid variant="section">
      <SectionCard
        title="Son Erişilen Kayıtlar"
        subtitle={`${recent.length} kayıt`}
        action={<History className="w-4 h-4 text-primary" />}
      >
        <ResponsiveTable
          rows={recent}
          rowKey={(r) => `${r.kind}-${r.id}-${r.ts}`}
          columns={recentCols}
          empty={<EmptyBlock label="Henüz erişim geçmişi yok. Dashboard veya arama üzerinden bir kayıt açtığınızda burada görünecek." />}
        />
      </SectionCard>

      <SectionCard
        title="Sabitlenmiş Kararlar"
        subtitle={`${pinned.length} kayıt`}
        action={<BarChart3 className="w-4 h-4 text-primary" />}
      >
        <ResponsiveTable
          rows={pinned}
          rowKey={(r) => `${r.kind}-${r.id}`}
          columns={recentCols as unknown as ResponsiveColumn<PinnedItem>[]}
          empty={<EmptyBlock label="Sabitlenmiş kayıt yok. Önemli proje ya da belgeleri sabitleyerek burada takip edebilirsiniz." />}
        />
      </SectionCard>
    </ResponsiveGrid>
  );
}

// ─────────────────────────────────────────────────────────
// UI atoms
function ChartFrame({
  children, empty, height,
}: { children: React.ReactElement; empty?: boolean; height: number }) {
  if (empty) return <EmptyBlock label="Bu rapor için henüz yeterli veri yok." />;
  return (
    <div className="w-full min-w-0 -mx-1">
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/50">
        <Inbox className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-fs-sm text-muted-foreground max-w-sm">{label}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-fs-xs bg-muted text-muted-foreground uppercase tracking-wide">
      {children}
    </span>
  );
}

function Money({ v, tone }: { v: number; tone?: "blue" | "green" | "red" | "default" }) {
  const cls =
    tone === "green" ? "text-emerald-500" :
    tone === "red"   ? "text-red-500" :
    tone === "blue"  ? "text-blue-500" :
    "text-foreground";
  return <span className={`font-mono tabular-nums font-medium ${cls}`}>{fmtFull(v)}</span>;
}
