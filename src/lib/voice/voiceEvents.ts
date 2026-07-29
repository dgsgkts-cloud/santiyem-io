// ============================================================
// src/lib/voice/voiceEvents.ts
// Tiny typed emitter shared by all voice engines.
// ============================================================

import type { VoiceEngineEvents, VoiceEventName } from "./voiceTypes";

type Handler<K extends VoiceEventName> = (payload: VoiceEngineEvents[K]) => void;
type AnyHandler = (payload: never) => void;

export class VoiceEmitter {
  private handlers = new Map<VoiceEventName, Set<AnyHandler>>();

  on<K extends VoiceEventName>(event: K, cb: Handler<K>): () => void {
    let set = this.handlers.get(event);
    if (!set) { set = new Set(); this.handlers.set(event, set); }
    set.add(cb as AnyHandler);
    return () => { set?.delete(cb as AnyHandler); };
  }

  emit<K extends VoiceEventName>(event: K, payload: VoiceEngineEvents[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const cb of Array.from(set) as Handler<K>[]) {
      try { cb(payload); } catch (err) { console.error(`[voice] handler failed for "${event}"`, err); }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
