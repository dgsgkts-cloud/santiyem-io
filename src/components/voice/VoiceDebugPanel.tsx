// ============================================================
// src/components/voice/VoiceDebugPanel.tsx
// TEMPORARY developer panel (Sprint 32.1).
// Developer-only — gated behind `voice_debug` / DEV. Shows the resolved
// Realtime model and transport diagnostics. Never shows secrets and is
// never rendered in the customer-facing voice interface.
// ============================================================

import { useEffect, useState } from "react";
import type { VoiceMetrics } from "@/lib/voice/voiceMetrics";
import type { VoiceProviderId, VoiceState } from "@/lib/voice/voiceTypes";
import {
  subscribeVoiceDiagnostics,
  type VoiceDiagnostics,
} from "@/lib/voice/voiceDiagnostics";

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
  const [diag, setDiag] = useState<VoiceDiagnostics | null>(null);
  useEffect(() => subscribeVoiceDiagnostics(setDiag), []);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold text-foreground">VOICE DEBUG</span>
        <span>{provider}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3">
        <span>Realtime model</span>
        <span className="text-foreground">
          {diag?.model ?? "—"}
          {diag?.modelSource ? ` (${diag.modelSource})` : ""}
        </span>
        <span>connection</span><span className="text-foreground">{diag?.connectionMethod ?? "—"}</span>
        <span>state</span><span className="text-foreground">{state}</span>
        <span>session state</span><span className="text-foreground">{diag?.sessionState ?? "—"}</span>
        <span>data channel</span><span className="text-foreground">{diag?.dataChannelState ?? "—"}</span>
        <span>last error</span><span className="text-foreground">{diag?.lastErrorCode ?? "—"}</span>
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
