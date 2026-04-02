// mandalaStyler.js
// Shared resource (S3) — computes completion states and applies CSS classes to SVG elements.
// Used by both the browser app (for initial render) and Lambda Puppeteer (for PNG export).
// No interactivity, no event system — just "given config + SVG, make it look right."

import { computeCompletionStates, computeSummary } from '../mandala-core/state/habitComputation.js';

export class MandalaStyler {
	constructor() {
		this.habitData = null;
		this.dayStates = new Map();
		this.weekStates = new Map();
		this.monthStates = new Map();
	}

	// Compute completion states from config
	loadHabitData(config) {
		this.habitData = config;

		const states = computeCompletionStates(config);
		this.dayStates = states.dayStates;
		this.weekStates = states.weekStates;
		this.monthStates = states.monthStates;
	}

	// --- State getters ---

	getDayState(dayNumber) {
		return this.dayStates.get(dayNumber);
	}

	getWeekState(weekNumber) {
		return this.weekStates.get(weekNumber);
	}

	getMonthState(monthNumber) {
		return this.monthStates.get(monthNumber);
	}

	getWeeksForMonth(monthNumber) {
		return Array.from(this.weekStates.values())
			.filter(week => week.monthNumber === monthNumber);
	}

	getSummary() {
		return computeSummary(this.habitData, this.dayStates, this.weekStates, this.monthStates);
	}

	// --- Apply CSS classes to SVG elements ---

	applyStyles(svgElement) {
		this.applyDayStyles(svgElement);
		this.applyWeekStyles(svgElement);
		this.applyMonthStyles(svgElement);
	}

	applyDayStyles(svgElement) {
		this.dayStates.forEach((dayState, dayNumber) => {
			const el = svgElement.querySelector(`[data-day="${dayNumber}"]`);
			if (!el) return;

			const currentClasses = el.getAttribute('class') || '';
			const baseClasses = currentClasses.replace(/day-(completed|incomplete)/g, '').trim();
			el.setAttribute('class', `${baseClasses} ${dayState.cssClass}`.trim());
			el.setAttribute('data-completed', dayState.isCompleted);
		});
	}

	applyWeekStyles(svgElement) {
		this.weekStates.forEach((weekState, weekNumber) => {
			const el = svgElement.querySelector(`[data-week="${weekNumber}"]`);
			if (!el) return;

			const currentClasses = el.getAttribute('class') || '';
			const baseClasses = currentClasses.replace(/week-(complete|incomplete)/g, '').trim();
			el.setAttribute('class', `${baseClasses} ${weekState.cssClass}`.trim());
			el.setAttribute('data-complete', weekState.isComplete);
		});
	}

	applyMonthStyles(svgElement) {
		this.monthStates.forEach((monthState, monthNumber) => {
			const el = svgElement.querySelector(`[data-month="${monthNumber}"]`);
			if (!el) return;

			const currentClasses = el.getAttribute('class') || '';
			const baseClasses = currentClasses.replace(/month-(complete|incomplete)/g, '').trim();
			el.setAttribute('class', `${baseClasses} ${monthState.cssClass}`.trim());
			el.setAttribute('data-complete', monthState.isComplete);
		});
	}
}
