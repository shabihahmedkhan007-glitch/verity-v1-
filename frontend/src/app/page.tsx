import { LandingNav } from "@/components/sections/landing/LandingNav";
import { HeroSection } from "@/components/sections/landing/HeroSection";
import { LoopSection } from "@/components/sections/landing/LoopSection";
import { TrustSection } from "@/components/sections/landing/TrustSection";
import { LimitsSection } from "@/components/sections/landing/LimitsSection";
import { SiteFooter } from "@/components/sections/landing/SiteFooter";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <HeroSection />
        <LoopSection />
        <TrustSection />
        <LimitsSection />
      </main>
      <SiteFooter />
    </>
  );
}
