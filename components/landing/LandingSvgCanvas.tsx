"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Cpu, Server, Network } from "lucide-react";

interface EdgePath {
  d: string;
}

export function LandingSvgCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const node1Ref = useRef<HTMLDivElement>(null);
  const node2Ref = useRef<HTMLDivElement>(null);
  const node3Ref = useRef<HTMLDivElement>(null);

  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [edges, setEdges] = useState<EdgePath[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const computeEdges = useCallback(() => {
    const container = containerRef.current;
    const n1 = node1Ref.current;
    const n2 = node2Ref.current;
    const n3 = node3Ref.current;
    if (!container || !n1 || !n2 || !n3) return;

    const cr = container.getBoundingClientRect();

    const relPoint = (el: HTMLElement, side: "right" | "left") => {
      const r = el.getBoundingClientRect();
      return {
        x: side === "right" ? r.right - cr.left : r.left - cr.left,
        y: r.top - cr.top + r.height / 2,
      };
    };

    const p1Out = relPoint(n1, "right");
    const p2In = relPoint(n2, "left");
    const p2Out = relPoint(n2, "right");
    const p3In = relPoint(n3, "left");

    const makePath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const dx = Math.abs(to.x - from.x) * 0.4;
      return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
    };

    setEdges([
      { d: makePath(p1Out, p2In) },
      { d: makePath(p2Out, p3In) },
    ]);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Compute edges initially
    computeEdges();
    
    // Also run on a slight timeout to ensure layouts/fonts are settled
    const timer = setTimeout(computeEdges, 100);

    const handleResize = () => computeEdges();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [computeEdges, mounted]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateX(-y / 60);
    setRotateY(x / 60);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full min-h-[400px] flex items-center justify-center overflow-hidden cursor-crosshair bg-transparent"
      style={{
        transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        transformStyle: "preserve-3d"
      }}
    >
      {/* Ultra-subtle grid background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.08]" 
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      
      {/* Central soft illumination */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full bg-white/[0.02] blur-[120px]" />
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>
        {edges.map((edge, i) => (
          <g key={i}>
            {/* Base faint edge */}
            <path
              d={edge.d}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="2"
            />
            {/* Animated mask over the gradient */}
            <path
              d={edge.d}
              fill="none"
              stroke="url(#edge-gradient)"
              strokeWidth="2"
              strokeDasharray="200"
              strokeDashoffset="0"
              className="animate-[dash_3s_linear_infinite]"
            />
          </g>
        ))}
      </svg>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash {
          to {
            stroke-dashoffset: -400;
          }
        }
      `}} />

      {/* Nodes Container - scaled up and tighter gaps */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col md:flex-row items-center justify-between px-4 md:px-12 gap-8 md:gap-0" style={{ transform: "translateZ(40px) scale(1.1)" }}>
        
        {/* Node 1 */}
        <motion.div
          ref={node1Ref}
          className="group relative flex flex-col items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="rounded-[1.25rem] bg-white/[0.03] ring-1 ring-white/[0.05] p-[5px] backdrop-blur-md transition-all duration-500 hover:bg-white/[0.05] hover:ring-white/[0.1]">
            <div className="rounded-[calc(1.25rem-5px)] bg-[#0A0A0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] w-48 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-zinc-900 ring-1 ring-white/10">
                    <Server className="h-3.5 w-3.5 text-zinc-400" />
                  </div>
                  <span className="text-xs font-medium text-white">Database</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] text-zinc-500">Connected</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/5 border border-white/5">
                  <span className="text-[10px] text-zinc-400">Query Type</span>
                  <span className="text-[10px] text-zinc-200">Semantic</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/5 border border-white/5">
                  <span className="text-[10px] text-zinc-400">Limit</span>
                  <span className="text-[10px] text-zinc-200">100</span>
                </div>
              </div>
            </div>
          </div>
          {/* Output Handle */}
          <div className="absolute right-[-7px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#050505] ring-[1.5px] ring-purple-500 z-20 group-hover:bg-purple-500 transition-colors shadow-[0_0_8px_rgba(139,92,246,0.3)]" />
        </motion.div>

        {/* Node 2 */}
        <motion.div
          ref={node2Ref}
          className="group relative flex flex-col items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="rounded-[1.25rem] bg-white/[0.03] ring-1 ring-white/[0.05] p-[5px] backdrop-blur-md transition-all duration-500 hover:bg-white/[0.05] hover:ring-white/[0.1]">
            <div className="rounded-[calc(1.25rem-5px)] bg-[#0A0A0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] w-56 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-zinc-900 ring-1 ring-white/10">
                    <Cpu className="h-3.5 w-3.5 text-zinc-400" />
                  </div>
                  <span className="text-xs font-medium text-white">LLM Router</span>
                </div>
                <div className="h-4 w-4 rounded-full border border-white/10 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] uppercase text-zinc-600 font-medium mb-1.5 block">Model</span>
                  <div className="h-6 w-full rounded border border-white/5 bg-white/5 flex items-center px-2">
                    <span className="text-[10px] text-zinc-300">gpt-4-turbo</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-zinc-600 font-medium mb-1.5 block">System Prompt</span>
                  <div className="h-12 w-full rounded border border-white/5 bg-white/5 p-2 overflow-hidden">
                    <div className="h-1 w-full rounded-full bg-white/10 mb-1" />
                    <div className="h-1 w-5/6 rounded-full bg-white/10 mb-1" />
                    <div className="h-1 w-3/4 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Handles */}
          <div className="absolute left-[-7px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#050505] ring-[1.5px] ring-purple-500 z-20 group-hover:bg-purple-500 transition-colors" />
          <div className="absolute right-[-7px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#050505] ring-[1.5px] ring-blue-500 z-20 group-hover:bg-blue-500 transition-colors shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
        </motion.div>

        {/* Node 3 */}
        <motion.div
          ref={node3Ref}
          className="group relative flex flex-col items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="rounded-[1.25rem] bg-white/[0.03] ring-1 ring-white/[0.05] p-[5px] backdrop-blur-md transition-all duration-500 hover:bg-white/[0.05] hover:ring-white/[0.1]">
            <div className="rounded-[calc(1.25rem-5px)] bg-[#0A0A0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] w-48 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-zinc-900 ring-1 ring-white/10">
                  <Network className="h-3.5 w-3.5 text-zinc-400" />
                </div>
                <span className="text-xs font-medium text-white">Webhook API</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/5 border border-white/5">
                  <span className="text-[10px] text-zinc-400">Method</span>
                  <span className="text-[10px] text-zinc-200">POST</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-500">Status</span>
                  <span className="text-[10px] text-emerald-400">200 OK</span>
                </div>
              </div>
            </div>
          </div>
          {/* Input Handle */}
          <div className="absolute left-[-7px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#050505] ring-[1.5px] ring-blue-500 z-20 group-hover:bg-blue-500 transition-colors" />
        </motion.div>

      </div>
    </div>
  );
}
