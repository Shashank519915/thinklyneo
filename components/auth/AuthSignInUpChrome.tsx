"use client";

/**
 * @fileoverview Clerk bootstrap shell aligning loading vs loaded markup around sign-in/up forms (shared Thinkly branding).
 */

import type { ReactNode } from "react";
import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { SpinningLogo } from "@/components/SpinningLogo";

/**
 * Wraps gated routes with consistent logo treatment: animated spinner until Clerk hydrates then static lockup above `authForm`.
 */
export function AuthSignInUpChrome({
  authForm,
  variant,
}: {
  authForm: ReactNode;
  variant: "sign-in" | "sign-up";
}) {
  const loadingLabel = variant === "sign-in" ? "Loading sign-in…" : "Loading sign-up…";
  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.1]" 
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full bg-white/[0.02] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        <ClerkLoading>
          <div className="flex flex-col items-center gap-4 py-12">
            <SpinningLogo size="xl" />
            <p className="text-sm text-zinc-400">{loadingLabel}</p>
          </div>
        </ClerkLoading>

        <ClerkLoaded>
          <div className="auth-clerk-loaded-enter flex w-full max-w-md flex-col items-center">
            <div className="mb-8 flex flex-col items-center gap-3">
              <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-white/5 ring-1 ring-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                <div className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.5)]" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-medium text-white tracking-tight">Thinkly</h1>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-medium">Orchestration Layer</p>
              </div>
            </div>
            {authForm}
          </div>
        </ClerkLoaded>
      </div>
    </div>
  );
}
