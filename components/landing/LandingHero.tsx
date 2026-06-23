"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { LandingSvgCanvas } from "./LandingSvgCanvas";
import { useLandingNavigate } from "./LandingPage";

export function LandingHero() {
  const { navigate } = useLandingNavigate();

  return (
    <section className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center pt-32 pb-24 px-4 overflow-hidden">
      {/* Background gradients are handled globally, but we can add an extra hero-specific glow here */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-white/[0.03] blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Eyebrow */}
        <motion.div
          initial={{ y: 20, opacity: 0, filter: "blur(8px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-white/5 ring-1 ring-white/10 text-zinc-300"
        >
          Thinkly 2.0 • The Agentic Layer
        </motion.div>

        {/* Massive H1 */}
        <motion.div
          initial={{ y: 30, opacity: 0, filter: "blur(12px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 max-w-4xl"
        >
          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] leading-[1.05] tracking-tight font-medium text-white text-balance">
            Orchestrate AI workflows with absolute precision.
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 20, opacity: 0, filter: "blur(8px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 max-w-2xl text-base md:text-lg text-zinc-400 text-pretty"
        >
          Design, test, and deploy complex multi-agent architectures on a limitless canvas. Built for engineering teams that demand production-grade reliability.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <button 
            onClick={() => navigate("/sign-up")}
            className="group relative flex items-center gap-4 rounded-full bg-white pl-6 pr-2 py-2 text-sm font-medium text-black transition-all duration-300 active:scale-[0.98]"
          >
            Start building
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:bg-black/10">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </button>
          <button 
            onClick={() => navigate("/docs")}
            className="group relative flex items-center gap-4 rounded-full bg-transparent pl-6 pr-2 py-2 text-sm font-medium text-white ring-1 ring-white/10 hover:bg-white/5 transition-all duration-300 active:scale-[0.98]"
          >
            Read the docs
          </button>
        </motion.div>
      </div>

      {/* Hero Visuals / Interactive Canvas Element */}
      <motion.div
        initial={{ y: 60, opacity: 0, filter: "blur(16px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mt-24 w-full max-w-6xl px-4 md:px-8"
      >
        <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-[2rem] bg-white/[0.02] ring-1 ring-white/[0.08] p-1.5 overflow-hidden">
          {/* Inner Core */}
          <div className="relative w-full h-full rounded-[calc(2rem-0.375rem)] bg-[#0A0A0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden">
            <LandingSvgCanvas />
            
            {/* Soft overlay gradient to fade out bottom */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
