// jsPDF dolaylı olarak reportUtils.createPdfDoc üzerinden kullanılır
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { robotoBase64 } from "@/lib/robotoFont";
import { getCompanyProfile, isCompanyProfileComplete } from "@/lib/companyProfile";
import { addPdfHeader, addPdfFooter } from "@/lib/pdfHeader";
import { createPdfDoc, autoFitColumns, styleExcelHeaderRow, nz } from "@/lib/reportUtils";
import { savePdfDoc, saveXlsxWorkbook } from "@/lib/nativeDownload";
import type { ProjectHakedis } from "@/hooks/useProjectHakedis";

import { formatNumber2 as fmt, formatCurrencyFull as fmtCurrency } from "@/lib/formatCurrency";

export interface PDFSignatureInfo {
  hazirlayan?: { name: string; title: string };
  kontrolEden?: { name: string; title: string };
  isveren?: { name: string; title: string };
}

export interface PDFOptions {
  includeHeader: boolean;
  includeSignature: boolean;
  includeWarning: boolean;
  signatureInfo: PDFSignatureInfo;
  onProgress?: (pct: number) => void;
}

// Number to Turkish text
function numberToTurkishText(n: number): string {
  if (n === 0) return "Sıfır";
  const birler = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz"];
  const onlar = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"];
  const buyukler = ["", "Bin", "Milyon", "Milyar", "Trilyon"];

  const intPart = Math.floor(Math.abs(n));
  const decPart = Math.round((Math.abs(n) - intPart) * 100);

  function threeDigits(num: number): string {
    if (num === 0) return "";
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const o = num % 10;
    let s = "";
    if (h === 1) s += "Yüz";
    else if (h > 1) s += birler[h] + "yüz";
    s += onlar[t];
    s += birler[o];
    return s;
  }

  if (intPart === 0) {
    return decPart > 0 ? `Sıfır Virgül ${threeDigits(decPart)}` : "Sıfır";
  }

  let result = "";
  let remaining = intPart;
  let groupIdx = 0;

  while (remaining > 0) {
    const group = remaining % 1000;
    if (group > 0) {
      let groupText = threeDigits(group);
      // "Bir Bin" -> "Bin"
      if (groupIdx === 1 && group === 1) groupText = "";
      result = groupText + buyukler[groupIdx] + " " + result;
    }
    remaining = Math.floor(remaining / 1000);
    groupIdx++;
  }

  result = result.trim();
  if (decPart > 0) {
    result += ` Virgül ${threeDigits(decPart)}`;
  }
  return result;
}

// (header/footer helpers replaced by shared addPdfHeader / addPdfFooter)

