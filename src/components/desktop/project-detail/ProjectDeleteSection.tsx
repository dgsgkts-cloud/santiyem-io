import { Trash2 } from "lucide-react";
import { SectionCard } from "@/components/ui/responsive";

export default function ProjectDeleteSection({ onDelete }: { onDelete: () => void }) {
  return (
    <SectionCard className="border-destructive/30">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-fs-md font-semibold" style={{ color: "#EF4444" }}>Projeyi Sil</h3>
          <p className="text-fs-xs mt-0.5 text-muted-foreground">
            Bu işlem geri alınamaz. Tüm hakediş, dosya ve kilometre taşı verileri silinir.
          </p>
        </div>
        <button
          onClick={onDelete}
          className="flex items-center gap-2 px-4 min-h-[44px] rounded-lg text-fs-sm font-semibold text-white shrink-0"
          style={{ backgroundColor: "#EF4444" }}
        >
          <Trash2 className="w-4 h-4" /> Projeyi Sil
        </button>
      </div>
    </SectionCard>
  );
}
