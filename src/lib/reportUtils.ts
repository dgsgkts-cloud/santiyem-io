/**
 * Merkezî rapor yardımcıları — tüm modüllerin PDF & Excel çıktıları
 * bu dosyadaki yardımcılar üzerinden Türkçe-uyumlu, tutarlı stille üretilir.
 *
 * Kullanım:
 *   const doc = createPdfDoc();                       // Roboto yüklenmiş jsPDF
 *   let y = addPdfHeader(doc, "Başlık");              // mevcut header'ı kullan
 *   autoTable(doc, { ...defaultTableTheme(), head, body });
 *   addPdfFooter(doc);
 *
 *   const ws = aoaToSheetStyled(rows, { headerRowIndex });
 *   autoFitColumns(ws, rows);
 */
import jsPDF from "jspdf";
import type { UserOptions } from "jspdf-autotable";
import * as XLSX from "xlsx";
import { robotoBase64 } from "@/lib/robotoFont";

export const EMPTY_CELL = "—";

/** null / undefined / "" değerleri "—" olarak normalize eder. */
export function nz(v: unknown): string {
  if (v === null || v === undefined) return EMPTY_CELL;
  const s = typeof v === "string" ? v : String(v);
  return s.trim() === "" ? EMPTY_CELL : s;
}

/** Türkçe karakter destekli yeni bir jsPDF örneği oluşturur. */
export function createPdfDoc(options?: {
  orientation?: "portrait" | "landscape";
  format?: string | number[];
}): jsPDF {
  const doc = new jsPDF({
    orientation: options?.orientation || "portrait",
    unit: "mm",
    format: options?.format || "a4",
  });
  if (robotoBase64) {
    try {
      doc.addFileToVFS("Roboto-Regular.ttf", robotoBase64);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.addFont("Roboto-Regular.ttf", "Roboto", "bold");
      doc.setFont("Roboto", "normal");
    } catch {
      /* ignore — fallback to default */
    }
  }
  return doc;
}

/** Tüm autoTable çağrılarında ortak stil — Roboto font, koyu header, vs. */
export function defaultTableTheme(extra?: Partial<UserOptions>): UserOptions {
  return {
    styles: {
      font: "Roboto",
      fontSize: 8.5,
      cellPadding: 2.5,
      overflow: "linebreak",
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      textColor: [40, 40, 40],
    },
    headStyles: {
      font: "Roboto",
      fillColor: [33, 41, 52],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      fontSize: 8.5,
      cellPadding: 2.5,
    },
    bodyStyles: { font: "Roboto" },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 15, right: 15 },
    tableWidth: "auto",
    didParseCell: (data) => {
      // Boş hücreleri "—" olarak göster
      if (data.section === "body") {
        const raw = data.cell.raw;
        const txt =
          raw === null || raw === undefined
            ? ""
            : typeof raw === "object"
              ? (raw as any).content ?? ""
              : String(raw);
        if (txt.trim() === "") {
          data.cell.text = [EMPTY_CELL];
        }
      }
    },
    ...extra,
  };
}

// ─────────────────────────── EXCEL ───────────────────────────

/** Satırlardaki en uzun stringe göre sütun genişliklerini hesaplar. */
export function autoFitColumns(ws: XLSX.WorkSheet, rows: any[][], opts?: { min?: number; max?: number; padding?: number }) {
  const min = opts?.min ?? 8;
  const max = opts?.max ?? 48;
  const pad = opts?.padding ?? 2;
  if (!rows.length) return;
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const widths: { wch: number }[] = [];
  for (let c = 0; c < cols; c++) {
    let w = min;
    for (const r of rows) {
      const cell = r[c];
      if (cell === undefined || cell === null) continue;
      let s: string;
      if (typeof cell === "object" && (cell as any).f) s = String((cell as any).v ?? "");
      else if (typeof cell === "number") s = cell.toLocaleString("tr-TR");
      else s = String(cell);
      // Türkçe karakterler için biraz extra
      const len = Array.from(s).length + pad;
      if (len > w) w = len;
    }
    widths.push({ wch: Math.min(max, w) });
  }
  ws["!cols"] = widths;
}

/** Boş ("", null, undefined) hücreleri "—" ile dolduran kopya döner. */
export function fillEmpty(rows: any[][]): any[][] {
  return rows.map((r) =>
    r.map((c) => {
      if (c === null || c === undefined) return EMPTY_CELL;
      if (typeof c === "string" && c.trim() === "") return EMPTY_CELL;
      return c;
    }),
  );
}

/** Bir worksheet'in header satırına kalın/renkli stil uygular. */
export function styleExcelHeaderRow(
  ws: XLSX.WorkSheet,
  rowIndex1: number,
  colCount: number,
  opts?: { fillRgb?: string; textRgb?: string },
) {
  const fill = opts?.fillRgb || "212934";
  const color = opts?.textRgb || "FFFFFF";
  for (let c = 0; c < colCount; c++) {
    const ref = XLSX.utils.encode_cell({ r: rowIndex1 - 1, c });
    if (!ws[ref]) ws[ref] = { v: "", t: "s" };
    (ws[ref] as any).s = {
      font: { bold: true, color: { rgb: color }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: fill } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
    };
  }
}
