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

/** The frequencies people can pick, shown as single-select buttons. */
export const FREQUENCY_OPTIONS = [2, 3, 4, 6] as const;
export const DEFAULT_PER_WEEK = 3;
/** Highest frequency on offer. The consent wording covers this. */
export const MAX_PER_WEEK = Math.max(...FREQUENCY_OPTIONS);

/*
 * Which days a prompt arrives is deliberately NOT shown or chosen here: the
 * texts service in petalprogress-sms decides, so each one is a small surprise.
 * The app only knows how many a week and roughly what time of day.
 */

/** Optional short note under the chosen frequency. Shown only when set. */
export const FREQ_NOTES: Record<number, string> = {};

/**
 * Time-of-day choices. People can pick more than one. The hour is the local
 * hour the texts service sends in; it's never shown, so a "morning" prompt
 * stays a small surprise. All sit inside the 8am–8pm quiet-hours window
 * (8pm everywhere, the stricter state rule, to keep things simple).
 *
 * sms_subscribers.send_hour holds one hour today; see api.ts for how a
 * multi-window choice is sent and read back until the column becomes a list.
 */
export const SEND_WINDOWS = [
  { id: "morning", label: "Morning", hour: 8 },
  { id: "midday", label: "Midday", hour: 12 },
  { id: "evening", label: "Evening", hour: 19 },
] as const;

export type SendWindowId = (typeof SEND_WINDOWS)[number]["id"];
export const DEFAULT_SEND_WINDOWS: SendWindowId[] = ["morning"];

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

/**
 * The privacy promise about answers, shown on the welcome and phone steps
 * and the account page. petalprogress-sms makes it true: reply words go only
 * to an anonymous table (no person, number or time), and messages are deleted
 * from Twilio an hour after they finish. Don't strengthen this wording
 * without checking that the backend still backs it up.
 */
export const ANSWERS_PRIVACY = {
  title: "Your answers stay yours.",
  text:
    "Replies are never saved to your account or linked to your number. We may keep " +
    "answers anonymously, with no name or number attached, to help improve the prompts.",
};

/** Where the marketing site lives (for Terms / Privacy links). */
export const SITE_URL = "https://petalprogress.com";
