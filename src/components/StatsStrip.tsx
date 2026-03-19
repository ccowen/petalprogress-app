import s from "./StatsStrip.module.css";

interface Stat {
  label: string;
  value: string;
  color?: string;
}

interface StatsStripProps {
  stats: Stat[];
}

export default function StatsStrip({ stats }: StatsStripProps) {
  return (
    <div
      className={s.strip}
      style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}
    >
      {stats.map((stat) => (
        <div key={stat.label} className={s.chip}>
          <div
            className={s.num}
            style={stat.color ? { color: stat.color } : undefined}
          >
            {stat.value}
          </div>
          <div className={s.lbl}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
