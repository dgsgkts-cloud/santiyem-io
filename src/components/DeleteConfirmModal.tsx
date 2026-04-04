import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;        // e.g. "Projeyi Sil"
  itemName?: string;     // e.g. "Akdeniz Residence"
  extraWarning?: string; // e.g. "Projeye ait tüm iş kalemleri..."
}

export default function DeleteConfirmModal({ open, onClose, onConfirm, title, itemName, extraWarning }: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4 animate-in fade-in zoom-in-95" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>
              <AlertTriangle className="w-5 h-5" style={{ color: "#EF4444" }} />
            </div>
            <h3 className="text-base font-bold" style={{ color: "#F1F5F9" }}>{title}</h3>
          </div>
          <button onClick={onClose} disabled={loading} className="p-1 rounded-lg hover:bg-white/5" style={{ color: "#64748B" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-2">
          <p className="text-sm" style={{ color: "#94A3B8" }}>
            {itemName ? (
              <><span className="font-semibold" style={{ color: "#F1F5F9" }}>{itemName}</span> silinecektir. Bu işlem geri alınamaz.</>
            ) : (
              "Bu kayıt silinecektir. Bu işlem geri alınamaz."
            )}
          </p>
          {extraWarning && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#F87171", border: "1px solid rgba(239,68,68,0.15)" }}>
              ⚠️ {extraWarning}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-10 rounded-xl text-sm font-medium transition-colors"
            style={{ backgroundColor: "#1E2732", color: "#94A3B8", border: "1px solid #334155" }}
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 h-10 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: loading ? "#B91C1C" : "#EF4444" }}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Siliniyor...</> : "Sil"}
          </button>
        </div>
      </div>
    </div>
  );
}
