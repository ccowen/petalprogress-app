/**
 * Pure function that returns SVG ellipse elements arranged in a circle.
 */
import type { ReactElement } from "react";

interface MandalaRingProps {
  n: number;
  r: number;
  rx: number;
  ry: number;
  cx: number;
  cy: number;
  color: string;
  emptyColor?: string;
  filled?: number;
  keyPrefix: string;
}

export default function MandalaRing({
  n,
  r,
  rx,
  ry,
  cx,
  cy,
  color,
  emptyColor = "rgba(44,40,37,0.07)",
  filled = 0,
  keyPrefix,
}: MandalaRingProps) {
  const ellipses: ReactElement[] = [];
  for (let i = 0; i < n; i++) {
    const deg = (i * 360) / n - 90;
    const rad = (deg * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    const isFilled = i < filled;
    ellipses.push(
      <ellipse
        key={`${keyPrefix}-${i}`}
        cx={x.toFixed(1)}
        cy={y.toFixed(1)}
        rx={rx}
        ry={ry}
        fill={isFilled ? color : emptyColor}
        opacity={isFilled ? 0.82 : 1}
        transform={`rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`}
      />,
    );
  }
  return <>{ellipses}</>;
}
