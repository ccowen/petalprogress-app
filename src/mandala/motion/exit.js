// exit.js
//
// The mandala leaving: every shape folds back to a line down its own centre and
// retreats, the entrance run backwards.
//
// This is not a second animation. It drives the *same* interpolator from 1 down
// to 0, which time-reverses it exactly -- the width closes before the shape
// collapses radially, precisely mirroring how it opened. Writing an exit as its
// own set of curves would mean two implementations to keep in step every time
// the entrance is retuned, and they would drift.
//
// The one thing an exit gets to decide is *which way* the pieces go, because
// reversal alone would send them back the way they came:
//
//   'outward' -- pieces continue past their resting place and fold away toward
//                the rim. Reads as the mandala carrying on through, which is
//                what a marketing loop of one mandala succeeding another wants.
//   'inward'  -- pieces retreat back toward the centre, undoing the entrance.
//                Reads as a rewind, and suits a single mandala dismissing
//                itself with nothing following.

import {
	buildFoldPlan,
	prefersReducedMotion,
	resolveShapes,
	runFold
} from './foldMotion.js';
import { ENTRANCE_DEFAULTS } from './entrance.js';

export const EXIT_DEFAULTS = {
	...ENTRANCE_DEFAULTS,
	/**
	 * Which way pieces travel as they leave. See the note above.
	 *
	 * Expressed as pullSign because the plan builder is direction-agnostic:
	 * +1 displaces the folded state outside the resting radius, -1 inside.
	 */
	pullSign: 1,
	/**
	 * A little quicker than the entrance.
	 *
	 * Arrivals reward being watched; departures mostly need to get out of the
	 * way of whatever is arriving next. Matching the entrance exactly makes a
	 * loop feel like it is stalling in the middle.
	 */
	duration: 1100,
	/** Fraction of the transition spent fading out, measured from the end. */
	fadeIn: 0.35
};

/** Build the exit plan without touching the DOM. */
export function planExit(rings, options = {}) {
	return buildFoldPlan(rings, { ...EXIT_DEFAULTS, ...options });
}

/**
 * Run the exit.
 *
 * Assumes the mandala is currently resolved -- it does not prime the shapes
 * first, because they are already where they should be.
 *
 * Resolves when the last instance has folded away.
 */
export function playExit(rings, options = {}) {
	if (prefersReducedMotion()) return Promise.resolve(null);

	const measured = resolveShapes(rings);
	const plan = planExit(measured, options);

	return runFold(measured, plan, { reverse: true }).then(() => plan);
}
