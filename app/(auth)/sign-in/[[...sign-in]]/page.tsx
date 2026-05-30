"use client";

/**
 * @fileoverview Clerk-hosted sign-in page wrapped in branded chrome + assignment-required LinkedIn attribution log.
 */

import { useEffect } from "react";
import { SignIn } from "@clerk/nextjs";
import { AuthSignInUpChrome } from "@/components/auth/AuthSignInUpChrome";

/** Renders `<SignIn />` inside shared marketing shell (`AuthSignInUpChrome`). */
export default function SignInPage() {
  useEffect(() => {
    console.log(
      "[NextFlow] Candidate LinkedIn: " +
        (process.env.NEXT_PUBLIC_LINKEDIN_URL ||
          "https://www.linkedin.com/in/shashank-anand")
    );
  }, []);

  return (
    <AuthSignInUpChrome
      variant="sign-in"
      authForm={
        <SignIn
          appearance={{
            variables: {
              colorPrimary: "#7C3AED",
              colorBackground: "#FFFFFF",
              colorInputBackground: "#F5F5F5",
              colorInputText: "#111827",
              colorText: "#111827",
              colorTextSecondary: "#6B7280",
              borderRadius: "12px",
              fontFamily: "Inter, system-ui, sans-serif",
            },
            elements: {
              card: "shadow-xl border border-gray-200 rounded-xl",
              headerTitle: "text-gray-900 font-semibold",
              headerSubtitle: "text-gray-500",
              formButtonPrimary:
                "bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium",
              formFieldInput:
                "border border-gray-200 bg-[#F5F5F5] rounded-lg text-gray-900",
              footerActionLink: "text-[#7C3AED] hover:text-[#6D28D9]",
            },
          }}
        />
      }
    />
  );
}
