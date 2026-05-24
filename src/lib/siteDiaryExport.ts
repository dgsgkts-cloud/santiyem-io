import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addPdfHeader, addPdfFooter } from "@/lib/pdfHeader";
import { createPdfDoc, defaultTableTheme, nz } from "@/lib/reportUtils";
import { savePdfDoc } from "@/lib/nativeDownload";
import type { DiaryEntry, CrewRow, DiaryPhoto } from "@/hooks/useSiteDiary";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

const WORK_STATUS_LABEL: Record<string, string> = { normal: "Normal Çalışma", partial: "Kısmi Çalışma", stopped: "Çalışma Durdu" };
const WORK_STATUS_ICON: Record<string, string> = { normal: "✅", partial: "⚠️", stopped: "❌" };

function initDoc(): jsPDF {
  return createPdfDoc({ orientation: "portrait", format: "a4" });
}

function addHeader(doc: jsPDF, title: string, subtitle?: string): number {
  return addPdfHeader(doc, title, subtitle);
}

function addPageNumbers(doc: jsPDF) {
  addPdfFooter(doc);
}

function addSignature(doc: jsPDF, y: number) {
  const pw = doc.internal.pageSize.getWidth();
  if (y > 250) { doc.addPage(); y = 25; }
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(120);
  const sigW = (pw - 30) / 2;
  ["Şantiye Şefi", "Kontrol Eden"].forEach((title, i) => {
    const sx = 15 + i * sigW;
    doc.text(title, sx + sigW / 2, y, { align: "center" });
    doc.setDrawColor(180);
    doc.line(sx + 8, y + 14, sx + sigW - 8, y + 14);
    doc.setFontSize(7);
    doc.text("Ad Soyad / İmza", sx + sigW / 2, y + 18, { align: "center" });
    doc.setFontSize(8);
  });
  return y + 22;
}

function totalWorkers(crews: CrewRow[]) { return crews.reduce((s, c) => s + c.count, 0); }
function totalManHours(crews: CrewRow[]) { return crews.reduce((s, c) => s + c.count * c.hours, 0); }

