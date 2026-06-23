import React, { useRef, useState, useEffect, type ReactNode } from 'react';

interface BorderGlowProps {
  children?: ReactNode;
  className?: string;
  selected?: boolean;
  nodeColor?: string; // Lookup key matching keys in GLOW_THEMES
  glowColor?: string; // HSL values override, e.g. "262 83 58"
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  colors?: string[]; // hex array override
  fillOpacity?: number;
}

export const GLOW_THEMES: Record<string, { colors: string[]; glowColor: string }> = {
  // Base node colors (from definition.color)
  orange: { colors: ['#F97316', '#FB923C', '#FDBA74'], glowColor: "24 95 53" },
  blue: { colors: ['#3B82F6', '#60A5FA', '#93C5FD'], glowColor: "221 83 53" },
  purple: { colors: ['#A855F7', '#C084FC', '#D8B4FE'], glowColor: "271 91 65" },
  green: { colors: ['#10B981', '#34D399', '#6EE7B7'], glowColor: "160 84 39" },
  red: { colors: ['#EF4444', '#F87171', '#FCA5A5'], glowColor: "0 84 60" },

  // Special node types
  requestInputs: { colors: ['#10B981', '#34D399', '#3B82F6'], glowColor: "160 84 39" },
  response: { colors: ['#6366F1', '#EC4899', '#3B82F6'], glowColor: "262 83 58" },
  
  // Default fallback theme
  default: { colors: ['#7C3AED', '#EC4899', '#3B82F6'], glowColor: "262 83 58" }
};

function parseHSL(hslStr: string): { h: number; s: number; l: number } {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 262, s: 83, l: 58 };
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

function buildBoxShadow(glowColor: string, intensity: number): string {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const layers: [number, number, number, number, number, boolean][] = [
    [0, 0, 0, 1, 100, true], [0, 0, 1, 0, 60, true], [0, 0, 3, 0, 50, true],
    [0, 0, 6, 0, 40, true], [0, 0, 15, 0, 30, true], [0, 0, 25, 2, 20, true],
    [0, 0, 50, 2, 10, true],
    [0, 0, 1, 0, 60, false], [0, 0, 3, 0, 50, false], [0, 0, 6, 0, 40, false],
    [0, 0, 15, 0, 30, false], [0, 0, 25, 2, 20, false], [0, 0, 50, 2, 10, false],
  ];
  return layers.map(([x, y, blur, spread, alpha, inset]) => {
    const a = Math.min(alpha * intensity, 100);
    return `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px hsl(${base} / ${a}%)`;
  }).join(', ');
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildMeshGradients(colors: string[]): string[] {
  const gradients: string[] = [];
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    gradients.push(`radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`);
  }
  gradients.push(`linear-gradient(${colors[0]} 0 100%)`);
  return gradients;
}

const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  className = '',
  selected = false,
  nodeColor = 'default',
  glowColor,
  backgroundColor = 'transparent',
  borderRadius = 20,
  glowRadius = 64,
  glowIntensity = 0.85,
  coneSpread = 22,
  colors,
  fillOpacity = 0.15,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cursorAngle, setCursorAngle] = useState(0);

  const theme = GLOW_THEMES[nodeColor] || GLOW_THEMES.default;
  const resolvedColors = colors || theme.colors;
  const resolvedGlowColor = glowColor || theme.glowColor;

  // Revolving frame tick when selected
  useEffect(() => {
    if (!selected) return;
    let frameId: number;
    const tick = () => {
      setCursorAngle((prev) => (prev + 1.2) % 360);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [selected]);

  if (!selected) {
    return (
      <div className={`relative ${className}`}>
        {children}
      </div>
    );
  }

  const borderOpacity = 1.0;
  const glowOpacity = 1.0;
  const meshGradients = buildMeshGradients(resolvedColors);
  const borderBg = meshGradients.map(g => `${g} border-box`);
  const fillBg = meshGradients.map(g => `${g} padding-box`);
  const angleDeg = `${cursorAngle.toFixed(3)}deg`;

  return (
    <div
      ref={cardRef}
      className={`relative grid isolate ${className}`}
      style={{
        background: backgroundColor,
        borderRadius: `${borderRadius}px`,
        transform: 'translate3d(0, 0, 0.01px)',
      }}
    >
      {/* mesh gradient border */}
      <div
        className="absolute inset-0 rounded-[inherit] -z-[1] pointer-events-none"
        style={{
          border: '1.5px solid transparent',
          background: [
            `linear-gradient(${backgroundColor || 'rgba(0,0,0,0)'} 0 100%) padding-box`,
            'linear-gradient(rgb(255 255 255 / 0%) 0% 100%) border-box',
            ...borderBg,
          ].join(', '),
          opacity: borderOpacity,
          maskImage: `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`,
          WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`,
        }}
      />

      {/* mesh gradient fill near edges */}
      <div
        className="absolute inset-0 rounded-[inherit] -z-[1] pointer-events-none"
        style={{
          border: '1.5px solid transparent',
          background: fillBg.join(', '),
          maskImage: [
            'linear-gradient(to bottom, black, black)',
            'radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%)',
            'radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%)',
            `conic-gradient(from ${angleDeg} at center, transparent 5%, black 15%, black 85%, transparent 95%)`,
          ].join(', '),
          WebkitMaskImage: [
            'linear-gradient(to bottom, black, black)',
            'radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%)',
            'radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%)',
            `conic-gradient(from ${angleDeg} at center, transparent 5%, black 15%, black 85%, transparent 95%)`,
          ].join(', '),
          maskComposite: 'subtract, add, add, add, add, add',
          WebkitMaskComposite: 'source-out, source-over, source-over, source-over, source-over, source-over',
          opacity: borderOpacity * fillOpacity,
          mixBlendMode: 'soft-light',
        } as React.CSSProperties}
      />

      {/* outer glow */}
      <span
        className="absolute pointer-events-none z-[1] rounded-[inherit]"
        style={{
          inset: `${-glowRadius}px`,
          maskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
          WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
          opacity: glowOpacity,
          mixBlendMode: 'plus-lighter',
        } as React.CSSProperties}
      >
        <span
          className="absolute rounded-[inherit]"
          style={{
            inset: `${glowRadius}px`,
            boxShadow: buildBoxShadow(resolvedGlowColor, glowIntensity),
          }}
        />
      </span>

      <div className="flex flex-col relative z-[1]">
        {children}
      </div>
    </div>
  );
};

export default BorderGlow;
