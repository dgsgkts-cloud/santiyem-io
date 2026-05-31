import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, FileText } from "lucide-react";
import { usePersonnel, EMPLOYMENT_TYPE_LABELS } from "@/hooks/usePersonnel";
import { useAttendanceGrid, STATUS_COLORS, STATUS_SHORT, nextStatus, type AttendanceStatus } from "@/hooks/useAttendanceGrid";
import { exportAttendancePDF, exportAttendanceExcel } from "@/lib/attendanceExport";
import UnmatchedQRBanner from "./UnmatchedQRBanner";

const MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

interface Props {
  projectId: string;
  projectName: string;
}

export default function AttendanceGrid({ projectId, projectName }: Props) {
  const { personnel, assignments } = usePersonnel();
  const [month, setMonth] = useState(() => new Date());
  const { records, unmatched, daysInMonth, setCell, refetch } = useAttendanceGrid(projectId, month);

  const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

  const projectPersonnel = useMemo(() => {
    const ids = new Set(assignments.filter((a) => a.project_id === projectId && a.is_active).map((a) => a.personnel_id));
    return personnel.filter((p) => ids.has(p.id) && p.is_active);
  }, [personnel, assignments, projectId]);

  const handleCellClick = (personnelId: string, day: number) => {
    const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
    const current = records.find((r) => r.personnel_id === personnelId && r.work_date === dateStr);
    setCell(personnelId, dateStr, nextStatus(current?.status as AttendanceStatus));
  };

  const prevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const nextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  return (
    <div className="space-y-3">
      <UnmatchedQRBanner unmatched={unmatched} onAdded={refetch} />

      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon" variant="outline" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="font-semibold min-w-[160px] text-center">{MONTH_NAMES[month.getMonth()]} {month.getFullYear()}</span>
        <Button size="icon" variant="outline" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportAttendancePDF(projectName, month, projectPersonnel, records, daysInMonth)}>
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportAttendanceExcel(projectName, month, projectPersonnel, records, daysInMonth)}>
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Hücreye tıklayarak durum değiştir: Tam Gün → Yarım Gün → Gelmedi → İzinli
      </p>

      {projectPersonnel.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Bu projeye atanmış personel yok. "Personel" sekmesinden ekleyin.</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="text-xs w-full border-collapse">
            <thead className="sticky top-0 bg-card z-10">
              <tr>
                <th className="text-left px-2 py-2 min-w-[160px] sticky left-0 bg-card z-20 border-b border-border">Ad Soyad</th>
                <th className="text-left px-2 py-2 min-w-[100px] border-b border-border">Tip</th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <th key={d} className="px-1 py-2 text-center min-w-[28px] border-b border-border">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectPersonnel.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-2 py-1 sticky left-0 bg-card border-b border-border font-medium">{p.full_name}</td>
                  <td className="px-2 py-1 border-b border-border text-muted-foreground">{EMPLOYMENT_TYPE_LABELS[p.employment_type]}</td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                    const dateStr = `${monthStr}-${String(d).padStart(2, "0")}`;
                    const rec = records.find((r) => r.personnel_id === p.id && r.work_date === dateStr);
                    const status = rec?.status as AttendanceStatus | undefined;
                    return (
                      <td key={d} className="p-0.5 border-b border-border text-center">
                        <button
                          onClick={() => handleCellClick(p.id, d)}
                          className={`w-7 h-7 rounded text-[10px] font-bold border transition ${
                            status ? STATUS_COLORS[status] : "border-dashed border-border/40 hover:border-[#FF6B2B]/40"
                          }`}
                          title={rec?.source === "qr" ? "QR'dan otomatik" : "Manuel"}
                        >
                          {status ? STATUS_SHORT[status] : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
