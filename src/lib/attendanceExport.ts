import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Personnel } from "@/hooks/usePersonnel";
import { EMPLOYMENT_TYPE_LABELS } from "@/hooks/usePersonnel";
import type { AttendanceRecord, AttendanceStatus } from "@/hooks/useAttendanceGrid";
import { STATUS_SHORT } from "@/hooks/useAttendanceGrid";

const MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function buildRows(personnel: Personnel[], records: AttendanceRecord[], daysInMonth: number, month: Date) {
  const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  return personnel.map((p) => {
    const row: (string | number)[] = [p.full_name, EMPLOYMENT_TYPE_LABELS[p.employment_type]];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthStr}-${String(d).padStart(2, "0")}`;
      const rec = records.find((r) => r.personnel_id === p.id && r.work_date === dateStr);
      row.push(rec ? STATUS_SHORT[rec.status as AttendanceStatus] : "");
    }
    return row;
  });
}

export function exportAttendancePDF(
  projectName: string,
  month: Date,
  personnel: Personnel[],
  records: AttendanceRecord[],
  daysInMonth: number,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Puantaj — ${projectName}`, 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${MONTH_NAMES[month.getMonth()]} ${month.getFullYear()}`, 14, 20);

  const head = [["Ad Soyad", "Tip", ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1))]];
  const body = buildRows(personnel, records, daysInMonth, month);

  autoTable(doc, {
    head, body,
    startY: 26,
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [255, 107, 43] },
    columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 26 } },
  });

  doc.setFontSize(8);
  doc.text("T: Tam Gün  Y: Yarım Gün  —: Gelmedi  İ: İzinli", 14, doc.internal.pageSize.height - 8);
  const filename = `puantaj_${projectName.replace(/\s+/g, "_")}_${MONTH_NAMES[month.getMonth()]}_${month.getFullYear()}.pdf`;
  doc.save(filename);
}

export function exportAttendanceExcel(
  projectName: string,
  month: Date,
  personnel: Personnel[],
  records: AttendanceRecord[],
  daysInMonth: number,
) {
  const header = ["Ad Soyad", "Tip", ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1))];
  const rows = buildRows(personnel, records, daysInMonth, month);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Puantaj");
  const filename = `puantaj_${projectName.replace(/\s+/g, "_")}_${MONTH_NAMES[month.getMonth()]}_${month.getFullYear()}.xlsx`;
  XLSX.writeFile(wb, filename);
}
