import { useState } from "react";
import {
  HardHat,
  User,
  FileText,
  Info,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Phone,
  Mail,
  MessageCircle,
  BarChart3,
  Search,
  Database,
  SearchX,
  Star,
  DollarSign,
  Clock,
  Users,
  ListChecks,
  FileSpreadsheet,
  Calendar,
  Building2,
  Truck,
  ShieldAlert,
  Gauge,
  BrainCircuit,
  Layers,
  ExternalLink,
  CheckSquare,
  Send,
  PhoneCall,
  Link2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { Attachment } from "./ChatInput";
import {
  ChartBlock,
  TimelineBlock,
  ProgressBlock,
  
  RiskCardsBlock,
  FinancialCardsBlock,
  PersonnelCardsBlock,
  MaterialCardsBlock,
  ProjectCardsBlock,
  parseChart,
  parseTimeline,
  parseProgress,
  parseDataTable,
  parseRisks,
  parseFinancial,
  parseEntity,
} from "./chat/VisualBlocks";
import { SmartVisual, SmartDataTable, extractUiPayloads } from "./chat/SmartVisual";
import { AIResponseRenderer } from "./ai/AIResponseRenderer";
import { parseAIResponse } from "@/hooks/useAIResponse";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

// --- Helpers -----------------------------------------------------------------

const NUMERIC_RE = /^\s*[₺$€]?\s*-?\d[\d.,]*\s*(TL|₺|%)?\s*$/;
const DATE_RE = /^\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s*$/;
const isNumericLike = (s: string) => NUMERIC_RE.test(s) || DATE_RE.test(s);

const nodeText = (children: any): string => {
  if (children == null) return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(nodeText).join("");
  if (children.props) return nodeText(children.props.children);
  return "";
};

const STATUS_MAP: { re: RegExp; cls: string }[] = [
  { re: /^(tamamland[ıi]|onayland[ıi]|ödendi|aktif|başar[ıi]l[ıi])$/i, cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  { re: /^(bekliyor|beklemede|taslak|devam ediyor|işlemde)$/i, cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { re: /^(gecikti|gecikmiş|iptal|reddedildi|başar[ıi]s[ıi]z|hata)$/i, cls: "bg-red-500/15 text-red-500 border-red-500/30" },
  { re: /^(bilgi|not|planland[ıi])$/i, cls: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
];

const StatusBadge = ({ text }: { text: string }) => {
  const match = STATUS_MAP.find((s) => s.re.test(text.trim()));
  if (!match) return <>{text}</>;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${match.cls}`}>
      {text.trim()}
    </span>
  );
};

const dispatchPrefill = (text: string) => {
  window.dispatchEvent(new CustomEvent("chat-prefill", { detail: text }));
};

// --- Block parsing -----------------------------------------------------------

type KpiRow = { label: string; value: string; trend?: string; note?: string; icon?: string; tone?: string };

type Block =
  | { kind: "text"; content: string }
  | { kind: "summary"; red?: string; yellow?: string; green?: string }
  | { kind: "kpi"; rows: KpiRow[] }
  | {
      kind: "recommendation";
      title?: string;
      impact?: string;
      priority?: string;
      savings?: string;
      gain?: string;
      risk?: string;
      duration?: string;
      confidence?: string;
      detail?: string;
    }
  | { kind: "actions"; items: string[] }
  | { kind: "source"; content: string }
  | { kind: "details"; content: string }
  | { kind: "warning"; problem?: string; impact?: string; action?: string }
  | { kind: "confidence"; percent?: string; sources?: string; updated?: string }
  | { kind: "reasoning"; tables?: string; records?: string; path?: string; sources?: string }
  | { kind: "queries"; items: string[] }
  | { kind: "memories"; items: string[] }
  | { kind: "documents"; items: string[] }
  | { kind: "notfound"; query?: string; reasons: string[]; similar: string[]; suggestions: string[] }
  | { kind: "chart"; chartType: "bar" | "pie" | "line"; title?: string; data: { name: string; value: number }[] }
  | { kind: "timeline"; title?: string; events: { date: string; label: string; status?: string; note?: string }[] }
  | { kind: "progress"; title?: string; rows: { label: string; percent: number; note?: string; tone?: string }[] }
  | { kind: "datatable"; title?: string; headers: string[]; rows: string[][] }
  | { kind: "risks"; rows: { severity: string; title: string; detail?: string; action?: string }[] }
  | { kind: "financial"; rows: any[] }
  | { kind: "personnel"; rows: any[] }
  | { kind: "materials"; rows: any[] }
  | { kind: "projects"; rows: any[] }
  | { kind: "ui"; payload: any };

const BLOCK_RE =
  /::(summary|kpi|recommendation|actions|source|details|answer|notfound|warning|confidence|reasoning|queries|memories|documents|chart|timeline|progress|datatable|risks|financial|personnel|materials|projects|ui)([^\n]*)\n([\s\S]*?)\n?::\/\1/g;

const parseKeyLines = (inner: string): Record<string, string> => {
  const out: Record<string, string> = {};
  inner.split("\n").forEach((ln) => {
    const mm = ln.match(/^\s*([a-zA-Z_]+)\s*:\s*(.+)$/);
    if (mm) out[mm[1].toLowerCase()] = mm[2].trim();
  });
  return out;
};

const parseBlocks = (raw: string): Block[] => {
  const blocks: Block[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  const stripped = raw.replace(/^\s*(?:📖\s*)?Kaynak:\s*Lovable Cloud[^\n]*\n?/gim, "");

  BLOCK_RE.lastIndex = 0;
  while ((m = BLOCK_RE.exec(stripped)) !== null) {
    const before = stripped.slice(last, m.index).trim();
    if (before) blocks.push({ kind: "text", content: before });
    const [, kind, header, body] = m;
    const inner = body.trim();

    if (kind === "answer") {
      blocks.push({ kind: "text", content: `**${inner}**` });
    } else if (kind === "summary") {
      const s: any = { kind: "summary" };
      inner.split("\n").forEach((ln) => {
        const mm = ln.match(/^\s*(red|yellow|green)\s*:\s*(.+)$/i);
        if (mm) s[mm[1].toLowerCase()] = mm[2].trim();
      });
      blocks.push(s);
    } else if (kind === "kpi") {
      const rows = inner
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !/^etiket\s*\|/i.test(l))
        .map((l) => {
          const parts = l.split("|").map((p) => p.trim());
          return {
            label: parts[0] || "",
            value: parts[1] || "",
            trend: parts[2] || undefined,
            note: parts[3] || undefined,
            icon: parts[4]?.toLowerCase() || undefined,
            tone: parts[5]?.toLowerCase() || undefined,
          };
        })
        .filter((r) => r.label && r.value);
      blocks.push({ kind: "kpi", rows });
    } else if (kind === "recommendation") {
      const kv = parseKeyLines(inner);
      blocks.push({ kind: "recommendation", ...(kv as any) });
    } else if (kind === "actions") {
      const items = inner.replace(/\n/g, ",").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      blocks.push({ kind: "actions", items });
    } else if (kind === "warning") {
      const kv = parseKeyLines(inner);
      blocks.push({ kind: "warning", ...(kv as any) });
    } else if (kind === "confidence") {
      const kv = parseKeyLines(inner);
      blocks.push({ kind: "confidence", ...(kv as any) });
    } else if (kind === "reasoning") {
      const kv = parseKeyLines(inner);
      blocks.push({ kind: "reasoning", ...(kv as any) });
    } else if (kind === "queries" || kind === "memories" || kind === "documents") {
      const items = inner
        .split("\n")
        .map((l) => l.replace(/^\s*[-*•]\s*/, "").trim())
        .filter(Boolean);
      blocks.push({ kind, items } as Block);
    } else if (kind === "source") {
      blocks.push({ kind: "source", content: inner });
    } else if (kind === "details") {
      blocks.push({ kind: "details", content: inner });
    } else if (kind === "notfound") {
      const nf: any = { kind: "notfound", reasons: [], similar: [], suggestions: [] };
      inner.split("\n").forEach((ln) => {
        const mm = ln.match(/^\s*(query|reasons|similar|suggestions)\s*:\s*(.+)$/i);
        if (!mm) return;
        const key = mm[1].toLowerCase();
        const val = mm[2].trim();
        if (key === "query") nf.query = val;
        else if (key === "similar") nf.similar = val.split(",").map((s) => s.trim()).filter(Boolean);
        else nf[key] = val.split("|").map((s) => s.trim()).filter(Boolean);
      });
      blocks.push(nf);
    } else if (kind === "chart") {
      blocks.push({ kind: "chart", ...parseChart(header || "", inner) });
    } else if (kind === "timeline") {
      blocks.push({ kind: "timeline", ...parseTimeline(header || "", inner) });
    } else if (kind === "progress") {
      blocks.push({ kind: "progress", ...parseProgress(header || "", inner) });
    } else if (kind === "datatable") {
      blocks.push({ kind: "datatable", ...parseDataTable(header || "", inner) });
    } else if (kind === "risks") {
      blocks.push({ kind: "risks", rows: parseRisks(inner) });
    } else if (kind === "financial") {
      blocks.push({ kind: "financial", rows: parseFinancial(inner) });
    } else if (kind === "personnel") {
      blocks.push({ kind: "personnel", rows: parseEntity(inner) });
    } else if (kind === "materials") {
      blocks.push({ kind: "materials", rows: parseEntity(inner) });
    } else if (kind === "projects") {
      blocks.push({ kind: "projects", rows: parseEntity(inner) });
    } else if (kind === "ui") {
      try {
        blocks.push({ kind: "ui", payload: JSON.parse(inner) });
      } catch {
        // ignore malformed JSON payloads silently
      }
    }
    last = m.index + m[0].length;
  }
  const tail = stripped.slice(last).trim();
  if (tail) blocks.push({ kind: "text", content: tail });
  return blocks;
};

// --- Cards -------------------------------------------------------------------

const SummaryCard = ({ red, yellow, green }: { red?: string; yellow?: string; green?: string }) => (
  <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
    <div className="mb-3 flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-primary" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">AI Özeti</span>
    </div>
    <div className="space-y-2">
      {red && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/5 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Kritik Nokta</div>
            <div className="text-sm text-foreground">{red}</div>
          </div>
        </div>
      )}
      {yellow && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">Dikkat</div>
            <div className="text-sm text-foreground">{yellow}</div>
          </div>
        </div>
      )}
      {green && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">Durum</div>
            <div className="text-sm text-foreground">{green}</div>
          </div>
        </div>
      )}
    </div>
  </div>
);

const KPI_ICON: Record<string, any> = {
  money: DollarSign,
  clock: Clock,
  alert: AlertTriangle,
  users: Users,
  task: ListChecks,
  doc: FileText,
  chart: BarChart3,
  calendar: Calendar,
  building: Building2,
  truck: Truck,
};

const TONE_CLS: Record<string, { icon: string; ring: string; chip: string; value: string }> = {
  positive: {
    icon: "bg-emerald-500/15 text-emerald-500",
    ring: "border-emerald-500/25",
    chip: "bg-emerald-500/10 text-emerald-500",
    value: "text-foreground",
  },
  warning: {
    icon: "bg-amber-500/15 text-amber-500",
    ring: "border-amber-500/25",
    chip: "bg-amber-500/10 text-amber-500",
    value: "text-foreground",
  },
  danger: {
    icon: "bg-red-500/15 text-red-500",
    ring: "border-red-500/25",
    chip: "bg-red-500/10 text-red-500",
    value: "text-foreground",
  },
  info: {
    icon: "bg-sky-500/15 text-sky-500",
    ring: "border-sky-500/25",
    chip: "bg-sky-500/10 text-sky-500",
    value: "text-foreground",
  },
  neutral: {
    icon: "bg-muted text-muted-foreground",
    ring: "border-border/60",
    chip: "bg-muted text-muted-foreground",
    value: "text-foreground",
  },
};

const trendMeta = (t?: string) => {
  if (!t) return { Icon: null as any, color: "text-muted-foreground", label: "" };
  const label = t.replace(/^[▲▼↑↓]\s*/, "").trim();
  if (/▲|↑|artış|\+/.test(t)) return { Icon: TrendingUp, color: "text-emerald-500", label };
  if (/▼|↓|azal|-/.test(t)) return { Icon: TrendingDown, color: "text-red-500", label };
  return { Icon: Minus, color: "text-muted-foreground", label };
};

const KpiGrid = ({ rows }: { rows: KpiRow[] }) => {
  const cols = rows.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : rows.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";
  return (
    <div className={`grid gap-3 ${cols}`}>
      {rows.map((r, i) => {
        const tone = TONE_CLS[r.tone || "neutral"] || TONE_CLS.neutral;
        const Icon = KPI_ICON[r.icon || ""] || BarChart3;
        const { Icon: TIcon, color, label } = trendMeta(r.trend);
        return (
          <div
            key={i}
            className={`group relative rounded-2xl border ${tone.ring} bg-card/70 p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone.icon}`}>
                <Icon className="h-4 w-4" />
              </div>
              {r.trend && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.chip}`}>
                  {TIcon && <TIcon className="h-3 w-3" />}
                  {label}
                </span>
              )}
            </div>
            <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{r.label}</div>
            <div className={`mt-1 font-mono text-2xl font-bold tabular-nums leading-tight ${tone.value}`}>{r.value}</div>
            {r.note && <div className="mt-1 text-[11px] text-muted-foreground">{r.note}</div>}
          </div>
        );
      })}
    </div>
  );
};

