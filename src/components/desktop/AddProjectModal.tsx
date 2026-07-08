import { useState } from "react";
import { ResponsiveSheet } from "@/components/ui/responsive";

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: {
    name: string;
    client: string;
    location: string;
    manager: string;
    site_responsible: string;
    description: string;
    budget: string;
    start_date: string;
    end_date: string;
  }) => void;
}

const FIELDS = [
  { key: "name", label: "Proje Adı *", placeholder: "Villa Projesi - Çeşme" },
  { key: "client", label: "Müşteri / İşveren *", placeholder: "Mehmet Bey" },
  { key: "location", label: "Lokasyon", placeholder: "Çeşme, İzmir" },
  { key: "manager", label: "Şantiye Şefi", placeholder: "Ali Mühendis" },
  { key: "site_responsible", label: "Şantiye Sorumlusu", placeholder: "Burak Usta" },
  { key: "budget", label: "Bütçe", placeholder: "₺2.8M" },
  { key: "start_date", label: "Başlangıç Tarihi", placeholder: "15.01.2026" },
  { key: "end_date", label: "Bitiş Tarihi", placeholder: "15.06.2026" },
  { key: "description", label: "Açıklama", placeholder: "Proje detayları...", multiline: true },
] as const;

const AddProjectModal = ({ open, onClose, onAdd }: AddProjectModalProps) => {
  const [form, setForm] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    if (!form.name?.trim() || !form.client?.trim()) return;
    onAdd({
      name: form.name.trim(),
      client: form.client.trim(),
      location: form.location?.trim() || "",
      manager: form.manager?.trim() || "",
      site_responsible: form.site_responsible?.trim() || "",
      description: form.description?.trim() || "",
      budget: form.budget?.trim() || "",
      start_date: form.start_date?.trim() || "",
      end_date: form.end_date?.trim() || "",
    });
    setForm({});
    onClose();
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg text-fs-sm outline-none bg-background border border-border text-foreground";

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Yeni Proje Ekle"
      size="lg"
      footer={
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-fs-sm font-medium text-muted-foreground border border-border"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.name?.trim() || !form.client?.trim()}
            className="flex-1 py-2.5 rounded-lg text-fs-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: "#FF6B2B" }}
          >
            Proje Ekle
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="text-fs-xs font-semibold uppercase tracking-wide mb-1 block text-muted-foreground">
              {f.label}
            </label>
            {f.key === "description" ? (
              <textarea
                value={form[f.key] || ""}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                rows={3}
                className={inputCls + " resize-none"}
              />
            ) : (
              <input
                value={form[f.key] || ""}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={inputCls}
              />
            )}
          </div>
        ))}
      </div>
    </ResponsiveSheet>
  );
};

export default AddProjectModal;
