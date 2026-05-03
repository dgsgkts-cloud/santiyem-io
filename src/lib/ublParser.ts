/**
 * UBL-TR e-Fatura / e-Arşiv XML parser (basit alanlar).
 * GİB UBL 2.1 yapısına göre Invoice/cbc:* elementlerini okur.
 */

export interface ParsedUBLInvoice {
  invoice_no: string;
  invoice_uuid?: string;
  invoice_date: string; // YYYY-MM-DD
  invoice_type: "e_fatura" | "e_arsiv";
  direction: "gelen" | "giden";
  counterparty_name: string;
  counterparty_tax_no?: string;
  description?: string;
  subtotal: number;
  kdv_total: number;
  grand_total: number;
  currency: string;
}

const text = (root: Element | Document, ...paths: string[]): string => {
  for (const p of paths) {
    const el = root.querySelector(p);
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return "";
};

const num = (s: string): number => {
  const v = parseFloat(s.replace(",", "."));
  return isFinite(v) ? v : 0;
};

export function parseUBLInvoice(xmlString: string, ourTaxNo?: string): ParsedUBLInvoice {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("Geçersiz XML dosyası");
  }

  // Profile / type
  const profile = text(doc, "ProfileID", "cbc\\:ProfileID");
  const invoiceTypeCode = text(doc, "InvoiceTypeCode", "cbc\\:InvoiceTypeCode");
  const invoice_type: "e_fatura" | "e_arsiv" =
    profile.toUpperCase().includes("EARSIV") || invoiceTypeCode.toUpperCase() === "SATIS"
      ? "e_arsiv"
      : "e_fatura";

  // Header
  const invoice_no = text(doc, "ID", "cbc\\:ID");
  const invoice_uuid = text(doc, "UUID", "cbc\\:UUID") || undefined;
  const issue_date = text(doc, "IssueDate", "cbc\\:IssueDate");
  const currency =
    text(doc, "DocumentCurrencyCode", "cbc\\:DocumentCurrencyCode") || "TRY";

  // Parties
  const supplier = doc.querySelector("AccountingSupplierParty, cac\\:AccountingSupplierParty");
  const customer = doc.querySelector("AccountingCustomerParty, cac\\:AccountingCustomerParty");

  const partyName = (p: Element | null): string => {
    if (!p) return "";
    return (
      p.querySelector("PartyName Name, cbc\\:Name")?.textContent?.trim() ||
      p.querySelector("PartyLegalEntity RegistrationName, cbc\\:RegistrationName")?.textContent?.trim() ||
      ""
    );
  };
  const partyTax = (p: Element | null): string => {
    if (!p) return "";
    return (
      p.querySelector("PartyTaxScheme CompanyID, cbc\\:CompanyID")?.textContent?.trim() ||
      p.querySelector("PartyIdentification ID, cbc\\:ID")?.textContent?.trim() ||
      ""
    );
  };

  const supplierName = partyName(supplier);
  const supplierTax = partyTax(supplier);
  const customerName = partyName(customer);
  const customerTax = partyTax(customer);

  // Yön: bizim VKN = supplier ise "giden", customer ise "gelen". Bilinmiyorsa default "gelen".
  let direction: "gelen" | "giden" = "gelen";
  if (ourTaxNo && ourTaxNo.trim()) {
    if (supplierTax === ourTaxNo) direction = "giden";
    else if (customerTax === ourTaxNo) direction = "gelen";
  }

  const counterparty_name = direction === "gelen" ? supplierName : customerName;
  const counterparty_tax_no = (direction === "gelen" ? supplierTax : customerTax) || undefined;

  // Totals
  const subtotal = num(text(doc, "LegalMonetaryTotal LineExtensionAmount", "cbc\\:LineExtensionAmount"));
  const kdv_total = num(text(doc, "TaxTotal TaxAmount", "cac\\:TaxTotal cbc\\:TaxAmount"));
  const grand_total = num(text(doc, "LegalMonetaryTotal PayableAmount", "cbc\\:PayableAmount"));

  // Note / description (ilk Note)
  const description = text(doc, "Note", "cbc\\:Note") || undefined;

  return {
    invoice_no,
    invoice_uuid,
    invoice_date: issue_date || new Date().toISOString().slice(0, 10),
    invoice_type,
    direction,
    counterparty_name: counterparty_name || "Bilinmiyor",
    counterparty_tax_no,
    description,
    subtotal,
    kdv_total,
    grand_total,
    currency,
  };
}
