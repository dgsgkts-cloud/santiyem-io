import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Check, X, AlertTriangle, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SantiyemAuthLockup } from "@/components/brand/SantiyemLogo";

const MIN_LENGTH = 8;

type TokenStatus = "checking" | "valid" | "expired" | "invalid" | "resent";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("checking");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery") || !hash.includes("access_token=")) {
      setTokenStatus("invalid");
    } else {
      setTokenStatus("valid");
    }
  }, []);

  const rules = [
    { id: "length", label: `En az ${MIN_LENGTH} karakter`, met: password.length >= MIN_LENGTH },
    { id: "uppercase", label: "En az 1 büyük harf", met: /[A-Z]/.test(password) },
    { id: "lowercase", label: "En az 1 küçük harf", met: /[a-z]/.test(password) },
    { id: "number", label: "En az 1 rakam", met: /\d/.test(password) },
    { id: "special", label: "En az 1 özel karakter", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const allRulesMet = rules.every((r) => r.met);
  const passwordsMatch = password.length > 0 && password === confirm;
  const confirmDirty = touched.confirm || confirm.length > 0;
  const canSubmit = allRulesMet && passwordsMatch && password.length > 0;

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    setResendLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResendLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setTokenStatus("resent");
      toast.success("Yeni şifre sıfırlama bağlantısı gönderildi.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesMet) {
      toast.error("Şifre tüm güvenlik kurallarını sağlamalıdır.");
      return;
    }
    if (!passwordsMatch) {
      toast.error("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("expired") || msg.includes("token") || msg.includes("invalid")) {
        setTokenStatus("expired");
      }
      toast.error(error.message);
    } else {
      toast.success("Şifreniz başarıyla güncellendi!");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0F1419" }}>
      <div className="w-full max-w-md rounded-2xl p-8 border border-white/10" style={{ backgroundColor: "#1A1F2E" }}>
        <div className="flex flex-col items-center mb-8">
          <SantiyemAuthLockup className="mb-3 brand-logo-enter" />
          <h1 className="text-xl font-bold text-white">Yeni Şifre Belirle</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-1.5 block">Yeni Şifre</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                required
                className="bg-white/5 border-white/10 text-white pr-10"
                placeholder="En az 8 karakter"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Inline password rule checklist */}
            <ul className="mt-2.5 space-y-1">
              {rules.map((rule) => (
                <li key={rule.id} className="flex items-center gap-2 text-[11.5px]">
                  <span
                    className="flex h-3.5 w-3.5 items-center justify-center rounded-full"
                    style={{ backgroundColor: rule.met ? "rgba(34,197,94,0.16)" : "rgba(255,255,255,0.08)" }}
                  >
                    {rule.met ? (
                      <Check className="h-2.5 w-2.5" style={{ color: "#22C55E" }} />
                    ) : (
                      <X className="h-2.5 w-2.5" style={{ color: "#94A3B8" }} />
                    )}
                  </span>
                  <span style={{ color: rule.met ? "#CBD5E1" : "#94A3B8" }}>{rule.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="text-sm text-white/70 mb-1.5 block">Yeni Şifre Tekrar</label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                required
                className="bg-white/5 border-white/10 text-white pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                aria-label={showConfirm ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmDirty && (
              <p
                className="mt-2 text-[11.5px]"
                style={{ color: passwordsMatch ? "#22C55E" : "#EF4444" }}
              >
                {passwordsMatch ? "Şifreler eşleşiyor." : "Şifreler eşleşmiyor."}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full h-11 font-semibold"
            style={{ backgroundColor: "#FF6B2B" }}
          >
            {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
