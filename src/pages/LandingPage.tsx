import { useSEO } from "@/hooks/useSEO";
import LandingV4 from "@/components/landing/v4/LandingV4";

const LandingPage = () => {
  // Turkish-only metadata: must stay identical to the static index.html head
  // so crawlers never see a mixed-language or duplicated homepage title.
  // Yeni konumlandırma: Construction Profit Intelligence / proje kârlılığı.
  useSEO({
    title: "Şantiyem AI | Proje Kârlılığı ve İnşaat Maliyet Takibi",
    description:
      "Şantiyem AI inşaat projelerinizin final maliyetini ve kârını sürekli tahmin eder. Bütçe takibi, gerçekleşen maliyet ve satın alma verilerinizden kâr kaybını sorun büyümeden gösterir.",
    socialDescription:
      "Projelerinizin final maliyetini ve kârını sürekli tahmin eder, kârı eriten riskleri siz sormadan gösterir.",
    canonicalPath: "/",
  });
  return <LandingV4 />;
};

export default LandingPage;
