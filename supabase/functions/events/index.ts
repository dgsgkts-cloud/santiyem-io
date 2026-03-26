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

  // The IMO calendar uses Telerik RadScheduler with rsDateHeader for dates
  // and rsApt divs with title attribute for event names, containing links inside rsAptContent
  // Strategy: track date from rsDateHeader, then extract from rsAptContent > a[target=_blank]

  // Step 1: Build a map of positions to dates
  const datePositions: { pos: number; date: string }[] = [];
  const dateRe = /href="#(\d{4}-\d{2}-\d{2})"[^>]*class="rsDateHeader"/g;
  let dm;
  while ((dm = dateRe.exec(html)) !== null) {
    datePositions.push({ pos: dm.index, date: dm[1] });
  }

  // Step 2: Find all event appointments (rsAptContent with target=_blank links)
  const aptRe = /class="rsAptContent">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let am;
  while ((am = aptRe.exec(html)) !== null) {
    const block = am[1];
    const pos = am.index;

    // Find which date this belongs to
    let date = "";
    for (const dp of datePositions) {
      if (dp.pos < pos) date = dp.date;
      else break;
    }

    // Extract event link
    const linkMatch = block.match(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    if (!linkMatch) continue;

    const rawLink = linkMatch[1];
    let title = linkMatch[2].trim();
    if (!title || title === "delete" || title.length < 5) continue;
    if (rawLink.includes("etkinlik-takvimi")) continue;

    // Decode HTML entities
    title = title.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#039;/g, "'");

    const link = rawLink.startsWith("http") ? rawLink : `https://www.imo.org.tr${rawLink}`;

    let type = "etkinlik";
    const tl = title.toLocaleLowerCase("tr");
    if (tl.includes("seminer")) type = "seminer";
    else if (tl.includes("kurs") || tl.includes("eğitim")) type = "eğitim";
    else if (tl.includes("gezi")) type = "gezi";
    else if (tl.includes("genel kurul") || tl.includes("seçim")) type = "toplantı";
    else if (tl.includes("kongre") || tl.includes("konferans")) type = "kongre";

    events.push({ title, date: date || new Date().toISOString().split("T")[0], link, type });
  }

  // Deduplicate
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
    const resp = await fetch("https://www.imo.org.tr/TR,76726/etkinlik-takvimi.html", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MuhendisAI/1.0)", Accept: "text/html" },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: "İMO etkinlik takvimi sayfasına erişilemedi" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await resp.text();
    const events = parseEventsFromHtml(html);
    console.log("Parsed events:", events.length);

    events.sort((a, b) => a.date.localeCompare(b.date));
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