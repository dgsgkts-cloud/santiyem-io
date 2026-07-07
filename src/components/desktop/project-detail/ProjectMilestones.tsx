import { CheckCircle2, Plus, X, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/ui/responsive";

interface MilestoneLike {
  id: string;
  title: string;
  milestone_date: string;
  completed: boolean;
}

interface Props {
  canEdit: boolean;
  loading: boolean;
  milestones: MilestoneLike[];
  completedCount: number;
  totalCount: number;
  displayProgress: number;
  showAdd: boolean;
  onToggleAdd: () => void;
  newTitle: string;
  newDate: string;
  onTitleChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
  onRequestDelete: (id: string, title: string) => void;
}

export default function ProjectMilestones(p: Props) {
  return (
    <SectionCard
      title="Kilometre Taşları"
      action={
        <div className="flex items-center gap-2">
          <span
            className="text-fs-xs font-medium px-2 py-0.5 rounded-md"
            style={{ backgroundColor: "rgba(255,107,43,0.1)", color: "#FF6B2B" }}
          >
            {p.completedCount}/{p.totalCount}
          </span>
          {p.canEdit && (
            <button
              onClick={p.onToggleAdd}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
              style={{ backgroundColor: p.showAdd ? "#EF4444" : "#FF6B2B" }}
              aria-label={p.showAdd ? "İptal" : "Kilometre taşı ekle"}
            >
              {p.showAdd ? <X className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5 text-white" />}
            </button>
          )}
        </div>
      }
    >
      {p.showAdd && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4 p-3 rounded-lg bg-background border border-border">
          <input
            value={p.newTitle}
            onChange={e => p.onTitleChange(e.target.value)}
            placeholder="Görev adı"
            className="flex-1 px-3 py-2 rounded-lg text-fs-sm outline-none bg-card border border-border text-foreground"
          />
          <input
            value={p.newDate}
            onChange={e => p.onDateChange(e.target.value)}
            placeholder="Tarih (ör: 01.05.2026)"
            className="w-full sm:w-40 px-3 py-2 rounded-lg text-fs-sm outline-none bg-card border border-border text-foreground"
          />
          <button
            onClick={p.onAdd}
            className="px-4 min-h-[44px] rounded-lg text-fs-xs font-semibold text-white"
            style={{ backgroundColor: "#22C55E" }}
          >
            Ekle
          </button>
        </div>
      )}

      {p.loading ? (
        <p className="text-fs-xs text-muted-foreground">Yükleniyor...</p>
      ) : (
        <div className="space-y-2">
          {p.milestones.map(m => (
            <div key={m.id} className="flex items-center gap-3 group">
              <button
                onClick={() => p.canEdit && p.onToggle(m.id)}
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${p.canEdit ? "cursor-pointer hover:opacity-80" : ""}`}
                style={{
                  backgroundColor: m.completed ? "#22C55E" : "transparent",
                  border: m.completed ? "none" : "2px solid hsl(var(--border))",
                }}
                disabled={!p.canEdit}
                aria-label="Tamamlandı işaretle"
              >
                {m.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-fs-sm font-medium truncate ${m.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {m.title}
                </p>
              </div>
              <span className="text-fs-xs font-mono shrink-0 text-muted-foreground">{m.milestone_date}</span>
              {p.canEdit && (
                <button
                  onClick={() => p.onRequestDelete(m.id, m.title)}
                  className="w-8 h-8 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                  aria-label="Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-fs-xs text-muted-foreground">İlerleme</span>
          <span className="text-fs-xs font-mono font-medium" style={{ color: "#FF6B2B" }}>
            {p.displayProgress}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ backgroundColor: "#FF6B2B", width: `${p.displayProgress}%` }}
          />
        </div>
      </div>
    </SectionCard>
  );
}
