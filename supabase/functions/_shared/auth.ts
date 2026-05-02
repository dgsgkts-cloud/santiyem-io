import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

/**
 * Validates the Authorization header and returns the authenticated user.
 * Returns a Response (401) if validation fails, or { user } if successful.
 */
export async function requireAuth(req: Request, corsHeaders: Record<string, string>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      user: null as null,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(supabaseUrl, anonKey);
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await client.auth.getUser(token);

  if (error || !data?.user) {
    return {
      user: null as null,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return { user: data.user, error: null as null };
}
