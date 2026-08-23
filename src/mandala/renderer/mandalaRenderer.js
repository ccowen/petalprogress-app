// mandalaRenderer.js
// D3-based renderer that consumes geometry JSON from the API
// and renders SVG using the defs/use pattern.
//
// Asset shapes (day, week, month petal, figures) loaded from shapeDefs.js.
// Computed shapes (boolean ops like the day-ring annulus) come from the API's computedDefs.
// Render order driven by the API's renderOrder array.
// Theme colors applied via CSS custom properties.
// Completion states (cssClass) merged directly onto placements by the API.

import * as d3 from 'd3';
import { shapeDefs, figureShapeMap } from './shapeDefs.js';
import { playEntrance } from '../motion/entrance.js';
import { playExit } from '../motion/exit.js';
import { startLoop } from '../motion/loop.js';

/**
 * Render a mandala into a container element from API response data.
 *
 * Rendering is static and synchronous. Motion is a separate pass over the
 * finished rings (see ../motion/entrance.js), which keeps this file about
 * geometry to DOM and lets the entrance be replayed or skipped without
 * re-rendering anything.
 *
 * options.entrance -- false to render with no motion at all, or an object of
 * overrides passed through to the entrance generator.
 */
export function renderMandala(container, apiResponse, options = {}) {
	const { entrance = {}, previewLabels = false } = options;
	const { theme, geometry, computedDefs, completions, animationGroups } = apiResponse;
	const { viewBox, rings, background } = geometry;
	const renderOrder = apiResponse.renderOrder || [];

	// Build completion lookup maps
	const dayMap = new Map();
	const weekMap = new Map();
	const monthMap = new Map();

	if (completions) {
		for (const d of completions.days) dayMap.set(d.dayNumber, d);
		for (const w of completions.weeks) weekMap.set(w.weekNumber, w);
		for (const m of completions.months) monthMap.set(m.month, m);
	}

	// Create SVG
	const svg = d3.select(container)
		.append('svg')
		.attr('id', 'calendar-svg')
		.attr('width', geometry.dimensions.width)
		.attr('height', geometry.dimensions.height)
		.attr('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`)
		.attr('xmlns', 'http://www.w3.org/2000/svg');

	// Apply theme classes
	if (geometry.theme) {
		svg.classed(geometry.theme.className, true);
		svg.classed(geometry.theme.petalClassName, true);
	}

	// Apply theme CSS custom properties
	if (theme && theme.variables) {
		applyThemeVariables(svg.node(), theme.variables);
	}

	// Build <defs> with asset shapes and gradients
	const defs = svg.append('defs');
	buildDefs(defs, geometry.gradients);

	const outerRadius = background ? background.circle.radius : (rings.outer ? rings.outer.radius : 180);
	const bgRadius = Math.max(viewBox.width, viewBox.height) / 2;

	// Rings collected as they render, for the motion pass to animate afterwards.
	const motionRings = [];

	// Animation groups live here so a group can be created by whichever member
	// comes first in render order, and reused by the rest.
	const registry = createGroupRegistry(svg);

	/**
	 * Distribute a computed def across its group, and register the group for the
	 * motion pass the first time it is seen.
	 *
	 * Registering once matters: a group can be fed by several render steps -- the
	 * inside and outside halves of the inner week petals arrive separately -- and
	 * animating the same instances twice would have them fighting each other.
	 */
	function addGroupedFragments(step, key) {
		const groupId = step.animation.group;
		const result = renderGroupedFragments(
			svg, registry, step, computedDefs?.[key], animationGroups, geometry
		);
		if (!result) return;
		if (motionRings.some(r => r.id === groupId)) return;

		motionRings.push({ ...motionMetaFor(step, groupId, animationGroups), ...result });
	}

	// Held so a running loop can be stopped before anything else touches the
	// rings -- a loop left running against a destroyed mandala keeps scheduling
	// transitions against detached nodes.
	let loop = null;

	// --- Render in API-specified order ---
	// This order is paint order: SVG has no z-index, so document order is
	// stacking order. Cutouts and background rings must be appended before
	// the shapes they sit behind.
	for (const step of renderOrder) {
		const key = step.key;

		switch (key) {
			case 'background-rect': {
				svg.append('circle').attr('id', 'mandala-background').attr('r', bgRadius);
				break;
			}

			case 'week-stroke-ellipses': {
				// Only for blank-outline theme
				if (rings.inner && rings.inner.background && rings.inner.background.innerPetals) {
					const inside = rings.inner.background.innerPetals.inside;
					if (inside && inside.placements) {
						const group = svg.append('g').attr('id', 'week-stroke-ellipses-group');
						renderPlacementsWithUse(group, inside.placements, 'week-stroke-ellipse');
					}
				}
				break;
			}

			case 'background-circle': {
				svg.append('circle').attr('id', 'background-circle').attr('r', outerRadius);
				break;
			}

			// The band and the week shapes standing on it, united into one shape
			// per slice by the generator. It places like any other grouped
			// fragment -- nothing here needs to know a slice carries two weeks,
			// because after the union there is only one shape. What does not come
			// for free is the completion class: renderItemRing sets that as it
			// draws a ring, and it no longer draws this one.
			case 'weeks.slices': {
				if (!step.animation?.group) injectComputedDef(svg, key, computedDefs);
				else addGroupedFragments(step, key);
				applyItemStates(svg, geometry?.rings?.inner?.placements, 'data-week');
				break;
			}

			case 'months.background':
			case 'weeks.background':
			case 'weeks.outsidePetalCutout': {
				// Computed defs that the response may declare as animated. When it
				// does they are distributed across their group's instances; when it
				// does not they inject as the single static blobs they always were.
				if (!step.animation?.group) {
					injectComputedDef(svg, key, computedDefs);
					break;
				}
				addGroupedFragments(step, key);
				break;
			}

			case 'days.background': {
				injectComputedDef(svg, 'days.background', computedDefs);
				break;
			}

			case 'days.shapes': {
				if (rings.outer) {
					const meta = motionMetaFor(step, 'days', animationGroups);
					motionRings.push({
						...meta,
						...renderItemRing(svg, rings.outer, dayMap, RING_SPECS.day, {
							registry,
							groupId: meta.id
						})
					});
				}
				break;
			}

			case 'days.labels.weekLabels': {
				// Week labels on outer ring — blank outline theme only
				break;
			}

			case 'days.labels.monthNames': {
				// Month names placed at a radius of their own rather than on a
				// petal — the templates with no month ring. Empty for the yearly
				// mandala, where they are `months.labels` and ride their petal.
				//
				// `month-label` because that is the class the generator gives this
				// same text in the SVG it renders to PNG; the `month-name-label`
				// that used to be here matched no rule in the stylesheet, so these
				// arrived at the browser default of 16px black.
				if (rings.outer && rings.outer.labels && rings.outer.labels.monthNames) {
					renderTextLabels(svg, rings.outer.labels.monthNames, 'month-label');
				}
				break;
			}

			case 'weeks.shapes': {
				if (rings.inner) {
					const meta = motionMetaFor(step, 'weeks', animationGroups);
					motionRings.push({
						...meta,
						...renderItemRing(svg, rings.inner, weekMap, RING_SPECS.week, {
							registry,
							groupId: meta.id
						})
					});
				}
				break;
			}

			case 'months.shapes': {
				if (rings.intermediate) {
					const meta = motionMetaFor(step, 'months', animationGroups);
					motionRings.push({
						...meta,
						...renderItemRing(svg, rings.intermediate, monthMap, RING_SPECS.month, {
							registry,
							groupId: meta.id,
							previewLabels,
							anchors: animationGroups?.[meta.id]?.anchors
						})
					});
				}
				break;
			}

			case 'months.labels': {
				// The month name printed on its petal. It goes inside the petal's
				// instance, so it folds with the petal rather than arriving on its
				// own timing -- the name is painted on the paper.
				//
				// This step used to draw the hub's month abbreviations, which the
				// `hub` step draws again a few entries later. That was a duplicate,
				// not a second layer: same data, same renderer, drawn twice.
				if (rings.intermediate && rings.intermediate.labels && rings.intermediate.labels.monthNames) {
					renderAnchoredLabels(
						svg, registry, 'months', rings.intermediate.labels.monthNames, 'month-label',
						rings.intermediate.placements
					);
				}
				break;
			}

			case 'months.intentionIcons': {
				if (geometry.intentionIcons) {
					renderIntentionIcons(svg, geometry.intentionIcons);
				}
				break;
			}

			case 'hub': {
				if (rings.center) {
					renderCenter(svg, rings.center);
				}
				break;
			}

			default: {
				// Generator-made members joining a group, in mandala coordinates:
				// a slice of the ring behind the petals, and anything like it.
				//
				// Handled here rather than as a named case so the client needs no
				// change when a new one is added -- the response says which group
				// it joins and which frame it is drawn in, and that is enough.
				if (step.animation?.group) addGroupedFragments(step, key);
				break;
			}
		}
	}

	// --- Motion pass ---
	// Runs after every ring exists, so the entrance can treat the mandala as
	// one moment rather than animating rings as they happen to be built.
	if (entrance !== false) {
		playEntrance(motionRings, entrance);
	}

	// Return control API
	return {
		svg: svg.node(),

		/** Re-run the entrance without rebuilding the mandala. */
		replayEntrance(overrides) {
			loop?.stop();
			loop = null;
			return playEntrance(motionRings, { ...entrance, ...overrides });
		},

		/** Fold the mandala away. Resolves once it has left. */
		playExit(overrides) {
			loop?.stop();
			loop = null;
			return playExit(motionRings, { ...entrance, ...overrides });
		},

		/**
		 * Cycle entrance and exit until stopped. Intended for the marketing
		 * page and for tuning; the app plays the entrance once instead.
		 */
		startLoop(overrides) {
			loop?.stop();
			loop = startLoop(motionRings, { ...entrance, ...overrides });
			return loop;
		},

		stopLoop() {
			loop?.stop();
			loop = null;
		},

		updateCompletions(newCompletions) {
			if (newCompletions.days) {
				for (const d of newCompletions.days) {
					dayMap.set(d.dayNumber, d);
					updateDayElement(svg, d);
				}
			}
			if (newCompletions.weeks) {
				for (const w of newCompletions.weeks) {
					weekMap.set(w.weekNumber, w);
					updateWeekElement(svg, w);
				}
			}
			if (newCompletions.months) {
				for (const m of newCompletions.months) {
					monthMap.set(m.month, m);
					updateMonthElement(svg, m);
				}
			}
		},

		setTheme(newThemeVariables) {
			applyThemeVariables(svg.node(), newThemeVariables);
		},

		setFigure(figureChoice) {
			const shapeId = figureShapeMap[figureChoice] || figureChoice;
			svg.selectAll('.center-figure use').attr('href', `#${shapeId}`);
		},

		destroy() {
			loop?.stop();
			loop = null;
			svg.remove();
		}
	};
}


// --- Defs ---

function buildDefs(defs, apiGradients) {
	// Inject asset shape templates
	for (const [, svgContent] of Object.entries(shapeDefs)) {
		defs.append('g').html(svgContent);
	}

	// Build gradients from API data if available
	if (apiGradients) {
		if (apiGradients.backgroundGradient) {
			const bg = apiGradients.backgroundGradient;
			const grad = defs.append('radialGradient')
				.attr('id', bg.id || 'background-gradient')
				.attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
			for (const stop of bg.stops) {
				grad.append('stop')
					.attr('offset', stop.offset)
					.attr('stop-color', `var(${stop.cssVar})`);
			}
		}
		if (apiGradients.linearGradient) {
			const lg = apiGradients.linearGradient;
			const grad = defs.append('linearGradient')
				.attr('id', lg.id || 'linear-gradient')
				.attr('x1', lg.x1 || '0%').attr('y1', lg.y1 || '50%')
				.attr('x2', lg.x2 || '100%').attr('y2', lg.y2 || '50%')
				.attr('gradientUnits', lg.gradientUnits || 'objectBoundingBox');
			for (const stop of lg.stops) {
				grad.append('stop')
					.attr('offset', stop.offset)
					.attr('stop-color', `var(${stop.cssVar})`);
			}
		}
	} else {
		// Fallback hardcoded gradients
		const bgGrad = defs.append('radialGradient')
			.attr('id', 'background-gradient')
			.attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
		for (const s of [
			{ offset: '0%', color: 'var(--gradient-1)' },
			{ offset: '4%', color: 'var(--gradient-2)' },
			{ offset: '12%', color: 'var(--gradient-3)' },
			{ offset: '20%', color: 'var(--gradient-4)' },
			{ offset: '28%', color: 'var(--gradient-5)' },
			{ offset: '93%', color: 'var(--gradient-6)' },
			{ offset: '100%', color: 'var(--gradient-7)' }
		]) {
			bgGrad.append('stop').attr('offset', s.offset).attr('stop-color', s.color);
		}
		const linGrad = defs.append('linearGradient')
			.attr('id', 'linear-gradient')
			.attr('x1', '0%').attr('y1', '50%').attr('x2', '100%').attr('y2', '50%')
			.attr('gradientUnits', 'objectBoundingBox');
		for (const s of [
			{ offset: '0%', color: 'var(--gradient-1)' },
			{ offset: '4%', color: 'var(--gradient-2)' },
			{ offset: '12%', color: 'var(--gradient-3)' },
			{ offset: '20%', color: 'var(--gradient-4)' },
			{ offset: '28%', color: 'var(--gradient-5)' },
			{ offset: '67%', color: 'var(--gradient-6)' },
			{ offset: '89%', color: 'var(--gradient-7)' },
			{ offset: '100%', color: 'var(--gradient-8)' }
		]) {
			linGrad.append('stop').attr('offset', s.offset).attr('stop-color', s.color);
		}
	}
}


// --- Computed defs (boolean ops from API) ---

/** Inject a computed SVG fragment (boolean-op result from the API) */
function injectComputedDef(svg, key, computedDefs) {
	if (!computedDefs || !computedDefs[key]) return;
	const wrapper = svg.append('g').attr('class', `computed-def computed-${key.replace(/\./g, '-')}`);
	wrapper.html(computedDefs[key]);
}


// --- Ring renderers ---

/**
 * The three item rings differ only in what they're called in the DOM, which
 * completion flag they read, and how the shape is attached. One spec each,
 * one renderer for all three.
 */
const RING_SPECS = {
	day: {
		groupId: 'outer-day-ring-group',
		className: 'day-placement',
		incompleteClass: 'day-incomplete',
		itemAttr: 'data-day',
		stateAttr: 'data-completed',
		stateFlag: 'isCompleted'
	},
	week: {
		groupId: 'inner-week-ring-group',
		className: 'week-placement',
		incompleteClass: 'week-incomplete',
		itemAttr: 'data-week',
		stateAttr: 'data-complete',
		stateFlag: 'isComplete'
	},
	month: {
		groupId: 'intermediate-month-ring-group',
		className: 'month-placement',
		extraClass: 'month-petal',
		incompleteClass: 'month-incomplete',
		itemAttr: 'data-month',
		stateAttr: 'data-complete',
		stateFlag: 'isComplete',
		// Month petals inline their shape rather than referencing it with
		// <use>, so CSS can target the inner elements directly.
		inlineShape: { key: 'month-petal', centering: 'translate(-42.74, -64.22)' },
		// DEV PREVIEW ONLY -- remove once the geometry API emits the labels.
		//
		// Still synthetic in its *content*: this geometry populates no petal
		// labels, and the month abbreviation ring sits at radius 43-47 while
		// the petals span 81-171, so today's labels are hub furniture.
		//
		// The *position* is no longer synthetic. It comes from the `label`
		// anchor the artwork declares, so this previews where text will really
		// sit rather than where the client guessed it might.
		previewLabel: {
			anchor: 'label',
			className: 'preview-petal-label',
			text: (itemNumber) =>
				['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
				 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][(itemNumber - 1) % 12],
			fontSize: 22
		}
	}
};

/**
 * Motion metadata for a render step.
 *
 * Both the group name and the shape's bounds come from the API when it declares
 * them. Everything falls back so the renderer keeps working against responses
 * that predate the animation contract: the group name falls back to the ring's
 * historical name, and omitting the bounds leaves the motion layer to measure
 * the rendered DOM with getBBox() as it did before.
 *
 * Preferring the API is not just tidiness. The measurement path needs real
 * layout, cannot run headless, and degrades silently to a pivot of 0 -- which
 * folds the shape about its middle instead of its inner edge with nothing
 * reported.
 */
function motionMetaFor(step, fallbackGroup, animationGroups) {
	const id = step.animation?.group ?? fallbackGroup;
	const bounds = animationGroups?.[id]?.bounds;
	if (!bounds) return { id };

	return {
		id,
		// -Y points away from the mandala centre in a placement's local frame,
		// so a shape's innermost point is the bottom of its bounds.
		pivotY: bounds.y + bounds.height,
		shapeExtent: bounds.height
	};
}

/**
 * The placements backing an animation group.
 *
 * A group either carries them inline, or names where they live with a dotted
 * path into `geometry.rings` -- 'intermediate' for the month petals,
 * 'inner.background.innerPetals.inside' for the decorative petals behind the
 * week ring. Reading it from the response rather than a table here is what lets
 * a new group appear without the client knowing anything about it.
 */
function placementsForGroup(groupId, animationGroups, geometry) {
	const group = animationGroups?.[groupId];
	if (!group) return [];

	if (Array.isArray(group.placements)) return group.placements;

	if (typeof group.ring === 'string') {
		const node = group.ring
			.split('.')
			.reduce((at, key) => (at ? at[key] : undefined), geometry.rings);
		if (Array.isArray(node?.placements)) return node.placements;
		if (Array.isArray(node)) return node;
	}

	return [];
}

/**
 * Animation groups, and the per-instance `<g>` each one is built from.
 *
 * A group is created where it is *first mentioned* in render order, not where
 * its shapes happen to appear. That matters because members of one group can
 * belong at very different depths: the ring behind the month petals paints
 * before the day ring, while the petals themselves paint after it. Creating the
 * group at its first member keeps the whole group at that depth, so joining a
 * group never silently restacks anything.
 *
 * Instances are shared, so whichever member arrives first creates the `<g>` and
 * later members decorate it. The identity a group's instances carry -- the
 * placement class, `data-month`, the completion flag -- is added by whichever
 * member knows about it, rather than assumed to come from the first arrival.
 */
function createGroupRegistry(svg) {
	const groups = new Map();

	return {
		/** The container for a group, appended at the point of first mention. */
		container(groupId) {
			if (!groups.has(groupId)) {
				groups.set(groupId, {
					node: svg.append('g').attr('class', `animation-group animation-group-${groupId}`),
					instances: new Map()
				});
			}
			return groups.get(groupId);
		},

		/** Whether an instance has been created, without creating one. */
		has(groupId, key) {
			return Boolean(groups.get(groupId)?.instances.has(key));
		},

		/** One instance's `<g>`, created on first mention and reused after. */
		instance(groupId, key) {
			const group = this.container(groupId);
			if (!group.instances.has(key)) {
				group.instances.set(
					key,
					group.node.append('g').attr('class', 'animation-instance').attr('data-instance', key)
				);
			}
			return group.instances.get(key);
		}
	};
}

/**
 * Render one ring of repeated shapes from the API's resolved placements.
 *
 * Every instance ends up on a `<g>` carrying its own resolved transform.
 * That transform is the single seam the motion system hooks: an entrance
 * generator only needs each instance's final transform plus which ring it
 * belongs to, both of which are right here.
 */
function renderItemRing(svg, ringData, stateMap, spec, options = {}) {
	const sorted = [...ringData.placements].sort((a, b) => a.angle - b.angle);
	const { registry, groupId } = options;

	// Ask the registry rather than appending directly, so an instance already
	// created by an earlier member of this group is reused instead of duplicated.
	const nodes = sorted.map(d => registry.instance(groupId, d.itemNumber).node());
	const items = d3.selectAll(nodes).data(sorted);

	items
		.attr('class', d => {
			const extra = spec.extraClass ? `${spec.extraClass} ` : '';
			return `animation-instance ${spec.className} ${extra}${d.cssClass || spec.incompleteClass}`;
		})
		.attr(spec.itemAttr, d => d.itemNumber)
		.attr(spec.stateAttr, d => {
			const state = stateMap.get(d.itemNumber);
			return state ? state[spec.stateFlag] : false;
		});

	if (spec.inlineShape) {
		// Strip the outer <g> wrapper (id/class/transform) since we apply our own
		const innerContent = (shapeDefs[spec.inlineShape.key] || '')
			.replace(/^<g[^>]*>/, '')
			.replace(/<\/g>\s*$/, '');
		items.each(function () {
			d3.select(this).append('g')
				.attr('transform', spec.inlineShape.centering)
				.html(innerContent);
		});
	} else {
		items.append('use').attr('href', d => `#${d.shapeId}`);
	}

	// Appended into the same <g> as the shape, which is the whole point: the
	// fold transform lives on that <g>, so anything inside it folds with the
	// paper rather than animating on its own. This is what the geometry API
	// would be declaring when it groups a label with its shape.
	if (spec.previewLabel && options.previewLabels) {
		const label = spec.previewLabel;
		// The artwork says where its label goes. Falling back to the shape's own
		// centre if no anchor is declared -- visibly placed rather than dropped,
		// so a missing anchor reads as "put one here" instead of "text is broken".
		const at = options.anchors?.[label.anchor] ?? { x: 0, y: 0 };
		// Styled with attributes rather than CSS: the stylesheet lives under
		// src/mandala/assets, which fetch-assets regenerates, so an edit there
		// would be wiped on the next dev run.
		items
			.append('text')
			.attr('class', label.className)
			.attr('x', at.x)
			.attr('y', at.y)
			.attr('font-size', label.fontSize)
			.attr('font-family', 'sans-serif')
			.attr('font-weight', 600)
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'central')
			.attr('fill', 'var(--neutral-white)')
			.attr('stroke', 'var(--circle-dark)')
			.attr('stroke-width', 1.2)
			.attr('paint-order', 'stroke')
			.text(d => label.text(d.itemNumber));
	}

	items.attr('transform', d => `translate(${d.x}, ${d.y}) rotate(${d.rotation}) scale(${d.scale})`);

	// `placements` is handed back in the same order the selection is bound in,
	// so the motion layer can pair instance i with its placement.
	return { selection: items, placements: sorted };
}

