import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/muhendis-logo.png";

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

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "", email: "", password: "", passwordConfirm: "",
    title: "", city: "", terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
      // Update profile with title and city
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
        <div className="w-full max-w-md rounded-2xl p-8 border border-white/10 text-center" style={{ backgroundColor: "#1A1F2E" }}>
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold text-white mb-2">MühendisAI'ya Hoş Geldiniz!</h1>
          <p className="text-white/60 text-sm mb-2">Hesabınız başarıyla oluşturuldu.</p>
          <p className="text-sm mb-6" style={{ color: "#FF6B2B" }}>
            E-posta adresinize doğrulama linki gönderildi. Lütfen e-postanızı kontrol edin.
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="w-full h-11 font-semibold"
            style={{ backgroundColor: "#FF6B2B" }}
          >
            Giriş Yap
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative" style={{ backgroundColor: "#0F1419" }}>
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Ana Sayfa
      </button>
      <div className="w-full max-w-md rounded-2xl p-8 border border-white/10" style={{ backgroundColor: "#1A1F2E" }}>
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="MühendisAI" className="w-14 h-14 mb-3" />
          <h1 className="text-xl font-bold text-white">Ücretsiz Hesap Oluştur</h1>
        </div>

        <form onSubmit={handleRegister} className="space-y-3.5">
          <div>
            <label className="text-sm text-white/70 mb-1 block">Ad Soyad</label>
            <Input value={form.fullName} onChange={e => update("fullName", e.target.value)} required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30" placeholder="Adınız Soyadınız" />
          </div>
          <div>
            <label className="text-sm text-white/70 mb-1 block">E-posta</label>
            <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30" placeholder="ornek@email.com" />
          </div>
          <div>
            <label className="text-sm text-white/70 mb-1 block">Şifre (en az 8 karakter)</label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={form.password} onChange={e => update("password", e.target.value)} required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-white/70 mb-1 block">Şifre Tekrar</label>
            <Input type="password" value={form.passwordConfirm} onChange={e => update("passwordConfirm", e.target.value)} required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30" placeholder="••••••••" />
          </div>
          <div>
            <label className="text-sm text-white/70 mb-1 block">Unvan</label>
            <select value={form.title} onChange={e => update("title", e.target.value)} required
              className="w-full h-10 rounded-md bg-white/5 border border-white/10 text-white text-sm px-3">
              <option value="" className="bg-[#1A1F2E]">Seçiniz</option>
              {TITLES.map(t => <option key={t} value={t} className="bg-[#1A1F2E]">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-white/70 mb-1 block">İl</label>
            <select value={form.city} onChange={e => update("city", e.target.value)} required
              className="w-full h-10 rounded-md bg-white/5 border border-white/10 text-white text-sm px-3">
              <option value="" className="bg-[#1A1F2E]">Seçiniz</option>
              {CITIES.map(c => <option key={c} value={c} className="bg-[#1A1F2E]">{c}</option>)}
            </select>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <Checkbox id="terms" checked={form.terms} onCheckedChange={c => update("terms", !!c)}
              className="mt-0.5 border-white/20 data-[state=checked]:bg-[#FF6B2B] data-[state=checked]:border-[#FF6B2B]" />
            <label htmlFor="terms" className="text-xs text-white/60 leading-relaxed">
              Kullanım şartlarını ve gizlilik politikasını kabul ediyorum
            </label>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-semibold"
            style={{ backgroundColor: "#FF6B2B" }}>
            {loading ? "Oluşturuluyor..." : "Ücretsiz Hesap Oluştur"}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/40">veya</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <Button variant="outline" onClick={handleGoogleRegister}
          className="w-full h-11 bg-white text-gray-800 hover:bg-gray-100 border-0 font-medium">
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google ile Kayıt Ol
        </Button>

        <p className="text-center text-sm text-white/50 mt-5">
          Zaten hesabınız var mı?{" "}
          <Link to="/login" className="text-[#FF6B2B] hover:underline font-medium">Giriş yapın →</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