function renderEntry(doc: jsPDF, entry: DiaryEntry, startY: number, projectName: string, photos: DiaryPhoto[], includePhotos: boolean): number {
  const pw = doc.internal.pageSize.getWidth();
  let y = startY;

  // Info bar
  const dateStr = format(parseISO(entry.entry_date), "d MMMM yyyy, EEEE", { locale: tr });
  const weatherLabel = entry.weather_icon + (entry.weather_temp ? ` ${entry.weather_temp}°C` : "");
  const workers = totalWorkers(entry.crews);
  const statusIcon = WORK_STATUS_ICON[entry.work_status] || "✅";
  const statusLabel = WORK_STATUS_LABEL[entry.work_status] || entry.work_status;

  doc.setFillColor(15, 20, 25);
  doc.roundedRect(15, y, pw - 30, 8, 1.5, 1.5, "F");
  doc.setFontSize(8);
  doc.setTextColor(200);
  doc.text(`📅 ${dateStr}   |   ${weatherLabel}   |   👷 ${workers} işçi   |   ${statusIcon} ${statusLabel}`, 20, y + 5.5);
  y += 12;

  if (entry.work_status === "stopped" && entry.work_stopped_reason) {
    doc.setFontSize(7.5);
    doc.setTextColor(220, 60, 60);
    doc.text(`Durma nedeni: ${entry.work_stopped_reason}`, 15, y);
    y += 5;
  }

  // Crews table
  if (entry.crews.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(51);
    doc.text("İşgücü", 15, y);
    y += 1;
    autoTable(doc, {
      ...defaultTableTheme(),
      startY: y,
      head: [["Ekip / Usta", "Kişi", "Saat", "Not"]],
      body: [
        ...entry.crews.map(c => [c.team, String(c.count), String(c.hours), nz(c.note)]),
        [{ content: `Toplam: ${workers} işçi · ${totalManHours(entry.crews)} adam/saat`, colSpan: 4, styles: { fontStyle: "bold" as const, textColor: [255, 107, 43] } }],
      ],
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // Work done
  if (entry.work_done) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setTextColor(51);
    doc.text("Yapılan İşler", 15, y);
    y += 4;
    doc.setFontSize(8);
    doc.setTextColor(80);
    const lines = doc.splitTextToSize(entry.work_done, pw - 30);
    doc.text(lines, 15, y);
    y += lines.length * 3.5 + 4;
  }

  // Materials
  if (entry.materials.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setTextColor(51);
    doc.text("Malzemeler", 15, y);
    y += 1;
    autoTable(doc, {
      ...defaultTableTheme(),
      startY: y,
      head: [["Malzeme", "Miktar", "Birim", "Giriş/Çıkış"]],
      body: entry.materials.map(m => [
        m.name,
        String(m.quantity),
        m.unit,
        m.direction === "in" ? "Giriş" : m.direction === "out" ? "Çıkış" : nz(m.direction),
      ]),
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // Machines
  if (entry.machines.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setTextColor(51);
    doc.text("Makine / Ekipman", 15, y);
    y += 1;
    autoTable(doc, {
      ...defaultTableTheme(),
      startY: y,
      head: [["Makine", "Çalışma Süresi (saat)", "Not"]],
      body: entry.machines.map(m => [m.name, String(m.hours), nz(m.note)]),
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // Special events
  if (entry.special_events.length > 0) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setTextColor(51);
    doc.text("Özel Durumlar", 15, y);
    y += 4;
    doc.setFontSize(8);
    doc.setTextColor(80);
    entry.special_events.forEach(e => {
      doc.text(`☑ ${e}`, 17, y);
      y += 4;
    });
    y += 2;
  }

  // General note
  if (entry.general_note) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setTextColor(51);
    doc.text("Genel Not", 15, y);
    y += 4;
    doc.setFontSize(8);
    doc.setTextColor(80);
    const noteLines = doc.splitTextToSize(entry.general_note, pw - 30);
    doc.text(noteLines, 15, y);
    y += noteLines.length * 3.5 + 4;
  }

  // Photos (2x2 grid)
  if (includePhotos && photos.length > 0) {
    const imgW = 80;
    const imgH = 60;
    const gap = 5;

    for (let i = 0; i < photos.length; i++) {
      if (i % 4 === 0) {
        if (y > 180 || i > 0) { doc.addPage(); y = 20; }
        doc.setFontSize(9);
        doc.setTextColor(51);
        doc.text("Fotoğraflar", 15, y);
        y += 4;
      }

      const col = i % 2;
      const row = Math.floor((i % 4) / 2);
      const px = 15 + col * (imgW + gap);
      const py = y + row * (imgH + 12);

      try {
        // Draw placeholder box
        doc.setDrawColor(50);
        doc.setFillColor(20, 25, 32);
        doc.roundedRect(px, py, imgW, imgH, 2, 2, "FD");
        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.text(`📷 ${photos[i].description || `Fotoğraf ${i + 1}`}`, px + 2, py + imgH + 4);
      } catch {}

      if (i % 4 === 3 || i === photos.length - 1) {
        const rows = Math.ceil(((i % 4) + 1) / 2);
        y += rows * (imgH + 12) + 4;
      }
    }
  }

  return y;
}

// ── Single Day PDF ──
export function exportSingleDayPDF(entry: DiaryEntry, projectName: string, photos: DiaryPhoto[], includePhotos: boolean) {
  const doc = initDoc();
  const dateStr = format(parseISO(entry.entry_date), "d MMMM yyyy", { locale: tr });
  let y = addHeader(doc, "ŞANTİYE GÜNLÜK KAYIT FORMU", `${projectName} — ${dateStr}`);
  y = renderEntry(doc, entry, y, projectName, photos, includePhotos);
  y = addSignature(doc, y);
  addPageNumbers(doc);

  const safeName = projectName.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ ]/g, "").replace(/ /g, "_");
  const dateFile = entry.entry_date.replace(/-/g, "");
  doc.save(`${safeName}_SantiyeGunlugu_${dateFile}.pdf`);
}

// ── Period Report PDF ──
export function exportPeriodPDF(
  entries: DiaryEntry[],
  projectName: string,
  photos: DiaryPhoto[],
  includePhotos: boolean,
  startDate: string,
  endDate: string
) {
  const doc = initDoc();
  const pw = doc.internal.pageSize.getWidth();

  // ── Cover Page ──
  let y = addHeader(doc, "ŞANTİYE GÜNLÜK KAYIT RAPORU", projectName);
  y += 10;
  doc.setFontSize(11);
  doc.setTextColor(80);
  const sd = format(parseISO(startDate), "d MMMM yyyy", { locale: tr });
  const ed = format(parseISO(endDate), "d MMMM yyyy", { locale: tr });
  doc.text(`Dönem: ${sd} — ${ed}`, pw / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(9);
  doc.text(`Toplam Gün: ${entries.length}`, pw / 2, y, { align: "center" });
  y += 15;

  // ── Summary ──
  const totalWorkDays = entries.filter(e => e.work_status !== "stopped").length;
  const totalStoppedDays = entries.filter(e => e.work_status === "stopped").length;
  const allCrews = entries.flatMap(e => e.crews);
  const grandWorkers = allCrews.reduce((s, c) => s + c.count, 0);
  const grandManHours = allCrews.reduce((s, c) => s + c.count * c.hours, 0);

  doc.setFontSize(10);
  doc.setTextColor(51);
  doc.text("Dönem Özeti", 15, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: pw / 2 + 2 },
    theme: "plain",
    styles: { font: "Roboto", fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 20, 25], textColor: [200, 200, 200], fontStyle: "bold" },
    head: [["Bilgi", "Değer"]],
    body: [
      ["Toplam Kayıt", String(entries.length)],
      ["Çalışılan Gün", String(totalWorkDays)],
      ["Durma Günü", String(totalStoppedDays)],
      ["Toplam İşçi Girişi", String(grandWorkers)],
      ["Toplam Adam/Saat", String(grandManHours)],
    ],
  });

  // Weather summary
  const weatherMap = new Map<string, number>();
  entries.forEach(e => {
    weatherMap.set(e.weather_icon, (weatherMap.get(e.weather_icon) || 0) + 1);
  });
  const weatherSummary = [...weatherMap.entries()].map(([icon, count]) => [icon, String(count)]);

  autoTable(doc, {
    startY: y,
    margin: { left: pw / 2 + 2, right: 15 },
    theme: "plain",
    styles: { font: "Roboto", fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 20, 25], textColor: [200, 200, 200], fontStyle: "bold" },
    head: [["Hava Durumu", "Gün"]],
    body: weatherSummary,
  });

  // ── Each Day ──
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  sorted.forEach((entry, idx) => {
    doc.addPage();
    let ey = 20;
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`${projectName} — Gün ${idx + 1}/${sorted.length}`, pw - 15, ey, { align: "right" });
    ey += 6;
    const entryPhotos = photos.filter(p => p.diary_entry_id === entry.id);
    ey = renderEntry(doc, entry, ey, projectName, entryPhotos, includePhotos);
  });

  // Signature on last page
  const lastY = (doc as any).lastAutoTable?.finalY || 200;
  addSignature(doc, Math.max(lastY, 220));
  addPageNumbers(doc);

  const safeName = projectName.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ ]/g, "").replace(/ /g, "_");
  const sd2 = startDate.replace(/-/g, "");
  const ed2 = endDate.replace(/-/g, "");
  doc.save(`${safeName}_SantiyeRaporu_${sd2}-${ed2}.pdf`);
}
