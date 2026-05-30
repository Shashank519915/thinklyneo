"use client";

/**
 * @fileoverview Clerk bootstrap shell aligning loading vs loaded markup around sign-in/up forms (shared NextFlow branding).
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
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-4">
      <ClerkLoading>
        <div className="flex flex-col items-center gap-4 py-12">
          <SpinningLogo size="xl" />
          <p className="text-sm text-gray-500">{loadingLabel}</p>
        </div>
      </ClerkLoading>

      <ClerkLoaded>
        <div className="auth-clerk-loaded-enter flex w-full max-w-md flex-col items-center">
          <div className="mb-8 flex flex-col items-center gap-3">
            <img
              src="/logo.svg"
              alt="NextFlow"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">NextFlow</h1>
              <p className="text-sm text-gray-500 mt-1">AI Workflow Builder</p>
            </div>
          </div>
          {authForm}
        </div>
      </ClerkLoaded>
    </div>
  );
}
