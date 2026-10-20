import type { CSSProperties } from "react";

/**
 * Placeholder butterfly, copied from petalprogress-web/src/components/Butterfly.tsx
 * (standing in for the one on the book cover). Swap the SVG for the real
 * artwork when it's ready, here and there. Decorative only.
 */
function Wings() {
  return (
    <>
      <path
        d="M100 72 C74 8 12 2 8 44 C5 76 58 88 100 82 Z"
        style={{ fill: "var(--pp-marigold)" }}
      />
      <path
        d="M100 84 C72 86 30 94 34 126 C38 152 82 142 100 102 Z"
        style={{ fill: "color-mix(in srgb, var(--pp-marigold) 80%, var(--pp-dark))" }}
      />
      <circle cx="46" cy="40" r="9" style={{ fill: "var(--pp-sunflower)" }} />
      <circle cx="68" cy="58" r="5" style={{ fill: "var(--pp-sunflower)" }} />
      <circle cx="58" cy="118" r="6" style={{ fill: "var(--pp-peach)" }} />
    </>
  );
}

export function Butterfly({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 200 160" aria-hidden="true" focusable="false">
      <Wings />
      <g transform="translate(200 0) scale(-1 1)">
        <Wings />
      </g>
      <ellipse cx="100" cy="86" rx="5" ry="30" style={{ fill: "var(--pp-dark)" }} />
      <path
        d="M98 58 C92 38 84 28 76 24 M102 58 C108 38 116 28 124 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ stroke: "var(--pp-dark)" }}
      />
    </svg>
  );
}
