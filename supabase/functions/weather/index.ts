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

  for (const day of days.slice(0, 3)) {
    if (day.temp_max > 35) {
      alerts.push({
        type: "warning",
        icon: "🌡️",
        title: `Yüksek Sıcaklık: ${day.date}`,
        description: `${Math.round(day.temp_max)}°C — kür sulamasına dikkat, beton çatlama riski.`,
      });
      break;
    }
  }

  for (const day of days.slice(0, 3)) {
    if (day.temp_min < 5) {
      alerts.push({
        type: "danger",
        icon: "❄️",
        title: `Don Riski: ${day.date}`,
        description: `${Math.round(day.temp_min)}°C — beton dökümü uygun değil, donma riski var.`,
      });
      break;
    }
  }

  for (const day of days.slice(0, 3)) {
    if (day.wind_speed > 50) {
      alerts.push({
        type: "danger",
        icon: "💨",
        title: `Şiddetli Rüzgar: ${day.date}`,
        description: `${Math.round(day.wind_speed)} km/s — vinç operasyonlarını durdurun.`,
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

    const API_KEY = Deno.env.get("WEATHER_API_KEY");
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "WEATHER_API_KEY yapılandırılmamış" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let query: string;
    if (lat && lon) {
      query = `${lat},${lon}`;
    } else if (city) {
      query = city;
    } else {
      return new Response(
        JSON.stringify({ error: "Konum bilgisi gerekli (lat/lon veya city)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(query)}&days=5&lang=tr&aqi=no`;
    console.log("WeatherAPI request:", url.replace(API_KEY, "***"));

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("WeatherAPI error:", response.status, errorText);

      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "WeatherAPI anahtarı geçersiz. Lütfen kontrol edin." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Hava durumu sağlayıcısından veri alınamadı." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("WeatherAPI response city:", data.location?.name);

    const days: ForecastDay[] = data.forecast.forecastday.map((fd: any) => ({
      date: fd.date,
      temp_min: fd.day.mintemp_c,
      temp_max: fd.day.maxtemp_c,
      humidity: fd.day.avghumidity,
      wind_speed: fd.day.maxwind_kph,
      description: fd.day.condition.text,
      icon: fd.day.condition.icon,
      rain_probability: fd.day.daily_chance_of_rain,
      rain_mm: fd.day.totalprecip_mm,
    }));

    const alerts = generateAlerts(days);

    return new Response(
      JSON.stringify({
        city: data.location.name,
        country: data.location.country,
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
