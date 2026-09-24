import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  getSubscription,
  isSignedIn,
  openBillingPortal,
  setPaused,
  signOut,
  updatePreferences,
  type Subscription,
} from "../../texts/api";
import { PROMPT_COUNT } from "../../texts/config";
import { displayPhone } from "../../texts/phone";
import { describeSchedule } from "../../texts/schedule";
import { FrequencyPicker, TextsShell, TimePicker } from "./parts";
import s from "./texts.module.css";

const STATUS_LABEL: Record<Subscription["status"], string> = {
  awaiting_confirmation: "Waiting for your YES",
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
};

/** /texts/account — frequency, time, pause, billing. */
export default function TextsAccountPage() {
  const navigate = useNavigate();
  const [sub, setSub] = useState<Subscription | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!(await isSignedIn())) {
        navigate("/texts/signin", { replace: true });
        return;
      }
      const found = await getSubscription();
      if (live) setSub(found);
    })().catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [navigate]);

  const signOutLink = (
    <button
      type="button"
      className={s.topLink}
      onClick={async () => {
        await signOut();
        navigate("/texts/signin", { replace: true });
      }}
    >
      Sign out
    </button>
  );

  if (error) {
    return (
      <TextsShell topLink={signOutLink}>
        <p className={s.error} role="alert">
          {error}
        </p>
      </TextsShell>
    );
  }

  if (sub === undefined) {
    return (
      <TextsShell>
        <p className={s.desc}>Loading…</p>
      </TextsShell>
    );
  }

  if (sub === null) {
    return (
      <TextsShell topLink={signOutLink}>
        <h1 className={s.title}>
          No texts <em>yet.</em>
        </h1>
        <p className={s.desc}>
          You're signed in, but you haven't finished signing up. If you just paid, give it a minute
          and refresh.
        </p>
        <Link to="/texts" className={s.btnNext} style={{ display: "block" }}>
          Finish signing up
        </Link>
      </TextsShell>
    );
  }

  return (
    <TextsShell topLink={signOutLink}>
      <Details sub={sub} onChange={setSub} />
    </TextsShell>
  );
}

function Details({ sub, onChange }: { sub: Subscription; onChange: (s: Subscription) => void }) {
  const [perWeek, setPerWeek] = useState(sub.perWeek);
  const [sendHour, setSendHour] = useState(sub.sendHour);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = perWeek !== sub.perWeek || sendHour !== sub.sendHour;
  const pct = Math.min(100, Math.round((sub.promptsDone / PROMPT_COUNT) * 100));

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await action();
      setNote(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <span className={`${s.status} ${sub.status === "active" ? "" : s.statusMuted}`}>
        {STATUS_LABEL[sub.status]}
      </span>
      <h1 className={s.title}>
        Your <em>texts.</em>
      </h1>
      <p className={s.desc} style={{ marginBottom: 8 }}>
        Prompts go to <strong>{displayPhone(sub.phone)}</strong>{" "}
        {describeSchedule(sub.perWeek, sub.sendHour)}.
      </p>
      {sub.status === "awaiting_confirmation" && (
        <p className={s.desc}>
          Reply <strong>YES</strong> to our welcome text to get your first prompt.
        </p>
      )}
      <div className={s.progress} aria-hidden="true">
        <div className={s.progressFill} style={{ width: `${pct}%` }} />
      </div>
      <p className={s.fine}>
        {sub.promptsDone} of {PROMPT_COUNT} prompts answered
      </p>

      {sub.status !== "cancelled" && (
        <div className={s.section}>
          <span className={s.label}>How often</span>
          <FrequencyPicker value={perWeek} onChange={setPerWeek} />
          <TimePicker value={sendHour} onChange={setSendHour} />
          <button
            type="button"
            className={s.btnNext}
            style={{ width: "100%" }}
            disabled={!dirty || busy}
            onClick={() =>
              run(async () => {
                await updatePreferences({ perWeek, sendHour, timezone: sub.timezone });
                onChange({ ...sub, perWeek, sendHour });
              }, "Saved. Your next prompt will follow the new rhythm.")
            }
          >
            Save changes
          </button>
        </div>
      )}

      <div className={s.section}>
        <div className={s.row}>
          {(sub.status === "active" || sub.status === "paused") && (
            <button
              type="button"
              className={s.btnBack}
              disabled={busy}
              onClick={() => {
                const pausing = sub.status === "active";
                run(async () => {
                  await setPaused(pausing);
                  onChange({ ...sub, status: pausing ? "paused" : "active" });
                }, pausing ? "Paused. We won't text until you resume." : "Welcome back. Prompts resume at your next send time.");
              }}
            >
              {sub.status === "paused" ? "Resume texts" : "Pause texts"}
            </button>
          )}
          <button
            type="button"
            className={s.btnBack}
            disabled={busy}
            onClick={() => run(openBillingPortal, "")}
          >
            Billing &amp; cancel
          </button>
        </div>
        {note && <p className={s.saved}>{note}</p>}
        {error && (
          <p className={s.error} role="alert" style={{ marginTop: 10 }}>
            {error}
          </p>
        )}
        <p className={s.fine} style={{ marginTop: 16 }}>
          You can also reply PAUSE or STOP to any text.
        </p>
      </div>
    </>
  );
}
