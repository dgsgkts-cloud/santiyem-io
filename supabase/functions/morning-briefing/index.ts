// AI Executive Daily Briefing — real-data, structured, cached-per-day
// Produces a 6-section briefing + dashboard cards for Şantiyem AI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Section =
  | { kind: "greeting"; text: string }
  | { kind: "status"; text: string }
  | { kind: "risks"; text: string; items: string[] }
  | { kind: "priorities"; text: string; items: string[] }
  | { kind: "positives"; text: string; items: string[] }
  | { kind: "recommendation"; text: string };

type CardTone = "positive" | "warning" | "danger" | "neutral";
interface Card {
  id: string;
  type: "critical_risk" | "priority" | "financial" | "project" | "recommendation";
  title: string;
  value?: string;
  detail?: string;
  tone: CardTone;
}

interface BriefingPayload {
  is_empty: boolean;
  greeting: string;
  summary: {
    health_score: number;
    active_projects: number;
    overdue_tasks: number;
    overdue_payments: number;
    critical_stock: number;
    completed_recent: number;
    generated_at: string;
  };
  sections: Section[];
  cards: Card[];
  spoken_text: string;
  question: string;
  settings?: BriefingSettings;
}

interface BriefingSettings {
  auto_morning?: boolean;
  voice_enabled?: boolean;
  dashboard_cards?: boolean;
  include_financial?: boolean;
  include_risks?: boolean;
  include_personnel?: boolean;
  include_materials?: boolean;
}

const DEFAULT_SETTINGS: Required<BriefingSettings> = {
  auto_morning: true,
  voice_enabled: true,
  dashboard_cards: true,
  include_financial: true,
  include_risks: true,
  include_personnel: true,
  include_materials: true,
};

