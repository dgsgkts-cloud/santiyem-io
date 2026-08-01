import { useState } from "react";
import { ChevronDown, Info, Lock, ShieldCheck, Download } from "lucide-react";
import { HealthScoreCard } from "@/components/dashboard/executive/HealthScoreCard";
import { Button } from "@/components/ui/button";
import { useCompanyHealth } from "@/hooks/useCompanyHealth";
import {
  DENIED_MESSAGE,
  NOT_COMPUTABLE_MESSAGE,
  SCOPE_LABELS,
  SECTION_LABELS,
  completenessCopy,
} from "@/lib/companyHealth";

interface Props {
  /** When false the locked notice is hidden entirely (dashboard grids). */
  showDeniedNotice?: boolean;
  onExport?: () => void;
}

/**
 * Permission-aware "Firma Sağlığı" card. The score, its factors and every
 * figure come from the server RPC, so an unauthorized user renders either
 * nothing or a plain explanation — never a masked number.
 */
export function CompanyHealthCard({ showDeniedNotice = true, onExport }: Props) {
  const { loading, payload, denied, access, logAccess } = useCompanyHealth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-4 h-[104px] animate-pulse" />
    );
  }

  if (denied || !payload) {
    if (!showDeniedNotice) return null;
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-start gap-3">
        <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-foreground">Firma Sağlığı</div>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{DENIED_MESSAGE}</p>
        </div>
      </div>
    );
  }

  const score = payload.score;
  const computable = payload.computable && score !== null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      {computable ? (
        <HealthScoreCard score={score as number} label="Firma Sağlık Skoru" />
      ) : (
        <div className="p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <div className="text-[13px] font-medium text-foreground">Firma Sağlığı</div>
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
              {NOT_COMPUTABLE_MESSAGE}
            </p>
          </div>
        </div>
      )}

      <div className="px-4 pb-3 -mt-1">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{SCOPE_LABELS[access?.scope ?? "none"]}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) logAccess("overview", "expand");
          }}
          className="mt-2 flex items-center gap-1.5 text-[12px] text-primary min-h-[32px]"
        >
          Bu skor nasıl hesaplandı?
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="mt-2 space-y-2">
            <p className="text-[11px] text-muted-foreground">{completenessCopy(payload.completeness)}</p>
            {payload.factors.length === 0 && (
              <p className="text-[12px] text-muted-foreground">
                Hesaplamaya girecek kayıt bulunamadı.
              </p>
            )}
            {payload.factors.map((f) => (
              <div key={f.key} className="rounded-xl border border-border/50 bg-background/40 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-foreground">{f.label}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    %{f.weight} · {SECTION_LABELS[f.section] ?? f.section}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{f.detail}</p>
              </div>
            ))}

            {access?.can_export && onExport && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-1"
                onClick={() => {
                  logAccess("overview", "export");
                  onExport();
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Raporu indir
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
