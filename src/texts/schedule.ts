import { PROMPT_COUNT, SEND_WINDOWS } from "./config";

/** Rough length of a full run through the book at this pace. */
export function describeDuration(perWeek: number): string {
  const weeks = Math.ceil(PROMPT_COUNT / perWeek);
  if (weeks < 8) return `about ${weeks} weeks`;
  const months = Math.round(weeks / 4.35);
  if (months < 18) return `about ${months} months`;
  return `about ${Math.round(weeks / 52)} years`;
}

/** "3 a week, in the evening (around 7pm)". Days are left unsaid on purpose. */
export function describeSchedule(perWeek: number, sendHour: number): string {
  const window = windowForHour(sendHour);
  return `${perWeek} a week, in the ${window.label.toLowerCase()} (${window.hint})`;
}

export function windowForHour(hour: number) {
  return SEND_WINDOWS.find((w) => w.hour === hour) ?? SEND_WINDOWS[0];
}

/** The browser's IANA timezone, e.g. "America/Chicago". */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
