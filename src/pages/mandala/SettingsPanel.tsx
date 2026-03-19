import { useState, useMemo } from "react";
import type { ToolType } from "./Toolbar";
import s from "./SettingsPanel.module.css";

/* ─── Data ─── */
const themes = [
  { id: "pumpkin", name: "Pumpkin Spice", swatchClass: "pumpkinSw" },
  { id: "ice", name: "Ice Castle", swatchClass: "iceSw" },
  { id: "bloom", name: "Blooming Flowers", swatchClass: "bloomSw" },
  { id: "heat", name: "Heat Wave", swatchClass: "heatSw" },
] as const;

const petalColors = [
  "#C45A5A",
  "#D4824A",
  "#8FA68C",
  "#7B9BAF",
  "#6B5FA0",
  "#C47A9A",
];

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
  { emoji: "\uD83C\uDF38", name: "Blossom" },
  { emoji: "\u2B50", name: "Star" },
  { emoji: "\uD83C\uDF19", name: "Moon" },
  { emoji: "\uD83E\uDD8B", name: "Butterfly" },
  { emoji: "\u2728", name: "Sparkle" },
  { emoji: "\uD83C\uDF3F", name: "Leaf" },
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
          <div className={s.eyebrow}>Mandala Settings</div>
          <div className={s.title}>Theme &amp; Petal Color</div>
          <div className={s.desc}>
            Sets the mood for your mandala&rsquo;s background rings and
            atmosphere.
          </div>

          <div className={s.themeGrid}>
            {themes.map((t) => (
              <div
                key={t.id}
                className={`${s.themeCard} ${selectedTheme === t.id ? s.themeCardOn : ""}`}
                onClick={() => onThemeChange(t.id)}
              >
                <div className={`${s.themeSwatch} ${s[t.swatchClass]}`} />
                <div className={s.themeName}>{t.name}</div>
              </div>
            ))}
          </div>

          <div className={s.petalLabel}>Petal Color</div>
          <div className={s.petalRow}>
            {petalColors.map((color) => (
              <button
                key={color}
                className={`${s.pswatch} ${selectedColor === color ? s.pswatchOn : ""}`}
                onClick={() => onColorChange(color)}
              >
                <div className={s.pi} style={{ background: color }} />
              </button>
            ))}
          </div>
        </div>

        {/* ─── PETALS SECTION ─── */}
        <div
          className={`${s.section} ${activeTool === "petals" ? s.sectionShow : ""}`}
        >
          <div className={s.eyebrow}>Mandala Settings</div>
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
          <div className={s.eyebrow}>Mandala Settings</div>
          <div className={s.title}>Center figure</div>
          <div className={s.desc}>
            Placed at the heart of your mandala. More options coming soon.
          </div>

          <div className={s.figGrid}>
            {figures.map((fig) => (
              <div
                key={fig.emoji}
                className={`${s.figCard} ${selectedFigure === fig.emoji ? s.figCardOn : ""}`}
                onClick={() => onFigureChange(fig.emoji)}
              >
                <div className={s.figEm}>{fig.emoji}</div>
                <div className={s.figNm}>{fig.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── DATE SECTION ─── */}
        <div
          className={`${s.section} ${activeTool === "date" ? s.sectionShow : ""}`}
        >
          <div className={s.eyebrow}>Mandala Settings</div>
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
