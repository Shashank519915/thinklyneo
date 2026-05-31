import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/** Routes that bypass auth check (Clerk login/register pages) */
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals, all static files, and versioned public API routes
    "/((?!_next|api/v1|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for non-v1 API routes
    "/(api(?!/v1)|trpc)(.*)",
  ],
};
