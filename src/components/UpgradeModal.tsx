import { Check, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  requiresOffice?: boolean;
}

const UpgradeModal = ({ open, onClose, feature, requiresOffice }: UpgradeModalProps) => {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 p-6" style={{ backgroundColor: "#1A1F2E" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">
              {requiresOffice ? "Kurumsal Plana Geçin" : "Planınızı Yükseltin"}
            </h3>
            <button onClick={onClose} className="text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-white/60 mb-4">
            <strong className="text-white">{feature}</strong>{" "}
            {requiresOffice ? "Kurumsal plan özelliğidir." : "bu özelliğe erişmek için planınızı yükseltmeniz gerekir."}
          </p>
          {requiresOffice ? (
            <>
              <div className="space-y-2 mb-6">
                {["Proje Yönetimi", "Hakediş Yönetimi", "Ekip davet sistemi", "Kanban görev yönetimi", "Rol tabanlı yetkilendirme"].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                    <Check className="w-4 h-4 text-green-500" /> {f}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Button className="w-full h-11 font-semibold text-white" style={{ backgroundColor: "#FF6B2B" }}>
                  <Building2 className="w-4 h-4 mr-2" />
                  Kurumsal Pro — 2.499₺/ay
                </Button>
                <p className="text-center text-xs text-white/40">Ücretsiz Kurumsal plan ile de başlayabilirsiniz</p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 mb-6">
                {["Sınırsız AI Asistan", "AI Mimari Render", "Hatırlatıcılar", "PDF/Excel indirme"].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                    <Check className="w-4 h-4 text-green-500" /> {f}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Button className="w-full h-11 font-semibold text-white" style={{ backgroundColor: "#FF6B2B" }}>
                  Plus'a Geç — 199₺/ay
                </Button>
                <Button className="w-full h-11 font-semibold bg-transparent border border-[#FF6B2B] text-[#FF6B2B] hover:bg-[#FF6B2B]/10">
                  Pro'ya Geç — 399₺/ay
                </Button>
                <p className="text-center text-xs text-white/40">14 gün ücretsiz deneme</p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UpgradeModal;
