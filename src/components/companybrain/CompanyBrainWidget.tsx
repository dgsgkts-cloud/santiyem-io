import { Brain, Pin, Clock, ArrowUpRight } from "lucide-react";
import { useCompanyMemory } from "@/hooks/useCompanyMemory";

interface Props {
  onOpen: () => void;
}

export default function CompanyBrainWidget({ onOpen }: Props) {
  const { memories, loading } = useCompanyMemory();

  const total = memories.length;
  const pinned = memories.filter((m) => m.pinned).length;
  const recent = memories
    .slice()
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3);

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors p-5 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Şantiyem AI
            </p>
            <h3 className="text-[15px] font-semibold text-foreground">Şirket Hafızası</h3>
          </div>
        </div>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <p className="text-[11px] text-muted-foreground">Toplam</p>
          <p className="text-xl font-semibold text-foreground">{loading ? "…" : total}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Pin className="w-3 h-3" /> Sabit
          </p>
          <p className="text-xl font-semibold text-foreground">{loading ? "…" : pinned}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Son kullanılan
        </p>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Henüz kayıt yok — AI'ya bir şey öğret.</p>
        ) : (
          <ul className="space-y-1">
            {recent.map((m) => (
              <li key={m.id} className="text-xs text-foreground truncate">
                • {m.title || m.content.slice(0, 60)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </button>
  );
}
