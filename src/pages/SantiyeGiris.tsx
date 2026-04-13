import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePublicAttendance, WorkerAttendance } from "@/hooks/useWorkerAttendance";
import { HardHat, LogIn, LogOut, Clock, Users, User, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Toaster as Sonner } from "@/components/ui/sonner";

const TITLES = ["Mühendis", "Tekniker", "Ustabaşı", "İşçi", "Diğer"];
const OCCUPATIONS = ["Kalıpçı", "Demirci", "Betoncu", "Sıvacı", "Elektrikçi", "Tesisatçı", "Diğer"];

type Mode = "select" | "individual-checkin" | "team-checkin" | "checkout" | "success";

const SantiyeGiris = () => {
  const { token } = useParams<{ token: string }>();
  const { projectInfo, todayWorkers, loading, error, checkInIndividual, checkInTeam, checkOut } = usePublicAttendance(token || "");

  const [mode, setMode] = useState<Mode>("select");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Individual form
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("İşçi");

  // Team form
  const [foremanName, setForemanName] = useState("");
  const [occupation, setOccupation] = useState("Kalıpçı");
  const [teamSize, setTeamSize] = useState<number>(1);

  const activeWorkers = todayWorkers.filter(w => !w.check_out);
  const totalOnSite = activeWorkers.reduce((s, w) => s + (w.team_size || 1), 0);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setMode("success");
    setTimeout(() => {
      setMode("select");
      setSuccessMsg("");
      setFullName("");
      setForemanName("");
      setTeamSize(1);
    }, 3000);
  };

  const handleIndividualCheckIn = async () => {
    if (!fullName.trim()) return;
    setSubmitting(true);
    const ok = await checkInIndividual({ full_name: fullName.trim(), title });
    if (ok) showSuccess(`Hoş geldiniz ${fullName}! Giriş saati: ${format(new Date(), "HH:mm")}`);
    setSubmitting(false);
  };

  const handleTeamCheckIn = async () => {
    if (!foremanName.trim() || teamSize < 1) return;
    setSubmitting(true);
    const ok = await checkInTeam({ foreman_name: foremanName.trim(), occupation, team_size: teamSize });
    if (ok) showSuccess(`Ekip girişi kaydedildi! ${teamSize} ${occupation} — ${format(new Date(), "HH:mm")}`);
    setSubmitting(false);
  };

  const handleCheckOut = async (id: string, name: string, isTeam: boolean, size: number) => {
    setSubmitting(true);
    const ok = await checkOut(id);
    if (ok) {
      const msg = isTeam
        ? `${size} ${name} çıkış yaptı — ${format(new Date(), "HH:mm")}`
        : `Güle güle ${name}! Çıkış saati: ${format(new Date(), "HH:mm")}`;
      showSuccess(msg);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center">
        <Sonner />
        <div className="w-10 h-10 border-3 border-t-orange-500 border-orange-200 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !projectInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <Sonner />
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HardHat className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Geçersiz QR Kod</h1>
          <p className="text-gray-600 text-sm">{error || "Bu QR kod geçerli değil."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <Sonner />
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-5 text-center safe-area-top">
        <div className="flex items-center justify-center gap-2 mb-1">
          <HardHat className="w-6 h-6" />
          <span className="font-bold text-lg">Şantiyem</span>
        </div>
        <p className="text-orange-100 text-xs">Şantiye Giriş / Çıkış Sistemi</p>
        <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 inline-flex items-center gap-2">
          <Users className="w-5 h-5" />
          <span className="font-bold text-xl">{totalOnSite}</span>
          <span className="text-sm text-orange-100">kişi sahada</span>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pb-8">
        {/* ========= MODE: SELECT ========= */}
        {mode === "select" && (
          <div className="space-y-4">
            {/* Entry type selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode("individual-checkin")}
                className="bg-white rounded-2xl p-5 shadow-md border-2 border-transparent hover:border-blue-400 transition-all active:scale-[0.97] text-center"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <User className="w-7 h-7 text-blue-600" />
                </div>
                <div className="font-bold text-gray-900 text-sm">🧑 Bireysel</div>
                <div className="font-bold text-gray-900 text-sm">Giriş</div>
              </button>
              <button
                onClick={() => setMode("team-checkin")}
                className="bg-white rounded-2xl p-5 shadow-md border-2 border-transparent hover:border-green-400 transition-all active:scale-[0.97] text-center"
              >
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7 text-green-600" />
                </div>
                <div className="font-bold text-gray-900 text-sm">👷 Ekip</div>
                <div className="font-bold text-gray-900 text-sm">Girişi</div>
              </button>
            </div>

            {/* Checkout button */}
            {activeWorkers.length > 0 && (
              <button
                onClick={() => setMode("checkout")}
                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-2xl p-5 flex items-center gap-4 shadow-lg transition-all active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <LogOut className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-base">Çıkış Yap</div>
                  <div className="text-red-100 text-xs">{activeWorkers.length} aktif kayıt</div>
                </div>
              </button>
            )}

            {/* Quick stats */}
            {todayWorkers.length > 0 && (
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-semibold text-gray-700 text-sm mb-2">Bugünkü Özet</h3>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const map: Record<string, number> = {};
                    activeWorkers.forEach(w => {
                      const label = w.entry_type === "team" ? w.occupation : (w.title || w.occupation);
                      map[label] = (map[label] || 0) + (w.team_size || 1);
                    });
                    return Object.entries(map).map(([k, v]) => (
                      <span key={k} className="bg-orange-50 text-orange-700 rounded-lg px-2.5 py-1 text-xs font-medium">
                        {k}: {v}
                      </span>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========= MODE: INDIVIDUAL CHECK-IN ========= */}
        {mode === "individual-checkin" && (
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <button onClick={() => setMode("select")} className="text-gray-400 text-sm mb-3 flex items-center gap-1">
              ← Geri
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" /> Bireysel Giriş
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ad Soyad *</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Adınız ve soyadınız"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Unvan</label>
                <select
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-base bg-white outline-none"
                >
                  {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button
                onClick={handleIndividualCheckIn}
                disabled={!fullName.trim() || submitting}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl py-4 text-lg transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                {submitting ? "Kaydediliyor..." : "Giriş Yap"}
              </button>
            </div>
          </div>
        )}

        {/* ========= MODE: TEAM CHECK-IN ========= */}
        {mode === "team-checkin" && (
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <button onClick={() => setMode("select")} className="text-gray-400 text-sm mb-3 flex items-center gap-1">
              ← Geri
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" /> Ekip Girişi
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ustabaşı Adı *</label>
                <input
                  value={foremanName}
                  onChange={e => setForemanName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-base focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="Ustabaşının adı soyadı"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Meslek Grubu</label>
                <select
                  value={occupation}
                  onChange={e => setOccupation(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-base bg-white outline-none"
                >
                  {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Kişi Sayısı *</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTeamSize(Math.max(1, teamSize - 1))}
                    className="w-12 h-12 bg-gray-100 rounded-xl text-xl font-bold text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={teamSize}
                    onChange={e => setTeamSize(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center border border-gray-300 rounded-xl px-3 py-3 text-xl font-bold outline-none"
                    min={1}
                    inputMode="numeric"
                  />
                  <button
                    onClick={() => setTeamSize(teamSize + 1)}
                    className="w-12 h-12 bg-gray-100 rounded-xl text-xl font-bold text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                onClick={handleTeamCheckIn}
                disabled={!foremanName.trim() || teamSize < 1 || submitting}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-xl py-4 text-lg transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                {submitting ? "Kaydediliyor..." : `${teamSize} Kişi Giriş Yap`}
              </button>
            </div>
          </div>
        )}

        {/* ========= MODE: CHECKOUT ========= */}
        {mode === "checkout" && (
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <button onClick={() => setMode("select")} className="text-gray-400 text-sm mb-3 flex items-center gap-1">
              ← Geri
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-500" /> Çıkış Kaydı
            </h2>
            {activeWorkers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Şu an sahada kayıtlı kişi yok.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">Çıkış yapmak için kayda dokunun:</p>
                {activeWorkers.map(w => (
                  <button
                    key={w.id}
                    onClick={() => handleCheckOut(w.id, w.full_name, w.entry_type === "team", w.team_size || 1)}
                    disabled={submitting}
                    className="w-full flex justify-between items-center bg-red-50 hover:bg-red-100 rounded-xl px-4 py-3 transition-all text-left disabled:opacity-50"
                  >
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-1.5">
                        {w.entry_type === "team" ? (
                          <><Users className="w-3.5 h-3.5 text-green-600" /> {w.foreman_name || w.full_name}</>
                        ) : (
                          <><User className="w-3.5 h-3.5 text-blue-600" /> {w.full_name}</>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {w.entry_type === "team"
                          ? `${w.team_size} ${w.occupation}`
                          : w.title || w.occupation}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Giriş: {format(new Date(w.check_in), "HH:mm")}</div>
                      <div className="text-red-500 font-semibold text-sm">Çıkış →</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========= MODE: SUCCESS ========= */}
        {mode === "success" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-lg font-bold text-gray-900 mb-2">{successMsg}</p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-6">
              <div className="bg-green-500 h-1.5 rounded-full animate-[shrink_3s_linear_forwards]" />
            </div>
            <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
          </div>
        )}
      </div>

      <div className="text-center py-3 text-xs text-gray-400">
        {format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })} · Şantiyem ©
      </div>
    </div>
  );
};

export default SantiyeGiris;
