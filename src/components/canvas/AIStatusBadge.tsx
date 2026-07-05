import { useCanvasTurns } from "@/hooks/useCanvasTurns";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/canvasAdapter";

export const AIStatusBadge = ({ status: statusOverride }: { status?: string } = {}) => {
  const state = useCanvasTurns();
  const status = (statusOverride as any) || state.status;
  const active = status !== "idle" && status !== "completed";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${STATUS_TONE[status as keyof typeof STATUS_TONE] || STATUS_TONE.idle}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full bg-current ${active ? "animate-pulse-dot" : "opacity-60"}`}
      />
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || STATUS_LABELS.idle}
    </span>
  );
};

export default AIStatusBadge;
