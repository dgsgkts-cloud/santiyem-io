import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { CashPayment } from "@/hooks/useCashPayments";
import type { CashCollection } from "@/hooks/useCashCollections";
import type { CashCheck } from "@/hooks/useCashChecks";
import type { CashAccount } from "@/hooks/useCashAccounts";
import { addPdfHeader, addPdfFooter } from "@/lib/pdfHeader";
import {
  createPdfDoc,
  defaultTableTheme,
  autoFitColumns,
  fillEmpty,
  styleExcelHeaderRow,
  nz,
} from "@/lib/reportUtils";
import { savePdfDoc, saveXlsxWorkbook } from "@/lib/nativeDownload";

import { formatCurrencyFull as money } from "@/lib/formatCurrency";

const statusLabels: Record<string, string> = {
  odendi: "Ödendi",
  bekliyor: "Bekliyor",
  planlanmis: "Planlanmış",
  tahsil_edildi: "Tahsil Edildi",
  bekleniyor: "Bekleniyor",
  gecikmis: "Gecikmiş",
  vadesi_gelmedi: "Vadesi Gelmedi",
  karsilliksiz: "Karşılıksız",
};

const st = (s: string) => statusLabels[s] || s;

interface CashReportData {
  payments: CashPayment[];
  collections: CashCollection[];
  checks: CashCheck[];
  accounts: CashAccount[];
}

// ─── PDF ────────────────────────────────────────
export async function exportCashPDF(data: CashReportData) {
  const doc = createPdfDoc({ orientation: "landscape" });

  const now = new Date();

  // ── Header (firma profili) ──
  let y = addPdfHeader(doc, "Kasa & Ödeme Raporu");

  // ── Summary
  const totalBalance = data.accounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalPayments = data.payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollections = data.collections.reduce((s, c) => s + Number(c.amount), 0);

  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(`Toplam Bakiye: ${money(totalBalance)}    |    Toplam Ödemeler: ${money(totalPayments)}    |    Toplam Tahsilatlar: ${money(totalCollections)}    |    Net: ${money(totalCollections - totalPayments)}`, 14, y);
  y += 8;

  // ── Accounts
  doc.setFontSize(12);
  doc.setTextColor(255, 107, 43);
  doc.text("Hesaplar", 14, y);
  y += 2;

  autoTable(doc, {
    ...defaultTableTheme({
      headStyles: { font: "Roboto", fillColor: [255, 107, 43], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 8.5, cellPadding: 2.5 },
    }),
    startY: y,
    head: [["Hesap Adı", "Tür", "Banka", "IBAN", "Bakiye"]],
    body: data.accounts.map(a => [
      nz(a.name),
      a.account_type === "nakit_kasa" ? "Nakit Kasa" : a.account_type === "banka" ? "Banka" : "Kredi Kartı",
      nz(a.bank_name),
      nz(a.iban),
      money(a.balance),
    ]),
    columnStyles: { 4: { halign: "right" } },
  });

  // ── Payments
  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 170) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setTextColor(255, 107, 43);
  doc.text("Ödemeler", 14, y);
  y += 2;

  autoTable(doc, {
    ...defaultTableTheme({
      headStyles: { font: "Roboto", fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 8.5, cellPadding: 2.5 },
    }),
    startY: y,
    head: [["Tarih", "Alıcı", "Kategori", "Tutar", "Ödeme Tipi", "Durum"]],
    body: data.payments.map(p => [nz(p.payment_date), nz(p.recipient), nz(p.category), money(p.amount), nz(p.payment_type), st(p.status)]),
    columnStyles: { 3: { halign: "right" } },
  });

  // ── Collections
  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 170) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setTextColor(255, 107, 43);
  doc.text("Tahsilatlar", 14, y);
  y += 2;

  autoTable(doc, {
    ...defaultTableTheme({
      headStyles: { font: "Roboto", fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 8.5, cellPadding: 2.5 },
    }),
    startY: y,
    head: [["Tarih", "Gönderen", "Tür", "Tutar", "Ödeme Tipi", "Durum"]],
    body: data.collections.map(c => [nz(c.collection_date), nz(c.sender), nz(c.collection_type), money(c.amount), nz(c.payment_type), st(c.status)]),
    columnStyles: { 3: { halign: "right" } },
  });

  // ── Checks
  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 170) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setTextColor(255, 107, 43);
  doc.text("Çekler", 14, y);
  y += 2;

  autoTable(doc, {
    ...defaultTableTheme({
      headStyles: { font: "Roboto", fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 8.5, cellPadding: 2.5 },
    }),
    startY: y,
    head: [["Tür", "Çek No", "Banka", "Karşı Taraf", "Tutar", "Vade", "Durum"]],
    body: data.checks.map(c => [c.check_type === "verilen" ? "Verilen" : "Alınan", nz(c.check_no), nz(c.bank_name), nz(c.counterparty), money(c.amount), nz(c.due_date), st(c.status)]),
    columnStyles: { 4: { halign: "right" } },
  });

  addPdfFooter(doc);

  doc.save(`Santiyem_Kasa_Raporu_${now.toISOString().slice(0, 10)}.pdf`);
}

