// Proje detayında "Makine & Ekipman" bölümü. Ana modül değil; proje bağlamında
// yaşar ve mevcut envanter tablolarını kullanır.
import { useState } from "react";
import { Truck, Plus, RotateCcw, Pencil, Archive } from "lucide-react";
import { SectionCard } from "@/components/ui/responsive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  useProjectEquipment, EQUIPMENT_STATUS_LABELS,
  type ProjectEquipment, type EquipmentInput,
} from "@/hooks/useProjectEquipment";

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  idle: "bg-muted text-muted-foreground border-border",
  maintenance: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  returned: "bg-sky-500/10 text-sky-500 border-sky-500/20",
};

const emptyForm: EquipmentInput = {
  name: "", category: "", quantityUnit: "adet", code: "",
  serialNumber: "", personName: "", expectedReturnAt: "", notes: "",
};

export default function ProjectEquipmentSection({
  projectId, canEdit,
}: { projectId: string; canEdit: boolean }) {
  const { items, loading, addEquipment, updateEquipment, returnEquipment, deactivateEquipment } =
    useProjectEquipment(projectId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectEquipment | null>(null);
  const [form, setForm] = useState<EquipmentInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  const startAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const startEdit = (row: ProjectEquipment) => {
    setEditing(row);
    setForm({
      name: row.name, category: row.category ?? "", quantityUnit: row.unit,
      code: row.code, serialNumber: row.serialNumber ?? "",
      personName: row.personName ?? "", expectedReturnAt: row.expectedReturnAt ?? "",
      notes: row.notes ?? "", maintenance: row.status === "maintenance",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const ok = editing ? await updateEquipment(editing, form) : await addEquipment(form);
    setSaving(false);
    if (ok) setOpen(false);
  };

  const field = (label: string, key: keyof EquipmentInput, type = "text") => (
    <label className="block">
      <span className="block text-fs-xs text-muted-foreground mb-1">{label}</span>
      <Input
        type={type}
        value={(form[key] as string) ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </label>
  );

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Truck className="w-4 h-4" style={{ color: "#FF6B2B" }} />
          Makine & Ekipman
        </span>
      }
      action={
        canEdit ? (
          <Button size="sm" variant="outline" onClick={startAdd} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> Makine / Ekipman Ekle
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <p className="text-fs-xs text-muted-foreground">Yükleniyor...</p>
      ) : items.length === 0 ? (
        <p className="text-fs-sm text-center py-6 text-muted-foreground">
          Bu projede kayıtlı makine veya ekipman yok.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((row) => (
            <div
              key={row.assignmentId ?? row.assetId}
              className="group flex flex-wrap items-center gap-3 p-3 rounded-lg bg-background border border-border"
            >
              <div className="min-w-0 flex-1">
                <p className="text-fs-sm font-medium text-foreground truncate">{row.name}</p>
                <p className="text-fs-xs text-muted-foreground truncate">
                  {[row.category, row.code, row.serialNumber, row.personName]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span className={`text-fs-xs px-2 py-0.5 rounded-full border ${STATUS_TONE[row.status]}`}>
                {EQUIPMENT_STATUS_LABELS[row.status]}
              </span>
              {canEdit && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(row)} aria-label="Düzenle"
                    className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {row.status !== "returned" && (
                    <button onClick={() => returnEquipment(row)} aria-label="İade et"
                      className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => deactivateEquipment(row)} aria-label="Pasife al"
                    className="w-8 h-8 rounded flex items-center justify-center text-destructive">
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Ekipmanı Düzenle" : "Makine / Ekipman Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field("Ad *", "name")}
            {field("Kategori / Tür", "category")}
            {field("Birim / Miktar", "quantityUnit")}
            {field("Plaka / Seri No / Kod", "serialNumber")}
            {field("Zimmetli Kişi", "personName")}
            {field("İade Tarihi", "expectedReturnAt", "date")}
            <div className="sm:col-span-2">{field("Not", "notes")}</div>
            <label className="sm:col-span-2 flex items-center gap-2 text-fs-sm text-foreground">
              <input
                type="checkbox"
                checked={!!form.maintenance}
                onChange={(e) => setForm((f) => ({ ...f, maintenance: e.target.checked }))}
              />
              Bakımda
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Vazgeç</Button>
            <Button onClick={submit} disabled={saving || !form.name.trim()}>
              {saving ? "Kaydediliyor..." : editing ? "Kaydet" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
