import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ParcelData, ListingFormData } from "./ListingWizard";

interface PropertyListingFormProps {
  parcel: ParcelData;
  onSubmit: (data: ListingFormData) => void;
  onBack: () => void;
}

const PROPERTY_TYPES = ["Daire", "Villa", "Ofis", "Bina", "Proje"];

const PropertyListingForm = ({ parcel, onSubmit, onBack }: PropertyListingFormProps) => {
  const [propertyType, setPropertyType] = useState("Daire");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [rooms, setRooms] = useState("");
  const [sqm, setSqm] = useState("");
  const [floorInfo, setFloorInfo] = useState("");
  const [contact, setContact] = useState("");

  const handleSubmit = () => {
    if (!title || !price || !contact) return;
    onSubmit({
      listing_type: "gayrimenkul",
      property_type: propertyType,
      title,
      description,
      price: parseFloat(price),
      contact,
      rooms: rooms || undefined,
      sqm: sqm ? parseFloat(sqm) : undefined,
      floor_info: floorInfo || undefined,
      media_urls: [],
    });
  };

  return (
    <div className="max-w-lg">
      <h3 className="text-sm font-semibold mb-4" style={{ color: "#F1F5F9" }}>Gayrimenkul İlan Bilgileri</h3>
      <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        {/* Property type */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>Gayrimenkul Türü</label>
          <div className="flex flex-wrap gap-1.5">
            {PROPERTY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setPropertyType(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: propertyType === t ? "rgba(16,185,129,0.15)" : "#0F1419",
                  color: propertyType === t ? "#10B981" : "#94A3B8",
                  border: `1px solid ${propertyType === t ? "rgba(16,185,129,0.3)" : "#1E2732"}`,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Field label="Başlık *" value={title} onChange={setTitle} placeholder="Örn: Kadıköy'de 2+1 Daire" />

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#94A3B8" }}>Açıklama</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detaylı bilgi..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fiyat (TL) *" value={price} onChange={setPrice} placeholder="5000000" type="number" />
          <Field label="Oda Bilgisi" value={rooms} onChange={setRooms} placeholder="2+1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Metrekare" value={sqm} onChange={setSqm} placeholder="120" type="number" />
          <Field label="Kat Bilgisi" value={floorInfo} onChange={setFloorInfo} placeholder="3. Kat / 8" />
        </div>
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

export default PropertyListingForm;
