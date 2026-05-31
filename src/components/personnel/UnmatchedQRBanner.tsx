import { useState } from "react";
import { AlertTriangle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PersonnelForm from "./PersonnelForm";
import type { UnmatchedQR } from "@/hooks/useAttendanceGrid";

interface Props {
  unmatched: UnmatchedQR[];
  onAdded?: () => void;
}

export default function UnmatchedQRBanner({ unmatched, onAdded }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [initial, setInitial] = useState<any>(null);

  if (!unmatched || unmatched.length === 0) return null;

  // Dedupe by phone + name
  const unique = Array.from(new Map(unmatched.map((u) => [`${u.phone}-${u.full_name}`, u])).values()).slice(0, 5);

  return (
    <>
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
        <div className="flex items-start gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">
              {unmatched.length} tanımsız QR girişi
            </p>
            <p className="text-xs text-amber-200/70">
              Aşağıdaki kişiler personel listesinde yok. Çalışma tipini seçip ekleyin ki maliyet doğru hesaplansın.
            </p>
          </div>
        </div>
        <div className="space-y-1">
          {unique.map((u) => (
            <div key={u.worker_attendance_id} className="flex items-center justify-between gap-2 text-sm bg-background/40 rounded px-2 py-1">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{u.full_name}</span>
                {u.phone && <span className="text-xs text-muted-foreground ml-2">{u.phone}</span>}
                {u.occupation && <span className="text-xs text-muted-foreground ml-2">· {u.occupation}</span>}
              </div>
              <Button size="sm" variant="outline" onClick={() => {
                setInitial({
                  full_name: u.full_name,
                  phone: u.phone ?? "",
                  occupation: u.occupation ?? u.title ?? "",
                  employment_type: "daily_wage",
                  project_ids: [u.project_id],
                });
                setShowForm(true);
              }}>
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Listeye Ekle
              </Button>
            </div>
          ))}
        </div>
      </div>
      <PersonnelForm
        open={showForm}
        onClose={() => { setShowForm(false); setInitial(null); onAdded?.(); }}
        initial={initial}
      />
    </>
  );
}