/**
 * The transform that undoes an instance's placement.
 *
 * A group's `<g>` carries `translate rotate scale`, so anything nested inside
 * inherits it. Content the generator drew in mandala coordinates -- a slice of
 * the ring behind the petals, say -- would be displaced by that. Wrapping it in
 * the inverse cancels the placement exactly, and the content renders where it
 * was drawn.
 *
 * Doing it with a wrapper rather than by converting coordinates is what makes
 * it work for paths: there is no sane way to inverse-transform a `d` attribute,
 * and no reason to try.
 *
 * The fold is appended to the instance's transform, so the composition becomes
 * `T·R·S·F·(T·R·S)⁻¹` -- the fold conjugated into the instance's frame. At rest
 * F is identity and the content sits exactly where drawn; mid-fold it travels
 * with its instance.
 */
function inversePlacement(placement) {
	return (
		`scale(${1 / placement.scale}) ` +
		`rotate(${-placement.rotation}) ` +
		`translate(${-placement.x}, ${-placement.y})`
	);
}

/**
 * Distribute generator-made markup across the instances of an animation group.
 *
 * The response sends one blob of SVG per render step, with each piece carrying
 * the instance it belongs to in an attribute -- `data-animation-instance="7"`.
 * That keeps `computedDefs` a plain string per key, and puts the identity on the
 * markup it identifies rather than in a parallel array that has to be kept in
 * step with it.
 *
 * Each piece is moved into its instance and wrapped in the inverse of that
 * instance's placement, so it keeps the mandala coordinates it was drawn in
 * while animating as part of the group.
 *
 * A piece naming an instance with no placement is left where it is rather than
 * dropped: it still renders, and an instance with no placement has no transform
 * for the motion layer to animate anyway.
 */
