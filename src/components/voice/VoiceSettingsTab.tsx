// ============================================================
// src/components/voice/VoiceSettingsTab.tsx
// Sesli Asistan — tek davranış, tek ekran. Teknik voice mode
// seçimi (bas-konuş / sürekli dinleme / uyandırma kelimesi)
// kullanıcıya sunulmaz. Mikrofon yalnızca kullanıcı açıkça
// "Mikrofonu Test Et" derse veya sesli görüşme başlarsa açılır.
// ============================================================

import { useEffect, useState } from "react";
import { Check, Loader2, Mic } from "lucide-react";
import { queryMicPermission, type MicPermission } from "@/lib/voice/micPermission";

export function VoiceSettingsTab() {
  const [permission, setPermission] = useState<MicPermission>("prompt");
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // Read-only permission probe — never opens a microphone stream.
  useEffect(() => {
    let alive = true;
    void queryMicPermission().then((p) => { if (alive) setPermission(p); });
    return () => { alive = false; };
  }, []);

  const runTest = async () => {
    setTesting(true);
    setTestError(null);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const track = stream.getAudioTracks()[0];
      setDeviceLabel(track?.label?.trim() || "Varsayılan Mikrofon");
      setPermission("granted");
    } catch {
      setTestError("Mikrofona erişilemedi. Tarayıcı ayarlarından izin verin.");
      setPermission("denied");
    } finally {
      // Session dışında hiçbir track açık kalmaz.
      stream?.getTracks().forEach((t) => t.stop());
      setTesting(false);
    }
  };

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
                {deviceLabel ?? "Varsayılan Mikrofon"}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              permission === "denied" ? "text-amber-500" : "text-emerald-500"
            }`}
          >
            {permission === "granted" && <Check className="h-3.5 w-3.5" />}
            {statusText}
          </span>
        </div>

        <button
          type="button"
          onClick={runTest}
          disabled={testing}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 disabled:opacity-60"
        >
          {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Mikrofonu Test Et
        </button>

        {testError && <p className="mt-2 text-xs text-amber-500">{testError}</p>}
      </div>

      <p className="text-xs text-muted-foreground">
        Mikrofon yalnızca sesli görüşme başlattığınızda kullanılır.
      </p>
    </div>
  );
}

export default VoiceSettingsTab;
