import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { robotoBase64 } from "@/lib/robotoFont";
import { logoBase64 } from "@/lib/logoBase64";
import { getCompanyProfile } from "@/lib/companyProfile";
import type { Project } from "@/lib/projectsData";
import type { Task } from "@/hooks/useTasks";
import { formatCurrency } from "@/lib/formatCurrency";

const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const STATUS_LABELS: Record<string, string> = {
  todo: "Bekliyor",
  in_progress: "Devam Ediyor",
  done: "Tamamlandı",
};
const STATUS_SYMBOLS: Record<string, string> = {
  todo: "○",
  in_progress: "→",
  done: "✓",
};
const PRIORITY_LABELS: Record<string, string> = {
  low: "Düşük",
  normal: "Normal",
  high: "Yüksek",
  urgent: "Acil",
};

// ── PDF ──

function addCompanyHeader(doc: jsPDF, title: string): number {
  const cp = getCompanyProfile();
  const pw = doc.internal.pageSize.getWidth();
  let y = 20;

  const hasLogo = cp.logoDataUrl || logoBase64;
  if (hasLogo) {
    try {
      const src = cp.logoDataUrl || `data:image/png;base64,${logoBase64}`;
      doc.addImage(src, "PNG", 15, y - 5, 24, 12);
    } catch {}
  }

  const rx = pw - 15;
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(cp.companyName || "", rx, y, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(100);
  if (cp.address) doc.text(cp.address, rx, y + 5, { align: "right" });
  const parts: string[] = [];
  if (cp.phone) parts.push(`Tel: ${cp.phone}`);
  if (cp.email) parts.push(cp.email);
  if (parts.length) doc.text(parts.join("  |  "), rx, y + 10, { align: "right" });
  y += 18;

  doc.setDrawColor(51);
  doc.setLineWidth(0.5);
  doc.line(15, y, pw - 15, y);
  y += 8;

  doc.setFontSize(14);
  doc.setTextColor(51);
  doc.text(title, pw / 2, y, { align: "center" });
  y += 4;

  // Report date
  doc.setFontSize(8);
  doc.setTextColor(130);
  const now = new Date();
  doc.text(`Rapor Tarihi: ${now.toLocaleDateString("tr-TR")}`, pw - 15, y, { align: "right" });
  y += 8;

  return y;
}

function addPageNumbers(doc: jsPDF) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Sayfa ${i} / ${n}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
  }
}

