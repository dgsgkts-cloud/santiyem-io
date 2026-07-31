// ============================================================
// src/components/voice/MicPermissionScreen.tsx
// Premium, self-explanatory state screen shown when microphone
// access is denied or blocked. Never shows a raw browser error:
// one clear explanation, retry, and platform-aware settings help.
// ============================================================

import { useMemo, useState } from "react";
import { MicOff, ShieldCheck, Settings2, RotateCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onRetry: () => void;
  onCancel: () => void;
}

/** Browsers cannot open their own permission page; we guide instead. */
function useSettingsSteps() {
  return useMemo(() => {
    const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);

    if (isIOS) {
      return {
        platform: "iPhone / iPad",
        steps: [
          "Ayarlar uygulamasını açın.",
          "Safari → Mikrofon bölümüne gidin.",
          "santiyem.io için “İzin ver” seçeneğini işaretleyin.",
          "Bu ekrana dönüp “Tekrar dene”ye dokunun.",
        ],
      };
    }
    if (isAndroid) {
      return {
        platform: "Android",
        steps: [
          "Adres çubuğundaki kilit simgesine dokunun.",
          "İzinler → Mikrofon adımına gidin.",
          "Mikrofonu “İzin ver” yapın.",
          "Bu ekrana dönüp “Tekrar dene”ye dokunun.",
        ],
      };
    }
    return {
      platform: "Masaüstü tarayıcı",
      steps: [
        "Adres çubuğundaki kilit (veya mikrofon) simgesine tıklayın.",
        "Site ayarlarından Mikrofon iznini “İzin ver” yapın.",
        "Sayfayı yenilemeniz gerekmez; “Tekrar dene”ye tıklayın.",
      ],
    };
  }, []);
}

export function MicPermissionScreen({ onRetry, onCancel }: Props) {
  const { platform, steps } = useSettingsSteps();
  const [showSteps, setShowSteps] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mikrofon izni gerekli"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0B0F14]/95 p-5 backdrop-blur-xl"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 20px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)",
      }}
    >
      <div className="w-full max-w-sm overflow-y-auto rounded-[20px] border border-white/10 bg-card p-6 text-center" style={{ maxHeight: "88dvh" }}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <MicOff className="h-6 w-6 text-destructive" />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Mikrofon izni gerekli
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sesli görüşmeyi kullanabilmek için mikrofon erişimine izin vermelisiniz.
          İzni verdikten sonra hemen devam edebilirsiniz.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-[14px] border border-emerald-500/20 bg-emerald-500/5 p-3 text-left">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Sesiniz yalnızca siz konuşurken işlenir, arka planda kayıt tutulmaz ve izni
            istediğiniz an geri alabilirsiniz.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSteps((v) => !v)}
          aria-expanded={showSteps}
          className="mt-4 flex min-h-[44px] w-full items-center justify-between rounded-[12px] border border-border px-3 text-left text-[13px] font-medium text-foreground"
        >
          <span>İzni nasıl açarım? ({platform})</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition ${showSteps ? "rotate-180" : ""}`} />
        </button>

        {showSteps && (
          <ol className="mt-2 space-y-2 rounded-[12px] bg-muted/40 p-3 text-left text-xs leading-relaxed text-muted-foreground">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-5 space-y-2">
          <Button className="min-h-[48px] w-full" onClick={onRetry}>
            <RotateCw className="mr-2 h-4 w-4" /> Tekrar Dene
          </Button>
          <Button
            variant="secondary"
            className="min-h-[44px] w-full"
            onClick={() => setShowSteps(true)}
          >
            <Settings2 className="mr-2 h-4 w-4" /> Ayarları Aç
          </Button>
          <Button variant="ghost" className="min-h-[44px] w-full" onClick={onCancel}>
            Yazarak Devam Et
          </Button>
          <Button variant="ghost" className="min-h-[44px] w-full" onClick={onCancel}>
            Kapat
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MicPermissionScreen;
