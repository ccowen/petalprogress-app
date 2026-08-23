// exit.js
//
// The mandala leaving: every shape folds back to a line down its own centre and
// retreats, the entrance run backwards.
//
// This is not a second animation. It drives the *same* interpolator from 1 down
// to 0, which time-reverses the fold exactly -- the width closes before the
// shape collapses radially, precisely mirroring how it opened. Writing an exit
// as its own set of curves would mean two implementations to keep in step every
// time the entrance is retuned, and they would drift.
//
// What an exit does get to decide is *which way* the pieces go, because
// reversal alone would send them back the way they came. That is two settings,
// not one, and they have to agree:
//
//   pullSign   -- which side of its resting place the piece ends up on.
//   foldPivot  -- which of its own ends it collapses toward as it folds.
//
// Getting only the first of those right is the trap. An exit that travels
// outward while still collapsing toward its inner crease reads as retreating
// inward, because a shape shrinking to nothing covers its own length while the
// travel is a fraction of that: the collapse simply outruns the journey.
//
//   'outward' -- foldPivot 'outer'. Each shape closes back to the line down its
//                own centre and retracts into the outer half of that line, the
//                rim end. Reads as the mandala carrying on through, which is
//                what a loop of one mandala succeeding another wants.
//   'inward'  -- foldPivot 'inner' with pullSign -1. Pieces retreat toward the
//                centre, undoing the entrance. Reads as a rewind, and suits a
//                single mandala dismissing itself with nothing following.
//
// The outward exit does not translate at all -- see pullIn. Everything you read
// as leaving comes from where the fold collapses to.

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
	 * No travel on the way out.
	 *
	 * The entrance slides its pieces in from further down the spoke, and the
	 * exit inherited that. It should not: the shape closes back to the line
	 * down its own centre and retracts into the outer end of that line, and
	 * that collapse already carries the middle of a month petal from radius 126
	 * out to 171 -- which is its own resting outer edge, exactly. Adding travel
	 * on top pushes it past its own footprint and out into empty space, which
	 * reads as the piece being thrown clear rather than withdrawn.
	 *
	 * So: the outward read comes entirely from `foldPivot`. Raise this only for
	 * the rewind exit, where the piece really does have somewhere to go.
	 */
	pullIn: 0,
	/**
	 * Which way any travel points. See the note above.
	 *
	 * Expressed as pullSign because the plan builder is direction-agnostic:
	 * +1 displaces the folded state outside the resting radius, -1 inside. Moot
	 * while pullIn is 0, and kept so the pair still reads correctly if it is
	 * raised.
	 */
	pullSign: 1,
	/**
	 * Collapse toward the far tip, not the inner crease.
	 *
	 * The other half of leaving outward, and the half that actually decides how
	 * it reads. With the inner crease the petals shrink toward the hub while
	 * drifting outward, and what you see is the ring imploding. Anchored at the
	 * tip they shrink away through the rim instead.
	 *
	 * Flip this back to 'inner' alongside pullSign -1 for the rewind exit.
	 */
	foldPivot: 'outer',
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
