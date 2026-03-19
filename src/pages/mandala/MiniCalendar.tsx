import { useState, useMemo } from "react";
import s from "./MiniCalendar.module.css";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

interface MiniCalendarProps {
  checkedDays: Set<string>;
  onToggleDay: (key: string) => void;
}

export default function MiniCalendar({
  checkedDays,
  onToggleDay,
}: MiniCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const { blanks, daysInMonth, isCurrent } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const dim = new Date(year, month + 1, 0).getDate();
    const cur =
      today.getFullYear() === year && today.getMonth() === month;
    return { blanks: firstDay, daysInMonth: dim, isCurrent: cur };
  }, [year, month]);

  return (
    <div className={s.cal}>
      <div className={s.head}>
        <button className={s.nav} onClick={prevMonth}>
          &#8249;
        </button>
        <div className={s.month}>
          {MONTH_NAMES[month]} {year}
        </div>
        <button className={s.nav} onClick={nextMonth}>
          &#8250;
        </button>
      </div>

      <div className={s.dow}>
        {DOW.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className={s.days}>
        {Array.from({ length: blanks }, (_, i) => (
          <div key={`b-${i}`} className={`${s.day} ${s.dayBlank}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const key = `${year}-${month + 1}-${d}`;
          const isToday = isCurrent && today.getDate() === d;
          const isChecked = checkedDays.has(key);
          return (
            <button
              key={d}
              className={[
                s.day,
                isToday ? s.dayToday : "",
                isChecked ? s.dayChecked : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onToggleDay(key)}
            >
              {d}
            </button>
          );
        })}
      </div>

      <div className={s.note}>Tap any day to mark it complete</div>
    </div>
  );
}
