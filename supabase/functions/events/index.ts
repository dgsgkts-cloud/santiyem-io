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

function parseEvents(html: string): EventItem[] {
  const events: EventItem[] = [];

  // Match calendar cells with events: date links followed by event links
  // Pattern: date anchor with title like "DD.MM.YYYY" followed by event link
  const cellRegex = /href="[^"]*#(\d{4}-\d{2}-\d{2})"[^>]*title="[^"]*"[^>]*>[\s\S]*?<\/a>([\s\S]*?)(?=<\/td|<td)/g;
  let cellMatch;

  while ((cellMatch = cellRegex.exec(html)) !== null) {
    const date = cellMatch[1];
    const cellContent = cellMatch[2];

    // Find event links within the cell
    const eventRegex = /<a[^>]*href="(https:\/\/www\.imo\.org\.tr\/TR,[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    let eventMatch;

    while ((eventMatch = eventRegex.exec(cellContent)) !== null) {
      const link = eventMatch[1];
      let title = eventMatch[2].replace(/<[^>]*>/g, "").trim();

      // Skip "delete" links
      if (title.toLowerCase() === "delete" || !title) continue;

      // Determine event type
      let type = "etkinlik";
      const titleLower = title.toLocaleLowerCase("tr");
      if (titleLower.includes("seminer")) type = "seminer";
      else if (titleLower.includes("kurs") || titleLower.includes("eğitim")) type = "eğitim";
      else if (titleLower.includes("gezi")) type = "gezi";
      else if (titleLower.includes("genel kurul") || titleLower.includes("seçim")) type = "toplantı";
      else if (titleLower.includes("kongre") || titleLower.includes("konferans")) type = "kongre";

      events.push({ title, date, link, type });
    }
  }

  return events;
}

// Fallback: parse from markdown-like text
function parseEventsFromText(text: string): EventItem[] {
  const events: EventItem[] = [];
  // Match patterns like: [EVENT TITLE](https://www.imo.org.tr/TR,XXXXX/...)
  const regex = /\[([^\]]+)\]\((https:\/\/www\.imo\.org\.tr\/TR,\d+\/[^)]+)\)/g;
  let match;

  // Track dates from date anchors
  let currentDate = "";
  const dateRegex = /#(\d{4}-\d{2}-\d{2})/g;

  const lines = text.split("\n");
  for (const line of lines) {
    const dateMatch = line.match(/#(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) currentDate = dateMatch[1];

    const linkMatches = [...line.matchAll(/\[([^\]]+)\]\((https:\/\/www\.imo\.org\.tr\/TR,\d+\/[^)]+)\)/g)];
    for (const lm of linkMatches) {
      const title = lm[1].trim();
      const link = lm[2];

      if (title === "delete" || title.length < 5) continue;
      // Skip navigation-like links
      if (["etkinlik-takvimi", "ana-sayfa", "web-mail", "iletisim", "aydinlatma"].some(s => link.includes(s))) continue;

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

    // Try HTML parsing first, fallback to text parsing
    let events = parseEvents(html);
    if (events.length === 0) {
      events = parseEventsFromText(html);
    }

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