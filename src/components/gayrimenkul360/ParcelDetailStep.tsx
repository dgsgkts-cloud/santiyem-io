import { MapPin, ArrowRight, ArrowLeft, Maximize2 } from "lucide-react";
import { ParcelData } from "./ListingWizard";

interface ParcelDetailStepProps {
  parcel: ParcelData;
  onContinue: () => void;
  onBack: () => void;
}

const ParcelDetailStep = ({ parcel, onContinue, onBack }: ParcelDetailStepProps) => {
  const hasLocation = parcel.lat !== 0 && parcel.lng !== 0;
  const hasManual = !!parcel.il;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left - Info */}
      <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#F1F5F9" }}>
          <MapPin className="w-4 h-4" style={{ color: "#10B981" }} />
          Parsel Bilgileri
        </h3>

        <div className="space-y-3">
          {hasManual && (
            <>
              <InfoRow label="İl" value={parcel.il} />
              <InfoRow label="İlçe" value={parcel.ilce || "-"} />
              <InfoRow label="Ada No" value={parcel.ada} />
              <InfoRow label="Parsel No" value={parcel.parsel} />
            </>
          )}
          {parcel.area > 0 && <InfoRow label="Alan" value={`${parcel.area.toLocaleString("tr-TR")} m²`} />}
          {hasLocation && (
            <InfoRow label="Koordinat" value={`${parcel.lat.toFixed(6)}, ${parcel.lng.toFixed(6)}`} />
          )}
          {parcel.coords && (
            <InfoRow label="Geometri" value={`${parcel.coords.length} nokta`} />
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: "#1E2732", color: "#94A3B8" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Geri
          </button>
          <button
            onClick={onContinue}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
            style={{ backgroundColor: "#10B981" }}
          >
            İlan Oluştur
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right - Map preview */}
      <div className="rounded-xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", minHeight: "300px" }}>
        {hasLocation ? (
          <iframe
            width="100%"
            height="300"
            style={{ border: 0 }}
            src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${parcel.lat},${parcel.lng}&zoom=17&maptype=satellite`}
            allowFullScreen
          />
        ) : (
          <div className="text-center p-6">
            <Maximize2 className="w-8 h-8 mx-auto mb-2" style={{ color: "#475569" }} />
            <p className="text-xs" style={{ color: "#64748B" }}>Harita koordinatı bulunamadı</p>
            <p className="text-[10px] mt-1" style={{ color: "#475569" }}>Manuel giriş ile devam edebilirsiniz</p>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid #1E2732" }}>
    <span className="text-xs" style={{ color: "#64748B" }}>{label}</span>
    <span className="text-xs font-medium" style={{ color: "#F1F5F9" }}>{value}</span>
  </div>
);

export default ParcelDetailStep;