export interface HakedisWorkItem {
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export async function exportHakedisPDF(
  hakedisler: ProjectHakedis[],
  projectName: string,
  options: PDFOptions,
  clientName?: string,
  contractNo?: string,
  contractDate?: string,
  workItems?: HakedisWorkItem[],
) {
  const doc = createPdfDoc();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const cp = getCompanyProfile();

  // Progress callback
  const progress = options.onProgress || (() => {});
  progress(20);

  // ─── Company Header ───
  let y = 20;
  if (options.includeHeader) {
    y = addPdfHeader(doc, "HAKEDİŞ İCMAL FORMU", projectName);
  } else {
    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text("HAKEDİŞ İCMAL FORMU", pageWidth / 2, y, { align: "center" });
    y += 10;
  }

  progress(30);

  // ─── Document info (2 column) ───
  const infoLeft = [
    ["Proje Adı", projectName],
    ["İşveren", clientName || "—"],
    ["Sözleşme No", contractNo || "—"],
    ["Sözleşme Tarihi", contractDate || "—"],
  ];
  const dateStr = new Date().toLocaleDateString("tr-TR");
  const infoRight = [
    ["Hakediş No", `HKD-${new Date().getFullYear()}-${String(hakedisler.length).padStart(3, "0")}`],
    ["Düzenleme Tarihi", dateStr],
    ["Dönem", hakedisler.length > 0 ? `${hakedisler[0].period} — ${hakedisler[hakedisler.length - 1].period}` : "—"],
    ["Hakediş Türü", hakedisler.length === 1 ? "Ara Hakediş" : "Toplu İcmal"],
  ];

  doc.setFontSize(8);
  const colMid = pageWidth / 2;
  infoLeft.forEach(([label, val], i) => {
    doc.setTextColor(120);
    doc.text(`${label}:`, 15, y + i * 5);
    doc.setTextColor(40);
    doc.text(val, 55, y + i * 5);
  });
  infoRight.forEach(([label, val], i) => {
    doc.setTextColor(120);
    doc.text(`${label}:`, colMid + 5, y + i * 5);
    doc.setTextColor(40);
    doc.text(val, colMid + 45, y + i * 5);
  });

  y += 24;

  // Thin separator
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  progress(40);

  // ─── Table ───
  const totalAmount = hakedisler.reduce((s, h) => s + h.amount, 0);
  const totalKdv = hakedisler.reduce((s, h) => s + h.kdv, 0);
  const totalNet = hakedisler.reduce((s, h) => s + h.net, 0);
  // Stopaj calculation: 3% on brüt (amount + kdv)
  const brut = totalAmount + totalKdv;
  const stopaj = Math.round(brut * 0.03 * 100) / 100;
  const netOdenecek = brut - stopaj;

  autoTable(doc, {
    startY: y,
    head: [["#", "Dönem", "Tutar (₺)", "KDV (₺)", "Brüt (₺)", "Durum", "Ödeme Tarihi"]],
    body: [
      ...hakedisler.map((h, i) => [
        String(i + 1),
        h.period,
        fmt(h.amount),
        fmt(h.kdv),
        fmt(h.net),
        h.status,
        h.payment_date ? new Date(h.payment_date).toLocaleDateString("tr-TR") : "—",
      ]),
      ["", "TOPLAM", fmt(totalAmount), fmt(totalKdv), fmt(brut), "", ""],
    ],
    styles: { font: robotoBase64 ? "Roboto" : "helvetica", fontSize: 9, cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.2 },
    headStyles: { fillColor: [51, 51, 51], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9, halign: "center" },
    alternateRowStyles: { fillColor: [249, 249, 249] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "center" },
      6: { halign: "center" },
    },
    didParseCell: (data) => {
      if (data.row.index === hakedisler.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [235, 235, 235];
      }
    },
    margin: { left: 15, right: 15 },
  });

  progress(60);

  let finalY = (doc as any).lastAutoTable?.finalY || y + 60;
  finalY += 8;

  // ─── Work Items Detail Table ───
  if (workItems && workItems.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(51, 51, 51);
    doc.text("İŞ KALEMLERİ DETAY TABLOSU", 15, finalY);
    finalY += 6;

    const itemsTotal = workItems.reduce((s, w) => s + w.total_price, 0);

    autoTable(doc, {
      startY: finalY,
      head: [["#", "İş Kalemi / Açıklama", "Birim", "Miktar", "Birim Fiyat (₺)", "Toplam (₺)"]],
      body: [
        ...workItems.map((w, i) => [
          String(i + 1),
          w.description,
          w.unit,
          fmt(w.quantity),
          fmt(w.unit_price),
          fmt(w.total_price),
        ]),
        ["", "GENEL TOPLAM", "", "", "", fmt(itemsTotal)],
      ],
      styles: { font: robotoBase64 ? "Roboto" : "helvetica", fontSize: 8, cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.2 },
      headStyles: { fillColor: [51, 51, 51], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8, halign: "center" },
      alternateRowStyles: { fillColor: [249, 249, 249] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 60 },
        2: { cellWidth: 18, halign: "center" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
      didParseCell: (data) => {
        if (data.row.index === workItems.length) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [235, 235, 235];
        }
      },
      margin: { left: 15, right: 15 },
    });

    finalY = (doc as any).lastAutoTable?.finalY || finalY + 40;
    finalY += 8;
  }

  progress(65);

  // ─── Financial Summary (right-aligned box) ───
  const boxW = 85;
  const boxX = pageWidth - 15 - boxW;
  const lineH = 6;
  const summaryLines = [
    ["Hakediş Toplamı (KDV Hariç)", fmtCurrency(totalAmount)],
    ["KDV (%20)", fmtCurrency(totalKdv)],
    ["KDV Dahil Toplam", fmtCurrency(brut)],
    ["Stopaj (%3)", `- ${fmtCurrency(stopaj)}`],
  ];