/**
 * Completion classes for shapes that arrive already drawn.
 *
 * A shape united into a slice is emitted by the generator as markup, so the
 * class renderItemRing would have set from `placement.cssClass` was never set.
 * Applied by item attribute -- the same way mandalaStyler does it in the PNG
 * pipeline -- so a week looks the same whichever pipeline drew it, and identity
 * keeps living on the shape rather than on the thing carrying it.
 */
function applyItemStates(svg, placements, itemAttr) {
	if (!placements) return;
	const root = svg.node();
	for (const p of placements) {
		if (!p.cssClass) continue;
		const el = root.querySelector(`[${itemAttr}="${p.itemNumber}"]`);
		if (!el) continue;
		const base = (el.getAttribute('class') || '')
			.replace(/(day|week|month)-(complete|completed|incomplete)/g, '')
			.trim();
		el.setAttribute('class', `${base} ${p.cssClass}`.trim());
	}
}

function renderGroupedFragments(svg, registry, step, markup, animationGroups, geometry) {
	if (!markup) return null;

	const { group: groupId, instanceAttribute = 'data-animation-instance' } = step.animation;
	const placements = placementsForGroup(groupId, animationGroups, geometry);
	const placementFor = new Map(placements.map(p => [String(p.itemNumber), p]));

	// Parsed in place so the markup lands in the SVG namespace; anything left
	// behind (the generator's own wrapper, once emptied) is removed after.
	const staging = svg.append('g').attr('class', 'computed-def-remainder');
	staging.html(markup);

	// Static NodeList, so moving nodes out mid-loop is safe.
	const pieces = staging.node().querySelectorAll(`[${instanceAttribute}]`);
	let orphans = 0;

	for (const piece of pieces) {
		const key = piece.getAttribute(instanceAttribute);
		const placement = placementFor.get(key);
		if (!placement) {
			orphans += 1;
			continue;
		}

		const instance = registry.instance(groupId, placement.itemNumber);

		// The generator emits each piece already positioned, and that transform
		// is its placement to the last decimal. Hoist it onto the instance and
		// drop it here: the instance is what the motion system animates, and a
		// piece keeping its own copy would be transformed twice. It also lets
		// several members share one instance -- the inside and outside halves of
		// an inner week petal arrive from different render steps carrying the
		// same transform, and both belong to the same moving thing.
		piece.removeAttribute('transform');
		instance.node().appendChild(piece);
	}

	if (orphans) {
		console.warn(
			`[mandala] ${step.key}: ${orphans} fragment(s) name an instance with no ` +
			`placement in the "${groupId}" group; left unanimated.`
		);
	}

	// Whatever did not carry the attribute stays where it was parsed, and often
	// must: a cutout's <defs> and <mask> live here, and the pieces distributed
	// above still reference them by id. Removing this container when it still
	// holds them would break every mask="url(#…)" that survived the move.
	//
	// Emptiness is judged on drawable content rather than on any element at all,
	// because moving the pieces out leaves the generator's own wrapper <g>
	// behind, and an empty wrapper is not a reason to keep the container.
	const DRAWABLE = 'path,circle,ellipse,rect,line,polygon,polyline,text,use,image';
	if (!staging.node().querySelector(DRAWABLE)) staging.remove();

	// Give each instance the transform lifted off its members, and hand the
	// group back in placement order so the motion layer can pair instance i with
	// placement i. Only instances that actually received something: a group may
	// declare more placements than this step had pieces for.
	const filled = placements.filter(p => registry.has(groupId, p.itemNumber));
	const nodes = filled.map(p => {
		const instance = registry.instance(groupId, p.itemNumber);
		instance.attr(
			'transform',
			`translate(${p.x}, ${p.y}) rotate(${p.rotation}) scale(${p.scale ?? 1})`
		);
		return instance.node();
	});

	if (!filled.length) return null;
	return { selection: d3.selectAll(nodes).data(filled), placements: filled };
}

