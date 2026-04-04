import { useState } from "react";
import { Building2, Plus, Trash2, Eye, MapPin, Tag, TreePine } from "lucide-react";
import { useListings } from "@/hooks/useListings";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

interface ListingsManagerProps {
  onNewListing: () => void;
}

const ListingsManager = ({ onNewListing }: ListingsManagerProps) => {
  const { listings, loading, deleteListing } = useListings();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#10B981", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-xl p-12 text-center" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "rgba(16,185,129,0.1)" }}>
          <Building2 className="w-8 h-8" style={{ color: "#10B981" }} />
        </div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: "#F1F5F9" }}>Henüz ilan yok</h3>
        <p className="text-xs mb-6" style={{ color: "#64748B" }}>İlk ilanınızı oluşturmak için başlayın</p>
        <button
          onClick={onNewListing}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "#10B981" }}
        >
          <Plus className="w-4 h-4" />
          İlk İlanı Oluştur
        </button>
      </div>
    );
  }

  return (
    <>
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteListing(deleteTarget.id);
        }}
        title="İlanı Sil"
        itemName={deleteTarget?.name}
      />
      <div className="space-y-3">
        {listings.map((listing) => {
          const isLand = listing.listing_type === "arsa";
          return (
            <div
              key={listing.id}
              className="rounded-xl p-4 flex items-start gap-4 transition-all"
              style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}
            >
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: isLand ? "rgba(16,185,129,0.12)" : "rgba(59,130,246,0.12)" }}>
              {isLand ? <TreePine className="w-5 h-5" style={{ color: "#10B981" }} /> : <Building2 className="w-5 h-5" style={{ color: "#3B82F6" }} />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold truncate" style={{ color: "#F1F5F9" }}>{listing.title || "Başlıksız"}</h4>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: listing.status === "yayinda" ? "rgba(16,185,129,0.15)" : listing.status === "arsivlendi" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                    color: listing.status === "yayinda" ? "#10B981" : listing.status === "arsivlendi" ? "#EF4444" : "#F59E0B",
                  }}
                >
                  {listing.status === "yayinda" ? "Yayında" : listing.status === "arsivlendi" ? "Arşiv" : "Taslak"}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs" style={{ color: "#64748B" }}>
                {(listing.parcel_il || listing.parcel_ilce) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[listing.parcel_il, listing.parcel_ilce].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {listing.price?.toLocaleString("tr-TR")} ₺
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setDeleteTarget({ id: listing.id, name: listing.title || "Başlıksız ilan" })}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "#64748B" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#EF4444"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#64748B"; }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default ListingsManager;
