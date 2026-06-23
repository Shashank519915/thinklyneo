"use client";

import { motion } from "motion/react";
import { Workflow, Zap, Code2, Lock, ArrowUpRight } from "lucide-react";

export function LandingBento() {
  return (
    <section id="features" className="w-full py-32 px-4 md:px-8 bg-[#050505] flex flex-col items-center">
      <div className="w-full max-w-6xl">
        {/* Section Header */}
        <div className="mb-20 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-zinc-400 ring-1 ring-white/10 mb-6">
              Core Capabilities
            </div>
            <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight text-balance mb-6">
              Engineering primitives for autonomous systems.
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl text-pretty">
              Every component is built for scale, deeply typed, and completely observable. This isn't just a UI—it's a production deployment pipeline for AI.
            </p>
          </motion.div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
          
          {/* Card 1: Large Asymmetrical (col-span-8) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-8 md:row-span-2 group"
          >
            <div className="h-full w-full rounded-[2rem] bg-white/[0.02] ring-1 ring-white/[0.05] p-2 transition-colors duration-500 hover:bg-white/[0.04]">
              <div className="relative h-full w-full rounded-[calc(2rem-8px)] bg-[#0A0A0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col">
                <div className="p-8 pb-0 flex flex-col gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                    <Workflow className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-2xl font-medium text-white">Visual Graph Execution</h3>
                  <p className="text-zinc-400 text-sm max-w-md">
                    Build complex multi-agent architectures using a deterministic visual editor. Every node compiles to robust, typed code before deployment.
                  </p>
                </div>
                {/* Visual Decorative Element */}
                <div className="relative flex-1 mt-12 min-h-[200px] border-t border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.1),transparent_70%)]" />
                  <div className="absolute inset-x-8 top-8 flex items-center justify-between">
                    <div className="h-12 w-32 rounded-lg border border-white/10 bg-[#050505] shadow-lg flex items-center justify-center">
                      <div className="h-2 w-16 bg-white/20 rounded-full" />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent relative">
                      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                    </div>
                    <div className="h-12 w-32 rounded-lg border border-white/10 bg-[#050505] shadow-lg flex items-center justify-center">
                      <div className="flex gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-white/40" />
                        <div className="h-2 w-8 bg-white/20 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Top Right (col-span-4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-4"
          >
            <div className="h-full w-full rounded-[2rem] bg-white/[0.02] ring-1 ring-white/[0.05] p-2 transition-colors duration-500 hover:bg-white/[0.04]">
              <div className="relative h-full w-full rounded-[calc(2rem-8px)] bg-[#0A0A0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-8">
                <div className="flex flex-col gap-4 h-full">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-medium text-white">Zero Latency</h3>
                  <p className="text-zinc-400 text-sm">
                    Edge-optimized execution runtime ensures sub-millisecond dispatch times for all workflow operations.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Bottom Right (col-span-4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-4"
          >
            <div className="h-full w-full rounded-[2rem] bg-white/[0.02] ring-1 ring-white/[0.05] p-2 transition-colors duration-500 hover:bg-white/[0.04]">
              <div className="relative h-full w-full rounded-[calc(2rem-8px)] bg-[#0A0A0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] p-8">
                <div className="flex flex-col gap-4 h-full">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                    <Lock className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-medium text-white">Enterprise Security</h3>
                  <p className="text-zinc-400 text-sm">
                    SOC2 compliant architecture with granular RBAC, audit logs, and isolated execution environments.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 4: Full Width Bottom (col-span-12) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-12 group cursor-pointer"
          >
            <div className="w-full rounded-[2rem] bg-white/[0.02] ring-1 ring-white/[0.05] p-2 transition-colors duration-500 hover:bg-white/[0.04]">
              <div className="relative w-full rounded-[calc(2rem-8px)] bg-[#0A0A0A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col md:flex-row items-center justify-between p-8 md:p-12">
                <div className="flex flex-col gap-4 max-w-xl z-10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                      <Code2 className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-white ring-1 ring-white/10 px-3 py-1 rounded-full bg-white/5">Developer First</span>
                  </div>
                  <h3 className="text-3xl font-medium text-white">Code as Infrastructure</h3>
                  <p className="text-zinc-400 text-base">
                    Export your visual graphs to strongly-typed TypeScript definitions. Keep your UI and codebase in perfect sync without manual boilerplate.
                  </p>
                </div>
                
                {/* Visual Element Right */}
                <div className="relative mt-8 md:mt-0 h-40 w-full md:w-96 rounded-xl border border-white/10 bg-[#050505] p-4 font-mono text-xs text-zinc-500 overflow-hidden group-hover:border-white/20 transition-colors">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent)]" />
                  <div className="text-zinc-300">import</div> <div className="text-[#8B5CF6]">{"{"}</div> Workflow <div className="text-[#8B5CF6]">{"}"}</div> <div className="text-zinc-300">from</div> <div className="text-emerald-400">'@thinkly/sdk'</div>;<br/><br/>
                  <div className="text-zinc-300">export const</div> agent = <div className="text-[#8B5CF6]">new</div> Workflow(<div className="text-[#8B5CF6]">{"{"}</div><br/>
                  &nbsp;&nbsp;id: <div className="text-emerald-400">'wf_production_main'</div>,<br/>
                  &nbsp;&nbsp;runtime: <div className="text-emerald-400">'edge'</div>,<br/>
                  <div className="text-[#8B5CF6]">{"}"}</div>);
                </div>

                <div className="absolute right-8 top-8 opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
