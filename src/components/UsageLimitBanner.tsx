import { Lock } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";

interface UsageLimitBannerProps {
  type: "aiQuestions" | "photoAnalysis" | "render" | "reminders";
}

const LABELS: Record<string, { title: string; resetText: string }> = {
  aiQuestions: { title: "Günlük AI soru limitine ulaşıldı.", resetText: "Kota yarın sıfırlanır" },
  photoAnalysis: { title: "Bugünkü ücretsiz fotoğraf analizlerinizi kullandınız.", resetText: "Kota yarın sıfırlanır" },
  render: { title: "Bugünkü AI render hakkınızı kullandınız.", resetText: "Kota yarın sıfırlanır" },
  reminders: { title: "Maksimum hatırlatıcı sayısına ulaştınız.", resetText: "Mevcut hatırlatıcıları tamamlayın" },
};

const UsageLimitBanner = ({ type }: UsageLimitBannerProps) => {
  const { canUse, plan } = useUser();

  if (canUse(type)) return null;

  const label = LABELS[type];

  return (
    <div className="mx-3 mb-3 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium text-yellow-200">{label.title} 🔒</span>
      </div>
      <p className="text-sm">
        <span className="text-[#FF6B2B] hover:underline cursor-pointer">
          Sınırsız kullanım için planınızı yükseltin →
        </span>
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label.resetText}</p>
    </div>
  );
};

export default UsageLimitBanner;
