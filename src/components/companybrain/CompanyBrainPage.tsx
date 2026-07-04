import { Brain, Sparkles, BookOpen, FileText, History, ArrowRight } from "lucide-react";
import CompanyMemoryPanel from "@/components/memory/CompanyMemoryPanel";
import KnowledgeBasePanel from "@/components/companybrain/KnowledgeBasePanel";

export type CompanyBrainSection =
  | "memory" | "knowledge-base" | "ai-decisions" | "decision-history" | "documents";

const TABS: { id: CompanyBrainSection; label: string; icon: React.ElementType; soon?: boolean }[] = [
  { id: "memory", label: "Company Memory", icon: Brain },
  { id: "knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { id: "ai-decisions", label: "AI Decisions", icon: Sparkles },
  { id: "decision-history", label: "Decision History", icon: History },
  { id: "documents", label: "Documents", icon: FileText, soon: true },
];

function ComingSoon({ label, description }: { label: string; description: string }) {
  return (
    <div className="max-w-2xl mx-auto p-8 text-center space-y-3">
      <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{label}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <p className="text-xs uppercase tracking-wider text-primary font-semibold">Yakında</p>
    </div>
  );
}

function AIDecisions() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">AI Kararları</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Construction Brain'in ürettiği aksiyon önerileri burada listelenir. Dashboard'daki
        Executive Brief üzerinden gelen öneriler otomatik olarak buraya akar.
      </p>
      <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
        Henüz kayıt yok — AI yeni bir öneri ürettiğinde burada görünecek.
      </div>
    </div>
  );
}

function DecisionHistory() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">Karar Geçmişi</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Onayladığın ve uyguladığın AI kararları burada saklanır. Zaman içinde şirketinin
        karar örüntüsünü görebilirsin.
      </p>
      <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
        Henüz uygulanmış karar yok.
      </div>
    </div>
  );
}

export default function CompanyBrainPage({
  section, onSectionChange,
}: { section: CompanyBrainSection; onSectionChange: (s: CompanyBrainSection) => void }) {
  return (
    <div className="flex flex-col">
      {/* Sub-nav */}
      <div className="border-b border-border bg-card/40 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-1 px-4 overflow-x-auto">
          {TABS.map((t) => {
            const active = t.id === section;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => onSectionChange(t.id)}
                className="flex items-center gap-2 px-3 py-3 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors"
                style={{
                  borderColor: active ? "hsl(var(--primary))" : "transparent",
                  color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                }}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {t.soon && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Yakında
                  </span>
                )}
                {active && <ArrowRight className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1">
        {section === "memory" && <CompanyMemoryPanel />}
        {section === "ai-decisions" && <AIDecisions />}
        {section === "decision-history" && <DecisionHistory />}
        {section === "knowledge-base" && <KnowledgeBasePanel />}
        {section === "documents" && (
          <ComingSoon
            label="Belgeler"
            description="Sözleşmeler, teknik şartnameler, prosedür belgeleri — hepsi AI tarafından okunabilir ve aranabilir olacak."
          />
        )}
      </div>
    </div>
  );
}
