import { useEffect, useMemo, useState } from "react";
import {
  Sun, Sparkles, PlayCircle, X, Settings2, AlertTriangle, Target,
  Wallet, FolderOpen, Lightbulb, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_BRIEFING_SETTINGS, loadBriefingSettings, saveBriefingSettings,
  markBriefingShown, wasBriefingShownToday, type BriefingSettings,
} from "@/lib/briefingSettings";

type Section =
  | { kind: "greeting"; text: string }
  | { kind: "status"; text: string }
  | { kind: "risks"; text: string; items: string[] }
  | { kind: "priorities"; text: string; items: string[] }
  | { kind: "positives"; text: string; items: string[] }
  | { kind: "recommendation"; text: string };

interface Card {
  id: string;
  type: "critical_risk" | "priority" | "financial" | "project" | "recommendation";
  title: string;
  value?: string;
  detail?: string;
  tone: "positive" | "warning" | "danger" | "neutral";
}

interface Briefing {
  is_empty: boolean;
  greeting: string;
  summary: {
    health_score: number;
    active_projects: number;
    overdue_tasks: number;
    overdue_payments: number;
    critical_stock: number;
    completed_recent: number;
  };
  sections: Section[];
  cards: Card[];
  spoken_text: string;
  question: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * AI Executive Daily Briefing card.
 * - Runs once per day per user (unless manually re-triggered).
 * - Renders section-by-section with dashboard cards.
 * - "Sesli Dinle" hands off spoken_text to the Voice Copilot as initialContext.
 */
export function MorningBriefingCard() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visibleSections, setVisibleSections] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<BriefingSettings>(() => loadBriefingSettings());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { saveBriefingSettings(settings); }, [settings]);

  const fetchBriefing = async (force = false) => {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess?.session?.access_token;
      if (!jwt) return;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/morning-briefing`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        const b = (await res.json()) as Briefing;
        setBriefing(b);
        setVisibleSections(0);
        if (!force) markBriefingShown();
      }
    } finally { setLoading(false); }
  };

  // Auto-run once per day if enabled.
  useEffect(() => {
    if (!settings.auto_morning) { setDismissed(true); return; }
    if (wasBriefingShownToday()) { setDismissed(true); return; }
    fetchBriefing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cards appear in sync with the spoken briefing (fake pacing so the UI
  // still feels alive even when the TTS isn't playing back in this pane).
  useEffect(() => {
    if (!briefing || briefing.is_empty) return;
    const total = briefing.sections.length;
    setVisibleSections(1);
    const id = setInterval(() => {
      setVisibleSections((v) => {
        if (v >= total) { clearInterval(id); return v; }
        return v + 1;
      });
    }, 700);
    return () => clearInterval(id);
  }, [briefing]);

  const visibleCards = useMemo(() => {
    if (!briefing || !settings.dashboard_cards) return [];
    // Reveal cards proportional to spoken progress
    const ratio = briefing.sections.length ? visibleSections / briefing.sections.length : 1;
    return briefing.cards.slice(0, Math.max(1, Math.ceil(briefing.cards.length * ratio)));
  }, [briefing, visibleSections, settings.dashboard_cards]);

  if (dismissed && !showSettings) return null;

  const startVoice = () => {
    if (briefing?.spoken_text && settings.voice_enabled) {
      (window as unknown as { __briefingText?: string }).__briefingText = briefing.spoken_text;
    }
    window.dispatchEvent(new CustomEvent("open-voice-copilot"));
    setDismissed(true);
  };

  return (
    <div className="voice-card-in rounded-2xl border border-[#FF6B2B]/30 bg-gradient-to-br from-[#FF6B2B]/10 via-[#0F1419]/60 to-transparent backdrop-blur-xl p-5 mb-4 relative">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#FF6B2B]">
          <Sun className="w-3.5 h-3.5" /> Yönetici Brifingi
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="text-white/40 hover:text-white/80 p-1 rounded-md hover:bg-muted/60"
            aria-label="Brifing ayarları"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/40 hover:text-white/80 p-1 rounded-md hover:bg-muted/60"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showSettings && (
        <BriefingSettingsPanel
          settings={settings}
          onChange={setSettings}
          onRegenerate={() => { setShowSettings(false); fetchBriefing(true); }}
        />
      )}

      {loading && !briefing ? (
        <div className="text-white/50 text-sm py-6">Brifing hazırlanıyor…</div>
      ) : briefing ? (
        briefing.is_empty ? (
          <div className="text-white/80 text-[15px] leading-relaxed">
            {briefing.sections.map((s, i) => <p key={i} className="mb-2">{s.text}</p>)}
          </div>
        ) : (
          <>
            {/* Spoken sections, revealed in sequence */}
            <div className="space-y-2.5">
              {briefing.sections.slice(0, visibleSections).map((s, i) => (
                <SectionLine key={i} section={s} />
              ))}
            </div>

            {/* Dashboard cards, in sync */}
            {visibleCards.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                {visibleCards.map((c) => <DashboardCard key={c.id} card={c} />)}
              </div>
            )}

            {/* CTA row */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {settings.voice_enabled && (
                <Button onClick={startVoice} className="bg-[#FF6B2B] hover:bg-[#FF7A3F] text-white">
                  <PlayCircle className="w-4 h-4 mr-1.5" /> Sesli Dinle
                </Button>
              )}
              <Button variant="ghost" onClick={() => fetchBriefing(true)} className="text-white/70 hover:text-white">
                <Sparkles className="w-4 h-4 mr-1.5" /> Yenile
              </Button>
              <Button
                variant="ghost"
                onClick={() => setExpanded((e) => !e)}
                className="text-white/50 hover:text-white/80 ml-auto"
              >
                {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                {expanded ? "Kapat" : "Tam metin"}
              </Button>
            </div>

            {expanded && (
              <p className="mt-3 text-white/70 text-sm leading-relaxed italic border-t border-white/10 pt-3">
                {briefing.spoken_text}
              </p>
            )}
          </>
        )
      ) : null}
    </div>
  );
}

function SectionLine({ section }: { section: Section }) {
  const icon =
    section.kind === "greeting" ? <Sun className="w-4 h-4 text-[#FF6B2B]" /> :
    section.kind === "status" ? <FolderOpen className="w-4 h-4 text-blue-400" /> :
    section.kind === "risks" ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
    section.kind === "priorities" ? <Target className="w-4 h-4 text-amber-400" /> :
    section.kind === "positives" ? <Sparkles className="w-4 h-4 text-emerald-400" /> :
    <Lightbulb className="w-4 h-4 text-[#FF6B2B]" />;
  return (
    <div className="voice-card-in flex items-start gap-2.5 text-white text-[15px] leading-relaxed">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p className={section.kind === "recommendation" ? "font-medium" : ""}>{section.text}</p>
    </div>
  );
}

function DashboardCard({ card }: { card: Card }) {
  const tone =
    card.tone === "danger" ? "border-red-500/40 bg-red-500/10 text-red-100" :
    card.tone === "warning" ? "border-amber-500/40 bg-amber-500/10 text-amber-100" :
    card.tone === "positive" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100" :
    "border-white/15 bg-white/5 text-white";
  const icon =
    card.type === "critical_risk" ? <AlertTriangle className="w-3.5 h-3.5" /> :
    card.type === "priority" ? <Target className="w-3.5 h-3.5" /> :
    card.type === "financial" ? <Wallet className="w-3.5 h-3.5" /> :
    card.type === "project" ? <FolderOpen className="w-3.5 h-3.5" /> :
    <Lightbulb className="w-3.5 h-3.5" />;
  return (
    <div className={`voice-card-in rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-70">
        {icon}<span>{card.title}</span>
      </div>
      <div className="text-sm font-semibold mt-1 line-clamp-2">{card.value}</div>
      {card.detail && <div className="text-[11px] opacity-70 mt-0.5">{card.detail}</div>}
    </div>
  );
}

