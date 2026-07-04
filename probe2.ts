import { extractPriorProject } from "./supabase/functions/chat/intents/classifyIntent.ts";
const projects = [{ id: "p-arsuz", name: "Arsuz Modern Villa" }];
for (const first of [
  "Arsuz Modern Villa hakkında bilgi",
  "Arsuz Modern Villa",
  "Arsuz Modern Villa projesi durumu",
]) {
  console.log(first, "=>", extractPriorProject([
    { role: "user", content: first },
    { role: "assistant", content: "Ok." },
    { role: "user", content: "Peki ödemeler?" },
  ], projects));
}
