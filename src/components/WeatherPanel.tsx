import { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, Wind, Droplets, MapPin, Search, Loader2, ThermometerSun, AlertTriangle } from "lucide-react";
import { fetchWeather, type WeatherData, type ForecastDay, type ConstructionAlert } from "@/lib/weatherApi";
import { toast } from "sonner";

const DAY_NAMES_TR: Record<string, string> = {
  "0": "Pazar", "1": "Pazartesi", "2": "Salı", "3": "Çarşamba",
  "4": "Perşembe", "5": "Cuma", "6": "Cumartesi",
};

function formatDate(dateStr: string): { day: string; date: string } {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  return {
    day: isToday ? "Bugün" : isTomorrow ? "Yarın" : DAY_NAMES_TR[d.getDay().toString()] || "",
    date: `${d.getDate()}/${d.getMonth() + 1}`,
  };
}

function getWeatherIcon(icon: string) {
  if (icon.includes("01") || icon.includes("02")) return <Sun className="w-8 h-8 text-accent" />;
  if (icon.includes("09") || icon.includes("10")) return <CloudRain className="w-8 h-8 text-primary" />;
  return <Cloud className="w-8 h-8 text-muted-foreground" />;
}

function AlertCard({ alert }: { alert: ConstructionAlert }) {
  const bgClass = alert.type === "danger"
    ? "bg-destructive/10 border-destructive/30"
    : alert.type === "warning"
    ? "bg-amber-500/10 border-amber-500/30"
    : "bg-emerald-500/10 border-emerald-500/30";

  return (
    <div className={`rounded-lg border p-3 ${bgClass}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{alert.icon}</span>
        <div>
          <p className="text-sm font-semibold text-foreground">{alert.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
        </div>
      </div>
    </div>
  );
}

function ForecastCard({ day, isToday }: { day: ForecastDay; isToday: boolean }) {
  const { day: dayName, date } = formatDate(day.date);

  return (
    <div className={`glass-card rounded-lg p-3 text-center ${isToday ? "ring-2 ring-primary/30" : ""}`}>
      <p className="text-xs font-semibold text-foreground">{dayName}</p>
      <p className="text-[10px] text-muted-foreground">{date}</p>
      <div className="flex justify-center my-2">{getWeatherIcon(day.icon)}</div>
      <p className="text-xs text-muted-foreground capitalize">{day.description}</p>
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-center gap-1">
          <ThermometerSun className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">
            {Math.round(day.temp_min)}° / {Math.round(day.temp_max)}°
          </span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <Droplets className="w-3 h-3 text-primary" />
          <span className="text-[10px] text-muted-foreground">%{Math.round(day.rain_probability)}</span>
          <Wind className="w-3 h-3 text-muted-foreground ml-1" />
          <span className="text-[10px] text-muted-foreground">{Math.round(day.wind_speed)}km/s</span>
        </div>
      </div>
    </div>
  );
}

const POPULAR_CITIES = ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Trabzon"];

const WeatherPanel = () => {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [usingLocation, setUsingLocation] = useState(false);

  const loadWeather = async (params: { lat?: number; lon?: number; city?: string }) => {
    setLoading(true);
    try {
      const data = await fetchWeather(params);
      setWeather(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hava durumu alınamadı");
    } finally {
      setLoading(false);
    }
  };

  const handleCitySearch = () => {
    if (!city.trim()) return;
    loadWeather({ city: city.trim() });
  };

  const handleLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Tarayıcınız konum özelliğini desteklemiyor");
      return;
    }
    setUsingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setUsingLocation(false);
      },
      () => {
        toast.error("Konum erişimi reddedildi");
        setUsingLocation(false);
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <CloudRain className="w-5 h-5 text-primary" />
          Şantiye Hava Durumu
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Konumunuza göre 5 günlük tahmin ve inşaat uyarıları
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCitySearch()}
            placeholder="Şehir adı girin (ör. İstanbul)"
            className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <button
          onClick={handleCitySearch}
          disabled={loading || !city.trim()}
          className="h-10 px-4 rounded-lg chat-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
        >
          <Search className="w-4 h-4" />
          Ara
        </button>
        <button
          onClick={handleLocation}
          disabled={loading || usingLocation}
          className="h-10 px-3 rounded-lg border border-input bg-background text-sm hover:bg-secondary transition-colors disabled:opacity-40 flex items-center gap-1.5"
          title="Mevcut konumumu kullan"
        >
          <MapPin className="w-4 h-4" />
        </button>
      </div>

      {/* Quick city buttons */}
      {!weather && !loading && (
        <div className="flex flex-wrap gap-2 mb-6">
          {POPULAR_CITIES.map((c) => (
            <button
              key={c}
              onClick={() => { setCity(c); loadWeather({ city: c }); }}
              className="px-3 py-1.5 rounded-full text-xs border border-border hover:border-primary/30 hover:bg-secondary transition-all text-muted-foreground hover:text-foreground"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Hava durumu yükleniyor...</span>
        </div>
      )}

      {/* Weather data */}
      {weather && !loading && (
        <div className="space-y-4">
          {/* City header */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="font-medium text-foreground">{weather.city}</span>
            <span>•</span>
            <span>5 Günlük Tahmin</span>
          </div>

          {/* Alerts */}
          {weather.alerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-accent" />
                Şantiye Uyarıları
              </h3>
              {weather.alerts.map((alert, i) => (
                <AlertCard key={i} alert={alert} />
              ))}
            </div>
          )}

          {/* Forecast grid */}
          <div className="grid grid-cols-5 gap-2">
            {weather.forecast.map((day, i) => (
              <ForecastCard key={day.date} day={day} isToday={i === 0} />
            ))}
          </div>

          {/* Construction tips */}
          <div className="glass-card rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">🏗️ İnşaat Rehberi</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Beton Dökümü</p>
                <p>İdeal: 5°C–30°C, yağışsız, rüzgar &lt;30 km/s. Donan hava ve yağmurda dökmeyin.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Kür Sulaması</p>
                <p>35°C üstü sıcaklıklarda kür süresini artırın. İlk 7 gün kritik.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Yüksek Çalışma</p>
                <p>Rüzgar 50 km/s üstünde vinç durur. 30+ km/s dikkatli çalışın.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherPanel;
