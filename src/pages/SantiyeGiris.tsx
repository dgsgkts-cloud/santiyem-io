import { useState } from "react";
import { useParams } from "react-router-dom";
import { usePublicAttendance } from "@/hooks/useWorkerAttendance";
import { HardHat, Users, User, UserCheck, ChevronLeft, Clock } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Toaster as Sonner } from "@/components/ui/sonner";
import logo from "@/assets/muhendis-logo.png";

const TITLES = ["Mühendis", "Tekniker", "Ustabaşı", "İşçi", "Diğer"];
const OCCUPATIONS = ["Kalıpçı", "Demirci", "Betoncu", "Sıvacı", "Elektrikçi", "Tesisatçı", "Diğer"];

type Mode = "select" | "individual" | "team" | "success";

const SantiyeGiris = () => {
  const { token } = useParams<{ token: string }>();
  const { projectInfo, todayWorkers, loading, error, checkInIndividual, checkInTeam, checkOut } = usePublicAttendance(token || "");

  const [mode, setMode] = useState<Mode>("select");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Individual form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("İşçi");
  const [action, setAction] = useState<"in" | "out">("in");

  // Team form
  const [foremanName, setForemanName] = useState("");
  const [occupation, setOccupation] = useState("Kalıpçı");
  const [teamSize, setTeamSize] = useState<number>(1);

  const activeWorkers = todayWorkers.filter(w => !w.check_out);
  const totalOnSite = activeWorkers.reduce((s, w) => s + (w.team_size || 1), 0);

  const resetAndReturn = (msg: string) => {
    setSuccessMsg(msg);
    setMode("success");
    setTimeout(() => {
      setMode("select");
      setSuccessMsg("");
      setFullName("");
      setPhone("");
      setAction("in");
      setForemanName("");
      setTeamSize(1);
    }, 3000);
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h} saat ${m} dakika` : `${m} dakika`;
  };

  const normalizePhone = (p: string) => p.replace(/\s+/g, "");

  const handleIndividualSubmit = async () => {
    const name = fullName.trim();
    if (!name) return;
    setSubmitting(true);
    const np = normalizePhone(phone);

    // Find today's record for this name + phone
    const existing = todayWorkers.find(
      w => w.entry_type === "individual" &&
        w.full_name.toLowerCase() === name.toLowerCase() &&
        normalizePhone(w.phone || "") === np
    );

    if (action === "out") {
      if (existing && !existing.check_out) {
        const ok = await checkOut(existing.id);
        if (ok) {
          const dur = Math.round((Date.now() - new Date(existing.check_in).getTime()) / 60000);
          resetAndReturn(`İyi çalışmalar ${name}!\nÇıkış saati: ${format(new Date(), "HH:mm")}\nToplam çalışma: ${formatDuration(dur)} ✅`);
        }
      } else if (existing?.check_out) {
        resetAndReturn(`Bugünkü çıkışınız zaten kayıtlı.\nÇıkış: ${format(new Date(existing.check_out), "HH:mm")} ✅`);
      } else {
        resetAndReturn(`Önce giriş kaydı bulunamadı.\nLütfen "Giriş" seçeneğiyle deneyin.`);
      }
    } else {
      // action === "in"
      if (!existing) {
        const ok = await checkInIndividual({ full_name: name, title, phone: np || undefined });
        if (ok) resetAndReturn(`✅ Giriş kaydedildi — ${format(new Date(), "HH:mm")}\nHoşgeldin ${name}!`);
      } else if (!existing.check_out) {
        resetAndReturn(`Bugün zaten giriş yaptınız.\nGiriş: ${format(new Date(existing.check_in), "HH:mm")} ✅`);
      } else {
        resetAndReturn(`Bugünkü kaydınız tamamlandı.\nGiriş: ${format(new Date(existing.check_in), "HH:mm")} / Çıkış: ${format(new Date(existing.check_out), "HH:mm")} ✅`);
      }
    }
    setSubmitting(false);
  };

  const handleTeamSubmit = async () => {
    const name = foremanName.trim();
    if (!name || teamSize < 1) return;
    setSubmitting(true);

    const existing = todayWorkers.find(
      w => w.entry_type === "team" &&
        (w.foreman_name || w.full_name).toLowerCase() === name.toLowerCase() &&
        w.occupation === occupation
    );

    if (!existing) {
      const ok = await checkInTeam({ foreman_name: name, occupation, team_size: teamSize });
      if (ok) resetAndReturn(`Ekip girişi kaydedildi!\n${teamSize} ${occupation} — ${format(new Date(), "HH:mm")} ✅`);
    } else if (!existing.check_out) {
      const ok = await checkOut(existing.id);
      if (ok) resetAndReturn(`Ekip çıkışı kaydedildi!\n${existing.team_size} ${existing.occupation} — ${format(new Date(), "HH:mm")} ✅`);
    } else {
      resetAndReturn(`Bugünkü kaydınız tamamlandı.\nGiriş: ${format(new Date(existing.check_in), "HH:mm")} / Çıkış: ${format(new Date(existing.check_out), "HH:mm")} ✅`);
    }
    setSubmitting(false);
  };

  // ========== LOADING ==========
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex flex-col items-center justify-center gap-4">
        <Sonner />
        <img src={logo} alt="Şantiyem" className="h-12 w-auto" />
        <div className="w-10 h-10 border-3 border-t-orange-500 border-orange-200 rounded-full animate-spin" />
      </div>
    );
  }

  // ========== ERROR ==========
  if (error || !projectInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <Sonner />
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <img src={logo} alt="Şantiyem" className="h-10 w-auto mx-auto mb-4" />
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HardHat className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Geçersiz QR Kod</h1>
          <p className="text-gray-600 text-sm">{error || "Bu QR kod geçersiz veya süresi dolmuş."}</p>
          <p className="text-gray-400 text-xs mt-4">Lütfen şantiye yöneticinize başvurun.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <Sonner />

      {/* ===== HEADER ===== */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-5 text-center safe-area-top">
        <img src={logo} alt="Şantiyem" className="h-9 w-auto mx-auto mb-1 brightness-0 invert" />
        <p className="text-orange-100 text-xs">Şantiye Giriş / Çıkış Sistemi</p>

        {projectInfo.project_name && (
          <div className="mt-2 bg-white/15 rounded-xl px-4 py-1.5 inline-block">
            <span className="text-sm font-semibold">{projectInfo.project_name}</span>
          </div>
        )}

        <div className="mt-3 bg-white/20 rounded-xl px-4 py-2 inline-flex items-center gap-2">
          <Users className="w-5 h-5" />
          <span className="font-bold text-xl">{totalOnSite}</span>
          <span className="text-sm text-orange-100">kişi sahada</span>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pb-8">

        {/* ===== MODE: SELECT ===== */}
        {mode === "select" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode("individual")}
                className="bg-white rounded-2xl p-5 shadow-md border-2 border-transparent hover:border-blue-400 transition-all active:scale-[0.97] text-center"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <User className="w-7 h-7 text-blue-600" />
                </div>
                <div className="font-bold text-gray-900 text-sm">🧑 Bireysel</div>
                <div className="font-bold text-gray-900 text-sm">Giriş</div>
              </button>
              <button
                onClick={() => setMode("team")}
                className="bg-white rounded-2xl p-5 shadow-md border-2 border-transparent hover:border-green-400 transition-all active:scale-[0.97] text-center"
              >
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7 text-green-600" />
                </div>
                <div className="font-bold text-gray-900 text-sm">👷 Ekip</div>
                <div className="font-bold text-gray-900 text-sm">Girişi</div>
              </button>
            </div>

            {/* Today summary */}
            {todayWorkers.length > 0 && (
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" /> Bugünkü Özet
                </h3>
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
                  {activeWorkers.length > 0 && (
                    <span className="bg-green-50 text-green-700 rounded-lg px-2.5 py-1 text-xs font-bold">
                      Toplam: {totalOnSite}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== MODE: INDIVIDUAL ===== */}
        {mode === "individual" && (
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <button onClick={() => setMode("select")} className="text-gray-400 text-sm mb-3 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Geri
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" /> Bireysel Giriş / Çıkış
            </h2>
            <p className="text-xs text-gray-500 mb-4 bg-gray-50 rounded-lg px-3 py-2">
              Bilgilerinizi girin ve giriş mi çıkış mı yaptığınızı seçin.
            </p>
            <div className="space-y-4">
              {/* Giriş / Çıkış toggle */}
              <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setAction("in")}
                  className={`py-3 rounded-lg text-sm font-bold transition-all ${action === "in" ? "bg-green-500 text-white shadow" : "text-gray-600"}`}
                >
                  ✅ Giriş
                </button>
                <button
                  type="button"
                  onClick={() => setAction("out")}
                  className={`py-3 rounded-lg text-sm font-bold transition-all ${action === "out" ? "bg-orange-500 text-white shadow" : "text-gray-600"}`}
                >
                  🏁 Çıkış
                </button>
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon (opsiyonel)</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="05XX XXX XX XX"
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
                onClick={handleIndividualSubmit}
                disabled={!fullName.trim() || submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl py-4 text-lg transition-all flex items-center justify-center gap-2"
              >
                {submitting ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        )}

        {/* ===== MODE: TEAM ===== */}
        {mode === "team" && (
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <button onClick={() => setMode("select")} className="text-gray-400 text-sm mb-3 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Geri
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" /> Ekip Giriş / Çıkış
            </h2>
            <p className="text-xs text-gray-500 mb-4 bg-gray-50 rounded-lg px-3 py-2">
              Bilgilerinizi girin, sistem giriş veya çıkış kaydını otomatik oluşturur.
            </p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Meslek Grubu *</label>
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
                  >−</button>
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
                  >+</button>
                </div>
              </div>
              <button
                onClick={handleTeamSubmit}
                disabled={!foremanName.trim() || teamSize < 1 || submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl py-4 text-lg transition-all flex items-center justify-center gap-2"
              >
                {submitting ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        )}

        {/* ===== MODE: SUCCESS ===== */}
        {mode === "success" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-lg font-bold text-gray-900 mb-2 whitespace-pre-line">{successMsg}</p>
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
