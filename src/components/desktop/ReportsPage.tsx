import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProjects } from "@/hooks/useProjects";
import { useProjectExpenses } from "@/hooks/useProjectExpenses";
import { useCashPayments } from "@/hooks/useCashPayments";
import { useCashCollections } from "@/hooks/useCashCollections";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  AreaChart, Area, Legend, CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Wallet, History, BarChart3, Activity, Inbox } from "lucide-react";
import { getRecent, getPinned, RecentItem, PinnedItem } from "@/lib/workspaceStore";
import { formatCurrencyShort as fmtShort, formatCurrencyFull as fmtFull } from "@/lib/formatCurrency";

type Tab = "pnl" | "cashflow" | "decisions";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "pnl", label: "Kâr / Zarar", icon: BarChart3 },
  { id: "cashflow", label: "Nakit Akışı", icon: Activity },
  { id: "decisions", label: "Karar Geçmişi", icon: History },
];

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const ReportsPage = () => {
  const { user } = useUser();
  const { projects } = useProjects();
  const { expenses } = useProjectExpenses();
  const { payments } = useCashPayments();
  const { collections } = useCashCollections();
  const [tab, setTab] = useState<Tab>("pnl");

  const { data: allHakedis = [] } = useQuery({
    queryKey: ["reports_all_hakedis"],
    queryFn: async () => {
      const { data } = await supabase.from("project_hakedis").select("*");
      return data || [];
    },
    enabled: !!user,
  });

  const now = new Date();
  const year = now.getFullYear();

  const monthly = useMemo(() => {
    return MONTHS.slice(0, now.getMonth() + 1).map((m, i) => {
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
  }, [allHakedis, expenses, payments, collections, year, now]);

  const totals = useMemo(() => {
    const ciro = monthly.reduce((s, m) => s + m.gelir, 0);
    const gider = monthly.reduce((s, m) => s + m.gider, 0);
    const cashIn = monthly.reduce((s, m) => s + m.cashIn, 0);
    const cashOut = monthly.reduce((s, m) => s + m.cashOut, 0);
    return { ciro, gider, kar: ciro - gider, marj: ciro > 0 ? ((ciro - gider) / ciro) * 100 : 0, cashIn, cashOut, net: cashIn - cashOut };
  }, [monthly]);

  const perProject = useMemo(() => {
    return projects.map(p => {
      const hk = allHakedis.filter((h: any) => h.project_id === p.id).reduce((s: number, h: any) => s + Number(h.net || 0), 0);
      const ex = expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + Number(e.amount), 0);
      const kar = hk - ex;
      return { id: p.id, name: p.name, hakedis: hk, gider: ex, kar, marj: hk > 0 ? (kar / hk) * 100 : 0 };
    }).sort((a, b) => b.kar - a.kar);
  }, [projects, allHakedis, expenses]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap border-b border-border pb-3">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
              style={{
                backgroundColor: active ? "rgba(255,107,43,0.12)" : "transparent",
                color: active ? "#FF6B2B" : "hsl(var(--muted-foreground))",
                border: active ? "1px solid rgba(255,107,43,0.35)" : "1px solid transparent",
              }}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "pnl" && <PnLTab totals={totals} monthly={monthly} perProject={perProject} />}
      {tab === "cashflow" && <CashFlowTab totals={totals} monthly={monthly} />}
      {tab === "decisions" && <DecisionsTab />}
    </div>
  );
};

const KpiCard = ({ label, value, sub, color, icon: Icon }: any) => (
  <div className="rounded-xl p-4 bg-card border border-border">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4" style={{ color }} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <p className="text-xl font-bold" style={{ color }}>{fmtFull(value)}</p>
    {sub && <p className="text-[11px] mt-1 text-muted-foreground">{sub}</p>}
  </div>
);

