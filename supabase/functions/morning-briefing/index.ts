// Generates a proactive morning executive briefing for the authenticated user
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const publishable = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const authClient = createClient(supabaseUrl, publishable, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: claims, error: claimsError } = await authClient.auth.getClaims(jwt);
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [profileRes, projectsRes, tasksRes, paymentsRes, materialsRes] = await Promise.all([
      admin.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
      admin.from("projects").select("id, name, status").eq("user_id", userId).eq("status", "aktif"),
      admin
        .from("tasks")
        .select("id, title, due_date, status, project_id")
        .eq("user_id", userId)
        .neq("status", "completed")
        .lte("due_date", today),
      admin
        .from("subcontractor_payments")
        .select("amount, due_date, status, subcontractor_id")
        .eq("user_id", userId)
        .neq("status", "paid")
        .lte("due_date", today),
      admin
        .from("materials")
        .select("name, current_stock, minimum_stock")
        .eq("user_id", userId)
        .lt("current_stock", "minimum_stock" as unknown as number)
        .limit(20),
    ]);

    const projects = projectsRes.data ?? [];
    const overdueTasks = tasksRes.data ?? [];
    const overduePayments = paymentsRes.data ?? [];
    const criticalStock = materialsRes.data ?? [];

    // Simple health score
    let score = 100;
    score -= Math.min(30, overdueTasks.length * 5);
    score -= Math.min(30, overduePayments.length * 8);
    score -= Math.min(20, criticalStock.length * 4);
    score = Math.max(0, score);

    const firstName = (profileRes.data?.full_name as string | undefined)?.split(" ")[0] ?? "";
    const greeting =
      new Date().getHours() < 11 ? "Günaydın" : new Date().getHours() < 18 ? "İyi günler" : "İyi akşamlar";

    const summary = {
      greeting: `${greeting}${firstName ? `, ${firstName}` : ""}.`,
      health_score: score,
      active_projects: projects.length,
      overdue_tasks: overdueTasks.length,
      overdue_payments: overduePayments.length,
      critical_stock: criticalStock.length,
      generated_at: new Date().toISOString(),
    };

    // Use Lovable AI to generate a natural spoken briefing
    let spoken = `${summary.greeting} Bugün proje sağlığı ${score} puanda. `;
    const bits: string[] = [];
    if (overduePayments.length) bits.push(`${overduePayments.length} geciken ödeme`);
    if (criticalStock.length) bits.push(`${criticalStock.length} kritik stok kalemi`);
    if (overdueTasks.length) bits.push(`${overdueTasks.length} vadesi gelmiş görev`);
    spoken += bits.length ? `Öne çıkanlar: ${bits.join(", ")}. ` : "Kritik uyarı yok. ";
    spoken += "Hangi konuyu önce incelemek istersiniz?";

    if (lovableKey) {
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content:
                  "Sen deneyimli bir proje direktörüsün. Türkçe, kısa (2-3 cümle), profesyonel ve sakin bir sabah brifingi ver. Sonunda 'Hangi konuyu önce incelemek istersiniz?' diye sor. Emoji kullanma.",
              },
              {
                role: "user",
                content: JSON.stringify(summary),
              },
            ],
          }),
        });
        if (aiRes.ok) {
          const j = await aiRes.json();
          const t = j?.choices?.[0]?.message?.content;
          if (typeof t === "string" && t.length > 20) spoken = t;
        }
      } catch (e) {
        console.warn("AI briefing fallback:", e);
      }
    }

    return new Response(
      JSON.stringify({ summary, spoken_text: spoken }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("morning-briefing error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
