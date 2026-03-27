import { useState, useEffect, useMemo } from "react";
import { Newspaper, ExternalLink, Loader2, RefreshCw, Scale, Megaphone, Building2, Globe, Filter, Search } from "lucide-react";
import { fetchNews, type NewsItem } from "@/lib/newsApi";
import { toast } from "sonner";

const CATEGORY_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  mevzuat: { label: "Mevzuat", icon: <Scale className="w-3.5 h-3.5" />, color: "bg-primary/10 text-primary border-primary/20" },
  duyuru: { label: "Duyuru", icon: <Megaphone className="w-3.5 h-3.5" />, color: "bg-accent/10 text-accent border-accent/20" },
  sektör: { label: "Sektör", icon: <Building2 className="w-3.5 h-3.5" />, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  genel: { label: "Genel", icon: <Globe className="w-3.5 h-3.5" />, color: "bg-muted text-muted-foreground border-border" },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 2) return "Az önce";
  if (diffMins < 60) return `${diffMins} dk önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 1) return "Bugün";
  if (diffDays === 1) return "Dün";
  if (diffDays < 7) return `${diffDays} gün önce`;
  return date.toLocaleDateString("tr-TR");
}

function NewsCard({ item }: { item: NewsItem }) {
  const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.sektör;

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block glass-card rounded-lg p-4 hover:ring-2 hover:ring-primary/20 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cat.color}`}>
              {cat.icon}
              {cat.label}
            </span>
            <span className="text-[10px] text-muted-foreground">{item.source}</span>
          </div>
          <h3 className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {item.title}
          </h3>
          <p className="text-[10px] text-muted-foreground mt-1.5">{timeAgo(item.date)}</p>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
}

const NewsPanel = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [lastFetch, setLastFetch] = useState<string>("");
  const [search, setSearch] = useState("");

  const loadNews = async () => {
    setLoading(true);
    try {
      const data = await fetchNews();
      setNews(data.news);
      setLastFetch(data.fetched_at);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Haberler alınamadı");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const filtered = useMemo(() => {
    let result = filter === "all" ? news : news.filter((n) => n.category === filter);
    if (search.trim()) {
      const q = search.toLocaleLowerCase("tr");
      result = result.filter(
        (n) =>
          n.title.toLocaleLowerCase("tr").includes(q) ||
          n.source.toLocaleLowerCase("tr").includes(q) ||
          (n.snippet && n.snippet.toLocaleLowerCase("tr").includes(q))
      );
    }
    return result;
  }, [news, filter, search]);

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6 px-3 sm:px-4 animate-fade-in overflow-x-hidden">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          Sektör Haberleri & Mevzuat
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Resmi Gazete, TMMOB ve İMO'dan güncel haberler
        </p>
      </div>

      {/* Filters & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {[
            { key: "all", label: "Tümü" },
            { key: "sektör", label: "Sektör" },
            { key: "mevzuat", label: "Mevzuat" },
            { key: "duyuru", label: "Duyurular" },
            { key: "genel", label: "Genel" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium transition-all ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={loadNews}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary disabled:opacity-40 self-end sm:self-auto shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Haberlerde ara..."
          className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {/* Loading */}
      {loading && news.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Haberler yükleniyor...</span>
        </div>
      )}

      {/* News list */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Bu kategoride haber bulunamadı</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((item, i) => (
          <NewsCard key={`${item.link}-${i}`} item={item} />
        ))}
      </div>

      {/* Footer */}
      {lastFetch && !loading && (
        <p className="text-[10px] text-muted-foreground text-center mt-6">
          Son güncelleme: {new Date(lastFetch).toLocaleTimeString("tr-TR")}
        </p>
      )}
    </div>
  );
};

export default NewsPanel;