import { useState, type FormEvent, type ReactNode } from "react";
import { sendCode, verifyCode } from "../../texts/api";
import { displayPhone, formatUsPhone, toE164 } from "../../texts/phone";
import s from "./texts.module.css";

interface Props {
  /** true on sign-up, false on sign-in (won't create an account). */
  createAccount: boolean;
  /** Consent line to require before sending a code. Omit on sign-in. */
  consent?: ReactNode;
  initialPhone?: string | null;
  submitLabel?: string;
  onVerified: (phone: string) => void;
  onBack?: () => void;
  /** Tells the parent whether we're on the phone or the code screen. */
  onStageChange?: (stage: "phone" | "code") => void;
}

export function PhoneCodeForm({
  createAccount,
  consent,
  initialPhone,
  submitLabel = "Text me a code",
  onVerified,
  onBack,
  onStageChange,
}: Props) {
  const [stage, setStageState] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState(initialPhone ? displayPhone(initialPhone) : "");
  const [agreed, setAgreed] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  const phone = toE164(phoneInput);

  function setStage(next: "phone" | "code") {
    setStageState(next);
    onStageChange?.(next);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function submitPhone(e: FormEvent) {
    e.preventDefault();
    if (!phone) return setError("Please enter a 10-digit US mobile number.");
    if (consent && !agreed) return setError("Please tick the box to agree to receive texts.");
    run(async () => {
      await sendCode(phone, createAccount);
      setCode("");
      setStage("code");
    });
  }

  function submitCode(e: FormEvent) {
    e.preventDefault();
    if (!phone) return;
    run(async () => {
      await verifyCode(phone, code);
      onVerified(phone);
    });
  }

  if (stage === "code" && phone) {
    return (
      <form onSubmit={submitCode} noValidate>
        <p className={s.desc}>
          We texted a 6-digit code to <strong>{displayPhone(phone)}</strong>.
        </p>
        <label className={s.label} htmlFor="texts-code">
          Code
        </label>
        <input
          id="texts-code"
          className={s.codeInput}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          autoFocus
        />
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <p className={s.fine} style={{ marginBottom: 18 }}>
          Didn't get it?{" "}
          <button
            type="button"
            className={s.linkBtn}
            disabled={busy}
            onClick={() =>
              run(async () => {
                await sendCode(phone, createAccount);
                setResent(true);
              })
            }
          >
            Send it again
          </button>
          {resent && " Sent."} ·{" "}
          <button type="button" className={s.linkBtn} onClick={() => setStage("phone")}>
            Change number
          </button>
        </p>
        <div className={s.nav}>
          <button type="button" className={s.btnBack} onClick={() => setStage("phone")}>
            Back
          </button>
          <button type="submit" className={s.btnNext} disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Continue"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitPhone} noValidate>
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
          value={phoneInput}
          onChange={(e) => setPhoneInput(formatUsPhone(e.target.value))}
          autoFocus
        />
      </div>
      {consent && (
        <label className={s.consent}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>{consent}</span>
        </label>
      )}
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <div className={s.nav}>
        {onBack && (
          <button type="button" className={s.btnBack} onClick={onBack}>
            Back
          </button>
        )}
        <button type="submit" className={s.btnNext} disabled={busy || !phone || (!!consent && !agreed)}>
          {busy ? "Sending…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
