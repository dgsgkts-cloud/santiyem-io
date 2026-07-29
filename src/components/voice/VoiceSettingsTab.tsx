// ============================================================
// src/components/voice/VoiceSettingsTab.tsx
// Sprint 32.2 — "AI Sesi" settings surface.
// Purely client-side preferences (localStorage), no schema impact.
// ============================================================

import { Mic, Radio, MessageSquare, ShieldCheck, BatteryMedium } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useVoiceSettings } from "@/hooks/useVoiceSettings";
import { DEFAULT_WAKE_WORD, type VoiceMode } from "@/lib/voice/voiceSettings";
import { wakeWordSupported } from "@/lib/voice/wake";

const MODES: {
  id: VoiceMode;
  label: string;
  desc: string;
  icon: typeof Mic;
  battery: string;
  batteryTone: string;
}[] = [
  {
    id: "push-to-talk",
    label: "Bas Konuş",
    desc: "Mikrofon yalnızca butona dokunduğunuzda açılır. Varsayılan ve en gizli seçenek.",
    icon: Mic,
    battery: "Çok düşük pil kullanımı",
    batteryTone: "text-emerald-500",
  },
  {
    id: "always-listening",
    label: "Sürekli Dinleme",
    desc: "Uygulama açıkken uyandırma kelimesini bekler. Eller serbest çalışma için idealdir.",
    icon: Radio,
    battery: "Daha yüksek pil kullanımı",
    batteryTone: "text-amber-500",
  },
];

export function VoiceSettingsTab() {
  const { settings, update } = useVoiceSettings();
  const supported = wakeWordSupported();
  const alwaysListening = settings.mode === "always-listening";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">AI Sesi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Şantiyem AI ile nasıl konuşacağınızı seçin. Tercihleriniz yalnızca bu cihazda saklanır.
        </p>
      </div>

      {/* Mode selection */}
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = settings.mode === m.id;
          const disabled = m.id === "always-listening" && !supported;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => update({ mode: m.id })}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active
                  ? "border-primary/60 bg-primary/5"
                  : "border-border bg-card hover:border-primary/30"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-semibold text-foreground">{m.label}</span>
                {active && (
                  <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Aktif
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{m.desc}</p>
              <p className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium ${m.batteryTone}`}>
                <BatteryMedium className="h-3.5 w-3.5" /> {m.battery}
              </p>
              {disabled && (
                <p className="mt-2 text-[11px] text-amber-500">
                  Bu tarayıcı sürekli dinlemeyi desteklemiyor.
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Wake word */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Uyandırma Kelimesi</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Sürekli dinleme açıkken bu kelimeyi söyleyerek konuşmayı başlatırsınız.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <Mic className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-medium text-foreground">"{settings.wakeWord}"</span>
        </div>
        {settings.wakeWord !== DEFAULT_WAKE_WORD && (
          <button
            type="button"
            onClick={() => update({ wakeWord: DEFAULT_WAKE_WORD })}
            className="ml-3 text-xs text-primary hover:underline"
          >
            Varsayılana dön
          </button>
        )}
      </div>

      {/* Conversation mode */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Sohbet Modu</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Açıkken uyandırma kelimesini bir kez söylemeniz yeterlidir; konuşma sessizlik
            oluşana kadar devam eder. Kapalıyken her istek için tekrar uyandırmanız gerekir.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-500">
            <BatteryMedium className="h-3.5 w-3.5" /> Oturum süresini uzatabilir
          </p>
        </div>
        <Switch
          checked={settings.conversationMode}
          onCheckedChange={(v) => update({ conversationMode: v })}
          disabled={!alwaysListening}
          aria-label="Sohbet Modu"
        />
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Uyandırma kelimesi tamamen cihazınızda algılanır; kelime duyulmadan hiçbir ses
          kaydedilmez veya sunucuya gönderilmez. Yazı yazarken, sekme arka plana alındığında
          veya bir pencere açıkken dinleme otomatik olarak duraklatılır.
        </p>
      </div>
    </div>
  );
}

export default VoiceSettingsTab;
