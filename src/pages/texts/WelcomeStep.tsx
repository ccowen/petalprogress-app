import { useEffect, useRef, useState } from "react";
import { revealGifAlt } from "@petalprogress/ui";
import tiles14 from "@petalprogress/ui/assets/reveal/14-tiles.gif";
import tiles88 from "@petalprogress/ui/assets/reveal/88-tiles.gif";
import { PROMPT_COUNT } from "../../texts/config";
import s from "./texts.module.css";

/** The landing screen of /guided-journal: the headline, four points, and "Get started". */
export function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <section className={s.hero}>
      <h1 className={s.heroTitle}>Try a guided journal, one text at a time.</h1>
      <ul className={`${s.points} ${s.heroPoints}`}>
        <li className={s.point}>
          <span className={s.pointIcon}>✦</span>
          <span>{PROMPT_COUNT} prompts, looking inward, outward, and toward growth.</span>
        </li>
        <li className={s.point}>
          <span className={s.pointIcon}>✺</span>
          <span>Every answer reveals your mandala.</span>
        </li>
        <li className={s.point}>
          <span className={s.pointIcon}>✓</span>
          <span>Keep going for as long as it helps. Cancel anytime.</span>
        </li>
        <li className={s.point}>
          <span className={s.pointIcon}>✽</span>
          <span>Your subscription ends automatically when journal finishes.</span>
        </li>
      </ul>
      <div className={s.heroNav}>
        <button type="button" className={s.btnSage} onClick={onStart}>
          Get started
        </button>
      </div>
    </section>
  );
}

/** A cloud-shaped note. Floats beside the card on wide screens, sits under the thread on narrow ones. */
function Cloud({
  tone = "marigold",
  children,
}: {
  tone?: "marigold" | "blush";
  children: React.ReactNode;
}) {
  const cls = [s.privacyCloud, tone === "blush" && s.cloudBlush].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <svg className={s.cloudShape} viewBox="0 0 258 172" aria-hidden="true">
        <path d="M62 150C27 150 10 123 27 102C4 82 26 44 58 50C64 17 110 6 130 33C150 8 200 18 205 52C240 46 256 88 230 106C250 130 228 156 192 150C172 166 132 166 122 152C106 166 78 166 62 150Z" />
      </svg>
      <p className={s.cloudText}>{children}</p>
    </div>
  );
}

const exampleTexts = [
  {
    label: "Prompt 14",
    stamp: "Tuesday 8:04 AM",
    prompt:
      "🌱 Please consider this. Your yes could lose intention if you default to saying yes.\n\n" +
      "Did you personally, deeply value saying yes to something recently?\n\n" +
      "All responses welcome, including yes no maybe unsure",
    reply: "maybe...",
    thanks: "Thanks for your thought. Now you can see another tile.",
    gif: tiles14,
    alt: revealGifAlt.tiles14,
  },
  {
    label: "Prompt 88",
    stamp: "Friday 7:12 PM",
    prompt:
      "🌙 Which of these animal quirks fits you right about now? Or pick one you like.\n\n" +
      "- a squirrel burying a decoy nut pile\n" +
      "- an emperor penguin rotating in its group huddle\n" +
      "- a pufferfish drawing sand circles\n" +
      "- something else\n" +
      "- unsure",
    reply: "DEF SQUIRREL",
    thanks: "Thanks for your thought. Here's your progress image.",
    gif: tiles88,
    alt: revealGifAlt.tiles88,
  },
];

/** Two real prompts and replies, shown as a text thread on the "something like this" page. */
export function ExampleThread() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const t = exampleTexts[active];

  // The clouds drift up and down a few pixels as the page scrolls.
  useEffect(() => {
    const cloud = stageRef.current;
    if (!cloud || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      cloud.style.setProperty("--bob", `${Math.sin(window.scrollY / 140) * 7}px`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={stageRef} className={s.threadStage}>
      {/* Two separate screens, not one thread: these prompts arrive weeks
          apart, never in the same week. Only one shows at a time; both at
          once is a lot to take in. */}
      <div className={s.promptToggle} role="group" aria-label="Choose an example text">
        {exampleTexts.map((t, i) => (
          <button
            key={t.label}
            type="button"
            className={s.promptToggleBtn}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div key={active} className={s.phoneMock} role="group" aria-label={`Example text, ${t.label}`}>
        <div className={s.stamp}>{t.stamp}</div>
        <div className={s.bubble}>{t.prompt}</div>
        <div className={s.bubbleMe}>{t.reply}</div>
        {/* Replies are acknowledged, never read: no words that judge or react to the answer. */}
        <div className={s.bubble}>{t.thanks}</div>
        <div className={s.bubble}>Sample design. Wouldn't want to spoil the reveal :)</div>
        <img className={s.gif} src={t.gif} alt={t.alt} />
      </div>
      <div className={s.cloudStack}>
        <Cloud>
          Engaging with the question is the practice. Maybe you reply with yes, maybe, 3, or squirrel.
        </Cloud>
      </div>
    </div>
  );
}
