import { useSEO } from "@/hooks/useSEO";
import LandingV3 from "@/components/landing/v3/LandingV3";

const LandingPage = () => {
  useSEO({
    title: "Şantiyem AI — The AI Operating System for Construction Companies",
    description: "İnşaat firmaları için AI işletim sistemi. Projeler, finans, hakediş, personel, malzeme — tek bir zekada. 14 gün ücretsiz.",
    canonicalPath: "/",
  });
  return <LandingV3 />;
};

export default LandingPage;
