import { Brain, Check, X, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MemoryProposal } from "@/hooks/useMemoryExtractor";

const CATEGORY_LABEL: Record<string, string> = {
  company: "Şirket", project: "Proje", supplier: "Tedarikçi",
  customer: "Müşteri", personnel: "Personel", decision: "Karar",
  preference: "Tercih", workflow: "İş Akışı", finance: "Finans", safety: "Güvenlik",
};

interface Props {
  proposals: MemoryProposal[];
  busy: boolean;
  onRemember: (p: MemoryProposal) => void;
  onDismiss: (p: MemoryProposal) => void;
  onNeverAgain: (p: MemoryProposal) => void;
}

export function MemorySuggestionBanner({
  proposals, busy, onRemember, onDismiss, onNeverAgain,
}: Props) {
  if (!proposals.length) return null;

  return (
    <div className="space-y-2">
      {proposals.map((p, idx) => (
        <div
          key={`${p.title}-${idx}`}
          className="rounded-xl border border-primary/30 bg-primary/5 p-3 sm:p-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-primary/15 p-2">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-primary">
                  Şirket hafızama eklemek ister misin?
                </span>
                <span className="text-[10px] uppercase tracking-wide rounded-full bg-primary/15 text-primary px-2 py-0.5">
                  {CATEGORY_LABEL[p.category] ?? p.category}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  %{Math.round(p.confidence * 100)} güven
                </span>
              </div>
              {p.title && (
                <div className="mt-1 text-sm font-semibold text-foreground truncate">
                  {p.title}
                </div>
              )}
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                {p.content}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => onRemember(p)}
                  className="h-8"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Hatırla
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onDismiss(p)}
                  className="h-8"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Şimdi değil
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onNeverAgain(p)}
                  className="h-8 text-muted-foreground"
                >
                  <Ban className="h-3.5 w-3.5 mr-1" />
                  Bu tür şeyleri hatırlama
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
