/**
 * Builds the 302 redirect that iyzico-callback sends back to the browser.
 * Pure function — easy to unit test from Deno.
 */
export function buildCallbackRedirect(
  status: string,
  message?: string,
  native = false,
  baseUrl = "https://santiyem.io/payment-callback",
): Response {
  const params = new URLSearchParams({ status });
  if (message) params.set("message", message);
  if (native) params.set("native", "1");
  const location = `${baseUrl}?${params.toString()}`;
  return new Response(null, { status: 302, headers: { Location: location } });
}

export function redirectWithStatus(status: string, message?: string, native = false): Response {
  return buildCallbackRedirect(status, message, native);
}
