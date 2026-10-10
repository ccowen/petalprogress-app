// run.mjs — `npm run check:motion`
//
// Guards on the mandala entrance and exit.
//
// These are deliberately not tests of how the motion *feels*; that is a matter
// for eyes, and it changes every time the design does. What they cover is the
// class of breakage that is invisible until someone looks at the app: an
// invalid transform, a shape that never lands where the static renderer puts
// it, an exit that has quietly stopped mirroring the entrance.
//
// The reason they exist: adding an option that the interpolator read but which
// was never passed through produced NaN in every transform. Browsers discard an
// invalid transform rather than erroring, so all twelve month petals silently
// jumped to the centre of the mandala at full size. Nothing threw, nothing
// logged, and the checks of the day only sampled t=0 and t=1 -- the two points
// where the broken value happened not to be used.

import {
	installDom,
	loadFixture,
	fixtureRings,
	assertBoundsMatchShapes,
	parseTransform,
	applyTransform,
	radiusOf,
	PLAIN_TRANSFORM,
	captureTweens,
	PROJECT_ROOT
} from './harness.mjs';

installDom(); // before any d3 import

const d3 = await import(`${PROJECT_ROOT}/node_modules/d3/src/index.js`);
const { renderMandala } = await import('../../renderer/mandalaRenderer.js');
const { planEntrance, playEntrance, ENTRANCE_DEFAULTS } = await import('../entrance.js');
const { planExit } = await import('../exit.js');
const { interpolateState } = await import('../foldMotion.js');
const { startLoop } = await import('../loop.js');
const { FOLD_PRESETS } = await import('../presets.js');

const api = loadFixture();
const rings = fixtureRings(api);

const failures = [];
const fail = (msg) => failures.push(msg);
const results = [];
const report = (name, detail) => results.push(`  ${name}${detail ? ` — ${detail}` : ''}`);

/** Render once with no motion; the resting state everything is compared to. */
function renderStatic() {
	const host = document.createElement('div');
	document.body.appendChild(host);
	renderMandala(host, api, { entrance: false });
	return host;
}

/** Render statically, then attach live selections for the motion modules. */
function ringsWithSelections() {
	const host = renderStatic();
	const svg = host.querySelector('svg');
	const selectors = {
		days: 'g.day-placement',
		weeks: 'g.week-placement',
		months: 'g.month-placement'
	};
	return {
		host,
		rings: rings.map((ring) => ({
			...ring,
			selection: d3
				.selectAll([...svg.querySelectorAll(selectors[ring.id])])
				.data(ring.placements)
		}))
	};
}

// --- 0. The fixture must actually be renderable -------------------------------
// This one exists because the bundled fixture drifted from the API contract and
// silently rendered an empty mandala: the render loop found no steps, so there
// was nothing on screen and nothing to animate.
{
	const host = renderStatic();
	const svg = host.querySelector('svg');
	const counts = {
		days: svg.querySelectorAll('g.day-placement').length,
		weeks: svg.querySelectorAll('g.week-placement').length,
		months: svg.querySelectorAll('g.month-placement').length,
		computedDefs: svg.querySelectorAll('g.computed-def').length
	};
	if (!Array.isArray(api.renderOrder) || !api.renderOrder.length) {
		fail('fixture has no top-level renderOrder — the renderer will draw nothing');
	}
	for (const [ring, n] of Object.entries(counts)) {
		if (!n) fail(`fixture rendered zero ${ring}`);
	}
	report('fixture renders', Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', '));
}

// --- 1. The API's bounds match the shapes they were derived from -------------
report('group bounds', assertBoundsMatchShapes(api, fail));

// --- 1b. The response actually declares its animation groups -----------------
{
	const annotated = (api.renderOrder || []).filter((s) => s.animation);
	if (!api.animationGroups) fail('response carries no animationGroups');
	if (!annotated.length) fail('no renderOrder entry declares an animation group');
	for (const step of annotated) {
		if (!api.animationGroups?.[step.animation.group]) {
			fail(`${step.key} joins group "${step.animation.group}" which is not declared`);
		}
		if (!step.animation.instanceKey) fail(`${step.key} declares no instanceKey`);
	}
	report('animation contract', `${annotated.length} annotated step(s), ${Object.keys(api.animationGroups || {}).length} group(s)`);
}

