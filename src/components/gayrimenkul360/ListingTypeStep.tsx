import { ArrowLeft, TreePine, Building } from "lucide-react";

interface ListingTypeStepProps {
  onSelect: (type: "arsa" | "gayrimenkul") => void;
  onBack: () => void;
}

const ListingTypeStep = ({ onSelect, onBack }: ListingTypeStepProps) => {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-4" style={{ color: "#F1F5F9" }}>İlan Türünü Seçin</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <button
          onClick={() => onSelect("arsa")}
          className="flex flex-col items-center gap-3 p-6 rounded-xl hover:scale-[1.02] text-center bg-card hover-border-green"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(16,185,129,0.12)" }}>
            <TreePine className="w-7 h-7" style={{ color: "#10B981" }} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "#F1F5F9" }}>Arsa İlanı</p>
            <p className="text-xs" style={{ color: "#64748B" }}>Boş arsalar ve araziler için</p>
          </div>
        </button>

        <button
          onClick={() => onSelect("gayrimenkul")}
          className="flex flex-col items-center gap-3 p-6 rounded-xl hover:scale-[1.02] text-center bg-card hover-border-green"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.12)" }}>
            <Building className="w-7 h-7" style={{ color: "#3B82F6" }} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "#F1F5F9" }}>Gayrimenkul İlanı</p>
            <p className="text-xs" style={{ color: "#64748B" }}>Daire, villa, ofis, bina, proje</p>
          </div>
        </button>
      </div>

      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: "#64748B" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Geri
      </button>
    </div>
  );
};

export default ListingTypeStep;
