/**
 * Prod-safe logger. `debug` and `log` sadece geliştirme ortamında çalışır.
 * `warn` ve `error` her ortamda çalışır (Sentry vb. entegrasyona hazır).
 *
 * Kullanım:
 *   import { logger } from "@/lib/logger";
 *   logger.debug("[voice] connected", info);
 *   logger.error("upload failed", err);
 */
const isDev = typeof import.meta !== "undefined" && (import.meta as any).env?.DEV === true;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};

export default logger;
