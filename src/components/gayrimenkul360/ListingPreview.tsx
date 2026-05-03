import { Copy, Check, MapPin, Phone, Building2, TreePine, Tag } from "lucide-react";
import { useState } from "react";
import { Listing } from "@/hooks/useListings";
import { formatNumber0 } from "@/lib/formatCurrency";

interface ListingPreviewProps {
  listing: Listing;
  onFinish: () => void;
}

const ListingPreview = ({ listing, onFinish }: ListingPreviewProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/ilan/${listing.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLand = listing.listing_type === "arsa";

  return (
    <div className="max-w-2xl">
      <h3 className="text-sm font-semibold mb-4" style={{ color: "#F1F5F9" }}>İlan Önizleme</h3>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        {/* Header image / map area */}
        <div className="aspect-video flex items-center justify-center relative" style={{ background: "linear-gradient(135deg, #0F1419, #1a2332)" }}>
          {listing.parcel_center_lat && listing.parcel_center_lng ? (
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${listing.parcel_center_lat},${listing.parcel_center_lng}&zoom=16&maptype=satellite`}
              allowFullScreen
            />
          ) : (
            <div className="text-center">
              <MapPin className="w-10 h-10 mx-auto mb-2" style={{ color: "#475569" }} />
              <p className="text-xs" style={{ color: "#64748B" }}>Harita görünümü</p>
            </div>
          )}

          {/* Type badge */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-medium" style={{ backgroundColor: "rgba(0,0,0,0.7)", color: isLand ? "#10B981" : "#3B82F6" }}>
            {isLand ? <TreePine className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
            {isLand ? "Arsa" : listing.property_type || "Gayrimenkul"}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{listing.title}</h2>
            {(listing.parcel_il || listing.parcel_ilce) && (
              <p className="text-xs flex items-center gap-1 mt-1" style={{ color: "#64748B" }}>
                <MapPin className="w-3 h-3" />
                {[listing.parcel_il, listing.parcel_ilce].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4" style={{ color: "#10B981" }} />
            <span className="text-xl font-bold" style={{ color: "#10B981" }}>
              {formatNumber0(Number(listing.price ?? 0))} ₺
            </span>
          </div>

          {/* Details grid */}
          {!isLand && (
            <div className="grid grid-cols-3 gap-3">
              {listing.rooms && <DetailCard label="Oda" value={listing.rooms} />}
              {listing.sqm && <DetailCard label="m²" value={`${listing.sqm}`} />}
              {listing.floor_info && <DetailCard label="Kat" value={listing.floor_info} />}
            </div>
          )}

          {listing.parcel_area_sqm && listing.parcel_area_sqm > 0 && (
            <DetailCard label="Parsel Alanı" value={`${listing.parcel_area_sqm.toLocaleString("tr-TR")} m²`} />
          )}

          {listing.description && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "#94A3B8" }}>Açıklama</p>
              <p className="text-xs leading-relaxed" style={{ color: "#CBD5E1" }}>{listing.description}</p>
            </div>
          )}

          {/* Contact */}
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
            <Phone className="w-4 h-4" style={{ color: "#10B981" }} />
            <span className="text-sm font-medium" style={{ color: "#F1F5F9" }}>{listing.contact}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: copied ? "rgba(16,185,129,0.15)" : "#1E2732", color: copied ? "#10B981" : "#94A3B8" }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Kopyalandı!" : "Linki Kopyala"}
            </button>
            <button
              onClick={onFinish}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: "#10B981" }}
            >
              Tamamla ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailCard = ({ label, value }: { label: string; value: string }) => (
  <div className="p-2.5 rounded-lg text-center" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
    <p className="text-xs" style={{ color: "#64748B" }}>{label}</p>
    <p className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>{value}</p>
  </div>
);

export default ListingPreview;