function renderCenter(svg, centerData) {
	const group = svg.append('g').attr('id', 'center-group');

	// Use radii from API
	const circles = centerData.circles || {};
	const midR = circles.centerCircle ? circles.centerCircle.radius : 20;
	const innerR = circles.insideCenterCircle ? circles.insideCenterCircle.radius : 15;

	group.append('circle').attr('id', 'center-circle').attr('r', midR);
	group.append('circle').attr('id', 'inside-center-circle').attr('r', innerR);

	// Render week number labels around center
	if (centerData.labels && centerData.labels.weekNumbers) {
		renderTextLabels(group, centerData.labels.weekNumbers, 'week-number-label');
	}

	// Render month abbreviation labels (curved text on arcs)
	if (centerData.labels && centerData.labels.monthAbbreviations) {
		// The stylesheet knows these as month-circular-label-center-mandala-text,
		// which is the class the generator puts on the same text in the SVG it
		// renders to PNG. `arc-label` alone matches no rule, so they came out in
		// the browser's default black on a dark hub.
		renderArcLabels(group, centerData.labels.monthAbbreviations, 'month-circular-label-center-mandala-text');
	}

	// Render month dividers
	if (centerData.labels && centerData.labels.monthDividers && centerData.labels.monthDividers.placements) {
		renderPlacementsWithUse(group, centerData.labels.monthDividers.placements, 'month-divider');
	}

	// Render figure shapes from API placements
	if (centerData.figures && centerData.figures.placements) {
		const figGroup = group.append('g').attr('class', 'center-figures');
		const figs = centerData.figures.placements;

		for (const fig of figs) {
			const g = figGroup.append('g')
				.attr('class', 'center-figure')
				.attr('transform', `translate(${fig.x}, ${fig.y}) rotate(${fig.rotation}) scale(${fig.scale})`);
			g.append('use').attr('href', `#${fig.shapeId}`);
		}
	}

	return group;
}


