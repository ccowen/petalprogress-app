import { useEffect, useRef, useState } from "react";
import { revealGifAlt } from "@petalprogress/ui";
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

/* Two example texts, the same in the app (WelcomeStep.tsx) and on the web
   (TextThread.tsx): keep them in step, and with what petalprogress-sms really
   sends (lib/copy.py). Both are real prompts (14 and 88), as sent: plain text
   with the footer and no emoji. The reply is "Got it, logged." with a flower
   and the symbol of the prompt's category (outward is the mountain, growth the
   seedling). Replies are acknowledged, never read. Prompt 88 is a Mandala
   Monday text: the progress image comes with that day's prompt, opened by
   MANDALA_WITH_PROMPT. The sample GIF has 88 tiles; the real one that day would have 87.
   The "sample design" note is not sent; it is a small blush cloud beside the picture that keeps it honest.
   Send times are real ones: the morning send goes at 8:30. */
const exampleTexts: {
  label: string;
  stamp: string;
  /** An image that arrives with the text, shown above it. */
  media?: { src: string; alt: string };
  messages: { me?: boolean; text: string }[];
  /** A cloud about the sample (not a sent text), shown to the right of the image. */
  note?: string;
}[] = [
  {
    label: "Prompt 14",
    stamp: "Tuesday 8:30 AM",
    messages: [
      {
        text:
          "Please consider this. Your yes could lose intention if you default to saying yes.\n\n" +
          "Did you personally, deeply value saying yes to something recently?\n\n" +
          "All responses welcome, including yes no maybe unsure\n\n" +
          "From PetalProgress. Reply HELP for help, STOP to opt out.",
      },
      { me: true, text: "maybe..." },
      { text: "Got it, logged. 🌸⛰️" },
    ],
  },
  {
    label: "Prompt 88 (Mandala Monday)",
    stamp: "Monday 8:30 AM",
    note: "Sample design. Wouldn't want to spoil the reveal :)",
    media: { src: tiles88, alt: revealGifAlt.tiles88 },
    messages: [
      {
        text:
          "Here's your updated Monday mandala 🌸 You also get a prompt today:\n\n" +
          "Which of these animal quirks fits you right about now? Or pick one you like.\n\n" +
          "- a squirrel burying a decoy nut pile\n" +
          "- an emperor penguin rotating in my group huddle\n" +
          "- a pufferfish drawing sand circles\n" +
          "- something else\n" +
          "- unsure\n\n" +
          "From PetalProgress. Reply HELP for help, STOP to opt out.",
      },
      { me: true, text: "DEF SQUIRREL" },
      { text: "Got it, logged. 🌸🌙" },
    ],
  },
];

/** Two real prompts, one of them a Mandala Monday text, shown as a text thread on the "something like this" page. */
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
      {/* Two separate screens, not one thread: these prompts arrive days or
          weeks apart. Only one shows at a time; both at once is a lot to take in. */}
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
        {(t.note || t.media) && (
          <div className={s.mediaRow}>
            {t.media && <img className={s.gif} src={t.media.src} alt={t.media.alt} />}
            {t.note && (
              <div className={s.sampleCloud}>
                {/* A rounder, simpler cloud than the notes beside the card, so the two don't read as the same thing. */}
                <svg className={s.sampleCloudShape} viewBox="8 20 184 106" aria-hidden="true">
                  <path d="M46 116A30 30 0 0 1 30 62A36 36 0 0 1 92 38A32 32 0 0 1 148 46A34 34 0 0 1 166 116Q106 124 46 116Z" />
                </svg>
                <p className={s.sampleCloudText}>{t.note}</p>
              </div>
            )}
          </div>
        )}
        {t.messages.map((m, i) => (
          <div key={i} className={m.me ? s.bubbleMe : s.bubble}>
            {m.text}
          </div>
        ))}
      </div>
      <div className={s.cloudStack}>
        <Cloud>
          Engaging with the question is the practice. Maybe you reply with yes, maybe, 3, or squirrel.
        </Cloud>
      </div>
    </div>
  );
}
