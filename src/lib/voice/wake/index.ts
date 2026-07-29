export * from "./wakeWordTypes";
export { BaseWakeWordEngine, normalizePhrase } from "./BaseWakeWordEngine";
export { WebSpeechWakeWordEngine } from "./WebSpeechWakeWordEngine";
export {
  createWakeWordEngine,
  isWakeWordProviderImplemented,
  wakeWordSupported,
} from "./WakeWordFactory";