// --- Labels ---

/** Render positioned text labels */
function renderTextLabels(parent, labels, className) {
	if (!labels || labels.length === 0) return;

	const group = parent.append('g').attr('class', `${className}-group`);

	group.selectAll(`text.${className}`)
		.data(labels)
		.enter()
		.append('text')
		.attr('class', className)
		.attr('x', d => d.x)
		.attr('y', d => d.y)
		.attr('transform', d => d.rotation ? `rotate(${d.rotation}, ${d.x}, ${d.y})` : null)
		.attr('text-anchor', 'middle')
		.attr('dominant-baseline', 'central')
		.text(d => d.text);
}

/**
 * Render text that belongs to a shape, into that shape's animation instance.
 *
 * Three frames meet here, which is the whole difficulty:
 *
 *   1. The instance `<g>` carries `translate rotate scale` (renderItemRing).
 *   2. `anchor` is in the shape's own frame — unscaled, the same frame as the
 *      group's `bounds`. Placing the text at the anchor inside the instance is
 *      therefore just `translate(anchor.x, anchor.y)`, with the instance's scale
 *      doing the conversion.
 *   3. `curvePath` and the font size are in mandala units, because a font size
 *      has to mean the same thing here as it does anywhere else on the mandala.
 *      So the scale is undone again below the anchor.
 *
 * Without step 3 the text renders at the placement's scale — 4px of stylesheet
 * arriving as 2.8px — which is subtle enough to read as "the label looks a bit
 * off" rather than as a bug.
 *
 * `flipped` is applied here, not in the instance transform: the petal does not
 * flip, and turning the instance would turn the petal with it.
 */