// --- 2. No invalid transform anywhere in any tween ---------------------------
// Samples the interpolators d3 will really run, at points spanning both fold
// stages and the handoff between them.
{
	let sampled = 0;
	for (const foldMode of ['bulge', 'hinge', 'evert', 'unfurl']) {
		const { rings: live } = ringsWithSelections();
		const tweens = await captureTweens(d3, playEntrance, live, { foldMode });

		for (const tween of tweens) {
			if (typeof tween !== 'function') {
				fail(`${foldMode}: attrTween did not return a function`);
				break;
			}
			for (const t of [0, 0.05, 0.2, 0.34, 0.35, 0.36, 0.5, 0.7, 0.9, 0.99, 1]) {
				const out = tween(t);
				sampled += 1;
				if (typeof out !== 'string' || /NaN|Infinity|undefined|null/.test(out)) {
					fail(`${foldMode} t=${t}: invalid transform -> ${String(out).slice(0, 100)}`);
					break;
				}
			}
		}
	}
	report('transform validity', `${sampled} strings sampled across all four modes`);
}

// --- 3. Motion lands exactly where the static renderer puts things -----------
{
	const host = renderStatic();
	const day = host.querySelector('g.day-placement').getAttribute('transform');
	if (!PLAIN_TRANSFORM.test(day)) {
		fail(`resting transform carries leftover fold terms: ${day}`);
	}

	const { rings: live } = ringsWithSelections();
	const plan = planEntrance(live);
	for (const ring of plan.rings) {
		for (let i = 0; i < ring.instances.length; i++) {
			const { resolved } = ring.instances[i];
			const source = live.find((r) => r.id === ring.ring.id).placements[i];
			if (
				resolved.x !== source.x ||
				resolved.y !== source.y ||
				resolved.rotation !== source.rotation ||
				resolved.scale !== source.scale
			) {
				fail(`${ring.ring.id}[${i}] does not resolve to its placement`);
				break;
			}
		}
	}
	report('landing', 'plain transform, every instance resolves to its placement');
}

// --- 4. The fold opens outward from an anchored crease -----------------------
{
	const plan = planEntrance(rings, { pullIn: 0, swirl: 0, spin: 0, jitter: 0 });
	const ring = plan.rings.find((r) => r.ring.id === 'months');
	const inst = ring.instances[0];
	const interp = interpolateState(inst.folded, inst.resolved, inst.pivotY, {
		...plan.options,
		openAngle: inst.openAngle,
		overshoot: inst.overshoot,
		skewSign: inst.skewSign
	});

	const HEIGHT = 128.44;
	const start = parseTransform(interp(0));
	const end = parseTransform(interp(1));
	const creaseStart = applyTransform(start, 0, inst.pivotY);
	const creaseEnd = applyTransform(end, 0, inst.pivotY);
	const drift = Math.hypot(creaseStart[0] - creaseEnd[0], creaseStart[1] - creaseEnd[1]);

	const tipStart = radiusOf(applyTransform(start, 0, inst.pivotY - HEIGHT));
	const tipEnd = radiusOf(applyTransform(end, 0, inst.pivotY - HEIGHT));

	if (drift > 1e-6) fail(`fold crease drifts ${drift.toFixed(4)}u — it should be anchored`);
	if (tipEnd <= tipStart) fail('shape does not open outward from its crease');
	report('fold anchor', `crease drift ${drift.toFixed(6)}u, tip ${tipStart.toFixed(0)}u -> ${tipEnd.toFixed(0)}u`);
}

