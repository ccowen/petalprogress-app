import MandalaRing from "./MandalaRing.tsx";

interface MiniMandalaSvgProps {
  total: number;
  filled: number;
  color: string;
  size?: number;
}

/**
 * Renders a small mandala for gallery cards.
 * Uses MandalaRing internally with 3 concentric rings.
 */
export default function MiniMandalaSvg({
  total,
  filled,
  color,
  size = 120,
}: MiniMandalaSvgProps) {
  const cx = size / 2;
  const cy = size / 2;

  // Distribute petals across 3 rings (outer -> inner)
  const outerN = total;
  const outerFilled = filled;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <MandalaRing
        n={outerN}
        r={44}
        rx={2.5}
        ry={8}
        cx={cx}
        cy={cy}
        color={color}
        filled={outerFilled}
        keyPrefix="outer"
      />
      <circle cx={cx} cy={cy} r={10} fill="rgba(248,246,243,0.97)" />
    </svg>
  );
}
