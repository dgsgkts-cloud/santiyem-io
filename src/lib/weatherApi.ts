const WEATHER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather`;

export interface ForecastDay {
  date: string;
  temp_min: number;
  temp_max: number;
  humidity: number;
  wind_speed: number;
  description: string;
  icon: string;
  rain_probability: number;
  rain_mm: number;
}

export interface ConstructionAlert {
  type: "danger" | "warning" | "info";
  icon: string;
  title: string;
  description: string;
}

export interface WeatherData {
  city: string;
  country: string;
  forecast: ForecastDay[];
  alerts: ConstructionAlert[];
}

export async function fetchWeather(params: { lat?: number; lon?: number; city?: string }): Promise<WeatherData> {
  const resp = await fetch(WEATHER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(params),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Bağlantı hatası" }));
    throw new Error(data.error || "Hava durumu alınamadı");
  }

  return resp.json();
}
