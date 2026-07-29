import { useState } from "react";
import { Wallet, FolderOpen, HardHat, TrendingUp, FileSearch, BarChart3, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { SantiyemMark } from "@/components/brand/SantiyemLogo";
import { EXAMPLE_QUESTION_GROUPS } from "@/lib/exampleQuestions";

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
}

const suggestions = [
  { icon: Wallet, text: "Bu hakedişte hangi kalemlerde anormal artış var?", label: "HAKEDİŞ" },
  { icon: FolderOpen, text: "Bu ay en çok harcama yaptığımız 3 kalem hangisi?", label: "PROJE" },
  { icon: HardHat, text: "Bu hızla proje ne zaman tamamlanır, gecikme riski var mı?", label: "ŞANTİYE" },
  { icon: TrendingUp, text: "Önümüzdeki 30 günde nakit açığı oluşur mu?", label: "NAKİT" },
];

const WelcomeScreen = ({ onSuggestionClick }: WelcomeScreenProps) => {
  const [showLibrary, setShowLibrary] = useState(false);
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in pt-8 sm:pt-0">
      <SantiyemMark size="lg" className="mb-4 mt-4 sm:mt-0 brand-logo-enter" />
      <h1 className="text-2xl font-bold text-foreground mb-1">Şantiyem</h1>
      <p className="text-muted-foreground text-sm mb-8 text-center max-w-md">
        Türk mimar, mühendis ve müteahhitler için yapay zeka asistanı
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onSuggestionClick(s.text)}
            className="glass-card rounded-lg p-4 text-left hover:border-primary/30 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md accent-gradient flex items-center justify-center">
                <s.icon className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="text-xs font-semibold text-accent uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
              {s.text}
            </p>
          </button>
        ))}
      </div>

      <div className="w-full max-w-xl mt-6">
        <button
          onClick={() => setShowLibrary((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="w-4 h-4 text-[#FF6B2B]" />
            50+ Örnek Soru Kütüphanesi
          </span>
          {showLibrary ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showLibrary && (
          <div className="mt-3 space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {EXAMPLE_QUESTION_GROUPS.map((g) => (
              <div key={g.label} className="rounded-lg border border-border bg-card/60 p-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  <span className="mr-1">{g.emoji}</span> {g.label}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.questions.map((q) => (
                    <button
                      key={q}
                      onClick={() => onSuggestionClick(q)}
                      className="text-[11px] leading-tight text-left px-2 py-1.5 rounded-md bg-background border border-border hover:border-[#FF6B2B] hover:text-[#FF6B2B] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      <div className="mt-8 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          <span>Hakediş Analizi</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Proje Durumu</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Nakit Akışı</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
