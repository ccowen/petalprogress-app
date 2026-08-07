// entrance.js
//
// The one-time "resolve into focus" moment, in the paper-kaleidoscope reading.
//
// Each shape begins as a slim line near the inner edge of its ring, extends
// outward along its spoke, then unfolds about its own vertical centreline into
// its full shape. Underneath, the whole mandala opens from the middle outward.
//
// Three principles hold the design together:
//
//   1. It resolves as one moment. Rings are offset by radius so the motion has
//      a direction, but only enough to read as a pull -- not a slow cascade.
//
//   2. Mirrored copies move identically, and adjacent sectors are mirrored
//      rather than rotated. Variety comes from the scraps differing from each
//      other, not from copies of one scrap drifting apart.
//
//   3. Motion is pure 2D transform. No filters and no blur: paper is flat and
//      opaque, and filters across 429 nodes would not hold a frame rate.
//
// The shared machinery lives in foldMotion.js, because the exit is the same
// journey travelled the other way.

import { buildFoldPlan, prefersReducedMotion, resolveShapes, runFold } from './foldMotion.js';

export const ENTRANCE_DEFAULTS = {
	/** Mirror sectors. 12 echoes the month ring. */
	symmetryOrder: 12,
	/** How long one scrap takes to settle. */
	duration: 1450,
	/** Spread of start times within a ring. Small on purpose -- see note 1. */
	stagger: 220,
	/**
	 * Extra delay applied in proportion to a ring's radius, in milliseconds.
	 *
	 * This is what gives the entrance a direction. Rings start in order of how
	 * far out they sit, so the whole mandala reads as opening from the middle
	 * outward. Kept short relative to the duration so the rings still overlap
	 * heavily and resolve as one moment rather than a slow cascade.
	 */
	radialSweep: 400,

	// --- the fold ---
	/**
	 * How a slim shape becomes its full shape.
	 *
	 *   'bulge' -- it swells outward from a line down its centre, overshooting
	 *              full width and settling back. Soft, like paper puffing out.
	 *   'hinge' -- it swings open about that centre line like a panel on a
	 *              hinge. Width follows cos() of the swing angle, which is the
	 *              real projected width of a rotating plane, so it reads as
	 *              turning in space rather than stretching.
	 *
	 * Both share the same two-stage timing and the same overshoot curve, so
	 * they differ in character rather than in structure.
	 */
	foldMode: 'bulge',
	/**
	 * How wide the shape is when it starts, as a fraction of full width.
	 *
	 * Near zero on purpose: the shape should begin as a vertical line down its
	 * own centre and open from there. This can be tiny without the shape
	 * vanishing, because by the time width starts moving the shape has already
	 * extended radially -- so near-zero width is a visible *line*, not nothing.
	 *
	 * There is a floor, though. A day segment is ~14.8px wide on screen, so
	 * this lands around 0.5px: a hairline. Much below that and the segments
	 * stop rendering altogether and the entrance turns back into a fade-in.
	 */
	widthFrom: 0.035,
	/**
	 * How far past full width the shape briefly swells, as a fraction.
	 *
	 * A rigid panel arrives at its width and stops; something inflating
	 * overshoots a little and settles back. Small values read as paper, large
	 * as rubber.
	 */
	bulgeOvershoot: 0.09,
	/**
	 * How much the shape shortens along its spoke at peak bulge, as a fraction.
	 *
	 * Squash and stretch: a form that puffs outward gives up a little length
	 * doing it. Without this the swell reads as the shape simply getting wider.
	 */
	bulgeSquash: 0.06,
	/**
	 * Residual shear while narrow, in degrees. Zero by default: any lean,
	 * repeated around a ring, reads as a pinwheel turning rather than shapes
	 * opening outward. Raise it only if the swell needs breaking up, and expect
	 * some rotational feel with it.
	 */
	bulgeSkew: 0,

	// --- 'hinge' mode ---
	/**
	 * How far open the panel starts, in degrees about its vertical centreline.
	 * 90 is fully edge-on, 0 is flat to the viewer.
	 */
	hingeOpenAngle: 85,
	/**
	 * Peak shear during the swing, in degrees, standing in for perspective.
	 *
	 * A real panel rotating about a vertical axis brings one edge toward the
	 * viewer and pushes the other away. SVG has no depth, so the near edge is
	 * faked by shearing in proportion to sin(angle) -- strongest edge-on, gone
	 * by the time the panel lies flat.
	 */
	hingeSkew: 14,

	/**
	 * Overall scale a shape starts at, growing to full size as it settles.
	 *
	 * Anchored on the same inner crease the radial fold opens from, so the
	 * shape is bottom-aligned as it grows: its inner edge stays put and it
	 * expands upward and outward, rather than swelling about its own middle.
	 * Runs across the whole transition, under the fold, as a slow undertone.
	 */
	growFrom: 0.5,
	/**
	 * When the radial extend finishes, 0..1.
	 *
	 * The shape reaches its full length along the spoke by this point, while
	 * still pinched to a line down its centre. That pause matters: the whole
	 * read is "here is the shape's symmetry line, now it opens into the
	 * shape", and you only get it if the line is standing at full height
	 * before the width starts moving.
	 */
	radialDone: 0.35,
	/**
	 * How far into the transition the shape starts widening, 0..1.
	 *
	 * Set at or just past radialDone so the two stages hand off cleanly rather
	 * than running together. Everything after this is the expansion, which is
	 * the part worth watching, so it gets most of the duration.
	 */
	foldOpenDelay: 0.35,

	// --- travel ---
	/**
	 * How far inside its resting place a shape starts, measured in multiples of
	 * the shape's *own* length along the spoke.
	 *
	 * Deliberately not a fraction of the ring's radius. That looked equivalent
	 * but read badly: the day ring has the largest radius and the smallest
	 * shapes, so day segments travelled about three times their own length
	 * while month petals moved a quarter of theirs. Measured against the shape
	 * itself, one setting means the same thing on every ring.
	 */
	pullIn: 0.5,
	/**
	 * Which way the displacement points. -1 starts the shape inside its resting
	 * radius, which is what an entrance wants; the exit flips it.
	 */
	pullSign: -1,
	/**
	 * Starting swirl of the position about the mandala centre, in degrees.
	 *
	 * Zero by default. Any value rotates pieces around the centre, and on a
	 * ring built from one mirrored scrap every copy swirls the same way at the
	 * same moment, which reads as the whole ring turning clockwise.
	 */
	swirl: 0,
	/** Extra starting rotation of the piece itself, in degrees. Zero for the
	 * same reason as swirl: consistent rotation repeated around a ring reads as
	 * spin, not as opening outward. */
	spin: 0,

	/**
	 * Fraction of the transition spent fading in.
	 *
	 * Short, and it has to stay shorter than foldOpenDelay. The shape spends
	 * that opening stretch as a hairline; if it is still fading while it is
	 * that thin, faint times thin comes out invisible and the slim stage is
	 * lost.
	 */
	fadeIn: 0.12,
	/**
	 * Per-instance variation within a scrap, 0..1. Zero is the honest mirror.
	 * A little keeps it from feeling machined.
	 */
	jitter: 0.05,
	/** Fixed so replays are identical and renders are reproducible. */
	seed: 20260801
};

/** Build the entrance plan without touching the DOM. */
export function planEntrance(rings, options = {}) {
	return buildFoldPlan(rings, { ...ENTRANCE_DEFAULTS, ...options });
}

/**
 * Run the entrance.
 *
 * `rings` is `[{ id, placements, selection }]`, where `selection` is the d3
 * selection of instance groups in the same order as `placements`.
 *
 * Resolves when the last instance has settled.
 */
export function playEntrance(rings, options = {}) {
	if (prefersReducedMotion()) return Promise.resolve(null);

	// Measure before planning: the fold pivot is a property of the drawn shape,
	// not of the geometry data, so it has to come off the DOM.
	const measured = resolveShapes(rings);
	const plan = planEntrance(measured, options);

	return runFold(measured, plan).then(() => plan);
}

export { prefersReducedMotion };
