import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { chunkText, sha256Hex } from "../_shared/chunker.ts";
import {
  embedTexts,
  EMBEDDING_MODEL,
  EMBEDDING_MODEL_VERSION,
} from "../_shared/embeddings.ts";

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Geçersiz oturum" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { documentId, reindex = false } = await req.json();
    if (!documentId) {
      return new Response(JSON.stringify({ error: "documentId gerekli" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Belge bulunamadı" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as processing right away so UI can show indexing status
    await supabase
      .from("documents")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", documentId);

    // Kick off async processing without holding the request open
    const work = (async () => {
      try {
        const { data: fileData, error: fileError } = await supabase.storage
          .from("documents")
          .download(doc.file_path);

        if (fileError || !fileData) {
          await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
          return;
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const rawText = extractTextFromPDF(bytes);

        if (!rawText || rawText.trim().length === 0) {
          await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
          return;
        }

        const chunks = chunkText(rawText);
        if (!chunks.length) {
          await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
          return;
        }

        // Existing chunks (for hash-based skip)
        const { data: existing } = await supabase
          .from("document_chunks")
          .select("id, content_hash, embedding_model")
          .eq("document_id", documentId);

        const existingByHash = new Map<string, { id: string; embedding_model: string | null }>();
        for (const row of existing || []) {
          if (row.content_hash) {
            existingByHash.set(row.content_hash, {
              id: row.id,
              embedding_model: row.embedding_model,
            });
          }
        }

        // Determine which chunks need embedding
        const withHash = await Promise.all(
          chunks.map(async (c, idx) => ({
            idx,
            content: c.content,
            tokenCount: c.tokenCount,
            hash: await sha256Hex(c.content),
          })),
        );

        const toEmbed: typeof withHash = [];
        for (const c of withHash) {
          const prev = existingByHash.get(c.hash);
          if (reindex || !prev || prev.embedding_model !== EMBEDDING_MODEL) {
            toEmbed.push(c);
          }
        }

        // Embed in batches of 20
        const vectors = new Map<number, number[]>();
        for (let i = 0; i < toEmbed.length; i += 20) {
          const batch = toEmbed.slice(i, i + 20);
          try {
            const vecs = await embedTexts(batch.map((b) => b.content));
            batch.forEach((b, j) => vectors.set(b.idx, vecs[j] ?? []));
          } catch (e) {
            console.error("embed batch failed", e);
          }
        }

        // Wipe old chunks (simple + correct: dedupe already saved us from re-embedding)
        await supabase.from("document_chunks").delete().eq("document_id", documentId);

        const now = new Date().toISOString();
        const rows = withHash.map((c) => ({
          document_id: documentId,
          user_id: user.id,
          content: c.content,
          page_number: Math.max(1, Math.floor(c.idx / 2) + 1),
          chunk_index: c.idx,
          content_hash: c.hash,
          token_count: c.tokenCount,
          embedding: vectors.get(c.idx) ?? null,
          embedding_model: vectors.has(c.idx) ? EMBEDDING_MODEL : null,
          embedding_model_version: vectors.has(c.idx) ? EMBEDDING_MODEL_VERSION : null,
          embedding_created_at: vectors.has(c.idx) ? now : null,
        }));

        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50);
          const { error: insertError } = await supabase.from("document_chunks").insert(batch);
          if (insertError) console.error("Chunk insert error:", insertError);
        }

        const estimatedPages = Math.max(1, Math.ceil(chunks.length / 2));
        await supabase
          .from("documents")
          .update({
            status: "active",
            page_count: estimatedPages,
            updated_at: now,
          })
          .eq("id", documentId);
      } catch (err) {
        console.error("async process error", err);
        await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
      }
    })();

    // @ts-ignore Deno edge runtime
    if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
      // @ts-ignore
      (EdgeRuntime as any).waitUntil(work);
    } else {
      // Fallback: await (still works if runtime doesn't support waitUntil)
      await work;
    }

    return new Response(JSON.stringify({ success: true, status: "processing" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

/** Simple PDF text extractor — Tj/TJ operators between stream/BT blocks. */
function extractTextFromPDF(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const textParts: string[] = [];

  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(raw)) !== null) {
    const content = match[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(content)) !== null) {
      textParts.push(decodePDFString(tjMatch[1]));
    }
    const tjArrayRegex = /\[((?:\([^)]*\)|[^])*?)\]\s*TJ/g;
    let tjArrayMatch: RegExpExecArray | null;
    while ((tjArrayMatch = tjArrayRegex.exec(content)) !== null) {
      const arrayContent = tjArrayMatch[1];
      const stringRegex = /\(([^)]*)\)/g;
      let strMatch: RegExpExecArray | null;
      let line = "";
      while ((strMatch = stringRegex.exec(arrayContent)) !== null) {
        line += decodePDFString(strMatch[1]);
      }
      if (line.trim()) textParts.push(line);
    }
  }

  const plainTextRegex = /BT\s([\s\S]*?)ET/g;
  while ((match = plainTextRegex.exec(raw)) !== null) {
    const btContent = match[1];
    const tjRegex2 = /\(([^)]*)\)\s*Tj/g;
    let tjMatch2: RegExpExecArray | null;
    while ((tjMatch2 = tjRegex2.exec(btContent)) !== null) {
      const decoded = decodePDFString(tjMatch2[1]);
      if (decoded.trim() && !textParts.includes(decoded)) {
        textParts.push(decoded);
      }
    }
  }

  return textParts.join("\n");
}

function decodePDFString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}
