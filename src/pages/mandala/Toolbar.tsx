import s from "./Toolbar.module.css";

export type ToolType = "theme" | "petals" | "figure" | "date" | null;

interface ToolbarProps {
  activeTool: ToolType;
  onToolClick: (tool: ToolType) => void;
}

const tools: { id: ToolType; icon: string; label: string; tip: string }[] = [
  { id: "theme", icon: "\u25D1", label: "Theme", tip: "Theme Colors" },
  { id: "petals", icon: "\u274B", label: "Petals", tip: "Petal Shape" },
  { id: "figure", icon: "\u25B3", label: "Figure", tip: "Center Figure" },
];

export default function Toolbar({ activeTool, onToolClick }: ToolbarProps) {
  const handleClick = (tool: ToolType) => {
    if (activeTool === tool) {
      onToolClick(null);
    } else {
      onToolClick(tool);
    }
  };

  return (
    <div className={s.toolbar}>
      <div className={s.divider} />
      {tools.map((t) => (
        <button
          key={t.id}
          className={`${s.btn} ${activeTool === t.id ? s.btnActive : ""}`}
          onClick={() => handleClick(t.id)}
        >
          <span className={s.icon}>{t.icon}</span>
          <span className={s.label}>{t.label}</span>
          <span className={s.tip}>{t.tip}</span>
        </button>
      ))}
      <div className={s.divider} />
    </div>
  );
}
