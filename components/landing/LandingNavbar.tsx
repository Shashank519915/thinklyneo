"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useLandingNavigate } from "./LandingPage";
import { motion, AnimatePresence } from "motion/react";

export function LandingNavbar() {
  const { isSignedIn } = useAuth();
  const { navigate } = useLandingNavigate();
  const [mounted, setMounted] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setIsMobileOpen(false);
    navigate(href);
  };

  return (
    <>
      <nav
        role="navigation"
        aria-label="Main navigation"
        className="fixed top-6 left-1/2 z-[100] -translate-x-1/2"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex h-14 items-center justify-between rounded-full bg-black/60 px-6 backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5)] w-[calc(100vw-3rem)] md:w-max min-w-[300px] gap-8"
        >
          {/* Logo */}
          <a
            href="/"
            onClick={(e) => handleLink(e, "/")}
            className="flex items-center gap-2 group cursor-pointer shrink-0"
          >
            <div className="relative flex items-center justify-center h-7 w-7 rounded-full bg-white/5 ring-1 ring-white/10 group-hover:bg-white/10 transition-colors duration-300">
              <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.4)]" />
            </div>
            <span className="font-sans text-sm font-medium tracking-tight text-white select-none">
              Thinkly
            </span>
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-6">
            {["Platform", "Features", "Docs"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={(e) => item === "Docs" ? handleLink(e, "/docs") : null}
                className="text-xs font-medium text-zinc-400 hover:text-white transition-colors duration-300"
              >
                {item}
              </a>
            ))}
          </div>

          {/* Action Buttons & Mobile Toggle */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden md:flex items-center gap-3">
              {!mounted ? (
                <div className="h-8 w-20 rounded-full bg-white/5 animate-pulse" />
              ) : isSignedIn ? (
                <button
                  onClick={(e) => handleLink(e, "/dashboard")}
                  className="group relative inline-flex h-8 items-center justify-center rounded-full bg-white px-4 text-xs font-medium text-black hover:bg-zinc-200 transition-colors duration-300"
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <a
                    href="/sign-in"
                    onClick={(e) => handleLink(e, "/sign-in")}
                    className="text-xs font-medium text-zinc-400 hover:text-white transition-colors duration-300"
                  >
                    Log in
                  </a>
                  <button
                    onClick={(e) => handleLink(e, "/sign-up")}
                    className="group relative inline-flex h-8 items-center justify-center rounded-full bg-white px-4 text-xs font-medium text-black hover:bg-zinc-200 transition-colors duration-300 overflow-hidden active:scale-[0.98]"
                  >
                    <span className="relative z-10 flex items-center gap-1.5">
                      Sign up
                    </span>
                  </button>
                </>
              )}
            </div>

            {/* Mobile Hamburger Morph */}
            <button
              className="md:hidden relative flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
              <div className="relative w-3 h-3">
                <span
                  className={`absolute left-0 top-0 h-[1.5px] w-full bg-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    isMobileOpen ? "translate-y-[5px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-[5px] h-[1.5px] w-full bg-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    isMobileOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-[10px] h-[1.5px] w-full bg-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    isMobileOpen ? "-translate-y-[5px] -rotate-45" : ""
                  }`}
                />
              </div>
            </button>
          </div>
        </motion.div>
      </nav>

      {/* Mobile Modal Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-[90] bg-black/80 flex flex-col items-center justify-center px-6"
          >
            <div className="flex flex-col items-center gap-8 text-center">
              {["Platform", "Features", "Docs"].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <a
                    href={`#${item.toLowerCase()}`}
                    onClick={(e) => {
                      if (item === "Docs") handleLink(e, "/docs");
                      else setIsMobileOpen(false);
                    }}
                    className="text-2xl font-medium text-white tracking-tight"
                  >
                    {item}
                  </a>
                </motion.div>
              ))}
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-8 flex flex-col gap-4 w-full max-w-[200px]"
              >
                {!mounted ? null : isSignedIn ? (
                  <button
                    onClick={(e) => handleLink(e, "/dashboard")}
                    className="h-12 w-full rounded-full bg-white text-sm font-medium text-black"
                  >
                    Dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={(e) => handleLink(e, "/sign-up")}
                      className="h-12 w-full rounded-full bg-white text-sm font-medium text-black"
                    >
                      Sign up
                    </button>
                    <button
                      onClick={(e) => handleLink(e, "/sign-in")}
                      className="h-12 w-full rounded-full bg-white/5 ring-1 ring-white/10 text-sm font-medium text-white"
                    >
                      Log in
                    </button>
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
