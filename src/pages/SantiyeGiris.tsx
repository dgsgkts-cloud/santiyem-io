import { useState } from "react";
import { useParams } from "react-router-dom";
import { usePublicAttendance } from "@/hooks/useWorkerAttendance";
import { HardHat, LogIn, LogOut, Users, User, UserCheck, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Toaster as Sonner } from "@/components/ui/sonner";
import logo from "@/assets/muhendis-logo.png";

const TITLES = ["Mühendis", "Tekniker", "Ustabaşı", "İşçi", "Diğer"];
const OCCUPATIONS = ["Kalıpçı", "Demirci", "Betoncu", "Sıvacı", "Elektrikçi", "Tesisatçı", "Diğer"];

type Mode = "select" | "individual" | "team" | "checkout" | "success";
type ActionType = "giris" | "cikis";

const SantiyeGiris = () => {
  const { token } = useParams<{ token: string }>();
  const { projectInfo, todayWorkers, loading, error, checkInIndividual, checkInTeam, checkOut } = usePublicAttendance(token || "");

  const [mode, setMode] = useState<Mode>("select");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Individual form
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("İşçi");
  const [individualAction, setIndividualAction] = useState<ActionType>("giris");

  // Team form
  const [foremanName, setForemanName] = useState("");
  const [occupation, setOccupation] = useState("Kalıpçı");
  const [teamSize, setTeamSize] = useState<number>(1);
  const [teamAction, setTeamAction] = useState<ActionType>("giris");

  const activeWorkers = todayWorkers.filter(w => !w.check_out);
  const totalOnSite = activeWorkers.reduce((s, w) => s + (w.team_size || 1), 0);

  const resetAndReturn = (msg: string) => {
    setSuccessMsg(msg);
    setMode("success");
    setTimeout(() => {
      setMode("select");
      setSuccessMsg("");
      setFullName("");
      setForemanName("");
      setTeamSize(1);
      setIndividualAction("giris");
      setTeamAction("giris");
    }, 3000);
  };

  const handleIndividualSubmit = async () => {
    if (!fullName.trim()) return;
    setSubmitting(true);

    if (individualAction === "giris") {
      const ok = await checkInIndividual({ full_name: fullName.trim(), title });
      if (ok) resetAndReturn(`Hoş geldiniz ${fullName}!\nGiriş saati: ${format(new Date(), "HH:mm")}`);
    } else {
      // Find active record for this person
      const record = activeWorkers.find(
        w => w.entry_type === "individual" && w.full_name.toLowerCase() === fullName.trim().toLowerCase()
      );
      if (record) {
        const ok = await checkOut(record.id);
        if (ok) resetAndReturn(`Güle güle ${fullName}!\nÇıkış saati: ${format(new Date(), "HH:mm")}`);
      } else {
        resetAndReturn(`"${fullName}" adına aktif giriş kaydı bulunamadı.`);
      }
    }
    setSubmitting(false);
  };

  const handleTeamSubmit = async () => {
    if (!foremanName.trim() || teamSize < 1) return;
    setSubmitting(true);

    if (teamAction === "giris") {
      const ok = await checkInTeam({ foreman_name: foremanName.trim(), occupation, team_size: teamSize });
      if (ok) resetAndReturn(`Ekip girişi kaydedildi!\n${teamSize} ${occupation} — ${format(new Date(), "HH:mm")}`);
    } else {
      const record = activeWorkers.find(
        w => w.entry_type === "team" && (w.foreman_name || w.full_name).toLowerCase() === foremanName.trim().toLowerCase()
      );
      if (record) {
        const ok = await checkOut(record.id);
        if (ok) resetAndReturn(`${record.team_size} ${record.occupation} çıkış yaptı\nÇıkış: ${format(new Date(), "HH:mm")}`);
      } else {
        resetAndReturn(`"${foremanName}" adına aktif ekip kaydı bulunamadı.`);
      }
    }
    setSubmitting(false);
  };

  const handleQuickCheckOut = async (id: string, name: string, isTeam: boolean, size: number, occ: string) => {
    setSubmitting(true);
    const ok = await checkOut(id);
    if (ok) {
      const msg = isTeam
        ? `${size} ${occ} çıkış yaptı\nÇıkış: ${format(new Date(), "HH:mm")}`
        : `Güle güle ${name}!\nÇıkış saati: ${format(new Date(), "HH:mm")}`;
      resetAndReturn(msg);
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

  // ========== ACTION TYPE TOGGLE ==========
  const ActionToggle = ({ value, onChange }: { value: ActionType; onChange: (v: ActionType) => void }) => (
    <div className="flex rounded-xl overflow-hidden border-2 border-gray-200">
      <button
        type="button"
        onClick={() => onChange("giris")}
        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
          value === "giris" ? "bg-green-500 text-white" : "bg-white text-gray-500"
        }`}
      >
        <LogIn className="w-4 h-4" /> Giriş Yap
      </button>
      <button
        type="button"
        onClick={() => onChange("cikis")}
        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
          value === "cikis" ? "bg-red-500 text-white" : "bg-white text-gray-500"
        }`}
      >
        <LogOut className="w-4 h-4" /> Çıkış Yap
      </button>
    </div>
  );

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
                <div className="font-bold text-gray-900 text-sm">Giriş / Çıkış</div>
              </button>
              <button
                onClick={() => setMode("team")}
                className="bg-white rounded-2xl p-5 shadow-md border-2 border-transparent hover:border-green-400 transition-all active:scale-[0.97] text-center"
              >
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7 text-green-600" />
                </div>
                <div className="font-bold text-gray-900 text-sm">👷 Ekip</div>
                <div className="font-bold text-gray-900 text-sm">Giriş / Çıkış</div>
              </button>
            </div>

            {/* Quick checkout list */}
            {activeWorkers.length > 0 && (
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-red-500" /> Hızlı Çıkış ({activeWorkers.length} aktif)
                </h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {activeWorkers.map(w => (
                    <button
                      key={w.id}
                      onClick={() => handleQuickCheckOut(w.id, w.full_name, w.entry_type === "team", w.team_size || 1, w.occupation)}
                      disabled={submitting}
                      className="w-full flex justify-between items-center bg-red-50 hover:bg-red-100 rounded-xl px-3 py-2.5 transition-all text-left disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {w.entry_type === "team"
                          ? <Users className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                          : <User className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {w.entry_type === "team" ? (w.foreman_name || w.full_name) : w.full_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {w.entry_type === "team" ? `${w.team_size} ${w.occupation}` : (w.title || w.occupation)}
                          </div>
                        </div>
                      </div>
                      <span className="text-red-500 font-semibold text-xs flex-shrink-0">Çıkış →</span>
                    </button>
                  ))}
                </div>
              </div>
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

        {/* ===== MODE: INDIVIDUAL ===== */}
        {mode === "individual" && (
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <button onClick={() => setMode("select")} className="text-gray-400 text-sm mb-3 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Geri
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" /> Bireysel Giriş / Çıkış
            </h2>
            <div className="space-y-4">
              <ActionToggle value={individualAction} onChange={setIndividualAction} />
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
              {individualAction === "giris" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Unvan *</label>
                  <select
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-base bg-white outline-none"
                  >
                    {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              <button
                onClick={handleIndividualSubmit}
                disabled={!fullName.trim() || submitting}
                className={`w-full font-bold rounded-xl py-4 text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-white ${
                  individualAction === "giris" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {individualAction === "giris" ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                {submitting ? "Kaydediliyor..." : individualAction === "giris" ? "Giriş Kaydet" : "Çıkış Kaydet"}
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
            <div className="space-y-4">
              <ActionToggle value={teamAction} onChange={setTeamAction} />
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
              {teamAction === "giris" && (
                <>
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
                </>
              )}
              <button
                onClick={handleTeamSubmit}
                disabled={!foremanName.trim() || (teamAction === "giris" && teamSize < 1) || submitting}
                className={`w-full font-bold rounded-xl py-4 text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-white ${
                  teamAction === "giris" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {teamAction === "giris" ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                {submitting ? "Kaydediliyor..." : teamAction === "giris" ? `${teamSize} Kişi Giriş Kaydet` : "Ekip Çıkış Kaydet"}
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
