import { useState, useEffect } from "react";
import { Calendar, ExternalLink, Loader2, RefreshCw, GraduationCap, Mic2, MapPin, Users, Award } from "lucide-react";
import { fetchEvents, type EventItem } from "@/lib/eventsApi";
import { toast } from "sonner";

const TYPE_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  seminer: { label: "Seminer", icon: <Mic2 className="w-3.5 h-3.5" />, color: "bg-primary/10 text-primary border-primary/20" },
  eğitim: { label: "Eğitim/Kurs", icon: <GraduationCap className="w-3.5 h-3.5" />, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  gezi: { label: "Teknik Gezi", icon: <MapPin className="w-3.5 h-3.5" />, color: "bg-accent/10 text-accent border-accent/20" },
  toplantı: { label: "Toplantı", icon: <Users className="w-3.5 h-3.5" />, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  kongre: { label: "Kongre", icon: <Award className="w-3.5 h-3.5" />, color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  etkinlik: { label: "Etkinlik", icon: <Calendar className="w-3.5 h-3.5" />, color: "bg-muted text-muted-foreground border-border" },
};

const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function formatEventDate(dateStr: string): { dayName: string; dayNum: string; month: string; isToday: boolean; isTomorrow: boolean } {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return {
    dayName: DAY_NAMES[d.getDay()],
    dayNum: d.getDate().toString(),
    month: MONTH_NAMES[d.getMonth()],
    isToday: d.getTime() === today.getTime(),
    isTomorrow: d.getTime() === tomorrow.getTime(),
  };
}

function EventCard({ event }: { event: EventItem }) {
  const typeInfo = TYPE_MAP[event.type] || TYPE_MAP.etkinlik;
  const dateInfo = formatEventDate(event.date);

  return (
    <a
      href={event.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-4 glass-card rounded-lg p-4 hover:ring-2 hover:ring-primary/20 transition-all group"
    >
      {/* Date badge */}
      <div className={`shrink-0 w-14 text-center rounded-lg p-2 ${dateInfo.isToday ? "bg-primary text-primary-foreground" : dateInfo.isTomorrow ? "bg-accent/20" : "bg-secondary"}`}>
        <p className={`text-lg font-bold leading-tight ${dateInfo.isToday ? "" : "text-foreground"}`}>{dateInfo.dayNum}</p>
        <p className={`text-[10px] leading-tight ${dateInfo.isToday ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{dateInfo.month}</p>
        <p className={`text-[9px] mt-0.5 ${dateInfo.isToday ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {dateInfo.isToday ? "Bugün" : dateInfo.isTomorrow ? "Yarın" : dateInfo.dayName}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border mb-1.5 ${typeInfo.color}`}>
          {typeInfo.icon}
          {typeInfo.label}
        </span>
        <h3 className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {event.title}
        </h3>
      </div>

      <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

const EventsPanel = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await fetchEvents();
      setEvents(data.events);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Etkinlikler alınamadı");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Etkinlik Takvimi
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            İMO seminer, eğitim ve etkinlik duyuruları
          </p>
        </div>
        <button
          onClick={loadEvents}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      {loading && events.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Etkinlikler yükleniyor...</span>
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Yaklaşan etkinlik bulunamadı</p>
          <a
            href="https://www.imo.org.tr/TR,76726/etkinlik-takvimi.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-2 inline-block"
          >
            İMO Etkinlik Takvimi →
          </a>
        </div>
      )}

      <div className="space-y-3">
        {events.map((event, i) => (
          <EventCard key={`${event.link}-${i}`} event={event} />
        ))}
      </div>

      {events.length > 0 && (
        <div className="text-center mt-6">
          <a
            href="https://www.imo.org.tr/TR,76726/etkinlik-takvimi.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Tüm etkinlikleri İMO sayfasında görüntüle →
          </a>
        </div>
      )}
    </div>
  );
};

export default EventsPanel;