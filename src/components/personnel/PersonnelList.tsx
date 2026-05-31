import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Phone, Pencil, Trash2, Users } from "lucide-react";
import { usePersonnel, EMPLOYMENT_TYPE_LABELS, type Personnel } from "@/hooks/usePersonnel";
import { useProjects } from "@/hooks/useProjects";
import PersonnelForm from "./PersonnelForm";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

const TYPE_COLORS: Record<string, string> = {
  daily_wage: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  monthly_salary: "bg-blue-500/15 text-blue-400 border-blue-500/40",
  subcontractor_crew: "bg-purple-500/15 text-purple-400 border-purple-500/40",
};

export default function PersonnelList() {
  const { personnel, assignments, loading, deletePerson } = usePersonnel();
  const { projects } = useProjects();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    return personnel.filter((p) => {
      if (filter !== "all" && p.employment_type !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        return p.full_name.toLowerCase().includes(s) || (p.phone ?? "").includes(s);
      }
      return true;
    });
  }, [personnel, search, filter]);

  const openEdit = (p: Personnel) => {
    const projectIds = assignments.filter((a) => a.personnel_id === p.id).map((a) => a.project_id);
    const shares: Record<string, number> = {};
    assignments.filter((a) => a.personnel_id === p.id).forEach((a) => {
      if (a.salary_share_percent != null) shares[a.project_id] = a.salary_share_percent;
    });
    setEditing({ ...p, project_ids: projectIds, salary_shares: shares });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Ara: ad veya telefon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1">
          {(["all", "daily_wage", "monthly_salary", "subcontractor_crew"] as const).map((k) => (
            <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}
              className={filter === k ? "bg-[#FF6B2B] hover:bg-[#FF6B2B]/90" : ""}>
              {k === "all" ? "Tümü" : EMPLOYMENT_TYPE_LABELS[k as keyof typeof EMPLOYMENT_TYPE_LABELS]}
            </Button>
          ))}
        </div>
        <Button className="ml-auto bg-[#FF6B2B] hover:bg-[#FF6B2B]/90" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Yeni Kişi
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Henüz personel kaydı yok. "Yeni Kişi" ile ekleyin.</p>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((p) => {
            const assigns = assignments.filter((a) => a.personnel_id === p.id);
            return (
              <Card key={p.id} className="p-3 group hover:border-[#FF6B2B]/40 transition">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{p.full_name}</span>
                      <Badge variant="outline" className={TYPE_COLORS[p.employment_type]}>
                        {EMPLOYMENT_TYPE_LABELS[p.employment_type]}
                      </Badge>
                      {!p.is_active && <Badge variant="outline" className="opacity-60">Pasif</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
                      {p.occupation && <span>{p.occupation}</span>}
                      {p.employment_type === "daily_wage" && p.daily_wage ? <span>{p.daily_wage} ₺/gün</span> : null}
                      {p.employment_type === "monthly_salary" && p.monthly_salary ? <span>{p.monthly_salary} ₺/ay</span> : null}
                      {assigns.length > 0 && <span>{assigns.map((a) => projectName(a.project_id)).join(", ")}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(p.id)} className="text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <PersonnelForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} initial={editing} />

      <DeleteConfirmModal
        open={!!deleteId}
        onConfirm={async () => { if (deleteId) { await deletePerson(deleteId); } setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
        title="Kişiyi sil"
        description="Bu kişinin puantaj kayıtları da silinecek. Devam edilsin mi?"
      />
    </div>
  );
}
