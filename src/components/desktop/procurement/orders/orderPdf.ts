// Satın Alma → Siparişler: purchase order PDF document.
import jsPDF from "jspdf";
import { addPdfFooter, addPdfHeader } from "@/lib/pdfHeader";
import { savePdfDoc } from "@/lib/nativeDownload";
import { fmtDate, fmtMoney, summarizeOrder, type PurchaseOrder } from "./orderModel";

const TR = (s?: string | null) => (s && s.trim() ? s : "—");

export const generateOrderPdf = async (order: PurchaseOrder) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = addPdfHeader(doc, "SATIN ALMA SİPARİŞİ", order.order_no);

  const s = summarizeOrder(order);

  // Supplier & order info block
  doc.setFontSize(9);
  doc.setTextColor(80);
  const left = 15;
  const mid = pw / 2 + 4;

  const rows: [string, string][] = [
    ["Tedarikçi", TR(order.supplier_name)],
    ["Proje", TR(order.project_name)],
    ["Sipariş Tarihi", fmtDate(order.order_date)],
    ["Teslim Tarihi", fmtDate(order.expected_delivery_date)],
  ];
  const rows2: [string, string][] = [
    ["Talep No", TR(order.purchase_request_no)],
    ["Teklif / RFQ", TR(order.rfq_no || order.quotation_ref)],
    ["Ödeme Şartı", TR(order.payment_terms)],
    ["Teslim Adresi", TR(order.delivery_address)],
  ];

  const startY = y;
  rows.forEach(([k, v], i) => {
    doc.setTextColor(120);
    doc.text(`${k}:`, left, startY + i * 5.5);
    doc.setTextColor(40);
    doc.text(doc.splitTextToSize(v, 70), left + 28, startY + i * 5.5);
  });
  rows2.forEach(([k, v], i) => {
    doc.setTextColor(120);
    doc.text(`${k}:`, mid, startY + i * 5.5);
    doc.setTextColor(40);
    doc.text(doc.splitTextToSize(v, 60), mid + 28, startY + i * 5.5);
  });
  y = startY + rows.length * 5.5 + 6;

  // Items table
  doc.setDrawColor(200);
  doc.setFillColor(245, 245, 245);
  doc.rect(left, y, pw - 30, 7, "F");
  doc.setFontSize(8);
  doc.setTextColor(70);
  const cols = [left + 2, left + 12, left + 92, left + 112, left + 140, pw - 17];
  doc.text("#", cols[0], y + 5);
  doc.text("Kalem", cols[1], y + 5);
  doc.text("Miktar", cols[2], y + 5);
  doc.text("Birim Fiyat", cols[3], y + 5);
  doc.text("KDV", cols[4], y + 5);
  doc.text("Tutar", cols[5], y + 5, { align: "right" });
  y += 9;

  order.items.forEach((item, idx) => {
    if (y > 250) {
      addPdfFooter(doc);
      doc.addPage();
      y = 25;
    }
    doc.setTextColor(40);
    doc.text(String(idx + 1), cols[0], y);
    doc.text(doc.splitTextToSize(item.name, 74), cols[1], y);
    doc.text(`${item.quantity} ${item.unit}`, cols[2], y);
    doc.text(fmtMoney(item.unit_price, order.currency), cols[3], y);
    doc.text(`%${item.vat_rate}`, cols[4], y);
    doc.text(
      fmtMoney(item.quantity * item.unit_price, order.currency),
      cols[5],
      y,
      { align: "right" }
    );
    y += Math.max(6, doc.splitTextToSize(item.name, 74).length * 4.4);
  });

  y += 4;
  doc.setDrawColor(210);
  doc.line(pw / 2, y, pw - 15, y);
  y += 6;

  const totals: [string, string][] = [
    ["Ara Toplam", fmtMoney(order.subtotal, order.currency)],
    ["İskonto", fmtMoney(order.discount, order.currency)],
    ["KDV", fmtMoney(order.vat_amount, order.currency)],
    ["GENEL TOPLAM", fmtMoney(order.total, order.currency)],
    ["Ödenen", fmtMoney(s.paid, order.currency)],
    ["Kalan", fmtMoney(s.remaining, order.currency)],
  ];
  totals.forEach(([k, v], i) => {
    const bold = k === "GENEL TOPLAM";
    doc.setFontSize(bold ? 10 : 9);
    doc.setTextColor(bold ? 20 : 100);
    doc.text(k, pw / 2 + 4, y + i * 5.5);
    doc.setTextColor(bold ? 20 : 40);
    doc.text(v, pw - 15, y + i * 5.5, { align: "right" });
  });
  y += totals.length * 5.5 + 8;

  // Payment plan
  if (order.installments.length) {
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text("Ödeme Planı", left, y);
    y += 5;
    doc.setFontSize(8);
    order.installments.forEach((i) => {
      doc.setTextColor(90);
      doc.text(
        `${i.installment_no}. ${i.payment_type} · Vade ${fmtDate(i.due_date)} · ${fmtMoney(
          i.amount,
          order.currency
        )} · ${i.status}`,
        left + 2,
        y
      );
      y += 4.6;
    });
    y += 4;
  }

  // Terms
  doc.setFontSize(8);
  doc.setTextColor(110);
  const terms = [
    "1. Malzemeler siparişte belirtilen özellik ve miktarlarda teslim edilecektir.",
    "2. Sevk irsaliyesi olmadan mal kabulü yapılmaz; eksik/hasarlı kalemler tutanakla iade edilir.",
    "3. Fatura, sipariş numarası referans verilerek düzenlenecektir.",
    "4. Ödemeler yukarıdaki ödeme planına göre yapılır; gecikmeli teslimlerde plan revize edilir.",
  ];
  if (order.notes) terms.push(`5. Not: ${order.notes}`);
  doc.text("Sipariş Şartları", left, y);
  y += 4.5;
  terms.forEach((t) => {
    const lines = doc.splitTextToSize(t, pw - 34);
    doc.text(lines, left + 2, y);
    y += lines.length * 4.2;
  });

  y += 10;
  doc.setTextColor(90);
  doc.text("Sipariş Veren", left + 10, y);
  doc.text("Tedarikçi Onayı", pw - 60, y);
  doc.setDrawColor(180);
  doc.line(left, y - 4, left + 60, y - 4);
  doc.line(pw - 75, y - 4, pw - 15, y - 4);

  addPdfFooter(doc);
  await savePdfDoc(doc, `${order.order_no}-siparis.pdf`);
};
