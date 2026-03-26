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
  snippet: string;
}

function extractItemsFromAtom(xml: string, source: string, category: string): NewsItem[] {
  const items: NewsItem[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "";
    const link = block.match(/<link[^>]*href="([^"]*)"/)?.[1] || "";
    const updated = block.match(/<updated>(.*?)<\/updated>/)?.[1] || block.match(/<published>(.*?)<\/published>/)?.[1] || "";
    const summary = block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1]?.replace(/<[^>]*>/g, "").trim() || "";
    if (title) items.push({ title, link: link.trim(), date: updated ? new Date(updated).toISOString() : "", source, category, snippet: summary.slice(0, 200) });
  }
  return items.slice(0, 20);
}

function extractItemsFromRss(xml: string, source: string, category: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch?.[1]?.trim() || "";
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/) || block.match(/<link[^>]*href="([^"]*)"/);
    const link = linkMatch?.[1]?.trim() || "";
    const guidMatch = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
    const finalLink = link || guidMatch?.[1]?.trim() || "";
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/);
    const desc = descMatch?.[1]?.replace(/<[^>]*>/g, "").trim() || "";
    if (title) items.push({ title, link: finalLink, date: pubDate ? new Date(pubDate).toISOString() : "", source, category, snippet: desc.slice(0, 200) });
  }
  return items.slice(0, 20);
}

async function scrapeImoNews(): Promise<NewsItem[]> {
  try {
    const resp = await fetch("https://www.imo.org.tr/TR,75842/genel-merkez-guncel-haberler.html", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MuhendisAI/1.0)", Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const items: NewsItem[] = [];
    const seen = new Set<string>();
    const aRegex = /<a[^>]*href="((?:https?:\/\/www\.imo\.org\.tr)?\/TR,(\d+)\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let cm;
    while ((cm = aRegex.exec(html)) !== null) {
      const rawLink = cm[1];
      const block = cm[3];
      const boldMatch = block.match(/<b>([\s\S]*?)<\/b>/i) || block.match(/<strong>([\s\S]*?)<\/strong>/i);
      if (!boldMatch) continue;
      const title = boldMatch[1].replace(/<[^>]*>/g, "").trim();
      if (!title || title.length < 10) continue;
      const link = rawLink.startsWith("http") ? rawLink : `https://www.imo.org.tr${rawLink}`;
      if (link.includes("genel-merkez-guncel-haberler") || link.includes("ana-sayfa")) continue;
      if (seen.has(link)) continue;
      seen.add(link);
      const afterBold = block.substring(block.indexOf(boldMatch[0]) + boldMatch[0].length);
      const snippet = afterBold.replace(/<[^>]*>/g, "").replace(/Detaylar İçin Tıklayınız\s*»?/gi, "").replace(/\s+/g, " ").trim().slice(0, 200);
      const fullText = block.replace(/<[^>]*>/g, " ");
      const dateRegex = /(\d{1,2})[.\s]+((?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)|\d{1,2})[.\s]+(\d{4})/i;
      const dateFound = fullText.match(dateRegex);
      let itemDate = "";
      if (dateFound) {
        const months: Record<string, number> = { ocak: 0, "\u015fubat": 1, mart: 2, nisan: 3, "may\u0131s": 4, haziran: 5, temmuz: 6, "a\u011fustos": 7, "eyl\u00fcl": 8, ekim: 9, "kas\u0131m": 10, "aral\u0131k": 11 };
        const day = parseInt(dateFound[1]);
        const monthStr = dateFound[2].toLowerCase();
        const month = months[monthStr] !== undefined ? months[monthStr] : parseInt(dateFound[2]) - 1;
        const year = parseInt(dateFound[3]);
        itemDate = new Date(year, month, day).toISOString();
      }
      items.push({ title, link, date: itemDate, source: "İMO Güncel", category: "duyuru", snippet });
    }
    return items.slice(0, 20);
  } catch (e) {
    console.error("IMO scrape error:", e);
    return [];
  }
}

