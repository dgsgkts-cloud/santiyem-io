import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Project } from "@/lib/projectsData";
import { ResponsiveGrid, KpiCard } from "@/components/ui/responsive";

export default function ProjectTaskSummary({ project }: { project: Project }) {
  return (
    <ResponsiveGrid variant="kpi">
      <KpiCard label="Tamamlanan" value={project.done} icon={CheckCircle2} accent="#22C55E" />
      <KpiCard label="Devam Eden" value={project.ongoing} icon={Clock} accent="#F59E0B" />
      <KpiCard label="Başarısız" value={project.failed} icon={XCircle} accent="#EF4444" />
    </ResponsiveGrid>
  );
}