function renderAnchoredLabels(svg, registry, groupId, labels, className, hostPlacements) {
	if (!labels || labels.length === 0) return;

	const hostFor = new Map(hostPlacements.map(p => [p.itemNumber, p]));
	let orphans = 0;

	for (const label of labels) {
		const host = hostFor.get(label.itemNumber);
		if (!host) { orphans += 1; continue; }

		// Into the instance, then straight back out of its frame. The label ends
		// up drawn at the root's scale while still hanging off the instance, so
		// the fold carries it and Chrome still paints it.
		const wrapper = registry
			.instance(groupId, label.itemNumber)
			.append('g')
			.attr('class', `${className}-holder`)
			.attr('transform', inversePlacement(host));

		const group = wrapper
			.append('g')
			.attr('class', className)
			.attr('data-animation-group', groupId)
			.attr('data-animation-instance', label.itemNumber)
			.attr('transform', `translate(${label.x}, ${label.y}) rotate(${label.rotation})`);

		if (!label.curvePath) {
			group
				.append('text')
				.attr('text-anchor', 'middle')
				.attr('dominant-baseline', 'middle')
				.text(label.text);
			continue;
		}

		// The curve goes in a <defs> inside the label's own <g>, not the mandala's.
		// A <textPath> lays its glyphs out in the coordinate system of the path it
		// references, which is wherever that path is defined — so a curve parked in
		// the root <defs> is read in root user space, and all twelve month names
		// stack up on one arc through the middle of the mandala. Nothing errors.
		const pathId = `curve-${label.id}`;
		group.append('defs')
			.append('path')
			.attr('id', pathId)
			.attr('d', label.curvePath.d)
			.attr('fill', 'none');

		group
			.append('text')
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.append('textPath')
			.attr('href', `#${pathId}`)
			.attr('startOffset', '50%')
			.text(label.text);
	}

	if (orphans) {
		console.warn(
			`[mandala] ${orphans} ${className}(s) name an instance with no placement in ` +
			`the "${groupId}" group; not rendered.`
		);
	}
}

