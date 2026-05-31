import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Users, Calendar, Wallet, Zap } from "lucide-react";
import PersonnelList from "@/components/personnel/PersonnelList";
import AttendanceGrid from "@/components/personnel/AttendanceGrid";
import LaborCostSummary from "@/components/personnel/LaborCostSummary";
import QuickAttendanceMobile from "@/components/personnel/QuickAttendanceMobile";
import { useProjects } from "@/hooks/useProjects";
import { useProjectRole } from "@/hooks/useProjectRole";
import { hasPermission } from "@/lib/projectPermissions";
import { useIsMobile } from "@/hooks/use-mobile";

export default function PersonnelPage() {
  const { projects, loading } = useProjects();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState(isMobile ? "quick" : "list");
  const [projectId, setProjectId] = useState<string>("");

  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  const { role, overrides } = useProjectRole(projectId || null);
  const canViewCost = hasPermission(role, "view_costs", overrides) || hasPermission(role, "view_financials", overrides);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-[#FF6B2B]" /> Puantaj & Personel
          </h1>
          <p className="text-sm text-muted-foreground">Merkezi kişi listesi · QR ile otomatik eşleşme · Tipe göre maliyet</p>
        </div>
        {(tab === "quick" || tab === "grid" || tab === "cost") && (
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-full sm:w-[240px]"><SelectValue placeholder="Proje seç" /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="quick"><Zap className="w-4 h-4 mr-1" /> Hızlı</TabsTrigger>
          <TabsTrigger value="list"><Users className="w-4 h-4 mr-1" /> Liste</TabsTrigger>
          {!isMobile && <TabsTrigger value="grid"><Calendar className="w-4 h-4 mr-1" /> Aylık</TabsTrigger>}
          <TabsTrigger value="cost"><Wallet className="w-4 h-4 mr-1" /> Maliyet</TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="mt-4">
          {!projectId ? (
            <Card className="p-8 text-center text-muted-foreground">Hızlı yoklama için bir proje seçin.</Card>
          ) : (
            <QuickAttendanceMobile projectId={projectId} />
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <PersonnelList />
        </TabsContent>

        <TabsContent value="grid" className="mt-4">
          {!projectId ? (
            <Card className="p-8 text-center text-muted-foreground">Puantaj için bir proje seçin.</Card>
          ) : loading ? null : selectedProject ? (
            <AttendanceGrid projectId={projectId} projectName={selectedProject.name} />
          ) : null}
        </TabsContent>

        <TabsContent value="cost" className="mt-4">
          {!projectId ? (
            <Card className="p-8 text-center text-muted-foreground">Maliyet için bir proje seçin.</Card>
          ) : (
            <LaborCostSummary projectId={projectId} canViewCost={canViewCost} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
