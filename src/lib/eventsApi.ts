const EVENTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/events`;

export interface EventItem {
  title: string;
  date: string;
  link: string;
  type: string;
}

export interface EventsData {
  events: EventItem[];
  total: number;
  fetched_at: string;
}

export async function fetchEvents(): Promise<EventsData> {
  const resp = await fetch(EVENTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({}),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Bağlantı hatası" }));
    throw new Error(data.error || "Etkinlikler alınamadı");
  }

  return resp.json();
}