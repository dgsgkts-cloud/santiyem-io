import { MapPin, User, DollarSign, Calendar } from "lucide-react";
import { Project } from "@/lib/projectsData";
import { ResponsiveGrid, KpiCard } from "@/components/ui/responsive";
import { formatCurrency } from "@/lib/formatCurrency";

export default function ProjectInfoCards({ project }: { project: Project }) {
  return (
    <ResponsiveGrid variant="kpi">
      <KpiCard label="Lokasyon" value={project.location} icon={MapPin} accent="hsl(var(--primary))" />
      <KpiCard label="Müşteri" value={project.client} icon={User} accent="hsl(var(--primary))" />
      <KpiCard label="Bütçe" value={formatCurrency(project.budget)} icon={DollarSign} accent="hsl(var(--primary))" />
      <KpiCard label="Süre" value={`${project.start} → ${project.end}`} icon={Calendar} accent="hsl(var(--primary))" />
    </ResponsiveGrid>
  );
}
