import { useState } from "react";
import { useParams } from "react-router-dom";
import { usePublicAttendance } from "@/hooks/useWorkerAttendance";
import { HardHat, LogIn, LogOut, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const OCCUPATIONS = ["Kalıpçı", "Demirci", "Betoncu", "Sıvacı", "Elektrikçi", "Tesisatçı", "İnşaat İşçisi", "Usta", "Boyacı", "İzolasyoncu", "Diğer"];

const SantiyeGiris = () => {
  const { token } = useParams<{ token: string }>();
  const { projectInfo, todayWorkers, loading, error, checkIn, checkOut } = usePublicAttendance(token || "");

  const [mode, setMode] = useState<"select" | "checkin" | "checkout">("select");
  const [fullName, setFullName] = useState("");
  const [tcNo, setTcNo] = useState("");
  const [phone, setPhone] = useState("");
  const [occupation, setOccupation] = useState("İnşaat İşçisi");
  const [submitting, setSubmitting] = useState(false);

  const activeWorkers = todayWorkers.filter(w => !w.check_out);
  const checkedOutWorkers = todayWorkers.filter(w => w.check_out);

  const handleCheckIn = async () => {
    if (!fullName.trim()) return;
    setSubmitting(true);
    const ok = await checkIn({ full_name: fullName.trim(), tc_no: tcNo || undefined, phone: phone || undefined, occupation });
    if (ok) { setFullName(""); setTcNo(""); setPhone(""); setMode("select"); }
    setSubmitting(false);
  };

  const handleCheckOut = async (id: string) => {
    setSubmitting(true);
    await checkOut(id);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-orange-500 border-orange-200 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !projectInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HardHat className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Geçersiz QR Kod</h1>
          <p className="text-gray-600">{error || "Bu QR kod geçerli değil."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <HardHat className="w-6 h-6" />
          <span className="font-bold text-lg">Şantiyem</span>
        </div>
        <p className="text-orange-100 text-sm">Şantiye Giriş / Çıkış Sistemi</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <div className="bg-white/20 rounded-lg px-3 py-1 flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span className="font-semibold">{activeWorkers.length}</span>
            <span className="text-xs">kişi sahada</span>
          </div>
          <div className="text-orange-100 text-xs">
            {format(new Date(), "d MMMM yyyy", { locale: tr })}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        {mode === "select" && (
          <div className="space-y-4">
            <button
              onClick={() => setMode("checkin")}
              className="w-full bg-green-500 hover:bg-green-600 text-white rounded-2xl p-6 flex items-center gap-4 shadow-lg transition-all active:scale-[0.98]"
            >
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <LogIn className="w-7 h-7" />
              </div>
              <div className="text-left">
                <div className="font-bold text-lg">Giriş Yap</div>
                <div className="text-green-100 text-sm">Şantiyeye giriş kaydı oluştur</div>
              </div>
            </button>

            <button
              onClick={() => setMode("checkout")}
              className="w-full bg-red-500 hover:bg-red-600 text-white rounded-2xl p-6 flex items-center gap-4 shadow-lg transition-all active:scale-[0.98]"
            >
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <LogOut className="w-7 h-7" />
              </div>
              <div className="text-left">
                <div className="font-bold text-lg">Çıkış Yap</div>
                <div className="text-red-100 text-sm">Şantiyeden çıkış kaydı oluştur</div>
              </div>
            </button>

            {/* Active workers */}
            {activeWorkers.length > 0 && (
              <div className="bg-white rounded-xl shadow p-4 mt-6">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-500" />
                  Şu an sahada ({activeWorkers.length} kişi)
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeWorkers.map(w => (
                    <div key={w.id} className="flex justify-between items-center text-sm bg-green-50 rounded-lg px-3 py-2">
                      <div>
                        <span className="font-medium text-gray-900">{w.full_name}</span>
                        <span className="text-gray-500 ml-2 text-xs">{w.occupation}</span>
                      </div>
                      <span className="text-green-600 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(w.check_in), "HH:mm")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "checkin" && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <button onClick={() => setMode("select")} className="text-gray-400 text-sm mb-4">← Geri</button>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <LogIn className="w-5 h-5 text-green-500" /> Giriş Kaydı
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad *</label>
                <input
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Adınız ve soyadınız"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TC Kimlik No (opsiyonel)</label>
                <input
                  value={tcNo} onChange={e => setTcNo(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
                  placeholder="11 haneli TC kimlik numarası"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon (opsiyonel)</label>
                <input
                  value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base"
                  placeholder="05XX XXX XX XX"
                  inputMode="tel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meslek</label>
                <select
                  value={occupation} onChange={e => setOccupation(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base bg-white"
                >
                  {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <button
                onClick={handleCheckIn}
                disabled={!fullName.trim() || submitting}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-xl py-4 text-lg transition-all"
              >
                {submitting ? "Kaydediliyor..." : "✅ Giriş Yap"}
              </button>
            </div>
          </div>
        )}

        {mode === "checkout" && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <button onClick={() => setMode("select")} className="text-gray-400 text-sm mb-4">← Geri</button>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-500" /> Çıkış Kaydı
            </h2>
            {activeWorkers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Şu an sahada kayıtlı işçi yok.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Çıkış yapmak için adınıza tıklayın:</p>
                {activeWorkers.map(w => (
                  <button
                    key={w.id}
                    onClick={() => handleCheckOut(w.id)}
                    disabled={submitting}
                    className="w-full flex justify-between items-center bg-red-50 hover:bg-red-100 rounded-xl px-4 py-3 transition-all text-left disabled:opacity-50"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{w.full_name}</div>
                      <div className="text-xs text-gray-500">{w.occupation}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Giriş: {format(new Date(w.check_in), "HH:mm")}</div>
                      <div className="text-red-500 font-medium text-sm">Çıkış Yap →</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center py-4 text-xs text-gray-400">
        Şantiyem © {new Date().getFullYear()}
      </div>
    </div>
  );
};

export default SantiyeGiris;
