// AIResponseRenderer — generic dispatcher. Given a `ui` payload from an AI
// response, it inspects `ui.type` and renders the matching React component.
//
// Supported ui.type values:
//   table          → <AITable />
//   kpi            → <AIKpiCards />
//   bar_chart      → <AIBarChart />
//   line_chart     → <AILineChart />
//   pie_chart      → <AIPieChart />
//   timeline       → <AITimeline />
//   progress       → <AIProgress />
//
// Payload can be a single object or an array of objects; arrays render in
// order so a single AI response can emit multiple visuals.

import { AITable } from "./AITable";
import { AIKpiCards, type AIKpi } from "./AIKpiCards";
import { AIBarChart, AILineChart, AIPieChart, type ChartPoint } from "./AICharts";
import { AITimeline, type AITimelineEvent } from "./AITimeline";
import { AIProgress, type AIProgressRow } from "./AIProgress";

export type AIUiPayload = {
  type: string;
  title?: string;
  columns?: string[];
  rows?: any;
  data?: any;
  items?: any;
  kpis?: any;
  events?: any;
  chartType?: "bar" | "line" | "pie";
  [k: string]: any;
};

const asChartData = (p: AIUiPayload): ChartPoint[] => {
  const src = p.data ?? p.rows ?? p.items ?? [];
  if (!Array.isArray(src)) return [];
  if (src.length && Array.isArray(src[0])) return src.map((r: any[]) => ({ name: String(r[0] ?? ""), value: Number(r[1]) || 0 }));
  if (src.length && typeof src[0] === "object") return src.map((r: any) => ({ name: String(r.name ?? r.label ?? r.category ?? ""), value: Number(r.value ?? r.amount ?? r.count ?? 0) || 0 }));
  return [];
};

const asKpis = (p: AIUiPayload): AIKpi[] => {
  const src = p.kpis ?? p.items ?? p.rows ?? p.data ?? [];
  return Array.isArray(src) ? src : [];
};

const asEvents = (p: AIUiPayload): AITimelineEvent[] => {
  const src = p.events ?? p.items ?? p.rows ?? p.data ?? [];
  if (!Array.isArray(src)) return [];
  return src.map((e: any) => Array.isArray(e)
    ? { date: String(e[0] ?? ""), label: String(e[1] ?? ""), status: e[2], note: e[3] }
    : { date: e.date, label: e.label ?? e.title, status: e.status, note: e.note });
};

const asProgress = (p: AIUiPayload): AIProgressRow[] => {
  const src = p.items ?? p.rows ?? p.data ?? [];
  if (!Array.isArray(src)) return [];
  return src.map((r: any) => Array.isArray(r)
    ? { label: String(r[0] ?? ""), percent: Number(r[1]) || 0, note: r[2], tone: r[3] }
    : { label: r.label, percent: Number(r.percent ?? r.value) || 0, note: r.note, tone: r.tone });
};

const RenderOne = ({ payload }: { payload: AIUiPayload }) => {
  if (!payload || typeof payload !== "object") return null;
  const type = String(payload.type || "").toLowerCase();
  const title = payload.title;

  if (["table", "datatable", "financial_table", "material_table", "personnel_table"].includes(type))
    return <AITable title={title} columns={payload.columns ?? payload.headers} rows={payload.rows ?? payload.items ?? payload.data} />;

  if (["kpi", "kpis", "kpi_cards", "metrics"].includes(type))
    return <AIKpiCards title={title} items={asKpis(payload)} />;

  if (type === "bar_chart" || type === "bar") return <AIBarChart title={title} data={asChartData(payload)} />;
  if (type === "line_chart" || type === "line") return <AILineChart title={title} data={asChartData(payload)} />;
  if (type === "pie_chart" || type === "pie") return <AIPieChart title={title} data={asChartData(payload)} />;
  if (type === "chart") {
    const c = payload.chartType || "bar";
    if (c === "line") return <AILineChart title={title} data={asChartData(payload)} />;
    if (c === "pie") return <AIPieChart title={title} data={asChartData(payload)} />;
    return <AIBarChart title={title} data={asChartData(payload)} />;
  }

  if (type === "timeline") return <AITimeline title={title} events={asEvents(payload)} />;
  if (["progress", "progress_card", "progress_bars"].includes(type)) return <AIProgress title={title} rows={asProgress(payload)} />;

  // Fallback: if rows exist, try table.
  const rows = payload.rows ?? payload.items ?? payload.data;
  if (Array.isArray(rows) && rows.length) return <AITable title={title} columns={payload.columns ?? payload.headers} rows={rows} />;
  return null;
};

export const AIResponseRenderer = ({ ui }: { ui: AIUiPayload | AIUiPayload[] | null | undefined }) => {
  if (!ui) return null;
  const list = Array.isArray(ui) ? ui : [ui];
  return (
    <div data-ai-component="AIResponseRenderer" className="space-y-3">
      {list.map((p, i) => <RenderOne key={i} payload={p} />)}
    </div>
  );
};

export default AIResponseRenderer;
