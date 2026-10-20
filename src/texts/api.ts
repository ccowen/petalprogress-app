/* ══════════════════════════════════════════════════════
   Everything the texts flow asks of the outside world.

   Live mode:
     - Sign-up sends NO text before payment. Stripe Checkout runs first; then
       the welcome page asks for the number and consent and "claims" the paid
       session, which creates the account and subscriber row and sends the one
       "Reply YES" text. Nothing is texted to a number nobody has paid for.
     - Sign-in is Supabase phone auth (Twilio as the SMS provider), and only
       numbers that already have an account get a code.
     - Reading your subscription is a direct Supabase read (RLS: own row only).
     - Anything that WRITES subscriber state goes through petalprogress-sms at
       VITE_TEXTS_API_URL, because sms_subscribers has no user write policy.

   Demo mode (VITE_TEXTS_DEMO=true):
     - No network. "Payment" goes straight to the confirmation page, and any
       6-digit code signs you in. For clicking through the flow before the backend
       exists. Supabase is never loaded, so no keys are needed.
   ══════════════════════════════════════════════════════ */

import { CONSENT_VERSION, consentText, type SendWindowId } from "./config";
import { clearDraft, loadDraft, newDraft, type SignupDraft } from "./draft";
import { hoursForWindows, windowForHour } from "./schedule";

export const DEMO = import.meta.env.VITE_TEXTS_DEMO === "true";
const API_URL = (import.meta.env.VITE_TEXTS_API_URL ?? "").replace(/\/$/, "");

export type SubscriptionStatus =
  | "awaiting_confirmation" // paid, hasn't replied YES yet
  | "active"
  | "paused"
  | "past_due" // Stripe couldn't take the latest payment
  | "cancelled";

export interface Subscription {
  phone: string;
  /** Signature on the mandala images, e.g. "Gentle_Heron_42". Fixed at sign-up. Null for rows made before it existed. */
  displayName: string | null;
  perWeek: number;
  sendWindows: SendWindowId[];
  timezone: string;
  status: SubscriptionStatus;
  /** Prompts completed so far (current_prompt_index). */
  promptsDone: number;
}

export interface Preferences {
  perWeek: number;
  sendWindows: SendWindowId[];
  timezone: string;
}

/** Where a paid Checkout Session stands: has a number been attached yet? */
export interface ClaimStatus {
  claimed: boolean;
  phone: string | null;
  displayName: string | null;
}

/** Loaded on first use so demo mode never needs Supabase keys. */
async function db() {
  return (await import("../lib/supabase")).supabase;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await (await db()).auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again.");
  return { Authorization: `Bearer ${token}` };
}

