import { useState, useMemo } from "react";
import type { ToolType } from "./Toolbar";
import s from "./SettingsPanel.module.css";
import "../../mandala/assets/styles/themes.css";

/* ─── Data ─── */
const themes = [
  { id: "pumpkin-spice", name: "Pumpkin Spice", className: "theme-pumpkin-spice" },
  { id: "ice-castle", name: "Ice Castle", className: "theme-ice-castle" },
  { id: "blooming-flowers", name: "Blooming Flowers", className: "theme-blooming-flowers" },
  { id: "heat-wave", name: "Heat Wave", className: "theme-heat-wave" },
] as const;

const petalColors = [
  { id: "red", name: "Red", className: "petal-red" },
  { id: "orange", name: "Orange", className: "petal-orange" },
  { id: "green", name: "Green", className: "petal-green" },
  { id: "blue", name: "Blue", className: "petal-blue" },
  { id: "indigo", name: "Indigo", className: "petal-indigo" },
  { id: "pink", name: "Pink", className: "petal-pink" },
] as const;

const petalShapes = [
  {
    id: "classic",
    name: "Classic",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48">
        <ellipse cx="24" cy="24" rx="7" ry="16" fill="#C45A5A" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: "teardrop",
    name: "Teardrop",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48">
        <path
          d="M24 8 C30 14, 32 20, 24 40 C16 20, 18 14, 24 8Z"
          fill="#C45A5A"
          opacity="0.8"
        />
      </svg>
    ),
  },
  {
    id: "round",
    name: "Round",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48">
        <path
          d="M24 8 C34 12, 36 22, 32 32 C28 38, 20 38, 16 32 C12 22, 14 12, 24 8Z"
          fill="#C45A5A"
          opacity="0.8"
        />
      </svg>
    ),
  },
  {
    id: "diamond",
    name: "Diamond",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48">
        <path d="M24 8 L30 24 L24 40 L18 24 Z" fill="#C45A5A" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: "hollow",
    name: "Hollow",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48">
        <path
          d="M24 8 C29 10, 34 16, 34 24 C34 32, 29 38, 24 40 C19 38, 14 32, 14 24 C14 16, 19 10, 24 8Z M24 18 C27 20, 27 28, 24 30 C21 28, 21 20, 24 18Z"
          fill="#C45A5A"
          opacity="0.8"
          fillRule="evenodd"
        />
      </svg>
    ),
  },
  {
    id: "veined",
    name: "Veined",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48">
        <path
          d="M24 8 C26 12, 30 14, 32 18 C36 24, 32 34, 24 40 C16 34, 12 24, 16 18 C18 14, 22 12, 24 8Z"
          fill="#C45A5A"
          opacity="0.8"
        />
        <path
          d="M24 14 C25 18, 27 20, 28 24 C27 28, 25 30, 24 34"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

const figures = [
  {
    id: "woman stretching",
    name: "Woman Stretching",
    svg: (
      <svg width="48" height="48" viewBox="-2 -2 20 46" fill="currentColor">
        <path d="M11.01,41.29c0,.06.06.46.05.48-.02.08-.15.07-.15.08h-1.95c-.41-.54.73-1.55.78-1.75s-.2-1.37-.03-1.45l1.14.02c.05.06-.37,1.29-.35,1.47.01.11.46.83.51,1.14Z"/>
        <path d="M10.3,12.63c.37-.03-.06.76-.07.89-.11,1.15,1,1.64,1.91,1.09.11-.07.56-.61.61-.61.02,0,.33.26.33.28.03.17-.69,1.45-.76,1.78s.08.77.05.86c-.02.08-.84.79-.96.97-.45.65-.54,1.46-.4,2.23.05.27.48,1.06.46,1.11-.02.07-1.19.34-.73,1.04-.48.11-3.72-.2-3.78-.62.63-1.61,1.09-3.48,1-5.23,0-.18-.2-.58-.21-.81-.03-1.06.62-.99,1.24-1.55.23-.2,1.22-1.41,1.32-1.42Z"/>
        <path d="M12.62,9.08c.57-.1,1.24.12,1.6.58.1.13.32.71.38.73.36.14.94-.09,1.35.48.9,1.26-.84,3.49.32,5.07.24.33.63.5.94.73-1.79.05-2.71-1.2-2.57-2.91.08-.93.82-2.13.02-2.92-.29.72-.47,1.29-1.31,1.47-.43.1-.46-.24-.84.23-.67.82.11,1.24.11,1.37,0,.03-.43.45-.48.48-1,.66-2.13-.05-1.65-1.24.19-.47.52-.23.86-.71.63-.9-.23-.59-.31-1.17-.11-.77.81-2.07,1.59-2.21Z"/>
        <path d="M11.74,0c.14,0,.13.13.13.23,0,.23-.64,1.67-.53,1.75l.33.02c-.11.42-.74.52-.86.86-.21.6-.31,2.58-.4,3.35-.05.43-.27,1.03-.3,1.42-.11,1.26.27,3.91.01,4.92-.07.29-1.17,1.3-1.44,1.55-.19-.02-.06-3.55-.04-3.88.2-3.04.93-5.98,2.06-8.78C10.78,1.25,11.6,0,11.74,0Z"/>
        <path d="M13.25,14.4c.5-.13,2,2.12,2.26,2.56.32.52,1.15,2,1.07,2.58-.02.17-.35.56-.48.69-.54.53-3.26,1.91-4,2.09-.46.11-1.44.21-1.24-.53.05-.18.46-.36.63-.38.36-.04.77.26.91.2l2.91-2.42c-.34-.29-2.09-2.83-2.26-2.86-.17-.03-.36.3-.48.38l-.1-.05c-.18-.53.54-1.77.78-2.26Z"/>
        <path d="M6.88,22.08c1.7.52,3.49.53,5.25.42.29,2.23-.03,4.5-.39,6.7-.14.85-.67,2.36-.7,3.1-.04.8.65,1.96.57,3.3-.02.33-.56,2.84-.73,2.92-.06.03-1.21.03-1.24-.02-.1-4.39.02-8.82-.72-13.16l-5.95,2.63c.45.27.9.55,1.3.88.46.39,2.49,2.43,2.72,2.86.21.38-.11.71-.23,1.09l-5.94-3.48c-1.49-1.28-.66-1.84.4-2.84,1.7-1.61,3.76-3.02,5.67-4.38Z"/>
        <path d="M8.22,31.56c.42.09,1.28,3.1.97,3.6l-2.26-2.25c-.02-.07.22-.81.25-.86.08-.12.96-.5,1.04-.48Z"/>
      </svg>
    ),
  },
  {
    id: "man stretching",
    name: "Man Stretching",
    svg: (
      <svg width="48" height="48" viewBox="-2 -2 18 46" fill="currentColor">
        <path d="M3.47,22.56c1.83.44,3.8.54,5.62,0,.75,5.63.79,11.39,1.1,17.08l-.09.15c-.26.07-1.39.12-1.51-.09-.18-1.8-.99-3.4-1.12-5.21-.06-.76.07-1.62,0-2.37-.16-1.59-1.04-3.46-1.15-5.12l-1.15,4.59c.09,2.52-.38,4.29-1.01,6.63-.07.26-.17,1.36-.24,1.48-.12.22-1.28.18-1.54.06.2-5.74.34-11.5,1.1-17.2Z"/>
        <path d="M6.31,11.13c.37-.02.76.04,1.12.12.19.17.04,1.85.21,2.1.03.04.32.13.33.15.34.46.57.98,1.24,1.07.37.05.74-.15.95-.12.07,0,1.08.73,1.18.83.86.82,1.09,1.91,1.01,3.08l-2.01.53c-.24-.08.04-.86.03-1.04-1.02,1.2-1.38,2.87-1.24,4.44-1.82.47-3.82.53-5.62-.06l1.78-7.76-.04.26c-.07.02-.11.02-.26-.2-.05-.16-.02-2.95.06-3.08.07-.11,1.1-.32,1.27-.33Z"/>
        <path d="M7.38,0c.06,0,.11-.02.15.03-.07.46-.32.87-.24,1.36l.3-.24.12.06c-.05.69-.53.94-.77,1.48l.3,8.23c-.61-.02-1.23-.09-1.81.15-.16-1.17.1-2.31.21-3.46.18-2.03.4-4.14.71-6.16C6.39,1.11,7.04,0,7.38,0Z"/>
        <path d="M11.99,18.71c.07,0,.16-.02.21.03.07.11.05,2.02.12,2.37.08.41.39.86.47,1.36.23,1.41.56,3.26.71,4.62.04.37-.27,1.65-.62,1.75-.33.09.07-1.2-.27-1.39l-.24.36c-.43-.29.14-1.05.18-1.3.11-.71-.97-2.75-1.18-3.61-.3-1.21-.2-2.55-.95-3.67.01-.08,1.49-.5,1.57-.5Z"/>
        <path d="M10.22,10.07c.17-.03.55.53.71.65.36.27.93.15.86.86-.1.94-1.37,2.25-2.4,1.69-.77-.42-.44-1.05-.44-1.63,0-.04-.41-.54.03-.8.48.61.83-.5,1.24-.77Z"/>
        <path d="M2.35,40.08c.27-.07,1.08.17,1.45.03.17,2.04-.26,1.35-1.69,1.51-.36.04-1.95.52-2.1-.03-.09-.33.78-.4,1.1-.56.25-.13,1.17-.93,1.24-.95Z"/>
        <path d="M9.8,9.42c.39-.07,2.31.6,2.46.92.24.51-.12.85-.33,1.27-.04-.83-.52-.67-1.01-1.01-.3-.21-.39-.79-.89-.53-.18.09-.62,1.04-.86.8-.29-.29.19-1.37.62-1.45Z"/>
        <path d="M8.86,12.85c.28.45.67.71,1.21.74.04.99-1.23.84-1.6.3-.28-.41.29-.59.38-1.04Z"/>
        <path d="M10.17,40.08c-.27-.07-1.06.17-1.44.03-.16,2.04.26,1.35,1.67,1.51.36.04,1.93.52,2.08-.03.09-.33-.77-.4-1.08-.56-.25-.13-1.16-.93-1.23-.95Z"/>
      </svg>
    ),
  },
];

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
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface SettingsPanelProps {
  activeTool: ToolType;
  selectedTheme: string;
  selectedColor: string;
  selectedShape: string;
  selectedFigure: string;
  onThemeChange: (theme: string) => void;
  onColorChange: (color: string) => void;
  onShapeChange: (shape: string) => void;
  onFigureChange: (figure: string) => void;
}

export default function SettingsPanel({
  activeTool,
  selectedTheme,
  selectedColor,
  selectedShape,
  selectedFigure,
  onThemeChange,
  onColorChange,
  onShapeChange,
  onFigureChange,
}: SettingsPanelProps) {
  const isOpen = activeTool !== null;

  /* ─── Theme / Petal Tab State ─── */
  const [themeTab, setThemeTab] = useState<"theme" | "petal">("theme");

  /* ─── Date Section Calendar State ─── */
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(2); // March 2026
  const [selectedDay, setSelectedDay] = useState(1);

  const calInfo = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    return { firstDay, daysInMonth };
  }, [calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  return (
    <div className={`${s.panel} ${isOpen ? s.panelOpen : ""}`}>
      <div className={s.inner}>
        {/* ─── THEME SECTION ─── */}
        <div
          className={`${s.section} ${activeTool === "theme" ? s.sectionShow : ""}`}
        >
          <div className={s.title}>Theme &amp; Petal Color</div>
          <div className={s.desc}>
            Sets the mood for your mandala&rsquo;s background rings and
            atmosphere.
          </div>

          <div className={s.tabBar}>
            <button
              className={`${s.tab} ${themeTab === "theme" ? s.tabOn : ""}`}
              onClick={() => setThemeTab("theme")}
            >
              Theme
            </button>
            <button
              className={`${s.tab} ${themeTab === "petal" ? s.tabOn : ""}`}
              onClick={() => setThemeTab("petal")}
            >
              Petal Color
            </button>
          </div>

          {themeTab === "theme" && (
            <div className={s.themeGrid}>
              {themes.map((t) => (
                <div
                  key={t.id}
                  className={`${s.themeCard} ${selectedTheme === t.id ? s.themeCardOn : ""} ${t.className}`}
                  onClick={() => onThemeChange(t.id)}
                >
                  <div
                    className={s.themeSwatch}
                    style={{
                      background: `linear-gradient(to right,
                        var(--background) 25%,
                        var(--circle-dark) 25% 50%,
                        var(--circle-light) 50% 75%,
                        var(--neutral-white) 75%)`,
                    }}
                  />
                  <div className={s.themeName}>{t.name}</div>
                </div>
              ))}
            </div>
          )}

          {themeTab === "petal" && (
            <div className={s.petalRow}>
              {petalColors.map((pc) => (
                <button
                  key={pc.id}
                  className={`${s.pswatch} ${selectedColor === pc.id ? s.pswatchOn : ""} ${pc.className}`}
                  onClick={() => onColorChange(pc.id)}
                >
                  <div
                    className={s.pi}
                    style={{ background: `linear-gradient(to bottom, var(--gradient-2) 33.3%, var(--gradient-4) 33.3% 66.6%, var(--gradient-6) 66.6%)` }}
                  />
                  <div className={s.themeName}>{pc.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── PETALS SECTION ─── */}
        <div
          className={`${s.section} ${activeTool === "petals" ? s.sectionShow : ""}`}
        >
          <div className={s.title}>Petal shape</div>
          <div className={s.desc}>
            Choose the shape of each petal in your mandala rings.
          </div>

          <div className={s.pshapeGrid}>
            {petalShapes.map((ps) => (
              <div
                key={ps.id}
                className={`${s.pshapeCard} ${selectedShape === ps.id ? s.pshapeCardOn : ""}`}
                onClick={() => onShapeChange(ps.id)}
              >
                {ps.svg}
                <div className={s.pshapeNm}>{ps.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── FIGURE SECTION ─── */}
        <div
          className={`${s.section} ${activeTool === "figure" ? s.sectionShow : ""}`}
        >
          <div className={s.title}>Center figure</div>
          <div className={s.desc}>
            Placed at the heart of your mandala. More options coming soon.
          </div>

          <div className={s.figGrid}>
            {figures.map((fig) => (
              <div
                key={fig.id}
                className={`${s.figCard} ${selectedFigure === fig.id ? s.figCardOn : ""}`}
                onClick={() => onFigureChange(fig.id)}
              >
                <div className={s.figEm}>{fig.svg}</div>
                <div className={s.figNm}>{fig.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── DATE SECTION ─── */}
        <div
          className={`${s.section} ${activeTool === "date" ? s.sectionShow : ""}`}
        >
          <div className={s.title}>Start date</div>
          <div className={s.dateNote}>
            &#9888; Your start date can be the first day of any month. Once your
            mandala begins, this date cannot be edited &mdash; take your time.
          </div>

          <div className={s.miniCal}>
            <div className={s.mcHead}>
              <button className={s.mcNav} onClick={prevMonth}>
                &#8249;
              </button>
              <div className={s.mcMonth}>
                {MONTH_NAMES[calMonth]} {calYear}
              </div>
              <button className={s.mcNav} onClick={nextMonth}>
                &#8250;
              </button>
            </div>
            <div className={s.mcDow}>
              {DOW.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
            <div className={s.mcDays}>
              {Array.from({ length: calInfo.firstDay }, (_, i) => (
                <div
                  key={`blank-${i}`}
                  className={`${s.mcDay} ${s.mcDayBlank}`}
                />
              ))}
              {Array.from({ length: calInfo.daysInMonth }, (_, i) => {
                const d = i + 1;
                return (
                  <button
                    key={d}
                    className={`${s.mcDay} ${selectedDay === d ? s.mcDaySel : ""}`}
                    onClick={() => setSelectedDay(d)}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <button className={`${s.btnApply} ${s.btnSetDate}`}>
            Set Start Date
          </button>
        </div>
      </div>
    </div>
  );
}
