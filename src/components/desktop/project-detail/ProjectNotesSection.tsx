import { MessageSquare, Send, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/ui/responsive";

interface NoteRow { id: string; content: string; created_at: string; }

interface Props {
  canEdit: boolean;
  loading: boolean;
  notes: NoteRow[];
  newContent: string;
  onContentChange: (v: string) => void;
  onAdd: () => void;
  onRequestDelete: (id: string, preview: string) => void;
}

export default function ProjectNotesSection(p: Props) {
  const preview = (c: string) => (c.length > 60 ? `${c.slice(0, 60)}...` : c);

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" style={{ color: "#FF6B2B" }} />
          Notlar & Yorumlar
        </span>
      }
      action={
        <span
          className="text-fs-xs font-medium px-2 py-0.5 rounded-md"
          style={{ backgroundColor: "rgba(255,107,43,0.1)", color: "#FF6B2B" }}
        >
          {p.notes.length} not
        </span>
      }
    >
      {p.canEdit && (
        <div className="flex gap-2 mb-4">
          <input
            value={p.newContent}
            onChange={e => p.onContentChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                p.onAdd();
              }
            }}
            placeholder="Not veya yorum ekleyin..."
            className="flex-1 px-3 py-2.5 rounded-lg text-fs-sm outline-none bg-background border border-border text-foreground"
          />
          <button
            onClick={p.onAdd}
            disabled={!p.newContent.trim()}
            className="min-w-[44px] min-h-[44px] px-3 rounded-lg disabled:opacity-40 flex items-center justify-center"
            style={{ backgroundColor: "#FF6B2B" }}
            aria-label="Not gönder"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {p.loading ? (
        <p className="text-fs-xs text-muted-foreground">Yükleniyor...</p>
      ) : p.notes.length === 0 ? (
        <p className="text-fs-sm text-center py-6 text-muted-foreground">Henüz not eklenmemiş.</p>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {p.notes.map(note => (
            <div key={note.id} className="p-3 rounded-lg group bg-background border border-border">
              <div className="flex items-start justify-between gap-2">
                <p className="text-fs-sm whitespace-pre-wrap flex-1 text-foreground">{note.content}</p>
                {p.canEdit && (
                  <button
                    onClick={() => p.onRequestDelete(note.id, preview(note.content))}
                    className="w-8 h-8 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive"
                    aria-label="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-fs-xs mt-1.5 text-muted-foreground">
                {new Date(note.created_at).toLocaleString("tr-TR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
