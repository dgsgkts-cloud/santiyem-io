import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";
import { addPdfHeader, addPdfFooter } from "@/lib/pdfHeader";
import { formatCurrencyFull as money } from "@/lib/formatCurrency";
import {
  createPdfDoc,
  defaultTableTheme,
  autoFitColumns,
  fillEmpty,
  styleExcelHeaderRow,
  nz,
  EMPTY_CELL,
} from "@/lib/reportUtils";
import { savePdfDoc, saveXlsxWorkbook } from "@/lib/nativeDownload";
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

export async function exportSubcontractorExcel(
  sub: Subcontractor,
  payments: SubcontractorPayment[],
  projectName: (id?: string | null) => string,
) {
  const s = summary(sub, payments);
  const wb = XLSX.utils.book_new();

  // Özet sheet
  const summaryRows: any[][] = [
    ["Taşeron Ödeme Geçmişi — Özet"],
    [],
    ["Alan", "Değer"],
    ["Taşeron", nz(sub.name)],
    ["Yetkili", nz(sub.contact_person)],
    ["Telefon", nz(sub.phone)],
    ["Sözleşme Bedeli", s.contract],
    ["Toplam Ödenen", s.totalPaid],
    ["Kalan Borç", s.remaining],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  styleExcelHeaderRow(wsSummary, 3, 2);
  autoFitColumns(wsSummary, summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Özet");

  // Ödemeler sheet
  const header = ["Tarih", "Tutar (₺)", "Yöntem", "Çek No / Vade", "Proje", "Not"];
  const bodyRaw: any[][] = payments.map(p => [
    format(parseISO(p.payment_date), "dd.MM.yyyy"),
    Number(p.amount) || 0,
    METHOD_LABELS[p.payment_method] || p.payment_method,
    p.payment_method === "cek" && p.check_due_date
      ? `${p.check_no || EMPTY_CELL} / ${format(parseISO(p.check_due_date), "dd.MM.yyyy")}`
      : EMPTY_CELL,
    projectName(p.project_id),
    p.note,
  ]);
  const payRows = [header, ...fillEmpty(bodyRaw)];
  const wsPay = XLSX.utils.aoa_to_sheet(payRows);
  styleExcelHeaderRow(wsPay, 1, header.length);
  autoFitColumns(wsPay, payRows);
  XLSX.utils.book_append_sheet(wb, wsPay, "Ödemeler");

  await saveXlsxWorkbook(wb, `${buildBaseName(sub)}.xlsx`);
}

export async function exportSubcontractorPDF(
  sub: Subcontractor,
  payments: SubcontractorPayment[],
  projectName: (id?: string | null) => string,
) {
  const s = summary(sub, payments);
  const doc = createPdfDoc();
  let y = addPdfHeader(doc, "Taşeron Ödeme Geçmişi", sub.name);

  doc.setFont("Roboto", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  const lines = [
    `Taşeron: ${nz(sub.name)}`,
    `Yetkili: ${nz(sub.contact_person)}`,
    `Telefon: ${nz(sub.phone)}`,
    `Sözleşme Bedeli: ${money(s.contract)}`,
    `Toplam Ödenen: ${money(s.totalPaid)}`,
    `Kalan Borç: ${money(s.remaining)}`,
  ];
  for (const ln of lines) {
    doc.text(ln, 15, y);
    y += 5;
  }
  y += 3;

  autoTable(doc, {
    ...defaultTableTheme(),
    startY: y,
    head: [["Tarih", "Tutar", "Yöntem", "Çek No / Vade", "Proje", "Not"]],
    body: payments.map(p => [
      format(parseISO(p.payment_date), "dd.MM.yyyy"),
      money(Number(p.amount) || 0),
      METHOD_LABELS[p.payment_method] || p.payment_method,
      p.payment_method === "cek" && p.check_due_date
        ? `${p.check_no || EMPTY_CELL}\n${format(parseISO(p.check_due_date), "dd.MM.yyyy")}`
        : EMPTY_CELL,
      projectName(p.project_id),
      nz(p.note),
    ]),
    columnStyles: {
      1: { halign: "right" },
    },
  });

  addPdfFooter(doc);
  doc.save(`${buildBaseName(sub)}.pdf`);
}