// --- 5. Motion is radial: no net rotation, no tangential drift ---------------
{
	const plan = planEntrance(rings);
	for (const ring of plan.rings) {
		let tangential = 0;
		let maxRotation = 0;
		for (const inst of ring.instances) {
			const r = Math.hypot(inst.resolved.x, inst.resolved.y) || 1;
			const ux = inst.resolved.x / r;
			const uy = inst.resolved.y / r;
			const dx = inst.resolved.x - inst.folded.x;
			const dy = inst.resolved.y - inst.folded.y;
			const radial = dx * ux + dy * uy;
			const total = Math.hypot(dx, dy);
			// sqrt(total^2 - radial^2) cancels badly when the two are equal, so
			// float noise lands near 1e-8. The threshold is physical: 1e-4 units
			// is 2e-4 px, far below anything renderable.
			tangential += Math.sqrt(Math.max(0, total * total - radial * radial));
			maxRotation = Math.max(maxRotation, Math.abs(inst.resolved.rotation - inst.folded.rotation));
		}
		const avg = tangential / ring.instances.length;
		if (avg > 1e-4) fail(`${ring.ring.id}: ${avg.toFixed(5)}u tangential drift — motion should be radial`);
		if (maxRotation > 1e-9) fail(`${ring.ring.id}: rotates up to ${maxRotation.toFixed(2)}°`);
	}
	report('radial purity', 'no rotation, no tangential drift on any ring');
}

// --- 6. Travel is proportional to each shape's own length --------------------
// Scaling travel to the ring radius instead made day segments move three times
// their own length while month petals moved a quarter of theirs.
{
	const px = api.geometry.dimensions.width / api.geometry.viewBox.width;
	const plan = planEntrance(rings);
	const ratios = [];
	const detail = [];

	for (const ring of plan.rings) {
		const source = rings.find((r) => r.id === ring.ring.id);
		let travel = 0;
		let startedInside = 0;
		for (const inst of ring.instances) {
			const from = Math.hypot(inst.folded.x, inst.folded.y);
			const to = Math.hypot(inst.resolved.x, inst.resolved.y);
			travel += to - from;
			if (from < to) startedInside += 1;
		}
		travel /= ring.instances.length;
		if (startedInside !== ring.instances.length) {
			fail(`${ring.ring.id}: only ${startedInside}/${ring.instances.length} start inside their radius`);
		}
		const lengthPx = source.shapeExtent * ring.instances[0].resolved.scale * px;
		const ratio = (travel * px) / lengthPx;
		ratios.push(ratio);
		detail.push(`${ring.ring.id} ${ratio.toFixed(2)}x`);
	}

	// Not exact: each scrap draws its own pull, and a single-scrap ring (the 12
	// months) has no averaging, so its mean is one draw rather than thirty.
	const spread = Math.max(...ratios) / Math.min(...ratios);
	if (spread > 1.4) fail(`travel/length ratio varies ${spread.toFixed(2)}x across rings`);
	report('travel scaling', `${detail.join(', ')} (spread ${spread.toFixed(2)}x)`);
}

// --- 7. Rings begin innermost first ------------------------------------------
{
	const plan = planEntrance(rings);
	const order = plan.rings
		.map((r) => ({ id: r.ring.id, radius: r.ring.radius, start: Math.min(...r.instances.map((i) => i.delay)) }))
		.sort((a, b) => a.radius - b.radius);

	for (let i = 1; i < order.length; i++) {
		if (order[i].start <= order[i - 1].start) {
			fail(`${order[i].id} (r=${order[i].radius.toFixed(0)}) starts before/with ${order[i - 1].id}`);
		}
	}
	report('outward sweep', order.map((o) => `${o.id} ${o.start.toFixed(0)}ms`).join(' -> '));
}

// --- 8. Two-stage timing: width holds while the shape extends ----------------
{
	const plan = planEntrance(rings, { foldMode: 'bulge' });
	const ring = plan.rings.find((r) => r.ring.id === 'months');
	const inst = ring.instances[0];
	const interp = interpolateState(inst.folded, inst.resolved, inst.pivotY, {
		...plan.options,
		openAngle: inst.openAngle,
		overshoot: inst.overshoot,
		skewSign: inst.skewSign
	});
	const widthAt = (t) => {
		const m = /scale\(([-\d.e]+), 1\)/.exec(interp(t));
		return m ? Number(m[1]) : 1;
	};
	const atZero = widthAt(0);
	const atDelay = widthAt(plan.options.foldOpenDelay - 0.01);
	if (Math.abs(atZero - atDelay) > 1e-9) fail('width moves before foldOpenDelay — the two stages have merged');
	if (atZero > 0.12) fail(`shape starts ${(atZero * 100).toFixed(0)}% wide — it should be a sliver`);
	report('two-stage fold', `holds at ${(atZero * 100).toFixed(1)}% until t=${plan.options.foldOpenDelay}`);
}

