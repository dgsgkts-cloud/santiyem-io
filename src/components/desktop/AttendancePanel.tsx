import { useState, useMemo, useEffect } from "react";
import { useWorkerAttendance, WorkerAttendance } from "@/hooks/useWorkerAttendance";
import { Users, User, Clock, RefreshCw, Calendar, HardHat, FileDown, FileText, Link as LinkIcon, Check } from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { tr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface AttendancePanelProps {
  projectId: string;
  projectName: string;
}

const AttendancePanel = ({ projectId, projectName }: AttendancePanelProps) => {
  const { attendance, qrCode, loading, refreshAttendance } = useWorkerAttendance(projectId);
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [pdfFrom, setPdfFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [pdfTo, setPdfTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const teamLink = qrCode ? `${window.location.origin}/ekip/${qrCode.token}` : "";

  const copyTeamLink = async () => {
    if (!teamLink) return;
    try {
      await navigator.clipboard.writeText(teamLink);
      setLinkCopied(true);
      toast.success("Ekip takip linki kopyalandı");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Kopyalanamadı");
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAttendance();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshAttendance]);

  const filtered = useMemo(() => {
    return attendance.filter(a => format(parseISO(a.check_in), "yyyy-MM-dd") === filterDate);
  }, [attendance, filterDate]);

  const individuals = filtered.filter(a => a.entry_type === "individual");
  const teams = filtered.filter(a => a.entry_type === "team");
  const activeNow = filtered.filter(a => !a.check_out);
  const exited = filtered.filter(a => !!a.check_out);
  const totalOnSite = activeNow.reduce((s, w) => s + (w.team_size || 1), 0);
  const totalEntries = filtered.reduce((s, w) => s + (w.team_size || 1), 0);
  const totalExited = exited.reduce((s, w) => s + (w.team_size || 1), 0);

  const occupationSummary = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(a => {
      const label = a.entry_type === "team" ? a.occupation : (a.title || a.occupation);
      map[label] = (map[label] || 0) + (a.team_size || 1);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const totalPersonHours = useMemo(() => {
    return filtered.reduce((s, a) => {
      const mins = a.duration_minutes || 0;
      return s + mins * (a.team_size || 1);
    }, 0);
  }, [filtered]);

  const exportPdf = async () => {
    const from = pdfFrom;
    const to = pdfTo;
    const fromDate = new Date(from + "T00:00:00");
    const toDate = new Date(to + "T23:59:59");
    const inRange = attendance.filter(a => {
      const t = parseISO(a.check_in).getTime();
      return t >= fromDate.getTime() && t <= toDate.getTime();
    });

    if (inRange.length === 0) {
      toast.error("Bu tarih aralığında kayıt yok");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Ekip Devam Raporu", 14, 18);
    doc.setFontSize(10);
    doc.text(`Proje: ${projectName}`, 14, 26);
    doc.text(`Tarih: ${format(fromDate, "d MMM yyyy", { locale: tr })} — ${format(toDate, "d MMM yyyy", { locale: tr })}`, 14, 32);

    // Group by day
    const byDay: Record<string, WorkerAttendance[]> = {};
    inRange.forEach(a => {
      const d = format(parseISO(a.check_in), "yyyy-MM-dd");
      (byDay[d] = byDay[d] || []).push(a);
    });

    let y = 40;
    let totalPersonMinutes = 0;
    const dayCount = Object.keys(byDay).length;

    Object.keys(byDay).sort().forEach(day => {
      const items = byDay[day];
      const dayHeader = format(new Date(day + "T00:00:00"), "d MMMM yyyy, EEEE", { locale: tr });
      autoTable(doc, {
        startY: y,
        head: [[dayHeader, "Giriş", "Çıkış", "Kişi", "Süre"]],
        body: items.map(a => {
          const name = a.entry_type === "team"
            ? `${a.foreman_name || a.full_name} (${a.occupation})`
            : `${a.full_name}${a.phone ? " — " + a.phone : ""}`;
          const dur = a.duration_minutes ?? (a.check_out ? differenceInMinutes(parseISO(a.check_out), parseISO(a.check_in)) : 0);
          totalPersonMinutes += dur * (a.team_size || 1);
          const hh = Math.floor(dur / 60), mm = dur % 60;
          return [
            name,
            format(parseISO(a.check_in), "HH:mm"),
            a.check_out ? format(parseISO(a.check_out), "HH:mm") : "—",
            String(a.team_size || 1),
            dur ? `${hh}s ${mm}dk` : "—",
          ];
        }),
        theme: "grid",
        headStyles: { fillColor: [249, 115, 22] },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
      if (y > 250) { doc.addPage(); y = 20; }
    });

    const totalPersonHours = Math.round(totalPersonMinutes / 60);
    const avgTeam = dayCount > 0 ? (inRange.reduce((s, a) => s + (a.team_size || 1), 0) / dayCount).toFixed(1) : "0";

    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.text("Özet", 14, y + 4);
    doc.setFontSize(9);
    doc.text(`Toplam adam·saat: ${totalPersonHours} saat`, 14, y + 12);
    doc.text(`Ortalama günlük ekip büyüklüğü: ${avgTeam} kişi`, 14, y + 18);
    doc.text(`Toplam gün sayısı: ${dayCount}`, 14, y + 24);

    doc.save(`ekip-raporu-${projectName}-${from}_${to}.pdf`);
    setShowPdfDialog(false);
    toast.success("PDF rapor indirildi");
  };

  const exportCsv = () => {
    const rows = [["Tip", "Ad/Ustabaşı", "Telefon", "Unvan/Meslek", "Kişi", "Giriş", "Çıkış", "Süre (dk)"]];
    filtered.forEach(a => {
      rows.push([
        a.entry_type === "team" ? "Ekip" : "Bireysel",
        a.entry_type === "team" ? (a.foreman_name || a.full_name) : a.full_name,
        a.phone || "",
        a.entry_type === "team" ? a.occupation : (a.title || a.occupation),
        (a.team_size || 1).toString(),
        format(parseISO(a.check_in), "HH:mm"),
        a.check_out ? format(parseISO(a.check_out), "HH:mm") : "-",
        a.duration_minutes?.toString() || "-"
      ]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `devam-${projectName}-${filterDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-t-primary border-muted rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Team-tracking public link */}
      {teamLink && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3">
          <LinkIcon className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-0.5">Ekip Takip Linki (iş sahibi için)</div>
            <div className="text-xs font-mono text-foreground truncate">{teamLink}</div>
          </div>
          <button onClick={copyTeamLink} className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 flex-shrink-0">
            {linkCopied ? <><Check className="w-3.5 h-3.5" /> Kopyalandı</> : "Kopyala"}
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input
            type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="bg-muted text-foreground border border-border rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshAttendance} className="p-2 hover:bg-muted rounded-lg text-muted-foreground" title="Yenile">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1 bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg text-sm">
            <FileDown className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => setShowPdfDialog(true)} className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:opacity-90">
            <FileText className="w-4 h-4" /> Ekip Raporu (PDF)
          </button>
        </div>
      </div>

      {/* PDF date-range dialog */}
      {showPdfDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPdfDialog(false)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Ekip Raporu İndir
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Başlangıç</label>
                <input type="date" value={pdfFrom} onChange={e => setPdfFrom(e.target.value)} className="w-full bg-muted text-foreground border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Bitiş</label>
                <input type="date" value={pdfTo} onChange={e => setPdfTo(e.target.value)} className="w-full bg-muted text-foreground border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowPdfDialog(false)} className="flex-1 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80">İptal</button>
                <button onClick={exportPdf} className="flex-1 px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90">İndir</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-500">{totalOnSite}</div>
          <div className="text-xs text-muted-foreground">Şu an sahada</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-500">{totalEntries}</div>
          <div className="text-xs text-muted-foreground">Bugün toplam giriş</div>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-orange-500">{totalExited}</div>
          <div className="text-xs text-muted-foreground">Çıkış yapan</div>
        </div>
      </div>



      {/* Occupation breakdown */}
      {occupationSummary.length > 0 && (
        <div className="bg-muted/50 rounded-xl p-3">
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <HardHat className="w-4 h-4 text-primary" /> Unvan / Meslek Dağılımı
          </h4>
          <div className="flex flex-wrap gap-2">
            {occupationSummary.map(([occ, count]) => (
              <span key={occ} className="bg-card border border-border rounded-lg px-3 py-1 text-sm">
                {occ}: <strong>{count}</strong>
              </span>
            ))}
            <span className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-1 text-sm font-semibold text-primary">
              Toplam: {occupationSummary.reduce((s, [, c]) => s + c, 0)}
            </span>
          </div>
        </div>
      )}

      {/* Individual entries */}
      {individuals.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" /> Bireysel Girişler ({individuals.length})
          </h4>
          <div className="space-y-1">
            {individuals.map(w => (
              <div key={w.id} className={`flex justify-between items-center rounded-lg px-3 py-2 text-sm ${w.check_out ? "bg-muted/30" : "bg-blue-500/5 border border-blue-500/10"}`}>
                <div>
                  <span className="font-medium text-foreground">{w.full_name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{w.title || w.occupation}</span>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {format(parseISO(w.check_in), "HH:mm")}
                  {w.check_out && <> — {format(parseISO(w.check_out), "HH:mm")}</>}
                  {w.duration_minutes != null && (
                    <span className="ml-1.5 text-foreground font-medium">
                      ({Math.floor(w.duration_minutes / 60)}s {w.duration_minutes % 60}dk)
                    </span>
                  )}
                  {!w.check_out && <span className="ml-1.5 text-green-500">● sahada</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team entries */}
      {teams.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" /> Ekip Girişleri ({teams.length})
          </h4>
          <div className="space-y-1">
            {teams.map(w => (
              <div key={w.id} className={`flex justify-between items-center rounded-lg px-3 py-2 text-sm ${w.check_out ? "bg-muted/30" : "bg-green-500/5 border border-green-500/10"}`}>
                <div>
                  <span className="font-medium text-foreground">{w.foreman_name || w.full_name}</span>
                  <span className="bg-green-500/10 text-green-600 rounded px-1.5 py-0.5 text-xs ml-2">
                    {w.team_size} {w.occupation}
                  </span>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {format(parseISO(w.check_in), "HH:mm")}
                  {w.check_out && <> — {format(parseISO(w.check_out), "HH:mm")}</>}
                  {!w.check_out && <span className="ml-1.5 text-green-500">● sahada</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Bu tarihte giriş/çıkış kaydı yok.</p>
      )}
    </div>
  );
};

export default AttendancePanel;
