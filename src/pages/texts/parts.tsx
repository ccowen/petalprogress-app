import { useRef, type ReactNode } from "react";
import { Link } from "react-router";
import { Butterfly } from "./Butterfly";
import { DEMO, resetDemo } from "../../texts/api";
import {
  ANSWERS_PRIVACY,
  FREQ_NOTES,
  FREQUENCY_OPTIONS,
  PROMPT_COUNT,
  SEND_WINDOWS,
  SITE_URL,
  type SendWindowId,
} from "../../texts/config";
import { formatUsPhone } from "../../texts/phone";
import { describeDuration, finishMonth, weeksToFinish } from "../../texts/schedule";
import s from "./texts.module.css";

/** Page frame for every texts screen: wordmark, optional top link, one card. */
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
          PetalProgress
        </Link>
        {topLink}
      </header>
      <div className={s.card}>{children}</div>
    </main>
  );
}

/**
 * Step indicator: one butterfly per numbered step. The current step's
 * butterfly is larger and in colour; the others are small and grey.
 * `current` below 0 (the landing and example pages) shows them all grey.
 */
export function StepDots({ count, current }: { count: number; current: number }) {
  return (
    <div className={s.steps} aria-label={current < 0 ? `${count} steps` : `Step ${current + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <Butterfly key={i} className={`${s.stepFly} ${i === current ? s.stepFlyOn : ""}`} />
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
    </>
  );
}

/**
 * NOT shown anywhere yet. Meant for the Q&A page once there is one: a
 * dropdown with how long the journal takes at each pace and when it would
 * finish. Tapping a row picks that pace, so it can sit next to a frequency
 * picker. Was briefly under the Step 1 buttons; removed to keep that step short.
 */
export function PaceCalculator({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const known = FREQUENCY_OPTIONS.includes(value as (typeof FREQUENCY_OPTIONS)[number]);
  return (
    <details className={s.calc}>
      <summary className={s.calcToggle}>How long will the journal take?</summary>
      <div className={s.calcBody}>
        {known && (
          <p className={s.calcLine}>
            {PROMPT_COUNT} prompts at {value} a week is about{" "}
            <strong>{weeksToFinish(value)} weeks</strong>, so {describeDuration(value)}. Starting
            now, your last prompt would arrive around <strong>{finishMonth(value)}</strong>.
          </p>
        )}
        <div className={s.calcTable} role="group" aria-label="Compare paces">
          {FREQUENCY_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className={`${s.calcRow} ${n === value ? s.calcRowOn : ""}`}
              aria-pressed={n === value}
              onClick={() => onChange(n)}
            >
              <span className={s.calcPace}>{n} a week</span>
              <span className={s.calcDuration}>{describeDuration(n)}</span>
              <span className={s.calcFinish}>{finishMonth(n)}</span>
            </button>
          ))}
        </div>
        <p className={s.fine}>
          We'll pick the days, so each prompt is a small surprise. You can change your pace any
          time.
        </p>
      </div>
    </details>
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
      <p className={s.desc} style={{ marginBottom: 10 }}>
        What time of day? Pick as many as you like.
      </p>
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

/** The answers-privacy promise, as a quiet callout; "Learn more" opens the details. */
export function PrivacyNote() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <div className={s.privacy}>
      <span className={s.privacyIcon} aria-hidden="true">
        ◎
      </span>
      <p>
        <strong>Privacy Note.</strong> {ANSWERS_PRIVACY.title}{" "}
        <button type="button" className={s.privacyMore} onClick={() => dialog.current?.showModal()}>
          Learn more
        </button>
      </p>
      <dialog
        ref={dialog}
        className={s.privacyDialog}
        aria-labelledby="privacy-dialog-title"
        // A click on the backdrop lands on the dialog itself, not its contents.
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        <div className={s.privacyDialogBody}>
          <h2 id="privacy-dialog-title" className={s.privacyDialogTitle}>
            {ANSWERS_PRIVACY.title}
          </h2>
          <ul className={s.privacyDialogList}>
            {ANSWERS_PRIVACY.details.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className={s.fine}>
            More in our{" "}
            <a href={`${SITE_URL}/privacy`} target="_blank" rel="noopener">
              Privacy Policy
            </a>
            .
          </p>
          <button type="button" className={s.privacyDialogClose} onClick={() => dialog.current?.close()}>
            Close
          </button>
        </div>
      </dialog>
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
