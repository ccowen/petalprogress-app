// presets.js
//
// Named bundles of fold options, so directions can be compared by switching a
// dropdown rather than by editing a file and reloading.
//
// A preset is nothing but an override object handed to `replayEntrance` or
// `startLoop`. Everything it does not name falls through to ENTRANCE_DEFAULTS,
// so a preset reads as a diff against the tuned baseline -- which is also what
// makes it useful to look at: the list below is a record of which levers
// actually change the character of the fold and which only change its speed.
//
// Deliberately not `duration`. The loop hands one options object to both the
// entrance and the exit, so a preset that slows the entrance slows the exit
// with it, and an exit that matches its entrance makes a loop feel like it
// stalls in the middle. Presets therefore differ in character rather than in
// pace, and pacing stays a tuning conversation about ENTRANCE_DEFAULTS.

/**
 * The fold settings the kept presets were chosen against, frozen.
 *
 * A preset written as a diff against ENTRANCE_DEFAULTS is not a preserved
 * variation -- it moves every time the baseline is retuned, so the thing you
 * chose quietly becomes a different thing while keeping its name. Retuning the
 * baseline is exactly what happens next, so a kept preset carries its own copy
 * of everything that decides its character and stops depending on the module.
 *
 * `duration` is deliberately absent. It is pace rather than character, and the
 * loop hands one options object to both halves, so pinning it here would pin
 * the exit to the entrance's length and make every loop stall in the middle.
 * If pace needs preserving too, it needs the loop to take the two separately
 * first.
 *
 * Recorded 2026-08-22. Do not edit to match a retuned baseline -- that is the
 * drift this exists to prevent. Add a new snapshot beside it instead.
 */
const KEPT = Object.freeze({
	symmetryOrder: 12,
	stagger: 220,
	radialSweep: 400,
	foldMode: 'hinge',
	widthFrom: 0.035,
	// Feeds the swelling curve every beat lands on, so it sets the bounce.
	bulgeOvershoot: 0.09,
	// No effect under a hinge -- the squash keys off width past full, and a
	// swinging panel never exceeds full. Pinned anyway, so the snapshot is a
	// complete answer rather than one that has to be reasoned about.
	bulgeSquash: 0.06,
	bulgeSkew: 0,
	hingeOpenAngle: 85,
	hingeSkew: 14,
	hingeBeatHold: 0.28,
	growFrom: 0.5,
	radialDone: 0.35,
	foldOpenDelay: 0.35,
	pullIn: 0.5,
	pullSign: -1,
	foldPivot: 'inner',
	swirl: 0,
	spin: 0,
	fadeIn: 0.12,
	jitter: 0.05,
	seed: 20260801
});

/**
 * @typedef {object} FoldPreset
 * @property {string} id      Value stored in the picker.
 * @property {string} label   What the picker shows.
 * @property {string} group   Which optgroup it sits under.
 * @property {string} note    One line on what it is for. Shown as the title.
 * @property {object} options Overrides passed to the entrance and exit.
 * @property {boolean} [kept] Pinned against baseline retuning. See KEPT.
 */

/** @type {FoldPreset[]} */
export const FOLD_PRESETS = [
	{
		id: 'hinge',
		label: 'hinge · two beats',
		group: 'hinge',
		note: 'Kept. The swing worked open in two movements.',
		kept: true,
		options: { ...KEPT, hingeBeats: 2 }
	},
	{
		id: 'hinge-single',
		label: 'hinge · one swing',
		group: 'hinge',
		note: 'Kept. The fold as it was before beats existed.',
		kept: true,
		options: { ...KEPT, hingeBeats: 1 }
	},
	// The three below are still diffs against ENTRANCE_DEFAULTS, and should be:
	// they are questions rather than answers, and a question is more useful
	// asked against whatever the baseline currently is.
	{
		id: 'hinge-worked',
		label: 'hinge · three beats',
		group: 'hinge',
		note: 'A third movement, with the standing-up stage cut short to fit it.',
		options: {
			foldMode: 'hinge',
			hingeBeats: 3,
			// Three beats inside the same clock means each gets two thirds of
			// the span two beats had, so the hold has to come down with it or
			// the swings have no room left to move in.
			hingeBeatHold: 0.22,
			radialDone: 0.24,
			foldOpenDelay: 0.24
		}
	},
	{
		id: 'hinge-flat',
		label: 'hinge · in place',
		group: 'hinge',
		note: 'No perspective, no slide, no growth: the shape squeezes out of its own centreline exactly where it lands.',
		options: {
			foldMode: 'hinge',
			// The shear is a fake for depth SVG cannot express. Off, the swing
			// is honest and flat, and worth seeing before deciding the lean is
			// carrying the fold rather than wobbling it.
			hingeSkew: 0,
			// No travel in from further down the spoke, and almost no scale-up
			// underneath -- so the only thing moving is the fold itself.
			pullIn: 0,
			growFrom: 0.85,
			radialDone: 0.28,
			foldOpenDelay: 0.28
		}
	},
	{
		id: 'hinge-deep',
		label: 'hinge · more turn',
		group: 'hinge',
		note: 'Starts nearer edge-on, leans harder, grows more underneath.',
		options: {
			foldMode: 'hinge',
			// 90 is exactly edge-on, where a panel has no width at all and
			// nothing renders. 88 is as close as is safe.
			hingeOpenAngle: 88,
			hingeSkew: 26,
			growFrom: 0.35,
			hingeBeatHold: 0.34
		}
	},
	{
		id: 'bulge',
		label: 'bulge',
		group: 'other directions',
		note: 'Swells outward from a line down its centre and settles back.',
		options: { foldMode: 'bulge' }
	},
	{
		id: 'evert',
		label: 'evert',
		group: 'other directions',
		note: 'Turns about the inner crease, passing through edge-on. The kaleidocycle reading.',
		options: { foldMode: 'evert' }
	},
	{
		id: 'unfurl',
		label: 'unfurl',
		group: 'other directions',
		note: 'Drawn out of the inner crease to full length, never opening sideways.',
		options: { foldMode: 'unfurl' }
	}
];

/** The picker's groups, in the order they should appear. */
export const PRESET_GROUPS = [...new Set(FOLD_PRESETS.map((p) => p.group))];

/**
 * Overrides for a preset id.
 *
 * Falls back to the first preset rather than to `{}`: an unknown id is a typo
 * or a stale saved value, and silently playing the module defaults would look
 * like the picker was being ignored.
 */
export function presetOptions(id) {
	return (FOLD_PRESETS.find((p) => p.id === id) ?? FOLD_PRESETS[0]).options;
}
