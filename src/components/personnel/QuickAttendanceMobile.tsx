import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Clock, CalendarDays, QrCode, Save, CheckCheck } from "lucide-react";
import { usePersonnel, EMPLOYMENT_TYPE_LABELS } from "@/hooks/usePersonnel";
import { useAttendanceGrid, type AttendanceStatus, STATUS_LABELS } from "@/hooks/useAttendanceGrid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UnmatchedQRBanner from "./UnmatchedQRBanner";

interface Props {
  projectId: string;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; icon: any; cls: string }[] = [
  { value: "full_day", label: "Tam", icon: CheckCircle2, cls: "bg-green-500/20 text-green-400 border-green-500/40" },
  { value: "half_day", label: "Yarım", icon: Clock, cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" },
  { value: "absent", label: "Gelmedi", icon: XCircle, cls: "bg-red-500/15 text-red-400 border-red-500/40" },
  { value: "leave", label: "İzin", icon: CalendarDays, cls: "bg-blue-500/15 text-blue-400 border-blue-500/40" },
];

function todayIso() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default function QuickAttendanceMobile({ projectId }: Props) {
  const { personnel, assignments } = usePersonnel();
  const [date, setDate] = useState<string>(todayIso());
  const max = todayIso();

  const monthDate = useMemo(() => new Date(date + "T12:00:00"), [date]);
  const { records, unmatched, refetch } = useAttendanceGrid(projectId, monthDate);

  const projectPersonnel = useMemo(() => {
    const ids = new Set(
      assignments.filter((a) => a.project_id === projectId && a.is_active).map((a) => a.personnel_id),
    );
    return personnel.filter((p) => ids.has(p.id) && p.is_active);
  }, [personnel, assignments, projectId]);

  // Local draft: personnel_id -> status (initialized from existing records for the day)
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [qrIds, setQrIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const next: Record<string, AttendanceStatus> = {};
    const qr = new Set<string>();
    for (const p of projectPersonnel) {
      const rec = records.find((r) => r.personnel_id === p.id && r.work_date === date);
      if (rec) {
        next[p.id] = rec.status;
        if (rec.source === "qr") qr.add(p.id);
      }
    }
    setDraft(next);
    setQrIds(qr);
  }, [date, records, projectPersonnel]);

  const setOne = (pid: string, status: AttendanceStatus) =>
    setDraft((d) => ({ ...d, [pid]: status }));

  const markAllFull = () => {
    const next: Record<string, AttendanceStatus> = { ...draft };
    for (const p of projectPersonnel) next[p.id] = "full_day";
    setDraft(next);
    toast.success(`${projectPersonnel.length} kişi "Tam Gün" işaretlendi (yalnızca ${date})`);
  };

  const markAllAbsent = () => {
    const next: Record<string, AttendanceStatus> = { ...draft };
    for (const p of projectPersonnel) {
      if (!qrIds.has(p.id)) next[p.id] = "absent";
    }
    setDraft(next);
  };

  const [saving, setSaving] = useState(false);
  const save = async () => {
    const rows = projectPersonnel
      .filter((p) => draft[p.id])
      .map((p) => ({
        personnel_id: p.id,
        project_id: projectId,
        work_date: date,
        status: draft[p.id],
      }));
    if (rows.length === 0) {
      toast.info("Kaydedilecek yoklama yok");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("bulk_upsert_attendance" as any, { _records: rows } as any);
    setSaving(false);
    if (error) { toast.error("Kaydedilemedi"); return; }
    toast.success(`${rows.length} kişinin yoklaması kaydedildi`);
    await refetch();
  };

  if (projectPersonnel.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Bu projeye atanmış aktif personel yok. "Liste" sekmesinden ekleyin.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      <UnmatchedQRBanner unmatched={unmatched} onAdded={refetch} />

      <Card className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-[#FF6B2B]" />
          <Input
            type="date"
            value={date}
            max={max}
            onChange={(e) => {
              const v = e.target.value;
              if (v && v <= max) setDate(v);
              else toast.error("Gelecek tarih seçilemez");
            }}
            className="text-base h-12 flex-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={markAllFull} className="h-12 bg-green-600 hover:bg-green-700 text-white">
            <CheckCheck className="w-4 h-4 mr-1" /> Hepsi Tam Gün
          </Button>
          <Button onClick={markAllAbsent} variant="outline" className="h-12">
            <XCircle className="w-4 h-4 mr-1" /> Boşları Gelmedi
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Yalnızca seçili gün ({date}) etkilenir. QR ile giriş yapanlar otomatik "Tam Gün" gelir.
        </p>
      </Card>

      <div className="space-y-2">
        {projectPersonnel.map((p) => {
          const current = draft[p.id];
          const isQr = qrIds.has(p.id);
          return (
            <Card key={p.id} className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate flex items-center gap-1.5">
                    {p.full_name}
                    {isQr && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-[#FF6B2B] bg-[#FF6B2B]/10 px-1.5 py-0.5 rounded">
                        <QrCode className="w-3 h-3" /> QR
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {EMPLOYMENT_TYPE_LABELS[p.employment_type]}
                    {p.occupation ? ` · ${p.occupation}` : ""}
                  </div>
                </div>
                {current && (
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {STATUS_LABELS[current]}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {STATUS_OPTIONS.map((o) => {
                  const Icon = o.icon;
                  const active = current === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => setOne(p.id, o.value)}
                      className={`min-h-[48px] rounded-md border text-xs font-medium flex flex-col items-center justify-center gap-0.5 transition ${
                        active ? o.cls : "border-border/40 text-muted-foreground hover:border-[#FF6B2B]/40"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4 z-30">
        <Button
          onClick={save}
          disabled={saving}
          className="w-full h-14 text-base bg-[#FF6B2B] hover:bg-[#FF6B2B]/90 text-white shadow-lg"
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? "Kaydediliyor…" : `${date} Yoklamasını Kaydet`}
        </Button>
      </div>
    </div>
  );
}
