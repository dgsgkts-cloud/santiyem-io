// ============================================================
// src/lib/voice/voiceEvents.ts
// Tiny typed emitter shared by all voice engines.
// ============================================================

import type { VoiceEngineEvents, VoiceEventName } from "./voiceTypes";

type Handler<K extends VoiceEventName> = (payload: VoiceEngineEvents[K]) => void;

export class VoiceEmitter {
  private handlers: { [K in VoiceEventName]?: Set<Handler<K>> } = {};

  on<K extends VoiceEventName>(event: K, cb: Handler<K>): () => void {
    const set = (this.handlers[event] ??= new Set()) as Set<Handler<K>>;
    set.add(cb);
    return () => { set.delete(cb); };
  }

  emit<K extends VoiceEventName>(event: K, payload: VoiceEngineEvents[K]): void {
    const set = this.handlers[event] as Set<Handler<K>> | undefined;
    if (!set) return;
    for (const cb of Array.from(set)) {
      try { cb(payload); } catch (err) { console.error(`[voice] handler failed for "${event}"`, err); }
    }
  }

  clear(): void {
    this.handlers = {};
  }
}
