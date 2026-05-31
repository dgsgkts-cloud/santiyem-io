import { Capacitor } from "@capacitor/core";

/**
 * True when running inside Capacitor native shell (iOS/Android).
 * Used to hide in-app payment/upgrade CTAs (Apple/Google IAP rules).
 */
export const isNativeApp = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Plain informational text shown to native users when their subscription
 * is not active. MUST NOT be a button, link or clickable element — Apple
 * does not allow in-app links to external payment outside the US.
 */
export const NATIVE_SUB_NOTICE =
  "Aboneliğiniz aktif değil. Hesabınızı yönetmek için santiyem.io adresini ziyaret edin.";
