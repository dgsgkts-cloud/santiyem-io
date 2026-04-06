import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const THEME_MODAL_KEY = "santiyem_theme_selection_done";

export const shouldShowThemeModal = (): boolean => {
  return !localStorage.getItem(THEME_MODAL_KEY);
};

export const markThemeModalDone = () => {
  localStorage.setItem(THEME_MODAL_KEY, "true");
};

interface ThemeSelectionModalProps {
  open: boolean;
  onClose: () => void;
}

const ThemeSelectionModal = ({ open, onClose }: ThemeSelectionModalProps) => {
  const { setTheme } = useTheme();
  const [selected, setSelected] = useState<"dark" | "light">("dark");

  if (!open) return null;

  const handleContinue = () => {
    setTheme(selected);
    markThemeModalDone();
    onClose();
  };

  const handleSkip = () => {
    setTheme("dark");
    markThemeModalDone();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-lg mx-4 rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold" style={{ color: "#F1F5F9" }}>🎨 Görünüm Tercihinizi Seçin</h2>
          <p className="text-xs mt-1" style={{ color: "#64748B" }}>
            İstediğiniz zaman Ayarlar → Görünüm'den değiştirebilirsiniz.
          </p>
        </div>

        {/* Theme Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Dark Theme Card */}
          <button
            onClick={() => setSelected("dark")}
            className="rounded-xl p-4 text-left transition-all"
            style={{
              backgroundColor: "#0F1419",
              border: selected === "dark" ? "2px solid #FF6B2B" : "2px solid #1E2732",
              boxShadow: selected === "dark" ? "0 0 20px rgba(255,107,43,0.15)" : "none",
            }}
          >
            {/* Mini preview */}
            <div className="rounded-lg p-2 mb-3" style={{ backgroundColor: "#1A2332", border: "1px solid #1E2732" }}>
              <div className="flex gap-1 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#EF4444" }} />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#22C55E" }} />
              </div>
              <div className="space-y-1">
                <div className="h-1.5 rounded-full w-3/4" style={{ backgroundColor: "#2A3A4A" }} />
                <div className="h-1.5 rounded-full w-1/2" style={{ backgroundColor: "#2A3A4A" }} />
                <div className="h-1.5 rounded-full w-2/3" style={{ backgroundColor: "#FF6B2B40" }} />
              </div>
            </div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: "#F1F5F9" }}>🌙 Koyu Tema</p>
            <p className="text-[10px]" style={{ color: "#64748B" }}>Göz yormayan koyu arka plan</p>
          </button>

          {/* Light Theme Card */}
          <button
            onClick={() => setSelected("light")}
            className="rounded-xl p-4 text-left transition-all"
            style={{
              backgroundColor: "#F8F9FA",
              border: selected === "light" ? "2px solid #FF6B2B" : "2px solid #E2E8F0",
              boxShadow: selected === "light" ? "0 0 20px rgba(255,107,43,0.15)" : "none",
            }}
          >
            {/* Mini preview */}
            <div className="rounded-lg p-2 mb-3" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
              <div className="flex gap-1 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#EF4444" }} />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#22C55E" }} />
              </div>
              <div className="space-y-1">
                <div className="h-1.5 rounded-full w-3/4" style={{ backgroundColor: "#E2E8F0" }} />
                <div className="h-1.5 rounded-full w-1/2" style={{ backgroundColor: "#E2E8F0" }} />
                <div className="h-1.5 rounded-full w-2/3" style={{ backgroundColor: "#FF6B2B40" }} />
              </div>
            </div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: "#1A202C" }}>☀️ Açık Tema</p>
            <p className="text-[10px]" style={{ color: "#64748B" }}>Sade ve parlak görünüm</p>
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleContinue}
            className="w-full py-3 rounded-xl text-sm font-bold transition-colors hover:opacity-90"
            style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}
          >
            Devam Et
          </button>
          <button
            onClick={handleSkip}
            className="text-xs py-1 transition-colors hover:opacity-70"
            style={{ color: "#64748B" }}
          >
            Atla
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelectionModal;
