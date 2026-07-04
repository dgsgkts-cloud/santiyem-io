// ============================================================
// chat/__tests__/classifyIntent_test.ts
// Pure-function parity tests for the heuristic intent classifier.
//
// These tests run offline (no network, no auth) and cover every scenario
// listed in Sprint 8.2. They are the fastest signal that a future refactor
// has changed the *classification* half of the Construction Brain contract.
//
// Run:  deno test supabase/functions/chat/__tests__/classifyIntent_test.ts
// ============================================================

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyIntentHeuristic, extractPriorProject } from "../intents/classifyIntent.ts";
import { SCENARIOS } from "./scenarios.ts";

for (const s of SCENARIOS) {
  Deno.test(`classify: ${s.id} — ${s.description}`, () => {
    const { intent, filters } = classifyIntentHeuristic(s.prompt, s.projectNames);
    assertEquals(
      intent,
      s.expectIntent,
      `intent mismatch for "${s.prompt}" (got ${intent}, want ${s.expectIntent})`,
    );
    if (s.expectFilters) {
      for (const [k, v] of Object.entries(s.expectFilters)) {
        assertEquals(
          (filters as Record<string, unknown>)[k],
          v,
          `filter[${k}] mismatch (got ${JSON.stringify((filters as Record<string, unknown>)[k])}, want ${JSON.stringify(v)})`,
        );
      }
    }
  });
}

Deno.test("sticky project: follow-up inherits prior project", () => {
  const projects = [{ id: "p-arsuz", name: "Arsuz Modern Villa" }];
  const history = [
    { role: "user", content: "Arsuz Modern Villa projesinde durum ne?" },
    { role: "assistant", content: "Yolunda." },
    { role: "user", content: "Peki ödemeler ne durumda?" },
  ];
  const inherited = extractPriorProject(history, projects);
  assertEquals(inherited, "Arsuz Modern Villa");
});

Deno.test("sticky project: returns null when no prior project mentioned", () => {
  const projects = [{ id: "p-arsuz", name: "Arsuz Modern Villa" }];
  const history = [
    { role: "user", content: "Merhaba" },
    { role: "assistant", content: "Selam" },
    { role: "user", content: "Bugün hava nasıl?" },
  ];
  const inherited = extractPriorProject(history, projects);
  assertEquals(inherited, null);
});

Deno.test("date window: bugün → today range", () => {
  const { filters } = classifyIntentHeuristic("bugün geç kalan işçi var mı?", []);
  assert(filters.date_from, "date_from should be set for 'bugün'");
  assertEquals(filters.date_from, filters.date_to);
});
