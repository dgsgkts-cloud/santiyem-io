import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface UsageLimitBannerProps {
  type: "aiQuestions" | "projectAnalysis" | "photoAnalysis" | "ekbCalc" | "costCalc";
}

const LABELS: Record<string, { title: string; resetText: string }> = {
  aiQuestions: { title: "Bugünkü 3 ücretsiz sorunuzu kullandınız.", resetText: "Kota yarın sıfırlanır" },
  projectAnalysis: { title: "Bu ayki 2 ücretsiz analizinizi kullandınız.", resetText: "Kota ay başında sıfırlanır" },
  photoAnalysis: { title: "Bu ayki 2 ücretsiz fotoğraf analizinizi kullandınız.", resetText: "Kota ay başında sıfırlanır" },
  ekbCalc: { title: "Bu ayki 2 ücretsiz EKB hesaplamanızı kullandınız.", resetText: "Kota ay başında sıfırlanır" },
  costCalc: { title: "Bu ayki 1 ücretsiz maliyet hesaplamanızı kullandınız.", resetText: "Kota ay başında sıfırlanır" },
};

const UsageLimitBanner = ({ type }: UsageLimitBannerProps) => {
  const { canUse, plan } = useUser();

  if (plan !== "free" || canUse(type)) return null;

  const label = LABELS[type];

  return (
    <div className="mx-3 mb-3 p-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium text-yellow-200">{label.title} 🔒</span>
      </div>
      <p className="text-sm">
        <span className="text-[#FF6B2B] hover:underline cursor-pointer">
          Sınırsız kullanım için Pro plana geçin →
        </span>
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label.resetText}</p>
    </div>
  );
};

export default UsageLimitBanner;
