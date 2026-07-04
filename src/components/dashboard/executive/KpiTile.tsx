import { LucideIcon } from "lucide-react";

interface KpiTileProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  delta?: string;
  severity?: "critical" | "important" | "info" | "good" | "neutral";
  onClick?: () => void;
}

const severityRing: Record<NonNullable<KpiTileProps["severity"]>, string> = {
  critical: "border-destructive/40 bg-destructive/[0.06]",
  important: "border-amber-500/40 bg-amber-500/[0.06]",
  info: "border-border/60 bg-card",
  good: "border-emerald-500/30 bg-emerald-500/[0.05]",
  neutral: "border-border/60 bg-card",
};

const iconTone: Record<NonNullable<KpiTileProps["severity"]>, string> = {
  critical: "text-destructive",
  important: "text-amber-500",
  info: "text-muted-foreground",
  good: "text-emerald-500",
  neutral: "text-muted-foreground",
};

export function KpiTile({ icon: Icon, label, value, delta, severity = "neutral", onClick }: KpiTileProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`text-left w-full rounded-2xl border p-4 transition-colors ${severityRing[severity]} ${
        onClick ? "hover:border-primary/50 cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconTone[severity]}`} strokeWidth={2} />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className="text-[22px] font-semibold text-foreground leading-none tabular-nums">{value}</div>
      {delta && <div className="text-[11.5px] text-muted-foreground mt-1.5">{delta}</div>}
    </Comp>
  );
}
