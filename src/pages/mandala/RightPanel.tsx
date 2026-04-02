import { useMemo } from "react";
import MiniCalendar from "./MiniCalendar";
import s from "./RightPanel.module.css";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface RightPanelProps {
  checkedIn: boolean;
  onCheckIn: () => void;
  checkedDays: Set<string>;
  onToggleDay: (key: string) => void;
  themeClass: string;
  initialDate?: Date;
}

export default function RightPanel({
  checkedIn,
  onCheckIn,
  checkedDays,
  onToggleDay,
  themeClass,
  initialDate,
}: RightPanelProps) {
  const todayMeta = useMemo(() => {
    const t = new Date();
    return `${DAY_NAMES[t.getDay()]} \u00B7 ${MONTH_SHORT[t.getMonth()]} ${t.getDate()}`;
  }, []);

  return (
    <div className={`${s.panel} ${themeClass}`}>
      <div className={s.inner}>
        {/* ─── Check-in Card ─── */}
        <div
          className={`${s.todayCard} ${checkedIn ? s.todayCardDone : ""}`}
          onClick={onCheckIn}
        >
          <div className={s.todayMeta}>{todayMeta}</div>
          <div className={s.todayRow}>
            <div className={s.todayCircle}>{checkedIn ? "\u2713" : ""}</div>
            <div className={s.todayLabel}>
              {checkedIn ? "Checked in" : "Check in today"}
            </div>
          </div>
        </div>

        {/* ─── Mini Calendar ─── */}
        <MiniCalendar checkedDays={checkedDays} onToggleDay={onToggleDay} initialDate={initialDate} />

        {/* ─── This Week Stats ─── */}
        <div className={s.sectionLabel}>This Week</div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Goal: 5 days</div>
          <div className={s.statBig}>
            4<span className={s.statBigUnit}> / 5</span>
          </div>
          <div className={s.statSm}>1 day remaining to hit goal</div>
          <div className={s.weekDots}>
            <div className={`${s.wd} ${s.wdDone}`} />
            <div className={`${s.wd} ${s.wdDone}`} />
            <div className={`${s.wd} ${s.wdDone}`} />
            <div className={`${s.wd} ${s.wdDone}`} />
            <div className={s.wd} />
          </div>
        </div>
      </div>
    </div>
  );
}
