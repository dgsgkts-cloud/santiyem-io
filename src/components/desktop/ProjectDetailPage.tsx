import { useState, useRef } from "react";
import { ArrowLeft, MapPin, User, Calendar, DollarSign, CheckCircle2, Clock, XCircle, FileDown, Upload, Trash2, FileText, Plus, X, ChevronDown } from "lucide-react";
import { Project } from "@/lib/projectsData";
import { useProjectHakedis } from "@/hooks/useProjectHakedis";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { useProjectMilestones } from "@/hooks/useProjectMilestones";
import { useUser } from "@/contexts/UserContext";

const STATUS_OPTIONS = [
  { label: "Devam Ediyor", color: "#22C55E" },
  { label: "Gecikmiş", color: "#EF4444" },
  { label: "Tamamlanıyor", color: "#F59E0B" },
  { label: "Tamamlandı", color: "#3B82F6" },
  { label: "Durduruldu", color: "#64748B" },
];

const HAKEDIS_STATUS_OPTIONS = [
  { label: "Bekliyor", color: "#F59E0B" },
  { label: "Onaylandı", color: "#22C55E" },
  { label: "Reddedildi", color: "#EF4444" },
  { label: "Hazırlanıyor", color: "#3B82F6" },
  { label: "Ödendi", color: "#10B981" },
];

interface ProjectDetailPageProps {
  project: Project;
  onBack: () => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: string, color: string) => void;
  isDeletable?: boolean;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
};