const StarRating = ({ value = 0 }: { value?: number }) => {
  const n = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= n ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/40"}`}
        />
      ))}
    </div>
  );
};

const RecommendationCard = (props: {
  title?: string;
  impact?: string;
  priority?: string;
  savings?: string;
  gain?: string;
  risk?: string;
  duration?: string;
  confidence?: string;
  detail?: string;
}) => {
  const { title, impact, priority, savings, gain, risk, duration, confidence, detail } = props;
  const impactNum = Number((impact || "").replace(/[^\d.]/g, "")) || 0;
  const savingsText = savings || gain;

  const priorityColor =
    /yüksek|high/i.test(priority || "") ? "bg-red-500/10 text-red-500 border-red-500/25" :
    /orta|med/i.test(priority || "") ? "bg-amber-500/10 text-amber-500 border-amber-500/25" :
    "bg-emerald-500/10 text-emerald-500 border-emerald-500/25";

  const riskColor =
    /yüksek|high/i.test(risk || "") ? "text-red-500" :
    /orta|med/i.test(risk || "") ? "text-amber-500" :
    "text-emerald-500";

  const conf = Number((confidence || "").replace(/[^\d.]/g, ""));
  const confPct = Number.isFinite(conf) ? Math.max(0, Math.min(100, conf)) : null;

  const Metric = ({ icon: Icon, label, children, valueClass = "text-foreground" }: any) => (
    <div className="rounded-xl border border-border/60 bg-background/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${valueClass}`}>{children}</div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-transparent p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">AI Önerisi</div>
            {title && <div className="text-sm font-semibold text-foreground leading-tight">{title}</div>}
          </div>
        </div>
        {priority && (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${priorityColor}`}>
            {priority}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {impact && (
          <Metric icon={Star} label="Etki">
            <div className="flex items-center gap-2">
              <StarRating value={impactNum} />
              <span className="font-mono text-xs text-muted-foreground">{impactNum}/5</span>
            </div>
          </Metric>
        )}
        {savingsText && (
          <Metric icon={DollarSign} label="Tahmini Kazanç" valueClass="text-emerald-500 font-mono tabular-nums">
            {savingsText}
          </Metric>
        )}
        {risk && (
          <Metric icon={ShieldAlert} label="Risk" valueClass={riskColor}>
            {risk}
          </Metric>
        )}
        {duration && (
          <Metric icon={Clock} label="Tamamlanma Süresi" valueClass="font-mono tabular-nums">
            {duration}
          </Metric>
        )}
        {confPct !== null && (
          <Metric icon={Gauge} label="Güven Skoru">
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${confPct}%` }}
                />
              </div>
              <span className="font-mono text-xs tabular-nums text-foreground">%{confPct}</span>
            </div>
          </Metric>
        )}
      </div>

      {detail && <div className="mt-3 text-xs leading-relaxed text-muted-foreground">{detail}</div>}
    </div>
  );
};

