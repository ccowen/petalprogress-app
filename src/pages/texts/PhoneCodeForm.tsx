import { useState, type FormEvent } from "react";
import { sendCode, verifyCode } from "../../texts/api";
import { displayPhone, toE164 } from "../../texts/phone";
import { PhoneInput } from "./parts";
import s from "./texts.module.css";

/**
 * Sign-in: a phone number, then the 6-digit code we text to it.
 *
 * This is the only place a text goes out without payment, and it only goes
 * to numbers that already have an account (the texts service creates the
 * account after Stripe checkout). Sign-up never texts a code, so this form
 * can't be used to pump texts at arbitrary numbers.
 */
export function PhoneCodeForm({ onVerified }: { onVerified: (phone: string) => void }) {
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  const phone = toE164(phoneInput);

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
    run(async () => {
      await sendCode(phone);
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
                await sendCode(phone);
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
      <PhoneInput value={phoneInput} onChange={setPhoneInput} />
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <div className={s.nav}>
        <button type="submit" className={s.btnNext} disabled={busy || !phone}>
          {busy ? "Sending…" : "Text me a code"}
        </button>
      </div>
    </form>
  );
}