const ProjectDetailPage = ({ project: p, onBack, onDelete, onStatusChange, isDeletable }: ProjectDetailPageProps) => {
  const { user } = useUser();
  const { milestones, loading: mLoading, progress: milestoneProgress, toggleCompleted, addMilestone, deleteMilestone } = useProjectMilestones(p.id, p.milestones);
  const { hakedisler, loading: hLoading, addHakedis, deleteHakedis, updateHakedisStatus } = useProjectHakedis(p.id);
  const [hakedisStatusMenuId, setHakedisStatusMenuId] = useState<string | null>(null);
  const { files, loading: fLoading, uploading, uploadFile, deleteFile } = useProjectFiles(p.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddHakedis, setShowAddHakedis] = useState(false);
  const [newPeriod, setNewPeriod] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(p.status);
  const [currentStatusColor, setCurrentStatusColor] = useState(p.statusColor);

  const handleAddMilestone = () => {
    if (!newMilestoneTitle) return;
    addMilestone(newMilestoneTitle, newMilestoneDate);
    setNewMilestoneTitle("");
    setNewMilestoneDate("");
    setShowAddMilestone(false);
  };

  const displayProgress = user && !mLoading ? milestoneProgress : p.progress;
  const completedMilestones = user && !mLoading ? milestones.filter(m => m.completed).length : p.milestones.filter(m => m.completed).length;
  const totalMilestones = user && !mLoading ? milestones.length : p.milestones.length;

  const handleAddHakedis = () => {
    if (!newPeriod || !newAmount) return;
    addHakedis(newPeriod, parseFloat(newAmount));
    setNewPeriod("");
    setNewAmount("");
    setShowAddHakedis(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cardStyle = { backgroundColor: "#161C23", border: "1px solid #1E2732" };
  const labelStyle = { color: "#64748B" };
  const textStyle = { color: "#F1F5F9" };

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1200px] mx-auto space-y-4 lg:space-y-5">
      {/* Back + Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] mb-3 transition-colors" style={labelStyle}>
          <ArrowLeft className="w-3.5 h-3.5" /> Projelere Dön
        </button>
        <div className="rounded-xl p-4 lg:p-5" style={{ ...cardStyle, borderLeft: "3px solid " + currentStatusColor }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base lg:text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", ...textStyle }}>{p.name}</h2>
                <div className="relative">
                  <button
                    onClick={() => onStatusChange && setShowStatusMenu(!showStatusMenu)}
                    className={`text-[10px] lg:text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors ${onStatusChange ? "cursor-pointer hover:opacity-80" : ""}`}
                    style={{ backgroundColor: `${currentStatusColor}15`, color: currentStatusColor }}
                  >
                    {currentStatus} {onStatusChange && "▾"}
                  </button>
                  {showStatusMenu && (
                    <div className="absolute top-full left-0 mt-1 z-50 rounded-lg py-1 min-w-[160px] shadow-xl" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.label}
                          onClick={() => {
                            setCurrentStatus(opt.label);
                            setCurrentStatusColor(opt.color);
                            onStatusChange?.(p.id, opt.label, opt.color);
                            setShowStatusMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 transition-colors hover:bg-white/5"
                          style={{ color: "#F1F5F9" }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                          {opt.label}
                          {currentStatus === opt.label && <span className="ml-auto text-[10px]" style={{ color: opt.color }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[12px] lg:text-[13px]" style={labelStyle}>{p.description}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="relative w-14 h-14 lg:w-16 lg:h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1E2732" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FF6B2B" strokeWidth="3" strokeDasharray={`${displayProgress}, 100`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold font-mono" style={textStyle}>{displayProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: MapPin, label: "Lokasyon", value: p.location },
          { icon: User, label: "Müşteri", value: p.client },
          { icon: DollarSign, label: "Bütçe", value: p.budget },
          { icon: Calendar, label: "Süre", value: `${p.start} → ${p.end}` },
        ].map((info, i) => {
          const Icon = info.icon;
          return (
            <div key={i} className="rounded-xl p-3 lg:p-4" style={cardStyle}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "#FF6B2B" }} />
                <span className="text-[10px] lg:text-[11px] font-semibold uppercase" style={labelStyle}>{info.label}</span>
              </div>
              <p className="text-[12px] lg:text-[13px] font-medium truncate" style={textStyle}>{info.value}</p>
            </div>
          );
        })}
      </div>

      {/* Task summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: CheckCircle2, label: "Tamamlanan", value: p.done, color: "#22C55E" },
          { icon: Clock, label: "Devam Eden", value: p.ongoing, color: "#F59E0B" },
          { icon: XCircle, label: "Başarısız", value: p.failed, color: "#EF4444" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-xl p-3 lg:p-4 text-center" style={cardStyle}>
              <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-lg lg:text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: s.color }}>{s.value}</p>
              <p className="text-[10px] lg:text-[11px]" style={labelStyle}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Two columns: milestones + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {/* Milestones */}
        <div className="rounded-xl p-4 lg:p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm lg:text-[15px] font-semibold" style={textStyle}>Kilometre Taşları</h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(255,107,43,0.1)", color: "#FF6B2B" }}>
                {completedMilestones}/{totalMilestones}
              </span>
              {user && (
                <button onClick={() => setShowAddMilestone(!showAddMilestone)} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors" style={{ backgroundColor: showAddMilestone ? "#EF4444" : "#FF6B2B" }}>
                  {showAddMilestone ? <X className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-white" />}
                </button>
              )}
            </div>
          </div>

          {showAddMilestone && (
            <div className="flex flex-col sm:flex-row gap-2 mb-4 p-3 rounded-lg" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
              <input value={newMilestoneTitle} onChange={e => setNewMilestoneTitle(e.target.value)} placeholder="Görev adı"
                className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }} />
              <input value={newMilestoneDate} onChange={e => setNewMilestoneDate(e.target.value)} placeholder="Tarih (ör: 01.05.2026)"
                className="w-full sm:w-36 px-3 py-2 rounded-lg text-[13px] outline-none" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }} />
              <button onClick={handleAddMilestone} className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white" style={{ backgroundColor: "#22C55E" }}>Ekle</button>
            </div>
          )}

          {mLoading ? (
            <p className="text-[12px]" style={labelStyle}>Yükleniyor...</p>
          ) : (
            <div className="space-y-2">
              {(user ? milestones : p.milestones.map((m, i) => ({ id: String(i), title: m.title, milestone_date: m.date, completed: m.completed, project_id: p.id, sort_order: i }))).map((m) => (
                <div key={m.id} className="flex items-center gap-3 group">
                  <button
                    onClick={() => user && toggleCompleted(m.id)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${user ? "cursor-pointer hover:opacity-80" : ""}`}
                    style={{ backgroundColor: m.completed ? "#22C55E" : "#1E2732", border: m.completed ? "none" : "2px solid #334155" }}
                    disabled={!user}
                  >
                    {m.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] lg:text-[13px] font-medium ${m.completed ? "line-through" : ""}`} style={{ color: m.completed ? "#64748B" : "#F1F5F9" }}>{m.title}</p>
                  </div>
                  <span className="text-[10px] lg:text-[11px] font-mono shrink-0" style={labelStyle}>{m.milestone_date}</span>
                  {user && (
                    <button onClick={() => deleteMilestone(m.id)} className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#EF4444" }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3" style={{ borderTop: "1px solid #1E2732" }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px]" style={labelStyle}>İlerleme</span>
              <span className="text-[11px] font-mono font-medium" style={{ color: "#FF6B2B" }}>{displayProgress}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ backgroundColor: "#1E2732" }}>
              <div className="h-full rounded-full transition-all" style={{ backgroundColor: "#FF6B2B", width: `${displayProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl p-4 lg:p-5" style={cardStyle}>
          <h3 className="text-sm lg:text-[15px] font-semibold mb-4" style={textStyle}>Son Aktiviteler</h3>
          <div className="space-y-3">
            {p.recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-[12px] lg:text-[13px] flex-1 min-w-0" style={{ color: "#94A3B8" }}>{a.text}</span>
                <span className="text-[10px] lg:text-[11px] shrink-0" style={labelStyle}>{a.time}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3" style={{ borderTop: "1px solid #1E2732" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#334155" }}>Proje Sorumlusu</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,107,43,0.15)" }}>
                <User className="w-4 h-4" style={{ color: "#FF6B2B" }} />
              </div>
              <div>
                <p className="text-[12px] lg:text-[13px] font-medium" style={textStyle}>{p.manager}</p>
                <p className="text-[10px]" style={labelStyle}>Şantiye Şefi</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hakediş Özeti */}
      <div className="rounded-xl p-4 lg:p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm lg:text-[15px] font-semibold" style={textStyle}>Hakediş Özeti</h3>
          {user && (
            <button
              onClick={() => setShowAddHakedis(!showAddHakedis)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors"
              style={{ backgroundColor: "#FF6B2B" }}
            >
              <Plus className="w-3.5 h-3.5" /> Yeni Hakediş
            </button>
          )}
        </div>

        {showAddHakedis && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
            <input
              value={newPeriod}
              onChange={e => setNewPeriod(e.target.value)}
              placeholder="Dönem (ör: Nisan 2026)"
              className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none"
              style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }}
            />
            <input
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              type="number"
              placeholder="Tutar (₺)"
              className="w-full sm:w-40 px-3 py-2 rounded-lg text-[13px] outline-none"
              style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }}
            />
            <button
              onClick={handleAddHakedis}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white"
              style={{ backgroundColor: "#22C55E" }}
            >
              Ekle
            </button>
          </div>
        )}

        {hLoading ? (
          <p className="text-[12px]" style={labelStyle}>Yükleniyor...</p>
        ) : hakedisler.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-8 h-8 mx-auto mb-2" style={{ color: "#334155" }} />
            <p className="text-[13px]" style={labelStyle}>Henüz hakediş kaydı yok</p>
            {user && <p className="text-[11px] mt-1" style={{ color: "#475569" }}>Yukarıdaki butona tıklayarak ilk hakedişi ekleyin</p>}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ backgroundColor: "#0F1419" }}>
                    {["No", "Dönem", "Tutar", "KDV", "Net", "Durum", ""].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 font-semibold uppercase tracking-wide" style={{ color: "#64748B", fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hakedisler.map((h, i) => (
                    <tr key={h.id} style={{ borderBottom: "1px solid #1E2732" }}>
                      <td className="px-4 py-3 font-mono" style={textStyle}>{i + 1}</td>
                      <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{h.period}</td>
                      <td className="px-4 py-3 font-mono" style={textStyle}>₺{h.amount.toLocaleString("tr-TR")}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: "#94A3B8" }}>₺{h.kdv.toLocaleString("tr-TR")}</td>
                      <td className="px-4 py-3 font-mono font-semibold" style={textStyle}>₺{h.net.toLocaleString("tr-TR")}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: `${h.status_color}15`, color: h.status_color }}>
                          {h.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteHakedis(h.id)} className="w-7 h-7 rounded flex items-center justify-center transition-colors" style={{ color: "#64748B" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="lg:hidden space-y-2">
              {hakedisler.map((h, i) => (
                <div key={h.id} className="p-3 rounded-lg" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-semibold" style={textStyle}>#{i + 1} — {h.period}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: `${h.status_color}15`, color: h.status_color }}>{h.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span style={labelStyle}>Tutar: <span className="font-mono" style={textStyle}>₺{h.amount.toLocaleString("tr-TR")}</span></span>
                    <span style={labelStyle}>Net: <span className="font-mono font-semibold" style={textStyle}>₺{h.net.toLocaleString("tr-TR")}</span></span>
                    <button onClick={() => deleteHakedis(h.id)} style={{ color: "#64748B" }}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            {/* Summary row */}
            <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #1E2732" }}>
              <span className="text-[11px] font-semibold uppercase" style={labelStyle}>Toplam</span>
              <span className="text-[14px] font-bold font-mono" style={{ color: "#FF6B2B" }}>
                ₺{hakedisler.reduce((s, h) => s + h.net, 0).toLocaleString("tr-TR")}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Dosya Ekleri */}
      <div className="rounded-xl p-4 lg:p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm lg:text-[15px] font-semibold" style={textStyle}>Dosya Ekleri</h3>
          {user && (
            <>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#FF6B2B" }}
              >
                <Upload className="w-3.5 h-3.5" /> {uploading ? "Yükleniyor..." : "Dosya Yükle"}
              </button>
            </>
          )}
        </div>

        {fLoading ? (
          <p className="text-[12px]" style={labelStyle}>Yükleniyor...</p>
        ) : files.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: "#334155" }} />
            <p className="text-[13px]" style={labelStyle}>Henüz dosya eklenmemiş</p>
            {user && <p className="text-[11px] mt-1" style={{ color: "#475569" }}>PDF, DWG, resim veya diğer dosyaları yükleyebilirsiniz</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg transition-colors" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,107,43,0.1)" }}>
                  <FileText className="w-4 h-4" style={{ color: "#FF6B2B" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] lg:text-[13px] font-medium truncate" style={textStyle}>{f.file_name}</p>
                  <p className="text-[10px]" style={labelStyle}>{formatBytes(f.file_size)} · {new Date(f.created_at).toLocaleDateString("tr-TR")}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded flex items-center justify-center transition-colors" style={{ color: "#64748B" }}>
                    <FileDown className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => deleteFile(f.id, f.file_url)} className="w-7 h-7 rounded flex items-center justify-center transition-colors" style={{ color: "#64748B" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projeyi Sil */}
      {isDeletable && onDelete && user && (
        <div className="rounded-xl p-4 lg:p-5" style={{ ...cardStyle, borderColor: "rgba(239,68,68,0.3)" }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm lg:text-[15px] font-semibold" style={{ color: "#EF4444" }}>Projeyi Sil</h3>
              <p className="text-[12px] mt-0.5" style={labelStyle}>Bu işlem geri alınamaz. Tüm hakediş, dosya ve kilometre taşı verileri silinir.</p>
            </div>
            <button
              onClick={() => { if (window.confirm("Bu projeyi silmek istediğinize emin misiniz?")) { onDelete(p.id); } }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-colors shrink-0"
              style={{ backgroundColor: "#EF4444" }}
            >
              <Trash2 className="w-4 h-4" /> Projeyi Sil
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage;
