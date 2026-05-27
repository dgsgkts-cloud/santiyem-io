import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildCallbackRedirect } from "./redirect.ts";

Deno.test("success status → 302 with status=success", () => {
  const res = buildCallbackRedirect("success");
  assertEquals(res.status, 302);
  const loc = res.headers.get("Location")!;
  assert(loc.startsWith("https://santiyem.io/payment-callback?"));
  const url = new URL(loc);
  assertEquals(url.searchParams.get("status"), "success");
  assertEquals(url.searchParams.get("native"), null);
  assertEquals(url.searchParams.get("message"), null);
});

Deno.test("failed status with message → message is URL-encoded", () => {
  const res = buildCallbackRedirect("failed", "Kart reddedildi & iptal");
  const url = new URL(res.headers.get("Location")!);
  assertEquals(url.searchParams.get("status"), "failed");
  assertEquals(url.searchParams.get("message"), "Kart reddedildi & iptal");
});

Deno.test("native=true → native=1 flag added", () => {
  const res = buildCallbackRedirect("success", undefined, true);
  const url = new URL(res.headers.get("Location")!);
  assertEquals(url.searchParams.get("status"), "success");
  assertEquals(url.searchParams.get("native"), "1");
});

Deno.test("canceled status with native flag", () => {
  const res = buildCallbackRedirect("canceled", "Ödeme iptal edildi", true);
  const url = new URL(res.headers.get("Location")!);
  assertEquals(url.searchParams.get("status"), "canceled");
  assertEquals(url.searchParams.get("message"), "Ödeme iptal edildi");
  assertEquals(url.searchParams.get("native"), "1");
});

Deno.test("Location always points to https bridge (never santiyem:// directly)", () => {
  const res = buildCallbackRedirect("success", undefined, true);
  const loc = res.headers.get("Location")!;
  assert(loc.startsWith("https://"), `expected https, got ${loc}`);
  assert(!loc.startsWith("santiyem://"));
});

Deno.test("native flag is omitted when false (no &native=0 noise)", () => {
  const res = buildCallbackRedirect("failed", "x", false);
  const loc = res.headers.get("Location")!;
  assert(!loc.includes("native="));
});
