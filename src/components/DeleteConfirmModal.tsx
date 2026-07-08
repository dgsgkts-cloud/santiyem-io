import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/responsive";

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  itemName?: string;
  extraWarning?: string;
}

export default function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  itemName,
  extraWarning,
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    // Per project memory: 2-second confirmation animation
    await new Promise((r) => setTimeout(r, 2000));
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(v) => !v && !loading && onClose()}
      size="sm"
      title={
        <span className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </span>
          <span className="text-fs-md font-bold text-foreground">{title}</span>
        </span>
      }
      footer={
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-11 rounded-xl text-fs-sm font-medium bg-muted text-muted-foreground border border-border disabled:opacity-60"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 h-11 rounded-xl text-fs-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-80"
            style={{ backgroundColor: loading ? "#B91C1C" : "#EF4444" }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Siliniyor...
              </>
            ) : (
              "Sil"
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-fs-sm text-muted-foreground">
          {itemName ? (
            <>
              <span className="font-semibold text-foreground">{itemName}</span> silinecektir. Bu işlem
              geri alınamaz.
            </>
          ) : (
            "Bu kayıt silinecektir. Bu işlem geri alınamaz."
          )}
        </p>
        {extraWarning && (
          <p className="text-fs-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            ⚠️ {extraWarning}
          </p>
        )}
      </div>
    </ResponsiveSheet>
  );
}
