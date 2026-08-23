// entrance.js
//
// The one-time "resolve into focus" moment, in the paper-kaleidoscope reading.
//
// Each shape begins as a slim line near the inner edge of its ring, extends
// outward along its spoke, then unfolds about its own vertical centreline into
// its full shape. Underneath, the whole mandala opens from the middle outward.
//
// That is 'bulge' and 'hinge', which are two readings of the mirrored paper
// kaleidoscope. 'evert' is a third reading of a different paper object -- the
// kaleidocycle, a hinged ring of tetrahedra that turns endlessly through its
// own centre -- and it turns each shape about its inner crease instead. See
// foldMode below for what that changes.
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
	 *              turning in space rather than stretching. `hingeBeats` breaks
	 *              that swing into separate movements, so it is worked open in
	 *              stages rather than in one go.
	 *   'unfurl'-- it is drawn out of its inner crease to its full length
	 *              along the spoke, and never opens sideways at all. The shape
	 *              emerges from the inside of its ring and reaches outward to
	 *              its fullness, which is what a kaleidocycle looks like in
	 *              use: a new face rises out of the middle of the ring, opens
	 *              to full, and on the next turn folds away past the rim while
	 *              the one behind it rises. Set the exit to travel outward and
	 *              a loop reads as that procession continuing.
	 *   'evert' -- it turns about an axis mostly along its inner crease -- the
	 *              edge it shares with the hub -- rather than down its own
	 *              centreline. So it foreshortens along the spoke, passes
	 *              through edge-on and opens out the other side, closing a
	 *              little as it goes. This is the paper *kaleidocycle* -- the
	 *              hinged ring of tetrahedra that turns endlessly through its
	 *              own middle -- rather than the mirrored tube the other two
	 *              modes come from. The part of the turn it borrows from
	 *              'hinge' is set by evertHinge.
	 *
	 * Bulge and hinge share the same two-stage timing and the same overshoot
	 * curve, so they differ in character rather than structure. Evert differs
	 * in structure: one clock instead of two, one easing across the whole ring
	 * instead of one per scrap, and no overshoot at all. A kaleidocycle has a
	 * single degree of freedom and no rest position, so there is nothing for it
	 * to settle into and nothing to stage.
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
	 * How many separate movements the swing is worked open in.
	 *
	 * 1 is a single continuous swing -- the fold as it was before this existed,
	 * and this setting reproduces it exactly rather than approximately.
	 *
	 * 2 opens it like a flap being worked by hand: swing, pause, swing again.
	 * Each beat carries its own overshoot, so it lands, springs and settles
	 * before the next starts, and that bounce is what makes a beat register --
	 * not how much width it adds. Worth knowing that the beats are not evenly
	 * *visible*: a swinging panel's projected width goes as the cosine of its
	 * angle, so the first beat opens roughly three quarters of the width and
	 * the second is the last stretch snapping flat.
	 *
	 * The exit inherits this and folds in over the same number of beats,
	 * because it drives the same interpolator backwards.
	 *
	 * Above 3 the pauses get shorter than they read and it turns into a
	 * stutter. If the beats want more room, lengthen `duration` rather than
	 * adding more of them.
	 */
	hingeBeats: 2,
	/**
	 * How much of each beat is spent held still at its end, 0..1.
	 *
	 * The pause is the whole point of beating the swing -- without it the
	 * stages run together and it reads as one uneven swing. Too much and the
	 * fold spends its time waiting.
	 */
	hingeBeatHold: 0.28,

	// --- 'evert' mode ---
	/**
	 * How far past flat the shape starts its turn, in degrees.
	 *
	 * Above 90 on purpose. At exactly 90 it would start edge-on and simply
	 * open, which is the hinge again with its axis moved. Past 90 it starts
	 * mirrored through its crease -- lying inward over the hub, the back of the
	 * panel showing -- and turns *through* edge-on into place.
	 *
	 * That pass through zero is the eversion, and it is the whole point of the
	 * mode: in the real object the face you are looking at folds away through
	 * the centre and a different one arrives out of it. Raising this sends the
	 * shapes further in over the hub before they come back; much past 120 and
	 * the month petals bury the centre figure on the way through.
	 */
	evertSweep: 112,
	/**
	 * Peak sideways lean during the turn, in degrees.
	 *
	 * The hinge edges of a kaleidocycle are skew to one another, so a unit
	 * twists as it tips rather than merely tipping. Signed by the same
	 * `skewSign` the other modes use, so adjacent sectors already lean against
	 * each other -- neighbouring tetrahedra really do counter-rotate, and it
	 * keeps the lean from summing into a pinwheel. This only sets how far.
	 */
	evertTilt: 12,
	/**
	 * How much of the centreline turn to mix into the crease turn, 0..1.
	 *
	 * At 0 the shape turns purely about its inner crease: it foreshortens along
	 * the spoke and its width never moves. That is the honest single-axis fold,
	 * and on screen it reads as a panel swinging up on a bottom hinge -- a
	 * garage door -- because a real object turning in space narrows as well as
	 * shortens.
	 *
	 * Raising it turns the shape about an axis part-way between its crease and
	 * its centreline, so it closes a little as it tips. The crease has to stay
	 * the dominant half: push this past about 0.6 and the fold stops being an
	 * eversion and becomes the hinge mode with extra steps.
	 *
	 * It brings the hinge's shear with it, on the hinge's own `hingeSkew`
	 * setting, since that is exactly the character being borrowed.
	 */
	evertHinge: 0.45,
	/**
	 * How far behind the even sectors the odd ones run, in milliseconds.
	 *
	 * Off. The six tetrahedra of a real kaleidocycle are not all presenting a
	 * face at the same instant -- alternate units sit out of phase, which is
	 * where the object's hand-over-hand rhythm comes from -- and alternating by
	 * sector reproduced that on any ring size. But a mandala is not a linkage,
	 * and nothing here has to obey the real thing's kinematics. On twelve month
	 * petals the alternation reads as a stutter: every other petal arriving
	 * late looks like six of them are lagging, not like a mechanism turning.
	 *
	 * Left as a knob rather than deleted because it is the one lever that
	 * brings back the rolling rhythm if the lockstep ever reads as too flat.
	 * A few hundred ms is where it becomes visible.
	 *
	 * Phasing it as a wave travelling *around* the ring is the other obvious
	 * option and is worse still: consistent motion repeated around a ring reads
	 * as the whole mandala spinning, the same trap that keeps swirl and spin at
	 * zero.
	 */
	evertPhase: 0,

	// --- 'unfurl' mode ---
	/**
	 * How far the far end lags at the start of the draw, in degrees.
	 *
	 * The curl left in a sheet that has been rolled: the tip trails as the
	 * shape comes out and straightens by the time it is at full length. Signed
	 * by `skewSign`, so adjacent sectors curl against each other and the lean
	 * cannot sum into a pinwheel.
	 *
	 * This is the only ornament the mode has. The extension does the work, and
	 * at zero the fold is an honest, unornamented draw -- which is worth
	 * looking at before deciding how much curl it wants.
	 */
	unfurlCurl: 9,

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
	 * Which end of the shape the fold collapses toward.
	 *
	 *   'inner' -- the crease nearest the hub. The shape unfolds away from the
	 *              centre, which is what an arrival wants.
	 *   'outer' -- the far tip. The shape collapses toward the rim instead.
	 *
	 * Pairs with `pullSign`, and the pair has to agree: travel and collapse
	 * pulling opposite ways cancel, and the collapse wins, because a shape
	 * shrinking to nothing moves its own length while the travel is a fraction
	 * of that. Outward travel with an inner collapse is the case that bites --
	 * see EXIT_DEFAULTS.
	 */
	foldPivot: 'inner',
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
