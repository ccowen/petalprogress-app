import { supabase } from "../lib/supabase";
import type { sampleConfig } from "./sampleMandalaConfig";

/**
 * The request body the geometry API expects, defined as the shape of the
 * existing sample so the two can't drift apart.
 */
export type MandalaConfig = typeof sampleConfig;

/** "Heat Wave" -> "heat-wave", matching the class names in themes.css. */
function slug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Load the signed-in user's mandala and shape it into the geometry API's
 * request body.
 *
 * Returns null when there's nothing to show -- no session, or no mandala
 * yet -- so callers can fall back to the bundled sample rather than
 * rendering an empty canvas.
 *
 * Note the intentions mapping. The database stores one row per period with
 * an explicit cadence, but the geometry API still takes flat `month_N`
 * keys inherited from the Bubble model. This function is the adapter
 * between the two, and it is the thing that will have to change first when
 * weekly and monthly mandalas start carrying intentions -- `month_N` keys
 * cannot express a weekly cadence.
 */
export async function loadMandalaConfig(): Promise<MandalaConfig | null> {
  const { data, error } = await supabase
    .from("mandalas")
    .select(
      `
      mandala_name,
      color_theme,
      color_petal,
      figure_choice,
      start_date,
      type_slug,
      mandala_intentions ( cadence, period, intention ),
      habits ( habit_name, weekly_goal )
      `,
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[loadMandalaConfig] query failed:", error.message);
    return null;
  }
  if (!data) return null;

  const habit = data.habits?.[0] ?? null;

  // Completions hang off the habit, so they need their own query.
  let completions: MandalaConfig["completions"] = [];
  if (habit) {
    const { data: rows, error: completionsError } = await supabase
      .from("habit_completions")
      .select("actual_date, day_number, is_completed")
      .eq("is_completed", true)
      .order("actual_date", { ascending: true });

    if (completionsError) {
      console.error(
        "[loadMandalaConfig] completions query failed:",
        completionsError.message,
      );
    } else {
      completions = (rows ?? []).map((r) => ({
        day: r.day_number ?? 0,
        is_completed: r.is_completed,
        date: r.actual_date,
      }));
    }
  }

  // Rows -> the flat month_N object the geometry API still expects.
  const intentions: Record<string, string> = {};
  for (const row of data.mandala_intentions ?? []) {
    if (row.cadence !== "month") continue;
    intentions[`month_${row.period}`] = row.intention ?? "";
  }

  return {
    mandala: {
      name: data.mandala_name,
      color_theme: data.color_theme ?? "",
      color_petal: data.color_petal ?? "",
      start_date: data.start_date ?? "",
      intentions,
      color_theme_css_class: `theme-${slug(data.color_theme ?? "")}`,
      color_petal_css_class: `petal-${slug(data.color_petal ?? "")}`,
      figure_choice: data.figure_choice ?? "",
    },
    habit: {
      name: habit?.habit_name ?? "",
      // The API takes this as a string; the column is an integer.
      weekly_goal: String(habit?.weekly_goal ?? ""),
    },
    completions,
  } as MandalaConfig;
}
