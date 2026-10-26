import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { getSubscription, isSignedIn, startCheckout, type Subscription } from "../../texts/api";
import { PRICE } from "../../texts/config";
import { loadDraft, newDraft, saveDraft, type SignupDraft } from "../../texts/draft";
import { displayPhone } from "../../texts/phone";
import { describeSchedule } from "../../texts/schedule";
import { FrequencyPicker, StepDots, TextsShell, TimePicker } from "./parts";
import { ExampleThread, WelcomeStep } from "./WelcomeStep";
import s from "./texts.module.css";

const STEPS = ["welcome", "example", "frequency", "pricing", "review"] as const;
type Step = (typeof STEPS)[number];
/** "welcome" and "example" come before Step 1, so the dots cover the last three. */
const NUMBERED_STEPS = 3;

/* ══════════════════════════════════════════════════════
   /guided-journal — sign up for prompted journal texts.
   welcome → example thread → how often → pricing → review → Stripe → (welcome page) phone

   The phone number is asked for AFTER payment, on the Stripe success page,
   and the "Reply YES" text goes out the moment it's entered. So typing a
   number always produces a text, and no text ever goes to a number nobody
   has paid for.
   ══════════════════════════════════════════════════════ */
export default function TextsSignupPage() {
  const [params] = useSearchParams();
  const [draft, setDraft] = useState<SignupDraft>(
    () => loadDraft() ?? newDraft(params.get("from")),
  );
  const [step, setStep] = useState<Step>(() =>
    params.get("step") === "review" && loadDraft() ? "review" : "welcome",
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
    <Link to="/guided-journal/signin" className={s.topLink}>
      Already signed up?<br />
      Sign in
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
          pause, or manage billing from your settings page.
        </p>
        <Link to="/guided-journal/account" className={s.btnNext} style={{ display: "block" }}>
          Go to your settings
        </Link>
      </TextsShell>
    );
  }

  return (
    <TextsShell topLink={signInLink}>
      <StepDots count={NUMBERED_STEPS} current={STEPS.indexOf(step) - (STEPS.length - NUMBERED_STEPS)} />

      {step === "welcome" && <WelcomeStep onStart={() => go("example")} />}

      {step === "example" && (
        <>
          <h1 className={s.title}>You'll receive something like this.</h1>
          <p className={s.desc}>
            Each prompt is crafted for open thought, and your answer can be simple or anything.
            Engaging with the question is the practice. Maybe you reply with <em>yes</em>,{" "}
            <em>maybe</em>, <em>3</em>, or <em>squirrel</em>.
          </p>
          <ExampleThread />
          <div className={s.nav}>
            <button type="button" className={s.btnBack} onClick={() => go("welcome")}>
              Back
            </button>
            <button type="button" className={s.btnNext} onClick={() => go("frequency")}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === "frequency" && (
        <>
          <div className={s.eyebrow}>Step 1 · Your rhythm</div>
          <h1 className={s.title}>
            How many <em>prompts a week</em> are you willing to try?
          </h1>
          <p className={s.desc}>You can change this at anytime.</p>
          <FrequencyPicker value={draft.perWeek} onChange={(perWeek) => update({ perWeek })} />
          <TimePicker value={draft.sendWindows} onChange={(sendWindows) => update({ sendWindows })} />
          <p className={s.fine} style={{ marginBottom: 18 }}>
            *Texts are sent between 8am and 9pm in your local timezone.
          </p>
          <div className={s.nav}>
            <button type="button" className={s.btnBack} onClick={() => go("example")}>
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
          <h1 className={s.title}>Pricing info</h1>
          <div className={s.price}>
            <span className={s.priceAmount}>{PRICE.amount}</span>
            <span className={s.pricePeriod}>/ {PRICE.period}ly price</span>
          </div>
          <ul className={s.points}>
            <li className={s.point}>
              <span className={s.pointIcon}>✓</span>
              <span>Every prompt in the journal, and your growing mandala texted to you.</span>
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
            <button type="button" className={s.btnNext} onClick={() => go("review")}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === "review" && (
        <Review draft={draft} onEdit={() => go("frequency")} onBack={() => go("pricing")} />
      )}
    </TextsShell>
  );
}

function Review({
  draft,
  onEdit,
  onBack,
}: {
  draft: SignupDraft;
  onEdit: () => void;
  onBack: () => void;
}) {
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
      <div className={s.eyebrow}>Step 3 · Confirmation</div>
      <h1 className={s.title}>
        Almost there. <em>Confirmation.</em>
      </h1>
      <div className={s.summaryBox}>
        <strong>{describeSchedule(draft.perWeek, draft.sendWindows)}</strong>
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
        Next you'll pay securely with Stripe. Then you'll enter your mobile number and we'll text
        you right away: reply <strong>YES</strong> and your first prompt is on its way.
      </p>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <div className={s.nav}>
        <button type="button" className={s.btnBack} onClick={onBack} disabled={busy}>
          Back
        </button>
        <button type="button" className={s.btnSage} onClick={checkout} disabled={busy}>
          {busy ? "Opening checkout…" : "Continue to payment"}
        </button>
      </div>
    </>
  );
}

