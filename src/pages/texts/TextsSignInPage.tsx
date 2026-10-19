import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { resendClaimLink } from "../../texts/api";
import { TextsShell } from "./parts";
import { PhoneCodeForm } from "./PhoneCodeForm";
import s from "./texts.module.css";

/** Returning subscribers sign in with a code texted to their phone. */
export default function TextsSignInPage() {
  const navigate = useNavigate();

  return (
    <TextsShell
      topLink={
        <Link to="/guided-journal" className={s.topLink}>
          New here?<br />
          Sign up
        </Link>
      }
    >
      <div className={s.eyebrow}>Sign in</div>
      <h1 className={s.title}>
        Welcome <em>back.</em>
      </h1>
      <p className={s.desc}>Enter the number you get your prompts on and we'll text you a code.</p>
      <PhoneCodeForm onVerified={() => navigate("/guided-journal/account", { replace: true })} />
      <ClaimLinkHelp />
    </TextsShell>
  );
}

/**
 * The fallback for someone who paid but closed the tab before entering a
 * number. They have no phone on file, so a code can't reach them; instead we
 * email the link to finish signing up to the address they paid with.
 */
function ClaimLinkHelp() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return setError("Please enter the email address you used to pay.");
    setBusy(true);
    setError(null);
    try {
      await resendClaimLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p className={s.fine} style={{ marginTop: 22 }}>
        If there's a payment under that email, the link to finish signing up is on its way. Check
        your spam folder too.
      </p>
    );
  }

  if (!open) {
    return (
      <p className={s.fine} style={{ marginTop: 22 }}>
        Paid, but never got to enter your number?{" "}
        <button type="button" className={s.linkBtn} onClick={() => setOpen(true)}>
          We'll email you the link to finish
        </button>
        .
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={s.section}>
      <label className={s.label} htmlFor="texts-claim-email">
        The email you paid with
      </label>
      <input
        id="texts-claim-email"
        className={s.input}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoFocus
      />
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <div className={s.nav}>
        <button type="button" className={s.btnBack} onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className={s.btnNext} disabled={busy || !valid}>
          {busy ? "Sending…" : "Email me the link"}
        </button>
      </div>
    </form>
  );
}
