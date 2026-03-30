import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Clock, Building2, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Footer from "@/components/Footer";

const SUBJECTS = ["Teknik Destek", "Abonelik ve Ödeme", "Öneri ve Görüş", "Diğer"];

const Iletisim = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: SUBJECTS[0], message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success("Mesajınız alındı. En kısa sürede dönüş yapacağız.");
      setForm({ name: "", email: "", subject: SUBJECTS[0], message: "" });
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0A0E13" }}>
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "#F1F5F9" }}>İletişim</h1>
          <p className="text-sm sm:text-base" style={{ color: "#94A3B8" }}>
            Sorularınız için bize ulaşın, en kısa sürede yanıt veririz.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Company Info */}
          <div className="rounded-xl p-6" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <h2 className="text-lg font-semibold mb-5" style={{ color: "#F1F5F9" }}>Şirket Bilgileri</h2>

            <div className="space-y-4 text-sm" style={{ color: "#94A3B8" }}>
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FF6B2B" }} />
                <div>
                  <p className="font-medium" style={{ color: "#CBD5E1" }}>Şirket Unvanı</p>
                  <p>Göktaş Global Mühendislik İnşaat İç ve Dış Tic. Lim. Şirketi</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FF6B2B" }} />
                <div>
                  <p className="font-medium" style={{ color: "#CBD5E1" }}>MERSİS No</p>
                  <p>0406071938000001</p>
                  <p className="mt-1 font-medium" style={{ color: "#CBD5E1" }}>Vergi Dairesi / No</p>
                  <p>Akdeniz Vergi Dairesi / 4060719380</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FF6B2B" }} />
                <div>
                  <p className="font-medium" style={{ color: "#CBD5E1" }}>Adres</p>
                  <p>Uluçınar Mah. 12 Özgürkent Sk. No:4 Arsuz / Hatay</p>
                </div>
              </div>

              <div className="h-px my-2" style={{ backgroundColor: "#1E2732" }} />

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FF6B2B" }} />
                <div>
                  <p>info@goktasglobal.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FF6B2B" }} />
                <div>
                  <p>+90 (533) 377 11 56</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FF6B2B" }} />
                <div>
                  <p className="font-medium" style={{ color: "#CBD5E1" }}>KEP Adresi</p>
                  <p>goktasglobal@hs06.kep.tr</p>
                </div>
              </div>

              <div className="h-px my-2" style={{ backgroundColor: "#1E2732" }} />

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FF6B2B" }} />
                <div>
                  <p className="font-medium" style={{ color: "#CBD5E1" }}>Çalışma Saatleri</p>
                  <p>Pazartesi – Cuma: 09:00 – 18:00</p>
                  <p>Cumartesi – Pazar: Kapalı</p>
                </div>
              </div>

              <p className="text-xs italic mt-3" style={{ color: "#64748B" }}>
                Talepler genellikle 1-2 iş günü içinde yanıtlanır.
              </p>
            </div>
          </div>

          {/* Right — Contact Form */}
          <div className="rounded-xl p-6" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <h2 className="text-lg font-semibold mb-5" style={{ color: "#F1F5F9" }}>İletişim Formu</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>Ad Soyad</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
                  style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
                  placeholder="Adınız Soyadınız"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>E-posta</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
                  style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
                  placeholder="ornek@mail.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>Konu</label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
                  style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
                >
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#94A3B8" }}>Mesaj</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors resize-none"
                  style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
                  placeholder="Mesajınızı yazın..."
                />
              </div>
              <Button
                type="submit"
                disabled={sending}
                className="w-full h-11 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: "#FF6B2B" }}
              >
                <Send className="w-4 h-4 mr-2" />
                {sending ? "Gönderiliyor..." : "Gönder"}
              </Button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Iletisim;
