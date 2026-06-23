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

const clerkHandler = process.env.CLERK_SECRET_KEY?.trim()
  ? clerkMiddleware(async (auth, request) => {
      if (!isPublicRoute(request)) {
        await auth.protect();
      }
    })
  : () => NextResponse.next();

export default clerkHandler;

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and all /api/* (rewritten to backend).
    "/((?!_next|api/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // tRPC only — API auth is enforced by the backend after rewrite.
    "/(trpc)(.*)",
  ],
};
