import { useState } from "react";
import {
  HardHat,
  User,
  FileText,
  Info,
  ChevronDown,
  TrendingUp,
  TrendingDown,
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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { Attachment } from "./ChatInput";

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

type Block =
  | { kind: "text"; content: string }
  | { kind: "summary"; red?: string; yellow?: string; green?: string }
  | { kind: "kpi"; rows: { label: string; value: string; trend?: string; note?: string }[] }
  | { kind: "recommendation"; title?: string; impact?: string; priority?: string; gain?: string; duration?: string; detail?: string }
  | { kind: "actions"; items: string[] }
  | { kind: "source"; content: string }
  | { kind: "details"; content: string };

const BLOCK_RE = /::(summary|kpi|recommendation|actions|source|details|answer)\s*\n([\s\S]*?)\n?::\/\1/g;

const parseBlocks = (raw: string): Block[] => {
  const blocks: Block[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  // Strip inline "Kaynak: ..." lines (they'll live only in source block if provided)
  const stripped = raw.replace(/^\s*(?:📖\s*)?Kaynak:\s*Lovable Cloud[^\n]*\n?/gim, "");

  BLOCK_RE.lastIndex = 0;
  while ((m = BLOCK_RE.exec(stripped)) !== null) {
    const before = stripped.slice(last, m.index).trim();
    if (before) blocks.push({ kind: "text", content: before });
    const [, kind, body] = m;
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
          return { label: parts[0] || "", value: parts[1] || "", trend: parts[2] || undefined, note: parts[3] || undefined };
        })
        .filter((r) => r.label && r.value);
      blocks.push({ kind: "kpi", rows });
    } else if (kind === "recommendation") {
      const rec: any = { kind: "recommendation" };
      inner.split("\n").forEach((ln) => {
        const mm = ln.match(/^\s*(title|impact|priority|gain|duration|detail)\s*:\s*(.+)$/i);
        if (mm) rec[mm[1].toLowerCase()] = mm[2].trim();
      });
      blocks.push(rec);
    } else if (kind === "actions") {
      const items = inner.replace(/\n/g, ",").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      blocks.push({ kind: "actions", items });
    } else if (kind === "source") {
      blocks.push({ kind: "source", content: inner });
    } else if (kind === "details") {
      blocks.push({ kind: "details", content: inner });
    }
    last = m.index + m[0].length;
  }
  const tail = stripped.slice(last).trim();
  if (tail) blocks.push({ kind: "text", content: tail });
  return blocks;
};

// --- Card components ---------------------------------------------------------

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

const KpiGrid = ({ rows }: { rows: { label: string; value: string; trend?: string; note?: string }[] }) => {
  const trendColor = (t?: string) => {
    if (!t) return "";
    if (/▲|↑|artış|\+/.test(t)) return "text-emerald-500";
    if (/▼|↓|azal|-/.test(t)) return "text-red-500";
    return "text-muted-foreground";
  };
  const TrendIcon = ({ t }: { t?: string }) => {
    if (!t) return null;
    if (/▲|↑|artış|\+/.test(t)) return <TrendingUp className="h-3 w-3" />;
    if (/▼|↓|azal|-/.test(t)) return <TrendingDown className="h-3 w-3" />;
    return null;
  };
  return (
    <div className={`grid gap-2.5 ${rows.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : rows.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {rows.map((r, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card/60 p-3.5 shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{r.label}</div>
          <div className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground leading-tight">{r.value}</div>
          {(r.trend || r.note) && (
            <div className={`mt-1 flex items-center gap-1 text-[11px] ${trendColor(r.trend)}`}>
              <TrendIcon t={r.trend} />
              {r.trend && <span className="font-semibold">{r.trend.replace(/^[▲▼↑↓]\s*/, "")}</span>}
              {r.note && <span className="text-muted-foreground">{r.note}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const RecommendationCard = ({ title, impact, priority, gain, duration, detail }: any) => {
  const impactColor =
    /yüksek/i.test(impact || "") ? "text-red-500 border-red-500/30 bg-red-500/10" :
    /orta/i.test(impact || "") ? "text-amber-500 border-amber-500/30 bg-amber-500/10" :
    "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">AI Önerisi</span>
      </div>
      {title && <div className="mb-3 text-sm font-semibold text-foreground">{title}</div>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {impact && (
          <div className="rounded-lg border border-border/60 bg-background/40 p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Etki</div>
            <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${impactColor}`}>{impact}</span>
          </div>
        )}
        {priority && (
          <div className="rounded-lg border border-border/60 bg-background/40 p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Öncelik</div>
            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-foreground">{priority}</div>
          </div>
        )}
        {gain && (
          <div className="rounded-lg border border-border/60 bg-background/40 p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Kazanç</div>
            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-emerald-500">{gain}</div>
          </div>
        )}
        {duration && (
          <div className="rounded-lg border border-border/60 bg-background/40 p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Süre</div>
            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-foreground">{duration}</div>
          </div>
        )}
      </div>
      {detail && <div className="mt-3 text-xs leading-relaxed text-muted-foreground">{detail}</div>}
    </div>
  );
};

