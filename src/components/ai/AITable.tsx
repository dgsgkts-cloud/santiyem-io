// AITable — generic tabular renderer for AI ui payloads of type "table".
import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from "lucide-react";

export type AITableProps = {
  title?: string;
  columns?: string[];
  rows?: any;
};

const NUM_RE = /^\s*[₺$€]?\s*-?\d[\d.,]*\s*(TL|₺|%|kg|m2|m3|adet)?\s*$/i;
const STATUS_RE = /^(tamamland|onayl|ödend|aktif|bekli|geci|iptal|kritik|risk|dikkat)/i;

const toneClass = (v: string) => {
  if (/kritik|iptal|geci|risk|red/i.test(v)) return "bg-red-500/10 text-red-500 border-red-500/25";
  if (/bekli|dikkat|orta|warn/i.test(v)) return "bg-amber-500/10 text-amber-500 border-amber-500/25";
  if (/tamamland|onayl|ödend|aktif|ok/i.test(v)) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/25";
  return "bg-sky-500/10 text-sky-500 border-sky-500/25";
};

const numeric = (s: string) => {
  const n = Number(String(s).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

const normalize = (columns: string[] | undefined, rows: any): { headers: string[]; matrix: string[][] } => {
  if (!Array.isArray(rows) || rows.length === 0) return { headers: columns ?? [], matrix: [] };
  if (Array.isArray(rows[0])) {
    return { headers: columns ?? rows[0].map((_: any, i: number) => `C${i + 1}`), matrix: rows.map((r: any[]) => r.map((c) => (c == null ? "" : String(c)))) };
  }
  if (typeof rows[0] === "object") {
    const keys = columns && columns.length ? columns : Object.keys(rows[0]);
    return { headers: keys, matrix: rows.map((r: any) => keys.map((k) => (r[k] == null ? "" : String(r[k])))) };
  }
  return { headers: columns ?? [], matrix: [] };
};

export const AITable = ({ title, columns, rows }: AITableProps) => {
  const { headers, matrix } = useMemo(() => normalize(columns, rows), [columns, rows]);
  const [q, setQ] = useState("");
  const [sortIdx, setSortIdx] = useState<number | null>(null);
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = term ? matrix.filter((row) => row.some((c) => c.toLowerCase().includes(term))) : matrix.slice();
    if (sortIdx !== null) {
      r.sort((a, b) => {
        const an = numeric(a[sortIdx] ?? ""); const bn = numeric(b[sortIdx] ?? "");
        const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(a[sortIdx] ?? "").localeCompare(String(b[sortIdx] ?? ""), "tr", { numeric: true });
        return dir === "asc" ? cmp : -cmp;
      });
    }
    return r;
  }, [matrix, q, sortIdx, dir]);

  const toggle = (i: number) => sortIdx === i ? setDir(d => d === "asc" ? "desc" : "asc") : (setSortIdx(i), setDir("asc"));

  if (!headers.length) return null;

  return (
    <div data-ai-component="AITable" className="rounded-2xl border border-border/60 bg-card/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        {title && <div className="mr-auto text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title} <span className="ml-1 text-muted-foreground/60">({filtered.length}/{matrix.length})</span></div>}
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara..." className="h-7 w-32 rounded-md border border-border/60 bg-background/60 pl-7 pr-2 text-xs outline-none focus:border-primary/40" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/40">
            <tr>{headers.map((h, i) => (
              <th key={i} onClick={() => toggle(i)} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
                <span className="inline-flex items-center gap-1">{h}{sortIdx === i ? (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</span>
              </th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((r, i) => (
              <tr key={i} className="hover:bg-muted/20">
                {r.map((c, j) => {
                  const val = String(c ?? "");
                  const isNum = NUM_RE.test(val); const isStatus = STATUS_RE.test(val);
                  return (
                    <td key={j} className={`px-3 py-2 ${isNum ? "text-right font-mono tabular-nums font-semibold" : "text-left"}`}>
                      {isStatus ? <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${toneClass(val)}`}>{val}</span> : val}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={headers.length} className="px-3 py-6 text-center text-xs text-muted-foreground">Kayıt bulunamadı</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AITable;
