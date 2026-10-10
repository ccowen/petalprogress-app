import { PROMPT_COUNT, SEND_WINDOWS, type SendWindowId } from "./config";

/** Rough length of a full run through the book at this pace. */
export function describeDuration(perWeek: number): string {
  const weeks = Math.ceil(PROMPT_COUNT / perWeek);
  if (weeks < 8) return `about ${weeks} weeks`;
  const months = Math.round(weeks / 4.35);
  if (months < 18) return `about ${months} months`;
  return `about ${Math.round(weeks / 52)} years`;
}

/**
 * "3 a week, in the morning and evening". Days and clock times are left
 * unsaid on purpose.
 */
export function describeSchedule(perWeek: number, windows: SendWindowId[]): string {
  const names = SEND_WINDOWS.filter((w) => windows.includes(w.id)).map((w) => w.label.toLowerCase());
  return `${perWeek} a week, in the ${listWords(names)}`;
}

function listWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "morning";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Local send hours for the chosen windows, in the order the day runs. */
export function hoursForWindows(windows: SendWindowId[]): number[] {
  return SEND_WINDOWS.filter((w) => windows.includes(w.id)).map((w) => w.hour);
}

/** The window a stored send_hour falls in (nearest one, so odd hours still map). */
export function windowForHour(hour: number): SendWindowId {
  let best: (typeof SEND_WINDOWS)[number] = SEND_WINDOWS[0];
  for (const w of SEND_WINDOWS) if (Math.abs(w.hour - hour) < Math.abs(best.hour - hour)) best = w;
  return best.id;
}

/** The browser's IANA timezone, e.g. "America/Chicago". */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
