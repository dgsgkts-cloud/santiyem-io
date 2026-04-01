import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Get user
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Geçersiz oturum" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build search query - use Turkish full text search
    // Extract meaningful keywords (at least 3 chars)
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length >= 3)
      .slice(0, 10);

    if (keywords.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use full text search with Turkish config
    const tsQuery = keywords.join(" & ");
    
    const { data: chunks, error: searchError } = await supabase
      .from("document_chunks")
      .select(`
        id,
        content,
        page_number,
        chunk_index,
        document_id,
        documents!inner(name, status)
      `)
      .eq("user_id", user.id)
      .textSearch("content", tsQuery, { config: "turkish" })
      .limit(5);

    if (searchError) {
      console.error("Search error:", searchError);
      
      // Fallback: simple ILIKE search
      const likeQuery = `%${keywords[0]}%`;
      const { data: fallbackChunks } = await supabase
        .from("document_chunks")
        .select(`
          id,
          content,
          page_number,
          chunk_index,
          document_id
        `)
        .eq("user_id", user.id)
        .ilike("content", likeQuery)
        .limit(5);

      if (fallbackChunks && fallbackChunks.length > 0) {
        // Get document names
        const docIds = [...new Set(fallbackChunks.map(c => c.document_id))];
        const { data: docs } = await supabase
          .from("documents")
          .select("id, name")
          .in("id", docIds);

        const docMap = new Map((docs || []).map(d => [d.id, d.name]));
        
        const results = fallbackChunks.map(c => ({
          content: c.content.substring(0, 500),
          page_number: c.page_number,
          document_name: docMap.get(c.document_id) || "Bilinmeyen Belge",
        }));

        return new Response(JSON.stringify({ results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = (chunks || []).map((c: any) => ({
      content: c.content.substring(0, 500),
      page_number: c.page_number,
      document_name: c.documents?.name || "Bilinmeyen Belge",
    }));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-documents error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
