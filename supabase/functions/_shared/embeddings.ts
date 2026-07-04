// Shared embedding helper — Lovable AI Gateway.
// Uses openai/text-embedding-3-small at 1536 dims (hnsw-compatible with pgvector).

const GATEWAY = "https://ai.gateway.lovable.dev/v1/embeddings";
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_MODEL_VERSION = "v1-1536";
export const EMBEDDING_DIMS = 1536;

export async function embedText(input: string): Promise<number[]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const clean = (input || "").slice(0, 8000);
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: clean, dimensions: EMBEDDING_DIMS }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`embed ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  return json?.data?.[0]?.embedding ?? [];
}

// Batch multiple inputs in a single request (kept small to avoid gateway limits)
export async function embedTexts(inputs: string[]): Promise<number[][]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  if (!inputs.length) return [];
  const clean = inputs.map((i) => (i || "").slice(0, 8000));
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: clean, dimensions: EMBEDDING_DIMS }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`embed(batch) ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  return (json?.data ?? []).map((d: any) => d.embedding as number[]);
}
