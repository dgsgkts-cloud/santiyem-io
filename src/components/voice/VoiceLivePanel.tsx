// VoiceLivePanel — Sprint 15.4.
// Premium "always-useful" idle rail for the AI Copilot screen.
// Reuses existing systems only:
//   • useExecutiveBrief    → Health Score, top findings, agenda
//   • useConversations     → Recent Conversations
//   • exampleQuestions     → Suggested Questions
//   • canvasStore          → Recent AI activity
// No new intelligence, no new prompts, no backend changes.

import { useMemo } from "react";
import {
  Activity, AlertTriangle, ArrowRight, Clock, HardHat, MessageSquare,
  Package, Sparkle, TrendingUp, Users, Wallet, FileText, BookOpen,
  ListChecks, Radio,
} from "lucide-react";
import { useExecutiveBrief } from "@/hooks/useExecutiveBrief";
import { useConversations } from "@/hooks/useConversations";
import { useCanvasTurns } from "@/hooks/useCanvasTurns";
import { ALL_EXAMPLE_QUESTIONS } from "@/lib/exampleQuestions";

export type QuickAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
};

interface Props {
  compact?: boolean;
  onAsk: (question: string) => void;
  onNavigate: (tab: string) => void;
  onReopenConversation?: (id: string) => void;
}

const SUGGESTED = [
  "Bugünkü şantiye özetini ver",
  "Bu haftanın en kritik 3 riskini göster",
  "Vadesi gelen çekleri listele",
  "Bugün şantiyede kaç kişi var?",
  "Stoku azalan malzemeleri göster",
  "En geride kalan projem hangisi?",
];