/** Render labels along arc paths (curved text) */
function renderArcLabels(parent, labels, className = 'arc-label') {
	if (!labels || labels.length === 0) return;

	const group = parent.append('g').attr('class', 'arc-label-group');
	const defs = d3.select(parent.node().closest('svg')).select('defs');

	for (const label of labels) {
		if (!label.arcPath) continue;

		// Add arc path to defs
		const pathId = `arc-path-${label.id}`;
		defs.append('path')
			.attr('id', pathId)
			.attr('d', label.arcPath)
			.style('fill', 'none');

		// Render text along path
		const text = group.append('text')
			.attr('class', className);

		// `renderedText` is padded out with filler glyphs to the width of its arc
		// and is meant to be squeezed back onto it — the API sends `arcLength` for
		// exactly that. Drawing it without the fit lets each section overrun its
		// neighbours, and twelve month names pile up into an unreadable ring.
		const textPath = text.append('textPath')
			.attr('href', `#${pathId}`)
			.attr('startOffset', '50%')
			.attr('text-anchor', 'middle')
			.text(label.renderedText || label.text);

		if (label.renderedText && label.arcLength) {
			textPath
				.attr('textLength', label.arcLength)
				.attr('lengthAdjust', 'spacingAndGlyphs');
		}
	}
}


