// ============================================================
// src/components/voice/MicPermissionScreen.tsx
// Sprint 32.3 — premium explanation when microphone access is
// blocked. Never shows a raw browser or technical error.
// ============================================================

import { Mic, ShieldCheck, Settings2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onRetry: () => void;
  onCancel: () => void;
}

/** Browsers cannot open their own settings page; we guide instead. */
function openSettingsHelp() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const msg = isIOS
    ? "Ayarlar → Safari → Mikrofon bölümünden Şantiyem'e izin verin."
    : "Adres çubuğundaki kilit simgesine dokunup Mikrofon iznini 'İzin ver' yapın.";
  alert(msg);
}

export function MicPermissionScreen({ onRetry, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6 backdrop-blur-xl">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mic className="h-6 w-6 text-primary" />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Mikrofon erişimi kapalı
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Şantiyem AI ile konuşabilmek için mikrofona ihtiyacımız var. Sesiniz yalnızca
          siz konuşurken işlenir; arka planda hiçbir kayıt tutulmaz.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-left">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            İzni istediğiniz an geri alabilirsiniz. Sesli mod kapalıyken mikrofon
            tamamen serbest bırakılır.
          </p>
        </div>

        <div className="mt-5 space-y-2">
          <Button className="w-full" onClick={onRetry}>
            <RotateCw className="mr-2 h-4 w-4" /> Tekrar dene
          </Button>
          <Button variant="secondary" className="w-full" onClick={openSettingsHelp}>
            <Settings2 className="mr-2 h-4 w-4" /> Ayarları aç
          </Button>
          <Button variant="ghost" className="w-full" onClick={onCancel}>
            Vazgeç
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MicPermissionScreen;