// --- 8b. 'evert' turns about the crease, not about the centreline ------------
// The mode only earns its place if it is structurally different from the other
// two, and it has two ways of quietly collapsing back into one of them. Turn
// the crease component off and it is the hinge; turn the centreline component
// up and it is also the hinge. So: the shape must pass through edge-on rather
// than stopping at it, and the crease half of the turn must stay the dominant
// half.
{
	const plan = planEntrance(rings, {
		foldMode: 'evert',
		pullIn: 0,
		swirl: 0,
		spin: 0,
		jitter: 0
	});
	const ring = plan.rings.find((r) => r.ring.id === 'months');
	const inst = ring.instances[0];
	const interp = interpolateState(inst.folded, inst.resolved, inst.pivotY, {
		...plan.options,
		openAngle: inst.openAngle,
		overshoot: inst.overshoot,
		skewSign: inst.skewSign
	});

	// Signed radial scale: negative at the start (mirrored through the crease,
	// lying inward over the hub) and positive at the end. Passing through zero
	// is the eversion; starting at zero would be the hinge with a moved axis.
	const radialAt = (t) => {
		const m = /scale\([-\d.e]+, ([-\d.e]+)\)/.exec(interp(t));
		return m ? Number(m[1]) : 1;
	};
	if (!(radialAt(0) < 0)) fail('evert does not start mirrored through its crease — nothing everts');
	if (!(radialAt(1) > 0)) fail('evert does not finish the right way up');

	// The width block is the one that emits skewY, so matching on it can never
	// pick up the radial scale by accident.
	const widthAt = (t) => {
		const m = /scale\(([-\d.e]+), 1\) skewY\(/.exec(interp(t));
		return m ? Number(m[1]) : 1;
	};
	if (!(widthAt(0) < 1)) fail('evert never narrows — the hinge blend is doing nothing');
	// One mirroring per turn. A width that also went negative would flip the
	// shape a second time, and the two cancel: the eversion stops reading.
	for (const t of [0, 0.25, 0.5, 0.75, 1]) {
		if (widthAt(t) <= 0) {
			fail(`evert t=${t}: width flips sign — two mirrorings in one turn cancel out`);
			break;
		}
	}

	// The crease has to lead. Compared against a real hinge plan rather than
	// against a recomputed angle, so the check cannot agree with itself while
	// the shipped code drifts.
	const hingePlan = planEntrance(rings, { foldMode: 'hinge', pullIn: 0, jitter: 0 });
	const hingeRing = hingePlan.rings.find((r) => r.ring.id === 'months');
	const hingeInst = hingeRing.instances[0];
	const hingeInterp = interpolateState(hingeInst.folded, hingeInst.resolved, hingeInst.pivotY, {
		...hingePlan.options,
		openAngle: hingeInst.openAngle,
		overshoot: hingeInst.overshoot,
		skewSign: hingeInst.skewSign
	});
	const hingeWidth = Number(/scale\(([-\d.e]+), 1\) skewY\(/.exec(hingeInterp(0))[1]);
	if (!(widthAt(0) > hingeWidth * 2)) {
		fail(
			`evert starts ${widthAt(0).toFixed(2)} wide against hinge's ${hingeWidth.toFixed(2)} — ` +
				'the centreline turn has taken over from the crease'
		);
	}

	// Same anchor as every other mode: the crease it turns about cannot move.
	const start = parseTransform(interp(0));
	const end = parseTransform(interp(1));
	const a = applyTransform(start, 0, inst.pivotY);
	const b = applyTransform(end, 0, inst.pivotY);
	const drift = Math.hypot(a[0] - b[0], a[1] - b[1]);
	if (drift > 1e-6) fail(`evert crease drifts ${drift.toFixed(4)}u — it should be anchored`);

	// And it still lands on exactly what the static renderer writes, lean and
	// all: a leftover skewX at rest would be invisible in a screenshot and
	// wrong in every export.
	if (!PLAIN_TRANSFORM.test(interp(1))) fail(`evert does not land plain: ${interp(1)}`);

	// Lockstep. One push turns the whole ring, so the twelve month petals have
	// to start together -- this is what the alternating phase used to break,
	// and what evertPhase turns back on if it is ever wanted.
	const full = planEntrance(rings, { foldMode: 'evert' });
	const months = full.rings.find((r) => r.ring.id === 'months');
	const spread = Math.max(...months.instances.map((i) => i.delay)) -
		Math.min(...months.instances.map((i) => i.delay));
	if (spread > 1e-9) fail(`evert: the twelve months start ${spread.toFixed(0)}ms apart — not lockstep`);
	if (new Set(months.instances.map((i) => i.ease)).size !== 1) {
		fail('evert: month petals settle on different curves — a mechanism turns as one');
	}

	report(
		'evert',
		`radial ${radialAt(0).toFixed(2)} -> ${radialAt(1).toFixed(2)}, ` +
			`width ${widthAt(0).toFixed(2)} vs hinge ${hingeWidth.toFixed(2)}, ` +
			`months lockstep, crease drift ${drift.toFixed(6)}u`
	);
}

// --- 8c. 'unfurl' spends its whole clock extending ---------------------------
// The mode is one sustained draw outward from the inner crease, and it has one
// way of collapsing back into bulge: letting the extension finish early, so the
// shape snaps to length and hangs there for the rest of the transition. It is
// checked against a real bulge plan rather than a recomputed curve.
{
	const opts = { pullIn: 0, swirl: 0, spin: 0, jitter: 0 };
	const interpFor = (foldMode) => {
		const plan = planEntrance(rings, { ...opts, foldMode });
		const ring = plan.rings.find((r) => r.ring.id === 'months');
		const inst = ring.instances[0];
		return interpolateState(inst.folded, inst.resolved, inst.pivotY, {
			...plan.options,
			openAngle: inst.openAngle,
			overshoot: inst.overshoot,
			skewSign: inst.skewSign
		});
	};
	const radialOf = (interp) => (t) => {
		const m = /scale\([-\d.e]+, ([-\d.e]+)\)/.exec(interp(t));
		return m ? Number(m[1]) : 1;
	};

	const unfurl = interpFor('unfurl');
	const unfurlRadial = radialOf(unfurl);
	const bulgeRadial = radialOf(interpFor('bulge'));

	// Still visibly short at the halfway point, where bulge is long since done.
	if (!(unfurlRadial(0.5) < bulgeRadial(0.5) * 0.8)) {
		fail(
			`unfurl is ${unfurlRadial(0.5).toFixed(2)} long at t=0.5 against bulge's ` +
				`${bulgeRadial(0.5).toFixed(2)} — the draw has collapsed into a snap`
		);
	}
	// And still growing late, which is the other half of the same claim.
	if (!(unfurlRadial(0.85) > unfurlRadial(0.5))) {
		fail('unfurl stops extending before the end — nothing is being drawn out');
	}

	// Width never moves. The width block is the one that emits skewY, so its
	// absence at every sample is proof the shape only ever lengthens.
	for (const t of [0, 0.25, 0.5, 0.75, 1]) {
		if (/skewY\(/.test(unfurl(t))) {
			fail(`unfurl t=${t}: opens sideways — it should only extend`);
			break;
		}
	}

	// Same crease anchor, and the same plain landing, as every other mode.
	const pivotY = planEntrance(rings, { ...opts, foldMode: 'unfurl' })
		.rings.find((r) => r.ring.id === 'months').instances[0].pivotY;
	const creaseStart = applyTransform(parseTransform(unfurl(0)), 0, pivotY);
	const creaseEnd = applyTransform(parseTransform(unfurl(1)), 0, pivotY);
	const drift = Math.hypot(creaseStart[0] - creaseEnd[0], creaseStart[1] - creaseEnd[1]);
	if (drift > 1e-6) fail(`unfurl crease drifts ${drift.toFixed(4)}u — it should be anchored`);
	if (!PLAIN_TRANSFORM.test(unfurl(1))) fail(`unfurl does not land plain: ${unfurl(1)}`);

	report(
		'unfurl',
		`length ${unfurlRadial(0.5).toFixed(2)} at t=0.5 vs bulge ${bulgeRadial(0.5).toFixed(2)}, ` +
			`still growing to ${unfurlRadial(0.85).toFixed(2)}, crease drift ${drift.toFixed(6)}u`
	);
}

// --- 8d. Beaten hinge: the swing pauses, and one beat still means one swing --
// Two failure modes, opposite to each other. The pause can vanish, leaving one
// uneven swing that nobody reads as two movements; or the beating can leak into
// hingeBeats 1, quietly changing the fold that everything else was tuned
// against. Both are checked off the emitted width, not off a recomputed curve.
{
	const widthSeriesFor = (hingeBeats) => {
		const plan = planEntrance(rings, { foldMode: 'hinge', hingeBeats, jitter: 0 });
		const ring = plan.rings.find((r) => r.ring.id === 'months');
		const inst = ring.instances[0];
		const interp = interpolateState(inst.folded, inst.resolved, inst.pivotY, {
			...plan.options,
			openAngle: inst.openAngle,
			overshoot: inst.overshoot,
			skewSign: inst.skewSign
		});
		const series = [];
		// The swing only runs after foldOpenDelay; before that there is nothing
		// to pause, and a plateau there would be the wrong plateau.
		for (let k = 0; k <= 200; k++) {
			const t = plan.options.foldOpenDelay + (k / 200) * (1 - plan.options.foldOpenDelay);
			const m = /scale\(([-\d.e]+), 1\) skewY\(([-\d.e]+)\)/.exec(interp(t));
			series.push({ t, width: m ? Number(m[1]) : 1, shear: m ? Number(m[2]) : 0 });
		}
		return series;
	};

	// A sample counts as still when the width is barely moving between steps.
	//
	// Only counted while the panel is still visibly short of flat. Every swing
	// finishes by overshooting a little and settling, and that settled tail is
	// a long stretch of near-identical widths -- a plateau, but not a pause,
	// and counting it would let a beatless swing pass as beaten.
	const stillRun = (series) => {
		let best = 0;
		let run = 0;
		for (let k = 1; k < series.length - 1; k++) {
			const moving = Math.abs(series[k].width - series[k - 1].width) >= 0.001;
			if (!moving && series[k].width < 0.97) run += 1;
			else run = 0;
			best = Math.max(best, run);
		}
		return best;
	};

	const beaten = widthSeriesFor(2);
	const single = widthSeriesFor(1);

	// Roughly 28% of one of two beats is ~14% of the swing, so ~28 of 200
	// samples. Half that is a generous floor and still far above the noise a
	// continuous swing produces.
	if (stillRun(beaten) < 14) {
		fail(`hingeBeats 2: longest still stretch is ${stillRun(beaten)} samples — the pause has closed up`);
	}
	if (stillRun(single) >= 14) {
		fail(`hingeBeats 1: pauses for ${stillRun(single)} samples — beating has leaked into the single swing`);
	}

	// Consecutive beats lean opposite ways -- as close as one transform on the
	// whole placement gets to a second corner taking over from the first -- and
	// the hand-off passes through zero rather than snapping across it.
	//
	// Taken as each half's strongest lean rather than its midpoint value: a
	// beat's swing is over well before its span is, so the middle of a beat is
	// already into its hold.
	const peakLean = (from, to) => {
		let peak = 0;
		for (let k = Math.floor(from * (beaten.length - 1)); k <= Math.ceil(to * (beaten.length - 1)); k++) {
			if (Math.abs(beaten[k].shear) > Math.abs(peak)) peak = beaten[k].shear;
		}
		return peak;
	};
	const first = peakLean(0, 0.5);
	const second = peakLean(0.5, 1);
	if (!(first * second < 0)) {
		fail(`beaten hinge: both beats lean the same way (${first.toFixed(1)}°, ${second.toFixed(1)}°)`);
	}
	let jump = 0;
	for (let k = 1; k < beaten.length; k++) {
		jump = Math.max(jump, Math.abs(beaten[k].shear - beaten[k - 1].shear));
	}
	if (jump > 2) fail(`beaten hinge: shear jumps ${jump.toFixed(1)}° between frames — the lean snaps`);

	// And it still lands where the static renderer puts it.
	if (Math.abs(beaten[beaten.length - 1].width - 1) > 1e-9) {
		fail(`beaten hinge does not finish at full width: ${beaten[beaten.length - 1].width}`);
	}

	report(
		'hinge beats',
		`2 beats hold for ${stillRun(beaten)}/200 samples and lean ` +
			`${first.toFixed(1)}° then ${second.toFixed(1)}°, ` +
			`hand-off ${jump.toFixed(1)}°/frame, 1 beat unbeaten`
	);
}

// --- 8e. Kept presets do not move when the baseline is retuned ---------------
// A preset written as a diff against ENTRANCE_DEFAULTS is not a preserved
// variation: retune the baseline and the thing that was chosen quietly becomes
// something else while keeping its name. The kept presets carry their own copy
// of everything that decides their character, and this is what proves it.
//
// Not a snapshot of expected values -- that would only restate the constant.
// Instead every option a kept preset ought to pin is nudged to something
// obviously different, the preset is spread on top, and the emitted transforms
// have to come out identical. Anything the preset forgot to pin shows through.
{
	const NUDGE = {
		symmetryOrder: 4,
		stagger: 900,
		radialSweep: 900,
		foldMode: 'bulge',
		widthFrom: 0.4,
		bulgeOvershoot: 0.5,
		bulgeSquash: 0.4,
		bulgeSkew: 20,
		hingeOpenAngle: 40,
		hingeSkew: 3,
		hingeBeats: 7,
		hingeBeatHold: 0.6,
		growFrom: 0.95,
		radialDone: 0.7,
		foldOpenDelay: 0.7,
		pullIn: 2.5,
		pullSign: 1,
		foldPivot: 'outer',
		swirl: 25,
		spin: 25,
		fadeIn: 0.6,
		jitter: 0.6,
		seed: 1
		// `duration` is left out on purpose: a kept preset does not pin pace,
		// because the loop hands one options object to both halves and pinning
		// it would tie the exit to the entrance's length. See presets.js.
	};

	const signature = (options) => {
		const plan = planEntrance(rings, options);
		return plan.rings
			.map((ring) =>
				ring.instances
					.map((inst) => {
						const interp = interpolateState(inst.folded, inst.resolved, inst.pivotY, {
							...plan.options,
							openAngle: inst.openAngle,
							overshoot: inst.overshoot,
							skewSign: inst.skewSign
						});
						return [0, 0.25, 0.5, 0.75, 1]
							.map((t) => interp(t))
							.concat(String(inst.delay))
							.join('|');
					})
					.join(';')
			)
			.join('\n');
	};

	const kept = FOLD_PRESETS.filter((preset) => preset.kept);
	if (!kept.length) fail('no preset is marked kept — the pinning has been dropped');

	for (const preset of kept) {
		if (signature(preset.options) !== signature({ ...NUDGE, ...preset.options })) {
			fail(
				`preset "${preset.id}" moves when the baseline is retuned — ` +
					'it is still reading a default it should be pinning'
			);
		}
	}

	// The pin is only worth having if the two kept presets are still different
	// from each other. Both pinning everything *including* hingeBeats would
	// preserve two identical variations very reliably.
	if (kept.length > 1 && signature(kept[0].options) === signature(kept[1].options)) {
		fail(`kept presets "${kept[0].id}" and "${kept[1].id}" are the same fold`);
	}

	report('kept presets', `${kept.map((k) => k.id).join(', ')} — pinned against baseline retuning`);
}

// --- 9. Mirrored copies move identically, and plans are deterministic --------
{
	const plan = planEntrance(rings, { jitter: 0 });
	for (const ring of plan.rings) {
		for (let s = 0; s < ring.scrapCount; s++) {
			const copies = ring.instances.filter((_, i) => i % ring.scrapCount === s);
			const widths = new Set(copies.map((c) => c.folded.foldWidth.toFixed(9)));
			if (widths.size > 1) {
				fail(`${ring.ring.id} scrap ${s}: mirrored copies differ`);
				break;
			}
		}
	}

	const signature = (p) =>
		JSON.stringify(p.rings.map((r) => r.instances.map((i) => [i.folded.x, i.delay])));
	if (signature(planEntrance(rings)) !== signature(planEntrance(rings))) {
		fail('plan is not deterministic between calls');
	}
	report('symmetry', 'mirrored copies identical, plan deterministic');
}

// --- 10. The exit mirrors the entrance ---------------------------------------
{
	const host = renderStatic();
	const staticMonth = host.querySelector('g.month-placement').getAttribute('transform');

	const exit = planExit(rings);
	const ring = exit.rings.find((r) => r.ring.id === 'months');
	const inst = ring.instances[0];
	const interp = interpolateState(inst.folded, inst.resolved, inst.pivotY, {
		...exit.options,
		openAngle: inst.openAngle,
		overshoot: inst.overshoot,
		skewSign: inst.skewSign
	});

	// An exit is the same interpolator driven backwards, so t=1 is its start.
	if (interp(1) !== staticMonth) {
		fail(`exit does not begin at the resting state\n      got ${interp(1)}\n      expected ${staticMonth}`);
	}

	// Where the shape ends up is decided by the fold, not by travel, so the two
	// have to be checked separately.
	//
	// First: it does not travel. Every placement stays exactly where it rests,
	// so nothing is flung out past its own footprint into empty space.
	let drifting = 0;
	for (const inst2 of ring.instances) {
		const moved = Math.hypot(
			inst2.folded.x - inst2.resolved.x,
			inst2.folded.y - inst2.resolved.y
		);
		if (moved > 1e-9) drifting += 1;
	}
	if (drifting) {
		fail(`exit: ${drifting}/${ring.instances.length} placements travel — the outward exit should not`);
	}

	// Second: it still reads as leaving outward, because the fold collapses the
	// shape toward its far tip. This is the check that tells the two apart --
	// an exit anchored on the inner crease visibly implodes toward the hub no
	// matter which way its placements drift, because a shape shrinking to
	// nothing covers its own length while travel covers a fraction of that.
	// Every placement is centred on its own origin, so local (0, 0) is the
	// middle of the shape and local pivotY is now its outer tip.
	const middleAt = (t) => radiusOf(applyTransform(parseTransform(interp(t)), 0, 0));
	const rest = middleAt(1);
	const gone = middleAt(0);
	if (!(gone > rest)) {
		fail(
			`exit: petals end at radius ${gone.toFixed(0)} having started at ${rest.toFixed(0)} — ` +
				'they collapse toward the hub, not the rim'
		);
	}

	// And it stops there. The tip at rest is the furthest out any part of the
	// petal ever reaches; collapsing onto it is withdrawal, going past it is
	// the piece being thrown clear.
	const tipAtRest = radiusOf(applyTransform(parseTransform(interp(1)), 0, inst.pivotY));
	if (gone > tipAtRest + 1e-6) {
		fail(
			`exit: petals reach ${gone.toFixed(0)}u, past their own outer edge at ${tipAtRest.toFixed(0)}u`
		);
	}
	if (exit.options.duration >= ENTRANCE_DEFAULTS.duration) {
		fail('exit is not quicker than the entrance — a loop will feel like it stalls');
	}
	report(
		'exit',
		`begins at rest, no drift, middle ${rest.toFixed(0)}u -> ${gone.toFixed(0)}u onto its own tip, ` +
			`${exit.options.duration}ms vs ${ENTRANCE_DEFAULTS.duration}ms in`
	);
}

// --- 11. The loop can be stopped ---------------------------------------------
{
	const detached = rings.map((r) => ({ ...r, selection: null }));
	const handle = startLoop(detached, { hold: 5, pause: 5 });
	if (!handle.running) fail('loop did not start');
	handle.stop();
	if (handle.running) fail('loop did not stop');
	await new Promise((r) => setTimeout(r, 60));
	report('loop', 'starts and stops cleanly');
}

// --- Report -------------------------------------------------------------------
console.log('\nmotion checks\n');
for (const line of results) console.log(line);

if (failures.length) {
	console.error(`\n✗ ${failures.length} failure(s):\n`);
	for (const f of failures) console.error(`  - ${f}`);
	process.exit(1);
}
console.log('\n✓ all motion checks passed\n');
