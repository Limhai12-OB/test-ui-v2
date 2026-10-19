import type { Metadata } from "next";
import s from "@/components/landing/landing.module.css";
import Nav from "@/components/landing/nav";
import Hero from "@/components/landing/hero";
import LogoStrip from "@/components/landing/logo-strip";
import Features from "@/components/landing/features";
import Roles from "@/components/landing/roles";
import Showcase from "@/components/landing/showcase";
import Testimonials from "@/components/landing/testimonials";
import Guides from "@/components/landing/guides";
import Cta from "@/components/landing/cta";
import Footer from "@/components/landing/footer";
import RevealObserver from "@/components/landing/reveal-observer";

export const metadata: Metadata = {
  title: "FinanceSight · Bookkeeping, cash and planning for Cambodian retail",
  description:
    "FinanceSight helps small retail businesses in Cambodia keep their books, understand their cash position and plan ahead, in Khmer or English and in USD or KHR.",
};

/** Marketing landing page, ported from github.com/Limhai12-OB/landingPageLedger (styles in landing.module.css). */
export default function Home() {
  return (
    <div className={s.page}>
      <Nav />
      <main>
        <Hero />
        <LogoStrip />
        <Features />
        <Roles />
        <Showcase />
        <Testimonials />
        <div className={s.tint}>
          <Guides />
          <Cta />
        </div>
      </main>
      <Footer />
      <RevealObserver />
    </div>
  );
}