const PnLTab = ({ totals, monthly, perProject }: any) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label="Toplam Ciro" value={totals.ciro} color="#3B82F6" sub="Yılbaşından bu yana hakediş geliri" icon={TrendingUp} />
      <KpiCard label="Toplam Gider" value={totals.gider} color="#EF4444" sub="Tüm proje harcamaları" icon={TrendingDown} />
      <KpiCard label="Net Kâr" value={totals.kar} color={totals.kar >= 0 ? "#22C55E" : "#EF4444"} sub={`Kâr marjı: %${totals.marj.toFixed(1)}`} icon={DollarSign} />
      <KpiCard label="Ort. Aylık Kâr" value={totals.kar / Math.max(monthly.length, 1)} color="#FF6B2B" sub={`${monthly.length} ay ortalaması`} icon={Wallet} />
    </div>

    <div className="rounded-xl p-4 bg-card border border-border">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Gelir — Gider — Net Kâr</h3>
      {monthly.every((m: any) => !m.gelir && !m.gider) ? (
        <EmptyBlock label="Henüz gelir veya gider verisi yok" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2732" />
            <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} />
            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
            <ReTooltip contentStyle={{ backgroundColor: "#1E2732", border: "none", borderRadius: 8 }} formatter={(v: number) => fmtFull(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="gelir" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Hakediş Geliri" />
            <Bar dataKey="gider" fill="#EF4444" radius={[4, 4, 0, 0]} name="Gider" />
            <Bar dataKey="kar" fill="#22C55E" radius={[4, 4, 0, 0]} name="Net Kâr" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>

    <div className="rounded-xl overflow-hidden bg-card border border-border">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Proje Bazlı Kâr / Zarar</h3>
      </div>
      {perProject.length === 0 ? (
        <EmptyBlock label="Henüz proje yok" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid #1E2732" }}>
                {["Proje", "Hakediş", "Gider", "Net Kâr", "Kâr %"].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perProject.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #1E2732" }}>
                  <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-3" style={{ color: "#3B82F6" }}>{fmtFull(p.hakedis)}</td>
                  <td className="px-4 py-3" style={{ color: "#EF4444" }}>{fmtFull(p.gider)}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: p.kar >= 0 ? "#22C55E" : "#EF4444" }}>{fmtFull(p.kar)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: (p.kar >= 0 ? "#22C55E" : "#EF4444") + "20",
                        color: p.kar >= 0 ? "#22C55E" : "#EF4444",
                      }}>
                      {p.marj.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);

const CashFlowTab = ({ totals, monthly }: any) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label="Tahsilat" value={totals.cashIn} color="#22C55E" sub="Yıl toplamı" icon={TrendingUp} />
      <KpiCard label="Ödeme" value={totals.cashOut} color="#EF4444" sub="Yıl toplamı" icon={TrendingDown} />
      <KpiCard label="Net Nakit Akışı" value={totals.net} color={totals.net >= 0 ? "#22C55E" : "#EF4444"} sub="Tahsilat − Ödeme" icon={Wallet} />
      <KpiCard label="Ort. Aylık Akış" value={totals.net / Math.max(monthly.length, 1)} color="#FF6B2B" sub={`${monthly.length} ay ortalaması`} icon={Activity} />
    </div>

    <div className="rounded-xl p-4 bg-card border border-border">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Aylık Nakit Akışı</h3>
      {monthly.every((m: any) => !m.cashIn && !m.cashOut) ? (
        <EmptyBlock label="Henüz nakit hareketi yok" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2732" />
            <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} />
            <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
            <ReTooltip contentStyle={{ backgroundColor: "#1E2732", border: "none", borderRadius: 8 }} formatter={(v: number) => fmtFull(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="cashIn" stroke="#22C55E" fill="#22C55E33" name="Tahsilat" />
            <Area type="monotone" dataKey="cashOut" stroke="#EF4444" fill="#EF444433" name="Ödeme" />
            <Area type="monotone" dataKey="net" stroke="#FF6B2B" fill="#FF6B2B33" name="Net Akış" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  </div>
);

const DecisionsTab = () => {
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

  const fmtTs = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <History className="w-4 h-4 text-[#FF6B2B]" />
            <h3 className="text-sm font-semibold text-foreground">Son Erişilen Kayıtlar</h3>
            <span className="ml-auto text-[11px] text-muted-foreground">{recent.length}</span>
          </div>
          {recent.length === 0 ? (
            <EmptyBlock label="Henüz erişim geçmişi yok. Dashboard veya arama üzerinden bir kayıt açtığınızda burada görünecek." />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map(r => (
                <li key={`${r.kind}-${r.id}-${r.ts}`} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded" style={{ backgroundColor: "#1E2732", color: "#94A3B8" }}>{r.kind}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate text-foreground">{r.label}</p>
                    {r.sub && <p className="text-[11px] truncate text-muted-foreground">{r.sub}</p>}
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{fmtTs(r.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#FF6B2B]" />
            <h3 className="text-sm font-semibold text-foreground">Sabitlenmiş Kararlar</h3>
            <span className="ml-auto text-[11px] text-muted-foreground">{pinned.length}</span>
          </div>
          {pinned.length === 0 ? (
            <EmptyBlock label="Sabitlenmiş kayıt yok. Önemli proje ya da belgeleri sabitleyerek burada takip edebilirsiniz." />
          ) : (
            <ul className="divide-y divide-border">
              {pinned.map(p => (
                <li key={`${p.kind}-${p.id}`} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(255,107,43,0.15)", color: "#FF6B2B" }}>{p.kind}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate text-foreground">{p.label}</p>
                    {p.sub && <p className="text-[11px] truncate text-muted-foreground">{p.sub}</p>}
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{fmtTs(p.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyBlock = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(148,163,184,0.08)" }}>
      <Inbox className="w-5 h-5 text-muted-foreground" />
    </div>
    <p className="text-[13px] text-muted-foreground max-w-sm">{label}</p>
  </div>
);

export default ReportsPage;
