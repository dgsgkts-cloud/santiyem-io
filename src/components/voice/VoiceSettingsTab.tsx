// ============================================================
// src/components/voice/VoiceSettingsTab.tsx
// Sesli Asistan — tek davranış, tek ekran. Teknik voice mode
// seçimi (bas-konuş / sürekli dinleme / uyandırma kelimesi)
// kullanıcıya sunulmaz. Mikrofon yalnızca kullanıcı açıkça
// açılır: mikrofon YALNIZCA sesli görüşme başlatıldığında açılır.
// Bu ekran mikrofon durumunu sadece Permissions API üzerinden okur.
// ============================================================

import { useEffect, useState } from "react";
import { Check, Mic } from "lucide-react";
import { queryMicPermission, type MicPermission } from "@/lib/voice/micPermission";

export function VoiceSettingsTab() {
  const [permission, setPermission] = useState<MicPermission>("prompt");

  // Read-only permission probe — never opens a microphone stream.
  useEffect(() => {
    let alive = true;
    void queryMicPermission().then((p) => { if (alive) setPermission(p); });
    return () => { alive = false; };
  }, []);

  const statusText =
    permission === "granted" ? "Hazır" : permission === "denied" ? "İzin verilmedi" : "İzin görüşme başlarken istenir";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Sesli Asistan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sesli görüşmelerinizde kullanılacak ses ve mikrofon tercihlerini yönetin.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Mic className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Mikrofon</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Varsayılan Mikrofon
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              permission === "granted"
                ? "text-emerald-500"
                : permission === "denied"
                  ? "text-amber-500"
                  : "text-muted-foreground"
            }`}
          >
            {permission === "granted" && <Check className="h-3.5 w-3.5" />}
            {statusText}
          </span>
        </div>

      </div>

      <p className="text-xs text-muted-foreground">
        {permission === "denied"
          ? "Mikrofon izni tarayıcı ayarlarından açılmalıdır. Bu ekran izin isteğinde bulunmaz."
          : "Mikrofon yalnızca sesli görüşme başlattığınızda açılır."}
      </p>
    </div>
  );
}

export default VoiceSettingsTab;
