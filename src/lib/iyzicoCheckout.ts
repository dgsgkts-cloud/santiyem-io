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

// Module-level state: tracks if a payment checkout is currently in progress.
// Set when the system browser opens; cleared when a payment deep link is received.
let paymentInProgress = false;
let cancelTimer: ReturnType<typeof setTimeout> | null = null;

export function markPaymentResultReceived() {
  paymentInProgress = false;
  if (cancelTimer) {
    clearTimeout(cancelTimer);
    cancelTimer = null;
  }
}

export function isPaymentInProgress() {
  return paymentInProgress;
}

/**
 * Called when the native system browser is closed by the user (e.g. swipe-down
 * dismiss). If no payment-result deep link arrives within a short window, we
 * treat it as a user cancellation and show a Turkish message.
 */
export function handleNativeBrowserClosed(onCancel?: () => void) {
  if (!paymentInProgress) return;
  if (cancelTimer) clearTimeout(cancelTimer);
  cancelTimer = setTimeout(() => {
    if (paymentInProgress) {
      paymentInProgress = false;
      toast.error("Ödeme iptal edildi. Aboneliğiniz değişmedi, dilediğinizde tekrar deneyebilirsiniz.");
      onCancel?.();
    }
    cancelTimer = null;
  }, 1500);
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
    paymentInProgress = true;
    await Browser.open({ url, presentationStyle: "fullscreen" });
  } catch (err) {
    console.error("[iyzico/native] Browser.open failed", err);
    paymentInProgress = false;
    toast.error("Ödeme sayfası açılamadı, lütfen tekrar deneyin");
  }
  return true;
}
