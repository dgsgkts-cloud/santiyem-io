import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, QrCode, RefreshCw, Smartphone, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWhatsAppConnection, type WhatsAppConnectionStatus } from "@/hooks/useWhatsAppConnection";

/**
 * "WhatsApp'ımı Bağla" akışı — kullanıcı hiçbir teknik bilgi girmez.
 * Masaüstünde QR, mobilde telefon numarasıyla eşleştirme kodu önceliklidir.
 */

const STATE: Record<WhatsAppConnectionStatus, { label: string; color: string }> = {
  connected: { label: "Bağlı", color: "#22C55E" },
  connecting: { label: "Bağlanıyor", color: "#EAB308" },
  reconnecting: { label: "Yeniden Bağlanıyor", color: "#F97316" },
  qr_required: { label: "Doğrulama Bekleniyor", color: "#F97316" },
  disconnected: { label: "Bağlantı Kesildi", color: "#EF4444" },
  failed: { label: "Bağlantı Kesildi", color: "#EF4444" },
};

export default function WhatsAppConnectionCard() {
  const isMobile = useIsMobile();
  const { available, connection, isLoading, qr, connect, disconnect, clearQr } = useWhatsAppConnection();
  const [mode, setMode] = useState<"qr" | "pairing">(isMobile ? "pairing" : "qr");
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);

  const status = connection?.status ?? "disconnected";
  const meta = STATE[status];
  const isConnected = status === "connected";
  const waiting = !!qr.image || !!qr.code;

  const start = async (nextMode: "qr" | "pairing") => {
    setMode(nextMode);
    if (nextMode === "pairing" && phone.replace(/\D/g, "").length < 10) {
      toast.error("Ülke koduyla telefon numarası girin (örn. +90 533 ...)");
      return;
    }
    try {
      const res = await connect.mutateAsync(
        nextMode === "pairing" ? { mode: "pairing", phone_number: phone } : { mode: "qr" },
      );
      if (!res.ok) toast.error(res.error || "Bağlantı başlatılamadı");
      else if (!res.qr_base64 && !res.pairing_code)
        toast.info("Bağlantı hazırlanıyor, birkaç saniye içinde kod görünecek.");
    } catch (e) {
      toast.error((e as Error).message || "Bağlantı başlatılamadı");
    }
  };

  const copyCode = async () => {
    if (!qr.code) return;
    try {
      await navigator.clipboard.writeText(qr.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info("Kodu elle yazabilirsiniz.");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-foreground">WhatsApp Hesabınız</div>
          <div className="text-[12.5px] text-muted-foreground">
            {isConnected
              ? `${connection?.connected_number ? `+${connection.connected_number}` : "Numaranız"} üzerinden gönderilir.`
              : "Özetler kendi WhatsApp hesabınızdan gönderilir. İş hesabı gerekmez."}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold shrink-0" style={{ color: meta.color }}>
          <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
          {meta.label}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Durum kontrol ediliyor…
        </div>
      ) : !available ? (
        <p className="text-[12.5px] leading-relaxed text-muted-foreground rounded-lg border border-dashed border-border p-3">
          WhatsApp bağlantı servisi henüz açılmadı. Açıldığında bu ekrandan telefonunuzu
          bağlayıp özetleri otomatik almaya başlayabilirsiniz.
        </p>
      ) : isConnected ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline" size="sm" className="h-10 min-h-[40px] text-[13px] text-rose-500 hover:text-rose-600"
            disabled={disconnect.isPending}
            onClick={async () => {
              if (!window.confirm("WhatsApp bağlantısı kesilecek ve otomatik özetler duracak. Devam edilsin mi?")) return;
              try { await disconnect.mutateAsync(); toast.success("WhatsApp bağlantısı kesildi"); }
              catch (e) { toast.error((e as Error).message); }
            }}
          >
            {disconnect.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5 mr-1.5" />}
            Bağlantıyı Kes
          </Button>
        </div>
      ) : waiting ? (
        <div className="space-y-3">
          {qr.code ? (
            <div className="rounded-[11px] border border-border p-3 space-y-2">
              <div className="text-[12.5px] text-muted-foreground leading-relaxed">
                Telefonunuzda WhatsApp → Ayarlar → Bağlı Cihazlar → Cihaz Bağla →
                “Telefon numarasıyla bağlan” adımında bu kodu girin.
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-center text-[22px] font-bold tracking-[0.35em] text-foreground py-2 rounded-lg bg-muted">
                  {qr.code}
                </div>
                <Button variant="outline" size="sm" className="h-11 min-h-[44px]" onClick={copyCode}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-[11px] border border-border p-3 space-y-2">
              <div className="text-[12.5px] text-muted-foreground leading-relaxed">
                Telefonunuzda WhatsApp → Bağlı Cihazlar → Cihaz Bağla ile bu kodu okutun.
              </div>
              <img
                src={qr.image ?? ""} alt="WhatsApp bağlantı karekodu"
                className="w-full max-w-[240px] mx-auto rounded-lg bg-white p-2"
              />
            </div>
          )}
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Bağlantı bekleniyor…
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-10 min-h-[40px] text-[13px]" disabled={connect.isPending} onClick={() => start(mode)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Yeni Kod Oluştur
            </Button>
            <Button variant="ghost" size="sm" className="h-10 min-h-[40px] text-[13px]" onClick={clearQr}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {mode === "pairing" && (
            <Input
              className="h-11 text-[16px]" inputMode="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 533 377 11 56"
              aria-label="WhatsApp numaranız"
            />
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="flex-1 h-11 text-[13.5px]" disabled={connect.isPending}
              onClick={() => start(isMobile ? "pairing" : "qr")}
            >
              {connect.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : isMobile ? <Smartphone className="w-4 h-4 mr-1.5" /> : <QrCode className="w-4 h-4 mr-1.5" />}
              WhatsApp'ımı Bağla
            </Button>
            <Button
              variant="outline" className="flex-1 h-11 text-[13.5px]" disabled={connect.isPending}
              onClick={() => start(isMobile ? "qr" : "pairing")}
            >
              {isMobile ? "Karekod ile bağlan" : "Telefon numarasıyla bağlan"}
            </Button>
          </div>
          {status === "disconnected" && connection && (
            <p className="text-[12.5px] text-amber-600 leading-relaxed">
              WhatsApp bağlantınızı yeniden doğrulamanız gerekiyor.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
