import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { robotoBase64 } from "@/lib/robotoFont";
import { logoBase64 } from "@/lib/logoBase64";
import { getCompanyProfile, isCompanyProfileComplete } from "@/lib/companyProfile";
import type { ProjectHakedis } from "@/hooks/useProjectHakedis";

const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface PDFSignatureInfo {
  hazirlayan?: { name: string; title: string };
  kontrolEden?: { name: string; title: string };
  isveren?: { name: string; title: string };
}

function addCompanyHeader(doc: jsPDF, docType: string, projectName?: string): number {
  const cp = getCompanyProfile();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 12;

  // Logo
  const hasLogo = cp.logoDataUrl || logoBase64;
  if (hasLogo) {
    try {
      const logoSrc = cp.logoDataUrl || `data:image/png;base64,${logoBase64}`;
      doc.addImage(logoSrc, "PNG", 14, y, 22, 22);
    } catch {}
  }

  const textX = hasLogo ? 40 : 14;

  // Company name
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text(cp.companyName || "Göktaş Global Mühendislik", textX, y + 8);

  // Address line
  doc.setFontSize(8);
  doc.setTextColor(100);
  if (cp.address) {
    doc.text(cp.address, textX, y + 14);
  }

  // Contact line
  const contactParts: string[] = [];
  if (cp.phone) contactParts.push(`Tel: ${cp.phone}`);
  if (cp.email) contactParts.push(cp.email);
  if (contactParts.length > 0) {
    doc.text(contactParts.join("  |  "), textX, y + 19);
  }

  // Tax & KEP line
  const taxParts: string[] = [];
  if (cp.taxNumber) taxParts.push(`Vergi No: ${cp.taxNumber}`);
  if (cp.kepAddress) taxParts.push(`KEP: ${cp.kepAddress}`);
  if (taxParts.length > 0) {
    doc.text(taxParts.join("  |  "), textX, y + 24);
  }

  // Document number & date (right aligned)
  doc.setFontSize(9);
  doc.setTextColor(80);
  const dateStr = new Date().toLocaleDateString("tr-TR");
  doc.text(`Tarih: ${dateStr}`, pageWidth - 14, y + 8, { align: "right" });

  y += 30;

  // Divider
  doc.setDrawColor(255, 107, 43);
  doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // Document type
  doc.setFontSize(12);
  doc.setTextColor(30);
  doc.text(docType, pageWidth / 2, y, { align: "center" });
  y += 6;

  if (projectName) {
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Proje: ${projectName}`, pageWidth / 2, y, { align: "center" });
    y += 6;
  }

  // Thin separator
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  return y;
}

export function exportHakedisPDF(
  hakedisler: ProjectHakedis[],
  projectName: string,
  signatureInfo?: PDFSignatureInfo,
  clientName?: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const cp = getCompanyProfile();

  // Add Roboto font for Turkish chars
  if (robotoBase64) {
    doc.addFileToVFS("Roboto-Regular.ttf", robotoBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto");
  }

  // ─── Company Header ───
  let y = addCompanyHeader(doc, "HAKEDİŞ İCMAL FORMU", projectName);

  // Doc number
  const docNo = `HKD-${new Date().getFullYear()}-${String(hakedisler.length).padStart(3, "0")}`;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Belge No: ${docNo}`, 14, y);
  if (clientName) {
    doc.text(`Müşteri: ${clientName}`, pageWidth / 2, y);
  }
  y += 8;

  // Table
  const totalAmount = hakedisler.reduce((s, h) => s + h.amount, 0);
  const totalKdv = hakedisler.reduce((s, h) => s + h.kdv, 0);
  const totalNet = hakedisler.reduce((s, h) => s + h.net, 0);

  autoTable(doc, {
    startY: y,
    head: [["No", "Dönem", "Tutar (₺)", "KDV (₺)", "Net (₺)", "Durum", "Ödeme Tarihi"]],
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
      ["", "TOPLAM", fmt(totalAmount), fmt(totalKdv), fmt(totalNet), "", ""],
    ],
    styles: { font: robotoBase64 ? "Roboto" : "helvetica", fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [255, 107, 43], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didParseCell: (data) => {
      if (data.row.index === hakedisler.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  // Get Y after table
  const finalY = (doc as any).lastAutoTable?.finalY || y + 60;
  let sigY = finalY + 20;

  // Check if signature area fits on current page
  if (sigY + 70 > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    sigY = 30;
  }

  // ─── Signature Area ───
  // Auto-fill from company profile if signatureInfo missing
  const sigInfo: PDFSignatureInfo = {
    hazirlayan: signatureInfo?.hazirlayan || (cp.authorizedPerson ? { name: cp.authorizedPerson, title: cp.authorizedTitle } : undefined),
    kontrolEden: signatureInfo?.kontrolEden,
    isveren: signatureInfo?.isveren,
  };

  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.setFontSize(9);
  doc.setTextColor(50);

  const colW = (pageWidth - 28) / 2;
  const leftX = 14;
  const rightX = 14 + colW;

  // Row 1: Hazırlayan | Kontrol Eden
  doc.text("Hazırlayan", leftX + 2, sigY);
  doc.text("Kontrol Eden", rightX + 2, sigY);
  sigY += 5;

  doc.setFontSize(8);
  doc.setTextColor(100);

  doc.text(`Adı Soyadı: ${sigInfo.hazirlayan?.name || "________________________"}`, leftX + 2, sigY);
  doc.text(`Ünvanı: ${sigInfo.hazirlayan?.title || "________________________"}`, leftX + 2, sigY + 5);
  doc.text("İmza:", leftX + 2, sigY + 10);
  doc.text("Tarih: ___/___/______", leftX + 2, sigY + 22);

  doc.text(`Adı Soyadı: ${sigInfo.kontrolEden?.name || "________________________"}`, rightX + 2, sigY);
  doc.text(`Ünvanı: ${sigInfo.kontrolEden?.title || "________________________"}`, rightX + 2, sigY + 5);
  doc.text("İmza:", rightX + 2, sigY + 10);
  doc.text("Tarih: ___/___/______", rightX + 2, sigY + 22);

  doc.rect(leftX, sigY - 8, colW - 2, 34);
  doc.rect(rightX, sigY - 8, colW - 2, 34);

  sigY += 32;

  // Row 2: İşveren / Onaylayan
  doc.setFontSize(9);
  doc.setTextColor(50);
  doc.text("İşveren / Onaylayan", leftX + 2, sigY);
  sigY += 5;

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Adı Soyadı: ${sigInfo.isveren?.name || "_____________________________________________"}`, leftX + 2, sigY);
  doc.text(`Ünvanı: ${sigInfo.isveren?.title || "_____________________________________________"}`, leftX + 2, sigY + 5);
  doc.text("Kaşe ve İmza:", leftX + 2, sigY + 10);

  doc.rect(leftX, sigY - 8, pageWidth - 28, 28);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("Bu belge MühendisAI platformu tarafından oluşturulmuştur. | www.muhendisai.com", pageWidth / 2, footerY, { align: "center" });

  doc.save(`hakedis-${projectName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
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
