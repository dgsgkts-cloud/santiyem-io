import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Phone, Pencil, Trash2, Users } from "lucide-react";
import { usePersonnel, EMPLOYMENT_TYPE_LABELS, type Personnel } from "@/hooks/usePersonnel";
import { useProjects } from "@/hooks/useProjects";
import PersonnelForm from "./PersonnelForm";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { SectionCard } from "@/components/ui/responsive/SectionCard";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive/ResponsiveTable";

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

  const columns: ResponsiveColumn<Personnel>[] = [
    {
      key: "name",
      header: "Ad Soyad",
      primary: true,
      cell: (p) => (
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-medium truncate">{p.full_name}</span>
          {!p.is_active && <Badge variant="outline" className="opacity-60">Pasif</Badge>}
        </div>
      ),
    },
    {
      key: "type",
      header: "Tip",
      cell: (p) => (
        <Badge variant="outline" className={TYPE_COLORS[p.employment_type]}>
          {EMPLOYMENT_TYPE_LABELS[p.employment_type]}
        </Badge>
      ),
    },
    {
      key: "phone",
      header: "Telefon",
      cell: (p) => p.phone ? (
        <span className="inline-flex items-center gap-1 text-fs-sm"><Phone className="w-3 h-3" />{p.phone}</span>
      ) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "occupation",
      header: "Görev",
      cell: (p) => p.occupation ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "wage",
      header: "Ücret",
      cell: (p) => {
        if (p.employment_type === "daily_wage" && p.daily_wage) return `${p.daily_wage} ₺/gün`;
        if (p.employment_type === "monthly_salary" && p.monthly_salary) return `${p.monthly_salary} ₺/ay`;
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: "projects",
      header: "Projeler",
      cell: (p) => {
        const names = assignments.filter((a) => a.personnel_id === p.id).map((a) => projectName(a.project_id));
        return names.length ? <span className="truncate">{names.join(", ")}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (p) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }} className="text-red-400">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Ara: ad veya telefon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1 flex-wrap">
          {(["all", "daily_wage", "monthly_salary", "subcontractor_crew"] as const).map((k) => (
            <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}
              className={filter === k ? "bg-primary hover:bg-primary/90" : ""}>
              {k === "all" ? "Tümü" : EMPLOYMENT_TYPE_LABELS[k as keyof typeof EMPLOYMENT_TYPE_LABELS]}
            </Button>
          ))}
        </div>
        <Button className="ml-auto bg-primary hover:bg-primary/90" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Yeni Kişi
        </Button>
      </div>

      <SectionCard padded={false}>
        {loading ? (
          <p className="text-fs-sm text-muted-foreground p-4">Yükleniyor...</p>
        ) : (
          <ResponsiveTable
            columns={columns}
            rows={filtered}
            rowKey={(p) => p.id}
            onRowClick={(p) => openEdit(p)}
            empty={
              <div className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-fs-sm text-muted-foreground">Henüz personel kaydı yok. "Yeni Kişi" ile ekleyin.</p>
              </div>
            }
          />
        )}
      </SectionCard>

      <PersonnelForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} initial={editing} />

      <DeleteConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => { if (deleteId) { await deletePerson(deleteId); } setDeleteId(null); }}
        title="Kişiyi sil"
        itemName={personnel.find((p) => p.id === deleteId)?.full_name ?? ""}
        extraWarning="Bu kişinin puantaj kayıtları da silinecek."
      />
    </div>
  );
}
