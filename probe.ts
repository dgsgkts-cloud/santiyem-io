import { classifyIntentHeuristic, extractPriorProject } from "./supabase/functions/chat/intents/classifyIntent.ts";
import { SCENARIOS } from "./supabase/functions/chat/__tests__/scenarios.ts";
for (const s of SCENARIOS) {
  const { intent, filters } = classifyIntentHeuristic(s.prompt, s.projectNames);
  console.log(`${s.id}\t${intent}\tproj=${filters.project_name ?? "-"}`);
}
const projects = [{ id: "p-arsuz", name: "Arsuz Modern Villa" }];
console.log("sticky1:", extractPriorProject([
  { role: "user", content: "Arsuz Modern Villa projesinde durum ne?" },
  { role: "assistant", content: "Yolunda." },
  { role: "user", content: "Peki ödemeler ne durumda?" },
], projects));
