// Types for presets.js.
//
// The motion module is plain JavaScript on purpose -- the checks import it
// directly under Node, with no build step -- so the types live alongside it
// rather than the source becoming TypeScript.

export interface FoldPreset {
	/** Value stored in the picker. */
	id: string;
	/** What the picker shows. */
	label: string;
	/** Which optgroup it sits under. */
	group: string;
	/** One line on what it is for. Shown as the option's title. */
	note: string;
	/** Overrides passed to the entrance and exit. */
	options: Record<string, unknown>;
	/** Pinned against baseline retuning. */
	kept?: boolean;
}

export const FOLD_PRESETS: FoldPreset[];
export const PRESET_GROUPS: string[];
export function presetOptions(id: string): Record<string, unknown>;
