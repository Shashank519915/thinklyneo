"use client";

/**
 * @fileoverview Clerk-hosted sign-up page mirrored from sign-in styling + attribution log parity.
 */

import { useEffect } from "react";
import { SignUp } from "@clerk/nextjs";
import { AuthSignInUpChrome } from "@/components/auth/AuthSignInUpChrome";

/** Renders `<SignUp />` chrome consistent with `/sign-in`. */
export default function SignUpPage() {
  useEffect(() => {
    console.log(
      "[Thinkly] Candidate LinkedIn: " +
        (process.env.NEXT_PUBLIC_LINKEDIN_URL ||
          "https://www.linkedin.com/in/shashank-anand")
    );
  }, []);

  return (
    <AuthSignInUpChrome
      variant="sign-up"
      authForm={
        <SignUp
          appearance={{
            variables: {
              colorPrimary: "#ffffff",
              colorBackground: "#0A0A0A",
              colorInputBackground: "#111111",
              colorInputText: "#ffffff",
              colorText: "#ffffff",
              colorTextSecondary: "#888888",
              borderRadius: "12px",
              fontFamily: "var(--font-sans), sans-serif",
            },
            elements: {
              card: "shadow-2xl border border-white/10 bg-[#0A0A0A] rounded-xl",
              headerTitle: "text-white font-medium tracking-tight",
              headerSubtitle: "text-zinc-400",
              formButtonPrimary:
                "bg-white hover:bg-zinc-200 text-black font-medium active:scale-97 transition-transform duration-100",
              formFieldLabel: "text-zinc-200 font-medium",
              formFieldInput:
                "border border-white/10 bg-[#111111] rounded-lg text-white focus:border-white/30",
              footerActionLink: "text-white hover:text-zinc-300 font-medium",
              footerActionText: "text-zinc-400",
              dividerLine: "bg-white/10",
              dividerText: "text-zinc-600",
              socialButtonsBlockButton: "border border-white/10 bg-[#111111] hover:bg-white/5 text-white active:scale-97 transition-transform duration-100",
              socialButtonsBlockButtonText: "text-white font-medium",
              poweredByButton: "hidden",
              developmentBadge: "hidden",
            },
          }}
        />
      }
    />
  );
}
