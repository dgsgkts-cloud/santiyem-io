import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { embedText } from "../_shared/embeddings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SearchBody {
  query?: string;
  matchCount?: number;
  minSimilarity?: number;
  filters?: {
    projectId?: string;
    supplier?: string;
    docType?: string;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    language?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Yetkilendirme gerekli" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Geçersiz oturum" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SearchBody = await req.json().catch(() => ({}));
    const query = (body.query || "").trim();
    if (!query) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filters = body.filters || {};
    const matchCount = Math.min(Math.max(body.matchCount ?? 8, 1), 20);
    const minSimilarity = body.minSimilarity ?? 0.35;

    // 1) Embed query
    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = await embedText(query);
    } catch (e) {
      console.error("embed query failed", e);
    }

    // 2) Hybrid RPC (semantic + FTS + boosts)
    let hybrid: any[] = [];
    if (queryEmbedding.length > 0) {
      const { data, error } = await supabase.rpc("match_document_chunks", {
        _user_id: user.id,
        _query_embedding: queryEmbedding,
        _query_text: query,
        _match_count: matchCount,
        _min_similarity: minSimilarity,
        _project_id: filters.projectId ?? null,
        _supplier: filters.supplier ?? null,
        _doc_type: filters.docType ?? null,
        _tags: filters.tags && filters.tags.length ? filters.tags : null,
        _date_from: filters.dateFrom ?? null,
        _date_to: filters.dateTo ?? null,
        _language: filters.language ?? null,
      });
      if (error) console.error("hybrid rpc error", error);
      else hybrid = data || [];
    }

    // 3) Keyword fallback (only if hybrid returned nothing — e.g. no embeddings yet)
    if (hybrid.length === 0) {
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3)
        .slice(0, 8);

      if (keywords.length > 0) {
        const tsQuery = keywords.join(" & ");
        const { data: chunks } = await supabase
          .from("document_chunks")
          .select(
            "id, content, page_number, document_id, documents!inner(name, pinned, is_global)",
          )
          .or(`user_id.eq.${user.id},is_global.eq.true`)
          .textSearch("content", tsQuery, { config: "turkish" })
          .limit(matchCount);

        hybrid = (chunks || []).map((c: any) => ({
          chunk_id: c.id,
          document_id: c.document_id,
          document_name: c.documents?.name || "Belge",
          page_number: c.page_number,
          content: c.content,
          similarity: 0,
          fts_rank: 0.5,
          pinned: !!c.documents?.pinned,
          is_global: !!c.documents?.is_global,
          score: 0.4,
        }));
      }
    }

    // 4) Confidence bucketing for UI
    const results = hybrid.map((r: any) => {
      const sim = Number(r.similarity ?? 0);
      const score = Number(r.score ?? 0);
      const confidence =
        sim >= 0.75 || score >= 0.9
          ? "high"
          : sim >= 0.5 || score >= 0.55
          ? "medium"
          : "low";
      return {
        chunk_id: r.chunk_id,
        document_id: r.document_id,
        document_name: r.document_name,
        page_number: r.page_number,
        content: String(r.content || "").slice(0, 800),
        similarity: Number(sim.toFixed(4)),
        score: Number(score.toFixed(4)),
        pinned: !!r.pinned,
        is_global: !!r.is_global,
        confidence,
      };
    });

    // 5) Bump last_used_at for cited docs (fire-and-forget)
    const docIds = [...new Set(results.map((r) => r.document_id).filter(Boolean))];
    if (docIds.length) {
      supabase.rpc("touch_documents_used", { _doc_ids: docIds }).then(() => {});
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-documents error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
