import { HardHat, User, FileText, Info } from "lucide-react";
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

// Status → semantic color badge
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

// Follow-up suggestion chips shown on empty results
const EMPTY_RE = /(bu kriterlere uygun kay[ıi]t bulunamad[ıi]|kay[ıi]t bulunamad[ıi]|sonu[çc] bulunamad[ıi])/i;
const DEFAULT_SUGGESTIONS = [
  "Son ödeme nedir?",
  "Geçen ay ödemeleri göster.",
  "Tüm taşeron ödemelerini listele.",
];

const dispatchPrefill = (text: string) => {
  window.dispatchEvent(new CustomEvent("chat-prefill", { detail: text }));
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

const AssistantContent = ({ content }: { content: string }) => {
  // Extract professional-advice disclaimer as neutral info card
  const disclaimerRe = /\n?\s*Bilgi:\s*Bu değerlendirme[^\n]*?yetkili uzman tarafından verilmelidir\.?\s*$/;
  const match = content.match(disclaimerRe);
  const body = match ? content.replace(disclaimerRe, "").trimEnd() : content;
  const disclaimer = match?.[0]?.replace(/^\s*Bilgi:\s*/, "").trim();

  const isEmpty = EMPTY_RE.test(body);

  return (
    <div className="max-w-[80%] w-full text-sm leading-relaxed text-foreground">
      <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 shadow-sm">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="space-y-1.5 mb-2 last:mb-0">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 mb-2 last:mb-0">{children}</ol>,
            li: ({ children }) => (
              <li className="flex gap-2 items-baseline before:content-['•'] before:text-primary before:font-bold">
                <span className="flex-1">{children}</span>
              </li>
            ),
            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            h1: ({ children }) => (
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-3 mb-2 pb-1 border-b border-border/60 first:mt-0">
                {children}
              </h2>
            ),
            h2: ({ children }) => (
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-3 mb-2 pb-1 border-b border-border/60 first:mt-0">
                {children}
              </h3>
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
                <code className="bg-muted/50 px-1 py-0.5 rounded text-xs font-mono" {...props}>
                  {children}
                </code>
              ) : (
                <code className={`block bg-muted/50 p-2 rounded text-xs font-mono overflow-x-auto my-2 ${className}`} {...props}>
                  {children}
                </code>
              );
            },
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                {children}
              </a>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-2 rounded-lg border border-border/60">
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
                <td className={`px-3 py-2 ${numeric ? "text-right font-mono tabular-nums text-foreground" : "text-left"}`}>
                  {isStatus ? <StatusBadge text={text} /> : children}
                </td>
              );
            },
          }}
        >
          {body}
        </ReactMarkdown>
      </div>

      {isEmpty && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DEFAULT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => dispatchPrefill(s)}
              className="rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[11px] text-foreground/80 hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {disclaimer && (
        <div className="mt-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {disclaimer}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
