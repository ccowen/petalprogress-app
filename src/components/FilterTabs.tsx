import s from "./FilterTabs.module.css";

interface FilterTabsProps {
  tabs: string[];
  active: number;
  onChange: (index: number) => void;
}

export default function FilterTabs({ tabs, active, onChange }: FilterTabsProps) {
  return (
    <div className={s.tabs}>
      {tabs.map((label, i) => (
        <button
          key={label}
          className={`${s.tab} ${i === active ? s.active : ""}`}
          onClick={() => onChange(i)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
