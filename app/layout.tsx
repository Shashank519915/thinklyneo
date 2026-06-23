/**
 * @fileoverview Application shell: global HTML/body, Inter font variable, Clerk provider,
 * and site-wide metadata. All routes render under this layout.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

/** Default SEO + SVG favicons consumed by `<head>` across all routes. */
export const metadata: Metadata = {
  title: "Thinkly - AI Workflow Builder",
  description: "Build powerful AI workflows with a visual canvas",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

import ClickSpark from "@/components/ui/ClickSpark";

/**
 * Wraps the entire app with `ClerkProvider` and shared typography/background tokens.
 *
 * @param props.children — Page or nested layout segment.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} h-full antialiased`}>
        <body className="min-h-full bg-[#050505] text-white">
          <ClickSpark
            sparkColor="#7C3AED"
            sparkSize={8}
            sparkRadius={14}
            sparkCount={8}
            duration={350}
          >
            {children}
          </ClickSpark>
        </body>
      </html>
    </ClerkProvider>
  );
}
