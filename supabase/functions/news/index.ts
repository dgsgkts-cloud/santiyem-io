import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NewsItem {
  title: string;
  link: string;
  date: string;
  source: string;
  category: string;
}

function extractItems(xml: string, source: string, category: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] || block.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

    if (title) {
      items.push({
        title: title.trim(),
        link: link.trim(),
        date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        source,
        category,
      });
    }
  }

  return items;
}

const CONSTRUCTION_KEYWORDS = [
  "inşaat", "yapı", "imar", "deprem", "beton", "çimento", "demir", "çelik",
  "müteahhit", "yönetmelik", "mühendis", "mimar", "iskân", "ruhsat",
  "kentsel dönüşüm", "afet", "zemin", "temel", "konut", "bina",
  "altyapı", "üstyapı", "tünel", "köprü", "baraj", "yol", "taşeron",
  "iş güvenliği", "isg", "şantiye", "tmmob", "tbmm", "çevre",
];

function isConstructionRelated(title: string): boolean {
  const lower = title.toLocaleLowerCase("tr");
  return CONSTRUCTION_KEYWORDS.some((kw) => lower.includes(kw));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const feeds = [
      {
        url: "https://www.resmigazete.gov.tr/rss/eskiler.xml",
        source: "Resmi Gazete",
        category: "mevzuat",
      },
      {
        url: "https://www.tmmob.org.tr/feed",
        source: "TMMOB",
        category: "duyuru",
      },
      {
        url: "https://www.imo.org.tr/TR/RSS/1/tum-haberler.rss",
        source: "İnşaat Mühendisleri Odası",
        category: "sektör",
      },
    ];

    const allItems: NewsItem[] = [];

    const results = await Promise.allSettled(
      feeds.map(async (feed) => {
        try {
          const resp = await fetch(feed.url, {
            headers: { "User-Agent": "MuhendisAI/1.0" },
          });
          if (!resp.ok) {
            console.error(`Feed error ${feed.source}:`, resp.status);
            return [];
          }
          const xml = await resp.text();
          return extractItems(xml, feed.source, feed.category);
        } catch (e) {
          console.error(`Feed fetch error ${feed.source}:`, e);
          return [];
        }
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      }
    }

    // Filter construction-related from Resmi Gazete, keep all from TMMOB/IMO
    const filtered = allItems.filter((item) => {
      if (item.source === "Resmi Gazete") {
        return isConstructionRelated(item.title);
      }
      return true;
    });

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Limit to 30
    const news = filtered.slice(0, 30);

    return new Response(
      JSON.stringify({ news, total: news.length, fetched_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("news error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});