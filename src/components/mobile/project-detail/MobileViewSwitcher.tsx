import { LayoutGrid, Grid2x2 } from "lucide-react";

export type MobileProjectView = "overview" | "modules";

interface Props {
  value: MobileProjectView;
  onChange: (v: MobileProjectView) => void;
}

/**
 * SPRINT 41A — single mobile-native segmented control (50px height).
 * Exactly two views; never stacked with another tab row.
 */
export default function MobileViewSwitcher({ value, onChange }: Props) {
  const items: { id: MobileProjectView; label: string; Icon: typeof LayoutGrid }[] = [
    { id: "overview", label: "Genel Bakış", Icon: LayoutGrid },
    { id: "modules", label: "Modüller", Icon: Grid2x2 },
  ];

  return (
    <div
      role="tablist"
      aria-label="Proje görünümü"
      className="w-full h-[50px] p-1 rounded-[16px] bg-muted/60 flex items-center gap-1"
    >
      {items.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`flex-1 h-full rounded-[12px] flex items-center justify-center gap-2 text-[14px] font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground active:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
