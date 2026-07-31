import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SantiyemAuthLockup } from "@/components/brand/SantiyemLogo";

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
          <SantiyemAuthLockup className="mb-3 brand-logo-enter" />
          <h1 className="text-xl font-bold text-white">Şifre Sıfırlama</h1>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(34,197,94,0.12)" }}>
              <svg className="h-8 w-8" style={{ color: "#22C55E" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">E-postanızı kontrol edin</h2>
            <p className="text-sm text-white/60 mb-6">
              Şifre sıfırlama linki <strong className="text-white/80">{email}</strong> adresine gönderildi.
            </p>
            <Link to="/login" className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#FF6B2B" }}>
              Girişe Dön
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
