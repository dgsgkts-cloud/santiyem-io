// PreviewCard — compact context card for an entity ref surfaced by the AI.
// Loads data via existing hooks; no new fetches.

import { ArrowUpRight, Folder, User, Truck, Package, ListTodo, Wallet, FileText } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { usePersonnel } from "@/hooks/usePersonnel";
import { useMaterials } from "@/hooks/useMaterials";
import { workspaceBus, type EntityRef } from "@/lib/workspaceBus";

const ICONS = {
  project: Folder,
  personnel: User,
  supplier: Truck,
  material: Package,
  task: ListTodo,
  payment: Wallet,
  document: FileText,
} as const;

const KIND_LABEL: Record<EntityRef["kind"], string> = {
  project: "Proje",
  personnel: "Personel",
  supplier: "Tedarikçi",
  material: "Malzeme",
  task: "Görev",
  payment: "Ödeme",
  document: "Belge",
};

export const PreviewCard = ({ ref }: { ref: EntityRef }) => {
  const Icon = ICONS[ref.kind];

  // Read from the caches these hooks maintain; unresolved refs fall back
  // to the raw label supplied by the AI.
  const projects = useProjects();
  const personnel = usePersonnel();
  const materials = useMaterials();

  const findLabel = () => {
    if (ref.label) return ref.label;
    switch (ref.kind) {
      case "project":
        return (projects.projects as any[])?.find((p) => p.id === ref.id)?.name;
      case "personnel":
        return (personnel.personnel as any[])?.find((p) => p.id === ref.id)?.full_name;
      case "material":
        return (materials.materials as any[])?.find((m) => m.id === ref.id)?.name;
      default:
        return undefined;
    }
  };

  const label = findLabel() || `${KIND_LABEL[ref.kind]} #${ref.id.slice(0, 6)}`;

  const open = () => {
    workspaceBus.publish({ type: "navigate", ref, confidence: "high" });
    workspaceBus.publish({ type: "highlight", refs: [ref], ttlMs: 2600 });
  };

  return (
    <button
      onClick={open}
      className="flex items-center gap-2 rounded-full pl-2 pr-2.5 py-1 border border-border/60 bg-muted/40 hover:bg-muted transition-colors group"
    >
      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-3 h-3" />
      </span>
      <span className="text-[11px] text-muted-foreground">{KIND_LABEL[ref.kind]}</span>
      <span className="text-[12px] font-medium text-foreground truncate max-w-[160px]">{label}</span>
      <ArrowUpRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
    </button>
  );
};

export default PreviewCard;
