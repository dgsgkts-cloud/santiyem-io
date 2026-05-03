import jsPDF from "jspdf";
import { getCompanyProfile } from "@/lib/companyProfile";

/**
 * Standart PDF header — sol üstte firma logosu, sağ üstte firma bilgileri.
 * Logo Firma Profili'nden gelir; yoksa sadece firma adı yazılır.
 * Şantiyem logosu ASLA kullanılmaz.
 */
export function addPdfHeader(doc: jsPDF, title: string, subtitle?: string): number {
  const cp = getCompanyProfile();
  const pw = doc.internal.pageSize.getWidth();
  let y = 18;

  // Sol — sadece kullanıcı logosu (varsa)
  if (cp.logoDataUrl) {
    try {
      doc.addImage(cp.logoDataUrl, "PNG", 15, y - 5, 24, 14);
    } catch {}
  }

  // Sağ — firma bilgileri
  const rx = pw - 15;
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(cp.companyName || "", rx, y, { align: "right" });

  doc.setFontSize(8);
  doc.setTextColor(100);
  let ry = y + 5;
  if (cp.address) {
    doc.text(cp.address, rx, ry, { align: "right" });
    ry += 4.5;
  }
  const taxParts: string[] = [];
  if (cp.taxNumber) taxParts.push(`VKN: ${cp.taxNumber}`);
  if (cp.taxOffice) taxParts.push(`VD: ${cp.taxOffice}`);
  if (taxParts.length) {
    doc.text(taxParts.join("  |  "), rx, ry, { align: "right" });
    ry += 4.5;
  }
  const contact: string[] = [];
  if (cp.phone) contact.push(`Tel: ${cp.phone}`);
  if (cp.email) contact.push(cp.email);
  if (contact.length) {
    doc.text(contact.join("  |  "), rx, ry, { align: "right" });
    ry += 4.5;
  }

  y = Math.max(ry, y + 14) + 2;

  // Ayraç
  doc.setDrawColor(51);
  doc.setLineWidth(0.4);
  doc.line(15, y, pw - 15, y);
  y += 7;

  // Belge başlığı
  doc.setFontSize(13);
  doc.setTextColor(51);
  doc.text(title, pw / 2, y, { align: "center" });
  y += 5;

  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(subtitle, pw / 2, y, { align: "center" });
    y += 5;
  }

  doc.setFontSize(7.5);
  doc.setTextColor(140);
  doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString("tr-TR")}`, pw - 15, y, { align: "right" });
  y += 6;

  return y;
}

/**
 * Standart PDF footer — her sayfada "Şantiyem ile oluşturuldu — santiyem.io"
 * notu ve "Sayfa X / Y" gösterimi.
 */
export function addPdfFooter(doc: jsPDF) {
  const n = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("Şantiyem ile oluşturuldu — santiyem.io", 15, ph - 8);
    doc.text(`Sayfa ${i} / ${n}`, pw - 15, ph - 8, { align: "right" });
  }
}
