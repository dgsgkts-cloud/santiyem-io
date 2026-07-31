// ============================================================
// src/components/voice/VoiceDebugPanel.tsx
// TEMPORARY developer panel (Sprint 32.1).
// Remove before production — gated behind `voice_debug` / DEV.
// ============================================================

import type { VoiceMetrics } from "@/lib/voice/voiceMetrics";
import type { VoiceProviderId, VoiceState } from "@/lib/voice/voiceTypes";

interface Props {
  provider: VoiceProviderId;
  state: VoiceState;
  metrics: VoiceMetrics;
  micLevel: number;
}

function ms(v: number | null) {
  return v == null ? "—" : `${v}ms`;
}

export function VoiceDebugPanel({ provider, state, metrics, micLevel }: Props) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold text-foreground">VOICE DEBUG</span>
        <span>{provider}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3">
        <span>state</span><span className="text-foreground">{state}</span>
        <span>connect</span><span className="text-foreground">{ms(metrics.connectionMs)}</span>
        <span>1st transcript</span><span className="text-foreground">{ms(metrics.firstTranscriptMs)}</span>
        <span>1st token</span><span className="text-foreground">{ms(metrics.firstTokenMs)}</span>
        <span>1st audio</span><span className="text-foreground">{ms(metrics.firstAudioMs)}</span>
        <span>turn latency</span><span className="text-foreground">{ms(metrics.lastTurnMs)}</span>
        <span>reconnects</span><span className="text-foreground">{metrics.reconnects}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span>mic</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-100"
            style={{ width: `${Math.round(micLevel * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