async function scrapeResmiGazete(): Promise<NewsItem[]> {
  try {
    const resp = await fetch("https://www.resmigazete.gov.tr/default.aspx", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MuhendisAI/1.0)", Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const items: NewsItem[] = [];
    const dateMatch = html.match(/(\d{1,2}\s+\w+\s+\d{4})\s+Tarihli/);
    const dateStr = dateMatch ? dateMatch[1] : "";
    const linkRegex = /<a[^>]*href="(https?:\/\/www\.resmigazete\.gov\.tr\/eskiler\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
      const link = m[1];
      let title = m[2].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().replace(/^[–—]+\s*/, "");
      if (!title || title.length < 15) continue;
      items.push({ title, link, date: new Date().toISOString(), source: "Resmi Gazete", category: "mevzuat", snippet: dateStr ? `${dateStr} tarihli Resmi Gazete'de yayımlandı.` : "" });
    }
    return items.slice(0, 15);
  } catch (e) {
    console.error("Resmi Gazete scrape error:", e);
    return [];
  }
}

async function fetchFeed(url: string, source: string, category: string): Promise<NewsItem[]> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MuhendisAI/1.0)", Accept: "application/rss+xml, application/atom+xml, text/xml" },
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return [];
    const xml = await resp.text();
    if (xml.includes("<feed") && xml.includes("<entry>")) return extractItemsFromAtom(xml, source, category);
    return extractItemsFromRss(xml, source, category);
  } catch (e) {
    console.error(`Feed ${source} error:`, e);
    return [];
  }
}

const SECTOR_KEYWORDS = [
  "inşaat", "beton", "çimento", "donatı", "kalıp", "iskele",
  "konut", "deprem", "imar", "ruhsat", "müteahhit", "şantiye",
  "kolon", "kiriş", "betonarme", "prefabrik", "güçlendirme",
  "kentsel dönüşüm", "köprü", "tünel", "baraj", "zemin",
  "sondaj", "kazık", "istinat", "yalıtım", "mantolama",
  "yapı denetim", "metraj", "hakediş", "toki", "hafriyat",
];

function classifyCategory(item: NewsItem): string {
  if (item.category === "mevzuat" || item.category === "duyuru") return item.category;
  const text = `${item.title} ${item.snippet}`.toLocaleLowerCase("tr");
  return SECTOR_KEYWORDS.some((kw) => text.includes(kw)) ? "sektör" : "genel";
}

// Fast O(n) dedup using normalized title keys
function dedupe(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const result: NewsItem[] = [];
  for (const item of items) {
    // Normalize: lowercase, strip punctuation, collapse whitespace, take first 50 chars
    const key = item.title
      .replace(/&#?\w+;/g, " ")
      .toLocaleLowerCase("tr")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50);
    if (!key || seen.has(key)) continue;
    // Also check link dedup
    const linkKey = item.link?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "";
    if (linkKey && seen.has(linkKey)) continue;
    seen.add(key);
    if (linkKey) seen.add(linkKey);
    result.push(item);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const feeds = [
      { url: "https://www.csb.gov.tr/rss", source: "Çevre ve Şehircilik Bakanlığı", category: "mevzuat" },
      { url: "https://www.yapi.com.tr/rss/haberler.xml", source: "Yapı Dergisi", category: "sektör" },
      { url: "https://www.emlakkulisi.com/rss", source: "Emlak Kulisi", category: "sektör" },
      { url: "https://www.arkitera.com/feed/", source: "Arkitera", category: "sektör" },
      { url: "https://www.donanimhaber.com/rss/tum/", source: "DonanımHaber", category: "genel" },
      { url: "https://www.hurriyet.com.tr/rss/gundem", source: "Hürriyet", category: "genel" },
      { url: "https://www.dha.com.tr/rss/", source: "DHA", category: "genel" },
    ];

    const [rssResults, imoNews, rgNews] = await Promise.all([
      Promise.allSettled(feeds.map((f) => fetchFeed(f.url, f.source, f.category))),
      scrapeImoNews(),
      scrapeResmiGazete(),
    ]);

    const allItems: NewsItem[] = [...imoNews, ...rgNews];
    for (const r of rssResults) {
      if (r.status === "fulfilled") allItems.push(...r.value);
    }

    // Sort by date descending
    allItems.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    });

    // Fast dedup + classify
    const deduped = dedupe(allItems);
    for (const item of deduped) {
      item.category = classifyCategory(item);
    }

    const news = deduped.slice(0, 80);

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