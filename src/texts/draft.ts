import { DEFAULT_PER_WEEK, SEND_WINDOWS } from "./config";
import { detectTimezone } from "./schedule";

/**
 * Choices made during sign-up. Kept in sessionStorage so they survive the
 * text-code step and the round trip to Stripe Checkout.
 */
export interface SignupDraft {
  perWeek: number;
  sendHour: number;
  timezone: string;
  /** E.164, set once the number is entered. */
  phone: string | null;
  consentVersion: string | null;
  /** Where they came from, e.g. "scan" for the QR code in printed products. */
  source: string | null;
}

const KEY = "pp-texts-signup";

export function newDraft(source: string | null = null): SignupDraft {
  return {
    perWeek: DEFAULT_PER_WEEK,
    sendHour: SEND_WINDOWS[0].hour,
    timezone: detectTimezone(),
    phone: null,
    consentVersion: null,
    source,
  };
}

export function loadDraft(): SignupDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...newDraft(), ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: SignupDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* private mode etc. The flow still works within one page load. */
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
