// foldMotion.js
//
// The machinery shared by the entrance and the exit.
//
// Both are the same journey between two states -- a shape folded flat against
// its inner crease and pinched to a line down its centre, and that shape fully
// resolved at its placement. An entrance travels folded to resolved; an exit
// travels resolved to folded. Everything else (which scraps exist, how the
// mirrors repeat them, how a state becomes a transform) is common, so it lives
// here rather than being written twice and drifting apart.
//
// Why the fold works out so simply: every placement arrives as
// `translate(x, y) rotate(angle)`, and placements sit at (r·sinθ, -r·cosθ).
// Rotating local (0,-1) by θ gives (sinθ, -cosθ), which is exactly the outward
// unit vector. So in a placement's own coordinates, -Y always points away from
// the centre, and the innermost point of a shape is simply its largest local Y.
// That means the fold needs no per-shape special casing -- just one measured
// pivot per ring.

import * as d3 from 'd3';
import { describeRing, scrapCountFor, scrapIndexOf } from './ringModel.js';

/** Small deterministic PRNG -- no Math.random, so a replay looks the same. */
export function mulberry32(seed) {
	let a = seed >>> 0;
	return function () {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Hash a ring id to an integer so each ring gets its own reproducible stream. */
function hashRingId(id) {
	let h = 2166136261;
	for (let i = 0; i < id.length; i++) {
		h = Math.imul(h ^ id.charCodeAt(i), 16777619);
	}
	return h >>> 0;
}

/** Calm easings only -- the brief asks for settling, not bouncing. */
const EASINGS = [d3.easeCubicOut, d3.easeQuadOut, d3.easeSinOut];

/**
 * Modes that override the per-scrap easing.
 *
 * Both of these are one continuous gesture rather than a piece of paper
 * settling, so a curve drawn per scrap would be fighting them.
 */
const FOLD_EASE = {
	// One push, one steady turn, no settle.
	evert: d3.easeSinInOut,
	// The inside of the fold owns the whole curve -- see unfurlFold.
	unfurl: d3.easeLinear
};

/**
 * Work out how each scrap of one ring is displaced.
 *
 * Returns one entry per scrap, not per instance: every mirrored copy of a
 * scrap reads the same entry, which is what keeps the symmetry intact.
 */
function planScraps(ring, opts) {
	const scrapCount = scrapCountFor(ring.repeatCount, opts.symmetryOrder);
	const rand = mulberry32(opts.seed ^ hashRingId(ring.id));
	const scraps = [];

	// Bulge and hinge are loose scraps of paper, so each draws its own curve
	// and settles in its own time. The other two modes are single continuous
	// gestures and take a fixed curve instead.
	const fixedEase = FOLD_EASE[opts.foldMode];

	for (let s = 0; s < scrapCount; s++) {
		// Every draw is taken in a fixed order and taken even when the current
		// mode ignores the result, so switching fold character never reshuffles
		// the stream. Comparing two modes has to compare the same pieces
		// travelling from the same places, or the comparison is about the seed.

		// Signed consistently by pullSign, so every scrap in a ring is
		// displaced the same way -- inward for an entrance, outward for an
		// exit. This once sent roughly one scrap in five the other way for
		// variety, which is exactly what stopped the motion having a
		// direction: a fifth of the pieces contradicting the other four
		// reads as general movement rather than a pull.
		// A multiple of the shape's own length, applied per instance once
		// the placement scale is known. See resolveShapes for why this is
		// not measured against the ring radius.
		const pullLengths = opts.pullSign * opts.pullIn * (0.45 + rand() * 0.55);
		// Signed, but never near zero. A ring with only one scrap -- the
		// twelve months under 12-fold symmetry -- has no averaging to save
		// it, so an unlucky draw would leave that whole ring nearly still
		// while the day ring moves. Flooring the magnitude keeps every ring
		// moving regardless of what the seed hands out.
		const swirl = (rand() < 0.5 ? -1 : 1) * opts.swirl * (0.4 + rand() * 0.6);
		const spin = (rand() < 0.5 ? -1 : 1) * opts.spin * (0.4 + rand() * 0.6);
		// How thin this scrap gets and how much it swells. Spread kept tight
		// at both ends: too wide and the slimmest scraps fall under a pixel
		// and vanish, too narrow and every scrap is identical, which is the
		// mechanical look the scraps exist to avoid.
		const widthFrom = opts.widthFrom * (0.85 + rand() * 0.35);
		const overshoot = opts.bulgeOvershoot * (0.7 + rand() * 0.6);
		// Capped short of 90: a panel exactly edge-on has zero width.
		const openAngle = Math.min(86, opts.hingeOpenAngle * (0.96 + rand() * 0.07));
		const openSign = rand() < 0.5 ? -1 : 1;
		const drawnEase = EASINGS[Math.floor(rand() * EASINGS.length)];
		// Spread across the stagger window, but shuffled so the reveal
		// doesn't sweep in scrap order.
		const delay = scrapCount > 1 ? rand() * opts.stagger : 0;

		scraps.push({
			pullLengths,
			swirl,
			spin,
			widthFrom,
			overshoot,
			openAngle,
			openSign,
			ease: fixedEase ?? drawnEase,
			delay
		});
	}
	return { scrapCount, scraps };
}

/**
 * Build the per-instance plan for every ring.
 *
 * `rings` is `[{ id, placements, pivotY }]`. `pivotY` is the shape's innermost
 * local Y -- the crease the fold opens from. `folded` and `resolved` name the
 * two ends of the journey; direction is the caller's business, not this
 * function's. Exported separately from playing it so timing and geometry can
 * be checked without a DOM.
 */
export function buildFoldPlan(rings, opts) {
	const plan = [];
	const everting = opts.foldMode === 'evert';

	// Measure every ring first: the sweep delay is relative to the widest one,
	// so no ring's timing can be decided until all of them are known.
	const described = rings
		.map(({ id, placements, pivotY = 0, shapeExtent = null }) => ({
			ring: describeRing(id, placements),
			placements,
			pivotY,
			// Falls back to a slice of the ring radius when the shape could not
			// be measured, so an unmeasurable ring still moves rather than
			// sitting perfectly still.
			shapeExtent: shapeExtent ?? describeRing(id, placements).radius * 0.12
		}))
		.filter((d) => d.ring.repeatCount > 0);

	const maxRadius = Math.max(1, ...described.map((d) => d.ring.radius));

	for (const { ring, placements, pivotY, shapeExtent } of described) {
		// Rings further out are delayed more, which is what makes the motion
		// read as travelling outward instead of happening everywhere at once.
		const sweepDelay = (ring.radius / maxRadius) * opts.radialSweep;

		// Which end of the shape the fold collapses toward, in the shape's own
		// coordinates. `pivotY` is its innermost point; one shape-length out
		// from there is its far tip, because -Y points away from the centre in
		// every placement's local frame.
		//
		// This is the difference between arriving and leaving. An entrance
		// grows out of the inner crease, so the shape unfolds away from the
		// hub. An exit anchored the same way shrinks *toward* the hub, and the
		// outward travel -- about a third of the shape's own length -- is not
		// nearly enough to cover that, so the whole ring reads as collapsing
		// inward however far out the placements are pushed.
		const foldPivotY =
			opts.foldPivot === 'outer' ? pivotY - shapeExtent : pivotY;

		const { scrapCount, scraps } = planScraps(ring, opts);
		const jitterRand = mulberry32(opts.seed ^ hashRingId(ring.id) ^ 0x9e3779b9);

		const instances = placements.map((p, i) => {
			const scrap = scraps[scrapIndexOf(i, scrapCount)];
			const jitterAmount = 1 + (jitterRand() * 2 - 1) * opts.jitter;
			// Which mirror sector this instance sits in. Adjacent sectors get
			// opposite handedness, and opposite phase if evertPhase is raised.
			const sector = Math.floor(i / scrapCount);

			// Displacement along the spoke, then swirled about the centre.
			// shapeExtent is in the shape's local units, so the placement's own
			// scale converts it into the mandala's coordinates.
			const r = Math.hypot(p.x, p.y) || 1;
			const offset = scrap.pullLengths * shapeExtent * p.scale * jitterAmount;
			const pulledX = p.x + (p.x / r) * offset;
			const pulledY = p.y + (p.y / r) * offset;

			const swirl = scrap.swirl * jitterAmount;
			const swirlRad = (swirl * Math.PI) / 180;
			const cos = Math.cos(swirlRad);
			const sin = Math.sin(swirlRad);

			return {
				folded: {
					x: pulledX * cos - pulledY * sin,
					y: pulledX * sin + pulledY * cos,
					// Swirl carries the piece's own orientation with it so it
					// stays tangent to its ring, then spin adds any tumble.
					rotation: p.rotation + swirl + scrap.spin * jitterAmount,
					scale: p.scale,
					// Flat against its own inner crease, and pinched to a line
					// down its own vertical centre.
					//
					// Everting and unfurling are the exceptions: both derive
					// their width from their own progress instead (see
					// evertFold and unfurlFold), so this field is not read on
					// either path. Held at rest rather than at the bulge's
					// sliver so the plan does not claim a starting width that
					// the mode never uses.
					foldRadial: 0,
					foldWidth: FOLD_EASE[opts.foldMode] ? 1 : scrap.widthFrom,
					grow: opts.growFrom
				},
				resolved: {
					x: p.x,
					y: p.y,
					rotation: p.rotation,
					scale: p.scale,
					foldRadial: 1,
					foldWidth: 1,
					grow: 1
				},
				overshoot: scrap.overshoot,
				openAngle: scrap.openAngle,
				// Adjacent sectors get opposite handedness, because a mirror
				// reflects rather than rotates -- walk around a real
				// kaleidoscope and each sector is the flip of its neighbour,
				// not a turned copy of it. It also cancels the pinwheel: a lean
				// repeated the same way around a ring reads as spin, while
				// alternating leans read as opening outward.
				skewSign: scrap.openSign * (sector % 2 === 0 ? 1 : -1),
				pivotY: foldPivotY,
				// Everting can hold every other sector back by a fixed beat,
				// which is how the real object's alternate tetrahedra behave.
				// Off by default: on twelve month petals it reads as six of
				// them lagging rather than as a mechanism turning, and a
				// mandala is under no obligation to be a linkage. See
				// evertPhase.
				delay:
					sweepDelay +
					scrap.delay * jitterAmount +
					(everting && sector % 2 === 1 ? opts.evertPhase : 0),
				duration: opts.duration,
				ease: scrap.ease
			};
		});

		plan.push({ ring, scrapCount, pivotY: foldPivotY, instances });
	}

	return { options: opts, rings: plan };
}

/**
 * Break a smooth 0..1 opening into a number of separate movements.
 *
 * One beat is a single continuous swing. Two or more turn it into a flap being
 * worked open by hand: swing, pause, swing again -- with each beat carrying its
 * own overshoot, so it lands, springs, and settles before the next one starts.
 *
 * The beats are even in *progress*, which does not make them even in what you
 * see: the projected width of a swinging panel goes as the cosine of its angle,
 * so the first beat opens far more width than the last. That is the honest
 * behaviour of a rotating plane and it is left alone -- what makes each beat
 * register is its bounce, not how much width it adds.
 *
 * `lean` alternates so consecutive beats shear opposite ways, and the shear
 * envelope has to be faded to nothing at each beat's end or the sign change
 * lands as a snap rather than a hand-off. See the hinge branch below.
 */
function beatOf(p, beats, hold, ease) {
	if (!(beats > 1)) return { progress: ease(p), within: p, index: 0, lean: 1 };

	const span = 1 / beats;
	const index = Math.min(beats - 1, Math.floor(p / span));
	const local = (p - index * span) / span;
	// Each beat moves for the first part of its span and holds for the rest.
	const moving = Math.min(1, local / Math.max(0.01, 1 - hold));

	return {
		progress: (index + ease(moving)) / beats,
		within: moving,
		index,
		lean: index % 2 === 0 ? 1 : -1
	};
}

/**
 * The swelling curve a fold opens on.
 *
 * easeBackOut carries past its target and settles back, so both the bulge and
 * every hinge beat land, spring and settle rather than arriving dead.
 */
function swellEaseFor(overshoot) {
	return overshoot > 0 ? d3.easeBackOut.overshoot(overshoot * 10) : d3.easeCubicOut;
}

/**
 * The hinge fold at one point in its swing, 0..1 of the swing's own clock.
 *
 * Shared by the interpolator and the primed t = 0 state, so the first frame
 * cannot disagree with the frame after it.
 */
function hingeFold(opts, swell, openAngle, ease) {
	const beat = beatOf(swell, opts.hingeBeats, opts.hingeBeatHold, ease);
	const radians = (openAngle * (1 - beat.progress) * Math.PI) / 180;
	// The projection of a rotating plane -- the real width of a panel at that
	// angle, which is what makes the mode read as turning rather than
	// stretching. Unchanged by beating: beats reshape the clock, not the panel.
	const foldWidth = Math.cos(radians);

	if (!(opts.hingeBeats > 1)) {
		// One continuous swing: the shear stands in for the near edge coming
		// toward the viewer, strongest edge-on and gone once the panel is flat.
		return { foldWidth, shearMagnitude: opts.hingeSkew * Math.sin(radians) };
	}

	// Beaten, the shear belongs to the beat rather than to the swing angle.
	// Keeping it on the angle makes every beat after the first invisible: by
	// then the panel is nearly flat, sin() is nearly nothing, and the lean the
	// beat is supposed to carry never arrives.
	//
	// So each beat leans in and releases on its own clock, reaching zero at
	// both of its ends. That is what lets consecutive beats lean opposite ways
	// -- one edge working out, then the other -- and hand over *through* zero
	// instead of snapping across the sign change.
	const lean = Math.sin(Math.PI * beat.within);
	// Later beats swing through less angle, so they lean less.
	const share = 1 - beat.index / opts.hingeBeats;

	return { foldWidth, shearMagnitude: opts.hingeSkew * lean * share * beat.lean };
}

/**
 * The unfurling fold at one point in its draw, 0..1.
 *
 * The shape is pulled out of its own inner crease -- the edge nearest the hub
 * -- and reaches its full length outward along its spoke. That extension is the
 * entire gesture. Bulge and hinge finish extending inside the first third and
 * spend the rest opening sideways; this one never opens sideways at all, so
 * there is nothing to stage and one clock covers it.
 *
 * Eased in *and* out, which is why planScraps hands this mode a linear clock
 * rather than a scrap's own curve. An out-only curve spends nine tenths of the
 * extension in the first third: the shape snaps to length and then hangs there,
 * which reads as an arrival rather than as being drawn out.
 */
function unfurlFold(opts, t) {
	return {
		foldRadial: d3.easeCubicInOut(t),
		// Full width the whole way. A strip drawn out of a slot is already as
		// wide as it will ever be -- only its length is arriving. The
		// broadening you do see is `grow`, running underneath on the same
		// clock, and it is the reason this does not read as a plain stretch.
		foldWidth: 1,
		shearMagnitude: 0,
		// The far end lags and straightens as the shape comes out: the curl
		// left in a sheet that has been rolled. Decays to nothing, so the shape
		// lands square. Alternated by sector like every other lean here, so it
		// cannot sum into a pinwheel.
		tilt: opts.unfurlCurl * (1 - t)
	};
}

/**
 * The everting fold at one point in its turn, 0..1.
 *
 * Shared by the interpolator and by the primed t = 0 state. Those two
 * disagreeing shows up as a jump on the very first frame, and nothing else in
 * the system would catch it -- so they read the same function rather than
 * computing the same thing twice.
 */
function evertFold(opts, t) {
	// One clock, no stages. A kaleidocycle has a single degree of freedom and
	// no rest position -- one push turns the whole ring together -- so there is
	// nothing here to split into "extend, then open". `t` arrives already eased.
	const radians = (opts.evertSweep * (1 - t) * Math.PI) / 180;
	// The axis is not the crease and not the centreline but somewhere between:
	// `evertHinge` of the way across. Turning about the crease alone
	// foreshortens without narrowing, and that reads as a panel swinging up on
	// a bottom hinge -- a garage door -- rather than as something turning in
	// space. Borrowing part of the centreline turn is what breaks that read.
	const across = radians * opts.evertHinge;

	return {
		// Signed, not absolute. Past 90 degrees the cosine goes negative and
		// the shape mirrors through its own crease: it lies inward over the
		// hub, showing the back of the panel, and then turns *through* edge-on
		// into place. Coming back through zero is the eversion -- in the real
		// object the face you are looking at folds away through the centre and
		// a different one arrives out of it.
		foldRadial: Math.cos(radians),
		// Never signed. `across` stays under 90 for any sane blend, so the
		// width narrows and recovers without flipping: two mirrorings in one
		// turn cancel each other and the eversion stops reading at all.
		foldWidth: Math.cos(across),
		// The hinge mode's own perspective fake, on the hinge mode's own
		// setting, at whatever strength the blend is running. Deliberately
		// shared rather than given its own option -- the point of the blend is
		// that this is the hinge showing through, so it should move when the
		// hinge is retuned.
		shearMagnitude: opts.hingeSkew * Math.sin(across),
		// Strongest edge-on, gone by the time the shape lies flat. The hinge
		// edges of a kaleidocycle are skew to one another, so a unit twists as
		// it tips rather than merely tipping.
		tilt: opts.evertTilt * Math.sin(radians)
	};
}

/**
 * Serialise one state to an SVG transform.
 *
 * At foldRadial 1, grow 1, foldWidth 1 and tilt 0 every extra term cancels and
 * the output is exactly what the static renderer writes -- which is what lets a
 * finished entrance leave the DOM byte-identical to a render with no motion.
 */
export function transformOf(state, pivotY, skewSign = 1) {
	let out =
		`translate(${state.x}, ${state.y}) rotate(${state.rotation}) scale(${state.scale})`;

	// Radial unfold and overall grow, both anchored on the inner crease. They
	// share a pivot, so they collapse into one scale rather than two: the grow
	// applies to both axes, the unfold only to the radial one, and the squash
	// rides along shortening the shape while it is at its widest.
	const grow = state.grow ?? 1;
	const radial = state.foldRadial * (state.squash ?? 1) * grow;
	// Lean of the shape about that same crease, in degrees, used only by the
	// everting mode. It sits after the scale in paint order so it acts on the
	// shape at full length -- put before it, the lean would shrink away exactly
	// when the turn is steepest and there is nothing left to see. Omitted
	// entirely at zero, so every other mode emits the string it always did.
	const tilt = state.tilt ?? 0;
	const lean = tilt !== 0 ? ` skewX(${skewSign * tilt})` : '';
	if (radial !== 1 || grow !== 1 || tilt !== 0) {
		out += ` translate(0, ${pivotY}) scale(${grow}, ${radial})${lean} translate(0, ${-pivotY})`;
	}

	// Opening out from the vertical centreline -- swelling or swinging,
	// depending on mode. No pivot needed, because local x = 0 already runs
	// down the middle of the shape.
	if (state.foldWidth !== 1) {
		const shear = skewSign * (state.shearMagnitude ?? 0);
		out += ` scale(${state.foldWidth}, 1) skewY(${shear})`;
	}

	return out;
}

/**
 * Interpolate folded -> resolved, component by component.
 *
 * Deliberately not d3.interpolateTransformSvg: that takes transform *strings*
 * and re-parses them through SVG DOM APIs, when the numbers are already right
 * here. Doing it directly is cheaper across 429 nodes, and it rotates the way
 * the value actually says to -- the string parser normalises angles and can
 * take the short way round.
 *
 * Always runs forward. An exit drives the same function from 1 back to 0,
 * which time-reverses it exactly -- the width closes before the shape collapses
 * radially, the mirror image of how it opened.
 */
export function interpolateState(folded, resolved, pivotY, opts) {
	const dx = resolved.x - folded.x;
	const dy = resolved.y - folded.y;
	const dRotation = resolved.rotation - folded.rotation;
	const dScale = resolved.scale - folded.scale;
	const dRadial = resolved.foldRadial - folded.foldRadial;
	const dWidth = resolved.foldWidth - folded.foldWidth;
	const dGrow = resolved.grow - folded.grow;

	const openDelay = Math.min(0.95, Math.max(0, opts.foldOpenDelay));
	const radialDone = Math.min(1, Math.max(0.01, opts.radialDone));
	const { skewSign, overshoot, bulgeSquash, bulgeSkew, openAngle } = opts;
	const hinged = opts.foldMode === 'hinge';
	const everting = opts.foldMode === 'evert';
	const unfurling = opts.foldMode === 'unfurl';

	const swellEase = swellEaseFor(overshoot);

	return (t) => {
		// Each fold gets its own clock. The radial extend finishes early,
		// leaving the shape standing at full length as a line down its own
		// centre; the widening then takes over. Two stages, not one gesture.
		const extend = Math.min(1, t / radialDone);
		const swell = Math.min(1, Math.max(0, (t - openDelay) / (1 - openDelay)));
		const eased = swellEase(swell);

		let foldRadial = folded.foldRadial + dRadial * extend;
		let foldWidth;
		let shearMagnitude;
		// Everting and unfurling lean about the inner crease; bulge and hinge
		// work off the vertical centreline, where a lean is what
		// shearMagnitude already expresses.
		let tilt = 0;

		if (unfurling) {
			// Drawn out from the inner crease to full length. See unfurlFold.
			({ foldRadial, foldWidth, shearMagnitude, tilt } = unfurlFold(opts, t));
		} else if (everting) {
			// The kaleidocycle reading: the shape turns mostly about its
			// *inner crease* -- the edge it shares with the hub -- where the
			// other two modes turn about its vertical centreline. So the thing
			// you watch is the shape foreshortening along its spoke rather
			// than closing sideways. See evertFold for the blend.
			({ foldRadial, foldWidth, shearMagnitude, tilt } = evertFold(opts, t));
		} else if (hinged) {
			// A panel swinging open about its centreline, in one movement or
			// in several. At hingeBeats 1 this is exactly the fold as it was
			// before beats existed. See hingeFold.
			({ foldWidth, shearMagnitude } = hingeFold(opts, swell, openAngle, swellEase));
		} else {
			foldWidth = folded.foldWidth + dWidth * eased;
			shearMagnitude = bulgeSkew * Math.max(0, 1 - foldWidth);
		}

		// Squash and stretch: give up a little length at peak width. Keyed off
		// how far past full width it currently is, so it is exactly 1 at rest.
		const past = Math.max(0, foldWidth - 1);
		const squash = 1 - bulgeSquash * (overshoot > 0 ? Math.min(1, past / overshoot) : 0);

		return transformOf(
			{
				x: folded.x + dx * t,
				y: folded.y + dy * t,
				rotation: folded.rotation + dRotation * t,
				scale: folded.scale + dScale * t,
				foldRadial,
				// Runs on the full clock, not the fold's, so it reads as a
				// steady undertone beneath the two fold stages.
				grow: folded.grow + dGrow * t,
				foldWidth,
				shearMagnitude,
				squash,
				tilt
			},
			pivotY,
			skewSign
		);
	};
}

/** True when the viewer has asked for less motion. */
export function prefersReducedMotion() {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

/**
 * Where a ring's shape folds from: its innermost local Y.
 *
 * Measured off a live node rather than hardcoded, so the fold keeps working if
 * a shape is redrawn or a new ring is added. getBBox on a <g> reports its
 * children's extent in the group's own coordinates, which is exactly the frame
 * the fold operates in.
 */
function measureShape(selection) {
	const node = selection && selection.node && selection.node();
	if (!node || typeof node.getBBox !== 'function') return null;
	try {
		const box = node.getBBox();
		if (!box || !Number.isFinite(box.y) || !Number.isFinite(box.height)) return null;
		return { pivotY: box.y + box.height, extent: box.height };
	} catch {
		return null;
	}
}

/**
 * Fill in each ring's fold pivot and shape extent from the DOM.
 *
 * `extent` is the shape's own length along the spoke, and travel is measured
 * in multiples of it rather than of the ring's radius. Scaling travel to the
 * radius looked reasonable but was badly lopsided in practice: the day ring
 * has the largest radius and the smallest shapes, so day segments moved about
 * three times their own length while month petals moved a quarter of theirs.
 * Same setting, wildly different read.
 */
export function resolveShapes(rings) {
	return rings.map((ring) => {
		const measured = ring.pivotY == null || ring.shapeExtent == null ? measureShape(ring.selection) : null;
		return {
			...ring,
			pivotY: ring.pivotY ?? measured?.pivotY ?? 0,
			shapeExtent: ring.shapeExtent ?? measured?.extent ?? null
		};
	});
}

/** The transform for a fully folded instance, used to prime an entrance. */
export function foldedTransform(inst, options, pivotY) {
	if (options.foldMode === 'unfurl') {
		return transformOf({ ...inst.folded, ...unfurlFold(options, 0) }, pivotY, inst.skewSign);
	}

	if (options.foldMode === 'evert') {
		return transformOf({ ...inst.folded, ...evertFold(options, 0) }, pivotY, inst.skewSign);
	}

	if (options.foldMode === 'hinge') {
		return transformOf(
			{
				...inst.folded,
				...hingeFold(options, 0, inst.openAngle, swellEaseFor(inst.overshoot))
			},
			pivotY,
			inst.skewSign
		);
	}

	return transformOf(
		{
			...inst.folded,
			shearMagnitude: options.bulgeSkew * Math.max(0, 1 - inst.folded.foldWidth)
		},
		pivotY,
		inst.skewSign
	);
}

/**
 * Play a plan against the DOM.
 *
 * `reverse` runs the same interpolator from 1 down to 0, so an exit is the
 * exact time-reversal of the entrance rather than a second implementation that
 * has to be kept in step with it.
 *
 * Returns a promise that settles when the last instance finishes, which is what
 * lets a loop chain entrance and exit without guessing at durations.
 */
export function runFold(rings, plan, { reverse = false } = {}) {
	let lastEnd = 0;

	rings.forEach(({ selection }, ringIndex) => {
		const planned = plan.rings[ringIndex];
		if (!planned || !selection) return;

		if (!reverse) {
			// Prime synchronously so nothing is painted resolved and then jumps.
			selection
				.attr('transform', (d, i) =>
					foldedTransform(planned.instances[i], plan.options, planned.pivotY)
				)
				.style('opacity', 0);
		}

		selection
			.transition()
			.delay((d, i) => planned.instances[i].delay)
			.duration((d, i) => planned.instances[i].duration)
			// Linear here, with each scrap's own curve applied inside the tween.
			// d3 takes one easing per transition, but easing varies per scrap.
			.ease(d3.easeLinear)
			.attrTween('transform', (d, i) => {
				const inst = planned.instances[i];
				// Spread the resolved options wholesale rather than naming the
				// ones needed. Hand-copying them meant a newly added option
				// could be read here but never passed, which silently produced
				// NaN in a transform -- and an invalid transform is dropped by
				// the browser rather than erroring, so the shape jumps to the
				// origin at full size instead of failing loudly.
				const interpolate = interpolateState(
					inst.folded,
					inst.resolved,
					planned.pivotY,
					{ ...plan.options, openAngle: inst.openAngle, overshoot: inst.overshoot, skewSign: inst.skewSign }
				);
				return reverse
					? (t) => interpolate(1 - inst.ease(t))
					: (t) => interpolate(inst.ease(t));
			})
			// Fade over a slice of the travel rather than all of it. Stretched
			// across the whole transition the fade becomes the thing you notice,
			// and the piece reads as appearing rather than arriving.
			.styleTween('opacity', () => {
				const fade = Math.max(0.01, plan.options.fadeIn);
				return reverse
					? (t) => String(Math.min(1, (1 - t) / fade))
					: (t) => String(Math.min(1, t / fade));
			});

		for (const inst of planned.instances) {
			lastEnd = Math.max(lastEnd, inst.delay + inst.duration);
		}
	});

	return new Promise((resolve) => setTimeout(resolve, lastEnd));
}
