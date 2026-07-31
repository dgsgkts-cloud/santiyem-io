import { useState, useEffect } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SantiyemAuthLockup } from "@/components/brand/SantiyemLogo";
import { LoginHero } from "@/components/auth/LoginHero";

const Login = () => {
  useSEO({ title: "Giriş Yap | Şantiyem" });
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const handler = () => setIsLg(mql.matches);
    mql.addEventListener("change", handler);
    setIsLg(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "E-posta veya şifre hatalı." : error.message);
    } else {
      navigate("/");
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error("Google ile giriş yapılamadı.");
  };

  const formContent = (
    <div className="w-full max-w-[400px]" style={isLg ? {} : undefined}>
      <div className="rounded-2xl p-6 lg:p-8" style={{ backgroundColor: isLg ? "#161C23" : "#1A1F2E", border: "1px solid #1E2732" }}>
        <div className="flex flex-col items-center mb-6 lg:mb-8">
          <SantiyemAuthLockup className="mb-3 brand-logo-enter" />
          <h1 className="text-lg lg:text-xl font-bold" style={{ color: "#F1F5F9", fontFamily: isLg ? "'Space Grotesk', sans-serif" : undefined }}>
            Tekrar Hoş Geldiniz
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>Şantiyem AI hesabınıza giriş yapın.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#94A3B8" }}>E-posta</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com" required
              className="w-full rounded-lg px-3 text-[14px] outline-none transition-colors"
              style={{ height: 40, backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#FF6B2B"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#1E2732"; }}
            />
          </div>
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "#94A3B8" }}>Şifre</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full rounded-lg px-3 pr-10 text-[14px] outline-none transition-colors"
                style={{ height: 40, backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#FF6B2B"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#1E2732"; }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#475569" }}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            {/* 20px checkbox inside a 44px tap target (Sprint 42B) */}
            <label
              htmlFor="remember"
              className="-ml-2 flex min-h-[44px] cursor-pointer items-center gap-2 px-2 text-xs"
              style={{ color: "#64748B" }}
            >
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(c) => setRemember(!!c)}
                className="h-5 w-5 shrink-0 rounded-[6px] border-white/20 data-[state=checked]:bg-[#FF6B2B] data-[state=checked]:border-[#FF6B2B]"
              />
              <span>Beni hatırla</span>
            </label>
            <Link to="/forgot-password" className="text-xs sm:text-sm font-medium hover:underline transition-colors"
              style={{ color: "#FF6B2B" }}>
              Şifremi Unuttum
            </Link>
          </div>


          <button type="submit" disabled={loading}
            className="w-full rounded-lg text-[14px] font-semibold text-white transition-colors disabled:opacity-50"
            style={{ height: 40, backgroundColor: "#FF6B2B" }}>
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ backgroundColor: "#1E2732" }} />
          <span className="text-xs" style={{ color: "#475569" }}>veya</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "#1E2732" }} />
        </div>

        <button onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 rounded-lg font-medium text-[14px] transition-colors"
          style={{ height: 40, backgroundColor: "white", color: "#1f2937" }}>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google ile Giriş Yap
        </button>

        <p className="text-center text-sm mt-5" style={{ color: "#64748B" }}>
          Hesabınız yok mu?{" "}
          <Link to="/register" className="font-medium" style={{ color: "#FF6B2B" }}>Ücretsiz kayıt olun →</Link>
        </p>
      </div>
    </div>
  );

  // Desktop: two-column layout
  if (isLg) {
    return (
      <div className="min-h-screen flex login-dark" style={{ backgroundColor: "#0F1419" }}>
        {/* Left - Form */}
        <div className="w-[45%] flex flex-col items-center justify-center px-8 relative">
          <button onClick={() => navigate("/")}
            className="absolute top-6 left-6 flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: "#64748B" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#F1F5F9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}>
            <ArrowLeft className="w-4 h-4" /> Ana Sayfa
          </button>
          {formContent}
        </div>

        {/* Right - Hero showcase (Sprint 32.3) */}
        <div className="w-[55%]" style={{ backgroundColor: "#0F1419" }}>
          <LoginHero />
        </div>
      </div>
    );
  }

  // Mobile / tablet: form first, hero stacked underneath.
  // Sprint 42B — back control sits below the iOS status bar (no negative
  // margins, no fixed device offsets) and the card starts after a balanced gap.
  return (
    <div
      className="relative login-dark"
      style={{
        backgroundColor: "#0F1419",
        minHeight: "100dvh",
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
      }}
    >
      <div className="px-4">
        <button
          onClick={() => navigate("/")}
          aria-label="Ana Sayfaya dön"
          className="-ml-2 flex h-11 min-w-[44px] items-center gap-1.5 rounded-xl px-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Ana Sayfa
        </button>
      </div>
      <div className="flex justify-center px-4 pb-10" style={{ paddingTop: 24 }}>
        {formContent}
      </div>
      <LoginHero />
    </div>
  );


};

export default Login;
