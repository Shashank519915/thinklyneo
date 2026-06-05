import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/** Routes that bypass auth (login pages, public API, hosted MCP) */
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/docs(.*)",
  "/api/v1(.*)",
  "/api/mcp(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals, all static files, and versioned public API routes
    "/((?!_next|api/v1|api/mcp|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Clerk session routes only (not Bearer-token public API or MCP)
    "/(api(?!/v1)(?!/mcp)|trpc)(.*)",
  ],
};
