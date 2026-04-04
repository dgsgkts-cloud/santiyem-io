import { useState, useMemo } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useSiteDiary, DiaryEntry, CrewRow, MaterialRow, MachineRow } from "@/hooks/useSiteDiary";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useUser } from "@/contexts/UserContext";
import { Plus, ChevronLeft, Calendar, Camera, Sun, Cloud, CloudRain, Snowflake, CloudFog, CloudSun, Edit, Trash2, FileText, Users, Wrench, Package, AlertTriangle, CheckCircle, XCircle, Eye, FileDown, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

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

const MOCK_ENTRIES: Partial<DiaryEntry>[] = [
  { entry_date: "2025-04-01", weather_icon: "☀️", weather_temp: 22, work_status: "normal", crews: [{ team: "Kalıpçı", count: 8, hours: 8, note: "" }, { team: "Demirci", count: 6, hours: 8, note: "" }, { team: "Genel İşçi", count: 4, hours: 8, note: "" }], work_done: "Temel kalıp tamamlandı", materials: [], machines: [], special_events: [], general_note: "", status: "published" },
  { entry_date: "2025-04-02", weather_icon: "☀️", weather_temp: 24, work_status: "normal", crews: [{ team: "Betoncu", count: 10, hours: 10, note: "Fazla mesai" }, { team: "Kalıpçı", count: 8, hours: 8, note: "" }, { team: "Genel İşçi", count: 4, hours: 8, note: "" }], work_done: "Temel betonu dökümü", materials: [{ name: "Beton C30", quantity: 45, unit: "m³", direction: "Giriş" }], machines: [{ name: "Beton Pompası", hours: 6, note: "" }], special_events: ["Numune alındı (beton, demir vb.)"], general_note: "Beton numunesi alındı, 7 ve 28 günlük test yapılacak", status: "published" },
  { entry_date: "2025-04-03", weather_icon: "🌧️", weather_temp: 14, work_status: "stopped", work_stopped_reason: "Şiddetli yağış", crews: [], work_done: "", materials: [], machines: [], special_events: [], general_note: "Yağmur nedeniyle çalışma yapılamadı", status: "published" },
  { entry_date: "2025-04-04", weather_icon: "☁️", weather_temp: 16, work_status: "normal", crews: [{ team: "Genel İşçi", count: 10, hours: 8, note: "" }, { team: "Kalıpçı", count: 5, hours: 8, note: "" }], work_done: "Kür sulaması", materials: [], machines: [], special_events: [], general_note: "", status: "published" },
  { entry_date: "2025-04-05", weather_icon: "☀️", weather_temp: 20, work_status: "normal", crews: [{ team: "Demirci", count: 12, hours: 8, note: "" }, { team: "Kalıpçı", count: 8, hours: 8, note: "" }, { team: "Genel İşçi", count: 4, hours: 8, note: "" }], work_done: "Bodrum kat demir bağlama başladı", materials: [{ name: "Nervürlü Demir Ø12", quantity: 5, unit: "ton", direction: "Giriş" }], machines: [{ name: "Vinç", hours: 4, note: "" }], special_events: ["Yapı denetim ziyareti oldu"], general_note: "Yapı denetim mühendisi geldi, kalıp kontrolü yaptı", status: "published" },
];

type View = "list" | "form" | "detail";

const SiteDiaryPage = () => {
  const { user } = useUser();
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const { entries: dbEntries, photos, isLoading, createEntry, updateEntry, deleteEntry, uploadPhoto } = useSiteDiary(selectedProjectId || undefined);
  const [view, setView] = useState<View>("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: string } | null>(null);

  // Use mock data if no real entries
  const entries = dbEntries.length > 0 ? dbEntries : (selectedProjectId ? MOCK_ENTRIES.map((e, i) => ({ ...e, id: `mock-${i}`, project_id: selectedProjectId, user_id: user?.id || "" })) : []) as DiaryEntry[];

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
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodStart, setPeriodStart] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [includePhotos, setIncludePhotos] = useState(true);

  const resetForm = () => {
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormWeather("☀️");
    setFormTemp("");
    setFormWorkStatus("normal");
    setFormStopReason("");
    setFormCrews([{ team: "Kalıpçı", count: 0, hours: 8, note: "" }]);
    setFormWorkDone("");
    setFormMaterials([]);
    setFormMachines([]);
    setFormSpecialEvents([]);
    setFormSpecialNotes({});
    setFormGeneralNote("");
    setFormStatus("published");
    setFormPhotos([]);
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
      } else {
        const result = await createEntry.mutateAsync(payload as any);
        // Upload photos
        if (formPhotos.length > 0 && result?.id) {
          for (const file of formPhotos) {
            await uploadPhoto(file, result.id);
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
    const recent = [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date)).slice(0, 5);
    const startDayOfWeek = (startOfMonth(currentMonth).getDay() + 6) % 7; // Monday = 0

    return (
      <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
        {deleteModal}
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#F1F5F9" }}>📔 Şantiye Günlüğü</h1>
            <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>Günlük şantiye kayıtlarınızı yönetin</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="flex-1 sm:w-[220px] h-9 rounded-lg px-3 text-sm"
              style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }}
            >
              <option value="">Proje seçin...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {selectedProjectId && entries.length > 0 && (
              <button
                onClick={() => setShowPeriodModal(true)}
                className="h-9 px-3 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                style={{ backgroundColor: "#1E2732", color: "#F1F5F9", border: "1px solid #334155" }}
              >
                <FileDown className="w-4 h-4" /> Dönem Raporu
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
            <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold" style={{ color: "#F1F5F9" }}>📄 Dönem Raporu İndir</h3>
                <button onClick={() => setShowPeriodModal(false)} style={{ color: "#64748B" }}><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#64748B" }}>Başlangıç</label>
                  <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
                    className="w-full h-9 rounded-lg px-3 text-sm" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#64748B" }}>Bitiş</label>
                  <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
                    className="w-full h-9 rounded-lg px-3 text-sm" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#94A3B8" }}>
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
                PDF Oluştur
              </button>
            </div>
          </div>
        )}

        {!selectedProjectId && (
          <div className="rounded-2xl p-10 sm:p-16 text-center flex flex-col items-center" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            {projects.length === 0 ? (
              <>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "rgba(255,107,43,0.12)" }}>
                  <FileText className="w-8 h-8" style={{ color: "#FF6B2B" }} />
                </div>
                <h2 className="text-lg font-bold mb-2" style={{ color: "#F1F5F9" }}>Henüz Proje Eklenmemiş</h2>
                <p className="text-sm mb-6 max-w-sm" style={{ color: "#64748B" }}>
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
                <h2 className="text-lg font-bold mb-2" style={{ color: "#F1F5F9" }}>Şantiye Günlüğüne Hoş Geldiniz</h2>
                <p className="text-sm mb-6 max-w-sm" style={{ color: "#64748B" }}>
                  Günlük kayıt tutmak için önce bir proje seçin
                </p>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full max-w-xs h-11 rounded-xl px-4 text-sm mb-4 cursor-pointer"
                  style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
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
          <>
            {/* Calendar */}
            <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))} className="text-sm px-3 py-1 rounded-lg hover:bg-white/5" style={{ color: "#94A3B8" }}>← Önceki</button>
                <h3 className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>{format(currentMonth, "MMMM yyyy", { locale: tr })}</h3>
                <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))} className="text-sm px-3 py-1 rounded-lg hover:bg-white/5" style={{ color: "#94A3B8" }}>Sonraki →</button>
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
                          {hasPhotos && <Camera className="w-2.5 h-2.5" style={{ color: "#64748B" }} />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent entries */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold" style={{ color: "#94A3B8" }}>Son Kayıtlar</h3>
              {recent.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => { setSelectedEntry(entry); setView("detail"); }}
                  className="w-full rounded-xl p-3 flex items-center gap-3 transition-colors hover:bg-white/5"
                  style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}
                >
                  <span className="text-xl">{entry.weather_icon}</span>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium" style={{ color: "#F1F5F9" }}>{format(parseISO(entry.entry_date), "d MMMM yyyy, EEEE", { locale: tr })}</p>
                    <p className="text-xs truncate" style={{ color: "#64748B" }}>
                      {totalWorkers(entry.crews)} işçi · {entry.work_done?.slice(0, 60) || "Kayıt yok"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      backgroundColor: entry.work_status === "stopped" ? "rgba(239,68,68,0.15)" : entry.work_status === "partial" ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)",
                      color: entry.work_status === "stopped" ? "#EF4444" : entry.work_status === "partial" ? "#F59E0B" : "#22C55E",
                    }}>
                      {WORK_STATUS.find(w => w.value === entry.work_status)?.label}
                    </span>
                    <Eye className="w-4 h-4" style={{ color: "#475569" }} />
                  </div>
                </button>
              ))}
              {recent.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: "#475569" }}>Bu proje için henüz kayıt yok</p>
              )}
            </div>
          </>
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
        <div className="flex items-center justify-between">
          <button onClick={() => { setSelectedEntry(null); setView("list"); }} className="flex items-center gap-1.5 text-sm" style={{ color: "#94A3B8" }}>
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
              style={{ backgroundColor: "#1E2732", color: "#F1F5F9", border: "1px solid #334155" }}
            >
              <FileDown className="w-3.5 h-3.5" /> PDF İndir
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
        <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{selectedEntry.weather_icon}</span>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{format(parseISO(selectedEntry.entry_date), "d MMMM yyyy, EEEE", { locale: tr })}</h2>
              <div className="flex items-center gap-2 mt-1">
                {selectedEntry.weather_temp && <span className="text-xs" style={{ color: "#64748B" }}>{selectedEntry.weather_temp}°C</span>}
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
          <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: "#F1F5F9" }}><Users className="w-4 h-4" style={{ color: "#FF6B2B" }} /> İşgücü</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr style={{ borderBottom: "1px solid #1E2732" }}>
                  <th className="text-left py-2 pr-3" style={{ color: "#64748B" }}>Ekip</th>
                  <th className="text-center py-2 px-3" style={{ color: "#64748B" }}>Kişi</th>
                  <th className="text-center py-2 px-3" style={{ color: "#64748B" }}>Saat</th>
                  <th className="text-left py-2 pl-3" style={{ color: "#64748B" }}>Not</th>
                </tr></thead>
                <tbody>
                  {selectedEntry.crews.map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1E2732" }}>
                      <td className="py-2 pr-3" style={{ color: "#F1F5F9" }}>{c.team}</td>
                      <td className="text-center py-2 px-3" style={{ color: "#94A3B8" }}>{c.count}</td>
                      <td className="text-center py-2 px-3" style={{ color: "#94A3B8" }}>{c.hours}</td>
                      <td className="py-2 pl-3" style={{ color: "#64748B" }}>{c.note}</td>
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
          <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: "#F1F5F9" }}><Wrench className="w-4 h-4" style={{ color: "#FF6B2B" }} /> Yapılan İşler</h3>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "#94A3B8" }}>{selectedEntry.work_done}</p>
          </div>
        )}

        {/* Materials */}
        {selectedEntry.materials.length > 0 && (
          <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: "#F1F5F9" }}><Package className="w-4 h-4" style={{ color: "#FF6B2B" }} /> Malzemeler</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr style={{ borderBottom: "1px solid #1E2732" }}>
                  <th className="text-left py-2" style={{ color: "#64748B" }}>Malzeme</th>
                  <th className="text-center py-2" style={{ color: "#64748B" }}>Miktar</th>
                  <th className="text-center py-2" style={{ color: "#64748B" }}>Birim</th>
                  <th className="text-center py-2" style={{ color: "#64748B" }}>Giriş/Çıkış</th>
                </tr></thead>
                <tbody>
                  {selectedEntry.materials.map((m, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1E2732" }}>
                      <td className="py-2" style={{ color: "#F1F5F9" }}>{m.name}</td>
                      <td className="text-center py-2" style={{ color: "#94A3B8" }}>{m.quantity}</td>
                      <td className="text-center py-2" style={{ color: "#94A3B8" }}>{m.unit}</td>
                      <td className="text-center py-2" style={{ color: "#94A3B8" }}>{m.direction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Special events */}
        {selectedEntry.special_events.length > 0 && (
          <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: "#F1F5F9" }}><AlertTriangle className="w-4 h-4" style={{ color: "#F59E0B" }} /> Özel Durumlar</h3>
            <ul className="space-y-1">
              {selectedEntry.special_events.map((e, i) => (
                <li key={i} className="text-xs flex items-center gap-2" style={{ color: "#94A3B8" }}>
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} /> {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* General note */}
        {selectedEntry.general_note && (
          <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: "#F1F5F9" }}><FileText className="w-4 h-4" style={{ color: "#FF6B2B" }} /> Genel Not</h3>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "#94A3B8" }}>{selectedEntry.general_note}</p>
          </div>
        )}
      </div>
    );
  }

  // Form view
  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => { resetForm(); setView("list"); }} className="flex items-center gap-1.5 text-sm" style={{ color: "#94A3B8" }}>
          <ChevronLeft className="w-4 h-4" /> Geri
        </button>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#94A3B8" }}>
            <input type="checkbox" checked={isQuickMode} onChange={e => setIsQuickMode(e.target.checked)} className="rounded" />
            ⚡ Hızlı Kayıt
          </label>
        </div>
      </div>

      <h2 className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{editingEntry ? "Kaydı Düzenle" : "Yeni Günlük Kaydı"}</h2>

      {/* Section 1: General */}
      <div className="rounded-xl p-4 space-y-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        <h3 className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>📋 Genel Bilgiler</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#64748B" }}>Tarih</label>
            <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full h-9 rounded-lg px-3 text-sm" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#64748B" }}>Sıcaklık (°C)</label>
            <input type="number" value={formTemp} onChange={e => setFormTemp(e.target.value)} placeholder="ör: 22" className="w-full h-9 rounded-lg px-3 text-sm" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
          </div>
        </div>

        {/* Weather */}
        <div>
          <label className="text-xs mb-2 block" style={{ color: "#64748B" }}>Hava Durumu</label>
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
          <label className="text-xs mb-2 block" style={{ color: "#64748B" }}>Çalışma Durumu</label>
          <div className="grid grid-cols-3 gap-2">
            {WORK_STATUS.map(ws => (
              <button key={ws.value} onClick={() => setFormWorkStatus(ws.value)} className="flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-medium transition-colors" style={{ backgroundColor: formWorkStatus === ws.value ? `${ws.color}20` : "#0F1419", border: `1px solid ${formWorkStatus === ws.value ? ws.color : "#1E2732"}`, color: formWorkStatus === ws.value ? ws.color : "#64748B" }}>
                {ws.icon} {ws.label}
              </button>
            ))}
          </div>
          {formWorkStatus === "stopped" && (
            <input value={formStopReason} onChange={e => setFormStopReason(e.target.value)} placeholder="Neden?" className="mt-2 w-full h-9 rounded-lg px-3 text-sm" style={{ backgroundColor: "#0F1419", border: "1px solid #EF4444", color: "#F1F5F9" }} />
          )}
        </div>
      </div>

      {/* Section 2: Workforce */}
      {!isQuickMode && (
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>👷 İşgücü</h3>
            <button onClick={() => setFormCrews(c => [...c, { team: "", count: 0, hours: 8, note: "" }])} className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>+ Ekip Ekle</button>
          </div>
          {formCrews.map((crew, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input value={crew.team} onChange={e => { const c = [...formCrews]; c[i].team = e.target.value; setFormCrews(c); }} placeholder="Ekip adı" className="col-span-4 h-8 rounded-lg px-2 text-xs" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
              <input type="number" value={crew.count || ""} onChange={e => { const c = [...formCrews]; c[i].count = parseInt(e.target.value) || 0; setFormCrews(c); }} placeholder="Kişi" className="col-span-2 h-8 rounded-lg px-2 text-xs text-center" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
              <input type="number" value={crew.hours || ""} onChange={e => { const c = [...formCrews]; c[i].hours = parseInt(e.target.value) || 0; setFormCrews(c); }} placeholder="Saat" className="col-span-2 h-8 rounded-lg px-2 text-xs text-center" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
              <input value={crew.note} onChange={e => { const c = [...formCrews]; c[i].note = e.target.value; setFormCrews(c); }} placeholder="Not" className="col-span-3 h-8 rounded-lg px-2 text-xs" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
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
        <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#F1F5F9" }}>👷 İşçi Sayısı</h3>
          <input type="number" value={formCrews[0]?.count || ""} onChange={e => setFormCrews([{ team: "Genel", count: parseInt(e.target.value) || 0, hours: 8, note: "" }])} placeholder="Toplam işçi sayısı" className="w-full h-10 rounded-lg px-3 text-sm" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
        </div>
      )}

      {/* Section 3: Work done */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: "#F1F5F9" }}>🔨 Yapılan İşler</h3>
        <textarea value={formWorkDone} onChange={e => setFormWorkDone(e.target.value)} placeholder="Zemin kat güney cephe kalıpları tamamlandı. Kolon demiri bağlama işlemi başladı..." rows={isQuickMode ? 2 : 4} className="w-full rounded-lg px-3 py-2 text-sm resize-none" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
      </div>

      {/* Section 4: Materials (skip in quick mode) */}
      {!isQuickMode && (
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>📦 Malzemeler</h3>
            <button onClick={() => setFormMaterials(m => [...m, { name: "", quantity: 0, unit: "m³", direction: "Giriş" }])} className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>+ Malzeme Ekle</button>
          </div>
          {formMaterials.map((mat, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input value={mat.name} onChange={e => { const m = [...formMaterials]; m[i].name = e.target.value; setFormMaterials(m); }} placeholder="Malzeme" className="col-span-4 h-8 rounded-lg px-2 text-xs" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
              <input type="number" value={mat.quantity || ""} onChange={e => { const m = [...formMaterials]; m[i].quantity = parseFloat(e.target.value) || 0; setFormMaterials(m); }} placeholder="Miktar" className="col-span-2 h-8 rounded-lg px-2 text-xs text-center" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
              <select value={mat.unit} onChange={e => { const m = [...formMaterials]; m[i].unit = e.target.value; setFormMaterials(m); }} className="col-span-2 h-8 rounded-lg px-1 text-xs" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}>
                {["m³", "ton", "kg", "adet", "m²", "m"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select value={mat.direction} onChange={e => { const m = [...formMaterials]; m[i].direction = e.target.value; setFormMaterials(m); }} className="col-span-3 h-8 rounded-lg px-1 text-xs" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}>
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
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>🚜 Makine ve Ekipman</h3>
            <button onClick={() => setFormMachines(m => [...m, { name: "", hours: 0, note: "" }])} className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>+ Makine Ekle</button>
          </div>
          {formMachines.map((mac, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input value={mac.name} onChange={e => { const m = [...formMachines]; m[i].name = e.target.value; setFormMachines(m); }} placeholder="Makine" className="col-span-5 h-8 rounded-lg px-2 text-xs" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
              <input type="number" value={mac.hours || ""} onChange={e => { const m = [...formMachines]; m[i].hours = parseInt(e.target.value) || 0; setFormMachines(m); }} placeholder="Saat" className="col-span-2 h-8 rounded-lg px-2 text-xs text-center" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
              <input value={mac.note} onChange={e => { const m = [...formMachines]; m[i].note = e.target.value; setFormMachines(m); }} placeholder="Not" className="col-span-4 h-8 rounded-lg px-2 text-xs" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
              <button onClick={() => setFormMachines(m => m.filter((_, j) => j !== i))} className="col-span-1 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10"><XCircle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Section 6: Photos */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: "#F1F5F9" }}>📷 Fotoğraflar</h3>
        <div
          className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-[#FF6B2B]/50"
          style={{ borderColor: "#1E2732" }}
          onClick={() => document.getElementById("photo-input")?.click()}
        >
          <Camera className="w-8 h-8 mx-auto mb-2" style={{ color: "#475569" }} />
          <p className="text-xs" style={{ color: "#64748B" }}>Tıklayın veya sürükleyin · Kameradan çekim desteklenir</p>
          <input id="photo-input" type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={e => { if (e.target.files) setFormPhotos(prev => [...prev, ...Array.from(e.target.files!)]); }} />
        </div>
        {formPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {formPhotos.map((f, i) => (
              <div key={i} className="relative rounded-lg overflow-hidden aspect-square">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setFormPhotos(p => p.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
                  <XCircle className="w-3 h-3" style={{ color: "#EF4444" }} />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] mt-2 px-2 py-1 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
          💡 Bugün en az 1 fotoğraf eklemeniz önerilir
        </p>
      </div>

      {/* Section 7: Special events (skip in quick mode) */}
      {!isQuickMode && (
        <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>⚠️ Özel Durumlar</h3>
          {SPECIAL_EVENTS_OPTIONS.map(event => (
            <label key={event} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formSpecialEvents.includes(event)} onChange={e => setFormSpecialEvents(prev => e.target.checked ? [...prev, event] : prev.filter(x => x !== event))} className="rounded" />
              <span className="text-xs" style={{ color: "#94A3B8" }}>{event}</span>
            </label>
          ))}
        </div>
      )}

      {/* Section 8: General note */}
      {!isQuickMode && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "#F1F5F9" }}>📝 Genel Not</h3>
          <textarea value={formGeneralNote} onChange={e => setFormGeneralNote(e.target.value)} placeholder="Yarın yapılacaklar, dikkat edilmesi gerekenler..." rows={3} className="w-full rounded-lg px-3 py-2 text-sm resize-none" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
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
