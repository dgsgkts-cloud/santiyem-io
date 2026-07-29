// ============================================================
// src/components/voice/AlwaysListeningOnboarding.tsx
// Sprint 32.3 — one-time explainer shown the first time a user
// enables Always Listening. Stored locally, never shown twice.
// ============================================================

import { Radio, ShieldCheck, BatteryMedium, AppWindow } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "santiyem_voice_always_listening_onboarded";

export function alwaysListeningOnboardingSeen(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return true; }
}

export function markAlwaysListeningOnboarded(): void {
  try { localStorage.setItem(KEY, "1"); } catch { /* noop */ }
}

interface Props {
  wakeWord: string;
  onDone: () => void;
  onCancel: () => void;
}

export function AlwaysListeningOnboarding({ wakeWord, onDone, onCancel }: Props) {
  const items = [
    {
      icon: Radio,
      title: "Uyandırma kelimesi",
      desc: `"${wakeWord}" dediğinizde konuşma otomatik başlar. Başka hiçbir kelime oturum açmaz.`,
    },
    {
      icon: ShieldCheck,
      title: "Gizlilik",
      desc: "Uyandırma kelimesi cihazınızda algılanır. Kelime duyulmadan hiçbir ses kaydedilmez veya gönderilmez.",
    },
    {
      icon: BatteryMedium,
      title: "Pil kullanımı",
      desc: "Sürekli dinleme, Bas Konuş moduna göre daha fazla pil harcar.",
    },
    {
      icon: AppWindow,
      title: "Yalnızca ön planda",
      desc: "Uygulama arka plana alındığında, yazı yazarken veya bir pencere açıkken dinleme duraklar.",
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-6 backdrop-blur-xl">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Sürekli Dinleme</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Başlamadan önce bilmeniz gereken dört şey.
        </p>

        <div className="mt-4 space-y-3">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>Vazgeç</Button>
          <Button className="flex-1" onClick={() => { markAlwaysListeningOnboarded(); onDone(); }}>
            Anladım, başlat
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AlwaysListeningOnboarding;
