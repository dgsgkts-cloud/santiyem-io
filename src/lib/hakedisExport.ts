import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { robotoBase64 } from "@/lib/robotoFont";
import type { ProjectHakedis } from "@/hooks/useProjectHakedis";

const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function exportHakedisPDF(hakedisler: ProjectHakedis[], projectName: string) {
  const doc = new jsPDF();

  // Add Roboto font for Turkish chars
  if (robotoBase64) {
    doc.addFileToVFS("Roboto-Regular.ttf", robotoBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto");
  }

  // Title
  doc.setFontSize(16);
  doc.text("Hakediş Raporu", 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Proje: ${projectName}`, 14, 28);
  doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, 14, 34);

  const totalAmount = hakedisler.reduce((s, h) => s + h.amount, 0);
  const totalKdv = hakedisler.reduce((s, h) => s + h.kdv, 0);
  const totalNet = hakedisler.reduce((s, h) => s + h.net, 0);

  autoTable(doc, {
    startY: 42,
    head: [["No", "Dönem", "Tutar (₺)", "KDV (₺)", "Net (₺)", "Durum"]],
    body: [
      ...hakedisler.map((h, i) => [
        String(i + 1),
        h.period,
        fmt(h.amount),
        fmt(h.kdv),
        fmt(h.net),
        h.status,
      ]),
      ["", "TOPLAM", fmt(totalAmount), fmt(totalKdv), fmt(totalNet), ""],
    ],
    styles: { font: robotoBase64 ? "Roboto" : "helvetica", fontSize: 10 },
    headStyles: { fillColor: [255, 107, 43] },
    footStyles: { fontStyle: "bold" },
    didParseCell: (data) => {
      // Bold the total row
      if (data.row.index === hakedisler.length) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  doc.save(`hakedis-${projectName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export function exportHakedisExcel(hakedisler: ProjectHakedis[], projectName: string) {
  const totalAmount = hakedisler.reduce((s, h) => s + h.amount, 0);
  const totalKdv = hakedisler.reduce((s, h) => s + h.kdv, 0);
  const totalNet = hakedisler.reduce((s, h) => s + h.net, 0);

  const data = [
    ["Hakediş Raporu"],
    [`Proje: ${projectName}`],
    [`Tarih: ${new Date().toLocaleDateString("tr-TR")}`],
    [],
    ["No", "Dönem", "Tutar (₺)", "KDV (₺)", "Net (₺)", "Durum"],
    ...hakedisler.map((h, i) => [
      i + 1,
      h.period,
      h.amount,
      h.kdv,
      h.net,
      h.status,
    ]),
    [],
    ["", "TOPLAM", totalAmount, totalKdv, totalNet, ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws["!cols"] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hakediş");
  XLSX.writeFile(wb, `hakedis-${projectName.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
}
