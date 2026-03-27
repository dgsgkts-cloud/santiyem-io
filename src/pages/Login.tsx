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

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ backgroundColor: "#0F1419" }}>
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Ana Sayfa
      </button>
      <div className="w-full max-w-md rounded-2xl p-8 border border-white/10" style={{ backgroundColor: "#1A1F2E" }}>
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="MühendisAI" className="w-14 h-14 mb-3" />
          <h1 className="text-xl font-bold text-white">MühendisAI'ya Giriş Yap</h1>
          <p className="text-sm text-white/50 mt-1">İnşaat & Mühendislik Asistanınız</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-1.5 block">E-posta</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div>
            <label className="text-sm text-white/70 mb-1.5 block">Şifre</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(c) => setRemember(!!c)}
                className="border-white/20 data-[state=checked]:bg-[#FF6B2B] data-[state=checked]:border-[#FF6B2B]"
              />
              <label htmlFor="remember" className="text-xs text-white/60">Beni hatırla</label>
            </div>
            <Link to="/forgot-password" className="text-xs text-[#FF6B2B] hover:underline">
              Şifremi Unuttum
            </Link>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 text-sm font-semibold"
            style={{ backgroundColor: "#FF6B2B" }}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/40">veya</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <Button
          variant="outline"
          onClick={handleGoogleLogin}
          className="w-full h-11 bg-white text-gray-800 hover:bg-gray-100 border-0 font-medium"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google ile Giriş Yap
        </Button>

        <p className="text-center text-sm text-white/50 mt-6">
          Hesabınız yok mu?{" "}
          <Link to="/register" className="text-[#FF6B2B] hover:underline font-medium">
            Ücretsiz kayıt olun →
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
