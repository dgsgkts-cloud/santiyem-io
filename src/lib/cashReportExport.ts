import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { robotoBase64 } from "@/lib/robotoFont";
import type { CashPayment } from "@/hooks/useCashPayments";
import type { CashCollection } from "@/hooks/useCashCollections";
import type { CashCheck } from "@/hooks/useCashChecks";
import type { CashAccount } from "@/hooks/useCashAccounts";
import { addPdfHeader, addPdfFooter } from "@/lib/pdfHeader";

import { formatNumber2 as fmt, formatCurrencyFull as money } from "@/lib/formatCurrency";

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
export function exportCashPDF(data: CashReportData) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.addFileToVFS("Roboto-Regular.ttf", robotoBase64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.setFont("Roboto");

  const now = new Date();
  const dateStr = now.toLocaleDateString("tr-TR");
  const pw = doc.internal.pageSize.getWidth();

  // ── Header
  doc.setFillColor(15, 20, 25);
  doc.rect(0, 0, pw, 28, "F");
  doc.setFontSize(16);
  doc.setTextColor(255, 107, 43);
  doc.text("Şantiyem — Kasa & Ödeme Raporu", 14, 14);
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Rapor Tarihi: ${dateStr}`, 14, 22);

  // ── Summary
  const totalBalance = data.accounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalPayments = data.payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCollections = data.collections.reduce((s, c) => s + Number(c.amount), 0);

  doc.setFontSize(10);
  doc.setTextColor(241, 245, 249);
  let y = 36;
  doc.text(`Toplam Bakiye: ₺${fmt(totalBalance)}    |    Toplam Ödemeler: ₺${fmt(totalPayments)}    |    Toplam Tahsilatlar: ₺${fmt(totalCollections)}    |    Net: ₺${fmt(totalCollections - totalPayments)}`, 14, y);
  y += 10;

  // ── Accounts
  doc.setFontSize(12);
  doc.setTextColor(255, 107, 43);
  doc.text("Hesaplar", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Hesap Adı", "Tür", "Banka", "IBAN", "Bakiye"]],
    body: data.accounts.map(a => [a.name, a.account_type === "nakit_kasa" ? "Nakit Kasa" : a.account_type === "banka" ? "Banka" : "Kredi Kartı", a.bank_name || "-", a.iban || "-", `₺${fmt(a.balance)}`]),
    styles: { font: "Roboto", fontSize: 8, textColor: [241, 245, 249], fillColor: [26, 32, 40] },
    headStyles: { fillColor: [255, 107, 43], textColor: [255, 255, 255], fontSize: 8 },
    alternateRowStyles: { fillColor: [22, 28, 35] },
    margin: { left: 14, right: 14 },
  });

  // ── Payments
  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 170) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setTextColor(255, 107, 43);
  doc.text("Ödemeler", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Tarih", "Alıcı", "Kategori", "Tutar", "Ödeme Tipi", "Durum"]],
    body: data.payments.map(p => [p.payment_date, p.recipient, p.category, `₺${fmt(p.amount)}`, p.payment_type, st(p.status)]),
    styles: { font: "Roboto", fontSize: 8, textColor: [241, 245, 249], fillColor: [26, 32, 40] },
    headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontSize: 8 },
    alternateRowStyles: { fillColor: [22, 28, 35] },
    margin: { left: 14, right: 14 },
  });

  // ── Collections
  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 170) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setTextColor(255, 107, 43);
  doc.text("Tahsilatlar", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Tarih", "Gönderen", "Tür", "Tutar", "Ödeme Tipi", "Durum"]],
    body: data.collections.map(c => [c.collection_date, c.sender, c.collection_type, `₺${fmt(c.amount)}`, c.payment_type, st(c.status)]),
    styles: { font: "Roboto", fontSize: 8, textColor: [241, 245, 249], fillColor: [26, 32, 40] },
    headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontSize: 8 },
    alternateRowStyles: { fillColor: [22, 28, 35] },
    margin: { left: 14, right: 14 },
  });

  // ── Checks
  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 170) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setTextColor(255, 107, 43);
  doc.text("Çekler", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Tür", "Çek No", "Banka", "Karşı Taraf", "Tutar", "Vade", "Durum"]],
    body: data.checks.map(c => [c.check_type === "verilen" ? "Verilen" : "Alınan", c.check_no, c.bank_name, c.counterparty, `₺${fmt(c.amount)}`, c.due_date, st(c.status)]),
    styles: { font: "Roboto", fontSize: 8, textColor: [241, 245, 249], fillColor: [26, 32, 40] },
    headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontSize: 8 },
    alternateRowStyles: { fillColor: [22, 28, 35] },
    margin: { left: 14, right: 14 },
  });

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Şantiyem — Kasa Raporu — ${dateStr} — Sayfa ${i}/${totalPages}`, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
  }

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

  const summaryData = [
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
    ...data.accounts.map(a => [a.name, a.account_type === "nakit_kasa" ? "Nakit Kasa" : a.account_type === "banka" ? "Banka" : "Kredi Kartı", a.bank_name || "", a.iban || "", Number(a.balance)]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Özet");

  // Payments sheet
  const payHeaders = ["Tarih", "Alıcı", "Kategori", "Tutar (₺)", "Ödeme Tipi", "Durum", "Açıklama"];
  const payRows = data.payments.map(p => [p.payment_date, p.recipient, p.category, Number(p.amount), p.payment_type, st(p.status), p.description || ""]);
  const wsPay = XLSX.utils.aoa_to_sheet([payHeaders, ...payRows]);
  wsPay["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsPay, "Ödemeler");

  // Collections sheet
  const colHeaders = ["Tarih", "Gönderen", "Tür", "Tutar (₺)", "Ödeme Tipi", "Durum", "Açıklama"];
  const colRows = data.collections.map(c => [c.collection_date, c.sender, c.collection_type, Number(c.amount), c.payment_type, st(c.status), c.description || ""]);
  const wsCol = XLSX.utils.aoa_to_sheet([colHeaders, ...colRows]);
  wsCol["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsCol, "Tahsilatlar");

  // Checks sheet
  const chkHeaders = ["Tür", "Çek No", "Banka", "Karşı Taraf", "Tutar (₺)", "Vade Tarihi", "Durum"];
  const chkRows = data.checks.map(c => [c.check_type === "verilen" ? "Verilen" : "Alınan", c.check_no, c.bank_name, c.counterparty, Number(c.amount), c.due_date, st(c.status)]);
  const wsChk = XLSX.utils.aoa_to_sheet([chkHeaders, ...chkRows]);
  wsChk["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsChk, "Çekler");

  XLSX.writeFile(wb, `Santiyem_Kasa_Raporu_${now.toISOString().slice(0, 10)}.xlsx`);
}
