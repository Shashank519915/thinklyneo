"use client";

/**
 * Invisible SVG defining an feTurbulence-based film grain filter.
 * Render once at the page root. Reference with CSS: `filter: url(#grain)`.
 */
export function SvgNoiseFilter() {
  return (
    <svg className="absolute w-0 h-0" aria-hidden="true">
      <defs>
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
    </svg>
  );
}
