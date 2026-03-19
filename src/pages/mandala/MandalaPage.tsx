import { useState, useCallback, useRef, useEffect } from "react";
import Toolbar from "./Toolbar";
import type { ToolType } from "./Toolbar";
import SettingsPanel from "./SettingsPanel";
import RightPanel from "./RightPanel";
import s from "./MandalaPage.module.css";

/* ─── Mandala SVG helpers (matches wireframe buildRing / buildTicks) ─── */

function buildRingEllipses(
  n: number,
  r: number,
  rx: number,
  ry: number,
  fill: string,
  cx: number,
  cy: number,
  filled?: number,
) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i * (360 / n) * Math.PI) / 180;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    const f =
      filled === undefined ? fill : i < filled ? fill : "#EDE9E3";
    const o = filled !== undefined && i >= filled ? 0.5 : 1;
    return (
      <ellipse
        key={i}
        cx={x.toFixed(2)}
        cy={y.toFixed(2)}
        rx={rx}
        ry={ry}
        fill={f}
        opacity={o}
        transform={`rotate(${(i * (360 / n)).toFixed(1)}, ${x.toFixed(2)}, ${y.toFixed(2)})`}
      />
    );
  });
}

function buildTicks(
  n: number,
  r1: number,
  r2: number,
  cx: number,
  cy: number,
) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i * (360 / n) * Math.PI) / 180;
    const maj = i % 4 === 0;
    const outerR = maj ? r2 + 2 : r2;
    return (
      <line
        key={i}
        x1={(cx + r1 * Math.cos(a)).toFixed(2)}
        y1={(cy + r1 * Math.sin(a)).toFixed(2)}
        x2={(cx + outerR * Math.cos(a)).toFixed(2)}
        y2={(cy + outerR * Math.sin(a)).toFixed(2)}
        stroke="#C4BDB5"
        strokeWidth={maj ? 1.5 : 0.75}
        opacity="0.55"
      />
    );
  });
}

/* ─── Initial checked days (demo data matching wireframe) ─── */
const INITIAL_CHECKED = new Set([
  "2026-2-18",
  "2026-2-17",
  "2026-2-16",
  "2026-2-14",
  "2026-2-13",
  "2026-2-11",
  "2026-2-10",
]);

