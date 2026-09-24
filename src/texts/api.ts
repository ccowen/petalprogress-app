/* ══════════════════════════════════════════════════════
   Everything the texts flow asks of the outside world.

   Live mode:
     - Text-code login is Supabase phone auth (Twilio as the SMS provider).
     - Reading your subscription is a direct Supabase read (RLS: own row only).
     - Anything that WRITES subscriber state goes through petalprogress-sms at
       VITE_TEXTS_API_URL, because sms_subscribers has no user write policy.

   Demo mode (VITE_TEXTS_DEMO=true):
     - No network. Any 6-digit code works, "payment" goes straight to the
       confirmation page. For clicking through the flow before the backend
       exists. Supabase is never loaded, so no keys are needed.
   ══════════════════════════════════════════════════════ */

import { CONSENT_VERSION, consentText } from "./config";
import type { SignupDraft } from "./draft";

export const DEMO = import.meta.env.VITE_TEXTS_DEMO === "true";
const API_URL = (import.meta.env.VITE_TEXTS_API_URL ?? "").replace(/\/$/, "");

export type SubscriptionStatus =
  | "awaiting_confirmation" // paid, hasn't replied YES yet
  | "active"
  | "paused"
  | "cancelled";

export interface Subscription {
  phone: string;
  perWeek: number;
  sendHour: number;
  timezone: string;
  status: SubscriptionStatus;
  /** Prompts completed so far (current_prompt_index). */
  promptsDone: number;
}

export interface Preferences {
  perWeek: number;
  sendHour: number;
  timezone: string;
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

async function callApi<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) throw new Error("Texts service isn't configured (VITE_TEXTS_API_URL).");
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Something went wrong (${res.status}). Please try again.`);
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

/* ── Auth: text-code login ── */

/**
 * Text a 6-digit code. `createAccount` is true during sign-up and false on
 * the sign-in page, so a typo there can't create a stray account.
 */
export async function sendCode(phone: string, createAccount: boolean) {
  if (DEMO) {
    demoPhone = phone;
    return;
  }
  const { error } = await (await db()).auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: createAccount },
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
  return message;
}

/* ── Subscription ── */

/** Your subscription, or null if you haven't finished signing up. */
export async function getSubscription(): Promise<Subscription | null> {
  if (DEMO) return demoRead();

  // select("*") on purpose: texts_per_week is added by a pending migration in
  // petalprogress-db, and a typed column list would not compile until the
  // generated types catch up.
  const { data, error } = await (await db())
    .from("sms_subscribers")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as typeof data & { texts_per_week?: number };
  let status: SubscriptionStatus = row.subscription_status as SubscriptionStatus;
  if (status === "active" && !row.consent_confirmed_at) status = "awaiting_confirmation";

  return {
    phone: row.phone,
    perWeek: row.texts_per_week ?? 7,
    sendHour: row.send_hour,
    timezone: row.timezone,
    status,
    promptsDone: row.current_prompt_index,
  };
}

/**
 * Start Stripe Checkout. The texts service creates the Checkout Session with
 * the user's id as client_reference_id and these choices as metadata, and
 * the Stripe webhook creates the subscriber row and sends "Reply YES".
 */
export async function startCheckout(draft: SignupDraft) {
  if (DEMO) {
    demoWrite({
      phone: draft.phone ?? demoPhone ?? "+15555550123",
      perWeek: draft.perWeek,
      sendHour: draft.sendHour,
      timezone: draft.timezone,
      status: "awaiting_confirmation",
      promptsDone: 0,
    });
    window.location.assign("/texts/welcome");
    return;
  }

  const { url } = await callApi<{ url: string }>("/checkout", {
    texts_per_week: draft.perWeek,
    send_hour: draft.sendHour,
    timezone: draft.timezone,
    consent_version: CONSENT_VERSION,
    consent_text: consentText(),
    source: draft.source,
    success_url: `${window.location.origin}/texts/welcome`,
    cancel_url: `${window.location.origin}/texts?step=review`,
  });
  window.location.assign(url);
}

export async function updatePreferences(prefs: Preferences) {
  if (DEMO) {
    const sub = demoRead();
    if (sub) demoWrite({ ...sub, ...prefs });
    return;
  }
  await callApi("/preferences", {
    texts_per_week: prefs.perWeek,
    send_hour: prefs.sendHour,
    timezone: prefs.timezone,
  });
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
    return_url: `${window.location.origin}/texts/account`,
  });
  window.location.assign(url);
}
