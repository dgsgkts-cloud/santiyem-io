import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { robotoBase64 } from "@/lib/robotoFont";
import { logoBase64 } from "@/lib/logoBase64";
import { getCompanyProfile, isCompanyProfileComplete } from "@/lib/companyProfile";
import type { ProjectHakedis } from "@/hooks/useProjectHakedis";

const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCurrency = (n: number) => `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

function addPageNumbers(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Sayfa ${i} / ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
  }
}

function addCompanyHeader(doc: jsPDF, docType: string, projectName?: string): number {
  const cp = getCompanyProfile();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Logo (left)
  const hasLogo = cp.logoDataUrl || logoBase64;
  if (hasLogo) {
    try {
      const logoSrc = cp.logoDataUrl || `data:image/png;base64,${logoBase64}`;
      doc.addImage(logoSrc, "PNG", 15, y - 5, 24, 12);
    } catch {}
  }

  // Company info (right)
  const rightX = pageWidth - 15;
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(cp.companyName || "Göktaş Global Mühendislik", rightX, y, { align: "right" });

  doc.setFontSize(8);
  doc.setTextColor(100);
  if (cp.address) doc.text(cp.address, rightX, y + 5, { align: "right" });

  const contactParts: string[] = [];
  if (cp.phone) contactParts.push(`Tel: ${cp.phone}`);
  if (cp.email) contactParts.push(cp.email);
  if (contactParts.length > 0) doc.text(contactParts.join("  |  "), rightX, y + 10, { align: "right" });

  const taxParts: string[] = [];
  if (cp.taxNumber) taxParts.push(`VKN: ${cp.taxNumber}`);
  if (cp.taxOffice) taxParts.push(`VD: ${cp.taxOffice}`);
  if (taxParts.length > 0) doc.text(taxParts.join("  |  "), rightX, y + 15, { align: "right" });

  y += 22;

  // Divider
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Document title
  doc.setFontSize(14);
  doc.setTextColor(51, 51, 51);
  doc.text(docType, pageWidth / 2, y, { align: "center" });
  y += 8;

  return y;
}

export function exportHakedisPDF(
  hakedisler: ProjectHakedis[],
  projectName: string,
  options: PDFOptions,
  clientName?: string,
  contractNo?: string,
  contractDate?: string,
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const cp = getCompanyProfile();

  // Progress callback
  const progress = options.onProgress || (() => {});
  progress(10);

  // Add Roboto font for Turkish chars
  if (robotoBase64) {
    doc.addFileToVFS("Roboto-Regular.ttf", robotoBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto");
  }

  progress(20);

  // ─── Company Header ───
  let y = 20;
  if (options.includeHeader) {
    y = addCompanyHeader(doc, "HAKEDİŞ İCMAL FORMU", projectName);
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
      "Bu belge MühendisAI platformu tarafından oluşturulmuştur. Taslak niteliğinde olup yetkili kişilerce kontrol edilmesi gerekmektedir.",
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
  addPageNumbers(doc);

  progress(100);

  // ─── Save ───
  const safeName = projectName.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, "_").replace(/_+/g, "_");
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fileName = `${safeName}_Hakedis_${hakedisler.length}_${dateTag}.pdf`;
  doc.save(fileName);
}

export function exportHakedisExcel(hakedisler: ProjectHakedis[], projectName: string) {
  const cp = getCompanyProfile();
  const totalAmount = hakedisler.reduce((s, h) => s + h.amount, 0);
  const totalKdv = hakedisler.reduce((s, h) => s + h.kdv, 0);
  const totalNet = hakedisler.reduce((s, h) => s + h.net, 0);

  const data = [
    [`Hakediş Raporu — ${cp.companyName || "Göktaş Global Mühendislik"}`],
    [`Proje: ${projectName}`],
    [`Tarih: ${new Date().toLocaleDateString("tr-TR")}`],
    [],
    ["No", "Dönem", "Tutar (₺)", "KDV (₺)", "Net (₺)", "Durum", "Ödeme Tarihi"],
    ...hakedisler.map((h, i) => [
      i + 1,
      h.period,
      h.amount,
      h.kdv,
      h.net,
      h.status,
      h.payment_date ? new Date(h.payment_date).toLocaleDateString("tr-TR") : "—",
    ]),
    [],
    ["", "TOPLAM", totalAmount, totalKdv, totalNet, "", ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [
    { wch: 5 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 14 }, { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hakediş");
  XLSX.writeFile(wb, `hakedis-${projectName.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
}

// Export the header function for use in other PDF generators
export { addCompanyHeader };
