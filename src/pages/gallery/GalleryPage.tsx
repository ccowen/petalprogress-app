import { useState } from "react";
import FilterTabs from "../../components/FilterTabs.tsx";
import MiniMandalaSvg from "../../components/MiniMandalaSvg.tsx";
import s from "./GalleryPage.module.css";

interface MandalaData {
  name: string;
  freq: string;
  petals: number;
  total: number;
  color: string;
  status: "active" | "complete" | "paused";
}

const mandalas: MandalaData[] = [
  { name: "Morning Meditation", freq: "Daily", petals: 23, total: 30, color: "#8FA68C", status: "active" },
  { name: "Evening Run", freq: "5\u00D7/week", petals: 18, total: 30, color: "#7B9BAF", status: "active" },
  { name: "Reading", freq: "Daily", petals: 30, total: 30, color: "#C4887A", status: "complete" },
  { name: "Journaling", freq: "Daily", petals: 30, total: 30, color: "#C45A5A", status: "complete" },
  { name: "Cold Shower", freq: "Daily", petals: 7, total: 30, color: "#9B8FA6", status: "active" },
];

const filterTabs = ["All", "Active", "Completed"];
const filterKeys = ["all", "active", "complete"] as const;

function statusBadge(status: MandalaData["status"]) {
  if (status === "active") return { cls: s.badgeActive, label: "\u25CF Active" };
  if (status === "complete") return { cls: s.badgeComplete, label: "\u2713 Completed" };
  return { cls: s.badgePaused, label: "\u23F8 Paused" };
}

export default function GalleryPage() {
  const [activeFilter, setActiveFilter] = useState(0);

  const filter = filterKeys[activeFilter];
  const shown = filter === "all" ? mandalas : mandalas.filter((m) => m.status === filter);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Gallery</h1>
        <a href="#" className={s.newBtn}>+ New mandala</a>
      </div>

      <FilterTabs tabs={filterTabs} active={activeFilter} onChange={setActiveFilter} />

      <div className={s.grid}>
        {shown.map((m) => {
          const badge = statusBadge(m.status);
          return (
            <a key={m.name} href="/mandala" className={s.card}>
              <div className={s.cardVisual}>
                <MiniMandalaSvg total={m.total} filled={m.petals} color={m.color} size={120} />
              </div>
              <div className={s.cardBody}>
                <div className={s.cardName}>{m.name}</div>
                <div className={s.cardMeta}>
                  <span className={`${s.badge} ${badge.cls}`}>{badge.label}</span>
                </div>
              </div>
            </a>
          );
        })}
        <div className={s.cardNew}>
          <div className={s.cardNewIcon}>+</div>
          <div className={s.cardNewLabel}>New mandala</div>
        </div>
      </div>
    </div>
  );
}
