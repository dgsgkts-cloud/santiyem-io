// Auto-generated visual block renderers for the AI Visual Response Engine.
// Rendered by ChatMessage.tsx when the assistant emits `::chart`, `::timeline`,
// `::progress`, `::datatable`, `::risks`, `::financial`, `::personnel`,
// `::materials`, or `::projects` blocks.

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  Package,
  Building2,
  Calendar,
  TrendingUp,
  TrendingDown,
  Circle,
} from "lucide-react";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

// ---- Helpers ---------------------------------------------------------------

const parseRows = (inner: string): string[][] =>
  inner
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !/^-{3,}$/.test(l))
    .map((l) => l.split("|").map((c) => c.trim()));

const parseAttrs = (line: string): Record<string, string> => {
  const out: Record<string, string> = {};
  const re = /(\w+)\s*=\s*(?:"([^"]*)"|(\S+))/g;
  let m;
  while ((m = re.exec(line))) out[m[1].toLowerCase()] = (m[2] ?? m[3] ?? "").trim();
  return out;
};

const num = (s: string) => {
  const n = Number(String(s).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const toneCls = (t?: string) => {
  const k = (t || "").toLowerCase();
  if (/kritik|yüksek|danger|red|geciken|gecik/.test(k))
    return { border: "border-red-500/30", bg: "bg-red-500/5", text: "text-red-500", icon: AlertCircle };
  if (/orta|warning|amber|dikkat|bekle/.test(k))
    return { border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-500", icon: AlertTriangle };
  if (/düşük|good|ok|positive|tamam|aktif|ödendi|onay/.test(k))
    return { border: "border-emerald-500/30", bg: "bg-emerald-500/5", text: "text-emerald-500", icon: CheckCircle2 };
  return { border: "border-sky-500/30", bg: "bg-sky-500/5", text: "text-sky-500", icon: Circle };
};

// ---- Chart -----------------------------------------------------------------

export const ChartBlock = ({
  chartType,
  title,
  data,
}: {
  chartType: "bar" | "pie" | "line";
  title?: string;
  data: { name: string; value: number }[];
}) => {
  if (!data.length) return null;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
      {title && (
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
      )}
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          ) : (
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(e) => `${e.name}`}
                labelLine={false}
                fontSize={11}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ---- Timeline --------------------------------------------------------------

export const TimelineBlock = ({
  title,
  events,
}: {
  title?: string;
  events: { date: string; label: string; status?: string; note?: string }[];
}) => (
  <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
    {title && (
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" /> {title}
      </div>
    )}
    <div className="relative pl-5">
      <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" />
      {events.map((e, i) => {
        const t = toneCls(e.status);
        return (
          <div key={i} className="relative mb-3 last:mb-0">
            <div className={`absolute -left-[15px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background ${t.text.replace("text-", "bg-")}`} />
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{e.date}</span>
              <span className="text-sm font-semibold text-foreground">{e.label}</span>
              {e.status && (
                <span className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${t.border} ${t.bg} ${t.text}`}>
                  {e.status}
                </span>
              )}
            </div>
            {e.note && <div className="mt-0.5 text-xs text-muted-foreground">{e.note}</div>}
          </div>
        );
      })}
    </div>
  </div>
);

// ---- Progress bars ---------------------------------------------------------

export const ProgressBlock = ({
  title,
  rows,
}: {
  title?: string;
  rows: { label: string; percent: number; note?: string; tone?: string }[];
}) => (
  <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm space-y-2.5">
    {title && (
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
    )}
    {rows.map((r, i) => {
      const pct = Math.max(0, Math.min(100, r.percent));
      const color =
        r.tone === "danger" || pct < 30
          ? "bg-red-500"
          : r.tone === "warning" || pct < 70
          ? "bg-amber-500"
          : "bg-emerald-500";
      return (
        <div key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="font-medium text-foreground">{r.label}</span>
            <span className="font-mono tabular-nums text-muted-foreground">%{pct}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          {r.note && <div className="mt-0.5 text-[11px] text-muted-foreground">{r.note}</div>}
        </div>
      );
    })}
  </div>
);

// ---- Data Table ------------------------------------------------------------

export const DataTableBlock = ({
  title,
  headers,
  rows,
}: {
  title?: string;
  headers: string[];
  rows: string[][];
}) => {
  const NUMERIC_RE = /^\s*[₺$€]?\s*-?\d[\d.,]*\s*(TL|₺|%|kg|m2|m3|adet)?\s*$/i;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 shadow-sm overflow-hidden">
      {title && (
        <div className="border-b border-border/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-muted/20">
                {r.map((c, j) => {
                  const numeric = NUMERIC_RE.test(c);
                  const t = toneCls(c);
                  const isStatus = /^(tamamland|onayl|ödend|aktif|bekli|geci|iptal|kritik|risk|dikkat)/i.test(c);
                  return (
                    <td
                      key={j}
                      className={`px-3 py-2 ${
                        numeric ? "text-right font-mono tabular-nums font-semibold text-foreground" : "text-left"
                      }`}
                    >
                      {isStatus ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${t.border} ${t.bg} ${t.text}`}
                        >
                          {c}
                        </span>
                      ) : (
                        c
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---- Risk cards ------------------------------------------------------------

export const RiskCardsBlock = ({
  rows,
}: {
  rows: { severity: string; title: string; detail?: string; action?: string }[];
}) => (
  <div className="grid gap-2 md:grid-cols-2">
    {rows.map((r, i) => {
      const t = toneCls(r.severity);
      const Icon = t.icon;
      return (
        <div key={i} className={`rounded-2xl border ${t.border} ${t.bg} p-3 shadow-sm`}>
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${t.text}`} />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${t.text}`}>
              {r.severity}
            </span>
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{r.title}</div>
          {r.detail && <div className="mt-1 text-xs text-muted-foreground">{r.detail}</div>}
          {r.action && (
            <div className="mt-2 rounded-lg bg-background/60 px-2 py-1.5 text-[11px] text-foreground/90">
              <span className="font-semibold text-emerald-500">Aksiyon: </span>
              {r.action}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

// ---- Financial cards -------------------------------------------------------

export const FinancialCardsBlock = ({
  rows,
}: {
  rows: { label: string; amount: string; status?: string; note?: string; trend?: string }[];
}) => (
  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
    {rows.map((r, i) => {
      const t = toneCls(r.status);
      const trendUp = /▲|↑|artış|\+/.test(r.trend || "");
      const trendDn = /▼|↓|azal|-/.test(r.trend || "");
      return (
        <div key={i} className={`rounded-2xl border ${t.border} bg-card/70 p-3 shadow-sm`}>
          <div className="flex items-center justify-between">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${t.bg} ${t.text}`}>
              <DollarSign className="h-4 w-4" />
            </div>
            {r.trend && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  trendUp ? "bg-emerald-500/10 text-emerald-500" : trendDn ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
                }`}
              >
                {trendUp ? <TrendingUp className="h-3 w-3" /> : trendDn ? <TrendingDown className="h-3 w-3" /> : null}
                {r.trend.replace(/^[▲▼↑↓]\s*/, "")}
              </span>
            )}
          </div>
          <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {r.label}
          </div>
          <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground">
            {r.amount}
          </div>
          {r.status && (
            <span
              className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${t.border} ${t.bg} ${t.text}`}
            >
              {r.status}
            </span>
          )}
          {r.note && <div className="mt-1 text-[11px] text-muted-foreground">{r.note}</div>}
        </div>
      );
    })}
  </div>
);

// ---- Entity cards (personnel/material/projects) ---------------------------

const EntityCards = ({
  Icon,
  rows,
  emptyText = "Kayıt yok",
}: {
  Icon: any;
  rows: { title: string; subtitle?: string; value?: string; status?: string; meta?: string }[];
  emptyText?: string;
}) => {
  if (!rows.length) return <div className="text-xs text-muted-foreground">{emptyText}</div>;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r, i) => {
        const t = toneCls(r.status);
        return (
          <div key={i} className={`rounded-xl border ${t.border} bg-card/70 p-3 shadow-sm`}>
            <div className="flex items-start gap-2.5">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.bg} ${t.text}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{r.title}</div>
                {r.subtitle && (
                  <div className="truncate text-[11px] text-muted-foreground">{r.subtitle}</div>
                )}
                {r.value && (
                  <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
                    {r.value}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-1.5">
                  {r.status && (
                    <span
                      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${t.border} ${t.bg} ${t.text}`}
                    >
                      {r.status}
                    </span>
                  )}
                  {r.meta && <span className="text-[10px] text-muted-foreground">{r.meta}</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const PersonnelCardsBlock = ({ rows }: { rows: any[] }) => (
  <EntityCards Icon={Users} rows={rows} emptyText="Personel yok" />
);
export const MaterialCardsBlock = ({ rows }: { rows: any[] }) => (
  <EntityCards Icon={Package} rows={rows} emptyText="Malzeme yok" />
);
export const ProjectCardsBlock = ({ rows }: { rows: any[] }) => (
  <EntityCards Icon={Building2} rows={rows} emptyText="Proje yok" />
);

// ---- Parsers exported for ChatMessage --------------------------------------

export const parseChart = (header: string, inner: string) => {
  const a = parseAttrs(header);
  const chartType = (a.type as "bar" | "pie" | "line") || "bar";
  const data = parseRows(inner)
    .map((cols) => ({ name: cols[0] || "", value: num(cols[1] || "0") }))
    .filter((d) => d.name);
  return { chartType, title: a.title, data };
};

export const parseTimeline = (header: string, inner: string) => {
  const a = parseAttrs(header);
  const events = parseRows(inner).map((c) => ({
    date: c[0] || "",
    label: c[1] || "",
    status: c[2],
    note: c[3],
  }));
  return { title: a.title, events };
};

export const parseProgress = (header: string, inner: string) => {
  const a = parseAttrs(header);
  const rows = parseRows(inner).map((c) => ({
    label: c[0] || "",
    percent: num(c[1] || "0"),
    note: c[2],
    tone: c[3],
  }));
  return { title: a.title, rows };
};

export const parseDataTable = (header: string, inner: string) => {
  const a = parseAttrs(header);
  const rows = parseRows(inner);
  if (!rows.length) return { title: a.title, headers: [], rows: [] };
  const [headers, ...body] = rows;
  return { title: a.title, headers, rows: body };
};

export const parseRisks = (inner: string) =>
  parseRows(inner).map((c) => ({
    severity: c[0] || "Orta",
    title: c[1] || "",
    detail: c[2],
    action: c[3],
  }));

export const parseFinancial = (inner: string) =>
  parseRows(inner).map((c) => ({
    label: c[0] || "",
    amount: c[1] || "",
    status: c[2],
    note: c[3],
    trend: c[4],
  }));

export const parseEntity = (inner: string) =>
  parseRows(inner).map((c) => ({
    title: c[0] || "",
    subtitle: c[1],
    value: c[2],
    status: c[3],
    meta: c[4],
  }));
