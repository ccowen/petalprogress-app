import { useState, type ReactElement } from "react";
import StatsStrip from "../../components/StatsStrip.tsx";
import s from "./CalendarPage.module.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const checkedDays = new Set([1,2,3,5,6,7,8,9,10,12,13,14,15,16,17,18,19,20,21,22,23]);
const today = new Date(2026, 1, 20); // Feb 20, 2026

const stats = [
  { label: "Total check-ins", value: "47" },
  { label: "Completion rate", value: "82%" },
];

const habits = ["Morning Meditation", "Evening Run", "Cold Shower"];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(1); // 0-indexed

  function changeMonth(dir: number) {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setViewMonth(m);
    setViewYear(y);
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: ReactElement[] = [];

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className={s.day} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(viewYear, viewMonth, d);
    const isToday = viewYear === today.getFullYear() && viewMonth === today.getMonth() && d === today.getDate();
    const isPast = dateObj < today;
    const showDot = isPast || isToday;
    const checked = checkedDays.has(d) && showDot;

    let dotCls = "";
    let dotContent = "";
    if (showDot) {
      dotCls = checked ? s.dotChecked : s.dotMissed;
      dotContent = checked ? "\u{16A9B}" : "\u00B7";
    }

    cells.push(
      <div key={d} className={s.day}>
        <div className={`${s.dayNum} ${isToday ? s.today : ""}`}>{d}</div>
        {showDot && (
          <div className={`${s.dayDot} ${dotCls}`}>{dotContent}</div>
        )}
      </div>,
    );
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Calendar</h1>
        <select className={s.habitFilter} defaultValue={habits[0]}>
          {habits.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </div>

      <StatsStrip stats={stats} />

      <div className={s.monthNav}>
        <button className={s.monthArrow} onClick={() => changeMonth(-1)}>&larr; Prev</button>
        <div className={s.monthLabel}>{MONTHS[viewMonth]} {viewYear}</div>
        <button className={s.monthArrow} onClick={() => changeMonth(1)}>Next &rarr;</button>
      </div>

      <div className={s.calGrid}>
        <div className={s.weekdays}>
          {weekdays.map((wd) => (
            <div key={wd} className={s.weekday}>{wd}</div>
          ))}
        </div>
        <div className={s.days}>
          {cells}
        </div>
      </div>

      <div className={s.legend}>
        <div className={s.legItem}>
          <div className={`${s.legDot} ${s.legChecked}`} /> Checked in
        </div>
        <div className={s.legItem}>
          <div className={`${s.legDot} ${s.legMissed}`} /> Missed
        </div>
      </div>
    </div>
  );
}