export function exportProjectPDF(project: Project, tasks: Task[], milestones: { title: string; date: string; completed: boolean }[]) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.addFileToVFS("Roboto-Regular.ttf", robotoBase64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.setFont("Roboto");

  const pw = doc.internal.pageSize.getWidth();
  let y = addCompanyHeader(doc, "PROJE DURUM RAPORU");

  // ── Project Info Table ──
  const todoCount = tasks.filter(t => t.status === "todo").length;
  const inProgressCount = tasks.filter(t => t.status === "in_progress").length;
  const doneCount = tasks.filter(t => t.status === "done").length;
  const totalTasks = tasks.length;

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: pw / 2 + 2 },
    theme: "plain",
    styles: { font: "Roboto", fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [15, 20, 25], textColor: [200, 200, 200], fontStyle: "bold" },
    head: [["Proje Bilgileri", ""]],
    body: [
      ["Proje Adı", project.name],
      ["Müşteri", project.client],
      ["Lokasyon", project.location],
      ["Başlangıç", project.start],
      ["Tahmini Bitiş", project.end],
      ["Bütçe", project.budget],
      ["Durum", project.status],
    ],
  });

  autoTable(doc, {
    startY: y,
    margin: { left: pw / 2 + 2, right: 15 },
    theme: "plain",
    styles: { font: "Roboto", fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [15, 20, 25], textColor: [200, 200, 200], fontStyle: "bold" },
    head: [["İstatistikler", ""]],
    body: [
      ["Toplam Görev", String(totalTasks)],
      ["Tamamlanan", String(doneCount)],
      ["Devam Eden", String(inProgressCount)],
      ["Bekleyen", String(todoCount)],
      ["İlerleme", `%${project.progress}`],
      ["Proje Sorumlusu", project.manager],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Progress bar ──
  doc.setFontSize(10);
  doc.setTextColor(51);
  doc.text("İlerleme Durumu", 15, y);
  y += 5;
  const barW = pw - 30;
  doc.setFillColor(30, 39, 50);
  doc.roundedRect(15, y, barW, 5, 2, 2, "F");
  doc.setFillColor(255, 107, 43);
  doc.roundedRect(15, y, barW * (project.progress / 100), 5, 2, 2, "F");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`%${project.progress} Tamamlandı — ${totalTasks} görevden ${doneCount} tanesi bitti`, 15, y + 10);
  y += 16;

  // ── Milestones ──
  if (milestones.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(51);
    doc.text("Kilometre Taşları", 15, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      margin: { left: 15, right: 15 },
      styles: { font: "Roboto", fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 20, 25], textColor: [200, 200, 200], fontStyle: "bold" },
      head: [["#", "Görev", "Tarih", "Durum"]],
      body: milestones.map((m, i) => [
        String(i + 1),
        m.title,
        m.date,
        m.completed ? "✓ Tamamlandı" : "○ Bekliyor",
      ]),
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 3) {
          const val = data.cell.raw as string;
          data.cell.styles.textColor = val.startsWith("✓") ? [34, 197, 94] : [148, 163, 184];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Tasks table ──
  if (tasks.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setTextColor(51);
    doc.text("Görev Listesi", 15, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      margin: { left: 15, right: 15 },
      styles: { font: "Roboto", fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 20, 25], textColor: [200, 200, 200], fontStyle: "bold" },
      head: [["#", "Görev", "Durum", "Öncelik", "Sorumlu", "Son Tarih"]],
      body: tasks.map((t, i) => [
        String(i + 1),
        t.title,
        `${STATUS_SYMBOLS[t.status]} ${STATUS_LABELS[t.status]}`,
        PRIORITY_LABELS[t.priority] || t.priority,
        t.assignee_name || "-",
        t.due_date ? new Date(t.due_date).toLocaleDateString("tr-TR") : "-",
      ]),
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 2) {
          const val = data.cell.raw as string;
          if (val.startsWith("✓")) data.cell.styles.textColor = [34, 197, 94];
          else if (val.startsWith("→")) data.cell.styles.textColor = [59, 130, 246];
          else data.cell.styles.textColor = [148, 163, 184];
        }
        if (data.section === "body" && data.column.index === 3) {
          const val = data.cell.raw as string;
          if (val === "Acil") data.cell.styles.textColor = [239, 68, 68];
          else if (val === "Yüksek") data.cell.styles.textColor = [245, 158, 11];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Summary box ──
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFillColor(15, 20, 25);
  doc.roundedRect(15, y, pw - 30, 16, 2, 2, "F");
  doc.setFontSize(8);
  const boxY = y + 6;
  const col1 = 25;
  const colW = (pw - 60) / 4;
  const summaryItems = [
    { label: "Tamamlanan", val: String(doneCount), color: [34, 197, 94] },
    { label: "Devam Eden", val: String(inProgressCount), color: [59, 130, 246] },
    { label: "Bekleyen", val: String(todoCount), color: [148, 163, 184] },
    { label: "İlerleme", val: `%${project.progress}`, color: [255, 107, 43] },
  ];
  summaryItems.forEach((s, i) => {
    const x = col1 + i * colW;
    doc.setTextColor(130);
    doc.text(s.label, x, boxY);
    doc.setTextColor(s.color[0], s.color[1], s.color[2]);
    doc.setFontSize(11);
    doc.text(s.val, x, boxY + 6);
    doc.setFontSize(8);
  });
  y += 22;

  // ── Warning ──
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("⚠️ Bu rapor bilgi amaçlıdır. Projeye özel kararlar için sözleşmenizi ve güncel mevzuatı kontrol ediniz.", 15, y);
  y += 10;

  // ── Signature ──
  const cp = getCompanyProfile();
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.setTextColor(130);
  const sigY = y + 5;
  const sigW = (pw - 30) / 3;
  ["Hazırlayan", "Kontrol Eden", "Onaylayan"].forEach((title, i) => {
    const sx = 15 + i * sigW;
    doc.text(title, sx + sigW / 2, sigY, { align: "center" });
    doc.setDrawColor(180);
    doc.line(sx + 5, sigY + 15, sx + sigW - 5, sigY + 15);
    doc.setFontSize(7);
    doc.text("Ad Soyad / İmza", sx + sigW / 2, sigY + 20, { align: "center" });
    doc.setFontSize(8);
  });

  addPageNumbers(doc);

  const safeName = project.name.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ ]/g, "").replace(/ /g, "_");
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  doc.save(`${safeName}_DurumRaporu_${dateStr}.pdf`);
}

// ── Excel ──

export function exportProjectExcel(project: Project, tasks: Task[], milestones: { title: string; date: string; completed: boolean }[]) {
  const wb = XLSX.utils.book_new();

  const todoCount = tasks.filter(t => t.status === "todo").length;
  const inProgressCount = tasks.filter(t => t.status === "in_progress").length;
  const doneCount = tasks.filter(t => t.status === "done").length;

  // ── Sheet 1: Proje Özeti ──
  const s1Data: any[][] = [
    ["PROJE DURUM RAPORU"],
    [getCompanyProfile().companyName],
    [],
    ["Proje Bilgileri"],
    ["Proje Adı", project.name],
    ["Müşteri", project.client],
    ["Lokasyon", project.location],
    ["Başlangıç", project.start],
    ["Bitiş", project.end],
    ["Bütçe", project.budget],
    ["Durum", project.status],
    ["Proje Sorumlusu", project.manager],
    [],
    ["İlerleme Özeti"],
    ["Toplam Görev", tasks.length],
    ["Tamamlanan", doneCount],
    ["Devam Eden", inProgressCount],
    ["Bekleyen", todoCount],
    ["İlerleme %", project.progress],
    [],
    ["Kilometre Taşları"],
    ["#", "Görev", "Tarih", "Durum", "Tamamlanma"],
  ];
  milestones.forEach((m, i) => {
    s1Data.push([i + 1, m.title, m.date, m.completed ? "Tamamlandı" : "Bekliyor", m.completed ? "Evet" : "Hayır"]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(s1Data);
  ws1["!cols"] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 15 }, { wch: 12 }];
  ws1["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Proje Özeti");

  // ── Sheet 2: Görevler ──
  const s2Data: any[][] = [
    ["GÖREV LİSTESİ"],
    [],
    ["#", "Görev", "Açıklama", "Durum", "Öncelik", "Sorumlu", "Son Tarih"],
  ];
  tasks.forEach((t, i) => {
    s2Data.push([
      i + 1,
      t.title,
      t.description || "",
      STATUS_LABELS[t.status],
      PRIORITY_LABELS[t.priority] || t.priority,
      t.assignee_name || "-",
      t.due_date ? new Date(t.due_date).toLocaleDateString("tr-TR") : "-",
    ]);
  });
  // Summary row
  s2Data.push([]);
  s2Data.push(["", "TOPLAM", "", `Biten: ${doneCount}`, `Devam: ${inProgressCount}`, `Bekleyen: ${todoCount}`, ""]);

  const ws2 = XLSX.utils.aoa_to_sheet(s2Data);
  ws2["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 14 }];
  ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  // AutoFilter on header row
  ws2["!autofilter"] = { ref: `A3:G${s2Data.length}` };
  XLSX.utils.book_append_sheet(wb, ws2, "Görevler");

  // ── Sheet 3: Kilometre Taşları ──
  const s3Data: any[][] = [
    ["KİLOMETRE TAŞLARI"],
    [],
    ["#", "Görev", "Tarih", "Durum"],
  ];
  milestones.forEach((m, i) => {
    s3Data.push([i + 1, m.title, m.date, m.completed ? "Tamamlandı" : "Bekliyor"]);
  });
  s3Data.push([]);
  const completedCount = milestones.filter(m => m.completed).length;
  s3Data.push(["", `Tamamlanan: ${completedCount} / ${milestones.length}`, "", `%${milestones.length ? Math.round(completedCount / milestones.length * 100) : 0}`]);

  const ws3 = XLSX.utils.aoa_to_sheet(s3Data);
  ws3["!cols"] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 15 }];
  ws3["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  XLSX.utils.book_append_sheet(wb, ws3, "Kilometre Taşları");

  const safeName = project.name.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ ]/g, "").replace(/ /g, "_");
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  XLSX.writeFile(wb, `${safeName}_ProjeRaporu_${dateStr}.xlsx`);
}
