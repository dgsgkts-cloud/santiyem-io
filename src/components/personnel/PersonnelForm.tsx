import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Personnel, EmploymentType } from "@/hooks/usePersonnel";
import { EMPLOYMENT_TYPE_LABELS, usePersonnel } from "@/hooks/usePersonnel";
import { useProjects } from "@/hooks/useProjects";
import { useSubcontractors } from "@/hooks/useSubcontractors";

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: Partial<Personnel> & { project_ids?: string[]; salary_shares?: Record<string, number> };
}

export default function PersonnelForm({ open, onClose, initial }: Props) {
  const { upsertPerson } = usePersonnel();
  const { projects } = useProjects();
  const { subcontractors } = useSubcontractors();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [type, setType] = useState<EmploymentType>("daily_wage");
  const [dailyWage, setDailyWage] = useState("");
  const [salary, setSalary] = useState("");
  const [subId, setSubId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [shares, setShares] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(initial?.full_name ?? "");
      setPhone(initial?.phone ?? "");
      setOccupation(initial?.occupation ?? "");
      setType((initial?.employment_type as EmploymentType) ?? "daily_wage");
      setDailyWage(initial?.daily_wage ? String(initial.daily_wage) : "");
      setSalary(initial?.monthly_salary ? String(initial.monthly_salary) : "");
      setSubId(initial?.subcontractor_id ?? "");
      setIsActive(initial?.is_active ?? true);
      setProjectIds(initial?.project_ids ?? []);
      setShares(initial?.salary_shares ?? {});
    }
  }, [open, initial]);

  const toggleProject = (id: string) => {
    setProjectIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    await upsertPerson(
      {
        id: initial?.id,
        full_name: fullName,
        phone: phone || null,
        occupation: occupation || null,
        employment_type: type,
        daily_wage: type === "daily_wage" ? Number(dailyWage) || 0 : 0,
        monthly_salary: type === "monthly_salary" ? Number(salary) || 0 : 0,
        subcontractor_id: type === "subcontractor_crew" ? (subId || null) : null,
        is_active: isActive,
      },
      projectIds,
      type === "monthly_salary" ? shares : undefined,
    );
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Kişiyi Düzenle" : "Yeni Kişi"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Ad Soyad *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefon (QR eşleşmesi için)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XX..." />
            </div>
            <div>
              <Label>Görev / Meslek</Label>
              <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Mühendis, demirci..." />
            </div>
          </div>

          <div>
            <Label>Çalışma Tipi *</Label>
            <Select value={type} onValueChange={(v) => setType(v as EmploymentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map((k) => (
                  <SelectItem key={k} value={k}>{EMPLOYMENT_TYPE_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "daily_wage" && (
            <div>
              <Label>Günlük Yevmiye (₺) *</Label>
              <Input type="number" inputMode="decimal" value={dailyWage} onChange={(e) => setDailyWage(e.target.value)} />
            </div>
          )}
          {type === "monthly_salary" && (
            <div>
              <Label>Aylık Maaş (₺) *</Label>
              <Input type="number" inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">
                Birden fazla projeye atarsanız aşağıdan dağılım yüzdesi girin.
              </p>
            </div>
          )}
          {type === "subcontractor_crew" && (
            <div>
              <Label>Bağlı Taşeron</Label>
              <Select value={subId} onValueChange={setSubId}>
                <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                <SelectContent>
                  {subcontractors.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Bu kişi için yevmiye/maaş hesaplanmaz; sadece yoklama tutulur.
              </p>
            </div>
          )}

          <div>
            <Label>Projeler</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded p-2">
              {projects.length === 0 && <p className="text-xs text-muted-foreground">Proje yok</p>}
              {projects.map((p) => {
                const checked = projectIds.includes(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <Checkbox checked={checked} onCheckedChange={() => toggleProject(p.id)} />
                    <span className="flex-1 text-sm">{p.name}</span>
                    {type === "monthly_salary" && checked && (
                      <Input
                        type="number"
                        className="w-20 h-7"
                        placeholder="%"
                        value={shares[p.id] ?? ""}
                        onChange={(e) => setShares((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
            Aktif
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button onClick={handleSave} disabled={saving || !fullName.trim()} className="bg-[#FF6B2B] hover:bg-[#FF6B2B]/90">
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
