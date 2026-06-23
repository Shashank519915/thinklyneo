"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LandingNavbar } from "./LandingNavbar";
import { LandingHero } from "./LandingHero";
import { LandingLogos } from "./LandingLogos";
import { LandingBento } from "./LandingBento";
import { LandingInteractivePreview } from "./LandingInteractivePreview";
import { LandingCTA } from "./LandingCTA";
import { LandingFooter } from "./LandingFooter";
import { SvgNoiseFilter } from "./SvgNoiseFilter";

type LandingTransitionContextValue = {
  navigate: (href: string) => void;
  isExiting: boolean;
};

const LandingTransitionContext = createContext<LandingTransitionContextValue | null>(null);

export function useLandingNavigate() {
  const ctx = useContext(LandingTransitionContext);
  if (!ctx) {
    return {
      navigate: (href: string) => {
        if (typeof window !== "undefined") window.location.href = href;
      },
      isExiting: false,
    };
  }
  return ctx;
}

export function LandingPage() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const navigate = (href: string) => {
    setIsExiting(true);
    setTimeout(() => {
      router.push(href);
    }, 450);
  };

  /* Scroll-reveal: observe all [data-reveal] sections */
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      // Immediately show all sections
      mainRef.current
        ?.querySelectorAll("[data-reveal]")
        .forEach((el) => el.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "-40px" }
    );

    mainRef.current
      ?.querySelectorAll("[data-reveal]")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <LandingTransitionContext.Provider value={{ navigate, isExiting }}>
      <div 
        ref={mainRef}
        className={`relative min-h-[100dvh] w-full bg-[#050505] text-foreground overflow-x-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isExiting ? "opacity-0 scale-[0.985] blur-[8px]" : "opacity-100 scale-100 blur-0"
        }`}
      >
        {/* SVG noise filter definition (invisible, for film-grain references) */}
        <SvgNoiseFilter />

        {/* Silk Flow Background Blobs — quieter, smaller */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[8%] left-[12%] w-[400px] h-[400px] rounded-full bg-purple-600/[0.05] blur-[140px] silk-blob-1" />
          <div className="absolute bottom-[18%] right-[10%] w-[500px] h-[500px] rounded-full bg-indigo-600/[0.04] blur-[160px] silk-blob-2" />
        </div>

        {/* Page Modules */}
        <div className="relative z-10 flex flex-col w-full">
          <LandingNavbar />
          <LandingHero />
          <div data-reveal><LandingLogos /></div>
          <div data-reveal><LandingBento /></div>
          <div data-reveal><LandingInteractivePreview /></div>
          <div data-reveal><LandingCTA /></div>
          <LandingFooter />
        </div>
      </div>
    </LandingTransitionContext.Provider>
  );
}

export default LandingPage;