const WarningCard = ({ problem, impact, action }: { problem?: string; impact?: string; action?: string }) => (
  <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/[0.08] to-transparent p-4 shadow-sm">
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/15 text-red-500">
        <AlertCircle className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-red-500">Kritik Uyarı</div>
        <div className="text-sm font-semibold text-foreground">Aksiyon Gerekli</div>
      </div>
    </div>
    <div className="space-y-2">
      {problem && (
        <div className="rounded-xl border border-red-500/20 bg-background/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Problem</div>
          <div className="mt-0.5 text-sm text-foreground">{problem}</div>
        </div>
      )}
      {impact && (
        <div className="rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">İş Etkisi</div>
          <div className="mt-0.5 text-sm text-foreground">{impact}</div>
        </div>
      )}
      {action && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">Önerilen Aksiyon</div>
          <div className="mt-0.5 text-sm text-foreground">{action}</div>
        </div>
      )}
    </div>
  </div>
);

const ConfidenceBar = ({ percent, sources, updated }: { percent?: string; sources?: string; updated?: string }) => {
  const pct = Math.max(0, Math.min(100, Number((percent || "").replace(/[^\d.]/g, "")) || 0));
  const tone = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  const label = pct >= 80 ? "Yüksek Güven" : pct >= 50 ? "Orta Güven" : "Düşük Güven";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <BrainCircuit className="h-3.5 w-3.5" />
        AI Güven
      </div>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="font-mono text-xs font-semibold tabular-nums text-foreground">%{pct}</span>
      </div>
      <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="font-medium">{label}</span>
        {sources && (
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3 w-3" /> {sources} kaynak
          </span>
        )}
        {updated && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {updated}
          </span>
        )}
      </div>
    </div>
  );
};

