import { Progress } from "@/components/ui/progress";

export interface UsageBarProps {
  label: string;
  used: number;
  limit: number | null;   // null / negative = unlimited
  enforcement?: "hard" | "soft";
  unit?: string;
}

function fmt(n: number, unit?: string) {
  const s = new Intl.NumberFormat("tr-TR").format(n);
  return unit ? `${s} ${unit}` : s;
}

export function UsageBar({ label, used, limit, enforcement = "soft", unit }: UsageBarProps) {
  const unlimited = limit === null || limit < 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit ?? 1, 1)) * 100));
  const color =
    pct >= 100 ? "bg-destructive" :
    pct >= 95  ? "bg-destructive/80" :
    pct >= 80  ? "bg-yellow-500" : "bg-primary";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {unlimited
            ? `${fmt(used, unit)} / Sınırsız`
            : `${fmt(used, unit)} / ${fmt(limit ?? 0, unit)}`}
          <span className="ml-2 opacity-60">
            {enforcement === "hard" ? "Sıkı" : "Esnek"}
          </span>
        </span>
      </div>
      {!unlimited && (
        <Progress value={pct} className="h-2" indicatorClassName={color} />
      )}
    </div>
  );
}
