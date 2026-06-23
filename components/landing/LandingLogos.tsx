"use client";

export function LandingLogos() {
  return (
    <section className="relative py-10 border-t border-b border-white/[0.04] bg-[#050505] overflow-hidden select-none">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-30 grayscale transition-opacity duration-300 hover:opacity-55">
          {/* Vercel */}
          <svg className="h-5 text-white fill-current" viewBox="0 0 116 100" aria-label="Vercel">
            <path d="M57.5 0L115 100H0L57.5 0Z" />
          </svg>
          
          {/* OpenAI */}
          <svg className="h-5 text-white fill-none stroke-current stroke-[1.5]" viewBox="0 0 24 24" aria-label="OpenAI">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5L7 19M19 17L5 7M2 12h20M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12s4.477 10 10 10 10-4.477 10-10z" />
          </svg>

          {/* Supabase */}
          <svg className="h-5 text-white fill-current" viewBox="0 0 24 24" aria-label="Supabase">
            <path d="M21.362 9.354H12v-9L2.638 14.646H12v9z" />
          </svg>

          {/* Trigger.dev */}
          <span className="font-sans font-bold text-sm tracking-tight text-white" aria-label="Trigger.dev">
            trigger.dev
          </span>

          {/* Stripe */}
          <svg className="h-5 text-white fill-current" viewBox="0 0 40 40" aria-label="Stripe">
            <path d="M20 0C8.954 0 0 8.954 0 20s8.954 20 20 20 20-8.954 20-20S31.046 0 20 0zm4.567 29.833c-3.15 0-5.35-1.5-5.35-4.383 0-4.483 6.133-5.267 6.133-7.533 0-.85-.683-1.333-1.783-1.333-1.517 0-3.333.683-4.717 1.483l-1.033-3.233c1.783-1.033 4.15-1.633 6.067-1.633 3.65 0 5.433 1.783 5.433 4.5 0 4.633-6.283 5.383-6.283 7.733 0 .767.75 1.15 1.767 1.15 1.783 0 3.733-.867 5.167-1.767l1.017 3.233c-2 1.183-4.517 1.783-6.417 1.783z" />
          </svg>
        </div>
      </div>
    </section>
  );
}
