import { User } from "lucide-react";
import { Project } from "@/lib/projectsData";
import { SectionCard } from "@/components/ui/responsive";

export default function ProjectRecentActivity({ project }: { project: Project }) {
  return (
    <SectionCard title="Son Aktiviteler">
      <div className="space-y-3">
        {project.recentActivity.map((a, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
            <span className="text-fs-sm flex-1 min-w-0 text-muted-foreground truncate">{a.text}</span>
            <span className="text-fs-xs shrink-0 text-muted-foreground">{a.time}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-fs-xs font-semibold uppercase tracking-wide mb-2 text-muted-foreground">
          Proje Sorumlusu
        </p>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,107,43,0.15)" }}
          >
            <User className="w-4 h-4" style={{ color: "#FF6B2B" }} />
          </div>
          <div>
            <p className="text-fs-sm font-medium text-foreground">{project.manager}</p>
            <p className="text-fs-xs text-muted-foreground">Şantiye Şefi</p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
