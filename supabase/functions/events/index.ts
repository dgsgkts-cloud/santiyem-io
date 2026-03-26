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

  // HTML structure: rsDateHeader anchors contain date in href like #2026-03-05
  // Following rsAptContent divs contain event links
  // We track current date from rsDateHeader, then collect events until next date
  
  let currentDate = "";
  
  // Find all date headers and event links
  // rsDateHeader: <a href="...#2026-03-15" title="..." class="rsDateHeader">
  // Event links: <a target="_blank" href="https://www.imo.org.tr/TR,XXXXX/...">TITLE</a>
  const tokenRegex = /href="[^#]*#(\d{4}-\d{2}-\d{2})"[^>]*class="rsDateHeader"|<a[^>]*target="_blank"[^>]*href="(https:\/\/www\.imo\.org\.tr\/TR,\d+\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  
  while ((m = tokenRegex.exec(html)) !== null) {
    if (m[1]) {
      // Date header found
      currentDate = m[1];
    } else if (m[2] && m[3]) {
      // Event link found
      const link = m[2];
      const title = m[3].replace(/<[^>]*>/g, "").trim();
      
      if (!title || title.length < 3 || title.toLowerCase() === "delete") continue;
      if (link.includes("etkinlik-takvimi")) continue;
      
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