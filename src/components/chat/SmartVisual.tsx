// Universal AI Visual Response Engine.
// The assistant emits `::ui { JSON } ::/ui`. This component auto-selects and
// renders the correct visual component from a single JSON payload.
//
// Payload shape (all fields optional except `type`):
//   { type: "table"|"kpi"|"bar"|"line"|"pie"|"timeline"|"progress"
//         | "risks"|"financial"|"personnel"|"materials"|"projects",
//     title?: string,
//     columns?: string[],           // for table
//     rows?: any[][] | any[],       // string matrix (table) or object array
//     data?: { name, value }[],     // for charts
//     items?: any[],                // alt name for rows
//     kpis?: {label,value,trend?,note?,tone?,icon?}[]
//   }

import { useMemo, useState } from "react";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  FileDown,
  FileSpreadsheet,
  FileText as FilePdf,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ChartBlock,
  TimelineBlock,
  ProgressBlock,
  RiskCardsBlock,
  FinancialCardsBlock,
  PersonnelCardsBlock,
  MaterialCardsBlock,
  ProjectCardsBlock,
} from "./VisualBlocks";

// ---- Interactive DataTable -------------------------------------------------

const NUMERIC_RE = /^\s*[₺$€]?\s*-?\d[\d.,]*\s*(TL|₺|%|kg|m2|m3|adet)?\s*$/i;
const STATUS_RE = /^(tamamland|onayl|ödend|aktif|bekli|geci|iptal|kritik|risk|dikkat)/i;

const toneClass = (v: string) => {
  if (/kritik|iptal|geci|risk|red/i.test(v))
    return "bg-red-500/10 text-red-500 border-red-500/25";
  if (/bekli|dikkat|orta|warn/i.test(v))
    return "bg-amber-500/10 text-amber-500 border-amber-500/25";
  if (/tamamland|onayl|ödend|aktif|ok/i.test(v))
    return "bg-emerald-500/10 text-emerald-500 border-emerald-500/25";
  return "bg-sky-500/10 text-sky-500 border-sky-500/25";
};

