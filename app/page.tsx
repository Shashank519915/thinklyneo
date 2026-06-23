/**
 * @fileoverview Root route (`/`): renders a premium landing page for public users
 * or redirects authenticated users directly to the dashboard.
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/LandingPage";

/**
 * Server component entry for `/`; checks Clerk auth and either redirects to `/dashboard`
 * or shows the marketing landing page.
 */
export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