// ─── EXCEL ──────────────────────────────────────
export function exportCashExcel(data: CashReportData) {
  const wb = XLSX.utils.book_new();
  const now = new Date();

  // Summary sheet
  const totalBalance = data.accounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalPayments = data.payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollections = data.collections.reduce((s, c) => s + Number(c.amount), 0);

  const summaryData: any[][] = [
    ["Şantiyem — Kasa & Ödeme Raporu"],
    [`Rapor Tarihi: ${now.toLocaleDateString("tr-TR")}`],
    [],
    ["Metrik", "Tutar (₺)"],
    ["Toplam Bakiye", totalBalance],
    ["Toplam Ödemeler", totalPayments],
    ["Toplam Tahsilatlar", totalCollections],
    ["Net Nakit Akışı", totalCollections - totalPayments],
    [],
    ["Hesaplar"],
    ["Hesap Adı", "Tür", "Banka", "IBAN", "Bakiye (₺)"],
    ...data.accounts.map(a => [nz(a.name), a.account_type === "nakit_kasa" ? "Nakit Kasa" : a.account_type === "banka" ? "Banka" : "Kredi Kartı", nz(a.bank_name), nz(a.iban), Number(a.balance)]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  styleExcelHeaderRow(wsSummary, 4, 2);
  styleExcelHeaderRow(wsSummary, 12, 5);
  autoFitColumns(wsSummary, summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Özet");

  // Payments sheet
  const payHeaders = ["Tarih", "Alıcı", "Kategori", "Tutar (₺)", "Ödeme Tipi", "Durum", "Açıklama"];
  const payRowsRaw: any[][] = data.payments.map(p => [nz(p.payment_date), nz(p.recipient), nz(p.category), Number(p.amount), nz(p.payment_type), st(p.status), nz(p.description)]);
  const payAll = [payHeaders, ...payRowsRaw];
  const wsPay = XLSX.utils.aoa_to_sheet(payAll);
  styleExcelHeaderRow(wsPay, 1, payHeaders.length);
  autoFitColumns(wsPay, payAll);
  XLSX.utils.book_append_sheet(wb, wsPay, "Ödemeler");

  // Collections sheet
  const colHeaders = ["Tarih", "Gönderen", "Tür", "Tutar (₺)", "Ödeme Tipi", "Durum", "Açıklama"];
  const colRowsRaw: any[][] = data.collections.map(c => [nz(c.collection_date), nz(c.sender), nz(c.collection_type), Number(c.amount), nz(c.payment_type), st(c.status), nz(c.description)]);
  const colAll = [colHeaders, ...colRowsRaw];
  const wsCol = XLSX.utils.aoa_to_sheet(colAll);
  styleExcelHeaderRow(wsCol, 1, colHeaders.length);
  autoFitColumns(wsCol, colAll);
  XLSX.utils.book_append_sheet(wb, wsCol, "Tahsilatlar");

  // Checks sheet
  const chkHeaders = ["Tür", "Çek No", "Banka", "Karşı Taraf", "Tutar (₺)", "Vade Tarihi", "Durum"];
  const chkRowsRaw: any[][] = data.checks.map(c => [c.check_type === "verilen" ? "Verilen" : "Alınan", nz(c.check_no), nz(c.bank_name), nz(c.counterparty), Number(c.amount), nz(c.due_date), st(c.status)]);
  const chkAll = [chkHeaders, ...chkRowsRaw];
  const wsChk = XLSX.utils.aoa_to_sheet(chkAll);
  styleExcelHeaderRow(wsChk, 1, chkHeaders.length);
  autoFitColumns(wsChk, chkAll);
  XLSX.utils.book_append_sheet(wb, wsChk, "Çekler");

  XLSX.writeFile(wb, `Santiyem_Kasa_Raporu_${now.toISOString().slice(0, 10)}.xlsx`);
}