  doc.setDrawColor(180);
  doc.setLineWidth(0.3);

  summaryLines.forEach(([label, val], i) => {
    const ly = finalY + i * lineH;
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text(label, boxX + 2, ly + 4);
    doc.setTextColor(40);
    doc.text(val, boxX + boxW - 2, ly + 4, { align: "right" });
  });

  const separatorY = finalY + summaryLines.length * lineH;
  doc.line(boxX, separatorY, boxX + boxW, separatorY);

  // Net ödenecek (bold, orange)
  const netY = separatorY + lineH;
  doc.setFontSize(10);
  doc.setTextColor(255, 107, 43);
  doc.text("NET ÖDENECEK TUTAR", boxX + 2, netY + 4);
  doc.text(fmtCurrency(netOdenecek), boxX + boxW - 2, netY + 4, { align: "right" });

  doc.setDrawColor(180);
  doc.rect(boxX, finalY, boxW, (summaryLines.length + 1) * lineH + 2);

  finalY = netY + lineH + 6;

  progress(70);

  // ─── Amount in words ───
  const amountText = numberToTurkishText(Math.round(netOdenecek));
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text(`Yalnız ${amountText} Türk Lirasıdır.`, 15, finalY, { maxWidth: pageWidth - 30 });
  finalY += 10;

  progress(80);

  // ─── Warning text ───
  if (options.includeWarning) {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "Bu belge Şantiyem platformu tarafından oluşturulmuştur. Taslak niteliğinde olup yetkili kişilerce kontrol edilmesi gerekmektedir.",
      15, finalY, { maxWidth: pageWidth - 30 }
    );
    finalY += 10;
  }

  // ─── Signature Area ───
  if (options.includeSignature) {
    // Check if it fits
    if (finalY + 55 > pageHeight - 20) {
      doc.addPage();
      finalY = 25;
    }

    const sigInfo = options.signatureInfo;
    const colW = (pageWidth - 30 - 8) / 3; // 3 columns with gaps
    const cols = [
      { title: "Hazırlayan", name: sigInfo.hazirlayan?.name, titleVal: sigInfo.hazirlayan?.title },
      { title: "Kontrol Eden", name: sigInfo.kontrolEden?.name, titleVal: sigInfo.kontrolEden?.title },
      { title: "Onaylayan", name: sigInfo.isveren?.name, titleVal: sigInfo.isveren?.title },
    ];

    const boxH = 50;
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);

    cols.forEach((col, i) => {
      const cx = 15 + i * (colW + 4);
      doc.rect(cx, finalY, colW, boxH);

      doc.setFontSize(9);
      doc.setTextColor(50);
      doc.text(col.title, cx + colW / 2, finalY + 6, { align: "center" });

      doc.setFontSize(8);
      doc.setTextColor(100);
      const nameLabel = `Ad Soyad: ${col.name || "........................"}`;
      const titleLabel = `Ünvan: ${col.titleVal || "........................"}`;
      doc.text(nameLabel, cx + 4, finalY + 16);
      doc.text(titleLabel, cx + 4, finalY + 22);
      doc.text(i === 2 ? "Kaşe/İmza:" : "İmza/Kaşe:", cx + 4, finalY + 30);
      doc.text("Tarih: ....../....../............", cx + 4, finalY + 44);
    });

    finalY += boxH + 6;
  }

  progress(90);

  // ─── Page numbers ───
  addPdfFooter(doc);

  progress(100);

  // ─── Save ───
  const safeName = projectName.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, "_").replace(/_+/g, "_");
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fileName = `${safeName}_Hakedis_${hakedisler.length}_${dateTag}.pdf`;
  await savePdfDoc(doc, fileName);
}

