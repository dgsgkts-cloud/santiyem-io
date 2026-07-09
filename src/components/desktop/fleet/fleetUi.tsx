// Sprint M1.6 — Fleet UI atoms.
import { STATUS_META, type EqStatus } from "./fleetConstants";

export const HealthDot = ({ score }: { score: number }) => {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-fs-xs text-foreground/70 tabular-nums w-8 text-right">{score}</span>
    </div>
  );
};

export const StatusPill = ({ s }: { s: EqStatus }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-fs-xs border ${STATUS_META[s].cls}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s].dot}`} />
    {STATUS_META[s].label}
  </span>
);
