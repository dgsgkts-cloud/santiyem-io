import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { tr } from "date-fns/locale";
import { Users, Clock, Calendar, HardHat, RefreshCw } from "lucide-react";
import logo from "@/assets/muhendis-logo.png";

interface Row {
  id: string;
  project_id: string;
  project_name: string | null;
  full_name: string;
  phone: string | null;
  occupation: string;
  title: string | null;
  foreman_name: string | null;
  entry_type: string;
  team_size: number;
  check_in: string;
  check_out: string | null;
  duration_minutes: number | null;
}

const EkipTakip = () => {
  const { token } = useParams<{ token: string }>();
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [projectName, setProjectName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (d: string) => {
    if (!token) return;
    setLoading(true);
    const { data, error: err } = await (supabase as any).rpc("list_attendance_by_qr_range", {
      _token: token,
      _from_date: d,
      _to_date: d,
    });
    if (err) {
      setError("Geçersiz veya süresi dolmuş link");
      setLoading(false);
      return;
    }
    const arr = (data || []) as Row[];
    setRows(arr);
    if (arr.length > 0 && arr[0].project_name) setProjectName(arr[0].project_name);
    setError(null);
    setLoading(false);
  };

  useEffect(() => { load(date); }, [token, date]);

  // Auto-refresh today every 30s
  useEffect(() => {
    if (date !== today) return;
    const t = setInterval(() => load(date), 30000);
    return () => clearInterval(t);
  }, [date, today]);

  const active = useMemo(() => rows.filter(r => !r.check_out), [rows]);
  const onSite = active.reduce((s, r) => s + (r.team_size || 1), 0);
  const totalEntries = rows.reduce((s, r) => s + (r.team_size || 1), 0);
  const exited = rows.filter(r => r.check_out);
  const totalExited = exited.reduce((s, r) => s + (r.team_size || 1), 0);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <img src={logo} alt="Şantiyem" className="h-10 w-auto mx-auto mb-4" />
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HardHat className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Geçersiz</h1>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-5 text-center safe-area-top">
        <img src={logo} alt="Şantiyem" className="h-9 w-auto mx-auto mb-1 brightness-0 invert" />
        <p className="text-orange-100 text-xs">Ekip Takip — Salt Okunur</p>
        {projectName && (
          <div className="mt-2 bg-white/15 rounded-xl px-4 py-1.5 inline-block">
            <span className="text-sm font-semibold">{projectName}</span>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-8 space-y-4">
        {/* Date picker */}
        <div className="bg-white rounded-xl shadow p-3 flex items-center gap-3">
          <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => load(date)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{onSite}</div>
            <div className="text-xs text-gray-600">{date === today ? "Şu an sahada" : "Gün sonu sahada"}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalEntries}</div>
            <div className="text-xs text-gray-600">Toplam giriş</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{totalExited}</div>
            <div className="text-xs text-gray-600">Çıkış yapan</div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <h3 className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-500" /> Kayıtlar ({rows.length})
          </h3>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-t-orange-500 border-orange-200 rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">Bu tarihte kayıt yok.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {rows.map(r => {
                const dur = r.duration_minutes ?? (r.check_out
                  ? differenceInMinutes(parseISO(r.check_out), parseISO(r.check_in))
                  : differenceInMinutes(new Date(), parseISO(r.check_in)));
                const hh = Math.floor(dur / 60), mm = dur % 60;
                const name = r.entry_type === "team"
                  ? `${r.foreman_name || r.full_name} (${r.team_size} ${r.occupation})`
                  : r.full_name;
                return (
                  <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(r.check_in), "HH:mm")}
                        {" → "}
                        {r.check_out ? format(parseISO(r.check_out), "HH:mm") : <span className="text-green-600 font-medium">Sahada 🟢</span>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-600 flex-shrink-0">
                      {dur > 0 && <span className="bg-gray-100 rounded-lg px-2 py-1 font-medium">{hh}s {mm}dk</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-center text-xs text-gray-400 pt-2">
          {format(new Date(), "d MMMM yyyy", { locale: tr })} · Şantiyem © · Salt okunur erişim
        </div>
      </div>
    </div>
  );
};

export default EkipTakip;
