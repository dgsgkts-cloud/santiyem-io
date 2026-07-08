import { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Printer, QrCode, RefreshCw } from "lucide-react";
import { useWorkerAttendance } from "@/hooks/useWorkerAttendance";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ResponsiveSheet } from "@/components/ui/responsive";

interface QrCodeModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

const QrCodeModal = ({ projectId, projectName, onClose }: QrCodeModalProps) => {
  const { qrCode, loading, createQrCode } = useWorkerAttendance(projectId);
  const qrRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const baseUrl = window.location.origin;
  const qrUrl = qrCode ? `${baseUrl}/santiye-giris/${qrCode.token}` : "";

  const handleCreate = async () => {
    setGenerating(true);
    await createQrCode();
    setGenerating(false);
  };

  const downloadPng = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${projectName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const downloadPoster = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 800;
    canvas.height = 1130;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 800, 1130);
    const grad = ctx.createLinearGradient(0, 0, 800, 0);
    grad.addColorStop(0, "#F97316");
    grad.addColorStop(1, "#EA580C");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 120);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🏗️ ŞANTİYE GİRİŞ NOKTASI", 400, 75);
    ctx.fillStyle = "#1F2937";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(projectName, 400, 180);
    const qrCanvas = qrRef.current?.querySelector("canvas");
    if (qrCanvas) ctx.drawImage(qrCanvas, 150, 220, 500, 500);
    ctx.fillStyle = "#4B5563";
    ctx.font = "22px sans-serif";
    ctx.fillText("Telefonunuzun kamerasıyla QR kodu okutun", 400, 780);
    ctx.fillText("ve giriş/çıkış kaydınızı oluşturun.", 400, 815);
    ctx.fillStyle = "#F3F4F6";
    ctx.fillRect(0, 1030, 800, 100);
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "16px sans-serif";
    ctx.fillText("Şantiyem — Dijital Şantiye Yönetimi", 400, 1070);
    ctx.fillText(
      qrCode ? `Geçerlilik: ${format(new Date(qrCode.expires_at), "d MMMM yyyy", { locale: tr })}` : "",
      400,
      1095,
    );
    const link = document.createElement("a");
    link.download = `poster-${projectName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <ResponsiveSheet
      open
      onOpenChange={(v) => !v && onClose()}
      size="md"
      title={
        <span className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" /> QR Giriş Kodu
        </span>
      }
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-t-primary border-muted rounded-full animate-spin" />
        </div>
      ) : !qrCode ? (
        <div className="text-center py-8">
          <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-fs-sm text-muted-foreground mb-4">Bu proje için henüz QR kod oluşturulmamış.</p>
          <button
            onClick={handleCreate}
            disabled={generating}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-fs-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {generating ? "Oluşturuluyor..." : "QR Kod Oluştur"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-fs-sm text-muted-foreground mb-1">{projectName}</p>
            <div ref={qrRef} className="bg-white p-6 rounded-xl inline-block">
              <QRCodeCanvas value={qrUrl} size={250} level="H" includeMargin />
            </div>
            <p className="text-fs-xs text-muted-foreground mt-2">
              Geçerlilik: {format(new Date(qrCode.expires_at), "d MMMM yyyy", { locale: tr })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={downloadPng}
              className="flex items-center justify-center gap-2 bg-muted text-foreground px-4 py-2.5 rounded-xl text-fs-sm font-medium hover:bg-muted/80"
            >
              <Download className="w-4 h-4" /> PNG İndir
            </button>
            <button
              onClick={downloadPoster}
              className="flex items-center justify-center gap-2 bg-muted text-foreground px-4 py-2.5 rounded-xl text-fs-sm font-medium hover:bg-muted/80"
            >
              <Printer className="w-4 h-4" /> Poster İndir
            </button>
          </div>

          <button
            onClick={handleCreate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 text-fs-sm text-muted-foreground hover:text-foreground py-2 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" /> Yeni QR Kod Oluştur (mevcut geçersiz olur)
          </button>
        </div>
      )}
    </ResponsiveSheet>
  );
};

export default QrCodeModal;
