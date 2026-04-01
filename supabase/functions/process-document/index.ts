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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Geçersiz oturum" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { documentId } = await req.json();
    if (!documentId) {
      return new Response(JSON.stringify({ error: "documentId gerekli" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get document record
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

    // Download file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("documents")
      .download(doc.file_path);

    if (fileError || !fileData) {
      await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
      return new Response(JSON.stringify({ error: "Dosya indirilemedi" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text from PDF using a simple approach
    // We'll use the PDF's raw text content
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Simple PDF text extraction
    const text = extractTextFromPDF(bytes);
    
    if (!text || text.trim().length === 0) {
      await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
      return new Response(JSON.stringify({ error: "PDF'den metin çıkarılamadı" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Split text into chunks (roughly by pages/sections)
    const chunks = splitIntoChunks(text, 1500);
    
    // Estimate page count from chunks
    const estimatedPages = Math.max(1, Math.ceil(chunks.length / 2));

    // Insert chunks into database
    const chunkRecords = chunks.map((content, idx) => ({
      document_id: documentId,
      user_id: user.id,
      content: content.trim(),
      page_number: Math.floor(idx / 2) + 1,
      chunk_index: idx,
    }));

    // Insert in batches of 50
    for (let i = 0; i < chunkRecords.length; i += 50) {
      const batch = chunkRecords.slice(i, i + 50);
      const { error: insertError } = await supabase.from("document_chunks").insert(batch);
      if (insertError) {
        console.error("Chunk insert error:", insertError);
      }
    }

    // Update document status
    await supabase.from("documents").update({
      status: "active",
      page_count: estimatedPages,
      updated_at: new Date().toISOString(),
    }).eq("id", documentId);

    return new Response(JSON.stringify({ 
      success: true, 
      chunks: chunkRecords.length,
      pages: estimatedPages 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Simple PDF text extractor - extracts text between BT/ET blocks
 * and decodes basic PDF text operators (Tj, TJ, ')
 */
function extractTextFromPDF(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const textParts: string[] = [];
  
  // Find all text between stream...endstream
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let match;
  
  while ((match = streamRegex.exec(raw)) !== null) {
    const content = match[1];
    
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(content)) !== null) {
      textParts.push(decodePDFString(tjMatch[1]));
    }
    
    // Extract from TJ arrays
    const tjArrayRegex = /\[((?:\([^)]*\)|[^])*?)\]\s*TJ/g;
    let tjArrayMatch;
    while ((tjArrayMatch = tjArrayRegex.exec(content)) !== null) {
      const arrayContent = tjArrayMatch[1];
      const stringRegex = /\(([^)]*)\)/g;
      let strMatch;
      let line = "";
      while ((strMatch = stringRegex.exec(arrayContent)) !== null) {
        line += decodePDFString(strMatch[1]);
      }
      if (line.trim()) textParts.push(line);
    }
  }
  
  // Also try to extract text that appears plainly
  const plainTextRegex = /BT\s([\s\S]*?)ET/g;
  while ((match = plainTextRegex.exec(raw)) !== null) {
    const btContent = match[1];
    const tjRegex2 = /\(([^)]*)\)\s*Tj/g;
    let tjMatch2;
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

function splitIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const lines = text.split("\n");
  let current = "";
  
  for (const line of lines) {
    if (current.length + line.length + 1 > maxChunkSize && current.length > 0) {
      chunks.push(current);
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }
  }
  
  if (current.trim()) {
    chunks.push(current);
  }
  
  return chunks;
}
