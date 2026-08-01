// mandalaRenderer.js
// D3-based renderer that consumes geometry JSON from the API
// and renders SVG using the defs/use pattern.
//
// Asset shapes (day, week, month petal, figures) loaded from shapeDefs.js.
// Computed shapes (boolean ops like ring-minus-days) come from the API's computedDefs.
// Render order driven by the API's renderOrder array.
// Theme colors applied via CSS custom properties.
// Completion states (cssClass) merged directly onto placements by the API.

import * as d3 from 'd3';
import { shapeDefs, figureShapeMap } from './shapeDefs.js';

/**
 * Render a mandala into a container element from API response data.
 */
export function renderMandala(container, apiResponse) {
	const { theme, geometry, computedDefs, completions } = apiResponse;
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

			case 'months.background': {
				injectComputedDef(svg, 'months.background', computedDefs);
				break;
			}

			case 'days.cutout': {
				injectComputedDef(svg, 'days.cutout', computedDefs);
				break;
			}

			case 'days.shapes': {
				if (rings.outer) {
					renderDayRing(svg, rings.outer, dayMap);
				}
				break;
			}

			case 'days.labels.weekLabels': {
				// Week labels on outer ring — blank outline theme only
				break;
			}

			case 'days.labels.monthNames': {
				if (rings.outer && rings.outer.labels && rings.outer.labels.monthNames) {
					renderTextLabels(svg, rings.outer.labels.monthNames, 'month-name-label');
				}
				break;
			}

			case 'weeks.outsidePetalCutout': {
				injectComputedDef(svg, 'weeks.outsidePetalCutout', computedDefs);
				break;
			}

			case 'weeks.cutout': {
				injectComputedDef(svg, 'weeks.cutout', computedDefs);
				break;
			}

			case 'weeks.shapes': {
				if (rings.inner) {
					renderWeekRing(svg, rings.inner, weekMap);
				}
				break;
			}

			case 'months.shapes': {
				if (rings.intermediate) {
					renderMonthRing(svg, rings.intermediate, monthMap);
				}
				break;
			}

			case 'months.labels': {
				if (rings.center && rings.center.labels && rings.center.labels.monthAbbreviations) {
					renderArcLabels(svg, rings.center.labels.monthAbbreviations);
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
		}
	}

	// Return control API
	return {
		svg: svg.node(),

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

function renderDayRing(svg, ringData, dayMap) {
	const group = svg.append('g').attr('id', 'outer-day-ring-group');
	const sorted = [...ringData.placements].sort((a, b) => a.angle - b.angle);

	const days = group.selectAll('g.day-placement')
		.data(sorted)
		.enter()
		.append('g')
		.attr('class', d => `day-placement ${d.cssClass || 'day-incomplete'}`)
		.attr('data-day', d => d.itemNumber)
		.attr('data-completed', d => {
			const state = dayMap.get(d.itemNumber);
			return state ? state.isCompleted : false;
		});

	days.append('use').attr('href', d => `#${d.shapeId}`);

	days.attr('transform', d => `translate(${d.x}, ${d.y}) rotate(${d.rotation}) scale(${d.scale})`);

	return group;
}

function renderWeekRing(svg, ringData, weekMap) {
	const group = svg.append('g').attr('id', 'inner-week-ring-group');
	const sorted = [...ringData.placements].sort((a, b) => a.angle - b.angle);

	const weeks = group.selectAll('g.week-placement')
		.data(sorted)
		.enter()
		.append('g')
		.attr('class', d => `week-placement ${d.cssClass || 'week-incomplete'}`)
		.attr('data-week', d => d.itemNumber)
		.attr('data-complete', d => {
			const state = weekMap.get(d.itemNumber);
			return state ? state.isComplete : false;
		});

	weeks.append('use').attr('href', d => `#${d.shapeId}`);

	weeks.attr('transform', d => `translate(${d.x}, ${d.y}) rotate(${d.rotation}) scale(${d.scale})`);

	return group;
}

function renderMonthRing(svg, ringData, monthMap) {
	const group = svg.append('g').attr('id', 'intermediate-month-ring-group');
	const sorted = [...ringData.placements].sort((a, b) => a.angle - b.angle);

	// Inline month shapes (no <use>) so CSS can target inner elements directly
	const shapeContent = shapeDefs['month-petal'] || '';
	// Strip the outer <g> wrapper (id/class/transform) since we apply our own transform
	const innerContent = shapeContent
		.replace(/^<g[^>]*>/, '')
		.replace(/<\/g>\s*$/, '');

	const months = group.selectAll('g.month-placement')
		.data(sorted)
		.enter()
		.append('g')
		.attr('class', d => `month-placement month-petal ${d.cssClass || 'month-incomplete'}`)
		.attr('data-month', d => d.itemNumber)
		.attr('data-complete', d => {
			const state = monthMap.get(d.itemNumber);
			return state ? state.isComplete : false;
		});

	// Append the inner SVG content with the shape's centering transform
	months.each(function () {
		d3.select(this).append('g')
			.attr('transform', 'translate(-42.74, -64.22)')
			.html(innerContent);
	});

	months.attr('transform', d => `translate(${d.x}, ${d.y}) rotate(${d.rotation}) scale(${d.scale})`);

	return group;
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
		renderArcLabels(group, centerData.labels.monthAbbreviations);
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

/** Render labels along arc paths (curved text) */
function renderArcLabels(parent, labels) {
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
			.attr('class', 'arc-label');

		text.append('textPath')
			.attr('href', `#${pathId}`)
			.attr('startOffset', '50%')
			.attr('text-anchor', 'middle')
			.text(label.renderedText || label.text);
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
