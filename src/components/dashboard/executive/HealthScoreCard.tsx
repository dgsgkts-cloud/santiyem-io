interface HealthScoreCardProps {
  score: number;
  label?: string;
}

export function HealthScoreCard({ score, label = "Şirket Sağlık Skoru" }: HealthScoreCardProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone =
    clamped >= 80 ? "text-emerald-500" : clamped >= 60 ? "text-amber-500" : "text-destructive";
  const ringColor =
    clamped >= 80 ? "#10b981" : clamped >= 60 ? "#f59e0b" : "hsl(var(--destructive))";
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-4">
      <div className="relative w-20 h-20 flex-shrink-0">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="34" strokeWidth="6" className="stroke-muted/40" fill="none" />
          <circle
            cx="40"
            cy="40"
            r="34"
            strokeWidth="6"
            stroke={ringColor}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center font-semibold text-lg tabular-nums ${tone}`}>
          {clamped}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-[15px] text-foreground font-medium mt-0.5">
          {clamped >= 80 ? "Sağlıklı" : clamped >= 60 ? "Dikkat" : "Kritik"}
        </div>
      </div>
    </div>
  );
}
