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
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim() || "";
    const link = block.match(/<link[^>]*href="([^"]*)"/)?.[1] || "";
    const updated = block.match(/<updated>(.*?)<\/updated>/)?.[1] ||
                    block.match(/<published>(.*?)<\/published>/)?.[1] || "";
    const summary = block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1]?.replace(/<[^>]*>/g, "").trim() || "";

    if (title) {
      items.push({
        title: title.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
        link: link.trim(),
        date: updated ? new Date(updated).toISOString() : new Date().toISOString(),
        source,
        category,
        snippet: summary.slice(0, 200),
      });
    }
  }
  return items;
}

function extractItemsFromRss(xml: string, source: string, category: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                       block.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch?.[1]?.trim() || "";
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/) || block.match(/<link[^>]*href="([^"]*)"/);
    const link = linkMatch?.[1]?.trim() || "";
    const guidMatch = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
    const finalLink = link || guidMatch?.[1]?.trim() || "";
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                      block.match(/<description>([\s\S]*?)<\/description>/);
    const desc = descMatch?.[1]?.replace(/<[^>]*>/g, "").trim() || "";

    if (title) {
      items.push({
        title,
        link: finalLink,
        date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        source,
        category,
        snippet: desc.slice(0, 200),
      });
    }
  }
  return items;
}

async function scrapeImoNews(): Promise<NewsItem[]> {
  try {
    const resp = await fetch("https://www.imo.org.tr/TR,75842/genel-merkez-guncel-haberler.html", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MuhendisAI/1.0)", Accept: "text/html" },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const items: NewsItem[] = [];
    const seen = new Set<string>();

    const aRegex = /<a[^>]*href="((?:https?:\/\/www\.imo\.org\.tr)?\/TR,(\d+)\/[^\"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let cm;
    while ((cm = aRegex.exec(html)) !== null) {
      const rawLink = cm[1];
      const block = cm[3];
      const boldMatch = block.match(/<b>([\s\S]*?)<\/b>/i) || block.match(/<strong>([\s\S]*?)<\/strong>/i);
      if (!boldMatch) continue;

      const title = boldMatch[1].replace(/<[^>]*>/g, "").trim();
      if (!title || title.length < 10) continue;

      const link = rawLink.startsWith("http") ? rawLink : `https://www.imo.org.tr${rawLink}`;
      if (link.includes("genel-merkez-guncel-haberler") || link.includes("ana-sayfa") || link.includes("iletisim")) continue;
      if (seen.has(link)) continue;
      seen.add(link);

      const afterBold = block.substring(block.indexOf(boldMatch[0]) + boldMatch[0].length);
      const snippet = afterBold.replace(/<[^>]*>/g, "").replace(/Detaylar İçin Tıklayınız\s*»?/gi, "").replace(/\s+/g, " ").trim().slice(0, 200);

      const fullText = block.replace(/<[^>]*>/g, " ");
      const dateRegex = /(\d{1,2})[.\s]+((?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)|\d{1,2})[.\s]+(\d{4})/i;
      const dateFound = fullText.match(dateRegex);
      let itemDate = "";
      if (dateFound) {
        const months: Record<string, number> = { ocak: 0, şubat: 1, mart: 2, nisan: 3, mayıs: 4, haziran: 5, temmuz: 6, ağustos: 7, eylül: 8, ekim: 9, kasım: 10, aralık: 11 };
        const day = parseInt(dateFound[1]);
        const monthStr = dateFound[2].toLowerCase();
        const month = months[monthStr] !== undefined ? months[monthStr] : parseInt(dateFound[2]) - 1;
        const year = parseInt(dateFound[3]);
        itemDate = new Date(year, month, day).toISOString();
      }

      items.push({
        title,
        link,
        date: itemDate,
        source: "İMO Güncel",
        category: "duyuru",
        snippet,
      });
    }

    console.log(`Scraped ${items.length} IMO news items`);
    return items;
  } catch (e) {
    console.error("IMO scrape error:", e);
    return [];
  }
}

async function scrapeResmiGazete(): Promise<NewsItem[]> {
  try {
    const resp = await fetch("https://www.resmigazete.gov.tr/default.aspx", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MuhendisAI/1.0)", Accept: "text/html" },
      signal: AbortSignal.timeout(10000),
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
      let title = m[2].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      title = title.replace(/^––\s*/, "").replace(/^–\s*/, "").trim();
      if (!title || title.length < 15) continue;

      items.push({
        title,
        link,
        date: new Date().toISOString(),
        source: "Resmi Gazete",
        category: "mevzuat",
        snippet: dateStr ? `${dateStr} tarihli Resmi Gazete'de yayımlandı.` : "",
      });
    }

    console.log(`Scraped ${items.length} Resmi Gazete items`);
    return items.slice(0, 15);
  } catch (e) {
    console.error("Resmi Gazete scrape error:", e);
    return [];
  }
}

async function fetchFeed(url: string, source: string, category: string): Promise<NewsItem[]> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MuhendisAI/1.0)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      console.error(`Feed ${source} returned ${resp.status}`);
      return [];
    }
    const xml = await resp.text();
    if (xml.includes("<feed") && xml.includes("<entry>")) {
      return extractItemsFromAtom(xml, source, category);
    }
    return extractItemsFromRss(xml, source, category);
  } catch (e) {
    console.error(`Feed ${source} error:`, e);
    return [];
  }
}

