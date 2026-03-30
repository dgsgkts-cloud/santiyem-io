import { useState } from "react";
import { Building2, Plus, List } from "lucide-react";
import ListingsManager from "./ListingsManager";
import ListingWizard from "./ListingWizard";

const Gayrimenkul360Panel = () => {
  const [view, setView] = useState<"list" | "wizard">("list");

  return (
    <div className="min-h-full" style={{ backgroundColor: "#0F1419" }}>
      {/* Header */}
      <div className="px-4 md:px-6 lg:px-8 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: "#F1F5F9" }}>Gayrimenkul360</h1>
              <p className="text-xs" style={{ color: "#64748B" }}>Parsel tabanlı gayrimenkul pazarlama platformu</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: view === "list" ? "rgba(16,185,129,0.15)" : "transparent",
                color: view === "list" ? "#10B981" : "#64748B",
                border: `1px solid ${view === "list" ? "rgba(16,185,129,0.3)" : "#1E2732"}`,
              }}
            >
              <List className="w-3.5 h-3.5" />
              İlanlarım
            </button>
            <button
              onClick={() => setView("wizard")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: view === "wizard" ? "rgba(16,185,129,0.15)" : "transparent",
                color: view === "wizard" ? "#10B981" : "#64748B",
                border: `1px solid ${view === "wizard" ? "rgba(16,185,129,0.3)" : "#1E2732"}`,
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni İlan
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 lg:px-8 pb-8">
        {view === "list" ? (
          <ListingsManager onNewListing={() => setView("wizard")} />
        ) : (
          <ListingWizard onComplete={() => setView("list")} onCancel={() => setView("list")} />
        )}
      </div>
    </div>
  );
};

export default Gayrimenkul360Panel;
