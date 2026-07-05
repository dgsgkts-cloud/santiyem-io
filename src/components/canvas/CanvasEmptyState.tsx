import { Sparkles, Mic, Play, LayoutDashboard } from "lucide-react";
import { EXAMPLE_QUESTION_GROUPS } from "@/lib/exampleQuestions";
import { dispatchFollowup } from "@/lib/canvasAdapter";

export const CanvasEmptyState = ({ onExecutiveBrief }: { onExecutiveBrief?: () => void }) => {
  const featured = EXAMPLE_QUESTION_GROUPS.slice(0, 3);
  const recent = (() => {
    try {
      const raw = localStorage.getItem("canvas_recent_questions");
      return raw ? (JSON.parse(raw) as string[]).slice(0, 4) : [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-[13px] font-semibold text-foreground">Şantiyem AI</p>
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Sorduğunuz her şey burada canlı olarak görselleşir — KPI, tablo, grafik, aksiyon ve
          kaynaklarla birlikte.
        </p>
      </div>

      {onExecutiveBrief && (
        <button
          onClick={onExecutiveBrief}
          className="w-full flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2.5 text-left hover:bg-muted transition-colors"
        >
          <LayoutDashboard className="w-4 h-4 text-primary" />
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-foreground">Yönetim Özeti</p>
            <p className="text-[11px] text-muted-foreground">Bugünkü durumu tek bakışta gör</p>
          </div>
        </button>
      )}

      {recent.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Son Sorular
          </p>
          <div className="flex flex-col gap-1.5">
            {recent.map((q, i) => (
              <button
                key={i}
                onClick={() => dispatchFollowup(q)}
                className="text-left text-[12px] px-2.5 py-1.5 rounded-md hover:bg-muted text-foreground/85"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {featured.map((g) => (
        <div key={g.label}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {g.emoji} {g.label}
          </p>
          <div className="flex flex-col gap-1.5">
            {g.questions.slice(0, 4).map((q) => (
              <button
                key={q}
                onClick={() => dispatchFollowup(q)}
                className="text-left text-[12px] px-2.5 py-1.5 rounded-md border border-border/50 hover:border-primary/40 hover:bg-primary/5 text-foreground/85 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Mic className="w-3.5 h-3.5 text-primary" />
          <p className="text-[12px] font-semibold text-foreground">Sesli Örnekler</p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          "Şantiyem" deyip: <em>bugünkü brief'i özetle</em>, <em>bu haftaki riskleri göster</em>.
        </p>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Play className="w-3.5 h-3.5 text-primary" />
          <p className="text-[12px] font-semibold text-foreground">Demo Örnekleri</p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Ayarlar → Demo verisi ile 3 aktif proje, personel ve mali kayıt yükleyebilirsin.
        </p>
      </div>
    </div>
  );
};

export default CanvasEmptyState;
