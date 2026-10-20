import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { claimCheckout, getClaimStatus } from "../../texts/api";
import { SITE_URL, consentText } from "../../texts/config";
import { clearDraft } from "../../texts/draft";
import { generateJournalName } from "../../texts/names";
import { displayPhone, toE164 } from "../../texts/phone";
import { PhoneInput, PrivacyNote, TextsShell } from "./parts";
import s from "./texts.module.css";

/**
 * Stripe Checkout's success_url: /guided-journal/welcome?session_id={CHECKOUT_SESSION_ID}
 * Payment is done. Three short screens:
 *   name   → a generated signature for the mandala, shuffled until it feels right
 *   number → the phone number with consent; the texts service sends "Reply YES" at once
 *   sent   → check your phone
 * The number is asked for here, after paying, so no text ever goes to a
 * number nobody has paid for. See TextsSignupPage for the whole flow.
 */
export default function TextsWelcomePage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  // "checking" while we ask whether this session was already claimed (a reload after "Text me").
  const [stage, setStage] = useState<"checking" | "name" | "number" | "sent">(
    sessionId ? "checking" : "name",
  );
  const [name, setName] = useState(generateJournalName);
  // Names shuffled past, so "Back" can return to one that was better.
  const [previous, setPrevious] = useState<string[]>([]);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let live = true;
    getClaimStatus(sessionId)
      .then((status) => {
        if (!live) return;
        if (status.claimed && status.phone) {
          if (status.displayName) setName(status.displayName);
          setPhone(status.phone);
          setStage("sent");
        } else {
          setStage("name");
        }
      })
      // If the check fails, just start at the name step; claiming again is harmless.
      .catch(() => live && setStage("name"));
    return () => {
      live = false;
    };
  }, [sessionId]);

  function shuffle() {
    setPrevious((p) => [...p, name]);
    setName(generateJournalName());
  }
  function back() {
    const last = previous[previous.length - 1];
    if (!last) return;
    setPrevious((p) => p.slice(0, -1));
    setName(last);
  }

  if (stage === "checking") {
    return (
      <TextsShell>
        <p className={s.desc}>Loading…</p>
      </TextsShell>
    );
  }

  if (stage === "name") {
    return (
      <TextsShell>
        <h1 className={s.title}>
          Payment received.
          <br />
          <em>Happy you are here.</em>
        </h1>
        <div className={s.section}>
          <h2 className={s.subtitle}>Please pick a signature</h2>
          <p className={s.desc} style={{ marginBottom: 14 }}>
            It goes at the bottom of your mandala.
          </p>
          <div className={s.nameBox}>
            <span className={s.nameValue}>{name}</span>
            <div className={s.nameActions}>
              <button
                type="button"
                className={s.nameBtn}
                onClick={back}
                disabled={previous.length === 0}
              >
                ← Back
              </button>
              <button type="button" className={s.nameBtn} onClick={shuffle}>
                Shuffle ↻
              </button>
            </div>
          </div>
        </div>
        <div className={s.nav}>
          <button
            type="button"
            className={s.btnSage}
            onClick={() => {
              setStage("number");
              window.scrollTo(0, 0);
            }}
          >
            Keep this signature
          </button>
        </div>
      </TextsShell>
    );
  }

  if (stage === "sent" && phone) {
    return (
      <TextsShell>
        <div className={s.eyebrow}>You're signed up</div>
        <h1 className={s.title}>Now, check your phone.</h1>
        <p className={s.desc}>
          We've sent a text to <strong>{displayPhone(phone)}</strong>. Reply{" "}
          <strong>YES</strong> to confirm, and your first prompt arrives right
          away. Your signature is <strong>{name}</strong>.
        </p>
        <div className={s.phoneMock} aria-hidden="true">
          <div className={s.bubble}>
            PetalProgress: Welcome, {name}! Reply YES to start your journal
            prompts. Msg &amp; data rates may apply. Reply STOP to cancel, HELP
            for help.
          </div>
          <div className={s.bubbleMe}>YES</div>
        </div>
        <p className={s.fine} style={{ marginBottom: 20 }}>
          No text after a few minutes, or wrong number?{" "}
          <button
            type="button"
            className={s.linkBtn}
            onClick={() => setStage("number")}
          >
            Enter the number again
          </button>
          . You can also reply HELP to any of our messages.
        </p>
        <Link
          to="/guided-journal/account"
          className={s.btnNext}
          style={{ display: "block" }}
        >
          Go to your settings
        </Link>
      </TextsShell>
    );
  }

  return (
    <TextsShell>
      <div className={s.eyebrow}>One more thing</div>
      <h1 className={s.title}>
        Where should we <em>text you?</em>
      </h1>
      <p className={s.desc}>
        We'll text this number right away. Reply <strong>YES</strong> to confirm
        it's you, and your prompts begin. It's also how you'll sign in later,
        with no password to remember.
      </p>
      <PrivacyNote />
      <ClaimForm
        sessionId={sessionId}
        name={name}
        initialPhone={phone}
        onBack={() => setStage("name")}
        onSent={(sentTo, storedName) => {
          clearDraft();
          setPhone(sentTo);
          setName(storedName);
          setStage("sent");
          window.scrollTo(0, 0);
        }}
      />
    </TextsShell>
  );
}

function ClaimForm({
  sessionId,
  name,
  initialPhone,
  onBack,
  onSent,
}: {
  sessionId: string | null;
  name: string;
  initialPhone: string | null;
  onBack: () => void;
  /** The signature is the one the service stored, which may differ if the pick was taken. */
  onSent: (phone: string, displayName: string) => void;
}) {
  const [input, setInput] = useState(
    initialPhone ? displayPhone(initialPhone) : "",
  );
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phone = toE164(input);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!phone) return setError("Please enter a 10-digit US mobile number.");
    if (!agreed)
      return setError("Please tick the box to agree to receive texts.");
    setBusy(true);
    setError(null);
    try {
      const { displayName } = await claimCheckout(sessionId, phone, name);
      onSent(phone, displayName);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't send the text. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <PhoneInput value={input} onChange={setInput} />
      <label className={s.consent}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
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
        <button
          type="button"
          className={s.btnBack}
          onClick={onBack}
          disabled={busy}
        >
          Back
        </button>
        <button
          type="submit"
          className={s.btnSage}
          disabled={busy || !phone || !agreed}
        >
          {busy ? "Sending…" : "Text me"}
        </button>
      </div>
    </form>
  );
}
