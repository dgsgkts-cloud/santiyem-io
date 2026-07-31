import { ReactNode } from "react";
import {
  AlertTriangle, ChevronRight, Sparkles, X, Plus, ClipboardList,
  Package, FileText, MoreHorizontal, CheckCircle2, Users, Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";

export interface TodayItem { id: string; label: string; Icon: typeof Users }
export interface IssueItem {
  id: string; title: string; severity: "critical" | "warning";
  actionLabel: string; onAction: () => void;
}
export interface ActivityRow { id: string; text: string; time: string }

interface Props {
  progressPct: number;
  doneItems: number;
  totalItems: number;
  phase: string;
  plannedEnd: string;
  today: TodayItem[];
  todayMoreCount: number;
  onSeeAllToday: () => void;
  issues: IssueItem[];
  issuesTotal: number;
  onSeeAllIssues: () => void;
  budget: number;
  spent: number;
  approvedHakedis: number;
  outstanding: number;
  onOpenFinance: () => void;
  activity: ActivityRow[];
  onSeeAllActivity: () => void;
  quickActions: { label: string; Icon: typeof Plus; onClick: () => void }[];
  onQuickOverflow: () => void;
  aiInsight?: { text: string; onPrepare: () => void; onDismiss: () => void };
  notes: { id: string; content: string; time: string }[];
  onAddNote: () => void;
}

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-[10px]">
      <h2 className="text-[17px] font-semibold text-foreground">{children}</h2>
      {action}
    </div>
  );
}

function LinkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[13px] font-medium text-primary min-h-[44px] px-1 -mr-1">
      {label}
    </button>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[16px] border border-border/60 bg-card p-4 ${className}`}>{children}</div>
  );
}

/** SPRINT 41A — mobile Genel Bakış: durum, bugün, risk, finans, saha, aksiyon. */
export default function MobileProjectOverview(p: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Contextual AI (max 1) */}
      {p.aiInsight && (
        <div className="rounded-[16px] border border-primary/25 bg-primary/[0.06] p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-primary tracking-wide">AI ÖNERİSİ</div>
              <p className="text-[14px] text-foreground mt-1 leading-snug">{p.aiInsight.text}</p>
              <button
                onClick={p.aiInsight.onPrepare}
                className="mt-2.5 h-9 px-3 rounded-[10px] bg-primary text-primary-foreground text-[13px] font-medium"
              >
                Hazırla
              </button>
            </div>
            <button
              onClick={p.aiInsight.onDismiss}
              aria-label="Öneriyi kapat"
              className="h-8 w-8 -mt-1 -mr-1 flex items-center justify-center text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* A — Progress */}
      <Card>
        <div className="flex items-end justify-between">
          <div className="text-[30px] leading-none font-bold text-foreground">%{p.progressPct}</div>
          <div className="text-[12px] text-muted-foreground pb-1">Tamamlandı</div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, Math.max(0, p.progressPct))}%` }}
          />
        </div>
        <div className="mt-3 space-y-1">
          <div className="text-[14px] text-foreground">
            {p.totalItems > 0 ? `${p.doneItems} / ${p.totalItems} imalat tamamlandı` : "İmalat kaydı yok"}
          </div>
          <div className="text-[13px] text-muted-foreground">{p.phase}</div>
          <div className="text-[13px] text-muted-foreground">Planlanan teslim: {p.plannedEnd || "—"}</div>
        </div>
      </Card>

      {/* B — Today */}
      <section>
        <SectionLabel
          action={p.todayMoreCount > 0 ? <LinkButton label="Tümünü Gör" onClick={p.onSeeAllToday} /> : undefined}
        >
          Bugünün Durumu
        </SectionLabel>
        <div className="rounded-[16px] border border-border/60 bg-card divide-y divide-border/50">
          {p.today.length === 0 && (
            <div className="px-4 py-3 text-[14px] text-muted-foreground">Bugün için kayıt yok</div>
          )}
          {p.today.map(({ id, label, Icon }) => (
            <div key={id} className="flex items-center gap-3 px-4 min-h-[48px] py-2">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-[14px] text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* C — Critical issues */}
      <section>
        <SectionLabel
          action={p.issuesTotal > p.issues.length ? <LinkButton label="Tümünü Gör" onClick={p.onSeeAllIssues} /> : undefined}
        >
          Kritik Konular
        </SectionLabel>
        {p.issues.length === 0 ? (
          <div className="rounded-[16px] border border-border/60 bg-card px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-[14px] text-muted-foreground">Kritik konu yok</span>
          </div>
        ) : (
          <div className="rounded-[16px] border border-border/60 bg-card divide-y divide-border/50">
            {p.issues.map((i) => (
              <button
                key={i.id}
                onClick={i.onAction}
                className="w-full text-left flex items-center gap-3 px-4 min-h-[56px] py-2.5 active:bg-muted/50"
              >
                <AlertTriangle
                  className={`h-4 w-4 shrink-0 ${i.severity === "critical" ? "text-destructive" : "text-primary"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] text-foreground truncate">{i.title}</div>
                  <div className="text-[12px] text-muted-foreground">{i.actionLabel}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* D — Finance */}
      <section>
        <SectionLabel action={<LinkButton label="Finansı Aç" onClick={p.onOpenFinance} />}>
          Finansal Özet
        </SectionLabel>
        <Card>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {[
              { l: "Proje bütçesi", v: p.budget },
              { l: "Toplam harcama", v: p.spent },
              { l: "Onaylı hakediş", v: p.approvedHakedis },
              { l: "Kalan bakiye", v: p.outstanding },
            ].map((it) => (
              <div key={it.l} className="min-w-0">
                <div className="text-[12px] text-muted-foreground">{it.l}</div>
                <div className="text-[16px] font-semibold text-foreground truncate">{formatCurrency(it.v)}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* E — Site activity */}
      <section>
        <SectionLabel action={<LinkButton label="Tüm Hareketler" onClick={p.onSeeAllActivity} />}>
          Son Saha Hareketleri
        </SectionLabel>
        <div className="rounded-[16px] border border-border/60 bg-card divide-y divide-border/50">
          {p.activity.length === 0 && (
            <div className="px-4 py-3 text-[14px] text-muted-foreground">Henüz hareket yok</div>
          )}
          {p.activity.map((a) => (
            <div key={a.id} className="flex items-start gap-3 px-4 py-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] text-foreground line-clamp-2">{a.text}</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* F — Quick actions */}
      <section>
        <SectionLabel
          action={
            <button
              onClick={p.onQuickOverflow}
              aria-label="Diğer işlemler"
              className="h-11 w-11 -mr-2 flex items-center justify-center text-muted-foreground"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          }
        >
          Hızlı İşlemler
        </SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {p.quickActions.slice(0, 4).map(({ label, Icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="min-h-[56px] rounded-[14px] border border-border/60 bg-card px-3 flex items-center gap-2.5 active:bg-muted/50"
            >
              <span className="h-9 w-9 rounded-[10px] bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-[18px] w-[18px] text-primary" />
              </span>
              <span className="text-[14px] font-medium text-foreground text-left leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Notes — latest 2 */}
      <section>
        <SectionLabel
          action={
            <button
              onClick={p.onAddNote}
              aria-label="Not ekle"
              className="h-11 w-11 -mr-2 flex items-center justify-center text-primary"
            >
              <Plus className="h-5 w-5" />
            </button>
          }
        >
          Notlar
        </SectionLabel>
        {p.notes.length === 0 ? (
          <button
            onClick={p.onAddNote}
            className="w-full rounded-[16px] border border-dashed border-border bg-card px-4 py-3 text-left active:bg-muted/40"
          >
            <div className="text-[14px] text-foreground">İlk notu ekleyin</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">Sahadaki kararları ekiple paylaşın</div>
          </button>
        ) : (
          <div className="rounded-[16px] border border-border/60 bg-card divide-y divide-border/50">
            {p.notes.slice(0, 2).map((n) => (
              <div key={n.id} className="px-4 py-3">
                <div className="text-[14px] text-foreground line-clamp-2">{n.content}</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">{n.time}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export const QUICK_ACTION_ICONS = { ClipboardList, Package, FileText, Plus };