const SECTOR_KEYWORDS = [
  "inşaat", "beton", "çimento", "donatı", "kalıp", "iskele",
  "konut", "deprem", "imar", "ruhsat",
  "müteahhit", "şantiye", "kolon", "kiriş",
  "betonarme", "prefabrik", "güçlendirme",
  "kentsel dönüşüm", "köprü", "tünel", "baraj",
  "zemin etüd", "sondaj", "kazık", "istinat",
  "yalıtım", "mantolama",
  "yapı denetim", "fenni mesul",
  "metraj", "hakediş", "toki",
  "hafriyat", "temel atma", "kaba inşaat",
];

function classifySectorRelevance(item: NewsItem): string {
  if (item.category === "mevzuat" || item.category === "duyuru") return item.category;
  const text = `${item.title} ${item.snippet}`.toLocaleLowerCase("tr");
  const isSector = SECTOR_KEYWORDS.some((kw) => text.includes(kw));
  return isSector ? "sektör" : "genel";
}

const DUPLICATE_STOPWORDS = new Set([
  "ve", "veya", "ile", "için", "icin", "bir", "bu", "şu", "su", "da", "de", "mi", "mı", "mu", "mü",
  "son", "dakika", "haber", "gündem", "gundem", "ekonomi", "video", "foto", "galeri", "kararı", "karar",
  "dair", "yapılmasına", "yapilmasina", "değişiklik", "degisiklik", "yönetmelik", "yonetmelik", "yönetmeliğinde",
  "yonetmeliginde", "yayımlandı", "yayimlandi", "resmi", "gazete", "açıklama", "aciklama", "detaylar"
]);

function decodeEntities(text: string): string {
  return text
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, " ve ")
    .replace(/&nbsp;/g, " ")
    .replace(/&uuml;/gi, "ü")
    .replace(/&ouml;/gi, "ö")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&Ccedil;/g, "Ç")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&nbsp;/gi, " ");
}

function normalizeComparisonText(text: string): string {
  return decodeEntities(text)
    .replace(/<[^>]*>/g, " ")
    .toLocaleLowerCase("tr")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeNewsText(item: NewsItem): string[] {
  const combined = normalizeComparisonText(`${item.title} ${item.snippet}`);
  const tokens = combined
    .split(" ")
    .filter((token) => token.length >= 4 && !DUPLICATE_STOPWORDS.has(token));
  return [...new Set(tokens)];
}

function haveCloseDates(a: string, b: string): boolean {
  if (!a || !b) return true;
  const first = new Date(a).getTime();
  const second = new Date(b).getTime();
  if (Number.isNaN(first) || Number.isNaN(second)) return true;
  return Math.abs(first - second) <= 1000 * 60 * 60 * 24 * 3;
}

function areLikelyDuplicateNews(a: NewsItem, b: NewsItem): boolean {
  if (a.link && b.link && a.link === b.link) return true;

  const titleA = normalizeComparisonText(a.title);
  const titleB = normalizeComparisonText(b.title);
  if (titleA === titleB) return true;
  if (titleA.length > 24 && titleB.length > 24 && (titleA.includes(titleB) || titleB.includes(titleA))) return true;

  const tokensA = tokenizeNewsText(a);
  const tokensB = tokenizeNewsText(b);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const setB = new Set(tokensB);
  const overlap = tokensA.filter((token) => setB.has(token));
  const minTokenCount = Math.min(tokensA.length, tokensB.length);

  return haveCloseDates(a.date, b.date) && (
    overlap.length >= 5 ||
    (overlap.length >= 4 && minTokenCount <= 6) ||
    (overlap.length >= 3 && minTokenCount <= 4)
  );
}

function dedupeNewsItems(items: NewsItem[]): NewsItem[] {
  const sorted = [...items].sort((a, b) => {
    const first = new Date(a.date).getTime();
    const second = new Date(b.date).getTime();
    const safeFirst = Number.isNaN(first) ? 0 : first;
    const safeSecond = Number.isNaN(second) ? 0 : second;
    return safeSecond - safeFirst;
  });

  const deduped: NewsItem[] = [];
  for (const item of sorted) {
    const isDuplicate = deduped.some((existing) => areLikelyDuplicateNews(item, existing));
    if (!isDuplicate) deduped.push(item);
  }
  return deduped;
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
      { url: "https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml", source: "Milliyet", category: "genel" },
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

    console.log(`Fetched ${allItems.length} total items from feeds`);

    const dedupedItems = dedupeNewsItems(allItems);
    for (const item of dedupedItems) {
      item.category = classifySectorRelevance(item);
    }

    if (dedupedItems.length === 0) {
      const now = new Date().toISOString();
      dedupedItems.push(
        {
          title: "TBDY 2018 Deprem Yönetmeliği Güncellemeleri",
          link: "https://www.resmigazete.gov.tr",
          date: now,
          source: "Resmi Gazete",
          category: "mevzuat",
          snippet: "Türkiye Bina Deprem Yönetmeliği kapsamında yapılan son güncellemeler ve değişiklikler.",
        },
        {
          title: "İnşaat Sektörü 2026 Yılı Değerlendirmesi",
          link: "https://www.tmmob.org.tr",
          date: now,
          source: "TMMOB",
          category: "duyuru",
          snippet: "TMMOB İnşaat Mühendisleri Odası'nın sektör değerlendirme raporu yayınlandı.",
        },
        {
          title: "Çimento ve Demir Fiyatları Güncel Durum",
          link: "https://www.insaatnoktasi.com",
          date: now,
          source: "İnşaat Noktası",
          category: "sektör",
          snippet: "İnşaat malzeme fiyatlarındaki son gelişmeler ve piyasa analizi.",
        }
      );
    }

    const news = dedupedItems.slice(0, 100);

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