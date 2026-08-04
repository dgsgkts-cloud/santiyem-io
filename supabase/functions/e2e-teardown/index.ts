// GEÇİCİ E2E TEARDOWN — çalıştırıldıktan sonra silinir.
// Yalnızca E2E kalıntılarını temizler: 'e2e-' ile eşleşen transfer-documents
// nesneleri ve '@e2e-santiyem.test' / '@santiyem-e2e.test' test kullanıcıları.
// Başka hiçbir kaydı silemez (desenler kod içinde sabit).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const removedObjects: string[] = [];
  const removedUsers: string[] = [];
  const errors: string[] = [];

  // 1) Özel depodaki E2E dosyaları
  const walk = async (prefix: string, depth = 0): Promise<void> => {
    if (depth > 3) return;
    const { data, error } = await admin.storage.from("transfer-documents").list(prefix, { limit: 1000 });
    if (error) { errors.push(`list ${prefix}: ${error.message}`); return; }
    for (const entry of data ?? []) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) { await walk(path, depth + 1); continue; }
      if (!/e2e/i.test(path)) continue;
      const { error: delErr } = await admin.storage.from("transfer-documents").remove([path]);
      if (delErr) errors.push(`remove ${path}: ${delErr.message}`);
      else removedObjects.push(path);
    }
  };
  await walk("");

  // 2) E2E test kullanıcıları (auth kimlikleri dahil)
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) errors.push(`listUsers: ${listErr.message}`);
  for (const u of list?.users ?? []) {
    const email = (u.email ?? "").toLowerCase();
    if (!/@(e2e-santiyem|santiyem-e2e)\.test$/.test(email)) continue;
    const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
    if (delErr) errors.push(`deleteUser ${email}: ${delErr.message}`);
    else removedUsers.push(email);
  }

  return new Response(JSON.stringify({ removedObjects, removedUsers, errors }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
