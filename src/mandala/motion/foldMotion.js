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
 * Work out how each scrap of one ring is displaced.
 *
 * Returns one entry per scrap, not per instance: every mirrored copy of a
 * scrap reads the same entry, which is what keeps the symmetry intact.
 */
function planScraps(ring, opts) {
	const scrapCount = scrapCountFor(ring.repeatCount, opts.symmetryOrder);
	const rand = mulberry32(opts.seed ^ hashRingId(ring.id));
	const scraps = [];

	for (let s = 0; s < scrapCount; s++) {
		scraps.push({
			// Signed consistently by pullSign, so every scrap in a ring is
			// displaced the same way -- inward for an entrance, outward for an
			// exit. This once sent roughly one scrap in five the other way for
			// variety, which is exactly what stopped the motion having a
			// direction: a fifth of the pieces contradicting the other four
			// reads as general movement rather than a pull.
			// A multiple of the shape's own length, applied per instance once
			// the placement scale is known. See resolveShapes for why this is
			// not measured against the ring radius.
			pullLengths: opts.pullSign * opts.pullIn * (0.45 + rand() * 0.55),
			// Signed, but never near zero. A ring with only one scrap -- the
			// twelve months under 12-fold symmetry -- has no averaging to save
			// it, so an unlucky draw would leave that whole ring nearly still
			// while the day ring moves. Flooring the magnitude keeps every ring
			// moving regardless of what the seed hands out.
			swirl: (rand() < 0.5 ? -1 : 1) * opts.swirl * (0.4 + rand() * 0.6),
			spin: (rand() < 0.5 ? -1 : 1) * opts.spin * (0.4 + rand() * 0.6),
			// How thin this scrap gets and how much it swells. Spread kept tight
			// at both ends: too wide and the slimmest scraps fall under a pixel
			// and vanish, too narrow and every scrap is identical, which is the
			// mechanical look the scraps exist to avoid.
			widthFrom: opts.widthFrom * (0.85 + rand() * 0.35),
			overshoot: opts.bulgeOvershoot * (0.7 + rand() * 0.6),
			// Capped short of 90: a panel exactly edge-on has zero width.
			openAngle: Math.min(86, opts.hingeOpenAngle * (0.96 + rand() * 0.07)),
			openSign: rand() < 0.5 ? -1 : 1,
			ease: EASINGS[Math.floor(rand() * EASINGS.length)],
			// Spread across the stagger window, but shuffled so the reveal
			// doesn't sweep in scrap order.
			delay: scrapCount > 1 ? rand() * opts.stagger : 0
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

		const { scrapCount, scraps } = planScraps(ring, opts);
		const jitterRand = mulberry32(opts.seed ^ hashRingId(ring.id) ^ 0x9e3779b9);

		const instances = placements.map((p, i) => {
			const scrap = scraps[scrapIndexOf(i, scrapCount)];
			const jitterAmount = 1 + (jitterRand() * 2 - 1) * opts.jitter;

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
					foldRadial: 0,
					foldWidth: scrap.widthFrom,
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
				skewSign: scrap.openSign * (Math.floor(i / scrapCount) % 2 === 0 ? 1 : -1),
				pivotY,
				delay: sweepDelay + scrap.delay * jitterAmount,
				duration: opts.duration,
				ease: scrap.ease
			};
		});

		plan.push({ ring, scrapCount, pivotY, instances });
	}

	return { options: opts, rings: plan };
}

/**
 * Serialise one state to an SVG transform.
 *
 * At foldRadial 1, grow 1 and foldWidth 1 every extra term cancels and the
 * output is exactly what the static renderer writes -- which is what lets a
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
	if (radial !== 1 || grow !== 1) {
		out += ` translate(0, ${pivotY}) scale(${grow}, ${radial}) translate(0, ${-pivotY})`;
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
	const { skewSign, overshoot, bulgeSquash, bulgeSkew, hingeSkew, openAngle } = opts;
	const hinged = opts.foldMode === 'hinge';

	// easeBackOut carries past its target and settles back. Both modes use it,
	// so the hinge inherits the same bounce the bulge has -- it swings a touch
	// past flat before settling, rather than arriving dead.
	const swellEase = overshoot > 0 ? d3.easeBackOut.overshoot(overshoot * 10) : d3.easeCubicOut;

	return (t) => {
		// Each fold gets its own clock. The radial extend finishes early,
		// leaving the shape standing at full length as a line down its own
		// centre; the widening then takes over. Two stages, not one gesture.
		const extend = Math.min(1, t / radialDone);
		const swell = Math.min(1, Math.max(0, (t - openDelay) / (1 - openDelay)));
		const eased = swellEase(swell);

		let foldWidth;
		let shearMagnitude;

		if (hinged) {
			// Panel rotating about its centreline. Width is the projection of
			// that rotation, and the shear stands in for the near edge coming
			// toward the viewer.
			const angle = openAngle * (1 - eased);
			const radians = (angle * Math.PI) / 180;
			foldWidth = Math.cos(radians);
			shearMagnitude = hingeSkew * Math.sin(radians);
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
				foldRadial: folded.foldRadial + dRadial * extend,
				// Runs on the full clock, not the fold's, so it reads as a
				// steady undertone beneath the two fold stages.
				grow: folded.grow + dGrow * t,
				foldWidth,
				shearMagnitude,
				squash
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
	const hinged = options.foldMode === 'hinge';
	const radians = (inst.openAngle * Math.PI) / 180;

	return transformOf(
		{
			...inst.folded,
			foldWidth: hinged ? Math.cos(radians) : inst.folded.foldWidth,
			shearMagnitude: hinged
				? options.hingeSkew * Math.sin(radians)
				: options.bulgeSkew * Math.max(0, 1 - inst.folded.foldWidth)
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
