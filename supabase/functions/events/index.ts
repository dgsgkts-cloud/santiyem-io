import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EventItem {
  title: string;
  date: string;
  link: string;
  type: string;
}

function parseEventsFromHtml(html: string): EventItem[] {
  const events: EventItem[] = [];
  let currentDate = "";

  // Scan for: 1) date headers  2) rsApt divs with title  3) event links inside rsAptContent
  // Use a combined regex to find all tokens sequentially
  const tokenRegex = /href="#(\d{4}-\d{2}-\d{2})"[^>]*class="rsDateHeader"|class="rsApt"[^>]*title="([^"]+)"|href="((?:https?:\/\/www\.imo\.org\.tr)?\/TR,\d+\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
  let m;

  while ((m = tokenRegex.exec(html)) !== null) {
    if (m[1]) {
      currentDate = m[1];
    } else if (m[3] && m[4]) {
      const rawLink = m[3];
      const title = m[4].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#039;/g, "'").trim();

      if (!title || title.length < 3 || title.toLowerCase() === "delete") continue;
      if (rawLink.includes("etkinlik-takvimi")) continue;

      const link = rawLink.startsWith("http") ? rawLink : `https://www.imo.org.tr${rawLink}`;

      let type = "etkinlik";
      const tl = title.toLocaleLowerCase("tr");
      if (tl.includes("seminer")) type = "seminer";
      else if (tl.includes("kurs") || tl.includes("eğitim")) type = "eğitim";
      else if (tl.includes("gezi")) type = "gezi";
      else if (tl.includes("genel kurul") || tl.includes("seçim")) type = "toplantı";
      else if (tl.includes("kongre") || tl.includes("konferans")) type = "kongre";

      events.push({ title, date: currentDate || new Date().toISOString().split("T")[0], link, type });
    }
  }

  // Deduplicate by link
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.link)) return false;
    seen.add(e.link);
    return true;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = "https://www.imo.org.tr/TR,76726/etkinlik-takvimi.html";
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MuhendisAI/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      console.error("IMO events page error:", resp.status);
      return new Response(
        JSON.stringify({ error: "İMO etkinlik takvimi sayfasına erişilemedi" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await resp.text();
    console.log("Fetched IMO page, length:", html.length);
    console.log("Has rsDateHeader:", html.includes("rsDateHeader"));
    console.log("Has target=_blank:", html.includes('target="_blank"'));
    // Log a snippet around first target="_blank" to see event link format
    const tIdx = html.indexOf('target="_blank"');
    if (tIdx > -1) console.log("target_blank context:", html.substring(Math.max(0, tIdx - 50), tIdx + 200));
    
    const events = parseEventsFromHtml(html);
    console.log("Parsed events:", events.length);

    // Sort by date
    events.sort((a, b) => a.date.localeCompare(b.date));

    // Only show current and future events
    const today = new Date().toISOString().split("T")[0];
    const upcoming = events.filter((e) => e.date >= today);

    return new Response(
      JSON.stringify({ events: upcoming, total: upcoming.length, fetched_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("events error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});