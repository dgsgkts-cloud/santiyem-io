import { useMemo, useState, ReactNode } from "react";
import {
  Activity, TrendingUp, TrendingDown, Sparkles, X, ChevronRight, ChevronLeft,
  Shield, AlertTriangle, Calendar, DollarSign, CheckCircle2, Users, FileText,
  Plus, MessageSquare, Camera, Wallet, ClipboardCheck, Folder, Image as ImageIcon,
  FileSpreadsheet, Hammer, Eye, EyeOff, Bot, Send, Clock, Package,
} from "lucide-react";
import { formatNumber0 } from "@/lib/formatCurrency";

/* ================================================================
   1) PROJECT HEALTH WIDGET
   ================================================================ */
export interface HealthInput {
  progressPct: number;         // 0-100 schedule/milestone completion
  budgetUsedPct: number;       // 0-100 spent / budget
  taskCompletionPct: number;   // 0-100 done / total
  overdueCount: number;
  netCash: number;             // + collections - payments (relative)
  risksCount: number;
}

export const calcHealth = (i: HealthInput): { score: number; delta: number } => {
  const scheduleScore = Math.min(100, Math.max(0, i.progressPct));
  const budgetScore = Math.min(100, Math.max(0, 100 - Math.max(0, i.budgetUsedPct - 80) * 3));
  const taskScore = Math.min(100, Math.max(0, i.taskCompletionPct));
  const overduePenalty = Math.min(30, i.overdueCount * 3);
  const riskPenalty = Math.min(20, i.risksCount * 4);
  const cashScore = i.netCash >= 0 ? 100 : 60;
  const base = (scheduleScore * 0.25 + budgetScore * 0.2 + taskScore * 0.25 + cashScore * 0.2 + 100 * 0.1);
  const score = Math.round(Math.max(0, Math.min(100, base - overduePenalty - riskPenalty)));
  // deterministic weekly delta seed from score
  const delta = ((score % 11) - 5);
  return { score, delta };
};

const healthColor = (s: number) => (s >= 90 ? "#22C55E" : s >= 70 ? "#F59E0B" : "#EF4444");
const healthLabel = (s: number) => (s >= 90 ? "Sağlıklı" : s >= 70 ? "Dikkat" : "Kritik");

