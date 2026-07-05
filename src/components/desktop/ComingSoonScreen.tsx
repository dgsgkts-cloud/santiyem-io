import { Sparkles } from "lucide-react";

/**
 * Sprint 15.2 — Menüden kaldırılan veya henüz hazır olmayan sekmeler için
 * profesyonel "Yakında" ekranı. 404 yerine tasarım diline uygun bir empty
 * state gösterir.
 */
export default function ComingSoonScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <h2
          className="text-[20px] font-semibold text-foreground tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {title}
        </h2>
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
        <p className="text-[10.5px] uppercase tracking-widest font-semibold text-primary/80">
          Yakında
        </p>
      </div>
    </div>
  );
}