/** `auth: false` for the calls made before an account exists: checkout and claim. */
async function callApi<T>(path: string, body: unknown, { auth = true } = {}): Promise<T> {
  if (!API_URL) throw new Error("Texts service isn't configured (VITE_TEXTS_API_URL).");
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? await authHeader() : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // The texts service answers errors as {"error": "..."}, written for people.
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Something went wrong (${res.status}). Please try again.`);
  }
  return res.json() as Promise<T>;
}

/* ── Demo state ── */

const DEMO_KEY = "pp-texts-demo-subscription";

function demoRead(): Subscription | null {
  try {
    const raw = sessionStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as Subscription) : null;
  } catch {
    return null;
  }
}

function demoWrite(sub: Subscription | null) {
  try {
    if (sub) sessionStorage.setItem(DEMO_KEY, JSON.stringify(sub));
    else sessionStorage.removeItem(DEMO_KEY);
  } catch {
    /* ignore */
  }
}

let demoPhone: string | null = null;

/** Demo banner's "Reset": forget the fake subscription and sign-up choices. */
export function resetDemo() {
  demoPhone = null;
  demoWrite(null);
  clearDraft();
}

/* ── Auth: text-code login ── */

/**
 * Text a 6-digit sign-in code. Never creates an account: accounts are made by
 * the texts service after payment, so a code only ever goes to a subscriber.
 */
export async function sendCode(phone: string) {
  if (DEMO) {
    demoPhone = phone;
    return;
  }
  const { error } = await (await db()).auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: false },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

export async function verifyCode(phone: string, code: string) {
  if (DEMO) {
    if (!/^\d{6}$/.test(code)) throw new Error("That code didn't match. Check the text and try again.");
    demoPhone = phone;
    return;
  }
  const { error } = await (await db()).auth.verifyOtp({ phone, token: code, type: "sms" });
  if (error) throw new Error(friendlyAuthError(error.message));
}

export async function isSignedIn(): Promise<boolean> {
  if (DEMO) return demoPhone !== null || demoRead() !== null;
  const { data } = await (await db()).auth.getSession();
  return data.session !== null;
}

export async function signOut() {
  if (DEMO) {
    demoPhone = null;
    demoWrite(null);
    return;
  }
  await (await db()).auth.signOut();
}

function friendlyAuthError(message: string): string {
  if (/expired|invalid/i.test(message)) return "That code didn't match or has expired. Try again, or send a new one.";
  if (/not found|signups not allowed/i.test(message))
    return "We couldn't find texts for that number. Did you mean to sign up?";
  if (/rate|too many/i.test(message)) return "Too many tries. Please wait a minute and try again.";
  if (/already|exists|registered/i.test(message)) return "That number already has an account.";
  return message;
}

/**
 * Paid but never entered a number? They can't sign in (no phone on file), so
 * the sign-in page offers this: the texts service looks up paid, unclaimed
 * Checkout Sessions by the email Stripe collected and emails the finish link
 * (/guided-journal/welcome?session_id=…). Unauthenticated; sends email, not
 * texts. The service must answer the same way whether or not it found
 * anything, so this can't be used to check who has paid.
 */
export async function resendClaimLink(email: string) {
  if (DEMO) return;
  await callApi("/resend-claim-link", { email }, { auth: false });
}

/* ── Change number (settings) ── */

/**
 * Text a code to the NEW number, using Supabase's phone-change flow: the
 * account's phone only switches once the code is verified, and Supabase's
 * rate limits apply. Only a signed-in subscriber can call this, so the
 * exposure is the same as sign-in.
 */
export async function startPhoneChange(newPhone: string) {
  if (DEMO) return;
  const { error } = await (await db()).auth.updateUser({ phone: newPhone });
  if (error) throw new Error(friendlyAuthError(error.message));
}

/**
 * Verify the code from the new number (which switches the account's phone),
 * then tell the texts service. It copies the account's new phone onto the
 * subscriber row, stores the fresh consent record, and sends one courtesy
 * text to the old number saying prompts have moved.
 */
export async function confirmPhoneChange(newPhone: string, code: string) {
  if (DEMO) {
    if (!/^\d{6}$/.test(code)) throw new Error("That code didn't match. Check the text and try again.");
    const sub = demoRead();
    if (sub) demoWrite({ ...sub, phone: newPhone });
    demoPhone = newPhone;
    return;
  }
  const { error } = await (await db()).auth.verifyOtp({ phone: newPhone, token: code, type: "phone_change" });
  if (error) throw new Error(friendlyAuthError(error.message));
  await callApi("/phone-changed", { consent_version: CONSENT_VERSION, consent_text: consentText() });
}

/* ── Subscription ── */

/** Your subscription, or null if you haven't finished signing up. */
export async function getSubscription(): Promise<Subscription | null> {
  if (DEMO) return demoRead();

  const { data: row, error } = await (await db())
    .from("sms_subscribers")
    .select(
      "phone, display_name, texts_per_week, send_hour, timezone, subscription_status, paused_at, consent_confirmed_at, sms_opted_out_at, current_prompt_index",
    )
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;

  // subscription_status mirrors Stripe billing; pause and the YES are
  // separate columns (see petalprogress-db docs/database-decisions.md).
  let status: SubscriptionStatus;
  if (row.subscription_status === "cancelled" || row.sms_opted_out_at) status = "cancelled";
  else if (row.subscription_status === "past_due") status = "past_due";
  else if (!row.consent_confirmed_at) status = "awaiting_confirmation";
  else if (row.paused_at) status = "paused";
  else status = "active";

  return {
    phone: row.phone,
    displayName: row.display_name ?? null,
    perWeek: row.texts_per_week,
    // One column, one hour, so only one window comes back until the schema holds a list.
    sendWindows: [windowForHour(row.send_hour)],
    timezone: row.timezone,
    status,
    promptsDone: row.current_prompt_index,
  };
}

/**
 * Start Stripe Checkout. No account exists yet, so this call is unauthenticated.
 * The texts service creates the Checkout Session with these choices as
 * metadata. success_url carries the Checkout Session id, which the welcome
 * page then uses to claim the paid session with a phone number.
 */
export async function startCheckout(draft: SignupDraft) {
  if (DEMO) {
    // Stripe's hosted page can't be mocked up; say so, then land where it would send you.
    window.alert(
      "Demo mode: this is where Stripe's secure checkout page would open, on stripe.com. " +
        "After paying you'd be sent straight back here to pick a signature and enter your number.",
    );
    window.location.assign("/guided-journal/welcome?session_id=demo");
    return;
  }

  const { url } = await callApi<{ url: string }>(
    "/checkout",
    {
      texts_per_week: draft.perWeek,
      send_hours: hoursForWindows(draft.sendWindows),
      timezone: draft.timezone,
      source: draft.source,
      success_url: `${window.location.origin}/guided-journal/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/guided-journal?step=review`,
    },
    { auth: false },
  );
  window.location.assign(url);
}

/**
 * After payment: attach a phone number, signature and consent to the paid
 * Checkout Session. The session id (from success_url) is the proof of payment,
 * since there's no account to sign in to yet. The texts service verifies the
 * session is paid, creates the account and subscriber row from the session's
 * metadata, stores the consent, and sends "Reply YES" to the number. Calling
 * it again for the same session before the YES arrives changes the number
 * and resends, so a typo is fixed by just entering the number again.
 */
export async function claimCheckout(
  sessionId: string | null,
  phone: string,
  displayName: string,
): Promise<{ displayName: string }> {
  if (DEMO) {
    const d = loadDraft() ?? newDraft();
    demoWrite({
      phone,
      displayName,
      perWeek: d.perWeek,
      sendWindows: d.sendWindows,
      timezone: d.timezone,
      status: "awaiting_confirmation",
      promptsDone: 0,
    });
    demoPhone = phone;
    return { displayName };
  }
  if (!sessionId) throw new Error("This link is missing its payment reference. Please use the link from your receipt.");
  // Signatures are unique. If the one picked here is already taken, the
  // service changes the number and tells us what it stored; show that one.
  const r = await callApi<{ display_name?: string }>(
    "/claim",
    {
      session_id: sessionId,
      phone,
      display_name: displayName,
      consent_version: CONSENT_VERSION,
      consent_text: consentText(),
    },
    { auth: false },
  );
  return { displayName: r.display_name || displayName };
}

export async function updatePreferences(prefs: Preferences) {
  if (DEMO) {
    const sub = demoRead();
    if (sub) demoWrite({ ...sub, ...prefs });
    return;
  }
  await callApi("/preferences", {
    texts_per_week: prefs.perWeek,
    send_hours: hoursForWindows(prefs.sendWindows),
    timezone: prefs.timezone,
  });
}

/**
 * Has this paid session already been claimed with a number? Lets the welcome
 * page skip straight to "check your phone" on a reload, instead of asking
 * for the name and number again. Unauthenticated, keyed on the session id.
 */
export async function getClaimStatus(sessionId: string): Promise<ClaimStatus> {
  if (DEMO) {
    const sub = sessionId === "demo" ? demoRead() : null;
    return sub
      ? { claimed: true, phone: sub.phone, displayName: sub.displayName }
      : { claimed: false, phone: null, displayName: null };
  }
  const r = await callApi<{ claimed: boolean; phone?: string | null; display_name?: string | null }>(
    "/claim-status",
    { session_id: sessionId },
    { auth: false },
  );
  return { claimed: r.claimed, phone: r.phone ?? null, displayName: r.display_name ?? null };
}

export async function setPaused(paused: boolean) {
  if (DEMO) {
    const sub = demoRead();
    if (sub) demoWrite({ ...sub, status: paused ? "paused" : "active" });
    return;
  }
  await callApi(paused ? "/pause" : "/resume", {});
}

/** Stripe's hosted billing page: card, receipts, cancel. */
export async function openBillingPortal() {
  if (DEMO) {
    window.alert("Demo mode: this would open Stripe's billing page.");
    return;
  }
  const { url } = await callApi<{ url: string }>("/billing-portal", {
    return_url: `${window.location.origin}/guided-journal/account`,
  });
  window.location.assign(url);
}
