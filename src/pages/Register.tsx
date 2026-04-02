import { useState, useEffect } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/muhendis-logo.png";
import { PaymentLogos } from "@/components/PaymentLogos";

const TITLES = [
  "İnşaat Mühendisi", "Mimar", "Makine Mühendisi",
  "Elektrik Mühendisi", "Müteahhit", "Diğer",
];

const CITIES = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin",
  "Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur",
  "Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan",
  "Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul",
  "İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis","Kırıkkale","Kırklareli",
  "Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş",
  "Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Şanlıurfa","Siirt","Sinop",
  "Sivas","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak",
];

const FEATURES = [
  "TBDY, TS standartları, İmar mevzuatı — anında sorgula",
  "Proje ve hakediş dosyalarını yükle, AI analiz etsin",
  "Fotoğraftan şantiye sorunlarını tespit et",
  "EKB ön hesaplama ve enerji sınıfı",
  "Türk mühendisler için, Türkçe",
];

const Register = () => {
  useSEO({ title: "Ücretsiz Kayıt Ol | Şantiyem" });
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "", email: "", password: "", passwordConfirm: "",
    title: "", city: "", terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const handler = () => setIsLg(mql.matches);
    mql.addEventListener("change", handler);
    setIsLg(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const update = (key: string, val: string | boolean) => setForm(prev => ({ ...prev, [key]: val }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error("Şifre en az 8 karakter olmalıdır."); return; }
    if (form.password !== form.passwordConfirm) { toast.error("Şifreler eşleşmiyor."); return; }
    if (!form.terms) { toast.error("Kullanım şartlarını kabul etmeniz gerekiyor."); return; }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, title: form.title, city: form.city },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
    }
  };

  const handleGoogleRegister = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error("Google ile kayıt olunamadı.");
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0F1419" }}>
        <div className="w-full max-w-md rounded-2xl p-8 text-center" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "#F1F5F9" }}>Şantiyem'ya Hoş Geldiniz!</h1>
          <p className="text-sm mb-2" style={{ color: "#64748B" }}>Hesabınız başarıyla oluşturuldu.</p>
          <p className="text-sm mb-6" style={{ color: "#FF6B2B" }}>
            E-posta adresinize doğrulama linki gönderildi. Lütfen e-postanızı kontrol edin.
          </p>
          <button onClick={() => navigate("/login")}
            className="w-full rounded-lg font-semibold text-white" style={{ height: 40, backgroundColor: "#FF6B2B" }}>
            Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  const inputStyle = { height: 40, backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" };

  const formContent = (
    <div className="w-full max-w-[400px]">
      <div className="rounded-2xl p-6 lg:p-8" style={{ backgroundColor: isLg ? "#161C23" : "#1A1F2E", border: "1px solid #1E2732" }}>
        <div className="flex flex-col items-center mb-5">
          <img src={logo} alt="Şantiyem" className="w-12 h-12 mb-3" />
          <h1 className="text-lg font-bold" style={{ color: "#F1F5F9", fontFamily: isLg ? "'Space Grotesk', sans-serif" : undefined }}>
            Ücretsiz Hesap Oluştur
          </h1>
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#94A3B8" }}>Ad Soyad</label>
            <input value={form.fullName} onChange={e => update("fullName", e.target.value)} required
              className="w-full rounded-lg px-3 text-[13px] outline-none" style={inputStyle} placeholder="Adınız Soyadınız"
              onFocus={(e) => { e.currentTarget.style.borderColor = "#FF6B2B"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#1E2732"; }} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#94A3B8" }}>E-posta</label>
            <input type="email" value={form.email} onChange={e => update("email", e.target.value)} required
              className="w-full rounded-lg px-3 text-[13px] outline-none" style={inputStyle} placeholder="ornek@email.com"
              onFocus={(e) => { e.currentTarget.style.borderColor = "#FF6B2B"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#1E2732"; }} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#94A3B8" }}>Şifre (en az 8 karakter)</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={form.password} onChange={e => update("password", e.target.value)} required
                className="w-full rounded-lg px-3 pr-10 text-[13px] outline-none" style={inputStyle} placeholder="••••••••"
                onFocus={(e) => { e.currentTarget.style.borderColor = "#FF6B2B"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#1E2732"; }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#475569" }}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#94A3B8" }}>Şifre Tekrar</label>
            <input type="password" value={form.passwordConfirm} onChange={e => update("passwordConfirm", e.target.value)} required
              className="w-full rounded-lg px-3 text-[13px] outline-none" style={inputStyle} placeholder="••••••••"
              onFocus={(e) => { e.currentTarget.style.borderColor = "#FF6B2B"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#1E2732"; }} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#94A3B8" }}>Unvan</label>
            <select value={form.title} onChange={e => update("title", e.target.value)} required
              className="w-full rounded-lg px-3 text-[13px] outline-none" style={inputStyle}>
              <option value="" style={{ backgroundColor: "#161C23" }}>Seçiniz</option>
              {TITLES.map(t => <option key={t} value={t} style={{ backgroundColor: "#161C23" }}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#94A3B8" }}>İl</label>
            <select value={form.city} onChange={e => update("city", e.target.value)} required
              className="w-full rounded-lg px-3 text-[13px] outline-none" style={inputStyle}>
              <option value="" style={{ backgroundColor: "#161C23" }}>Seçiniz</option>
              {CITIES.map(c => <option key={c} value={c} style={{ backgroundColor: "#161C23" }}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <Checkbox id="terms" checked={form.terms} onCheckedChange={c => update("terms", !!c)}
              className="mt-0.5 border-white/20 data-[state=checked]:bg-[#FF6B2B] data-[state=checked]:border-[#FF6B2B]" />
            <label htmlFor="terms" className="text-[11px] leading-relaxed" style={{ color: "#64748B" }}>
              <a href="/kullanim-sartlari" target="_blank" className="underline" style={{ color: "#FF6B2B" }}>Kullanım Şartları</a>'nı ve{" "}
              <a href="/gizlilik-politikasi" target="_blank" className="underline" style={{ color: "#FF6B2B" }}>Gizlilik Sözleşmesi</a>'ni okudum, kabul ediyorum.
            </label>
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-lg text-[14px] font-semibold text-white transition-colors disabled:opacity-50"
            style={{ height: 40, backgroundColor: "#FF6B2B" }}>
            {loading ? "Oluşturuluyor..." : "Ücretsiz Hesap Oluştur"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ backgroundColor: "#1E2732" }} />
          <span className="text-xs" style={{ color: "#475569" }}>veya</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "#1E2732" }} />
        </div>

        <button onClick={handleGoogleRegister}
          className="w-full flex items-center justify-center gap-2 rounded-lg font-medium text-[14px]"
          style={{ height: 40, backgroundColor: "white", color: "#1f2937" }}>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google ile Kayıt Ol
        </button>

        <p className="text-center text-sm mt-4" style={{ color: "#64748B" }}>
          Zaten hesabınız var mı?{" "}
          <Link to="/login" className="font-medium" style={{ color: "#FF6B2B" }}>Giriş yapın →</Link>
        </p>

        <div className="flex flex-col items-center gap-1.5 mt-4 pt-3" style={{ borderTop: "1px solid #1E2732" }}>
          <PaymentLogos />
          <p className="text-[10px]" style={{ color: "#475569" }}>Ödemeniz iyzico altyapısıyla güvenle işlenmektedir.</p>
        </div>
      </div>
    </div>
  );

  if (isLg) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: "#0F1419" }}>
        <div className="w-[45%] flex flex-col items-center justify-center px-8 relative">
          <button onClick={() => navigate("/")}
            className="absolute top-6 left-6 flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: "#64748B" }}>
            <ArrowLeft className="w-4 h-4" /> Ana Sayfa
          </button>
          {formContent}
        </div>
        <div className="w-[55%] flex flex-col items-center justify-center px-12"
          style={{ background: "linear-gradient(135deg, rgba(255,107,43,0.08) 0%, #0F1419 100%)" }}>
          <h2 className="text-[32px] font-bold mb-8" style={{ color: "#F1F5F9", fontFamily: "'Space Grotesk', sans-serif" }}>
            Mühendislerin Aracı
          </h2>
          <div className="space-y-5 max-w-md">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: "rgba(255,107,43,0.15)" }}>
                  <Check className="w-3.5 h-3.5" style={{ color: "#FF6B2B" }} />
                </div>
                <span className="text-[15px] leading-relaxed" style={{ color: "#94A3B8" }}>{f}</span>
              </div>
            ))}
          </div>
          <div className="mt-12 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["MB", "AY", "SK"].map((initials, i) => (
                <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: ["#FF6B2B", "#3B82F6", "#22C55E"][i], border: "2px solid #0F1419" }}>
                  {initials}
                </div>
              ))}
            </div>
            <p className="text-[13px] italic" style={{ color: "#64748B" }}>
              "Projelerimizi çok daha hızlı yönetiyoruz."
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative" style={{ backgroundColor: "#0F1419" }}>
      <button onClick={() => navigate("/")}
        className="absolute top-4 left-4 flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Ana Sayfa
      </button>
      {formContent}
    </div>
  );
};

export default Register;