const ACTION_META: Record<string, { icon: any; label: string; prompt: string }> = {
  task: { icon: CheckSquare, label: "Görev Oluştur", prompt: "Bu öneri için görev oluştur" },
  pdf: { icon: FileText, label: "PDF Oluştur", prompt: "Bu cevabı PDF olarak hazırla" },
  email: { icon: Send, label: "Mail Gönder", prompt: "Bu bilgiler için mail taslağı hazırla" },
  mail: { icon: Mail, label: "Mail Hazırla", prompt: "Bu bilgiler için mail taslağı hazırla" },
  call: { icon: PhoneCall, label: "Taşeronu Ara", prompt: "İlgili taşeronun iletişim bilgilerini göster" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp", prompt: "Bu bilgileri WhatsApp mesajı olarak formatla" },
  related: { icon: Link2, label: "İlgili Kayıtlar", prompt: "Bu konuya ait ilgili kayıtları listele" },
  report: { icon: BarChart3, label: "Rapor Oluştur", prompt: "Bu konu için detaylı rapor hazırla" },
  detail: { icon: Search, label: "Detay", prompt: "Detayları göster" },
  phone: { icon: Phone, label: "Ara", prompt: "İletişim bilgilerini göster" },
};

const QuickActions = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((k) => {
      const meta = ACTION_META[k];
      if (!meta) return null;
      const Icon = meta.icon;
      return (
        <button
          key={k}
          type="button"
          onClick={() => dispatchPrefill(meta.prompt)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-foreground/80 shadow-sm transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/40 hover:-translate-y-px"
        >
          <Icon className="h-3.5 w-3.5" />
          {meta.label}
        </button>
      );
    })}
  </div>
);

