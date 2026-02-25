import Header from "./components/landing/Header";
import Hero from "./components/landing/Hero";
import Features from "./components/landing/Features";
import CTA from "./components/landing/CTA";
import GlobalGradient from "./components/landing/GlobalGradient";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0b0b0b]">
      <Header />
      <main className="relative">
        <GlobalGradient />
        <Hero />
        <Features />
        <CTA />
      </main>
    </div>
  );
}