const numeric = (s: string) => {
  const n = Number(String(s).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

export const SmartDataTable = ({
  title,
  headers,
  rows,
}: {
  title?: string;
  headers: string[];
  rows: string[][];
}) => {
  const [q, setQ] = useState("");
  const [sortIdx, setSortIdx] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = term
      ? rows.filter((row) => row.some((c) => String(c).toLowerCase().includes(term)))
      : rows.slice();
    if (sortIdx !== null) {
      r.sort((a, b) => {
        const av = a[sortIdx] ?? "";
        const bv = b[sortIdx] ?? "";
        const an = numeric(av);
        const bn = numeric(bv);
        const cmp =
          !isNaN(an) && !isNaN(bn)
            ? an - bn
            : String(av).localeCompare(String(bv), "tr", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return r;
  }, [rows, q, sortIdx, sortDir]);

  const toggleSort = (i: number) => {
    if (sortIdx === i) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortIdx(i);
      setSortDir("asc");
    }
  };

  const filename = (title || "santiyem-tablo").replace(/[^\p{L}\p{N}]+/gu, "_").toLowerCase();

  const doCopy = async () => {
    const tsv = [headers.join("\t"), ...filtered.map((r) => r.join("\t"))].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const doCSV = () => {
    const csv = [headers, ...filtered]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doXLSX = () => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...filtered]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rapor");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const doPDF = () => {
    const doc = new jsPDF({ orientation: filtered[0]?.length > 5 ? "landscape" : "portrait" });
    if (title) doc.setFontSize(12).text(title, 14, 14);
    autoTable(doc, {
      head: [headers],
      body: filtered,
      startY: title ? 20 : 12,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [40, 40, 45], textColor: 255 },
      theme: "grid",
    });
    doc.save(`${filename}.pdf`);
  };

  const IconBtn = ({ onClick, title: t, children }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={t}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
        {title && (
          <div className="mr-auto text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
            <span className="ml-2 text-muted-foreground/60 normal-case tracking-normal">
              ({filtered.length}/{rows.length})
            </span>
          </div>
        )}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ara..."
            className="h-7 w-32 rounded-md border border-border/60 bg-background/60 pl-7 pr-2 text-xs outline-none focus:border-primary/40"
          />
        </div>
        <IconBtn onClick={doCopy} title="Kopyala">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </IconBtn>
        <IconBtn onClick={doCSV} title="CSV indir">
          <FileDown className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn onClick={doXLSX} title="Excel indir">
          <FileSpreadsheet className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn onClick={doPDF} title="PDF indir">
          <FilePdf className="h-3.5 w-3.5" />
        </IconBtn>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  onClick={() => toggleSort(i)}
                  className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-1">
                    {h}
                    {sortIdx === i ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((r, i) => (
              <tr key={i} className="hover:bg-muted/20">
                {r.map((c, j) => {
                  const val = String(c ?? "");
                  const isNum = NUMERIC_RE.test(val);
                  const isStatus = STATUS_RE.test(val);
                  return (
                    <td
                      key={j}
                      className={`px-3 py-2 ${
                        isNum ? "text-right font-mono tabular-nums font-semibold text-foreground" : "text-left"
                      }`}
                    >
                      {isStatus ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${toneClass(val)}`}
                        >
                          {val}
                        </span>
                      ) : (
                        val
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={headers.length} className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Kayıt bulunamadı
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---- KPI grid --------------------------------------------------------------

const KpiInlineGrid = ({
  rows,
}: {
  rows: { label: string; value: string; trend?: string; note?: string; tone?: string }[];
}) => {
  const toneCls = (t?: string) =>
    t === "danger"
      ? "border-red-500/25 bg-red-500/5"
      : t === "warning"
      ? "border-amber-500/25 bg-amber-500/5"
      : t === "positive"
      ? "border-emerald-500/25 bg-emerald-500/5"
      : "border-border/60 bg-card/70";
  const cols =
    rows.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : rows.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <div className={`grid gap-2 ${cols}`}>
      {rows.map((r, i) => (
        <div key={i} className={`rounded-2xl border p-3 shadow-sm ${toneCls(r.tone)}`}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {r.label}
          </div>
          <div className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">{r.value}</div>
          {r.trend && <div className="mt-0.5 text-[11px] text-muted-foreground">{r.trend}</div>}
          {r.note && <div className="mt-0.5 text-[11px] text-muted-foreground">{r.note}</div>}
        </div>
      ))}
    </div>
  );
};

// ---- Universal router ------------------------------------------------------

const asMatrix = (rows: any, columns?: string[]): string[][] => {
  if (!rows) return [];
  if (Array.isArray(rows) && rows.length && Array.isArray(rows[0])) {
    return rows.map((r: any[]) => r.map((c) => (c == null ? "" : String(c))));
  }
  if (Array.isArray(rows) && rows.length && typeof rows[0] === "object") {
    const keys = columns && columns.length ? columns : Object.keys(rows[0]);
    return rows.map((r: any) => keys.map((k) => (r[k] == null ? "" : String(r[k]))));
  }
  return [];
};

const asChartData = (payload: any): { name: string; value: number }[] => {
  const src = payload.data || payload.rows || payload.items || [];
  if (!Array.isArray(src)) return [];
  if (src.length && Array.isArray(src[0])) {
    return src.map((r: any[]) => ({ name: String(r[0] ?? ""), value: Number(r[1]) || 0 }));
  }
  if (src.length && typeof src[0] === "object") {
    return src.map((r: any) => ({
      name: String(r.name ?? r.label ?? r.category ?? ""),
      value: Number(r.value ?? r.amount ?? r.count ?? 0) || 0,
    }));
  }
  return [];
};

const asArray = (payload: any, key = "rows") =>
  Array.isArray(payload[key])
    ? payload[key]
    : Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.data)
    ? payload.data
    : [];

export const SmartVisual = ({ payload }: { payload: any }) => {
  if (!payload || typeof payload !== "object") return null;
  const type = String(payload.type || "").toLowerCase();
  const title = payload.title;

  // TABLE variants
  if (["table", "datatable", "financial_table", "material_table", "personnel_table"].includes(type)) {
    const columns: string[] =
      payload.columns ||
      payload.headers ||
      (Array.isArray(payload.rows) && payload.rows[0] && typeof payload.rows[0] === "object" && !Array.isArray(payload.rows[0])
        ? Object.keys(payload.rows[0])
        : []);
    const rows = asMatrix(payload.rows ?? payload.items ?? payload.data, columns);
    return <SmartDataTable title={title} headers={columns} rows={rows} />;
  }

  // KPI
  if (["kpi", "kpis", "kpi_cards", "metrics"].includes(type)) {
    const rows = asArray(payload, "kpis").length ? payload.kpis : asArray(payload);
    return <KpiInlineGrid rows={rows} />;
  }

  // CHARTS
  if (["bar", "bar_chart", "line", "line_chart", "pie", "pie_chart", "chart"].includes(type)) {
    const chartType: "bar" | "line" | "pie" = type.startsWith("line")
      ? "line"
      : type.startsWith("pie")
      ? "pie"
      : type === "chart"
      ? (payload.chartType || "bar")
      : "bar";
    return <ChartBlock chartType={chartType} title={title} data={asChartData(payload)} />;
  }

  // TIMELINE
  if (type === "timeline") {
    const events = asArray(payload).map((e: any) =>
      Array.isArray(e)
        ? { date: String(e[0] ?? ""), label: String(e[1] ?? ""), status: e[2], note: e[3] }
        : { date: e.date, label: e.label ?? e.title, status: e.status, note: e.note }
    );
    return <TimelineBlock title={title} events={events} />;
  }

  // PROGRESS
  if (["progress", "progress_card", "progress_bars"].includes(type)) {
    const rows = asArray(payload).map((r: any) =>
      Array.isArray(r)
        ? { label: String(r[0] ?? ""), percent: Number(r[1]) || 0, note: r[2], tone: r[3] }
        : { label: r.label, percent: Number(r.percent ?? r.value) || 0, note: r.note, tone: r.tone }
    );
    return <ProgressBlock title={title} rows={rows} />;
  }

  // RISKS
  if (["risks", "risk_cards"].includes(type)) {
    const rows = asArray(payload).map((r: any) => ({
      severity: r.severity ?? r.level ?? "orta",
      title: r.title ?? r.label ?? "",
      detail: r.detail ?? r.description,
      action: r.action,
    }));
    return <RiskCardsBlock rows={rows} />;
  }

  // FINANCIAL cards
  if (["financial", "financial_cards"].includes(type)) {
    return <FinancialCardsBlock rows={asArray(payload)} />;
  }

  // Entity cards
  if (["personnel", "personnel_cards"].includes(type))
    return <PersonnelCardsBlock rows={asArray(payload)} />;
  if (["materials", "material", "material_cards"].includes(type))
    return <MaterialCardsBlock rows={asArray(payload)} />;
  if (["projects", "project", "project_cards"].includes(type))
    return <ProjectCardsBlock rows={asArray(payload)} />;

  // Unknown → best-effort table fallback if rows exist
  const rows = payload.rows ?? payload.items ?? payload.data;
  if (Array.isArray(rows) && rows.length) {
    const columns =
      payload.columns ||
      payload.headers ||
      (typeof rows[0] === "object" && !Array.isArray(rows[0]) ? Object.keys(rows[0]) : []);
    return <SmartDataTable title={title} headers={columns} rows={asMatrix(rows, columns)} />;
  }
  return null;
};

// Extract embedded ```json ui``` fenced JSON blocks and inline {"ui": {...}}
// payloads so backends that can't emit `::ui` blocks still get rendered.
export const extractUiPayloads = (raw: string): { text: string; payloads: any[] } => {
  const payloads: any[] = [];
  let text = raw;

  // ```json ui { ... } ```
  text = text.replace(/```(?:json)?\s*ui\s*\n([\s\S]*?)```/gi, (_m, body) => {
    try {
      const p = JSON.parse(body);
      payloads.push(p);
    } catch {}
    return "";
  });

  // {"ui": { ... }} at end-of-message
  const trailing = text.match(/\{\s*"ui"\s*:\s*\{[\s\S]*\}\s*\}\s*$/);
  if (trailing) {
    try {
      const p = JSON.parse(trailing[0]);
      if (p?.ui) payloads.push(p.ui);
      text = text.slice(0, trailing.index).trimEnd();
    } catch {}
  }

  return { text, payloads };
};
