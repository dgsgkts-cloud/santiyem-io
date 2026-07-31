import { ArrowUpRight } from "lucide-react";
import type { SeatInfo } from "@/hooks/useCompanyUsers";

/** SPRINT 41C — one compact team summary card (no KPI grid). */
export function TeamSummary({
  seats, activeCount, invitedCount, onOpenPlan,
}: {
  seats: SeatInfo;
  activeCount: number;
  invitedCount: number;
  onOpenPlan: () => void;
}) {
  const pills = [
    `${activeCount} aktif`,
    invitedCount > 0 ? `${invitedCount} davet bekliyor` : null,
    seats.free === null ? "Sınırsız koltuk" : `${seats.free} boş koltuk`,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-[16px] border border-border/70 bg-card p-3.5">
      <div className="flex flex-wrap gap-1.5">
        {pills.map(p => (
          <span
            key={p}
            className="text-[12.5px] text-foreground/90 bg-muted/60 rounded-[8px] px-2 py-1"
          >
            {p}
          </span>
        ))}
      </div>
      <p className="text-[12.5px] text-muted-foreground mt-2.5 leading-snug">
        {seats.limit === null
          ? "Paketiniz sınırsız kullanıcı destekliyor."
          : `Mevcut paketiniz ${seats.limit} kullanıcı destekliyor (kendi hesabınız dahil).`}
      </p>

      {seats.full && (
        <div className="mt-3 rounded-[13px] border border-primary/30 bg-primary/[0.06] p-3">
          <p className="text-[13.5px] text-foreground font-medium">Kullanıcı sınırına ulaştınız.</p>
          <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-snug">
            Yeni kullanıcı davet etmek için paketinizi yükseltin.
          </p>
          <button
            type="button"
            onClick={onOpenPlan}
            className="mt-2.5 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[12px] bg-primary text-primary-foreground text-[14px] font-semibold active:opacity-90"
          >
            Paketi İncele <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default TeamSummary;
