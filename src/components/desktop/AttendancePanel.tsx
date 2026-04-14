import { useState, useMemo, useEffect } from "react";
import { useWorkerAttendance, WorkerAttendance } from "@/hooks/useWorkerAttendance";
import { Users, User, Clock, RefreshCw, Calendar, HardHat, FileDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface AttendancePanelProps {
  projectId: string;
  projectName: string;
}

const AttendancePanel = ({ projectId, projectName }: AttendancePanelProps) => {
  const { attendance, loading, refreshAttendance } = useWorkerAttendance(projectId);
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const filtered = useMemo(() => {
    return attendance.filter(a => format(parseISO(a.check_in), "yyyy-MM-dd") === filterDate);
  }, [attendance, filterDate]);

  const individuals = filtered.filter(a => a.entry_type === "individual");
  const teams = filtered.filter(a => a.entry_type === "team");
  const activeNow = filtered.filter(a => !a.check_out);
  const totalOnSite = activeNow.reduce((s, w) => s + (w.team_size || 1), 0);

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

  const exportCsv = () => {
    const rows = [["Tip", "Ad/Ustabaşı", "Unvan/Meslek", "Kişi", "Giriş", "Çıkış", "Süre (dk)"]];
    filtered.forEach(a => {
      rows.push([
        a.entry_type === "team" ? "Ekip" : "Bireysel",
        a.entry_type === "team" ? (a.foreman_name || a.full_name) : a.full_name,
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
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-500">{totalOnSite}</div>
          <div className="text-xs text-muted-foreground">Şu an sahada</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-500">{individuals.length}</div>
          <div className="text-xs text-muted-foreground">Bireysel giriş</div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-purple-500">{teams.length}</div>
          <div className="text-xs text-muted-foreground">Ekip girişi</div>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-orange-500">{Math.round(totalPersonHours / 60)}</div>
          <div className="text-xs text-muted-foreground">Adam·saat</div>
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
