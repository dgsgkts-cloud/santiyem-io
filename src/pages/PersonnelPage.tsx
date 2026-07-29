import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Calendar, Wallet, Zap } from "lucide-react";
import PersonnelList from "@/components/personnel/PersonnelList";
import AttendanceGrid from "@/components/personnel/AttendanceGrid";
import LaborCostSummary from "@/components/personnel/LaborCostSummary";
import QuickAttendanceMobile from "@/components/personnel/QuickAttendanceMobile";
import EmptyState from "@/components/desktop/EmptyState";
import { useProjects } from "@/hooks/useProjects";
import { useProjectRole } from "@/hooks/useProjectRole";
import { hasPermission } from "@/lib/projectPermissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageShell } from "@/components/ui/responsive/PageShell";
import { cn } from "@/lib/utils";

/**
 * SPRINT 38C — Personnel & attendance.
 * Compact header, segmented tabs, project picker only where it is required.
 */

type TabKey = "quick" | "list" | "grid" | "cost";

export default function PersonnelPage() {
  const { projects, loading } = useProjects();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<TabKey>(isMobile ? "quick" : "list");
  const [projectId, setProjectId] = useState<string>("");

  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  const { role, overrides } = useProjectRole(projectId || null);
  const canViewCost = hasPermission(role, "view_costs", overrides) || hasPermission(role, "view_financials", overrides);

  const TABS: { key: TabKey; label: string; icon: typeof Zap; hidden?: boolean }[] = [
    { key: "quick", label: "Yoklama", icon: Zap },
    { key: "list", label: "Personeller", icon: Users },
    { key: "grid", label: "Devam", icon: Calendar, hidden: isMobile },
    { key: "cost", label: "Maliyet", icon: Wallet },
  ];

  const needsProject = tab === "quick" || tab === "grid" || tab === "cost";

  const projectPrompt = (message: string) => (
    <div className="rounded-card border border-border/70 bg-card shadow-card">
      <EmptyState
        icon="🏗️"
        title="Önce bir proje seçin"
        description={message}
        firstStep="Yukarıdaki proje seçicisinden çalıştığınız şantiyeyi seçin."
        aiHint="Proje seçildiğinde günlük devam, QR eşleşmeleri ve işçilik maliyeti tek ekranda toplanır."
      />
    </div>
  );

  return (
    <PageShell
      title="Puantaj & Personel"
      subtitle="Merkezi kişi listesi · QR ile otomatik eşleşme · Tipe göre maliyet"
      className="space-y-3"
    >
      {/* Segmented tabs + project picker in one compact control row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div
          role="tablist"
          aria-label="Personel görünümleri"
          className="flex gap-1 p-1 rounded-button bg-muted/40 border border-border/60 overflow-x-auto no-scrollbar"
        >
          {TABS.filter((t) => !t.hidden).map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={cn(
                  "shrink-0 h-9 px-3 rounded-lg ds-body font-medium inline-flex items-center gap-1.5 transition-all",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {needsProject && (
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-full sm:w-[240px] sm:ml-auto h-11">
              <SelectValue placeholder="Proje seç" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {tab === "quick" &&
        (!projectId ? projectPrompt("Hızlı yoklama, seçili projeye atanmış aktif personel üzerinden alınır.") : (
          <QuickAttendanceMobile projectId={projectId} />
        ))}

      {tab === "list" && <PersonnelList />}

      {tab === "grid" &&
        (!projectId
          ? projectPrompt("Aylık devam takibi proje bazında tutulur.")
          : loading
            ? null
            : selectedProject && <AttendanceGrid projectId={projectId} projectName={selectedProject.name} />)}

      {tab === "cost" &&
        (!projectId ? projectPrompt("İşçilik maliyeti proje bazında hesaplanır.") : (
          <LaborCostSummary projectId={projectId} canViewCost={canViewCost} />
        ))}
    </PageShell>
  );
}
