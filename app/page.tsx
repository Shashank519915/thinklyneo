/**
 * @fileoverview Root route (`/`): server redirect so authenticated users land on the workflow list
 * without a separate marketing homepage (assignment routing model).
 */

import { redirect } from "next/navigation";

/**
 * Server component entry for `/`; immediately sends browsers to `/dashboard`.
 *
 * @returns Never returns — `redirect` throws internally in Next.js.
 */
export default function Home() {
  redirect("/dashboard");
}
