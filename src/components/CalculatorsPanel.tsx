import { useState } from "react";
import { Calculator, Zap, Columns3, Wind, Building2, Package, Thermometer, Clock } from "lucide-react";
import EKBCalculator from "./calculators/EKBCalculator";
import StructuralSizingCalculator from "./calculators/StructuralSizingCalculator";
import WindSnowCalculator from "./calculators/WindSnowCalculator";
import TAKSKAKSCalculator from "./calculators/TAKSKAKSCalculator";
import MaterialEstimator from "./calculators/MaterialEstimator";
import ThermalBridgeCalculator from "./calculators/ThermalBridgeCalculator";
import ConstructionCostCalculator from "./calculators/ConstructionCostCalculator";
import { useUserCalculations } from "@/hooks/useUserCalculations";
import { useUser } from "@/contexts/UserContext";

const TOOLS = [
  { id: "ekb", label: "EKB Hesabı", icon: <Zap className="w-4 h-4" />, desc: "Enerji kimlik belgesi ve TS 825 kontrolü" },
  { id: "structural", label: "Kolon/Kiriş/Döşeme", icon: <Columns3 className="w-4 h-4" />, desc: "TBDY 2018 ön boyutlandırma" },
  { id: "windsnow", label: "Rüzgar & Kar Yükü", icon: <Wind className="w-4 h-4" />, desc: "TS EN 1991 yük hesabı" },
  { id: "taks", label: "TAKS/KAKS", icon: <Building2 className="w-4 h-4" />, desc: "İmar hesabı ve parsel analizi" },
  { id: "material", label: "Malzeme Tahmini", icon: <Package className="w-4 h-4" />, desc: "Beton, demir, kalıp miktarı" },
  { id: "thermal", label: "Isı Köprüsü", icon: <Thermometer className="w-4 h-4" />, desc: "Doğrusal ısı köprüsü analizi" },
  { id: "cost", label: "İnşaat Maliyet Hesaplama", icon: <span className="text-base">🏗️</span>, desc: "Bina tipine, kat sayısına ve özelliklerine göre kalem kalem maliyet hesabı" },
] as const;

type ToolId = typeof TOOLS[number]["id"];

const TOOL_LABELS: Record<string, string> = Object.fromEntries(TOOLS.map(t => [t.id, t.label]));

const CalculatorsPanel = () => {
  const { user } = useUser();
  const { calculations } = useUserCalculations();
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6 px-3 sm:px-4 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Hesap Araçları
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Mühendislik hesap ve ön boyutlandırma araçları
        </p>
      </div>

      {!activeTool ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className="glass-card rounded-lg p-4 text-left hover:ring-2 hover:ring-primary/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {tool.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {tool.label}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">{tool.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Recent calculations */}
          {user && calculations.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" /> Son Hesaplamalar
              </h3>
              <div className="space-y-2">
                {calculations.map((c) => (
                  <div key={c.id} className="glass-card rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground">{c.calc_title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {TOOL_LABELS[c.calc_type] || c.calc_type} · {new Date(c.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTool(c.calc_type as ToolId)}
                      className="text-[11px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      Aç
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div>
          <button
            onClick={() => setActiveTool(null)}
            className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
          >
            ← Tüm araçlar
          </button>
          <div className="glass-card rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              {TOOLS.find((t) => t.id === activeTool)?.icon}
              {TOOLS.find((t) => t.id === activeTool)?.label}
            </h3>
            {activeTool === "ekb" && <EKBCalculator />}
            {activeTool === "structural" && <StructuralSizingCalculator />}
            {activeTool === "windsnow" && <WindSnowCalculator />}
            {activeTool === "taks" && <TAKSKAKSCalculator />}
            {activeTool === "material" && <MaterialEstimator />}
            {activeTool === "thermal" && <ThermalBridgeCalculator />}
            {activeTool === "cost" && <ConstructionCostCalculator />}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculatorsPanel;
