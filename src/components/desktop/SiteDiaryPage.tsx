import { useState, useMemo } from "react";
import AttendancePanel from "./AttendancePanel";
import { useWorkerAttendance } from "@/hooks/useWorkerAttendance";
import QrCodeModal from "./QrCodeModal";
import { useProjects } from "@/hooks/useProjects";
import { useSiteDiary, DiaryEntry, CrewRow, MaterialRow, MachineRow } from "@/hooks/useSiteDiary";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useUser } from "@/contexts/UserContext";
import PullToRefresh from "@/components/PullToRefresh";
import { Capacitor } from "@capacitor/core";
import { Plus, ChevronLeft, Calendar, Camera, Sun, Cloud, CloudRain, Snowflake, CloudFog, CloudSun, Edit, Trash2, FileText, Users, Wrench, Package, AlertTriangle, CheckCircle, XCircle, Eye, FileDown, X, QrCode, HardHat, BookOpen } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay, subDays, startOfWeek, endOfWeek, isYesterday, isThisWeek, isWithinInterval } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { takePhoto, pickFromGallery } from "@/lib/capturePhoto";

const WEATHER_OPTIONS = [
  { icon: "☀️", label: "Güneşli", lucide: Sun },
  { icon: "🌤️", label: "Parçalı Bulutlu", lucide: CloudSun },
  { icon: "☁️", label: "Bulutlu", lucide: Cloud },
  { icon: "🌧️", label: "Yağmurlu", lucide: CloudRain },
  { icon: "❄️", label: "Karlı", lucide: Snowflake },
  { icon: "🌫️", label: "Sisli", lucide: CloudFog },
];

const WORK_STATUS = [
  { value: "normal", label: "Normal", icon: "✅", color: "#22C55E" },
  { value: "partial", label: "Kısmi", icon: "⚠️", color: "#F59E0B" },
  { value: "stopped", label: "Durdu", icon: "❌", color: "#EF4444" },
];

const SPECIAL_EVENTS_OPTIONS = [
  "Yapı denetim ziyareti oldu",
  "İşveren ziyareti oldu",
  "İş kazası / ramak kala yaşandı",
  "Numune alındı (beton, demir vb.)",
  "Teknik sorun yaşandı",
];


type View = "list" | "form" | "detail";

