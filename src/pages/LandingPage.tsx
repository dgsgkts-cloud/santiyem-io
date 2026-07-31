import { useSEO } from "@/hooks/useSEO";
import LandingV3 from "@/components/landing/v3/LandingV3";

const LandingPage = () => {
  // Turkish-only metadata: must stay identical to the static index.html head
  // so crawlers never see a mixed-language or duplicated homepage title.
  useSEO({
    title: "Şantiyem AI | Yapay Zekâ Destekli Şantiye Yönetimi",
    description:
      "Projeleri, saha operasyonlarını, finansı, hakedişleri, personeli ve stokları tek platformdan yönetin. Şantiyem AI verilerinizi analiz eder, riskleri gösterir ve aksiyonları hızlandırır.",
    socialDescription:
      "Projeleri, saha operasyonlarını, finansı, hakedişleri, personeli ve stokları tek platformdan yönetin.",
    canonicalPath: "/",
  });
  return <LandingV3 />;
};

export default LandingPage;
