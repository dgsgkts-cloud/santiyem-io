import { Capacitor } from "@capacitor/core";
import { PushNotifications, type Token } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

let initialized = false;
let currentToken: string | null = null;

/**
 * Initialize push notifications on native platforms.
 * - Requests permission
 * - Registers with APNS/FCM
 * - Saves device token to Supabase
 * Safe to call multiple times; no-op on web.
 */
export async function initPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (initialized) return;
  initialized = true;

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      console.warn("[push] permission not granted");
      return;
    }

    await PushNotifications.removeAllListeners();

    PushNotifications.addListener("registration", async (t: Token) => {
      currentToken = t.value;
      const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
      try {
        await supabase
          .from("device_push_tokens")
          .upsert(
            { user_id: userId, token: t.value, platform, last_seen_at: new Date().toISOString() },
            { onConflict: "user_id,token" }
          );
      } catch (e) {
        console.error("[push] token save failed", e);
      }
    });

    PushNotifications.addListener("registrationError", err => {
      console.error("[push] registration error", err);
    });

    PushNotifications.addListener("pushNotificationReceived", n => {
      console.log("[push] received", n);
    });

    PushNotifications.addListener("pushNotificationActionPerformed", action => {
      const data = action.notification?.data as Record<string, string> | undefined;
      const route = data?.route;
      if (route && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("navigate-tab", { detail: route }));
      }
    });

    await PushNotifications.register();
  } catch (e) {
    console.error("[push] init failed", e);
  }
}

/**
 * Remove the current device token from the database (opt-out).
 */
export async function disablePushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await PushNotifications.removeAllListeners();
    if (currentToken) {
      await supabase
        .from("device_push_tokens")
        .delete()
        .eq("user_id", userId)
        .eq("token", currentToken);
      currentToken = null;
    }
  } catch (e) {
    console.error("[push] disable failed", e);
  }
  initialized = false;
}
