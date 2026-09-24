/* ══════════════════════════════════════════════════════
   Prompted journal texts — product settings.
   Copy and numbers the sign-up flow shows. Edit here.
   ══════════════════════════════════════════════════════ */

/** One flat price, whatever the frequency. PLACEHOLDER until pricing is set. */
export const PRICE = {
  amount: "$3",
  period: "month",
};

/** Prompts in the book, and so in a full run of texts. */
export const PROMPT_COUNT = 147;

export const MIN_PER_WEEK = 1;
export const MAX_PER_WEEK = 7;
export const DEFAULT_PER_WEEK = 3;

/**
 * Which weekdays get a prompt at each frequency (0 = Sunday).
 * Spread as evenly as possible. The daily send job in petalprogress-sms must
 * use the same table. It's the source of truth for "we pick the days".
 */
export const SEND_DAYS: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 6],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export const FREQ_NOTES: Record<number, string> = {
  1: "One quiet moment a week.",
  2: "Gentle and easy to keep.",
  3: "A steady rhythm, with room to breathe.",
  4: "Most weeks, most days.",
  5: "Every weekday. Weekends are yours.",
  6: "Nearly daily, with one day off.",
  7: "A prompt every day.",
};

/**
 * Time-of-day choices. Values are the local hour stored in
 * sms_subscribers.send_hour. All sit inside the 8am–9pm quiet-hours window.
 */
export const SEND_WINDOWS = [
  { id: "morning", label: "Morning", hint: "around 8am", hour: 8 },
  { id: "midday", label: "Midday", hint: "around noon", hour: 12 },
  { id: "evening", label: "Evening", hint: "around 7pm", hour: 19 },
] as const;

export type SendWindowId = (typeof SEND_WINDOWS)[number]["id"];

/**
 * Consent shown next to the unticked checkbox. The exact text and its version
 * are sent with checkout and must be stored with the consent record, so bump
 * CONSENT_VERSION whenever the wording changes. Have this reviewed before
 * launch; it is a starting point, not legal advice.
 */
export const CONSENT_VERSION = "2026-09-v1";

/**
 * Covers the maximum frequency, not the one chosen, so raising frequency on
 * the account page later stays within what they agreed to.
 */
export function consentText() {
  return (
    `I agree to receive recurring automated journal prompt texts from PetalProgress ` +
    `at the number above, up to ${MAX_PER_WEEK} per week. Consent is not a condition of ` +
    `purchase. Msg & data rates may apply. Reply STOP to cancel or HELP for help.`
  );
}

/** Where the marketing site lives (for Terms / Privacy links). */
export const SITE_URL = "https://petalprogress.com";
