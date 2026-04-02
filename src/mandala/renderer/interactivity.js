// interactivity.js
// Click handlers and state management for the D3-rendered mandala.
// Delegates computation to habitComputation.js (server-side pure functions).

import { toggleDay, computeSummary } from '../../mandala-core/state/habitComputation.js';

/**
 * Add click-to-toggle interactivity to a rendered mandala.
 *
 * @param {Object} mandalaInstance - Return value from renderMandala()
 * @param {Object} config - Original habit config (for weekly_target, etc.)
 * @param {Object} completions - Current completions from API
 * @param {Function} [onUpdate] - Callback when state changes: ({ summary, changed }) => void
 */
export function addInteractivity(mandalaInstance, config, completions, onUpdate) {
	const d3 = window.d3;
	const svg = d3.select(mandalaInstance.svg);

	const weeklyTarget = parseInt(config.habit?.weekly_target || config.weekly_target || 3);

	// Build mutable state from API completions
	const dayStates = new Map();
	const weekStates = new Map();
	const monthStates = new Map();

	for (const d of completions.days) dayStates.set(d.dayNumber, { ...d });
	for (const w of completions.weeks) weekStates.set(w.weekNumber, { ...w });
	for (const m of completions.months) monthStates.set(m.month, { ...m });

	svg.on('click', (event) => {
		const dayGroup = event.target.closest('[data-day]');
		if (!dayGroup) return;

		const dayNumber = parseInt(dayGroup.dataset.day);
		if (!dayStates.has(dayNumber)) return;

		// toggleDay mutates the maps in place and returns { dayNumber, affectedWeek, affectedMonth }
		const result = toggleDay(dayNumber, dayStates, weekStates, monthStates, weeklyTarget);
		if (!result) return;

		// Get updated states for DOM refresh
		const updatedDay = dayStates.get(dayNumber);
		const updatedWeek = weekStates.get(result.affectedWeek);
		const updatedMonth = monthStates.get(result.affectedMonth);

		mandalaInstance.updateCompletions({
			days: [updatedDay],
			weeks: updatedWeek ? [updatedWeek] : [],
			months: updatedMonth ? [updatedMonth] : []
		});

		if (onUpdate) {
			const summary = computeSummary(config, dayStates, weekStates, monthStates);
			onUpdate({ summary, changed: result });
		}
	});

	return {
		getDayStates: () => dayStates,
		getWeekStates: () => weekStates,
		getMonthStates: () => monthStates
	};
}
