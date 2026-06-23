"use client";

import { useLandingNavigate } from "./LandingPage";

export function LandingFooter() {
  const { navigate } = useLandingNavigate();

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };

  return (
    <footer className="w-full bg-[#050505] border-t border-white/[0.04] pt-20 pb-12 px-6 lg:px-8">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between gap-16 md:gap-8">
        
        {/* Brand & Copyright */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center h-6 w-6 rounded-full bg-white/5 ring-1 ring-white/10">
              <div className="h-1.5 w-1.5 rounded-full bg-white opacity-80" />
            </div>
            <span className="font-sans text-sm font-medium tracking-tight text-white select-none">
              Thinkly
            </span>
          </div>
          <p className="text-zinc-500 text-xs max-w-xs text-pretty">
            The orchestration layer for autonomous agents and intelligent workflows. Built for scale, designed for precision.
          </p>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-24">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold text-white tracking-wider uppercase">Platform</span>
            <a href="#features" className="text-sm text-zinc-500 hover:text-white transition-colors">Features</a>
            <a href="#demo" className="text-sm text-zinc-500 hover:text-white transition-colors">Simulator</a>
            <a href="/pricing" onClick={(e) => handleLink(e, "/pricing")} className="text-sm text-zinc-500 hover:text-white transition-colors">Pricing</a>
          </div>
          
          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold text-white tracking-wider uppercase">Resources</span>
            <a href="/docs" onClick={(e) => handleLink(e, "/docs")} className="text-sm text-zinc-500 hover:text-white transition-colors">Documentation</a>
            <a href="/api-reference" onClick={(e) => handleLink(e, "/api-reference")} className="text-sm text-zinc-500 hover:text-white transition-colors">API Reference</a>
            <a href="/guides" onClick={(e) => handleLink(e, "/guides")} className="text-sm text-zinc-500 hover:text-white transition-colors">Guides</a>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold text-white tracking-wider uppercase">Company</span>
            <a href="/about" onClick={(e) => handleLink(e, "/about")} className="text-sm text-zinc-500 hover:text-white transition-colors">About</a>
            <a href="/blog" onClick={(e) => handleLink(e, "/blog")} className="text-sm text-zinc-500 hover:text-white transition-colors">Blog</a>
            <a href="/contact" onClick={(e) => handleLink(e, "/contact")} className="text-sm text-zinc-500 hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </div>
      
      <div className="mx-auto max-w-7xl mt-24 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-zinc-600">
          © {new Date().getFullYear()} Thinkly Inc. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <a href="/privacy" className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">Privacy Policy</a>
          <a href="/terms" className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
