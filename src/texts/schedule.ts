import { PROMPT_COUNT, SEND_DAYS, SEND_WINDOWS } from "./config";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Mon, Wed & Fri", "Every day", "Weekdays" (sentence case). */
export function describeDays(perWeek: number): string {
  const days = SEND_DAYS[perWeek] ?? [];
  if (days.length === 7) return "Every day";
  if (days.join() === "1,2,3,4,5") return "Weekdays";
  if (days.join() === "1,2,3,4,5,6") return "Monday to Saturday";
  const names = days.map((d) => DAY_NAMES[d]);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** Rough length of a full run through the book at this pace. */
export function describeDuration(perWeek: number): string {
  const weeks = Math.ceil(PROMPT_COUNT / perWeek);
  if (weeks < 8) return `about ${weeks} weeks`;
  const months = Math.round(weeks / 4.35);
  if (months < 18) return `about ${months} months`;
  return `about ${Math.round(weeks / 52)} years`;
}

/** "every day in the evening", "Mon, Wed & Fri in the morning": for mid-sentence use. */
export function describeSchedule(perWeek: number, sendHour: number): string {
  const days = describeDays(perWeek);
  const when = days === "Every day" || days === "Weekdays" || days === "Monday to Saturday"
    ? days.toLowerCase()
    : `on ${days}`;
  const window = windowForHour(sendHour);
  return `${when}, ${window.label.toLowerCase()} (${window.hint})`;
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
