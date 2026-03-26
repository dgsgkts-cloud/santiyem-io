const NEWS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/news`;

export interface NewsItem {
  title: string;
  link: string;
  date: string;
  source: string;
  category: string;
  snippet: string;
}

export interface NewsData {
  news: NewsItem[];
  total: number;
  fetched_at: string;
}

export async function fetchNews(): Promise<NewsData> {
  const resp = await fetch(NEWS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({}),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Bağlantı hatası" }));
    throw new Error(data.error || "Haberler alınamadı");
  }

  return resp.json();
}