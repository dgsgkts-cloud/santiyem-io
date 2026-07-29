import { useState, useMemo } from "react";
import { Plus, Search, Users } from "lucide-react";
import { usePersonnel, EMPLOYMENT_TYPE_LABELS, type Personnel } from "@/hooks/usePersonnel";
import { useProjects } from "@/hooks/useProjects";
import PersonnelForm from "./PersonnelForm";
import PersonnelRow from "./PersonnelRow";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import EmptyState from "@/components/desktop/EmptyState";
import { SkeletonList } from "@/components/ui/Skeletons";
import { cn } from "@/lib/utils";

/**
 * SPRINT 38C — Dense, single-filter personnel list.
 * One search field + one merged chip row (type + passive), then rows.
 */

type FilterKey = "all" | "daily_wage" | "monthly_salary" | "subcontractor_crew" | "inactive";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "daily_wage", label: EMPLOYMENT_TYPE_LABELS.daily_wage },
  { key: "monthly_salary", label: EMPLOYMENT_TYPE_LABELS.monthly_salary },
  { key: "subcontractor_crew", label: EMPLOYMENT_TYPE_LABELS.subcontractor_crew },
  { key: "inactive", label: "Pasif" },
];

export default function PersonnelList() {
  const { personnel, assignments, loading, deletePerson } = usePersonnel();
  const { projects } = useProjects();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";

  const projectLabelFor = (personId: string) => {
    const names = assignments
      .filter((a) => a.personnel_id === personId && a.is_active)
      .map((a) => projectName(a.project_id))
      .filter((n) => n !== "—");
    if (names.length === 0) return "Proje atanmadı";
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1}`;
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLocaleLowerCase("tr");
    return personnel.filter((p) => {
      if (filter === "inactive" && p.is_active) return false;
      if (filter !== "all" && filter !== "inactive" && p.employment_type !== filter) return false;
      if (filter !== "inactive" && !p.is_active && !s) return true;
      if (!s) return true;
      return (
        p.full_name.toLocaleLowerCase("tr").includes(s) ||
        (p.phone ?? "").includes(s) ||
        (p.occupation ?? "").toLocaleLowerCase("tr").includes(s)
      );
    });
  }, [personnel, search, filter]);

  const openEdit = (p: Personnel) => {
    const projectIds = assignments.filter((a) => a.personnel_id === p.id).map((a) => a.project_id);
    const shares: Record<string, number> = {};
    assignments
      .filter((a) => a.personnel_id === p.id)
      .forEach((a) => {
        if (a.salary_share_percent != null) shares[a.project_id] = a.salary_share_percent;
      });
    setEditing({ ...p, project_ids: projectIds, salary_shares: shares });
    setShowForm(true);
  };

  const newPerson = () => {
    setEditing(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-3">
      {/* Search — always the most accessible control */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Personel ara…"
            aria-label="Personel ara"
            className="w-full h-11 pl-9 pr-3 rounded-button bg-card border border-border/70 focus:border-primary/50 outline-none text-foreground placeholder:text-muted-foreground/70 transition-colors"
            style={{ fontSize: 16 }}
          />
        </div>
        <button
          onClick={newPerson}
          aria-label="Yeni kişi"
          className="h-11 px-3.5 shrink-0 rounded-button bg-primary text-primary-foreground ds-body font-semibold inline-flex items-center gap-1.5 hover:brightness-110 active:scale-[0.97] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Yeni Kişi</span>
        </button>
      </div>

      {/* One merged filter row */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 h-8 px-3 rounded-full ds-caption font-medium border transition-all",
                active
                  ? "bg-primary/12 text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-border/60 hover:text-foreground hover:border-border",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Rows */}
      <div className="rounded-card border border-border/70 bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="p-3">
            <SkeletonList rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          personnel.length === 0 ? (
            <EmptyState
              icon="👷"
              title="Henüz personel yok"
              description="Ekibinizi buraya ekleyince puantaj, maliyet ve QR eşleşmeleri otomatik çalışmaya başlar."
              firstStep="İlk kişiyi ekleyin: ad, çalışma tipi ve varsa günlük ücret yeterli."
              aiHint="Şantiyem AI, kayıtlı ekip üzerinden devamsızlık ve işçilik maliyeti uyarıları üretir."
              buttonText="Yeni Kişi Ekle"
              onButtonClick={newPerson}
            />
          ) : (
            <EmptyState
              icon="🔍"
              title="Eşleşen kişi yok"
              description="Bu arama ve filtre birleşimi hiçbir personelle eşleşmedi."
              firstStep="Aramayı temizleyin ya da filtreyi 'Tümü' yapın."
              buttonText="Filtreyi temizle"
              onButtonClick={() => {
                setSearch("");
                setFilter("all");
              }}
            />
          )
        ) : (
          <>
            <div className="divide-y divide-border/50">
              {filtered.map((p) => (
                <PersonnelRow
                  key={p.id}
                  person={p}
                  projectLabel={projectLabelFor(p.id)}
                  onOpen={() => openEdit(p)}
                  onDelete={() => setDeleteId(p.id)}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-border/50">
              <Users className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="ds-caption text-muted-foreground tabular-nums">
                {filtered.length} kişi{filter !== "all" ? ` · ${personnel.length} toplam` : ""}
              </span>
            </div>
          </>
        )}
      </div>

      <PersonnelForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        initial={editing}
      />

      <DeleteConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) await deletePerson(deleteId);
          setDeleteId(null);
        }}
        title="Kişiyi sil"
        itemName={personnel.find((p) => p.id === deleteId)?.full_name ?? ""}
        extraWarning="Bu kişinin puantaj kayıtları da silinecek."
      />
    </div>
  );
}