function pickGreeting(name: string): string {
  const h = new Date().getHours();
  const base = h < 6 ? "Merhaba" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
  return name ? `${base} ${name}.` : `${base}.`;
}

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

    // Optional client-side settings passed in body
    let clientSettings: BriefingSettings = {};
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.settings && typeof body.settings === "object") clientSettings = body.settings;
      } catch { /* noop */ }
    }
    const settings: Required<BriefingSettings> = { ...DEFAULT_SETTINGS, ...clientSettings };

    const admin = createClient(supabaseUrl, serviceKey);
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      profileRes, projectsRes, tasksRes, paymentsRes, materialsRes,
      completedTasksRes, personnelRes,
    ] = await Promise.all([
      admin.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
      admin.from("projects").select("id, name, status").eq("user_id", userId).eq("status", "aktif"),
      admin.from("tasks").select("id, title, due_date, status, project_id")
        .eq("user_id", userId).neq("status", "completed").lte("due_date", today),
      admin.from("subcontractor_payments").select("id, amount, due_date, status")
        .eq("user_id", userId).neq("status", "odendi").lte("due_date", today),
      settings.include_materials
        ? admin.from("materials").select("name, current_stock, minimum_stock").eq("user_id", userId).limit(50)
        : Promise.resolve({ data: [] as any[] }),
      admin.from("tasks").select("id, title").eq("user_id", userId).eq("status", "completed")
        .gte("updated_at", weekAgo).limit(10),
      settings.include_personnel
        ? admin.from("personnel").select("id, is_active").eq("user_id", userId)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const projects = projectsRes.data ?? [];
    const overdueTasks = (tasksRes.data ?? []) as Array<{ title: string }>;
    const overduePayments = (paymentsRes.data ?? []) as Array<{ amount: number }>;
    const allMaterials = (materialsRes.data ?? []) as Array<{ name: string; current_stock: number; minimum_stock: number }>;
    const criticalStock = allMaterials.filter(m => Number(m.current_stock) < Number(m.minimum_stock));
    const completedRecent = (completedTasksRes.data ?? []).length;
    const activePersonnel = ((personnelRes.data ?? []) as Array<{ is_active: boolean }>).filter(p => p.is_active).length;

    const firstName = (profileRes.data?.full_name as string | undefined)?.split(" ")[0] ?? "";
    const greeting = pickGreeting(firstName);

    // No project data → return empty message
    if (projects.length === 0) {
      const empty: BriefingPayload = {
        is_empty: true,
        greeting,
        summary: {
          health_score: 0, active_projects: 0, overdue_tasks: 0, overdue_payments: 0,
          critical_stock: 0, completed_recent: 0, generated_at: new Date().toISOString(),
        },
        sections: [
          { kind: "greeting", text: greeting },
          { kind: "status", text: "Henüz analiz edebileceğim yeterli proje verisi bulunmuyor." },
          { kind: "recommendation", text: "İlk projenizi oluşturduğunuzda her sabah size otomatik yönetici brifingi sunacağım." },
        ],
        cards: [],
        spoken_text:
          `${greeting} Henüz analiz edebileceğim yeterli proje verisi bulunmuyor. ` +
          `İlk projenizi oluşturduğunuzda her sabah size otomatik yönetici brifingi sunacağım.`,
        question: "İlk projenizi birlikte oluşturmamı ister misiniz?",
        settings,
      };
      return new Response(JSON.stringify(empty), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Health score
    let score = 100;
    score -= Math.min(30, overdueTasks.length * 5);
    score -= Math.min(30, overduePayments.length * 8);
    score -= Math.min(20, criticalStock.length * 4);
    score = Math.max(0, score);

    // ---------- Risks (ranked) ----------
    const risks: string[] = [];
    if (settings.include_financial && overduePayments.length) {
      const total = overduePayments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
      risks.push(
        `${overduePayments.length} geciken taşeron ödemesi` +
        (total > 0 ? ` (toplam ${Math.round(total).toLocaleString("tr-TR")} TL)` : "")
      );
    }
    if (settings.include_materials && criticalStock.length) {
      const top = criticalStock.slice(0, 2).map(m => m.name).join(", ");
      risks.push(`${criticalStock.length} kritik stok kalemi${top ? `: ${top}` : ""}`);
    }
    if (settings.include_risks && overdueTasks.length) {
      const top = overdueTasks[0]?.title;
      risks.push(`${overdueTasks.length} vadesi geçmiş görev${top ? `, örneğin "${top}"` : ""}`);
    }
    const topRisks = risks.slice(0, 3);

    // ---------- Priorities ----------
    const { data: todayPriorities } = await admin
      .from("tasks")
      .select("title, due_date")
      .eq("user_id", userId)
      .neq("status", "completed")
      .gte("due_date", today)
      .lte("due_date", today)
      .limit(3);
    const priorities = (todayPriorities ?? []).map(t => t.title).slice(0, 3);

    // ---------- Positives ----------
    const positives: string[] = [];
    if (completedRecent > 0) positives.push(`Son 7 günde ${completedRecent} görev tamamlandı`);
    if (settings.include_personnel && activePersonnel > 0) positives.push(`${activePersonnel} aktif personel sahada`);
    if (topRisks.length === 0) positives.push("Kritik uyarı yok, projeler plan doğrultusunda ilerliyor");

    // ---------- Recommendation ----------
    let recommendation = "Bugün için özel bir öneri yok. Günlük planınıza göre ilerleyebilirsiniz.";
    if (settings.include_financial && overduePayments.length) {
      recommendation = "Öncelikle geciken taşeron ödemelerini incelemenizi öneriyorum.";
    } else if (settings.include_materials && criticalStock.length) {
      recommendation = `Kritik stok kalemleri için tedarik planı oluşturmanızı öneriyorum.`;
    } else if (overdueTasks.length) {
      recommendation = "Vadesi geçmiş görevlerin sorumlularıyla görüşmenizi öneriyorum.";
    } else if (priorities.length) {
      recommendation = `Bugünkü önceliğiniz "${priorities[0]}" — sabah bunu netleştirmek iyi olur.`;
    }

    const question =
      overduePayments.length ? "Önce finansal durumu inceleyelim mi?" :
      criticalStock.length ? "Stok listesini açayım mı?" :
      overdueTasks.length ? "Geciken görevleri açayım mı?" :
      priorities.length ? "Bugünün önceliklerinden başlayalım mı?" :
      "Hangi projeyle başlayalım?";

    // ---------- Sections ----------
    const sections: Section[] = [];
    sections.push({ kind: "greeting", text: greeting });
    sections.push({
      kind: "status",
      text: projects.length === 1
        ? `Bugün 1 aktif projeniz bulunuyor.`
        : `Bugün ${projects.length} aktif projeniz bulunuyor.`,
    });
    if (topRisks.length) {
      sections.push({
        kind: "risks",
        text: `Öne çıkan riskler: ${topRisks.join("; ")}.`,
        items: topRisks,
      });
    }
    if (priorities.length) {
      sections.push({
        kind: "priorities",
        text: `Bugünün öncelikleri: ${priorities.join(", ")}.`,
        items: priorities,
      });
    }
    if (positives.length) {
      sections.push({
        kind: "positives",
        text: positives[0] + ".",
        items: positives,
      });
    }
    sections.push({ kind: "recommendation", text: recommendation });

    // ---------- Cards ----------
    const cards: Card[] = [];
    if (settings.dashboard_cards) {
      cards.push({
        id: "project", type: "project",
        title: "Aktif Projeler",
        value: String(projects.length),
        detail: `Sağlık ${score}/100`,
        tone: score >= 70 ? "positive" : score >= 40 ? "warning" : "danger",
      });
      if (settings.include_financial && overduePayments.length) {
        const total = overduePayments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
        cards.push({
          id: "financial", type: "financial",
          title: "Geciken Ödeme",
          value: `${overduePayments.length}`,
          detail: total > 0 ? `${Math.round(total).toLocaleString("tr-TR")} TL` : undefined,
          tone: "danger",
        });
      }
      if (topRisks.length) {
        cards.push({
          id: "risk", type: "critical_risk",
          title: "Kritik Risk",
          value: topRisks[0],
          tone: "danger",
        });
      }
      if (priorities.length) {
        cards.push({
          id: "priority", type: "priority",
          title: "Bugünün Önceliği",
          value: priorities[0],
          detail: priorities.length > 1 ? `+${priorities.length - 1} daha` : undefined,
          tone: "warning",
        });
      }
      cards.push({
        id: "rec", type: "recommendation",
        title: "AI Önerisi",
        value: recommendation,
        tone: "neutral",
      });
    }

    // ---------- Spoken text (concise, natural) ----------
    let spoken = sections.map(s => s.text).join(" ");

    if (lovableKey) {
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content:
                  "Sen deneyimli, sakin ve profesyonel bir Türk şantiye proje direktörüsün. " +
                  "Sabah yönetici brifingi yapıyorsun. Sakin, kendine güvenen, doğal bir tonda konuş. " +
                  "Sunulan yapıyı (selamlama, durum, riskler, öncelikler, olumlu gelişmeler, öneri) sırayla " +
                  "kısa cümlelerle birleştir. Emoji, madde işareti, markdown KULLANMA. Uydurma bilgi ekleme. " +
                  "45-60 saniyede okunacak uzunlukta olsun. Sonda tek bir eyleme yönelik soruyla bitir.",
              },
              {
                role: "user",
                content: JSON.stringify({ sections, question }),
              },
            ],
          }),
        });
        if (aiRes.ok) {
          const j = await aiRes.json();
          const t = j?.choices?.[0]?.message?.content;
          if (typeof t === "string" && t.length > 40) spoken = t.trim();
        }
      } catch (e) {
        console.warn("AI briefing polish fallback:", e);
      }
    }
    if (!spoken.includes("?")) spoken = `${spoken} ${question}`;

    const payload: BriefingPayload = {
      is_empty: false,
      greeting,
      summary: {
        health_score: score,
        active_projects: projects.length,
        overdue_tasks: overdueTasks.length,
        overdue_payments: overduePayments.length,
        critical_stock: criticalStock.length,
        completed_recent: completedRecent,
        generated_at: new Date().toISOString(),
      },
      sections,
      cards,
      spoken_text: spoken,
      question,
      settings,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("morning-briefing error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
