/**
 * @fileoverview Branded spinner using `/logo.svg` with reduced-motion respect — shared across dashboards, workflow shell, Clerk loading.
 */

import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
} as const;

const SIZE_PX = { sm: 20, md: 32, lg: 48, xl: 64 } as const;

/** Spinner sized via `SIZE_CLASS`; omits textual `alt` (decorative inside loading regions). */
export function SpinningLogo({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const px = SIZE_PX[size];
  return (
    <img
      src="/logo.svg"
      alt=""
      width={px}
      height={px}
      className={cn(
        SIZE_CLASS[size],
        "animate-spin motion-reduce:animate-none [animation-duration:1.1s]",
        className
      )}
      aria-hidden
    />
  );
}
