import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Calendar, Wallet, Zap } from "lucide-react";
import PersonnelList from "@/components/personnel/PersonnelList";
import AttendanceGrid from "@/components/personnel/AttendanceGrid";
import LaborCostSummary from "@/components/personnel/LaborCostSummary";
import QuickAttendanceMobile from "@/components/personnel/QuickAttendanceMobile";
import { useProjects } from "@/hooks/useProjects";
import { useProjectRole } from "@/hooks/useProjectRole";
import { hasPermission } from "@/lib/projectPermissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageShell } from "@/components/ui/responsive/PageShell";
import { SectionCard } from "@/components/ui/responsive/SectionCard";

export default function PersonnelPage() {
  const { projects, loading } = useProjects();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState(isMobile ? "quick" : "list");
  const [projectId, setProjectId] = useState<string>("");

  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  const { role, overrides } = useProjectRole(projectId || null);
  const canViewCost = hasPermission(role, "view_costs", overrides) || hasPermission(role, "view_financials", overrides);

  const projectPicker = (tab === "quick" || tab === "grid" || tab === "cost") ? (
    <Select value={projectId} onValueChange={setProjectId}>
      <SelectTrigger className="w-full sm:w-[240px]"><SelectValue placeholder="Proje seç" /></SelectTrigger>
      <SelectContent>
        {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
      </SelectContent>
    </Select>
  ) : null;

  return (
    <PageShell
      title={<span className="flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Puantaj & Personel</span>}
      subtitle="Merkezi kişi listesi · QR ile otomatik eşleşme · Tipe göre maliyet"
      actions={projectPicker}
    >
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="quick"><Zap className="w-4 h-4 mr-1" /> Hızlı</TabsTrigger>
          <TabsTrigger value="list"><Users className="w-4 h-4 mr-1" /> Personeller</TabsTrigger>
          {!isMobile && <TabsTrigger value="grid"><Calendar className="w-4 h-4 mr-1" /> Devam Takibi</TabsTrigger>}
          <TabsTrigger value="cost"><Wallet className="w-4 h-4 mr-1" /> Maaş & Maliyet</TabsTrigger>
        </TabsList>

        <TabsContent value="quick">
          {!projectId ? (
            <SectionCard><p className="text-fs-sm text-muted-foreground text-center py-6">Hızlı yoklama için bir proje seçin.</p></SectionCard>
          ) : (
            <QuickAttendanceMobile projectId={projectId} />
          )}
        </TabsContent>

        <TabsContent value="list">
          <PersonnelList />
        </TabsContent>

        <TabsContent value="grid">
          {!projectId ? (
            <SectionCard><p className="text-fs-sm text-muted-foreground text-center py-6">Puantaj için bir proje seçin.</p></SectionCard>
          ) : loading ? null : selectedProject ? (
            <AttendanceGrid projectId={projectId} projectName={selectedProject.name} />
          ) : null}
        </TabsContent>

        <TabsContent value="cost">
          {!projectId ? (
            <SectionCard><p className="text-fs-sm text-muted-foreground text-center py-6">Maliyet için bir proje seçin.</p></SectionCard>
          ) : (
            <LaborCostSummary projectId={projectId} canViewCost={canViewCost} />
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