export function VoiceLivePanel({ compact, onAsk, onNavigate, onReopenConversation }: Props) {
  const { kpis, findings, loading } = useExecutiveBrief();
  const { conversations } = useConversations();
  const { turns } = useCanvasTurns();

  const topFindings = findings.slice(0, 3);
  const recentTurns = useMemo(() => turns.slice(-3).reverse(), [turns]);
  const recentConvos = conversations.slice(0, 4);

  // Randomized rolling suggestions — stable per mount.
  const suggestions = useMemo(() => {
    const pool = [...SUGGESTED, ...ALL_EXAMPLE_QUESTIONS];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const q of pool) {
      if (seen.has(q)) continue;
      seen.add(q);
      out.push(q);
      if (out.length >= 6) break;
    }
    return out;
  }, []);

  const quickActions: QuickAction[] = [
    { id: "brief",     label: "Yönetici Brifi", icon: <Activity className="w-3.5 h-3.5" />,  onSelect: () => onAsk("Bugünkü yönetici brifingimi ver") },
    { id: "risks",     label: "Bugünkü Riskler", icon: <AlertTriangle className="w-3.5 h-3.5" />, onSelect: () => onAsk("Bugünün en kritik risklerini göster") },
    { id: "cash",      label: "Nakit Akışı",    icon: <Wallet className="w-3.5 h-3.5" />,   onSelect: () => onAsk("Bu ay nakit akışım nasıl?") },
    { id: "personnel", label: "Puantaj",        icon: <Users className="w-3.5 h-3.5" />,    onSelect: () => onAsk("Bugün şantiyede kaç kişi var?") },
    { id: "materials", label: "Stok",           icon: <Package className="w-3.5 h-3.5" />,  onSelect: () => onAsk("Stoku azalan malzemeleri göster") },
    { id: "hakedis",   label: "Hakediş",        icon: <FileText className="w-3.5 h-3.5" />, onSelect: () => onAsk("Bekleyen hakedişleri özetle") },
    { id: "projects",  label: "Proje Durumu",   icon: <HardHat className="w-3.5 h-3.5" />,  onSelect: () => onAsk("Aktif projelerimin sağlık skoru nedir?") },
    { id: "docs",      label: "Belge Ara",      icon: <BookOpen className="w-3.5 h-3.5" />, onSelect: () => onNavigate("chat") },
  ];

  const scoreColor =
    kpis.healthScore >= 80 ? "#34D399" :
    kpis.healthScore >= 60 ? "#FBBF24" :
    kpis.healthScore > 0 ? "#FF6B6B" : "#8A94A6";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkle className="w-3.5 h-3.5 text-[#FF8F5A]" strokeWidth={2.2} />
          <span className="text-[10px] uppercase tracking-[0.22em] text-white/50 font-semibold">Canlı Panel</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/80 uppercase tracking-widest">
          <Radio className="w-3 h-3" /> Hazır
        </span>
      </div>

      {/* Health Score + KPI strip */}
      <div className="voice-glass rounded-2xl p-3">
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 shrink-0">
            <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
              <circle cx="18" cy="18" r="15.5" stroke="rgba(255,255,255,0.08)" strokeWidth="3" fill="none" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke={scoreColor} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${(kpis.healthScore / 100) * 97.4} 97.4`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-white tabular-nums">
              {loading ? "—" : kpis.healthScore}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Bugünkü Sağlık Skoru</div>
            <div className="text-sm text-white/90 leading-snug mt-0.5 truncate">
              {loading
                ? "Analiz ediliyor…"
                : findings.length === 0
                  ? "Her şey yolunda görünüyor."
                  : `${kpis.criticalRisks} kritik · ${kpis.pendingPayments} ödeme · ${kpis.tasksDueToday} görev`}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <Section icon={Sparkle} label="Hızlı Sor">
        <div className="grid grid-cols-2 gap-1.5">
          {quickActions.slice(0, compact ? 6 : 8).map((a) => (
            <button
              key={a.id}
              onClick={a.onSelect}
              className="voice-glass-btn h-10 rounded-xl px-2.5 flex items-center gap-2 text-[12.5px] text-white/85 text-left transition-all active:scale-[0.98]"
            >
              <span className="text-[#FF8F5A] shrink-0">{a.icon}</span>
              <span className="truncate">{a.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Today's agenda (from findings) */}
      {topFindings.length > 0 && (
        <Section icon={ListChecks} label="Bugünkü Gündem">
          <ul className="space-y-1">
            {topFindings.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => (f.action ? onNavigate(f.action.tab) : onAsk(f.title))}
                  className="w-full text-left voice-glass-btn rounded-xl px-3 py-2 flex items-start gap-2"
                >
                  <span
                    className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                      f.severity === "critical" ? "bg-[#FF6B6B]" :
                      f.severity === "important" ? "bg-amber-400" : "bg-white/40"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] text-white/90 leading-snug">{f.title}</span>
                    {f.detail && <span className="block text-[11px] text-white/45 leading-snug mt-0.5 truncate">{f.detail}</span>}
                  </span>
                  <ArrowRight className="w-3 h-3 text-white/30 mt-1 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Suggested questions */}
      <Section icon={MessageSquare} label="Önerilen Sorular">
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((q) => (
            <button
              key={q}
              onClick={() => onAsk(q)}
              className="voice-glass-btn rounded-full px-3 py-1.5 text-[11.5px] text-white/80 transition-all active:scale-[0.97]"
            >
              {q}
            </button>
          ))}
        </div>
      </Section>

      {/* Recent AI activity (canvas turns) */}
      {recentTurns.length > 0 && (
        <Section icon={Activity} label="Son AI Aktivitesi">
          <ul className="space-y-1">
            {recentTurns.map((t) => (
              <li key={t.id} className="voice-glass rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 mb-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(t.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span>·</span>
                  <span>{t.source === "voice" ? "Ses" : "Sohbet"}</span>
                </div>
                <div className="text-[12.5px] text-white/85 line-clamp-2">{t.question || t.speech}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Recent conversations */}
      {recentConvos.length > 0 && (
        <Section icon={MessageSquare} label="Son Sohbetler">
          <ul className="space-y-1">
            {recentConvos.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => (onReopenConversation ? onReopenConversation(c.id) : onNavigate("chat"))}
                  className="w-full text-left voice-glass-btn rounded-xl px-3 py-2 flex items-center gap-2"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <span className="min-w-0 flex-1 text-[12.5px] text-white/85 truncate">{c.title || "Sohbet"}</span>
                  <span className="text-[10px] text-white/35 tabular-nums shrink-0">
                    {new Date(c.updated_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Footer KPI mini strip */}
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        <MiniKpi icon={Wallet} label="Kasa" value={compactCurrency(kpis.cashOnHand)} />
        <MiniKpi icon={TrendingUp} label="Ciro" value={compactCurrency(kpis.monthRevenue)} />
        <MiniKpi icon={HardHat} label="Proje" value={String(kpis.activeProjects)} />
      </div>
    </div>
  );
}

function Section({
  icon: Icon, label, children,
}: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-1 mb-1.5">
        <Icon className="w-3 h-3 text-white/40" strokeWidth={2.2} />
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">{label}</span>
      </div>
      {children}
    </div>
  );
}

function MiniKpi({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="voice-glass rounded-xl px-2 py-2 flex flex-col items-start gap-0.5">
      <Icon className="w-3 h-3 text-[#FF8F5A]" strokeWidth={2.2} />
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="text-[12.5px] text-white/90 font-semibold tabular-nums truncate w-full">{value}</div>
    </div>
  );
}

function compactCurrency(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₺`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}K ₺`;
  return `${Math.round(n)} ₺`;
}

export default VoiceLivePanel;