function BriefingSettingsPanel({
  settings, onChange, onRegenerate,
}: {
  settings: BriefingSettings;
  onChange: (s: BriefingSettings) => void;
  onRegenerate: () => void;
}) {
  const Row = ({ k, label }: { k: keyof BriefingSettings; label: string }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-white/80">{label}</span>
      <Switch checked={settings[k]} onCheckedChange={(v) => onChange({ ...settings, [k]: v })} />
    </div>
  );
  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="text-[11px] uppercase tracking-widest text-white/50 mb-2">AI Brifing Ayarları</div>
      <Row k="auto_morning" label="Otomatik sabah brifingi" />
      <Row k="voice_enabled" label="Sesli brifing" />
      <Row k="dashboard_cards" label="Gösterge kartları" />
      <Row k="include_financial" label="Finansal özet" />
      <Row k="include_risks" label="Proje riskleri" />
      <Row k="include_personnel" label="Personel özeti" />
      <Row k="include_materials" label="Malzeme özeti" />
      <div className="flex justify-end gap-2 mt-2">
        <Button size="sm" variant="ghost" onClick={() => onChange(DEFAULT_BRIEFING_SETTINGS)} className="text-white/60">
          Sıfırla
        </Button>
        <Button size="sm" onClick={onRegenerate} className="bg-[#FF6B2B] hover:bg-[#FF7A3F] text-white">
          Yeniden Oluştur
        </Button>
      </div>
    </div>
  );
}
