import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import logo from "@/assets/muhendis-logo.png";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0F1419" }}>
      <div className="w-full max-w-md rounded-2xl p-8 border border-white/10" style={{ backgroundColor: "#1A1F2E" }}>
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Şantiyem" className="w-14 h-14 mb-3" />
          <h1 className="text-xl font-bold text-white">Şifre Sıfırlama</h1>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="text-lg font-semibold text-white mb-2">E-postanızı kontrol edin</h2>
            <p className="text-sm text-white/60 mb-6">
              Şifre sıfırlama linki <strong className="text-white/80">{email}</strong> adresine gönderildi.
            </p>
            <Link to="/login" className="text-[#FF6B2B] text-sm hover:underline">
              ← Giriş sayfasına dön
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-white/60 text-center mb-6">
              E-posta adresinizi girin, şifre sıfırlama linki göndereceğiz.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-1.5 block">E-posta</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30" placeholder="ornek@email.com" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 font-semibold"
                style={{ backgroundColor: "#FF6B2B" }}>
                {loading ? "Gönderiliyor..." : "Sıfırlama Linki Gönder"}
              </Button>
            </form>
            <p className="text-center text-sm text-white/50 mt-6">
              <Link to="/login" className="text-[#FF6B2B] hover:underline">← Giriş sayfasına dön</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
