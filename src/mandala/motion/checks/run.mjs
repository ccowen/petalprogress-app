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
	for (const foldMode of ['bulge', 'hinge']) {
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
	report('transform validity', `${sampled} strings sampled across both modes`);
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

	let leavingOutward = 0;
	for (const inst2 of ring.instances) {
		if (Math.hypot(inst2.folded.x, inst2.folded.y) > Math.hypot(inst2.resolved.x, inst2.resolved.y)) {
			leavingOutward += 1;
		}
	}
	if (leavingOutward !== ring.instances.length) {
		fail(`exit: only ${leavingOutward}/${ring.instances.length} shapes leave outward`);
	}
	if (exit.options.duration >= ENTRANCE_DEFAULTS.duration) {
		fail('exit is not quicker than the entrance — a loop will feel like it stalls');
	}
	report('exit', `begins at rest, leaves outward, ${exit.options.duration}ms vs ${ENTRANCE_DEFAULTS.duration}ms in`);
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
