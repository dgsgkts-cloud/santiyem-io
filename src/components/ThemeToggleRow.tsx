import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Açık / Koyu tema geçişi. Sidebar ve mobil menüde Çıkış Yap'ın hemen yanında
 * durur; mobilde 48px dokunma alanı korunur.
 */
export const ThemeToggleRow = ({
  compact = false,
  tone = "sidebar",
}: {
  /** Sadece ikon (daraltılmış sidebar). */
  compact?: boolean;
  tone?: "sidebar" | "drawer";
}) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const Icon = isLight ? Sun : Moon;

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        aria-label={isLight ? "Koyu temaya geç" : "Açık temaya geç"}
        className="ds-press ds-focus-ring w-full flex items-center justify-center rounded-control text-muted-foreground hover:text-foreground"
        style={{ height: 40 }}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  }

  const drawer = tone === "drawer";
  return (
    <button
      onClick={toggleTheme}
      aria-label={isLight ? "Koyu temaya geç" : "Açık temaya geç"}
      className={
        drawer
          ? "w-full flex items-center gap-3 px-3 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.05]"
          : "ds-press ds-focus-ring w-full flex items-center gap-3 rounded-control text-muted-foreground hover:text-foreground ds-body-strong"
      }
      style={drawer ? { minHeight: 48 } : { height: 40, padding: "0 12px" }}
    >
      <Icon className={drawer ? "w-5 h-5" : "w-4 h-4"} />
      <span className={drawer ? "text-sm font-medium" : undefined}>
        {isLight ? "Koyu Tema" : "Açık Tema"}
      </span>
    </button>
  );
};

export default ThemeToggleRow;
