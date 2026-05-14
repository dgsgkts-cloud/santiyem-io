import { lazy, Suspense } from "react";
import { useSEO } from "@/hooks/useSEO";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";


const FeaturesSection = lazy(() => import("@/components/landing/FeaturesSection"));
const HowItWorksSection = lazy(() => import("@/components/landing/HowItWorksSection"));
const DemoSection = lazy(() => import("@/components/landing/DemoSection"));
const TestimonialsSection = lazy(() => import("@/components/landing/TestimonialsSection"));
const PricingSection = lazy(() => import("@/components/landing/PricingSection"));
const FAQSection = lazy(() => import("@/components/landing/FAQSection"));
const FinalCTASection = lazy(() => import("@/components/landing/FinalCTASection"));
const LandingFooter = lazy(() => import("@/components/landing/LandingFooter"));

const LandingPage = () => {
  useSEO({
    title: "Şantiyem — AI Destekli Şantiye Yönetim Platformu",
    description: "Hakediş takibi, proje yönetimi, şantiye günlüğü ve AI asistan — hepsi bir arada. Türk mühendis, mimar ve müteahhitler için tasarlandı. 14 gün ücretsiz dene.",
    canonicalPath: "/",
  });
  return (
    <div className="min-h-screen landing-dark" style={{ background: "#0F1419" }}>
      <LandingNavbar />
      <main>
        <HeroSection />
        <Suspense fallback={<div className="min-h-[200px]" />}>
          <FeaturesSection />
          <HowItWorksSection />
          <DemoSection />
          <TestimonialsSection />
          <PricingSection />
          <FAQSection />
          <FinalCTASection />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <LandingFooter />
      </Suspense>
    </div>
  );
};

export default LandingPage;
