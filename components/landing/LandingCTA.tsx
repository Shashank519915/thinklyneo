"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useLandingNavigate } from "./LandingPage";

export function LandingCTA() {
  const { navigate } = useLandingNavigate();

  return (
    <section className="relative w-full py-40 px-4 flex flex-col items-center justify-center overflow-hidden bg-[#050505]">
      
      {/* Immersive mesh background for CTA */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
        <div className="absolute w-[600px] h-[600px] bg-purple-500/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute w-[400px] h-[400px] bg-white/5 blur-[80px] rounded-full mix-blend-screen translate-y-20" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ y: 30, opacity: 0, filter: "blur(12px)" }}
          whileInView={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-5xl md:text-7xl font-medium text-white tracking-tight text-balance mb-8">
            Start building your <br className="hidden md:block" />
            agentic future.
          </h2>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-6"
        >
          <button 
            onClick={() => navigate("/sign-up")}
            className="group relative flex items-center gap-4 rounded-full bg-white pl-8 pr-2.5 py-2.5 text-base font-medium text-black transition-all duration-300 active:scale-[0.98] shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)]"
          >
            Deploy for free
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:bg-black/10">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
