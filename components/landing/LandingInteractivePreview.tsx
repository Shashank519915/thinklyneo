"use client";

import { motion } from "motion/react";
import { Play, Activity, Server, Cpu, Network, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function LandingInteractivePreview() {
  const [step, setStep] = useState(0);

  // Auto-playing simulation steps
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="demo" className="w-full py-32 px-4 md:px-8 bg-[#050505] flex flex-col items-center overflow-hidden">
      <div className="w-full max-w-6xl">
        
        {/* Section Header */}
        <div className="mb-20 max-w-2xl text-center mx-auto flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <div className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-zinc-400 ring-1 ring-white/10 mb-6">
              Interactive Simulator
            </div>
            <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight text-balance mb-6">
              Test execution in real-time.
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl text-pretty">
              Watch your workflows execute step-by-step. Inspect payload state, latency, and token consumption instantly.
            </p>
          </motion.div>
        </div>

        {/* The Interface Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full rounded-[2rem] bg-white/[0.02] ring-1 ring-white/[0.05] p-2"
        >
          <div className="w-full rounded-[calc(2rem-8px)] bg-[#0A0A0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/5 overflow-hidden flex flex-col min-h-[500px] md:h-[600px]">
            
            {/* Top Bar */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#050505]/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                </div>
                <div className="ml-4 h-6 w-px bg-white/10" />
                <span className="text-xs font-mono text-zinc-500">production_pipeline_v2</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-500">Live</span>
                </div>
                <button className="group relative flex items-center gap-2 rounded-full bg-white pl-4 pr-1.5 py-1.5 text-xs font-medium text-black transition-all duration-300 hover:bg-zinc-200">
                  Run Test
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10">
                    <Play className="h-2.5 w-2.5 fill-black" />
                  </div>
                </button>
              </div>
            </div>

            {/* Split View */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
              
              {/* Left Panel - Execution Canvas */}
              <div className="flex-[2] border-r border-white/5 bg-[#050505] relative overflow-hidden flex items-center justify-center">
                
                {/* Dotted Grid Background */}
                <div 
                  className="absolute inset-0 opacity-[0.1]" 
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                    backgroundSize: '20px 20px'
                  }}
                />

                {/* Fixed internal canvas container, scaled to fit */}
                <div className="relative w-[800px] h-[400px] origin-center scale-[0.6] sm:scale-75 md:scale-90 lg:scale-100 flex-shrink-0 z-10">
                  
                  {/* SVG Connecting Edges */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {/* Path 1: Vector DB -> Agent (Handle coords approx: 256, 180 to 350, 200) */}
                    <path
                      d="M 256 180 C 300 180, 300 200, 350 200" 
                      fill="none"
                      stroke={step >= 1 ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.1)"}
                      strokeWidth="2"
                      className="transition-colors duration-500"
                    />
                    {step === 1 && (
                      <circle r="4" fill="#8B5CF6" className="shadow-[0_0_10px_#8B5CF6]">
                        <animateMotion dur="1.5s" repeatCount="indefinite" path="M 256 180 C 300 180, 300 200, 350 200" />
                      </circle>
                    )}

                    {/* Path 2: Agent -> Webhook (Handle coords approx: 638, 200 to 700, 240) */}
                    <path
                      d="M 638 200 C 670 200, 670 240, 700 240" 
                      fill="none"
                      stroke={step >= 2 ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.1)"}
                      strokeWidth="2"
                      className="transition-colors duration-500"
                    />
                    {step === 2 && (
                      <circle r="4" fill="#3B82F6" className="shadow-[0_0_10px_#3B82F6]">
                        <animateMotion dur="1.5s" repeatCount="indefinite" path="M 638 200 C 670 200, 670 240, 700 240" />
                      </circle>
                    )}
                  </svg>

                  {/* Node 1: Vector DB */}
                  <div className={`absolute left-0 top-[140px] w-64 rounded-xl bg-[#0A0A0A] border transition-all duration-300 ${step === 0 ? 'border-purple-500/50 shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] ring-1 ring-purple-500/20' : step > 0 ? 'border-white/10' : 'border-white/5'} p-4`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-white/10">
                          <Server className="h-4 w-4 text-purple-400" />
                        </div>
                        <span className="text-sm font-medium text-white">Vector DB</span>
                      </div>
                      {step === 0 ? (
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                      ) : step > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-white/5 rounded px-2 py-1">
                        <span className="text-xs text-zinc-500">Query</span>
                        <span className="text-xs font-mono text-zinc-300 truncate w-24">"user intent"</span>
                      </div>
                    </div>
                    {/* Output Handle */}
                    <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0A0A0A] border-[1.5px] border-purple-500 z-20" />
                  </div>

                  {/* Node 2: LLM Agent */}
                  <div className={`absolute left-[350px] top-[100px] w-72 rounded-xl bg-[#0A0A0A] border transition-all duration-300 ${step === 1 ? 'border-blue-500/50 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/20 scale-105' : step > 1 ? 'border-white/10' : 'border-white/5'} p-4`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-white/10">
                          <Cpu className="h-4 w-4 text-blue-400" />
                        </div>
                        <span className="text-sm font-medium text-white">GPT-4 Analyst</span>
                      </div>
                      {step === 1 ? (
                        <span className="flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                      ) : step > 1 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        {step === 1 && <div className="h-full bg-blue-500/50 w-full animate-pulse" />}
                        {step > 1 && <div className="h-full bg-blue-500/50 w-full" />}
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] text-zinc-500">Tokens</span>
                        <span className="text-[10px] font-mono text-blue-400">{step > 1 ? '1,204' : '---'}</span>
                      </div>
                    </div>
                    {/* Handles */}
                    <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0A0A0A] border-[1.5px] border-purple-500 z-20" />
                    <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0A0A0A] border-[1.5px] border-blue-500 z-20" />
                  </div>

                  {/* Node 3: Webhook */}
                  <div className={`absolute left-[700px] top-[190px] w-64 rounded-xl bg-[#0A0A0A] border transition-all duration-300 ${step === 2 ? 'border-emerald-500/50 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/20' : step > 2 ? 'border-white/10' : 'border-white/5'} p-4`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-white/10">
                          <Network className="h-4 w-4 text-emerald-400" />
                        </div>
                        <span className="text-sm font-medium text-white">Webhook</span>
                      </div>
                      {step === 2 ? (
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      ) : step > 2 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : null}
                    </div>
                    <div className="bg-white/5 rounded border border-white/5 p-2 font-mono text-[10px] text-zinc-400">
                      {step >= 2 ? (
                        <span className="text-emerald-400">{"{ status: 'ok' }"}</span>
                      ) : (
                        <span>Waiting...</span>
                      )}
                    </div>
                    {/* Input Handle */}
                    <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0A0A0A] border-[1.5px] border-blue-500 z-20" />
                  </div>

                </div>

                {/* Fading Edges Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none z-20" />
              </div>

              {/* Right Panel - Terminal & State */}
              <div className="flex-1 flex flex-col bg-[#0A0A0A] relative z-10 w-full">
                
                {/* Terminal Section */}
                <div className="flex-1 p-6 font-mono text-[11px] text-zinc-400 overflow-hidden relative border-b border-white/5">
                  <div className="sticky top-0 bg-[#0A0A0A] pb-2 text-[10px] uppercase tracking-widest text-zinc-600 font-sans font-medium">Execution Logs</div>
                  <div className="flex flex-col gap-3 mt-2">
                    <div className="flex items-start gap-3">
                      <span className="text-zinc-600 shrink-0">00.000</span>
                      <span className="text-emerald-400 shrink-0">START</span>
                      <span className="text-zinc-300">req_prod_8x992j</span>
                    </div>
                    {step >= 0 && (
                      <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <span className="text-zinc-600 shrink-0">00.104</span>
                        <span className="text-purple-400 shrink-0">FETCH</span>
                        <span className="text-zinc-400 break-all">Retrieving context from Vector DB [Pinecone]</span>
                      </div>
                    )}
                    {step >= 1 && (
                      <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <span className="text-zinc-600 shrink-0">00.420</span>
                        <span className="text-blue-400 shrink-0">LLM</span>
                        <span className="text-zinc-400">Dispatching prompt. Waiting for stream...</span>
                      </div>
                    )}
                    {step === 1 && (
                      <div className="flex items-center gap-3 animate-in fade-in duration-300">
                        <span className="text-zinc-600 shrink-0">00.890</span>
                        <span className="text-zinc-500 shrink-0">AWAIT</span>
                        <span className="w-1.5 h-3 bg-white/40 animate-pulse" />
                      </div>
                    )}
                    {step >= 2 && (
                      <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <span className="text-zinc-600 shrink-0">01.205</span>
                        <span className="text-emerald-400 shrink-0">OK</span>
                        <span className="text-zinc-400">Generated 840 tokens. Invoking Webhook.</span>
                      </div>
                    )}
                    {step >= 3 && (
                      <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <span className="text-zinc-600 shrink-0">01.450</span>
                        <span className="text-emerald-500 shrink-0 font-bold">DONE</span>
                        <span className="text-zinc-300">Execution completed successfully.</span>
                      </div>
                    )}
                  </div>
                  {/* Fading scroll bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
                </div>

                {/* State Inspector Section */}
                <div className="h-48 p-6 bg-[#050505]/50 flex flex-col gap-4">
                  <h4 className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">Memory Snapshot</h4>
                  <div className="flex-1 rounded-lg bg-black border border-white/5 p-3 font-mono text-[10px] text-zinc-400 overflow-hidden relative">
                    <span className="text-blue-400">{"{"}</span><br/>
                    &nbsp;&nbsp;<span className="text-zinc-300">"status"</span>: <span className="text-emerald-400">{step === 3 ? '"completed"' : '"running"'}</span>,<br/>
                    &nbsp;&nbsp;<span className="text-zinc-300">"latency_ms"</span>: <span className="text-amber-400">{step >= 3 ? '1450' : step >= 2 ? '1205' : step >= 1 ? '420' : '104'}</span>,<br/>
                    &nbsp;&nbsp;<span className="text-zinc-300">"cost"</span>: <span className="text-amber-400">{step >= 2 ? '"$0.0042"' : '0'}</span><br/>
                    <span className="text-blue-400">{"}"}</span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
