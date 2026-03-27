import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/muhendis-logo.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      // Not a valid recovery link
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Şifre en az 8 karakter olmalıdır."); return; }
    if (password !== confirm) { toast.error("Şifreler eşleşmiyor."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
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
          <img src={logo} alt="MühendisAI" className="w-14 h-14 mb-3" />
          <h1 className="text-xl font-bold text-white">Yeni Şifre Belirle</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-1.5 block">Yeni Şifre</label>
            <div className="relative">
              <Input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                className="bg-white/5 border-white/10 text-white pr-10" placeholder="En az 8 karakter" />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-white/70 mb-1.5 block">Yeni Şifre Tekrar</label>
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              className="bg-white/5 border-white/10 text-white" placeholder="••••••••" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 font-semibold"
            style={{ backgroundColor: "#FF6B2B" }}>
            {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