const SiteDiaryPage = () => {
  const { user } = useUser();
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const { entries: dbEntries, photos, isLoading, createEntry, updateEntry, deleteEntry, uploadPhoto, deletePhoto, refetch } = useSiteDiary(selectedProjectId || undefined);
  const { attendance: attendanceRecords } = useWorkerAttendance(selectedProjectId || undefined);
  const [view, setView] = useState<View>("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const entries = dbEntries;

  // Form state
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formWeather, setFormWeather] = useState("☀️");
  const [formTemp, setFormTemp] = useState<string>("");
  const [formWorkStatus, setFormWorkStatus] = useState("normal");
  const [formStopReason, setFormStopReason] = useState("");
  const [formCrews, setFormCrews] = useState<CrewRow[]>([{ team: "Kalıpçı", count: 0, hours: 8, note: "" }]);
  const [formWorkDone, setFormWorkDone] = useState("");
  const [formMaterials, setFormMaterials] = useState<MaterialRow[]>([]);
  const [formMachines, setFormMachines] = useState<MachineRow[]>([]);
  const [formSpecialEvents, setFormSpecialEvents] = useState<string[]>([]);
  const [formSpecialNotes, setFormSpecialNotes] = useState<Record<string, string>>({});
  const [formGeneralNote, setFormGeneralNote] = useState("");
  const [formStatus, setFormStatus] = useState("published");
  const [formPhotos, setFormPhotos] = useState<File[]>([]);
  const [formPhotoDescs, setFormPhotoDescs] = useState<string[]>([]);
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodStart, setPeriodStart] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [includePhotos, setIncludePhotos] = useState(true);

  // Past entries filters
  type DateFilter = "today" | "week" | "month" | "all" | "custom";
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  const getAttendanceCrews = (date: string): { team: string; count: number; hours: number; note: string }[] => {
    const dayRecords = attendanceRecords.filter(a => {
      try { return format(parseISO(a.check_in), "yyyy-MM-dd") === date; } catch { return false; }
    });
    if (dayRecords.length === 0) return [{ team: "Kalıpçı", count: 0, hours: 8, note: "" }];
    
    const map: Record<string, number> = {};
    dayRecords.forEach(a => {
      const label = a.entry_type === "team" ? a.occupation : (a.title || a.occupation);
      map[label] = (map[label] || 0) + (a.team_size || 1);
    });
    const crews = Object.entries(map).map(([team, count]) => ({ team, count, hours: 8, note: "QR'den otomatik" }));
    return crews.length > 0 ? crews : [{ team: "Kalıpçı", count: 0, hours: 8, note: "" }];
  };

  const resetForm = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setFormDate(today);
    setFormWeather("☀️");
    setFormTemp("");
    setFormWorkStatus("normal");
    setFormStopReason("");
    setFormCrews(getAttendanceCrews(today));
    setFormWorkDone("");
    setFormMaterials([]);
    setFormMachines([]);
    setFormSpecialEvents([]);
    setFormSpecialNotes({});
    setFormGeneralNote("");
    setFormStatus("published");
    setFormPhotos([]);
    setFormPhotoDescs([]);
    setIsQuickMode(false);
    setEditingEntry(null);
  };

  const handleSave = async () => {
    if (!selectedProjectId) { toast.error("Proje seçin"); return; }
    setIsSaving(true);
    try {
      const payload = {
        project_id: selectedProjectId,
        entry_date: formDate,
        weather_icon: formWeather,
        weather_temp: formTemp ? parseInt(formTemp) : null,
        work_status: formWorkStatus,
        work_stopped_reason: formWorkStatus === "stopped" ? formStopReason : null,
        crews: formCrews.filter(c => c.count > 0),
        work_done: formWorkDone,
        materials: formMaterials.filter(m => m.name),
        machines: formMachines.filter(m => m.name),
        special_events: formSpecialEvents,
        general_note: formGeneralNote,
        status: formStatus,
      };

      if (editingEntry) {
        await updateEntry.mutateAsync({ id: editingEntry.id, ...payload } as any);
        // Upload new photos even when editing
        if (formPhotos.length > 0) {
          for (let i = 0; i < formPhotos.length; i++) {
            await uploadPhoto(formPhotos[i], editingEntry.id, formPhotoDescs[i] || "");
          }
        }
      } else {
        const result = await createEntry.mutateAsync(payload as any);
        if (formPhotos.length > 0 && result?.id) {
          for (let i = 0; i < formPhotos.length; i++) {
            await uploadPhoto(formPhotos[i], result.id, formPhotoDescs[i] || "");
          }
        }
      }
      resetForm();
      setView("list");
    } catch (e: any) {
      console.error(e);
    }
    setIsSaving(false);
  };

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getEntryForDay = (day: Date) => entries.find(e => isSameDay(parseISO(e.entry_date), day));
  const entryPhotos = (entryId: string) => photos.filter(p => p.diary_entry_id === entryId);

  const totalWorkers = (crews: CrewRow[]) => crews.reduce((s, c) => s + c.count, 0);
  const totalManHours = (crews: CrewRow[]) => crews.reduce((s, c) => s + c.count * c.hours, 0);
  const weatherOption = (icon: string) => WEATHER_OPTIONS.find(w => w.icon === icon) || WEATHER_OPTIONS[0];

  const deleteModal = (
    <DeleteConfirmModal
      open={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={async () => { if (deleteTarget) { await deleteEntry.mutateAsync(deleteTarget.id); setSelectedEntry(null); setView("list"); } }}
      title={`${deleteTarget?.type || "Kaydı"} Sil`}
      itemName={deleteTarget?.name}
    />
  );

  // Calendar view
  if (view === "list") {
    const recent = [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
    const startDayOfWeek = (startOfMonth(currentMonth).getDay() + 6) % 7; // Monday = 0

    return (
      <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
        {deleteModal}
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Şantiye Günlüğü</h1>
            <p className="text-sm mt-0.5 text-muted-foreground">Günlük şantiye kayıtlarınızı yönetin</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="flex-1 sm:min-w-[280px] sm:max-w-[400px] h-9 rounded-lg px-3 text-sm bg-card border border-border text-foreground"
            >
              <option value="">Proje seçin...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {selectedProjectId && entries.length > 0 && (
              <button
                onClick={() => setShowPeriodModal(true)}
                className="h-9 px-3 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                style={{ backgroundColor: "#1E2732", border: "1px solid #334155" }}
              >
                <FileDown className="w-4 h-4 text-muted-foreground" /> <span className="text-foreground">Dönem Raporu</span>
              </button>
            )}
            <button
              onClick={() => { resetForm(); setView("form"); }}
              disabled={!selectedProjectId}
              className="h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}
            >
              <Plus className="w-4 h-4" /> Bugünün Kaydı
            </button>
          </div>
        </div>

        {/* Period Report Modal */}
        {showPeriodModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
            <div className="w-full max-w-md rounded-2xl p-6 space-y-4 bg-card border border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">📄 Dönem Raporu İndir</h3>
                <button onClick={() => setShowPeriodModal(false)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block text-muted-foreground">Başlangıç</label>
                  <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
                    className="w-full h-9 rounded-lg px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs mb-1 block text-muted-foreground">Bitiş</label>
                  <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
                    className="w-full h-9 rounded-lg px-3 text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground">
                <input type="checkbox" checked={includePhotos} onChange={e => setIncludePhotos(e.target.checked)} className="rounded" />
                📷 Fotoğrafları dahil et
              </label>
              <p className="text-xs" style={{ color: "#475569" }}>
                Seçili dönemde {entries.filter(e => e.entry_date >= periodStart && e.entry_date <= periodEnd).length} kayıt bulundu
              </p>
              <button
                onClick={() => {
                  const filtered = entries.filter(e => e.entry_date >= periodStart && e.entry_date <= periodEnd);
                  if (filtered.length === 0) { toast.error("Seçili dönemde kayıt bulunamadı"); return; }
                  const projName = projects.find(pr => pr.id === selectedProjectId)?.name || "Proje";
                  import("@/lib/siteDiaryExport").then(m => {
                    m.exportPeriodPDF(filtered, projName, photos, includePhotos, periodStart, periodEnd);
                    toast.success("Dönem raporu indirildi");
                  });
                  setShowPeriodModal(false);
                }}
                className="w-full h-10 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: "#FF6B2B" }}
              >
                {Capacitor.isNativePlatform() ? "📤 Paylaş / Kaydet" : "PDF Oluştur"}
              </button>
            </div>
          </div>
        )}

        {!selectedProjectId && (
          <div className="rounded-2xl p-10 sm:p-16 text-center flex flex-col items-center bg-card border border-border">
            {projects.length === 0 ? (
              <>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "rgba(255,107,43,0.12)" }}>
                  <FileText className="w-8 h-8" style={{ color: "#FF6B2B" }} />
                </div>
                <h2 className="text-lg font-bold mb-2 text-foreground">Henüz Proje Eklenmemiş</h2>
                <p className="text-sm mb-6 max-w-sm text-muted-foreground">
                  Şantiye günlüğü tutmak için önce bir proje oluşturun.
                </p>
                <button
                  onClick={() => {
                    const event = new CustomEvent("navigate-tab", { detail: "projects" });
                    window.dispatchEvent(event);
                  }}
                  className="h-11 px-6 rounded-xl text-sm font-semibold transition-colors"
                  style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}
                >
                  Proje Oluştur
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "rgba(255,107,43,0.12)" }}>
                  <Calendar className="w-8 h-8" style={{ color: "#FF6B2B" }} />
                </div>
                <h2 className="text-lg font-bold mb-2 text-foreground">Şantiye Günlüğüne Hoş Geldiniz</h2>
                <p className="text-sm mb-6 max-w-sm text-muted-foreground">
                  Günlük kayıt tutmak için önce bir proje seçin
                </p>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full max-w-sm h-11 rounded-xl px-4 text-sm mb-4 cursor-pointer bg-card border border-border text-foreground"
                >
                  <option value="">Proje seçin...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button
                  onClick={() => {
                    if (!selectedProjectId) { toast.error("Önce bir proje seçin"); return; }
                    resetForm();
                    setView("form");
                  }}
                  className="h-11 px-6 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
                  style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}
                >
                  <Plus className="w-4 h-4" /> Bugünün Kaydını Başlat
                </button>
              </>
            )}
          </div>
        )}

        {selectedProjectId && (
          <PullToRefresh onRefresh={refetch}>
            <>
              {/* Worker Attendance Section */}
              <div className="rounded-xl p-4 bg-card border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <HardHat className="w-4 h-4 text-primary" /> İşçi Devam Takibi
                  </h3>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" /> QR Kod
                  </button>
                </div>
                <AttendancePanel projectId={selectedProjectId} projectName={selectedProject?.name || ""} />
              </div>

              {showQrModal && selectedProject && (
                <QrCodeModal
                  projectId={selectedProjectId}
                  projectName={selectedProject.name}
                  onClose={() => setShowQrModal(false)}
                />
              )}

              {/* Calendar */}
              <div className="rounded-xl p-4 bg-card border border-border">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))} className="text-sm px-3 py-1 rounded-lg hover:bg-white/5 text-muted-foreground">← Önceki</button>
                  <h3 className="text-sm font-semibold text-foreground">{format(currentMonth, "MMMM yyyy", { locale: tr })}</h3>
                  <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))} className="text-sm px-3 py-1 rounded-lg hover:bg-white/5 text-muted-foreground">Sonraki →</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(d => (
                    <div key={d} className="text-[10px] font-semibold py-1" style={{ color: "#475569" }}>{d}</div>
                  ))}
                  {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`pad-${i}`} />)}
                  {calendarDays.map(day => {
                    const entry = getEntryForDay(day);
                    const hasPhotos = entry ? entryPhotos(entry.id).length > 0 || entry.id.startsWith("mock-") : false;
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => { if (entry) { setSelectedEntry(entry); setView("detail"); } }}
                        className="relative p-1.5 rounded-lg text-center transition-colors hover:bg-white/5"
                        style={{ minHeight: 44 }}
                      >
                        <span className="text-xs" style={{ color: isToday(day) ? "#FF6B2B" : isSameMonth(day, currentMonth) ? "#94A3B8" : "#334155", fontWeight: isToday(day) ? 700 : 400 }}>
                          {format(day, "d")}
                        </span>
                        {entry && (
                          <div className="flex items-center justify-center gap-0.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.work_status === "stopped" ? "#EF4444" : entry.work_status === "partial" ? "#F59E0B" : "#22C55E" }} />
                            {hasPhotos && <Camera className="w-2.5 h-2.5 text-muted-foreground" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Past entries with filters */}
              {(() => {
                const now = new Date();
                const filtered = recent.filter(e => {
                  const d = parseISO(e.entry_date);
                  if (dateFilter === "today") return isToday(d);
                  if (dateFilter === "week") return isWithinInterval(d, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });
                  if (dateFilter === "month") return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) });
                  if (dateFilter === "custom") {
                    try { return e.entry_date >= customStart && e.entry_date <= customEnd; } catch { return true; }
                  }
                  return true;
                });

                const groups: { key: string; label: string; items: typeof filtered }[] = [
                  { key: "today", label: "Bugün", items: [] },
                  { key: "yesterday", label: "Dün", items: [] },
                  { key: "week", label: "Bu Hafta", items: [] },
                  { key: "older", label: "Daha Eski", items: [] },
                ];
                filtered.forEach(e => {
                  const d = parseISO(e.entry_date);
                  if (isToday(d)) groups[0].items.push(e);
                  else if (isYesterday(d)) groups[1].items.push(e);
                  else if (isThisWeek(d, { weekStartsOn: 1 })) groups[2].items.push(e);
                  else groups[3].items.push(e);
                });

                const filterChips: { value: DateFilter; label: string }[] = [
                  { value: "today", label: "Bugün" },
                  { value: "week", label: "Bu Hafta" },
                  { value: "month", label: "Bu Ay" },
                  { value: "all", label: "Tümü" },
                  { value: "custom", label: "Özel" },
                ];

                const renderEntry = (entry: DiaryEntry) => {
                  const epCount = entryPhotos(entry.id).length;
                  return (
                    <div
                      key={entry.id}
                      className="w-full rounded-xl p-3 flex items-center gap-3 transition-colors bg-card border border-border group hover:bg-white/5"
                    >
                      <button
                        type="button"
                        onClick={() => { setSelectedEntry(entry); setView("detail"); }}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                        style={{ minHeight: 48 }}
                        aria-label={`${format(parseISO(entry.entry_date), "d MMMM yyyy", { locale: tr })} kaydını aç`}
                      >
                        {(() => {
                          const WeatherIcon = weatherOption(entry.weather_icon).lucide;
                          return <WeatherIcon className="w-5 h-5 shrink-0 text-primary" />;
                        })()}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {format(parseISO(entry.entry_date), "d MMMM yyyy, EEEE", { locale: tr })}
                            <span className="text-xs text-muted-foreground ml-2">
                              {format(parseISO(entry.created_at), "HH:mm")}
                            </span>
                          </p>
                          <p className="text-xs truncate text-muted-foreground">
                            {selectedProject?.name ? `${selectedProject.name} · ` : ""}{totalWorkers(entry.crews)} işçi · {epCount > 0 ? `📷 ${epCount} · ` : ""}{entry.work_done?.slice(0, 50) || "Açıklama yok"}
                          </p>
                          {entry.updated_at && entry.created_at && new Date(entry.updated_at).getTime() - new Date(entry.created_at).getTime() > 60000 && (
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                              Son düzenlenme: {format(parseISO(entry.updated_at), "d MMM yyyy HH:mm", { locale: tr })}
                            </p>
                          )}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{
                          backgroundColor: entry.work_status === "stopped" ? "rgba(239,68,68,0.15)" : entry.work_status === "partial" ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)",
                          color: entry.work_status === "stopped" ? "#EF4444" : entry.work_status === "partial" ? "#F59E0B" : "#22C55E",
                        }}>
                          {WORK_STATUS.find(w => w.value === entry.work_status)?.label}
                        </span>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEntry(entry);
                            setFormDate(entry.entry_date);
                            setFormWeather(entry.weather_icon);
                            setFormTemp(entry.weather_temp?.toString() || "");
                            setFormWorkStatus(entry.work_status);
                            setFormStopReason(entry.work_stopped_reason || "");
                            setFormCrews(entry.crews.length > 0 ? entry.crews : [{ team: "", count: 0, hours: 8, note: "" }]);
                            setFormWorkDone(entry.work_done);
                            setFormMaterials(entry.materials);
                            setFormMachines(entry.machines);
                            setFormSpecialEvents(entry.special_events);
                            setFormGeneralNote(entry.general_note);
                            setView("form");
                          }}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-white/5"
                          aria-label="Düzenle"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({
                              id: entry.id,
                              name: format(parseISO(entry.entry_date), "d MMMM yyyy", { locale: tr }),
                              type: "Günlük Kaydı",
                            });
                          }}
                          className="w-9 h-9 rounded-lg flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          style={{ color: "#EF4444" }}
                          aria-label="Sil"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">Geçmiş Kayıtlar</h3>
                      {!isLoading && (
                        <span className="text-xs text-muted-foreground">
                          {filtered.length} kayıt bulundu
                        </span>
                      )}
                    </div>

                    {/* Filter chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {filterChips.map(c => (
                        <button
                          key={c.value}
                          onClick={() => setDateFilter(c.value)}
                          className="h-8 px-3 rounded-full text-xs font-medium transition-colors border"
                          style={{
                            backgroundColor: dateFilter === c.value ? "#FF6B2B" : "transparent",
                            color: dateFilter === c.value ? "#FFF" : "hsl(var(--muted-foreground))",
                            borderColor: dateFilter === c.value ? "#FF6B2B" : "hsl(var(--border))",
                          }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    {dateFilter === "custom" && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="date"
                          value={customStart}
                          onChange={e => setCustomStart(e.target.value)}
                          className="h-9 rounded-lg px-3 text-sm bg-card border border-border text-foreground"
                          style={{ minHeight: 36 }}
                        />
                        <span className="text-xs text-muted-foreground">—</span>
                        <input
                          type="date"
                          value={customEnd}
                          onChange={e => setCustomEnd(e.target.value)}
                          className="h-9 rounded-lg px-3 text-sm bg-card border border-border text-foreground"
                          style={{ minHeight: 36 }}
                        />
                      </div>
                    )}

                    {isLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="rounded-xl p-3 bg-card border border-border animate-pulse">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-muted/40" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 bg-muted/40 rounded w-2/3" />
                                <div className="h-2.5 bg-muted/30 rounded w-1/2" />
                              </div>
                              <div className="h-5 w-16 rounded-full bg-muted/30" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filtered.length === 0 ? (
                      <p className="text-sm text-center py-6" style={{ color: "#475569" }}>
                        {recent.length === 0 ? "Bu proje için henüz kayıt yok" : "Seçili filtrede kayıt bulunamadı"}
                      </p>
                    ) : (
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 -mr-1">
                        {groups.filter(g => g.items.length > 0).map(g => (
                          <div key={g.key} className="space-y-2">
                            <div className="flex items-center gap-2 sticky top-0 bg-background/80 backdrop-blur-sm py-1 z-10">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</h4>
                              <span className="text-xs text-muted-foreground">({g.items.length})</span>
                            </div>
                            <div className="space-y-2">
                              {g.items.map(renderEntry)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          </PullToRefresh>
        )}
      </div>
    );
  }

  // Detail view
  if (view === "detail" && selectedEntry) {
    const ws = WORK_STATUS.find(w => w.value === selectedEntry.work_status);
    const ep = entryPhotos(selectedEntry.id);
    return (
      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
        {deleteModal}
        <div className="flex items-center justify-between">
          <button onClick={() => { setSelectedEntry(null); setView("list"); }} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ChevronLeft className="w-4 h-4" /> Şantiye Günlüğü
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const projName = projects.find(pr => pr.id === selectedProjectId)?.name || "Proje";
                import("@/lib/siteDiaryExport").then(m => {
                  m.exportSingleDayPDF(selectedEntry, projName, ep, true);
                  toast.success("PDF indirildi");
                });
              }}
              className="h-8 px-3 rounded-lg text-xs flex items-center gap-1.5"
              style={{ backgroundColor: "#1E2732", border: "1px solid #334155" }}
            >
              <FileDown className="w-3.5 h-3.5" /> {Capacitor.isNativePlatform() ? "📤 Paylaş / Kaydet" : "⬇️ İndir"}
            </button>
            <button onClick={() => {
              setEditingEntry(selectedEntry);
              setFormDate(selectedEntry.entry_date);
              setFormWeather(selectedEntry.weather_icon);
              setFormTemp(selectedEntry.weather_temp?.toString() || "");
              setFormWorkStatus(selectedEntry.work_status);
              setFormStopReason(selectedEntry.work_stopped_reason || "");
              setFormCrews(selectedEntry.crews.length > 0 ? selectedEntry.crews : [{ team: "", count: 0, hours: 8, note: "" }]);
              setFormWorkDone(selectedEntry.work_done);
              setFormMaterials(selectedEntry.materials);
              setFormMachines(selectedEntry.machines);
              setFormSpecialEvents(selectedEntry.special_events);
              setFormGeneralNote(selectedEntry.general_note);
              setView("form");
            }} className="h-8 px-3 rounded-lg text-xs flex items-center gap-1.5" style={{ backgroundColor: "#1E2732", color: "#94A3B8" }}>
              <Edit className="w-3.5 h-3.5" /> Düzenle
            </button>
            <button onClick={() => setDeleteTarget({ id: selectedEntry.id, name: format(parseISO(selectedEntry.entry_date), "d MMMM yyyy", { locale: tr }), type: "Günlük Kaydı" })} className="h-8 px-3 rounded-lg text-xs flex items-center gap-1.5" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
              <Trash2 className="w-3.5 h-3.5" /> Sil
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="rounded-xl p-4 bg-card border border-border">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{selectedEntry.weather_icon}</span>
            <div>
              <h2 className="text-lg font-bold text-foreground">{format(parseISO(selectedEntry.entry_date), "d MMMM yyyy, EEEE", { locale: tr })}</h2>
              <div className="flex items-center gap-2 mt-1">
                {selectedEntry.weather_temp && <span className="text-xs text-muted-foreground">{selectedEntry.weather_temp}°C</span>}
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${ws?.color}20`, color: ws?.color }}>{ws?.icon} {ws?.label}</span>
              </div>
            </div>
          </div>
          {selectedEntry.work_status === "stopped" && selectedEntry.work_stopped_reason && (
            <div className="mt-3 p-2 rounded-lg text-xs" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
              Durma nedeni: {selectedEntry.work_stopped_reason}
            </div>
          )}
        </div>

        {/* Workforce */}
        {selectedEntry.crews.length > 0 && (
          <div className="rounded-xl p-4 bg-card border border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-foreground"><Users className="w-4 h-4" style={{ color: "#FF6B2B" }} /> İşgücü</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr style={{ borderBottom: "1px solid #1E2732" }}>
                  <th className="text-left py-2 pr-3 text-muted-foreground">Ekip</th>
                  <th className="text-center py-2 px-3 text-muted-foreground">Kişi</th>
                  <th className="text-center py-2 px-3 text-muted-foreground">Saat</th>
                  <th className="text-left py-2 pl-3 text-muted-foreground">Not</th>
                </tr></thead>
                <tbody>
                  {selectedEntry.crews.map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1E2732" }}>
                      <td className="py-2 pr-3 text-foreground">{c.team}</td>
                      <td className="text-center py-2 px-3 text-muted-foreground">{c.count}</td>
                      <td className="text-center py-2 px-3 text-muted-foreground">{c.hours}</td>
                      <td className="py-2 pl-3 text-muted-foreground">{c.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs font-medium" style={{ color: "#FF6B2B" }}>
              Toplam {totalWorkers(selectedEntry.crews)} işçi · {totalManHours(selectedEntry.crews)} adam/saat
            </p>
          </div>
        )}

        {/* Work done */}
        {selectedEntry.work_done && (
          <div className="rounded-xl p-4 bg-card border border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-foreground"><Wrench className="w-4 h-4" style={{ color: "#FF6B2B" }} /> Yapılan İşler</h3>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{selectedEntry.work_done}</p>
          </div>
        )}

        {/* Materials */}
        {selectedEntry.materials.length > 0 && (
          <div className="rounded-xl p-4 bg-card border border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-foreground"><Package className="w-4 h-4" style={{ color: "#FF6B2B" }} /> Malzemeler</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr style={{ borderBottom: "1px solid #1E2732" }}>
                  <th className="text-left py-2 text-muted-foreground">Malzeme</th>
                  <th className="text-center py-2 text-muted-foreground">Miktar</th>
                  <th className="text-center py-2 text-muted-foreground">Birim</th>
                  <th className="text-center py-2 text-muted-foreground">Giriş/Çıkış</th>
                </tr></thead>
                <tbody>
                  {selectedEntry.materials.map((m, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1E2732" }}>
                      <td className="py-2 text-foreground">{m.name}</td>
                      <td className="text-center py-2 text-muted-foreground">{m.quantity}</td>
                      <td className="text-center py-2 text-muted-foreground">{m.unit}</td>
                      <td className="text-center py-2 text-muted-foreground">{m.direction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Special events */}
        {selectedEntry.special_events.length > 0 && (
          <div className="rounded-xl p-4 bg-card border border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-foreground"><AlertTriangle className="w-4 h-4" style={{ color: "#F59E0B" }} /> Özel Durumlar</h3>
            <ul className="space-y-1">
              {selectedEntry.special_events.map((e, i) => (
                <li key={i} className="text-xs flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} /> {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* General note */}
        {selectedEntry.general_note && (
          <div className="rounded-xl p-4 bg-card border border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-foreground"><FileText className="w-4 h-4" style={{ color: "#FF6B2B" }} /> Genel Not</h3>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{selectedEntry.general_note}</p>
          </div>
        )}

        {/* Photos */}
        {ep.length > 0 && (
          <div className="rounded-xl p-4 bg-card border border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-foreground"><Camera className="w-4 h-4" style={{ color: "#FF6B2B" }} /> Fotoğraflar ({ep.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ep.map(photo => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden">
                  <img src={photo.photo_url} alt={photo.description || ""} className="w-full aspect-square object-cover cursor-pointer" onClick={() => window.open(photo.photo_url, "_blank")} />
                  {photo.description && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                      <p className="text-[10px] text-white truncate">{photo.description}</p>
                    </div>
                  )}
                  <button
                    onClick={async () => {
                      if (confirm("Bu fotoğrafı silmek istediğinize emin misiniz?")) {
                        await deletePhoto(photo.id);
                        toast.success("Fotoğraf silindi");
                      }
                    }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
                  >
                    <Trash2 className="w-3 h-3" style={{ color: "#EF4444" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Form view
  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => { resetForm(); setView("list"); }} className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ChevronLeft className="w-4 h-4" /> Geri
        </button>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground">
            <input type="checkbox" checked={isQuickMode} onChange={e => setIsQuickMode(e.target.checked)} className="rounded" />
            ⚡ Hızlı Kayıt
          </label>
        </div>
      </div>

      <h2 className="text-lg font-bold text-foreground">{editingEntry ? "Kaydı Düzenle" : "Yeni Günlük Kaydı"}</h2>

      {/* Section 1: General */}
      <div className="rounded-xl p-4 space-y-4 bg-card border border-border">
        <h3 className="text-sm font-semibold text-foreground">📋 Genel Bilgiler</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs mb-1 block text-muted-foreground">Tarih</label>
            <input
              type="date"
              value={formDate}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={e => {
                const val = e.target.value;
                if (val > format(new Date(), "yyyy-MM-dd")) {
                  toast.error("Gelecek tarih seçilemez");
                  return;
                }
                setFormDate(val);
              }}
              className="w-full h-9 rounded-lg px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block text-muted-foreground">Sıcaklık (°C)</label>
            <input type="number" value={formTemp} onChange={e => setFormTemp(e.target.value)} placeholder="ör: 22" className="w-full h-9 rounded-lg px-3 text-sm" />
          </div>
        </div>

        {/* Weather */}
        <div>
          <label className="text-xs mb-2 block text-muted-foreground">Hava Durumu</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {WEATHER_OPTIONS.map(w => (
              <button key={w.icon} onClick={() => setFormWeather(w.icon)} className="flex flex-col items-center gap-1 p-2 rounded-xl transition-colors" style={{ backgroundColor: formWeather === w.icon ? "rgba(255,107,43,0.15)" : "#0F1419", border: `1px solid ${formWeather === w.icon ? "#FF6B2B" : "#1E2732"}` }}>
                <span className="text-2xl">{w.icon}</span>
                <span className="text-[10px]" style={{ color: formWeather === w.icon ? "#FF6B2B" : "#64748B" }}>{w.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Work status */}
        <div>
          <label className="text-xs mb-2 block text-muted-foreground">Çalışma Durumu</label>
          <div className="grid grid-cols-3 gap-2">
            {WORK_STATUS.map(ws => (
              <button key={ws.value} onClick={() => setFormWorkStatus(ws.value)} className="flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-medium transition-colors" style={{ backgroundColor: formWorkStatus === ws.value ? `${ws.color}20` : "#0F1419", border: `1px solid ${formWorkStatus === ws.value ? ws.color : "#1E2732"}`, color: formWorkStatus === ws.value ? ws.color : "#64748B" }}>
                {ws.icon} {ws.label}
              </button>
            ))}
          </div>
          {formWorkStatus === "stopped" && (
            <input value={formStopReason} onChange={e => setFormStopReason(e.target.value)} placeholder="Neden?" className="mt-2 w-full h-9 rounded-lg px-3 text-sm" style={{ border: "1px solid #EF4444" }} />
          )}
        </div>
      </div>

      {/* Section 2: Workforce */}
      {!isQuickMode && (
        <div className="rounded-xl p-4 space-y-3 bg-card border border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">👷 İşgücü</h3>
            <button onClick={() => setFormCrews(c => [...c, { team: "", count: 0, hours: 8, note: "" }])} className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>+ Ekip Ekle</button>
          </div>
          {formCrews.map((crew, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input value={crew.team} onChange={e => { const c = [...formCrews]; c[i].team = e.target.value; setFormCrews(c); }} placeholder="Ekip adı" className="col-span-4 h-8 rounded-lg px-2 text-xs" />
              <input type="number" value={crew.count || ""} onChange={e => { const c = [...formCrews]; c[i].count = parseInt(e.target.value) || 0; setFormCrews(c); }} placeholder="Kişi" className="col-span-2 h-8 rounded-lg px-2 text-xs text-center" />
              <input type="number" value={crew.hours || ""} onChange={e => { const c = [...formCrews]; c[i].hours = parseInt(e.target.value) || 0; setFormCrews(c); }} placeholder="Saat" className="col-span-2 h-8 rounded-lg px-2 text-xs text-center" />
              <input value={crew.note} onChange={e => { const c = [...formCrews]; c[i].note = e.target.value; setFormCrews(c); }} placeholder="Not" className="col-span-3 h-8 rounded-lg px-2 text-xs" />
              <button onClick={() => setFormCrews(c => c.filter((_, j) => j !== i))} className="col-span-1 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10"><XCircle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} /></button>
            </div>
          ))}
          <p className="text-xs font-medium" style={{ color: "#FF6B2B" }}>
            Toplam {totalWorkers(formCrews)} işçi · {totalManHours(formCrews)} adam/saat
          </p>
        </div>
      )}

      {/* Quick mode: just worker count */}
      {isQuickMode && (
        <div className="rounded-xl p-4 bg-card border border-border">
          <h3 className="text-sm font-semibold mb-3 text-foreground">👷 İşçi Sayısı</h3>
          <input type="number" value={formCrews[0]?.count || ""} onChange={e => setFormCrews([{ team: "Genel", count: parseInt(e.target.value) || 0, hours: 8, note: "" }])} placeholder="Toplam işçi sayısı" className="w-full h-10 rounded-lg px-3 text-sm" />
        </div>
      )}

      {/* Section 3: Work done */}
      <div className="rounded-xl p-4 bg-card border border-border">
        <h3 className="text-sm font-semibold mb-2 text-foreground">🔨 Yapılan İşler</h3>
        <textarea value={formWorkDone} onChange={e => setFormWorkDone(e.target.value)} placeholder="Zemin kat güney cephe kalıpları tamamlandı. Kolon demiri bağlama işlemi başladı..." rows={isQuickMode ? 2 : 4} className="w-full rounded-lg px-3 py-2 text-sm resize-none" />
      </div>

      {/* Section 4: Materials (skip in quick mode) */}
      {!isQuickMode && (
        <div className="rounded-xl p-4 space-y-3 bg-card border border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">📦 Malzemeler</h3>
            <button onClick={() => setFormMaterials(m => [...m, { name: "", quantity: 0, unit: "m³", direction: "Giriş" }])} className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>+ Malzeme Ekle</button>
          </div>
          {formMaterials.map((mat, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input value={mat.name} onChange={e => { const m = [...formMaterials]; m[i].name = e.target.value; setFormMaterials(m); }} placeholder="Malzeme" className="col-span-4 h-8 rounded-lg px-2 text-xs" />
              <input type="number" value={mat.quantity || ""} onChange={e => { const m = [...formMaterials]; m[i].quantity = parseFloat(e.target.value) || 0; setFormMaterials(m); }} placeholder="Miktar" className="col-span-2 h-8 rounded-lg px-2 text-xs text-center" />
              <select value={mat.unit} onChange={e => { const m = [...formMaterials]; m[i].unit = e.target.value; setFormMaterials(m); }} className="col-span-2 h-8 rounded-lg px-1 text-xs">
                {["m³", "ton", "kg", "adet", "m²", "m"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select value={mat.direction} onChange={e => { const m = [...formMaterials]; m[i].direction = e.target.value; setFormMaterials(m); }} className="col-span-3 h-8 rounded-lg px-1 text-xs">
                <option value="Giriş">Giriş</option>
                <option value="Çıkış">Çıkış</option>
              </select>
              <button onClick={() => setFormMaterials(m => m.filter((_, j) => j !== i))} className="col-span-1 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10"><XCircle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Section 5: Machines (skip in quick mode) */}
      {!isQuickMode && (
        <div className="rounded-xl p-4 space-y-3 bg-card border border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">🚜 Makine ve Ekipman</h3>
            <button onClick={() => setFormMachines(m => [...m, { name: "", hours: 0, note: "" }])} className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>+ Makine Ekle</button>
          </div>
          {formMachines.map((mac, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input value={mac.name} onChange={e => { const m = [...formMachines]; m[i].name = e.target.value; setFormMachines(m); }} placeholder="Makine" className="col-span-5 h-8 rounded-lg px-2 text-xs" />
              <input type="number" value={mac.hours || ""} onChange={e => { const m = [...formMachines]; m[i].hours = parseInt(e.target.value) || 0; setFormMachines(m); }} placeholder="Saat" className="col-span-2 h-8 rounded-lg px-2 text-xs text-center" />
              <input value={mac.note} onChange={e => { const m = [...formMachines]; m[i].note = e.target.value; setFormMachines(m); }} placeholder="Not" className="col-span-4 h-8 rounded-lg px-2 text-xs" />
              <button onClick={() => setFormMachines(m => m.filter((_, j) => j !== i))} className="col-span-1 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10"><XCircle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Section 6: Photos */}
      <div className="rounded-xl p-4 bg-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">📷 Fotoğraflar ({formPhotos.length}/10)</h3>
          {/* Show existing photos count when editing */}
          {editingEntry && entryPhotos(editingEntry.id).length > 0 && (
            <span className="text-xs text-muted-foreground">Mevcut: {entryPhotos(editingEntry.id).length} fotoğraf</span>
          )}
        </div>

        {/* Existing photos when editing */}
        {editingEntry && entryPhotos(editingEntry.id).length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {entryPhotos(editingEntry.id).map(photo => (
              <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square">
                <img src={photo.photo_url} alt={photo.description || ""} className="w-full h-full object-cover" />
                <button
                  onClick={async () => {
                    if (confirm("Bu fotoğrafı silmek istediğinize emin misiniz?")) {
                      await deletePhoto(photo.id);
                      toast.success("Fotoğraf silindi");
                    }
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
                >
                  <XCircle className="w-3 h-3" style={{ color: "#EF4444" }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {formPhotos.length < 10 && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  const file = await takePhoto();
                  if (!file) return;
                  const remaining = 10 - formPhotos.length;
                  if (remaining <= 0) return;
                  setFormPhotos(prev => [...prev, file]);
                  setFormPhotoDescs(prev => [...prev, ""]);
                } catch (err) {
                  console.error(err);
                  alert("Kamera açılamadı");
                }
              }}
              className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors hover:border-[#FF6B2B]/50 flex flex-col items-center justify-center"
              style={{ borderColor: "#1E2732" }}
            >
              <Camera className="w-7 h-7 mb-2" style={{ color: "#FF6B2B" }} />
              <p className="text-xs font-medium text-foreground">Kamera ile Çek</p>
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const remaining = 10 - formPhotos.length;
                  if (remaining <= 0) return;
                  const files = await pickFromGallery(remaining);
                  if (!files.length) return;
                  const newFiles = files.slice(0, remaining);
                  setFormPhotos(prev => [...prev, ...newFiles]);
                  setFormPhotoDescs(prev => [...prev, ...newFiles.map(() => "")]);
                } catch (err) {
                  console.error(err);
                  alert("Galeri açılamadı");
                }
              }}
              className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors hover:border-[#FF6B2B]/50 flex flex-col items-center justify-center"
              style={{ borderColor: "#1E2732" }}
            >
              <FileText className="w-7 h-7 mb-2" style={{ color: "#FF6B2B" }} />
              <p className="text-xs font-medium text-foreground">Galeriden Seç</p>
            </button>
          </div>
        )}

        {formPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {formPhotos.map((f, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-border">
                <div className="relative aspect-square">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => {
                    setFormPhotos(p => p.filter((_, j) => j !== i));
                    setFormPhotoDescs(d => d.filter((_, j) => j !== i));
                  }} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
                    <XCircle className="w-3 h-3" style={{ color: "#EF4444" }} />
                  </button>
                </div>
                <input
                  value={formPhotoDescs[i] || ""}
                  onChange={e => {
                    const d = [...formPhotoDescs];
                    d[i] = e.target.value;
                    setFormPhotoDescs(d);
                  }}
                  placeholder="Açıklama (opsiyonel)"
                  className="w-full px-2 py-1.5 text-[11px] bg-card border-t border-border outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] mt-2 px-2 py-1 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
          💡 Bugün en az 1 fotoğraf eklemeniz önerilir · JPG, PNG, WebP
        </p>
      </div>

      {/* Section 7: Special events (skip in quick mode) */}
      {!isQuickMode && (
        <div className="rounded-xl p-4 space-y-2 bg-card border border-border">
          <h3 className="text-sm font-semibold text-foreground">⚠️ Özel Durumlar</h3>
          {SPECIAL_EVENTS_OPTIONS.map(event => (
            <label key={event} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formSpecialEvents.includes(event)} onChange={e => setFormSpecialEvents(prev => e.target.checked ? [...prev, event] : prev.filter(x => x !== event))} className="rounded" />
              <span className="text-xs text-muted-foreground">{event}</span>
            </label>
          ))}
        </div>
      )}

      {/* Section 8: General note */}
      {!isQuickMode && (
        <div className="rounded-xl p-4 bg-card border border-border">
          <h3 className="text-sm font-semibold mb-2 text-foreground">📝 Genel Not</h3>
          <textarea value={formGeneralNote} onChange={e => setFormGeneralNote(e.target.value)} placeholder="Yarın yapılacaklar, dikkat edilmesi gerekenler..." rows={3} className="w-full rounded-lg px-3 py-2 text-sm resize-none" />
        </div>
      )}

      {/* Save buttons */}
      <div className="flex items-center gap-3 pb-6">
        <button onClick={() => { setFormStatus("published"); handleSave(); }} disabled={isSaving} className="flex-1 h-11 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50" style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>
          {isSaving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        {!isQuickMode && (
          <button onClick={() => { setFormStatus("draft"); handleSave(); }} disabled={isSaving} className="h-11 px-6 rounded-xl text-sm font-medium transition-colors" style={{ backgroundColor: "#1E2732", color: "#94A3B8" }}>
            Taslak
          </button>
        )}
      </div>
    </div>
  );
};

export default SiteDiaryPage;
