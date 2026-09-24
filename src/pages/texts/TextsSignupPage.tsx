import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { getSubscription, isSignedIn, startCheckout, type Subscription } from "../../texts/api";
import { CONSENT_VERSION, PRICE, PROMPT_COUNT, SITE_URL, consentText } from "../../texts/config";
import { loadDraft, newDraft, saveDraft, type SignupDraft } from "../../texts/draft";
import { displayPhone } from "../../texts/phone";
import { describeSchedule } from "../../texts/schedule";
import { FrequencyPicker, StepDots, TextsShell, TimePicker } from "./parts";
import { PhoneCodeForm } from "./PhoneCodeForm";
import s from "./texts.module.css";

const STEPS = ["welcome", "frequency", "pricing", "phone", "review"] as const;
type Step = (typeof STEPS)[number];

/* ══════════════════════════════════════════════════════
   /texts — sign up for prompted journal texts.
   welcome → how often → pricing → phone + code → review → Stripe
   ══════════════════════════════════════════════════════ */
export default function TextsSignupPage() {
  const [params] = useSearchParams();
  const [draft, setDraft] = useState<SignupDraft>(
    () => loadDraft() ?? newDraft(params.get("from")),
  );
  const [step, setStep] = useState<Step>(() =>
    params.get("step") === "review" && loadDraft()?.phone ? "review" : "welcome",
  );
  const [existing, setExisting] = useState<Subscription | null>(null);

  useEffect(() => saveDraft(draft), [draft]);

  // Already subscribed? Send them to their texts page instead of a second sign-up.
  useEffect(() => {
    let live = true;
    isSignedIn()
      .then((signedIn) => (signedIn ? getSubscription() : null))
      .then((sub) => live && setExisting(sub))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const update = (patch: Partial<SignupDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const go = (next: Step) => {
    setStep(next);
    window.scrollTo(0, 0);
  };

  const signInLink = (
    <Link to="/texts/signin" className={s.topLink}>
      Already signed up? Sign in
    </Link>
  );

  if (existing && existing.status !== "cancelled") {
    return (
      <TextsShell>
        <div className={s.eyebrow}>Welcome back</div>
        <h1 className={s.title}>
          You're already <em>signed up.</em>
        </h1>
        <p className={s.desc}>
          Your prompts go to {displayPhone(existing.phone)}. You can change how often they arrive,
          pause, or manage billing from your texts page.
        </p>
        <Link to="/texts/account" className={s.btnNext} style={{ display: "block" }}>
          Go to your texts
        </Link>
      </TextsShell>
    );
  }

  return (
    <TextsShell topLink={signInLink}>
      <StepDots count={STEPS.length} current={STEPS.indexOf(step)} />

      {step === "welcome" && (
        <>
          <div className={s.eyebrow}>Prompted journal texts</div>
          <h1 className={s.title}>
            A journal prompt, <em>by text.</em>
          </h1>
          <p className={s.desc}>
            The gratitude prompts from the PetalProgress journal, sent to your phone. Reply with a
            word, a number, or a choice. Answering is the practice, and then you let it go.
          </p>
          <div className={s.phoneMock} aria-hidden="true">
            <div className={s.bubble}>
              On a scale from one to five, how gentle have you been with yourself this week?
            </div>
            <div className={s.bubbleMe}>4</div>
          </div>
          <ul className={s.points}>
            <li className={s.point}>
              <span className={s.pointIcon}>☾</span>
              <span>{PROMPT_COUNT} prompts, looking inward, outward, and toward growth.</span>
            </li>
            <li className={s.point}>
              <span className={s.pointIcon}>◎</span>
              <span>You choose how many a week, from one to every day.</span>
            </li>
            <li className={s.point}>
              <span className={s.pointIcon}>❋</span>
              <span>Your answers aren't kept as a journal. That's what the book is for.</span>
            </li>
          </ul>
          <div className={s.nav}>
            <button type="button" className={s.btnSage} onClick={() => go("frequency")}>
              Get started
            </button>
          </div>
        </>
      )}

      {step === "frequency" && (
        <>
          <div className={s.eyebrow}>Step 1 · Your rhythm</div>
          <h1 className={s.title}>
            How often <em>feels right?</em>
          </h1>
          <p className={s.desc}>Start smaller than you think. You can always add more later.</p>
          <FrequencyPicker value={draft.perWeek} onChange={(perWeek) => update({ perWeek })} />
          <TimePicker value={draft.sendHour} onChange={(sendHour) => update({ sendHour })} />
          <p className={s.fine} style={{ marginBottom: 18 }}>
            Times are in your timezone ({draft.timezone.replace(/_/g, " ")}).
          </p>
          <div className={s.nav}>
            <button type="button" className={s.btnBack} onClick={() => go("welcome")}>
              Back
            </button>
            <button type="button" className={s.btnNext} onClick={() => go("pricing")}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === "pricing" && (
        <>
          <div className={s.eyebrow}>Step 2 · Pricing</div>
          <h1 className={s.title}>
            One simple <em>price.</em>
          </h1>
          <div className={s.price}>
            <div className={s.priceAmount}>{PRICE.amount}</div>
            <div className={s.pricePeriod}>per {PRICE.period}, however often you choose</div>
          </div>
          <ul className={s.points}>
            <li className={s.point}>
              <span className={s.pointIcon}>✓</span>
              <span>Every prompt in the journal, at your pace.</span>
            </li>
            <li className={s.point}>
              <span className={s.pointIcon}>✓</span>
              <span>Change how often, or pause, whenever you like.</span>
            </li>
            <li className={s.point}>
              <span className={s.pointIcon}>✓</span>
              <span>Cancel anytime. No contract.</span>
            </li>
          </ul>
          <p className={s.fine} style={{ marginBottom: 18 }}>
            Billed monthly through Stripe. Message and data rates from your carrier may apply.
          </p>
          <div className={s.nav}>
            <button type="button" className={s.btnBack} onClick={() => go("frequency")}>
              Back
            </button>
            <button type="button" className={s.btnNext} onClick={() => go("phone")}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === "phone" && (
        <>
          <div className={s.eyebrow}>Step 3 · Your phone</div>
          <h1 className={s.title}>
            Where should we <em>text you?</em>
          </h1>
          <p className={s.desc}>
            We'll text you a code to confirm the number. It's also how you'll sign in later, with no
            password to remember.
          </p>
          <PhoneCodeForm
            createAccount
            initialPhone={draft.phone}
            consent={
              <>
                {consentText()} See our{" "}
                <a href={`${SITE_URL}/terms`} target="_blank" rel="noopener">
                  Terms
                </a>{" "}
                and{" "}
                <a href={`${SITE_URL}/privacy`} target="_blank" rel="noopener">
                  Privacy Policy
                </a>
                .
              </>
            }
            onBack={() => go("pricing")}
            onVerified={(phone) => {
              update({ phone, consentVersion: CONSENT_VERSION });
              go("review");
            }}
          />
        </>
      )}

      {step === "review" && <Review draft={draft} onEdit={() => go("frequency")} />}
    </TextsShell>
  );
}

function Review({ draft, onEdit }: { draft: SignupDraft; onEdit: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      await startCheckout(draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className={s.eyebrow}>Step 4 · Review</div>
      <h1 className={s.title}>
        Almost <em>there.</em>
      </h1>
      <div className={s.summaryBox}>
        <strong>
          {draft.perWeek} {draft.perWeek === 1 ? "prompt" : "prompts"} a week
        </strong>{" "}
        <br />
        {describeSchedule(draft.perWeek, draft.sendHour)}
        <br />
        To <strong>{draft.phone ? displayPhone(draft.phone) : "your phone"}</strong>
        <br />
        <strong>
          {PRICE.amount}/{PRICE.period}
        </strong>
        , cancel anytime ·{" "}
        <button type="button" className={s.linkBtn} onClick={onEdit}>
          Edit
        </button>
      </div>
      <p className={s.desc}>
        Next you'll pay securely with Stripe. Then we'll send you a text: reply <strong>YES</strong>{" "}
        and your first prompt is on its way.
      </p>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <div className={s.nav}>
        <button type="button" className={s.btnSage} onClick={checkout} disabled={busy}>
          {busy ? "Opening checkout…" : "Continue to payment"}
        </button>
      </div>
    </>
  );
}
