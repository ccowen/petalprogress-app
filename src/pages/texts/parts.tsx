import type { ReactNode } from "react";
import { Link } from "react-router";
import { DEMO } from "../../texts/api";
import { FREQ_NOTES, FREQUENCY_OPTIONS, SEND_WINDOWS } from "../../texts/config";
import { describeDays, describeDuration } from "../../texts/schedule";
import s from "./texts.module.css";

/** Page frame for every texts screen: wordmark, one card, optional top link. */
export function TextsShell({ children, topLink }: { children: ReactNode; topLink?: ReactNode }) {
  return (
    <main className={s.page}>
      {DEMO && <div className={s.demoBanner}>Demo mode: no texts are sent and nothing is charged.</div>}
      <header className={s.top}>
        <Link to="/texts" className={s.wordmark}>
          𖢻 PetalProgress
        </Link>
        {topLink}
      </header>
      <div className={s.card}>{children}</div>
    </main>
  );
}

export function StepDots({ count, current }: { count: number; current: number }) {
  return (
    <div className={s.dots} aria-label={`Step ${current + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`${s.dot} ${i < current ? s.dotDone : ""} ${i === current ? s.dotActive : ""}`}
        />
      ))}
    </div>
  );
}

export function FrequencyPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <>
      <div className={s.freqOptions} role="radiogroup" aria-label="Texts per week">
        {FREQUENCY_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            className={`${s.option} ${value === n ? s.optionOn : ""}`}
            onClick={() => onChange(n)}
          >
            <span className={s.freqNum}>{n}</span>
            <span className={s.optionHint}>a week</span>
          </button>
        ))}
      </div>
      {/* Nothing selected yet (e.g. a subscriber whose frequency isn't offered any more) */}
      {FREQ_NOTES[value] && (
        <>
          <div className={s.freqNote}>{FREQ_NOTES[value]}</div>
          <div className={s.summaryBox}>
            <strong>{describeDays(value)}</strong>. At this pace the whole journal takes{" "}
            <strong>{describeDuration(value)}</strong>. You can change this any time.
          </div>
        </>
      )}
    </>
  );
}

export function TimePicker({ value, onChange }: { value: number; onChange: (hour: number) => void }) {
  return (
    <>
      <span className={s.label}>What time of day?</span>
      <div className={s.options} role="radiogroup" aria-label="Time of day">
        {SEND_WINDOWS.map((w) => (
          <button
            key={w.id}
            type="button"
            role="radio"
            aria-checked={value === w.hour}
            className={`${s.option} ${value === w.hour ? s.optionOn : ""}`}
            onClick={() => onChange(w.hour)}
          >
            <span className={s.optionLabel}>{w.label}</span>
            <span className={s.optionHint}>{w.hint}</span>
          </button>
        ))}
      </div>
    </>
  );
}
