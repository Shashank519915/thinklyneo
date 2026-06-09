"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";

type ClientUserButtonProps = {
  className?: string;
  appearance?: React.ComponentProps<typeof UserButton>["appearance"];
};

/** Renders Clerk UserButton only after mount to avoid SSR hydration mismatches. */
export function ClientUserButton({ className, appearance }: ClientUserButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={className ?? "h-8 w-8 rounded-full bg-white/10"} aria-hidden />;
  }

  return <UserButton appearance={appearance} />;
}
