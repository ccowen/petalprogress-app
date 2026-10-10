import { useState, type FormEvent } from "react";
import { confirmPhoneChange, startPhoneChange } from "../../texts/api";
import { SITE_URL, consentText } from "../../texts/config";
import { displayPhone, toE164 } from "../../texts/phone";
import { PhoneInput } from "./parts";
import s from "./texts.module.css";

/**
 * Settings: move prompts to a new number.
 *
 * Nothing switches until a code texted to the NEW number is entered, and only
 * a signed-in subscriber can start it, so the exposure is the same as sign-in.
 * Consent is collected again because the original consent named the old number.
 */
export function ChangeNumberForm({
  currentPhone,
  onChanged,
  onCancel,
}: {
  currentPhone: string;
  onChanged: (phone: string) => void;
  onCancel: () => void;
}) {
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [input, setInput] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const phone = toE164(input);

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
    if (phone === currentPhone) return setError("That's already the number we text.");
    if (!agreed) return setError("Please tick the box to agree to receive texts at the new number.");
    run(async () => {
      await startPhoneChange(phone);
      setCode("");
      setStage("code");
    });
  }

  function submitCode(e: FormEvent) {
    e.preventDefault();
    if (!phone) return;
    run(async () => {
      await confirmPhoneChange(phone, code);
      onChanged(phone);
    });
  }

  if (stage === "code" && phone) {
    return (
      <form onSubmit={submitCode} noValidate>
        <p className={s.desc}>
          We texted a 6-digit code to <strong>{displayPhone(phone)}</strong>. Prompts keep going to{" "}
          {displayPhone(currentPhone)} until you enter it.
        </p>
        <label className={s.label} htmlFor="texts-change-code">
          Code
        </label>
        <input
          id="texts-change-code"
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
                await startPhoneChange(phone);
                setResent(true);
              })
            }
          >
            Send it again
          </button>
          {resent && " Sent."} ·{" "}
          <button type="button" className={s.linkBtn} onClick={() => setStage("phone")}>
            Different number
          </button>
        </p>
        <div className={s.nav}>
          <button type="button" className={s.btnBack} onClick={() => setStage("phone")} disabled={busy}>
            Back
          </button>
          <button type="submit" className={s.btnNext} disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Switch number"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitPhone} noValidate>
      <p className={s.fine} style={{ marginBottom: 12 }}>
        We'll text a code to the new number. Nothing changes until you enter it. Afterwards, sign in
        with the new number.
      </p>
      <PhoneInput value={input} onChange={setInput} />
      <label className={s.consent}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>
          {consentText()} See our{" "}
          <a href={`${SITE_URL}/terms`} target="_blank" rel="noopener">
            Terms
          </a>{" "}
          and{" "}
          <a href={`${SITE_URL}/privacy`} target="_blank" rel="noopener">
            Privacy Policy
          </a>
          .
        </span>
      </label>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <div className={s.nav}>
        <button type="button" className={s.btnBack} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className={s.btnNext} disabled={busy || !phone || !agreed}>
          {busy ? "Sending…" : "Text a code"}
        </button>
      </div>
    </form>
  );
}
