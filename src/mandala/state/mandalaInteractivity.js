// mandalaInteractivity.js
// App-only — extends MandalaStyler with click handling, live toggling,
// event notifications, and week bracket text updates.

import { MandalaStyler } from './mandalaStyler.js';
import { toggleDay } from '../../mandala-core/state/habitComputation.js';

export class MandalaInteractivity extends MandalaStyler {
	constructor() {
		super();
		this.weeklyTarget = 3;
		this.monthlyThreshold = 0.3;
		this.listeners = new Set();
		this.svg = null;
	}

	// Override to also set targets and render brackets
	loadHabitData(config) {
		super.loadHabitData(config);
		this.weeklyTarget = config.habit?.weekly_goal || 3;
		this._notifyListeners();
		this.renderWeekBrackets();
	}

	// --- Interactivity ---

	addInteractivity(svgElement) {
		this.svg = svgElement;

		svgElement.addEventListener('click', (e) => {
			const dayGroup = e.target.closest('[id^="day-"]');
			if (dayGroup) {
				const dayNumber = parseInt(dayGroup.id.replace('day-', ''));
				this.toggleDayCompletion(dayNumber);
			}
		});
	}

	toggleDayCompletion(dayNumber) {
		const result = toggleDay(
			dayNumber,
			this.dayStates,
			this.weekStates,
			this.monthStates,
			this.weeklyTarget,
			this.monthlyThreshold
		);
		if (!result) return;

		// Re-render affected elements
		if (this.svg) {
			this.applyDayStyles(this.svg);
			this.applyWeekStyles(this.svg);
			this.applyMonthStyles(this.svg);
		}

		this.renderWeekBracket(result.affectedWeek);
		this._notifyListeners({
			type: 'day',
			dayNumber,
			affectedWeek: result.affectedWeek,
			affectedMonth: result.affectedMonth
		});
	}

	setWeeklyTarget(newTarget) {
		this.weeklyTarget = newTarget;
		// Recompute with new target
		super.loadHabitData(this.habitData);
		this._notifyListeners({ type: 'targetChanged' });
	}

	// --- Week bracket text ---

	renderWeekBrackets() {
		this.weekStates.forEach((weekState, weekNumber) => {
			const countElement = document.querySelector(`.week-${weekNumber}-count`);
			if (countElement) {
				countElement.textContent = weekState.completedDays;
			}
		});
	}

	renderWeekBracket(weekNumber) {
		const weekState = this.weekStates.get(weekNumber);
		if (!weekState) return;

		const countElement = document.querySelector(`.week-${weekNumber}-count`);
		if (countElement) {
			countElement.textContent = weekState.completedDays;
		}
	}

	// --- Event system ---

	subscribe(listener) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	_notifyListeners(change = null) {
		this.listeners.forEach(listener => listener(change));
	}
}
