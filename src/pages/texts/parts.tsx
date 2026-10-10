import type { ReactNode } from "react";
import { Link } from "react-router";
import { DEMO, resetDemo } from "../../texts/api";
import {
  ANSWERS_PRIVACY,
  FREQ_NOTES,
  FREQUENCY_OPTIONS,
  SEND_WINDOWS,
  type SendWindowId,
} from "../../texts/config";
import { formatUsPhone } from "../../texts/phone";
import { describeDuration } from "../../texts/schedule";
import s from "./texts.module.css";

/** Page frame for every texts screen: wordmark, one card, optional top link. */
export function TextsShell({ children, topLink }: { children: ReactNode; topLink?: ReactNode }) {
  return (
    <main className={s.page}>
      {DEMO && (
        <div className={s.demoBanner}>
          Demo mode: no texts are sent and nothing is charged.{" "}
          <button
            type="button"
            className={s.demoReset}
            onClick={() => {
              resetDemo();
              window.location.assign("/guided-journal");
            }}
          >
            Reset demo
          </button>
        </div>
      )}
      <header className={s.top}>
        <Link to="/guided-journal" className={s.wordmark}>
          𖢻 PetalProgress
        </Link>
        {topLink}
      </header>
      <div className={s.card}>{children}</div>
    </main>
  );
}

/** `current` below 0 shows every dot unlit (a screen before the first step). */
export function StepDots({ count, current }: { count: number; current: number }) {
  return (
    <div className={s.dots} aria-label={current < 0 ? `${count} steps` : `Step ${current + 1} of ${count}`}>
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
      {FREQ_NOTES[value] && <div className={s.freqNote}>{FREQ_NOTES[value]}</div>}
      {/* Nothing selected yet (e.g. a subscriber whose frequency isn't offered any more) */}
      {FREQUENCY_OPTIONS.includes(value as (typeof FREQUENCY_OPTIONS)[number]) && (
        <div className={s.summaryBox}>
          We'll pick the days, so each prompt is a small surprise. At this pace the whole
          journal takes <strong>{describeDuration(value)}</strong>. You can change this any
          time.
        </div>
      )}
    </>
  );
}

/** Multi-select. At least one window stays chosen, so the last one can't be turned off. */
export function TimePicker({
  value,
  onChange,
}: {
  value: SendWindowId[];
  onChange: (windows: SendWindowId[]) => void;
}) {
  function toggle(id: SendWindowId) {
    if (value.includes(id)) {
      if (value.length > 1) onChange(value.filter((v) => v !== id));
    } else {
      // Keep day order (morning, midday, evening) whatever order they were clicked in.
      onChange(SEND_WINDOWS.map((w) => w.id).filter((w) => w === id || value.includes(w)));
    }
  }
  const allOn = SEND_WINDOWS.every((w) => value.includes(w.id));
  return (
    <>
      <span className={s.label}>What time of day? Pick as many as you like.</span>
      <div className={s.options} role="group" aria-label="Time of day">
        {SEND_WINDOWS.map((w) => {
          const on = value.includes(w.id);
          return (
            <button
              key={w.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              className={`${s.option} ${on ? s.optionOn : ""}`}
              onClick={() => toggle(w.id)}
            >
              <span className={s.optionLabel}>{w.label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-pressed={allOn}
        className={`${s.linkBtn} ${s.surpriseBtn}`}
        onClick={() => onChange(SEND_WINDOWS.map((w) => w.id))}
      >
        Anytime works, surprise me
      </button>
    </>
  );
}

/** The answers-privacy promise, as a quiet callout. */
export function PrivacyNote() {
  return (
    <div className={s.privacy}>
      <span className={s.privacyIcon} aria-hidden="true">
        ◎
      </span>
      <p>
        <strong>Privacy Note. {ANSWERS_PRIVACY.title}</strong> {ANSWERS_PRIVACY.text}
      </p>
    </div>
  );
}

/** US mobile number field. `value` is the formatted text, e.g. "(555) 123-4567". */
export function PhoneInput({ value, onChange }: { value: string; onChange: (formatted: string) => void }) {
  return (
    <>
      <label className={s.label} htmlFor="texts-phone">
        Mobile number
      </label>
      <div className={s.phoneRow}>
        <span className={s.phonePrefix}>+1</span>
        <input
          id="texts-phone"
          className={s.input}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(555) 123-4567"
          value={value}
          onChange={(e) => onChange(formatUsPhone(e.target.value))}
          autoFocus
        />
      </div>
    </>
  );
}
