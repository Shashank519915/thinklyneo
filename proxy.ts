import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

/** using proxy.ts file instead of middleware, because Next.js supports it and warns to use it for better support. */

/** Page routes that bypass Clerk (API routes are excluded via matcher — backend handles auth). */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/docs(.*)",
]);

// In CI/E2E environments where secrets are missing, we inject a dummy key 
// so `clerkMiddleware` doesn't crash on initialization.
const isMissingKey = !process.env.CLERK_SECRET_KEY?.trim();
if (isMissingKey) {
  process.env.CLERK_SECRET_KEY = "sk_test_dummyKeyForCI123456789";
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA";
}

export default clerkMiddleware(async (auth, request) => {
  // If running in an environment without real keys (e.g. CI), bypass auth completely
  if (isMissingKey) {
    return NextResponse.next();
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and all /api/* (rewritten to backend).
    "/((?!_next|api/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // tRPC only — API auth is enforced by the backend after rewrite.
    "/(trpc)(.*)",
  ],
};
