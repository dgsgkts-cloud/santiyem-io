import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import type jsPDF from "jspdf";
import * as XLSX from "xlsx";

const isNative = () => Capacitor.isNativePlatform();

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk))
    );
  }
  return btoa(binary);
};

const showDownloadingToast = () => {
  const id = toast.loading("İndiriliyor...");
  setTimeout(() => toast.dismiss(id), 3000);
  return id;
};

async function shareNative(base64: string, fileName: string, mime: string) {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");

  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  });

  try {
    await Share.share({
      title: fileName,
      text: fileName,
      url: result.uri,
      dialogTitle: "Dosyayı kaydet veya paylaş",
    });
    toast.success("Dosya hazır! Kaydetmek veya paylaşmak için seçin.");
  } catch (err: any) {
    // user cancelled share – still saved in cache
    if (String(err?.message || "").toLowerCase().includes("cancel")) return;
    throw err;
  }
}

export async function savePdfDoc(doc: jsPDF, fileName: string) {
  showDownloadingToast();
  try {
    if (isNative()) {
      const ab = doc.output("arraybuffer");
      const base64 = arrayBufferToBase64(ab);
      await shareNative(base64, fileName, "application/pdf");
    } else {
      doc.save(fileName);
    }
  } catch (err) {
    console.error("[savePdfDoc] failed", err);
    toast.error("Dosya oluşturulamadı, tekrar deneyin");
  }
}

export async function saveXlsxWorkbook(wb: XLSX.WorkBook, fileName: string) {
  showDownloadingToast();
  try {
    if (isNative()) {
      const ab: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const base64 = arrayBufferToBase64(ab);
      await shareNative(
        base64,
        fileName,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    } else {
      XLSX.writeFile(wb, fileName);
    }
  } catch (err) {
    console.error("[saveXlsxWorkbook] failed", err);
    toast.error("Dosya oluşturulamadı, tekrar deneyin");
  }
}

export async function saveBlob(blob: Blob, fileName: string) {
  showDownloadingToast();
  try {
    if (isNative()) {
      const ab = await blob.arrayBuffer();
      const base64 = arrayBufferToBase64(ab);
      await shareNative(base64, fileName, blob.type || "application/octet-stream");
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error("[saveBlob] failed", err);
    toast.error("Dosya oluşturulamadı, tekrar deneyin");
  }
}
