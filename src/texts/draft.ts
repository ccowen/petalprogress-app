import { DEFAULT_PER_WEEK, DEFAULT_SEND_WINDOWS, type SendWindowId } from "./config";
import { detectTimezone } from "./schedule";

/**
 * Choices made during sign-up. Kept in sessionStorage so they survive a
 * reload and the round trip to Stripe Checkout. The phone number isn't here:
 * it's asked for after payment, on the welcome page, and sent straight to
 * the texts service with the consent.
 */
export interface SignupDraft {
  perWeek: number;
  /** At least one. */
  sendWindows: SendWindowId[];
  timezone: string;
  /** Where they came from, e.g. "scan" for the QR code in printed products. */
  source: string | null;
}

const KEY = "pp-texts-signup";

export function newDraft(source: string | null = null): SignupDraft {
  return {
    perWeek: DEFAULT_PER_WEEK,
    sendWindows: [...DEFAULT_SEND_WINDOWS],
    timezone: detectTimezone(),
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
