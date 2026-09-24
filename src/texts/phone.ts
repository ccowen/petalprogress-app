/**
 * US numbers only for now: the texts run on a US 10DLC number and the consent
 * rules we follow are US ones (TCPA).
 */

/** Digits typed so far, formatted as (555) 123-4567 while typing. */
export function formatUsPhone(input: string): string {
  const d = input.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** E.164 (+15551234567), or null if it isn't a full US number. */
export function toE164(input: string): string | null {
  const d = input.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(d) ? `+1${d}` : null;
}

/** +15551234567 → (555) 123-4567 */
export function displayPhone(e164: string): string {
  return formatUsPhone(e164.replace(/^\+1/, ""));
}
