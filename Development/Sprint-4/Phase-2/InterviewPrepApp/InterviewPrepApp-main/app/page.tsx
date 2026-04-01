import Header from "./components/landing/Header";
import Hero from "./components/landing/Hero";
import LogoBar from "./components/landing/LogoBar";
import Features from "./components/landing/Features";
import HowItWorks from "./components/landing/HowItWorks";
import PricingPreview from "./components/landing/PricingPreview";
import Testimonials from "./components/landing/Testimonials";
import FAQ from "./components/landing/FAQ";
import CTA from "./components/landing/CTA";
import Footer from "./components/landing/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <LogoBar />
        <Features />
        <HowItWorks />
        <PricingPreview />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
