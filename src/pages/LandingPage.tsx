import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import SocialProofBand from "@/components/landing/SocialProofBand";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import DemoSection from "@/components/landing/DemoSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import LandingFooter from "@/components/landing/LandingFooter";

const LandingPage = () => (
  <div className="min-h-screen" style={{ background: "#0F1419" }}>
    <LandingNavbar />
    <HeroSection />
    <SocialProofBand />
    <FeaturesSection />
    <HowItWorksSection />
    <DemoSection />
    <TestimonialsSection />
    <PricingSection />
    <FAQSection />
    <FinalCTASection />
    <LandingFooter />
  </div>
);

export default LandingPage;