export default function MandalaPage() {
  /* ─── State ─── */
  const [activeTool, setActiveTool] = useState<ToolType>("theme");
  const [selectedTheme, setSelectedTheme] = useState("ice");
  const [selectedColor, setSelectedColor] = useState("#C45A5A");
  const [selectedShape, setSelectedShape] = useState("classic");
  const [selectedFigure, setSelectedFigure] = useState("\uD83C\uDF38");
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkedDays, setCheckedDays] = useState<Set<string>>(
    () => new Set(INITIAL_CHECKED),
  );

  /* ─── Share / Shop State ─── */
  const [shareShopOpen, setShareShopOpen] = useState(false);
  const [sharePopupOpen, setSharePopupOpen] = useState(false);
  const [sharePopupPlatform, setSharePopupPlatform] = useState("Instagram");
  const [shopPopupOpen, setShopPopupOpen] = useState(false);

  const shareZoneRef = useRef<HTMLDivElement>(null);
  const shopZoneRef = useRef<HTMLDivElement>(null);

  /* ─── Outside-click handling for popups ─── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        shareZoneRef.current &&
        !shareZoneRef.current.contains(e.target as Node)
      ) {
        setSharePopupOpen(false);
      }
      if (
        shopZoneRef.current &&
        !shopZoneRef.current.contains(e.target as Node)
      ) {
        setShopPopupOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  /* ─── Handlers ─── */
  const handleCheckIn = useCallback(() => {
    const t = new Date();
    const key = `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`;
    setCheckedIn((prev) => {
      if (prev) {
        setCheckedDays((days) => {
          const next = new Set(days);
          next.delete(key);
          return next;
        });
      } else {
        setCheckedDays((days) => new Set(days).add(key));
      }
      return !prev;
    });
  }, []);

  const handleToggleDay = useCallback((key: string) => {
    setCheckedDays((days) => {
      const next = new Set(days);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleShareShop = () => {
    const willOpen = !shareShopOpen;
    setShareShopOpen(willOpen);
    if (!willOpen) {
      setSharePopupOpen(false);
      setShopPopupOpen(false);
    }
  };

  const handleShareClick = (platform: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSharePopupPlatform(platform);
    setSharePopupOpen((prev) => !prev);
  };

  const handleShopClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShopPopupOpen((prev) => !prev);
  };

  /* ─── SVG constants ─── */
  const CX = 195;
  const CY = 195;

  return (
    <div className={s.page}>
      {/* ─── Left Toolbar ─── */}
      <Toolbar activeTool={activeTool} onToolClick={setActiveTool} />

      {/* ─── Settings Panel ─── */}
      <SettingsPanel
        activeTool={activeTool}
        selectedTheme={selectedTheme}
        selectedColor={selectedColor}
        selectedShape={selectedShape}
        selectedFigure={selectedFigure}
        onThemeChange={setSelectedTheme}
        onColorChange={setSelectedColor}
        onShapeChange={setSelectedShape}
        onFigureChange={setSelectedFigure}
      />

      {/* ─── Center Canvas ─── */}
      <div className={s.center}>
        <div
          className={`${s.mandalaWrap} ${activeTool !== null ? s.mandalaWrapShifted : ""}`}
        >
          <div className={s.mandalaTitle}>Morning Walk</div>
          <div className={s.mandalaDateRange}>
            Mar 1, 2026 &ndash; Dec 31, 2026
          </div>

          {/* ─── Main Mandala SVG ─── */}
          <svg
            width="390"
            height="390"
            viewBox="0 0 390 390"
            fill="none"
            style={{
              filter: "drop-shadow(0 20px 64px rgba(0,0,0,0.07))",
            }}
          >
            {/* Background circle */}
            <circle
              cx={CX}
              cy={CY}
              r={186}
              fill="#FDFCFA"
              stroke="#EDE9E3"
              strokeWidth={1}
            />

            {/* Dashed ring */}
            <circle
              cx={CX}
              cy={CY}
              r={172}
              stroke="#D4CEC7"
              strokeWidth={0.75}
              strokeDasharray="4 5"
              opacity={0.5}
            />

            {/* Progress arc */}
            <circle
              cx={CX}
              cy={CY}
              r={165}
              fill="none"
              stroke="#7B9BAF"
              strokeWidth={2}
              strokeDasharray="707 1038"
              strokeLinecap="round"
              transform={`rotate(-90 ${CX} ${CY})`}
              opacity={0.35}
            />

            {/* Week ticks */}
            <g>{buildTicks(52, 168, 174, CX, CY)}</g>

            {/* Ring 4 — outermost, faint background */}
            <g opacity={0.14}>
              {buildRingEllipses(
                24,
                145,
                7,
                17,
                "#7B9BAF",
                CX,
                CY,
                undefined,
              )}
            </g>

            {/* Ring 3 — partially filled */}
            <g>
              {buildRingEllipses(16, 112, 6.5, 15, "#7B9BAF", CX, CY, 11)}
            </g>

            {/* Ring 2 — partially filled */}
            <g>
              {buildRingEllipses(12, 78, 6.5, 14, "#C45A5A", CX, CY, 10)}
            </g>

            {/* Ring 1 — innermost, all filled */}
            <g>
              {buildRingEllipses(
                8,
                48,
                5.5,
                13,
                "#C45A5A",
                CX,
                CY,
                undefined,
              )}
            </g>

            {/* Center decorative circles */}
            <circle
              cx={CX}
              cy={CY}
              r={32}
              fill="none"
              stroke="#EDE9E3"
              strokeWidth={1.5}
            />
            <circle
              cx={CX}
              cy={CY}
              r={23}
              fill="#F8F6F3"
              stroke="#D4CEC7"
              strokeWidth={1}
            />

            {/* Center figure */}
            <text x={CX} y={CY + 8} textAnchor="middle" fontSize={24}>
              {selectedFigure}
            </text>
          </svg>

          {/* ─── Share / Shop ─── */}
          <button className={s.shareShopToggle} onClick={toggleShareShop}>
            Share &middot; Shop{" "}
            <span
              className={`${s.sstArrow} ${shareShopOpen ? s.sstArrowOpen : ""}`}
            >
              &darr;
            </span>
          </button>

          <div
            className={`${s.shareShopPanel} ${shareShopOpen ? s.shareShopPanelOpen : ""}`}
          >
            <div className={s.shareZone} ref={shareZoneRef}>
              <button
                className={s.shareIconBtn}
                onClick={(e) => handleShareClick("Instagram", e)}
                title="Share to Instagram"
              >
                &#128247;
              </button>
              <button
                className={s.shareIconBtn}
                onClick={(e) => handleShareClick("TikTok", e)}
                title="Share to TikTok"
              >
                &#127925;
              </button>
              <button
                className={s.shareIconBtn}
                onClick={(e) => handleShareClick("Twitter / X", e)}
                title="Share to Twitter/X"
              >
                &#10005;
              </button>
              <button
                className={s.shareIconBtn}
                onClick={(e) => handleShareClick("Pinterest", e)}
                title="Share to Pinterest"
              >
                &#128204;
              </button>

              <div
                className={`${s.sharePopup} ${sharePopupOpen ? s.sharePopupOpen : ""}`}
              >
                <div className={s.sharePopupTitle}>
                  Share to {sharePopupPlatform}
                </div>
                <label className={s.shareCheck}>
                  <input type="checkbox" defaultChecked /> Include habit name
                </label>
                <label className={s.shareCheck}>
                  <input type="checkbox" defaultChecked /> Include start &amp;
                  end dates
                </label>
                <label className={s.shareCheck}>
                  <input type="checkbox" /> Include my name
                </label>
                <div className={s.shareSep} />
                <button
                  className={s.shareSubmitBtn}
                  onClick={() => setSharePopupOpen(false)}
                >
                  Share &uarr;
                </button>
              </div>
            </div>

            <div className={s.shopZone} ref={shopZoneRef}>
              <button className={s.shopBtn} onClick={handleShopClick}>
                Shop Extras &#8599;
              </button>
              <div
                className={`${s.sharePopup} ${shopPopupOpen ? s.sharePopupOpen : ""}`}
              >
                <div className={s.sharePopupTitle}>Customise your item</div>
                <label className={s.shareCheck}>
                  <input type="checkbox" defaultChecked /> Include habit name
                </label>
                <label className={s.shareCheck}>
                  <input type="checkbox" defaultChecked /> Include start &amp;
                  end dates
                </label>
                <label className={s.shareCheck}>
                  <input type="checkbox" /> Include my name
                </label>
                <div className={s.shareSep} />
                <button
                  className={s.shareSubmitBtn}
                  onClick={() => setShopPopupOpen(false)}
                >
                  Continue to shop &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right Panel ─── */}
      <RightPanel
        checkedIn={checkedIn}
        onCheckIn={handleCheckIn}
        checkedDays={checkedDays}
        onToggleDay={handleToggleDay}
      />
    </div>
  );
}
