import { useState, useCallback, useRef, useEffect } from "react";
import Toolbar from "./Toolbar";
import type { ToolType } from "./Toolbar";
import SettingsPanel from "./SettingsPanel";
import RightPanel from "./RightPanel";
import MandalaCanvas from "./MandalaCanvas";
import { sampleConfig } from "../../data/sampleMandalaConfig";
import sampleGeometry from "../../data/sampleGeometry.json";
import "../../mandala/assets/styles/themes.css";
import s from "./MandalaPage.module.css";

const GEOMETRY_API_URL =
  import.meta.env.VITE_GEOMETRY_API_URL || "http://localhost:3000";

/* ─── Build checked days from sample config completions ─── */
const INITIAL_CHECKED = new Set(
  sampleConfig.completions.map((c) => {
    const d = new Date(c.date);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }),
);

/* ─── Start month from config (parse as local, not UTC) ─── */
const [startY, startM] = sampleConfig.mandala.start_date.split("-").map(Number);
const CONFIG_START = new Date(startY, startM - 1, 1);

export default function MandalaPage() {
  console.log("[MandalaPage] component rendering");
  /* ─── State ─── */
  const [activeTool, setActiveTool] = useState<ToolType>("theme");
  const [selectedTheme, setSelectedTheme] = useState(
    sampleConfig.mandala.color_theme_css_class.replace("theme-", ""),
  );
  const [selectedColor, setSelectedColor] = useState(
    sampleConfig.mandala.color_petal_css_class.replace("petal-", ""),
  );
  const [selectedShape, setSelectedShape] = useState("classic");
  const [animKey, setAnimKey] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedFigure, setSelectedFigure] = useState(
    sampleConfig.mandala.figure_choice,
  );
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkedDays, setCheckedDays] = useState<Set<string>>(
    () => new Set(INITIAL_CHECKED),
  );

  /* ─── Sync theme/petal classes to <html> so nav avatar inherits CSS vars ─── */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(`theme-${selectedTheme}`, `petal-${selectedColor}`);
    return () => {
      root.classList.remove(`theme-${selectedTheme}`, `petal-${selectedColor}`);
    };
  }, [selectedTheme, selectedColor]);

  /* ─── Geometry API ─── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mandalaData, setMandalaData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchGeometry() {
      try {
        const res = await fetch(GEOMETRY_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sampleConfig),
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        console.log("[MandalaPage] API fetch succeeded:", Object.keys(data));
        if (!cancelled) {
          setMandalaData(data);
        }
      } catch (err) {
        console.warn("Geometry API unavailable, using bundled fixture:", err);
        // API unavailable — use bundled fixture
        if (!cancelled) {
          setMandalaData(sampleGeometry);
        }
      }
    }
    fetchGeometry();
    return () => { cancelled = true; };
  }, []);

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
      <div className={`${s.center} theme-${selectedTheme}`}>
        <div
          className={`${s.mandalaWrap} ${activeTool !== null ? s.mandalaWrapShifted : ""}`}
        >
          <div className={s.mandalaHeader}>
            <div className={s.mandalaTitle}>
              {mandalaData?.summary?.habitName ?? "Loading\u2026"}
            </div>
            <div className={s.mandalaDateRange}>
              {mandalaData
                ? `${mandalaData.summary.startDate} \u2013 ${mandalaData.summary.totalDays} days`
                : "\u00A0"}
            </div>
          </div>

          {/* ─── Main Mandala SVG ─── */}
          <MandalaCanvas
            key={animKey}
            apiResponse={mandalaData}
            className={s.mandalaCanvas}
            themeId={selectedTheme}
            colorId={selectedColor}
            figure={selectedFigure}
          />

          {/* ─── Share / Shop ─── */}
          <div className={s.shareShopRow}>
            <div className={s.headerActions}>
              <button
                className={s.helpBtn}
                onClick={() => setHelpOpen((o) => !o)}
                title="How to read the mandala"
              >
                ?
              </button>
              <button
                className={s.replayBtn}
                onClick={() => setAnimKey((k) => k + 1)}
                title="Replay animation"
              >
                &#8635;
              </button>
            </div>
          <button className={s.shareShopToggle} onClick={toggleShareShop}>
            Share &middot; Shop{" "}
            <span
              className={`${s.sstArrow} ${shareShopOpen ? s.sstArrowOpen : ""}`}
            >
              &darr;
            </span>
          </button>
          </div>

          <div
            className={`${s.shareShopPanel} ${shareShopOpen ? s.shareShopPanelOpen : ""}`}
          >
            <div className={s.shareZone} ref={shareZoneRef}>
              <button
                className={s.shareIconBtn}
                onClick={(e) => handleShareClick("Instagram", e)}
                title="Share to Instagram"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </button>
              <button
                className={s.shareIconBtn}
                onClick={(e) => handleShareClick("TikTok", e)}
                title="Share to TikTok"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.28 8.28 0 005.58 2.17V11.7a4.83 4.83 0 01-3.77-1.24V6.69h3.77z"/>
                </svg>
              </button>
              <button
                className={s.shareIconBtn}
                onClick={(e) => handleShareClick("Twitter / X", e)}
                title="Share to Twitter/X"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>
              <button
                className={s.shareIconBtn}
                onClick={(e) => handleShareClick("Pinterest", e)}
                title="Share to Pinterest"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
                </svg>
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

      {/* ─── Help Modal ─── */}
      {helpOpen && (
        <div className={s.helpOverlay} onClick={() => setHelpOpen(false)}>
          <div className={s.helpPopup} onClick={(e) => e.stopPropagation()}>
            <div className={s.helpTitle}>How to read the mandala</div>
            <div className={s.helpBody}>
              <p>
                Your mandala grows from the outside in. Each ring
                represents a different time scale:
              </p>
              <p>
                <strong>Outer ring</strong> &mdash; Each mark is one day.
                Completed days disappear to reveal the gradient beneath.
              </p>
              <p>
                <strong>Middle ring</strong> &mdash; The 12 petals
                represent months. They fill with color as you complete
                weekly goals.
              </p>
              <p>
                <strong>Inner ring</strong> &mdash; Each shape is one
                week. Completed weeks become transparent.
              </p>
              <p>
                <strong>Center</strong> &mdash; Your chosen figure,
                surrounded by the heart of your mandala.
              </p>
            </div>
            <button
              className={s.helpClose}
              onClick={() => setHelpOpen(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ─── Right Panel ─── */}
      <RightPanel
        checkedIn={checkedIn}
        onCheckIn={handleCheckIn}
        checkedDays={checkedDays}
        onToggleDay={handleToggleDay}
        themeClass={`theme-${selectedTheme} petal-${selectedColor}`}
        initialDate={CONFIG_START}
      />
    </div>
  );
}
