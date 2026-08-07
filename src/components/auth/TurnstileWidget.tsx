// ============================================================
// src/components/auth/TurnstileWidget.tsx
// Cloudflare Turnstile widget (managed challenge) for auth forms.
// Secret key is NEVER referenced here — server-side verification is
// handled by Supabase Auth's native CAPTCHA protection.
// ============================================================

import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from "react";

const SITE_KEY = "0x4AAAAAAEJRniijjbpUS9WE";
const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("load")), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load"));
    document.head.appendChild(s);
  });
}

export type TurnstileHandle = {
  /** Clears the current token and asks Cloudflare for a fresh challenge. */
  reset: () => void;
};

type Props = {
  /** Called with a fresh token, or null when it expires / errors out. */
  onToken: (token: string | null) => void;
  /** Non-technical error notice (expired, network, challenge failure). */
  onError?: () => void;
  className?: string;
};

export const TurnstileWidget = forwardRef<TurnstileHandle, Props>(
  ({ onToken, onError, className }, ref) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onTokenRef = useRef(onToken);
    const onErrorRef = useRef(onError);

    onTokenRef.current = onToken;
    onErrorRef.current = onError;

    useImperativeHandle(ref, () => ({
      reset: () => {
        onTokenRef.current(null);
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch {
            /* widget already gone — nothing to reset */
          }
        }
      },
    }));

    const mount = useCallback(() => {
      if (!hostRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(hostRef.current, {
        sitekey: SITE_KEY,
        action: "turnstile-spin-v2",
        theme: "dark",
        appearance: "always",
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => {
          onTokenRef.current(null);
          onErrorRef.current?.();
        },
        "timeout-callback": () => onTokenRef.current(null),
        "error-callback": () => {
          onTokenRef.current(null);
          onErrorRef.current?.();
        },
      });
    }, []);

    useEffect(() => {
      let cancelled = false;
      loadScript()
        .then(() => {
          if (!cancelled) mount();
        })
        .catch(() => {
          if (!cancelled) onErrorRef.current?.();
        });

      return () => {
        cancelled = true;
        if (window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            /* ignore */
          }
        }
        widgetIdRef.current = null;
      };
    }, [mount]);

    return (
      <div
        ref={hostRef}
        className={className}
        data-action="turnstile-spin-v2"
        aria-label="Güvenlik doğrulaması"
      />
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";

export default TurnstileWidget;