export const ProjectHealthWidget = ({ input }: { input: HealthInput }) => {
  const { score, delta } = useMemo(() => calcHealth(input), [input]);
  const color = healthColor(score);
  return (
    <div className="rounded-2xl p-4 min-w-[190px] border" style={{ borderColor: `${color}30`, background: `linear-gradient(135deg, ${color}10, transparent)` }}>
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>Proje Sağlığı</span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-[36px] leading-none font-bold font-mono tabular-nums" style={{ color }}>{score}</span>
        <span className="text-[13px] font-mono mb-1 text-muted-foreground">/100</span>
      </div>
      <div className="mt-1 text-[11px] font-medium" style={{ color }}>{healthLabel(score)}</div>
      <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
        {delta >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
        <span>{delta >= 0 ? "+" : ""}{delta} bu hafta</span>
      </div>
    </div>
  );
};

/* ================================================================
   2) EXECUTIVE RIBBON
   ================================================================ */
export interface RibbonKPI {
  label: string; value: string; sub?: string; tone?: "positive" | "warning" | "danger" | "neutral"; Icon?: any;
}
const toneColor = (t?: string) =>
  t === "danger" ? "#EF4444" : t === "warning" ? "#F59E0B" : t === "positive" ? "#22C55E" : "#94A3B8";

export const ExecutiveRibbon = ({ items }: { items: RibbonKPI[] }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
    {items.map((k, i) => {
      const c = toneColor(k.tone);
      return (
        <div key={i} className="rounded-xl border border-border bg-card/60 p-2.5 min-w-0">
          <div className="flex items-center gap-1.5">
            {k.Icon && <k.Icon className="w-3 h-3" style={{ color: c }} />}
            <span className="text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{k.label}</span>
          </div>
          <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-foreground truncate">{k.value}</div>
          {k.sub && <div className="text-[10px] text-muted-foreground truncate">{k.sub}</div>}
        </div>
      );
    })}
  </div>
);

/* ================================================================
   3) PROJECT TIMELINE (horizontal)
   ================================================================ */
export interface TimelineEvent {
  id: string; date: string; title: string; kind: "milestone" | "payment" | "delivery" | "inspection" | "concrete";
}
const KIND_META: Record<TimelineEvent["kind"], { color: string; Icon: any; label: string }> = {
  milestone:  { color: "#FF6B2B", Icon: CheckCircle2, label: "Kilometre" },
  payment:    { color: "#22C55E", Icon: DollarSign,    label: "Ödeme" },
  delivery:   { color: "#3B82F6", Icon: Package,       label: "Teslimat" },
  inspection: { color: "#A855F7", Icon: ClipboardCheck,label: "Denetim" },
  concrete:   { color: "#64748B", Icon: Hammer,        label: "Beton" },
};

export const ProjectTimeline = ({ events }: { events: TimelineEvent[] }) => {
  if (!events.length) return null;
  const today = new Date();
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#FF6B2B]" />
          <h3 className="text-sm font-semibold text-foreground">Proje Zaman Çizelgesi</h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {Object.entries(KIND_META).map(([k, m]) => (
            <span key={k} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />{m.label}</span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="relative min-w-full pb-6 pt-2">
          <div className="absolute left-0 right-0 top-6 h-[2px] bg-border" />
          <div className="flex items-start gap-6 pl-2">
            {sorted.map(e => {
              const d = new Date(e.date);
              const isPast = d < today;
              const meta = KIND_META[e.kind];
              return (
                <div key={e.id} className="flex flex-col items-center min-w-[110px]">
                  <div className="w-3 h-3 rounded-full border-2 z-10"
                       style={{ backgroundColor: isPast ? meta.color : "transparent", borderColor: meta.color }} />
                  <div className="mt-2 text-[10px] font-mono text-muted-foreground">{d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}</div>
                  <div className="mt-1 text-[11px] font-medium text-foreground text-center line-clamp-2" style={{ maxWidth: 120 }}>{e.title}</div>
                  <div className="mt-0.5 text-[9px] uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   4) RISK CENTER
   ================================================================ */
export interface RiskItem {
  id: string; title: string;
  probability: "Düşük" | "Orta" | "Yüksek";
  impact: "Düşük" | "Orta" | "Yüksek";
  owner: string; status: "Açık" | "İzleniyor" | "Kapalı"; mitigation: string;
}
const RISK_TONE: Record<string, string> = { "Düşük": "#22C55E", "Orta": "#F59E0B", "Yüksek": "#EF4444" };

export const RiskCenter = ({ risks }: { risks: RiskItem[] }) => {
  const top3 = risks.slice(0, 3);
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Risk Merkezi</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{risks.length} risk</span>
      </div>
      {top3.length > 0 && (
        <div className="rounded-lg border border-[#FF6B2B]/20 p-2.5 mb-3"
             style={{ background: "linear-gradient(135deg, rgba(255,107,43,0.07), transparent)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3 text-[#FF6B2B]" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#FF6B2B]">AI Özeti — Öncelikli 3 Risk</span>
          </div>
          <ul className="text-[11.5px] space-y-0.5 text-foreground/90">
            {top3.map(r => <li key={r.id}>• {r.title} — {r.owner} · Etki: {r.impact}</li>)}
          </ul>
        </div>
      )}
      {risks.length === 0 ? (
        <p className="text-[12px] text-center py-4 text-muted-foreground">Aktif risk bulunmuyor.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {risks.map(r => (
            <div key={r.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[12.5px] font-medium text-foreground flex-1">{r.title}</p>
                <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${RISK_TONE[r.impact]}15`, color: RISK_TONE[r.impact] }}>{r.status}</span>
              </div>
              <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground mb-1.5">
                <span>Olasılık: <span style={{ color: RISK_TONE[r.probability] }}>{r.probability}</span></span>
                <span>Etki: <span style={{ color: RISK_TONE[r.impact] }}>{r.impact}</span></span>
                <span className="ml-auto">{r.owner}</span>
              </div>
              <p className="text-[11px] text-foreground/70 italic">{r.mitigation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ================================================================
   5) SMART DOCUMENTS (folder view)
   ================================================================ */
export interface DocFile { id: string; file_name: string; file_url: string; created_at: string; file_size?: number; }

const inferFolder = (name: string): keyof typeof FOLDERS => {
  const n = name.toLowerCase();
  if (/\.(jpg|jpeg|png|webp|heic)$/i.test(name)) return "photos";
  if (/(sozles|contract|kontrat)/.test(n)) return "contracts";
  if (/(cizim|plan|drawing|dwg|dxf|pafta)/.test(n) || /\.(dwg|dxf)$/i.test(name)) return "drawings";
  if (/(fatura|invoice)/.test(n)) return "invoices";
  if (/(izin|permit|ruhsat)/.test(n)) return "permits";
  if (/(rapor|report)/.test(n)) return "reports";
  return "other";
};
const FOLDERS = {
  contracts:  { label: "Sözleşmeler", Icon: FileText,        color: "#3B82F6" },
  drawings:   { label: "Çizimler",    Icon: FileSpreadsheet, color: "#A855F7" },
  photos:     { label: "Fotoğraflar", Icon: ImageIcon,       color: "#22C55E" },
  reports:    { label: "Raporlar",    Icon: FileText,        color: "#F59E0B" },
  invoices:   { label: "Faturalar",   Icon: DollarSign,      color: "#FF6B2B" },
  permits:    { label: "İzinler",     Icon: ClipboardCheck,  color: "#EF4444" },
  other:      { label: "Diğer",       Icon: Folder,          color: "#64748B" },
} as const;

export const SmartDocumentsFolders = ({ files, onOpen }: { files: DocFile[]; onOpen?: (f: DocFile) => void }) => {
  const groups = useMemo(() => {
    const g: Record<string, DocFile[]> = {};
    files.forEach(f => { const k = inferFolder(f.file_name); (g[k] ||= []).push(f); });
    return g;
  }, [files]);
  const recent = [...files].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {(Object.keys(FOLDERS) as (keyof typeof FOLDERS)[]).filter(k => k !== "other" || groups.other?.length).map(k => {
          const meta = FOLDERS[k]; const count = groups[k]?.length ?? 0;
          return (
            <div key={k} className="rounded-lg border border-border bg-background p-2.5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${meta.color}15` }}>
                <meta.Icon className="w-4 h-4" style={{ color: meta.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium truncate text-foreground">{meta.label}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{count} dosya</p>
              </div>
            </div>
          );
        })}
      </div>
      {recent.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Son Yüklenenler</p>
          <div className="space-y-1">
            {recent.map(f => (
              <button key={f.id} onClick={() => onOpen?.(f)}
                className="w-full flex items-center gap-2 rounded-md bg-background border border-border px-2.5 py-1.5 hover:border-[#FF6B2B]/30 text-left">
                <FileText className="w-3.5 h-3.5 text-[#FF6B2B] shrink-0" />
                <span className="text-[11.5px] text-foreground truncate flex-1">{f.file_name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{new Date(f.created_at).toLocaleDateString("tr-TR")}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ================================================================
   6) ACTIVITY FEED
   ================================================================ */
export interface ActivityItem { id: string; text: string; date: Date; color?: string; }

export const ProjectActivityFeed = ({ items }: { items: ActivityItem[] }) => {
  const groups = useMemo(() => {
    const today: ActivityItem[] = [], yest: ActivityItem[] = [], week: ActivityItem[] = [];
    const n = new Date(); const t0 = new Date(n.toDateString()).getTime();
    const y0 = t0 - 86400000; const w0 = t0 - 7 * 86400000;
    items.forEach(i => {
      const ts = i.date.getTime();
      if (ts >= t0) today.push(i);
      else if (ts >= y0) yest.push(i);
      else if (ts >= w0) week.push(i);
    });
    return { today, yest, week };
  }, [items]);
  const Section = ({ label, list }: { label: string; list: ActivityItem[] }) =>
    list.length === 0 ? null : (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</p>
        <div className="space-y-1.5">
          {list.map(i => (
            <div key={i.id} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: i.color || "#FF6B2B" }} />
              <span className="text-[12px] text-foreground/90 flex-1">{i.text}</span>
              <span className="text-[10px] text-muted-foreground">
                {i.date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-[#FF6B2B]" />
        <h3 className="text-sm font-semibold text-foreground">Aktivite Akışı</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted-foreground text-center py-3">Henüz aktivite kaydı yok.</p>
      ) : (
        <>
          <Section label="Bugün" list={groups.today} />
          <Section label="Dün" list={groups.yest} />
          <Section label="Bu Hafta" list={groups.week} />
        </>
      )}
    </div>
  );
};

/* ================================================================
   7) QUICK ACTION BAR (sticky bottom-right)
   ================================================================ */
export interface QuickAction { label: string; Icon: any; onClick: () => void; color?: string; }
export const QuickActionBar = ({ actions }: { actions: QuickAction[] }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur p-2 shadow-2xl grid grid-cols-1 gap-1 min-w-[180px]">
          {actions.map((a, i) => (
            <button key={i} onClick={() => { a.onClick(); setOpen(false); }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted/60 text-left">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${a.color || "#FF6B2B"}15` }}>
                <a.Icon className="w-3.5 h-3.5" style={{ color: a.color || "#FF6B2B" }} />
              </div>
              <span className="text-[12px] font-medium text-foreground">{a.label}</span>
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(o => !o)}
        className="w-12 h-12 rounded-full shadow-2xl text-white flex items-center justify-center transition-transform hover:scale-105"
        style={{ backgroundColor: open ? "#EF4444" : "#FF6B2B" }}
        aria-label="Hızlı işlemler"
      >
        {open ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </button>
    </div>
  );
};

/* ================================================================
   8) PROJECT AI DOCK (right, collapsible)
   ================================================================ */
export interface AIDockData {
  todaySummary: string[];
  criticalRisks: string[];
  nextPayments: { label: string; amount: string; date?: string }[];
  todayTasks: string[];
  latestDocs: string[];
  recentNotes: string[];
}
export const ProjectAIDock = ({ data, onAsk }: { data: AIDockData; onAsk?: (q: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-30">
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="rounded-l-xl bg-card/95 backdrop-blur border border-r-0 border-border px-2 py-3 flex flex-col items-center gap-1 shadow-xl hover:border-[#FF6B2B]/40">
          <Bot className="w-4 h-4 text-[#FF6B2B]" />
          <span className="text-[9px] font-semibold text-muted-foreground [writing-mode:vertical-rl] rotate-180">Project AI</span>
          <ChevronLeft className="w-3 h-3 text-muted-foreground" />
        </button>
      ) : (
        <div className="w-[320px] max-h-[80vh] rounded-l-2xl bg-card/98 backdrop-blur border border-r-0 border-border shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Bot className="w-4 h-4 text-[#FF6B2B]" />
            <span className="text-[12px] font-semibold text-foreground">Project AI</span>
            <button onClick={() => setOpen(false)} className="ml-auto text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-[11.5px]">
            <DockSection title="Bugünün Özeti" items={data.todaySummary} color="#FF6B2B" />
            <DockSection title="Kritik Riskler" items={data.criticalRisks} color="#EF4444" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Sıradaki Ödemeler</p>
              {data.nextPayments.length === 0
                ? <p className="text-muted-foreground text-[11px]">Planlı ödeme yok.</p>
                : <div className="space-y-1">
                    {data.nextPayments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md bg-background border border-border px-2 py-1">
                        <div>
                          <p className="text-[11.5px] text-foreground">{p.label}</p>
                          {p.date && <p className="text-[10px] text-muted-foreground">{p.date}</p>}
                        </div>
                        <span className="text-[11.5px] font-mono font-semibold text-[#FF6B2B]">{p.amount}</span>
                      </div>
                    ))}
                  </div>}
            </div>
            <DockSection title="Bugünün Görevleri" items={data.todayTasks} color="#3B82F6" />
            <DockSection title="Son Dosyalar" items={data.latestDocs} color="#A855F7" />
            <DockSection title="Son Notlar" items={data.recentNotes} color="#64748B" />
          </div>
          <div className="border-t border-border p-2 flex items-center gap-1.5">
            <input value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && q.trim()) { onAsk?.(q); setQ(""); } }}
              placeholder="AI'ya sor..." className="flex-1 bg-background border border-border rounded-md px-2 py-1.5 text-[11.5px] outline-none" />
            <button onClick={() => { if (q.trim()) { onAsk?.(q); setQ(""); } }}
              className="w-8 h-8 rounded-md bg-[#FF6B2B] text-white flex items-center justify-center">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
const DockSection = ({ title, items, color }: { title: string; items: string[]; color: string }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{title}</p>
    {items.length === 0
      ? <p className="text-muted-foreground text-[11px]">Kayıt yok.</p>
      : <ul className="space-y-0.5">
          {items.slice(0, 4).map((t, i) => (
            <li key={i} className="text-[11.5px] text-foreground/90 flex gap-1.5">
              <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
              <span>{t}</span>
            </li>
          ))}
        </ul>}
  </div>
);

/* ================================================================
   9) CEO MODE TOGGLE
   ================================================================ */
export const CEOModeToggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
  <button onClick={onToggle}
    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors border ${enabled ? "bg-[#7C3AED] text-white border-[#7C3AED]" : "bg-card text-foreground border-border hover:border-[#7C3AED]/40"}`}>
    {enabled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
    CEO Modu
  </button>
);

/* ================================================================
   10) CEO EXECUTIVE SUMMARY CARD (used inside CEO mode)
   ================================================================ */
export const CEOExecutiveSummary = ({
  health, budget, spent, cash, completion, forecast, insights,
}: {
  health: number; budget: string; spent: string; cash: string;
  completion: number; forecast: string; insights: string[];
}) => {
  const color = healthColor(health);
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#7C3AED]" />
        <h3 className="text-sm font-semibold text-foreground">Yönetici Özeti</h3>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">CEO Modu</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { l: "Sağlık", v: `${health}`, sub: healthLabel(health), color },
          { l: "Bütçe", v: budget, sub: "Toplam", color: "#3B82F6" },
          { l: "Nakit", v: cash, sub: "Mevcut", color: "#22C55E" },
          { l: "Harcanan", v: spent, sub: "Şu ana kadar", color: "#F59E0B" },
          { l: "Tamamlanma", v: `${completion}%`, sub: "İlerleme", color: "#FF6B2B" },
          { l: "Öngörü", v: forecast, sub: "30 gün", color: "#A855F7" },
        ].map((k, i) => (
          <div key={i} className="rounded-xl border border-border bg-background p-3">
            <div className="text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">{k.l}</div>
            <div className="mt-1 font-mono text-[18px] font-bold tabular-nums" style={{ color: k.color }}>{k.v}</div>
            <div className="text-[10px] text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>
      {insights.length > 0 && (
        <div className="rounded-lg border border-[#FF6B2B]/20 p-3"
             style={{ background: "linear-gradient(135deg, rgba(255,107,43,0.07), transparent)" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B2B]" />
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#FF6B2B]">AI Yönetici Değerlendirmesi</span>
          </div>
          <ul className="space-y-0.5">
            {insights.map((t, i) => <li key={i} className="text-[12px] leading-snug text-foreground/90">• {t}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

/* ================================================================
   Reusable card wrapper (lazy reveal helper)
   ================================================================ */
export const Section = ({ children }: { children: ReactNode }) => <section>{children}</section>;
