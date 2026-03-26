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

function classifyEvent(title: string): string {
  const tl = title.toLocaleLowerCase("tr");
  if (tl.includes("seminer")) return "seminer";
  if (tl.includes("kurs") || tl.includes("eğitim")) return "eğitim";
  if (tl.includes("gezi")) return "gezi";
  if (tl.includes("genel kurul") || tl.includes("seçim")) return "toplantı";
  if (tl.includes("kongre") || tl.includes("konferans")) return "kongre";
  return "etkinlik";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&raquo;/g, "»")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

function parseEventsFromHtml(html: string): EventItem[] {
  const events: EventItem[] = [];

  // Step 1: Build date position map from rsDateHeader anchors
  const datePositions: { pos: number; date: string }[] = [];
  const dateRe = /href="#(\d{4}-\d{2}-\d{2})"[^>]*class="rsDateHeader"/g;
  let dm;
  while ((dm = dateRe.exec(html)) !== null) {
    datePositions.push({ pos: dm.index, date: dm[1] });
  }

  // Step 2: Method A — rsAptContent blocks with links
  const aptRe = /class="rsAptContent">([\s\S]*?)<\/div>/g;
  let am;
  while ((am = aptRe.exec(html)) !== null) {
    const block = am[1];
    const pos = am.index;

    let date = "";
    for (const dp of datePositions) {
      if (dp.pos < pos) date = dp.date;
      else break;
    }

    const linkMatch = block.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;

    const rawLink = linkMatch[1];
    let title = linkMatch[2].replace(/<[^>]*>/g, "").trim();
    title = decodeEntities(title);
    if (!title || title.toLowerCase() === "delete" || title.length < 5) continue;
    if (rawLink.includes("etkinlik-takvimi")) continue;

    const link = rawLink.startsWith("http") ? rawLink : `https://www.imo.org.tr${rawLink}`;
    events.push({ title, date: date || new Date().toISOString().split("T")[0], link, type: classifyEvent(title) });
  }

  // Step 3: Method B — rsApt divs with title attribute (fallback)
  if (events.length === 0) {
    const rsAptRe = /class="rsApt[^"]*"[^>]*title="([^"]+)"[\s\S]*?href="([^"]+)"/g;
    let rm;
    while ((rm = rsAptRe.exec(html)) !== null) {
      let title = decodeEntities(rm[1]).trim();
      const rawLink = rm[2];
      if (!title || title.length < 5 || rawLink.includes("etkinlik-takvimi")) continue;

      const pos = rm.index;
      let date = "";
      for (const dp of datePositions) {
        if (dp.pos < pos) date = dp.date;
        else break;
      }

      const link = rawLink.startsWith("http") ? rawLink : `https://www.imo.org.tr${rawLink}`;
      events.push({ title, date: date || new Date().toISOString().split("T")[0], link, type: classifyEvent(title) });
    }
  }

  // Step 4: Method C — any link to /TR,DIGITS/ within calendar area (broadest fallback)
  if (events.length === 0) {
    const calStart = html.indexOf("RadScheduler");
    const calEnd = html.lastIndexOf("RadScheduler");
    const calHtml = calStart > -1 ? html.substring(calStart, calEnd > calStart ? calEnd + 5000 : html.length) : html;

    const broadRe = /<a[^>]*href="((?:https?:\/\/www\.imo\.org\.tr)?\/TR,(\d+)\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let bm;
    while ((bm = broadRe.exec(calHtml)) !== null) {
      const rawLink = bm[1];
      let title = bm[3].replace(/<[^>]*>/g, "").trim();
      title = decodeEntities(title);

      if (!title || title.length < 5 || title.toLowerCase() === "delete") continue;
      if (rawLink.includes("etkinlik-takvimi") || rawLink.includes("ana-sayfa")) continue;

      const link = rawLink.startsWith("http") ? rawLink : `https://www.imo.org.tr${rawLink}`;
      events.push({ title, date: new Date().toISOString().split("T")[0], link, type: classifyEvent(title) });
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
    const resp = await fetch("https://www.imo.org.tr/TR,76726/etkinlik-takvimi.html", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      console.error("IMO page status:", resp.status);
      return new Response(
        JSON.stringify({ error: "İMO etkinlik takvimi sayfasına erişilemedi" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await resp.text();
    console.log("HTML length:", html.length, "has rsDateHeader:", html.includes("rsDateHeader"), "has rsAptContent:", html.includes("rsAptContent"));

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