export async function exportHakedisExcel(
  hakedisler: ProjectHakedis[],
  projectName: string,
  workItems?: HakedisWorkItem[],
  clientName?: string,
) {
  const cp = getCompanyProfile();
  const wb = XLSX.utils.book_new();
  const companyName = cp.companyName || "Göktaş Global Mühendislik";
  const dateStr = new Date().toLocaleDateString("tr-TR");
  const hakedisNo = `HKD-${new Date().getFullYear()}-${String(hakedisler.length).padStart(3, "0")}`;
  const donemStr = hakedisler.length > 0 ? `${hakedisler[0].period} — ${hakedisler[hakedisler.length - 1].period}` : "—";

  // Color helpers
  const headerFill = { fgColor: { rgb: "1F3864" } };
  const headerFont = { color: { rgb: "FFFFFF" }, bold: true, sz: 11 };
  const boldStyle = { font: { bold: true } };
  const rightAlign = { alignment: { horizontal: "right" as const } };
  const centerAlign = { alignment: { horizontal: "center" as const } };
  const currencyFmt = '#,##0.00 "₺"';
  const pctFmt = "0.0%";
  const altRowFill = { fgColor: { rgb: "EBF3FB" } };
  const orangeFill = { fgColor: { rgb: "FF6B2B" } };
  const greenFill = { fgColor: { rgb: "C6EFCE" } };
  const yellowFill = { fgColor: { rgb: "FFEB9C" } };
  const redFill = { fgColor: { rgb: "FFC7CE" } };

  // ─── SEKME 1: HAKEDİŞ İCMAL ───
  const items = workItems || [];
  const s1Data: any[][] = [];

  // Header rows
  s1Data.push(["HAKEDİŞ İCMAL FORMU"]);
  s1Data.push([companyName]);
  s1Data.push([`Proje: ${projectName}`, "", `İşveren: ${clientName || "—"}`]);
  s1Data.push([`Hakediş No: ${hakedisNo}`, "", `Tarih: ${dateStr}`]);
  s1Data.push([`Dönem: ${donemStr}`]);
  s1Data.push([]); // blank row

  // Table header row (row index 6 = Excel row 7)
  s1Data.push(["Poz No", "İş Kalemi", "Birim", "Miktar", "Birim Fiyat (₺)", "Tutar (₺)"]);

  // Data rows
  if (items.length > 0) {
    items.forEach((w, i) => {
      const rowNum = 8 + i; // Excel 1-indexed
      s1Data.push([
        i + 1,
        w.description,
        w.unit,
        w.quantity,
        w.unit_price,
        { f: `D${rowNum}*E${rowNum}` },
      ]);
    });
  } else {
    // If no work items, show hakedis lines as items
    hakedisler.forEach((h, i) => {
      s1Data.push([i + 1, h.period, "adet", 1, h.amount, h.amount]);
    });
  }

  const dataCount = items.length > 0 ? items.length : hakedisler.length;
  const firstDataRow = 8;
  const lastDataRow = firstDataRow + dataCount - 1;
  const sumRow = lastDataRow + 1;
  const kdvRow = sumRow + 1;
  const brutRow = kdvRow + 1;
  const stopajRow = brutRow + 1;
  const netRow = stopajRow + 1;

  s1Data.push(["", "", "", "", "Ara Toplam", { f: `SUM(F${firstDataRow}:F${lastDataRow})` }]);
  s1Data.push(["", "", "", "", "KDV (%20)", { f: `F${sumRow}*0.2` }]);
  s1Data.push(["", "", "", "", "Brüt Toplam", { f: `F${sumRow}+F${kdvRow}` }]);
  s1Data.push(["", "", "", "", "Stopaj (%3)", { f: `F${brutRow}*0.03` }]);
  s1Data.push(["", "", "", "", "Net Ödenecek", { f: `F${brutRow}-F${stopajRow}` }]);

  const ws1 = XLSX.utils.aoa_to_sheet(s1Data);

  // Merges
  ws1["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // A1:F1
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // A2:F2
  ];

  // Column widths
  ws1["!cols"] = [
    { wch: 8 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
  ];

  // Style header cells
  const applyStyle = (ws: any, ref: string, style: any) => {
    if (!ws[ref]) ws[ref] = { v: "", t: "s" };
    ws[ref].s = { ...ws[ref].s, ...style };
  };

  // Title style
  applyStyle(ws1, "A1", { font: { bold: true, sz: 14 }, alignment: { horizontal: "center" } });
  applyStyle(ws1, "A2", { font: { bold: true, sz: 11 }, alignment: { horizontal: "center" } });

  // Table header row (row 7 = index 6)
  ["A", "B", "C", "D", "E", "F"].forEach(col => {
    const ref = `${col}7`;
    applyStyle(ws1, ref, { font: headerFont, fill: headerFill, alignment: { horizontal: "center" } });
  });

  // Alternating row colors + number format
  for (let i = 0; i < dataCount; i++) {
    const row = firstDataRow + i;
    const fill = i % 2 === 1 ? { fill: { patternType: "solid", ...altRowFill } } : {};
    ["A", "B", "C", "D", "E", "F"].forEach(col => {
      const ref = `${col}${row}`;
      if (ws1[ref]) {
        if (col === "D" || col === "E" || col === "F") {
          ws1[ref].z = currencyFmt;
          ws1[ref].s = { ...fill, alignment: { horizontal: "right" } };
        } else if (col === "A") {
          ws1[ref].s = { ...fill, alignment: { horizontal: "center" } };
        } else {
          ws1[ref].s = fill;
        }
      }
    });
  }

  // Summary rows bold + currency format
  [sumRow, kdvRow, brutRow, stopajRow, netRow].forEach(row => {
    const eRef = `E${row}`;
    const fRef = `F${row}`;
    applyStyle(ws1, eRef, { font: { bold: true }, alignment: { horizontal: "right" } });
    if (ws1[fRef]) {
      ws1[fRef].z = currencyFmt;
      ws1[fRef].s = { font: { bold: true }, alignment: { horizontal: "right" } };
    }
  });
  // Net row orange
  applyStyle(ws1, `E${netRow}`, { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", ...orangeFill }, alignment: { horizontal: "right" } });
  applyStyle(ws1, `F${netRow}`, { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", ...orangeFill }, alignment: { horizontal: "right" } });

  // Print settings
  ws1["!print"] = { area: `A1:F${netRow}`, orientation: "landscape" };

  XLSX.utils.book_append_sheet(wb, ws1, "Hakediş İcmal");

  // ─── SEKME 2: KALEMLERİ DETAY ───
  const s2Data: any[][] = [];
  s2Data.push(["İŞ KALEMLERİ DETAY"]);
  s2Data.push([]);
  s2Data.push([
    "Poz No", "İş Kalemi", "Birim", "Sözleşme Miktarı",
    "Bu Hakediş Miktarı", "Önceki Miktar", "Birim Fiyat (₺)",
    "Bu Hakediş Tutarı (₺)", "Önceki Toplam (₺)", "Bugüne Kadar Toplam (₺)",
    "Kalan Miktar", "Kullanım %",
  ]);

  if (items.length > 0) {
    items.forEach((w, i) => {
      const row = 4 + i; // Excel row
      const contractQty = w.quantity * 1.2; // estimate contract as 120% of current
      s2Data.push([
        i + 1,
        w.description,
        w.unit,
        contractQty,
        w.quantity,
        0,
        w.unit_price,
        { f: `E${row}*G${row}` },
        0,
        { f: `H${row}+I${row}` },
        { f: `D${row}-E${row}-F${row}` },
        { f: `IF(D${row}>0,(E${row}+F${row})/D${row},0)` },
      ]);
    });
  } else {
    hakedisler.forEach((h, i) => {
      const row = 4 + i;
      s2Data.push([
        i + 1, h.period, "adet", 1, 1, 0, h.amount,
        h.amount, 0, h.amount, 0, 1,
      ]);
    });
  }

  const ws2 = XLSX.utils.aoa_to_sheet(s2Data);
  ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];
  ws2["!cols"] = [
    { wch: 8 }, { wch: 35 }, { wch: 10 }, { wch: 16 },
    { wch: 18 }, { wch: 14 }, { wch: 16 },
    { wch: 18 }, { wch: 16 }, { wch: 20 },
    { wch: 14 }, { wch: 12 },
  ];

  applyStyle(ws2, "A1", { font: { bold: true, sz: 14 } });

  // Header row styles
  ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].forEach(col => {
    applyStyle(ws2, `${col}3`, { font: headerFont, fill: headerFill, alignment: { horizontal: "center" } });
  });

  // Format percentage and currency columns
  const detailCount = items.length > 0 ? items.length : hakedisler.length;
  for (let i = 0; i < detailCount; i++) {
    const row = 4 + i;
    // Currency columns
    ["G", "H", "I", "J"].forEach(col => {
      const ref = `${col}${row}`;
      if (ws2[ref]) ws2[ref].z = currencyFmt;
    });
    // Percentage column
    const pctRef = `L${row}`;
    if (ws2[pctRef]) ws2[pctRef].z = pctFmt;
  }

  XLSX.utils.book_append_sheet(wb, ws2, "Kalemleri Detay");

  // ─── SEKME 3: FİNANSAL ÖZET ───
  const s3Data: any[][] = [];
  s3Data.push(["FİNANSAL ÖZET"]);
  s3Data.push([]);
  s3Data.push([
    "Hakediş No", "Tarih", "KDV Hariç (₺)", "KDV (₺)",
    "Brüt (₺)", "Stopaj (₺)", "Net (₺)", "Durum", "Ödeme Tarihi",
  ]);

  hakedisler.forEach((h, i) => {
    const brut = h.amount + h.kdv;
    const stopaj = Math.round(brut * 0.03 * 100) / 100;
    const net = brut - stopaj;
    s3Data.push([
      `#${i + 1}`,
      new Date(h.created_at).toLocaleDateString("tr-TR"),
      h.amount,
      h.kdv,
      brut,
      stopaj,
      net,
      h.status,
      h.payment_date ? new Date(h.payment_date).toLocaleDateString("tr-TR") : "—",
    ]);
  });

  // Total row
  const f3First = 4;
  const f3Last = f3First + hakedisler.length - 1;
  const f3Total = f3Last + 1;
  s3Data.push([
    "TOPLAM", "",
    { f: `SUM(C${f3First}:C${f3Last})` },
    { f: `SUM(D${f3First}:D${f3Last})` },
    { f: `SUM(E${f3First}:E${f3Last})` },
    { f: `SUM(F${f3First}:F${f3Last})` },
    { f: `SUM(G${f3First}:G${f3Last})` },
    "", "",
  ]);

  const ws3 = XLSX.utils.aoa_to_sheet(s3Data);
  ws3["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
  ws3["!cols"] = [
    { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
  ];

  applyStyle(ws3, "A1", { font: { bold: true, sz: 14 } });

  // Header row
  ["A", "B", "C", "D", "E", "F", "G", "H", "I"].forEach(col => {
    applyStyle(ws3, `${col}3`, { font: headerFont, fill: headerFill, alignment: { horizontal: "center" } });
  });

  // Currency format for data rows
  for (let i = 0; i < hakedisler.length; i++) {
    const row = f3First + i;
    ["C", "D", "E", "F", "G"].forEach(col => {
      const ref = `${col}${row}`;
      if (ws3[ref]) ws3[ref].z = currencyFmt;
    });
    // Status color
    const statusRef = `H${row}`;
    const status = hakedisler[i].status;
    if (ws3[statusRef]) {
      if (status === "Ödendi") ws3[statusRef].s = { fill: { patternType: "solid", ...greenFill } };
      else if (status === "Bekliyor" || status === "Onaylandı") ws3[statusRef].s = { fill: { patternType: "solid", ...yellowFill } };
      else if (status === "Reddedildi") ws3[statusRef].s = { fill: { patternType: "solid", ...redFill } };
    }
  }

  // Total row bold + currency
  applyStyle(ws3, `A${f3Total}`, { font: { bold: true } });
  ["C", "D", "E", "F", "G"].forEach(col => {
    const ref = `${col}${f3Total}`;
    if (ws3[ref]) {
      ws3[ref].z = currencyFmt;
      ws3[ref].s = { font: { bold: true } };
    }
  });

  XLSX.utils.book_append_sheet(wb, ws3, "Finansal Özet");

  // ─── Save ───
  const safeName = projectName.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, "_").replace(/_+/g, "_");
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fileName = `${safeName}_Hakedis_${hakedisler.length}_${dateTag}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
