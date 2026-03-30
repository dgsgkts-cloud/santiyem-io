import { useState } from "react";
import { X } from "lucide-react";

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
  { key: "name", label: "Proje Adı *", placeholder: "Villa Projesi - Çeşme", required: true },
  { key: "client", label: "Müşteri / İşveren *", placeholder: "Mehmet Bey", required: true },
  { key: "location", label: "Lokasyon", placeholder: "Çeşme, İzmir" },
  { key: "manager", label: "Şantiye Şefi", placeholder: "Ali Mühendis" },
  { key: "site_responsible", label: "Şantiye Sorumlusu", placeholder: "Burak Usta" },
  { key: "budget", label: "Bütçe", placeholder: "₺2.8M" },
  { key: "start_date", label: "Başlangıç Tarihi", placeholder: "15.01.2026" },
  { key: "end_date", label: "Bitiş Tarihi", placeholder: "15.06.2026" },
  { key: "description", label: "Açıklama", placeholder: "Proje detayları...", multiline: true },
] as const;

type FormData = Record<string, string>;

const AddProjectModal = ({ open, onClose, onAdd }: AddProjectModalProps) => {
  const [form, setForm] = useState<FormData>({});

  if (!open) return null;

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

  const inputStyle = { backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl p-5 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#F1F5F9" }}>Yeni Proje Ekle</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: "#64748B" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-[11px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: "#64748B" }}>{f.label}</label>
              {f.key === "description" ? (
                <textarea
                  value={form[f.key] || ""}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
                  style={inputStyle}
                />
              ) : (
                <input
                  value={form[f.key] || ""}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-[13px] font-medium" style={{ border: "1px solid #1E2732", color: "#64748B" }}>
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.name?.trim() || !form.client?.trim()}
            className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: "#FF6B2B" }}
          >
            Proje Ekle
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProjectModal;
