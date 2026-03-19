import type { CSSProperties } from "react";

interface PlaceholderPageProps {
  title: string;
}

const style: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "60vh",
  fontFamily: "var(--pp-font-display)",
  fontSize: "28px",
  fontWeight: 400,
  color: "var(--pp-text-muted)",
};

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return <div style={style}>{title}</div>;
}