// --- Intention icons ---

function renderIntentionIcons(svg, icons) {
	if (!icons || !Array.isArray(icons) || icons.length === 0) return;

	const group = svg.append('g').attr('class', 'intention-icons-group');

	for (const icon of icons) {
		const g = group.append('g')
			.attr('class', `intention-icon ${icon.iconClass || ''}`)
			.attr('transform', `translate(${icon.x}, ${icon.y}) scale(${icon.scale || 1})`);

		if (icon.shapeId) {
			g.append('use').attr('href', `#${icon.shapeId}`);
		} else if (icon.iconName) {
			g.append('use').attr('href', `#intention-${icon.iconName}`);
		}
	}
}


// --- Generic placement renderer ---

function renderPlacementsWithUse(group, placements, className) {
	const sorted = [...placements].sort((a, b) => a.angle - b.angle);

	const items = group.selectAll(`g.${className}`)
		.data(sorted)
		.enter()
		.append('g')
		.attr('class', className);

	items.append('use').attr('href', d => `#${d.shapeId}`);

	items.attr('transform', d => `translate(${d.x}, ${d.y}) rotate(${d.rotation}) scale(${d.scale})`);
}


// --- Theme ---

function applyThemeVariables(svgEl, variables) {
	for (const [prop, value] of Object.entries(variables)) {
		svgEl.style.setProperty(prop, value);
	}
}


// --- State updates ---

function updateDayElement(svg, dayState) {
	const el = svg.select(`[data-day="${dayState.dayNumber}"]`);
	if (el.empty()) return;
	el.classed('day-completed', dayState.isCompleted)
		.classed('day-incomplete', !dayState.isCompleted)
		.attr('data-completed', dayState.isCompleted);
}

function updateWeekElement(svg, weekState) {
	const el = svg.select(`[data-week="${weekState.weekNumber}"]`);
	if (el.empty()) return;
	el.classed('week-complete', weekState.isComplete)
		.classed('week-incomplete', !weekState.isComplete)
		.attr('data-complete', weekState.isComplete);
}

function updateMonthElement(svg, monthState) {
	const el = svg.select(`[data-month="${monthState.month}"]`);
	if (el.empty()) return;
	el.classed('month-complete', monthState.isComplete)
		.classed('month-incomplete', !monthState.isComplete)
		.attr('data-complete', monthState.isComplete);
}