const Collapsible = ({
  label,
  icon: Icon,
  children,
  tone = "default",
}: {
  label: string;
  icon: any;
  children: React.ReactNode;
  tone?: "default" | "primary";
}) => {
  const [open, setOpen] = useState(false);
  const toneCls = tone === "primary" ? "text-primary" : "text-muted-foreground hover:text-foreground";
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide ${toneCls}`}
      >
        <span className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-border/60 px-3 py-2.5">{children}</div>}
    </div>
  );
};

const ReasoningAccordion = ({
  tables,
  records,
  path,
  sources,
}: {
  tables?: string;
  records?: string;
  path?: string;
  sources?: string;
}) => (
  <Collapsible label="Reasoning & Sources" icon={BrainCircuit} tone="primary">
    <div className="grid gap-2.5 text-xs">
      {tables && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sorgulanan Tablolar</div>
          <div className="flex flex-wrap gap-1">
            {tables.split(",").map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 px-2 py-0.5 font-mono text-[10px] text-foreground">
                <Database className="h-2.5 w-2.5" />
                {t.trim()}
              </span>
            ))}
          </div>
        </div>
      )}
      {records && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Eşleşen Kayıt</div>
          <div className="font-mono tabular-nums text-foreground">{records}</div>
        </div>
      )}
      {path && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Karar Yolu</div>
          <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{path}</div>
        </div>
      )}
      {sources && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Kaynak Referansları</div>
          <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{sources}</div>
        </div>
      )}
    </div>
  </Collapsible>
);

// Unified "How did I reach this answer?" panel — evidence & sources only,
// never chain-of-thought. Aggregates queries, memories, KB docs, confidence,
// reasoning summary, and action recommendations into a single collapsible.
const ACTION_LABELS: Record<string, string> = {
  task: "Görev Oluştur",
  pdf: "PDF Oluştur",
  email: "Mail Gönder",
  call: "Taşeronu Ara",
  related: "İlgili Kayıtları Aç",
  whatsapp: "WhatsApp",
  report: "Rapor",
  detail: "Detay",
};

const ExplainabilityPanel = ({
  queries,
  memories,
  documents,
  confidence,
  reasoning,
  actions,
}: {
  queries?: string[];
  memories?: string[];
  documents?: string[];
  confidence?: { percent?: string; sources?: string; updated?: string };
  reasoning?: { tables?: string; records?: string; path?: string; sources?: string };
  actions?: string[];
}) => {
  const [open, setOpen] = useState(false);
  const pct = confidence
    ? Math.max(0, Math.min(100, Number((confidence.percent || "").replace(/[^\d.]/g, "")) || 0))
    : null;
  const tone = pct === null ? "" : pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-red-500";
  const bar = pct === null ? "" : pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-primary"
      >
        <span className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4" />
          🧠 Bu cevaba nasıl ulaştım?
          {pct !== null && (
            <span className={`ml-1 font-mono tabular-nums ${tone}`}>%{pct}</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-primary/15 px-3 py-3 text-xs">
          {confidence && pct !== null && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Güven</div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`font-mono text-xs font-semibold tabular-nums ${tone}`}>%{pct}</span>
              </div>
              {(confidence.sources || confidence.updated) && (
                <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                  {confidence.sources && (
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3 w-3" /> {confidence.sources} kaynak
                    </span>
                  )}
                  {confidence.updated && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {confidence.updated}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {reasoning?.path && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Karar Özeti</div>
              <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{reasoning.path}</div>
            </div>
          )}

          {queries && queries.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Database className="h-3 w-3" /> Kullanılan Sorgular
              </div>
              <ul className="space-y-1 text-foreground/90">
                {queries.map((q, i) => (
                  <li key={i} className="flex gap-2 font-mono text-[11px]">
                    <span className="text-primary/60">›</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reasoning?.tables && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sorgulanan Tablolar {reasoning.records && <span className="text-foreground">· {reasoning.records} kayıt</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                {reasoning.tables.split(",").map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 px-2 py-0.5 font-mono text-[10px]">
                    <Database className="h-2.5 w-2.5" />
                    {t.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {memories && memories.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <BrainCircuit className="h-3 w-3" /> Şirket Hafızası ({memories.length})
              </div>
              <ul className="space-y-1 text-foreground/90">
                {memories.map((m, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary/60">•</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {documents && documents.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <FileText className="h-3 w-3" /> Bilgi Bankası ({documents.length})
              </div>
              <ul className="space-y-1 text-foreground/90">
                {documents.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary/60">•</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reasoning?.sources && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Kaynak Referansları</div>
              <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{reasoning.sources}</div>
            </div>
          )}

          {actions && actions.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Üretilen Aksiyon Önerileri</div>
              <div className="flex flex-wrap gap-1">
                {actions.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 px-2 py-0.5 text-[10px]">
                    {ACTION_LABELS[a] || a}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-1 text-[10px] text-muted-foreground/70 italic">
            Not: Yalnızca kullanılan veri kaynakları ve karar özeti gösterilir. AI'ın düşünce zinciri paylaşılmaz.
          </div>
        </div>
      )}
    </div>
  );
};

const NotFoundCard = ({
  query,
  reasons,
  similar,
  suggestions,
}: {
  query?: string;
  reasons: string[];
  similar: string[];
  suggestions: string[];
}) => (
  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm space-y-3">
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
        <SearchX className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">Kayıt Bulunamadı</div>
        <div className="text-sm text-foreground">
          {query ? <>"<span className="font-semibold">{query}</span>" için eşleşen kayıt yok.</> : "Bu kriterlere uygun kayıt bulunamadı."}
        </div>
      </div>
    </div>

    {reasons.length > 0 && (
      <div className="rounded-xl border border-border/60 bg-background/40 p-3">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Olası Nedenler</div>
        <ul className="space-y-1 text-xs text-foreground/90">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-amber-500">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {similar.length > 0 && (
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Benzer Kayıtlar</div>
        <div className="flex flex-wrap gap-1.5">
          {similar.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => dispatchPrefill(s)}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[11px] font-medium text-foreground/80 shadow-sm hover:bg-primary/10 hover:text-primary hover:border-primary/40"
            >
              <Search className="h-3 w-3" />
              {s}
            </button>
          ))}
        </div>
      </div>
    )}

    {suggestions.length > 0 && (
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Arama Önerileri</div>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => dispatchPrefill(s)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary shadow-sm hover:bg-primary/15"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
);

// --- Markdown ---------------------------------------------------------------

const MarkdownBody = ({ content }: { content: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[rehypeKatex]}
    components={{
      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
      ul: ({ children }) => <ul className="space-y-1.5 mb-2 last:mb-0">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 mb-2 last:mb-0">{children}</ol>,
      li: ({ children }) => (
        <li className="flex gap-2 items-baseline before:content-['•'] before:text-primary before:font-bold">
          <span className="flex-1">{children}</span>
        </li>
      ),
      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
      h1: ({ children }) => <h2 className="text-sm font-semibold text-foreground mt-3 mb-2 first:mt-0">{children}</h2>,
      h2: ({ children }) => <h3 className="text-sm font-semibold text-foreground mt-3 mb-2 first:mt-0">{children}</h3>,
      h3: ({ children }) => <h4 className="text-xs font-semibold text-foreground mt-2 mb-1 first:mt-0">{children}</h4>,
      blockquote: ({ children }) => (
        <div className="my-2 flex gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-foreground/90">
          <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          <div className="flex-1">{children}</div>
        </div>
      ),
      hr: () => <hr className="my-3 border-border/60" />,
      code: ({ className, children, ...props }) => {
        const isInline = !className;
        return isInline ? (
          <code className="bg-muted/50 px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
        ) : (
          <code className={`block bg-muted/50 p-2 rounded text-xs font-mono overflow-x-auto my-2 ${className}`} {...props}>{children}</code>
        );
      },
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 inline-flex items-center gap-0.5">
          {children}<ExternalLink className="h-3 w-3" />
        </a>
      ),
      table: ({ children }) => (
        <div className="overflow-x-auto my-2 rounded-xl border border-border/60">
          <table className="min-w-full text-xs">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-muted/40">{children}</thead>,
      tbody: ({ children }) => <tbody className="divide-y divide-border/60">{children}</tbody>,
      tr: ({ children }) => <tr className="hover:bg-muted/20 transition-colors">{children}</tr>,
      th: ({ children }) => {
        const text = nodeText(children);
        const numeric = isNumericLike(text) || /tutar|fiyat|miktar|tarih|adet|toplam/i.test(text);
        return (
          <th className={`px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground ${numeric ? "text-right" : "text-left"}`}>
            {children}
          </th>
        );
      },
      td: ({ children }) => {
        const text = nodeText(children);
        const numeric = isNumericLike(text);
        const isStatus = STATUS_MAP.some((s) => s.re.test(text.trim()));
        return (
          <td className={`px-3 py-2 ${numeric ? "text-right font-mono tabular-nums text-foreground font-semibold" : "text-left"}`}>
            {isStatus ? <StatusBadge text={text} /> : children}
          </td>
        );
      },
    }}
  >
    {content}
  </ReactMarkdown>
);

// --- Assistant content ------------------------------------------------------

const AssistantContent = ({ content }: { content: string }) => {
  const disclaimerRe = /\n?\s*Bilgi:\s*Bu değerlendirme[^\n]*?yetkili uzman tarafından verilmelidir\.?\s*$/;
  const match = content.match(disclaimerRe);
  const bodyRaw = match ? content.replace(disclaimerRe, "").trimEnd() : content;
  const disclaimer = match?.[0]?.replace(/^\s*Bilgi:\s*/, "").trim();

  // Universal AI Response Engine: run the raw body through useAIResponse's
  // parser so every ui payload shape (```json ui```, ::ui blocks, trailing
  // {"ui": ...}, or object-shaped speech/ui) is normalized. The resulting
  // `uiPayloads` render through <AIResponseRenderer /> (AITable, AIKpiCards,
  // AIBarChart, AILineChart, AIPieChart, AITimeline, AIProgress).
  const { speech: bodyAfterUi, ui: uiPayloads } = parseAIResponse(bodyRaw);
  const { text: body, payloads } = extractUiPayloads(bodyAfterUi);
  const blocks = parseBlocks(body);

  // Extract evidence blocks — rendered as a single Explainability panel below.
  const confidenceBlock = blocks.find((b) => b.kind === "confidence") as any;
  const reasoningBlock = blocks.find((b) => b.kind === "reasoning") as any;
  const queriesBlock = blocks.find((b) => b.kind === "queries") as any;
  const memoriesBlock = blocks.find((b) => b.kind === "memories") as any;
  const documentsBlock = blocks.find((b) => b.kind === "documents") as any;
  const actionsBlock = blocks.find((b) => b.kind === "actions") as any;

  const showExplain =
    confidenceBlock || reasoningBlock || queriesBlock || memoriesBlock || documentsBlock || actionsBlock;

  return (
    <div className="max-w-[92%] w-full text-sm leading-relaxed text-foreground space-y-3">
      {blocks.map((b, i) => {
        if (b.kind === "text") {
          return (
            <div key={i} className="rounded-2xl border border-border/60 bg-card/50 px-4 py-3 shadow-sm">
              <MarkdownBody content={b.content} />
            </div>
          );
        }
        if (b.kind === "summary") return <SummaryCard key={i} red={b.red} yellow={b.yellow} green={b.green} />;
        if (b.kind === "kpi") return <KpiGrid key={i} rows={b.rows} />;
        if (b.kind === "warning") return <WarningCard key={i} problem={b.problem} impact={b.impact} action={b.action} />;
        if (b.kind === "recommendation") return <RecommendationCard key={i} {...b} />;
        if (b.kind === "actions") return <QuickActions key={i} items={b.items} />;
        // confidence / reasoning / queries / memories / documents are folded
        // into the Explainability panel below — do not render inline.
        if (
          b.kind === "confidence" ||
          b.kind === "reasoning" ||
          b.kind === "queries" ||
          b.kind === "memories" ||
          b.kind === "documents"
        ) {
          return null;
        }
        if (b.kind === "details")
          return (
            <Collapsible key={i} label="Detayları Göster" icon={FileSpreadsheet}>
              <MarkdownBody content={b.content} />
            </Collapsible>
          );
        if (b.kind === "source")
          return (
            <Collapsible key={i} label="Kaynağı Göster" icon={Database}>
              <div className="text-xs text-muted-foreground whitespace-pre-wrap">{b.content}</div>
            </Collapsible>
          );
        if (b.kind === "notfound")
          return <NotFoundCard key={i} query={b.query} reasons={b.reasons} similar={b.similar} suggestions={b.suggestions} />;
        if (b.kind === "chart")
          return <ChartBlock key={i} chartType={b.chartType} title={b.title} data={b.data} />;
        if (b.kind === "timeline") return <TimelineBlock key={i} title={b.title} events={b.events} />;
        if (b.kind === "progress") return <ProgressBlock key={i} title={b.title} rows={b.rows} />;
        if (b.kind === "datatable")
          return <SmartDataTable key={i} title={b.title} headers={b.headers} rows={b.rows} />;
        if (b.kind === "risks") return <RiskCardsBlock key={i} rows={b.rows} />;
        if (b.kind === "financial") return <FinancialCardsBlock key={i} rows={b.rows} />;
        if (b.kind === "personnel") return <PersonnelCardsBlock key={i} rows={b.rows} />;
        if (b.kind === "materials") return <MaterialCardsBlock key={i} rows={b.rows} />;
        if (b.kind === "projects") return <ProjectCardsBlock key={i} rows={b.rows} />;
        if (b.kind === "ui") return <SmartVisual key={i} payload={b.payload} />;
        return null;
      })}

      {payloads.map((p, i) => (
        <SmartVisual key={`ui-${i}`} payload={p} />
      ))}

      {uiPayloads.length > 0 && <AIResponseRenderer ui={uiPayloads} />}

      {showExplain && (
        <ExplainabilityPanel
          queries={queriesBlock?.items}
          memories={memoriesBlock?.items}
          documents={documentsBlock?.items}
          confidence={confidenceBlock ? { percent: confidenceBlock.percent, sources: confidenceBlock.sources, updated: confidenceBlock.updated } : undefined}
          reasoning={reasoningBlock ? { tables: reasoningBlock.tables, records: reasoningBlock.records, path: reasoningBlock.path, sources: reasoningBlock.sources } : undefined}
          actions={actionsBlock?.items}
        />
      )}

      {disclaimer && (
        <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {disclaimer}
        </div>
      )}
    </div>
  );
};

// --- Root -------------------------------------------------------------------

const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isUser ? "chat-gradient" : "accent-gradient"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <HardHat className="w-4 h-4 text-accent-foreground" />
        )}
      </div>

      {isUser ? (
        <div className="max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed message-user">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.attachments.map((att, idx) => (
                <div key={idx}>
                  {att.preview ? (
                    <img src={att.preview} alt={att.name} className="max-w-[200px] max-h-[150px] rounded-lg object-cover" />
                  ) : (
                    <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-xs">{att.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <span className="whitespace-pre-wrap">{message.content}</span>
        </div>
      ) : (
        <AssistantContent content={message.content} />
      )}
    </div>
  );
};

export default ChatMessage;
