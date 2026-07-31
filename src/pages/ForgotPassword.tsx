import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SantiyemAuthLockup } from "@/components/brand/SantiyemLogo";
import { AlertCircle, Mail, CheckCircle2 } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validate = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Lütfen e-posta adresinizi girin.";
    }
    if (trimmed.length > 255) {
      return "E-posta adresi çok uzun.";
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      return "Geçerli bir e-posta adresi girin (örn: ornek@santiyem.ai).";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const validationError = validate(trimmedEmail);
    setEmailError(validationError);
    if (validationError) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("user not found") || msg.includes("not found") || msg.includes("user")) {
        setEmailError("Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.");
      } else if (msg.includes("rate limit") || msg.includes("over_email_send_rate_limit")) {
        toast.error("Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.");
      } else if (msg.includes("invalid") || msg.includes("format")) {
        setEmailError("Geçerli bir e-posta adresi girin.");
      } else {
        toast.error("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
      }
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0F1419" }}>
      <div className="w-full max-w-md rounded-2xl p-8 border border-white/10" style={{ backgroundColor: "#1A1F2E" }}>
        <div className="flex flex-col items-center mb-6">
          <SantiyemAuthLockup className="mb-3 brand-logo-enter" />
          <h1 className="text-xl font-bold text-white">Şifre Sıfırlama</h1>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(34,197,94,0.12)" }}>
              <CheckCircle2 className="h-8 w-8" style={{ color: "#22C55E" }} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">E-postanızı kontrol edin</h2>
            <p className="text-sm text-white/60 mb-6">
              Şifre sıfırlama linki <strong className="text-white/80">{email.trim()}</strong> adresine gönderildi.
            </p>
            <p className="text-xs text-white/40 mb-6">
              E-posta gelmediyse spam/junk klasörünüzü kontrol edin veya farklı bir e-posta adresi deneyin.
            </p>
            <Link to="/login" className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#FF6B2B" }}>
              Girişe Dön
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-white/60 text-center mb-6">
              Hesabınıza ait e-posta adresini girin, şifre sıfırlama linki göndereceğiz.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-1.5 block">E-posta</label>
                <div className="relative">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onBlur={() => setEmailError(validate(email.trim()))}
                    required
                    className={`bg-white/5 border text-white placeholder:text-white/30 pr-10 ${
                      emailError ? "border-red-400/50 focus-visible:ring-red-400/30" : "border-white/10"
                    }`}
                    placeholder="ornek@email.com"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "email-error" : undefined}
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                </div>
                {emailError && (
                  <div id="email-error" className="mt-2 flex items-start gap-2 text-xs" style={{ color: "#EF4444" }}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{emailError}</span>
                  </div>
                )}
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
