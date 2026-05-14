import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";
import { addPdfHeader, addPdfFooter } from "@/lib/pdfHeader";
import { formatCurrencyFull as money } from "@/lib/formatCurrency";
import type { Subcontractor, SubcontractorPayment } from "@/hooks/useSubcontractors";

const METHOD_LABELS: Record<string, string> = {
  nakit: "Nakit",
  cek: "Çek",
  havale: "Havale / EFT",
  kredi_karti: "Kredi Kartı",
};

const sanitize = (s: string) => s.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9_-]+/g, "_").replace(/^_+|_+$/g, "");

function buildBaseName(sub: Subcontractor) {
  const stamp = format(new Date(), "yyyyMMdd");
  return `${sanitize(sub.name) || "Taseron"}_OdemGecmisi_${stamp}`;
}

function summary(sub: Subcontractor, payments: SubcontractorPayment[]) {
  const totalPaid = payments
    .filter(p => p.status === "odendi")
    .reduce((s, p) => s + Number(p.amount), 0);
  return {
    contract: Number(sub.contract_amount) || 0,
    totalPaid,
    remaining: (Number(sub.contract_amount) || 0) - totalPaid,
  };
}

export function exportSubcontractorExcel(
  sub: Subcontractor,
  payments: SubcontractorPayment[],
  projectName: (id?: string | null) => string,
) {
  const s = summary(sub, payments);
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    ["Taşeron", sub.name],
    ["Yetkili", sub.contact_person || "—"],
    ["Telefon", sub.phone || "—"],
    ["Sözleşme Bedeli", s.contract],
    ["Toplam Ödenen", s.totalPaid],
    ["Kalan Borç", s.remaining],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Özet");

  const header = ["Tarih", "Tutar (₺)", "Yöntem", "Çek/Vade", "Proje", "Not"];
  const rows = payments.map(p => [
    format(parseISO(p.payment_date), "dd.MM.yyyy"),
    Number(p.amount) || 0,
    METHOD_LABELS[p.payment_method] || p.payment_method,
    p.payment_method === "cek" && p.check_due_date
      ? `${p.check_no || "—"} / ${format(parseISO(p.check_due_date), "dd.MM.yyyy")}`
      : "—",
    projectName(p.project_id),
    p.note || "",
  ]);
  const wsPay = XLSX.utils.aoa_to_sheet([header, ...rows]);
  XLSX.utils.book_append_sheet(wb, wsPay, "Ödemeler");

  XLSX.writeFile(wb, `${buildBaseName(sub)}.xlsx`);
}

export function exportSubcontractorPDF(
  sub: Subcontractor,
  payments: SubcontractorPayment[],
  projectName: (id?: string | null) => string,
) {
  const s = summary(sub, payments);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = addPdfHeader(doc, "Taşeron Ödeme Geçmişi", sub.name);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const lines = [
    `Taşeron: ${sub.name}`,
    sub.contact_person ? `Yetkili: ${sub.contact_person}` : "",
    sub.phone ? `Telefon: ${sub.phone}` : "",
    `Sözleşme Bedeli: ${money(s.contract)}`,
    `Toplam Ödenen: ${money(s.totalPaid)}`,
    `Kalan Borç: ${money(s.remaining)}`,
  ].filter(Boolean);
  for (const ln of lines) {
    doc.text(ln, 15, y);
    y += 5;
  }
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Tarih", "Tutar", "Yöntem", "Çek No / Vade", "Proje", "Not"]],
    body: payments.map(p => [
      format(parseISO(p.payment_date), "dd.MM.yyyy"),
      money(Number(p.amount) || 0),
      METHOD_LABELS[p.payment_method] || p.payment_method,
      p.payment_method === "cek" && p.check_due_date
        ? `${p.check_no || "—"}\n${format(parseISO(p.check_due_date), "dd.MM.yyyy")}`
        : "—",
      projectName(p.project_id),
      p.note || "—",
    ]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [255, 107, 43], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 15, right: 15 },
  });

  addPdfFooter(doc);
  doc.save(`${buildBaseName(sub)}.pdf`);
}