const ACTION_META: Record<string, { icon: any; label: string; prompt: string }> = {
  pdf: { icon: FileText, label: "PDF Oluştur", prompt: "Bu cevabı PDF olarak hazırla" },
  mail: { icon: Mail, label: "Mail Hazırla", prompt: "Bu bilgiler için mail taslağı hazırla" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp Gönder", prompt: "Bu bilgileri WhatsApp mesajı olarak formatla" },
  call: { icon: Phone, label: "Ara", prompt: "İletişim bilgilerini göster" },
  report: { icon: BarChart3, label: "Rapor Oluştur", prompt: "Bu konu için detaylı rapor hazırla" },
  detail: { icon: Search, label: "Detayları Aç", prompt: "Detayları göster" },
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
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-[11px] font-medium text-foreground/80 shadow-sm transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/40"
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
  defaultOpen = false,
}: {
  label: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
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

// --- Component ---------------------------------------------------------------

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
      h1: ({ children }) => (
        <h2 className="text-sm font-semibold text-foreground mt-3 mb-2 first:mt-0">{children}</h2>
      ),
      h2: ({ children }) => (
        <h3 className="text-sm font-semibold text-foreground mt-3 mb-2 first:mt-0">{children}</h3>
      ),
      h3: ({ children }) => (
        <h4 className="text-xs font-semibold text-foreground mt-2 mb-1 first:mt-0">{children}</h4>
      ),
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
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">{children}</a>
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

const AssistantContent = ({ content }: { content: string }) => {
  // Extract professional-advice disclaimer as neutral info card
  const disclaimerRe = /\n?\s*Bilgi:\s*Bu değerlendirme[^\n]*?yetkili uzman tarafından verilmelidir\.?\s*$/;
  const match = content.match(disclaimerRe);
  const body = match ? content.replace(disclaimerRe, "").trimEnd() : content;
  const disclaimer = match?.[0]?.replace(/^\s*Bilgi:\s*/, "").trim();

  const blocks = parseBlocks(body);

  return (
    <div className="max-w-[85%] w-full text-sm leading-relaxed text-foreground space-y-3">
      {blocks.map((b, i) => {
        if (b.kind === "text") {
          return (
            <div key={i} className="rounded-2xl border border-border/60 bg-card/40 px-4 py-3 shadow-sm">
              <MarkdownBody content={b.content} />
            </div>
          );
        }
        if (b.kind === "summary") return <SummaryCard key={i} red={b.red} yellow={b.yellow} green={b.green} />;
        if (b.kind === "kpi") return <KpiGrid key={i} rows={b.rows} />;
        if (b.kind === "recommendation")
          return <RecommendationCard key={i} title={b.title} impact={b.impact} priority={b.priority} gain={b.gain} duration={b.duration} detail={b.detail} />;
        if (b.kind === "actions") return <QuickActions key={i} items={b.items} />;
        if (b.kind === "details")
          return (
            <Collapsible key={i} label="Detayları Göster" icon={ChevronDown}>
              <MarkdownBody content={b.content} />
            </Collapsible>
          );
        if (b.kind === "source")
          return (
            <Collapsible key={i} label="Kaynağı Göster" icon={Database}>
              <div className="text-xs text-muted-foreground whitespace-pre-wrap">{b.content}</div>
            </Collapsible>
          );
        return null;
      })}

      {disclaimer && (
        <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {disclaimer}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
