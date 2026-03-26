import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ForecastDay {
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

interface ConstructionAlert {
  type: "danger" | "warning" | "info";
  icon: string;
  title: string;
  description: string;
}

function generateAlerts(days: ForecastDay[]): ConstructionAlert[] {
  const alerts: ConstructionAlert[] = [];
  const today = days[0];
  const tomorrow = days[1];

  // Rain alerts for concrete
  if (today && today.rain_probability > 60) {
    alerts.push({
      type: "danger",
      icon: "🚫",
      title: "Beton Dökümü Uygun Değil",
      description: `Bugün %${Math.round(today.rain_probability)} yağmur ihtimali — beton dökümünü erteleyin.`,
    });
  } else if (tomorrow && tomorrow.rain_probability > 60) {
    alerts.push({
      type: "warning",
      icon: "⚠️",
      title: "Yarın Yağmur Bekleniyor",
      description: `Yarın %${Math.round(tomorrow.rain_probability)} yağmur ihtimali — beton planlamasını gözden geçirin.`,
    });
  }

  // High temperature alerts
  for (const day of days.slice(0, 3)) {
    if (day.temp_max > 35) {
      alerts.push({
        type: "warning",
        icon: "🌡️",
        title: `Yüksek Sıcaklık: ${day.date}`,
        description: `${Math.round(day.temp_max)}°C — kür sulamasına dikkat, beton çatlama riski. İşçi sağlığı önlemleri alın.`,
      });
      break; // Only show once
    }
  }

  // Freezing alerts
  for (const day of days.slice(0, 3)) {
    if (day.temp_min < 5) {
      alerts.push({
        type: "danger",
        icon: "❄️",
        title: `Don Riski: ${day.date}`,
        description: `${Math.round(day.temp_min)}°C — beton dökümü uygun değil, donma riski var. Antifrizi değerlendirin.`,
      });
      break;
    }
  }

  // Wind alerts
  for (const day of days.slice(0, 3)) {
    if (day.wind_speed > 50) {
      alerts.push({
        type: "danger",
        icon: "💨",
        title: `Şiddetli Rüzgar: ${day.date}`,
        description: `${Math.round(day.wind_speed)} km/s — vinç operasyonlarını durdurun, iskele kontrolü yapın.`,
      });
      break;
    } else if (day.wind_speed > 30) {
      alerts.push({
        type: "warning",
        icon: "💨",
        title: `Kuvvetli Rüzgar: ${day.date}`,
        description: `${Math.round(day.wind_speed)} km/s — yüksek çalışmalarda dikkatli olun.`,
      });
      break;
    }
  }

  // Good conditions
  if (alerts.length === 0) {
    alerts.push({
      type: "info",
      icon: "✅",
      title: "Şantiye Koşulları Uygun",
      description: "Önümüzdeki günlerde beton dökümü ve dış cephe çalışmaları için uygun hava koşulları bekleniyor.",
    });
  }

  return alerts;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, city } = await req.json();
    
    const API_KEY = Deno.env.get("OPENWEATHERMAP_API_KEY");
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENWEATHERMAP_API_KEY yapılandırılmamış" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let url: string;
    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=tr`;
    } else if (city) {
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)},TR&appid=${API_KEY}&units=metric&lang=tr`;
    } else {
      return new Response(
        JSON.stringify({ error: "Konum bilgisi gerekli (lat/lon veya city)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenWeatherMap error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Hava durumu verisi alınamadı" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Group by day and pick daily summary
    const dailyMap = new Map<string, ForecastDay>();
    
    for (const item of data.list) {
      const date = item.dt_txt.split(" ")[0];
      const existing = dailyMap.get(date);
      
      if (!existing) {
        dailyMap.set(date, {
          date,
          temp_min: item.main.temp_min,
          temp_max: item.main.temp_max,
          humidity: item.main.humidity,
          wind_speed: item.wind.speed * 3.6, // m/s to km/h
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          rain_probability: (item.pop || 0) * 100,
          rain_mm: item.rain?.["3h"] || 0,
        });
      } else {
        existing.temp_min = Math.min(existing.temp_min, item.main.temp_min);
        existing.temp_max = Math.max(existing.temp_max, item.main.temp_max);
        existing.humidity = Math.max(existing.humidity, item.main.humidity);
        existing.wind_speed = Math.max(existing.wind_speed, item.wind.speed * 3.6);
        existing.rain_probability = Math.max(existing.rain_probability, (item.pop || 0) * 100);
        existing.rain_mm += item.rain?.["3h"] || 0;
        // Use midday forecast for description
        if (item.dt_txt.includes("12:00")) {
          existing.description = item.weather[0].description;
          existing.icon = item.weather[0].icon;
        }
      }
    }

    const days = Array.from(dailyMap.values()).slice(0, 5);
    const alerts = generateAlerts(days);

    return new Response(
      JSON.stringify({
        city: data.city.name,
        country: data.city.country,
        forecast: days,
        alerts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("weather error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
