import { useState, useMemo, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, CalendarDays, QrCode, Save, CheckCheck, Search } from "lucide-react";
import { usePersonnel, EMPLOYMENT_TYPE_LABELS } from "@/hooks/usePersonnel";
import { useAttendanceGrid, type AttendanceStatus } from "@/hooks/useAttendanceGrid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UnmatchedQRBanner from "./UnmatchedQRBanner";
import WorkforcePulse, { type PulseCounts } from "./WorkforcePulse";
import EmptyState from "@/components/desktop/EmptyState";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; icon: any; cls: string }[] = [
  { value: "full_day", label: "Tam", icon: CheckCircle2, cls: "bg-green-500/15 text-green-500 border-green-500/40" },
  { value: "half_day", label: "Yarım", icon: Clock, cls: "bg-yellow-500/15 text-yellow-500 border-yellow-500/40" },
  { value: "absent", label: "Yok", icon: XCircle, cls: "bg-red-500/15 text-red-500 border-red-500/40" },
  { value: "leave", label: "İzin", icon: CalendarDays, cls: "bg-blue-500/15 text-blue-500 border-blue-500/40" },
];

function todayIso() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const PULSE_TO_STATUS: Record<string, AttendanceStatus | null> = {
  present: "full_day",
  half: "half_day",
  absent: "absent",
  leave: "leave",
  unmarked: null,
};

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
  const [search, setSearch] = useState("");
  const [pulseFilter, setPulseFilter] = useState<string | null>(null);

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

  const setOne = (pid: string, status: AttendanceStatus) => setDraft((d) => ({ ...d, [pid]: status }));

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

  const counts: PulseCounts = useMemo(() => {
    const c: PulseCounts = { present: 0, half: 0, absent: 0, leave: 0, unmarked: 0, total: projectPersonnel.length };
    for (const p of projectPersonnel) {
      const s = draft[p.id];
      if (s === "full_day") c.present += 1;
      else if (s === "half_day") c.half += 1;
      else if (s === "absent") c.absent += 1;
      else if (s === "leave") c.leave += 1;
      else c.unmarked += 1;
    }
    return c;
  }, [draft, projectPersonnel]);

  const visiblePersonnel = useMemo(() => {
    const s = search.trim().toLocaleLowerCase("tr");
    return projectPersonnel.filter((p) => {
      if (pulseFilter) {
        const want = PULSE_TO_STATUS[pulseFilter];
        const has = draft[p.id];
        if (want === null ? !!has : has !== want) return false;
      }
      if (!s) return true;
      return p.full_name.toLocaleLowerCase("tr").includes(s) || (p.occupation ?? "").toLocaleLowerCase("tr").includes(s);
    });
  }, [projectPersonnel, search, pulseFilter, draft]);

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
    if (error) {
      toast.error("Kaydedilemedi");
      return;
    }
    toast.success(`${rows.length} kişinin yoklaması kaydedildi`);
    await refetch();
  };

  if (projectPersonnel.length === 0) {
    return (
      <div className="rounded-card border border-border/70 bg-card shadow-card">
        <EmptyState
          icon="👷"
          title="Bu projede aktif personel yok"
          description="Yoklama alabilmek için önce bu projeye personel atanmalı."
          firstStep="'Personeller' sekmesinden kişiyi açıp bu projeyi işaretleyin."
          aiHint="Atama yapıldığında QR girişleri otomatik eşleşir ve günlük devam raporu oluşur."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}>
      <UnmatchedQRBanner unmatched={unmatched} onAdded={refetch} />

      {/* 4 — Attendance answers who is present before any list */}
      <WorkforcePulse
        counts={counts}
        dateLabel={new Date(date + "T12:00:00").toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "long",
          weekday: "long",
        })}
        active={pulseFilter}
        onSelect={(k) => setPulseFilter(k)}
      />

      {/* Date + bulk actions, one compact card */}
      <div className="rounded-card border border-border/70 bg-card shadow-card p-3 space-y-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary shrink-0" />
          <input
            type="date"
            value={date}
            max={max}
            onChange={(e) => {
              const v = e.target.value;
              if (v && v <= max) setDate(v);
              else toast.error("Gelecek tarih seçilemez");
            }}
            aria-label="Yoklama tarihi"
            className="flex-1 min-w-0 h-11 px-3 rounded-button bg-background/60 border border-border/60 focus:border-primary/50 outline-none text-foreground"
            style={{ fontSize: 16 }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={markAllFull}
            className="h-11 rounded-button ds-body font-medium bg-emerald-500/12 text-emerald-500 border border-emerald-500/30 inline-flex items-center justify-center gap-1.5 hover:bg-emerald-500/20 active:scale-[0.98] transition-all"
          >
            <CheckCheck className="w-4 h-4" /> Hepsi Tam
          </button>
          <button
            onClick={markAllAbsent}
            className="h-11 rounded-button ds-body font-medium bg-card text-muted-foreground border border-border/70 inline-flex items-center justify-center gap-1.5 hover:text-foreground hover:border-border active:scale-[0.98] transition-all"
          >
            <XCircle className="w-4 h-4" /> Boşlar Gelmedi
          </button>
        </div>
        <p className="ds-caption text-muted-foreground">
          Yalnızca seçili gün etkilenir. QR ile giriş yapanlar otomatik "Tam Gün" gelir.
        </p>
      </div>

      {/* Search stays reachable above the list */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kişi ara…"
          aria-label="Kişi ara"
          className="w-full h-11 pl-9 pr-3 rounded-button bg-card border border-border/70 focus:border-primary/50 outline-none text-foreground placeholder:text-muted-foreground/70 transition-colors"
          style={{ fontSize: 16 }}
        />
      </div>

      {visiblePersonnel.length === 0 ? (
        <div className="rounded-card border border-border/70 bg-card shadow-card">
          <EmptyState
            icon="🔍"
            title="Bu görünümde kişi yok"
            description="Seçili durum filtresi veya arama hiçbir kişiyle eşleşmedi."
            firstStep="Filtreyi kaldırın ya da aramayı temizleyin."
            buttonText="Filtreyi temizle"
            onButtonClick={() => {
              setPulseFilter(null);
              setSearch("");
            }}
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          {visiblePersonnel.map((p) => {
            const current = draft[p.id];
            const isQr = qrIds.has(p.id);
            return (
              <div key={p.id} className="rounded-card border border-border/70 bg-card px-3 py-2.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="ds-body font-medium text-foreground truncate flex items-center gap-1.5">
                      {p.full_name}
                      {isQr && (
                        <span className="inline-flex items-center gap-0.5 ds-caption text-primary bg-primary/10 px-1.5 py-0.5 rounded-md shrink-0">
                          <QrCode className="w-3 h-3" /> QR
                        </span>
                      )}
                    </div>
                    <div className="ds-caption text-muted-foreground truncate">
                      {p.occupation || EMPLOYMENT_TYPE_LABELS[p.employment_type]}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {STATUS_OPTIONS.map((o) => {
                    const Icon = o.icon;
                    const active = current === o.value;
                    return (
                      <button
                        key={o.value}
                        onClick={() => setOne(p.id, o.value)}
                        aria-pressed={active}
                        className={cn(
                          "min-h-[44px] rounded-button border ds-caption font-medium flex items-center justify-center gap-1 transition-all active:scale-[0.97]",
                          active ? o.cls : "border-border/50 text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save bar — clears the bottom nav and never sits under the mic FAB */}
      <div
        className="fixed left-0 right-[76px] md:right-6 z-30 px-4 md:px-0 md:left-auto md:w-[320px]"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
      >
        <button
          onClick={save}
          disabled={saving}
          className="w-full h-12 rounded-button bg-primary text-primary-foreground ds-body font-semibold inline-flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-[0.98] disabled:opacity-60 transition-all"
        >
          <Save className="w-4 h-4" />
          {saving ? "Kaydediliyor…" : `Yoklamayı Kaydet (${counts.total - counts.unmarked})`}
        </button>
      </div>
    </div>
  );
}
