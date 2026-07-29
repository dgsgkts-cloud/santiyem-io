// Company Memory — persistent business context CRUD + semantic search.
// Actions: list | search | upsert | update | delete | pin
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { embedText } from "../_shared/embeddings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MEMORY_TYPES = new Set([
  "company", "project", "personnel", "supplier", "decision", "preference", "other",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const anon = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await anon.auth.getClaims(token);
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const sb = createClient(supabaseUrl, serviceKey);
    // User-scoped client: RLS on company_memories (own + same-team rows only)
    // enforces tenant isolation for every read/mutation of existing records.
    const asUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Ownership guard for actions that take a client-supplied memory id.
    const assertOwned = async (id: string) => {
      const { data, error } = await asUser
        .from("company_memories")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    };

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();

    if (action === "list") {
      const { data, error } = await asUser
        .from("company_memories")
        .select("id,type,category,title,content,metadata,source,confidence,pinned,usage_count,last_used_at,created_from,user_confirmed,updated_at,created_at,user_id")
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return json({ memories: data ?? [] });
    }

    if (action === "search") {
      const query = String(body.query || "").trim();
      if (!query) return json({ memories: [] });
      const type = body.type && MEMORY_TYPES.has(body.type) ? body.type : null;
      const matchCount = Math.min(Math.max(Number(body.match_count) || 6, 1), 20);
      const minSim = Math.min(Math.max(Number(body.min_similarity) || 0.55, 0), 1);
      const embedding = await embedText(query);
      const { data, error } = await sb.rpc("match_company_memories", {
        _user_id: userId,
        _query_embedding: embedding,
        _match_count: matchCount,
        _min_similarity: minSim,
        _type: type,
      });
      if (error) throw error;
      const ids = (data ?? []).map((m: any) => m.id).filter(Boolean);
      if (ids.length) {
        sb.rpc("touch_memories_used", { _ids: ids }).then(() => {});
      }
      return json({ memories: data ?? [] });
    }

    if (action === "upsert") {
      const id = body.id as string | undefined;
      const content = String(body.content || "").trim();
      if (!content) return json({ error: "content required" }, 400);
      const type = MEMORY_TYPES.has(body.type) ? body.type : "other";
      const category = typeof body.category === "string" ? body.category.slice(0, 40) : null;
      const title = body.title ? String(body.title).slice(0, 200) : null;
      const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
      const source = body.source ? String(body.source).slice(0, 60) : "manual";
      const createdFrom = body.created_from ? String(body.created_from).slice(0, 40) : source;
      const confidence = Math.min(Math.max(Number(body.confidence ?? 0.8), 0), 1);
      const pinned = !!body.pinned;
      const userConfirmed = body.user_confirmed === false ? false : true;

      const embedding = await embedText(`${title ? title + "\n" : ""}${content}`);
      const row: Record<string, unknown> = {
        user_id: userId,
        type, category, title, content, metadata, source, confidence, pinned,
        created_from: createdFrom,
        user_confirmed: userConfirmed,
        embedding: embedding as unknown as number[],
      };
      if (id) {
        if (!(await assertOwned(id))) return json({ error: "not_found" }, 404);
        const { data, error } = await sb.from("company_memories")
          .update(row).eq("id", id).select().single();
        if (error) throw error;
        return json({ memory: data });
      }
      const { data, error } = await sb.from("company_memories")
        .insert(row).select().single();
      if (error) throw error;
      // Sprint 11.1 — count Company Memory writes toward monthly quota (soft).
      try {
        await asUser.rpc("increment_usage", {
          _metric: "company_memory_writes_month",
          _delta: 1,
          _reason: "company-memory:upsert",
        });
      } catch (_) { /* ignore */ }
      return json({ memory: data });
    }


    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return json({ error: "id required" }, 400);
      if (!(await assertOwned(id))) return json({ error: "not_found" }, 404);
      const patch: Record<string, unknown> = {};
      if (typeof body.title === "string") patch.title = body.title.slice(0, 200);
      if (typeof body.content === "string") patch.content = body.content;
      if (body.metadata && typeof body.metadata === "object") patch.metadata = body.metadata;
      if (typeof body.pinned === "boolean") patch.pinned = body.pinned;
      if (typeof body.confidence === "number") patch.confidence = Math.min(Math.max(body.confidence, 0), 1);
      if (typeof body.content === "string" || typeof body.title === "string") {
        const merged = `${patch.title ?? ""}\n${patch.content ?? ""}`.trim();
        if (merged) patch.embedding = (await embedText(merged)) as unknown as number[];
      }
      const { data, error } = await sb.from("company_memories")
        .update(patch).eq("id", id).select().single();
      if (error) throw error;
      return json({ memory: data });
    }

    if (action === "pin") {
      const id = String(body.id || "");
      const pinned = !!body.pinned;
      if (!id) return json({ error: "id required" }, 400);
      if (!(await assertOwned(id))) return json({ error: "not_found" }, 404);
      const { data, error } = await sb.from("company_memories")
        .update({ pinned }).eq("id", id).select().single();
      if (error) throw error;
      return json({ memory: data });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return json({ error: "id required" }, 400);
      if (!(await assertOwned(id))) return json({ error: "not_found" }, 404);
      const { error } = await sb.from("company_memories").delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "list_dismissed") {
      const { data, error } = await sb
        .from("memory_dismissed_categories")
        .select("category, created_at")
        .eq("user_id", userId);
      if (error) throw error;
      return json({ categories: (data ?? []).map((r: any) => r.category) });
    }

    if (action === "dismiss_category") {
      const category = String(body.category || "").slice(0, 40);
      if (!category) return json({ error: "category required" }, 400);
      const { error } = await sb.from("memory_dismissed_categories")
        .upsert({ user_id: userId, category }, { onConflict: "user_id,category" });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "restore_category") {
      const category = String(body.category || "").slice(0, 40);
      if (!category) return json({ error: "category required" }, 400);
      const { error } = await sb.from("memory_dismissed_categories")
        .delete().eq("user_id", userId).eq("category", category);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: `unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("[company-memory] error:", e);
    return json({ error: (e as Error).message || "error" }, 500);
  }
});

