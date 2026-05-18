import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { toast } from "sonner";
import { cleanupIyzicoOverlay } from "./iyzicoCleanup";

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Opens iyzico checkout. On native (Capacitor) opens the hosted paymentPageUrl
 * in the system browser. On web, embeds checkoutFormContent as before.
 *
 * Returns true if handled natively (caller should not embed the form).
 */
export async function openIyzicoCheckoutNative(data: {
  paymentPageUrl?: string;
  token?: string;
}): Promise<boolean> {
  if (!isNativePlatform()) return false;

  const url =
    data.paymentPageUrl ||
    (data.token ? `https://sandbox-cpp.iyzipay.com/?token=${data.token}` : null);

  if (!url) {
    toast.error("Ödeme sayfası açılamadı");
    return true;
  }

  try {
    cleanupIyzicoOverlay();
    await Browser.open({ url, presentationStyle: "fullscreen" });
  } catch (err) {
    console.error("[iyzico/native] Browser.open failed", err);
    toast.error("Ödeme sayfası açılamadı, lütfen tekrar deneyin");
  }
  return true;
}
