import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ParcelData, ListingFormData } from "./ListingWizard";

interface LandListingFormProps {
  parcel: ParcelData;
  onSubmit: (data: ListingFormData) => void;
  onBack: () => void;
}

const LandListingForm = ({ parcel, onSubmit, onBack }: LandListingFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [contact, setContact] = useState("");

  const handleSubmit = () => {
    if (!title || !price || !contact) return;
    onSubmit({
      listing_type: "arsa",
      title,
      description,
      price: parseFloat(price),
      contact,
      media_urls: [],
    });
  };

  return (
    <div className="max-w-lg">
      <h3 className="text-sm font-semibold mb-4" style={{ color: "#F1F5F9" }}>Arsa İlan Bilgileri</h3>
      <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        <Field label="Başlık *" value={title} onChange={setTitle} placeholder="Örn: Kadıköy'de Satılık Arsa" />
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#94A3B8" }}>Açıklama</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Arsa hakkında detaylı bilgi..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
          />
        </div>
        <Field label="Fiyat (TL) *" value={price} onChange={setPrice} placeholder="Örn: 5000000" type="number" />
        <Field label="İletişim *" value={contact} onChange={setContact} placeholder="Telefon veya e-posta" />

        <div className="flex gap-2 pt-2">
          <button onClick={onBack} className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: "#1E2732", color: "#94A3B8" }}>
            <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />Geri
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title || !price || !contact}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: "#10B981" }}
          >
            İlan Oluştur →
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) => (
  <div>
    <label className="block text-xs font-medium mb-1" style={{ color: "#94A3B8" }}>{label}</label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
      style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
    />
  </div>
);

export default LandListingForm;
