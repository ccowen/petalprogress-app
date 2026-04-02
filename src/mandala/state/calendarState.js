// calendarState.js
// Browser-side state manager — delegates computation to habitComputation.js,
// owns DOM interaction, event listeners, and UI rendering.

import { computeCompletionStates, toggleDay, computeSummary } from '../../mandala-core/state/habitComputation.js';

class CalendarState {
    constructor() {
        this.habitData = null;
        this.weeklyTarget = 3;
        this.monthlyThreshold = 0.3;

        this.dayStates = new Map();
        this.weekStates = new Map();
        this.monthStates = new Map();

        this.listeners = new Set();
    }

    // Initialize state from config
    loadHabitData(config) {
        this.habitData = config;
        this.weeklyTarget = config.habit?.weekly_goal || 3;
        console.log('Setting weeklyTarget to:', this.weeklyTarget);

        // Delegate computation to server-side module
        const states = computeCompletionStates(config);
        this.dayStates = states.dayStates;
        this.weekStates = states.weekStates;
        this.monthStates = states.monthStates;

        this._notifyListeners();
        this.renderWeekBrackets();
    }

    // Get state for specific elements
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

    // --- Browser-side: DOM rendering ---

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

    // --- Browser-side: interaction ---

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
        const states = computeCompletionStates(this.habitData);
        this.weekStates = states.weekStates;
        this.monthStates = states.monthStates;

        this._notifyListeners({ type: 'targetChanged' });
        this.renderWeekBrackets();
    }

    getSummary() {
        return computeSummary(this.habitData, this.dayStates, this.weekStates, this.monthStates);
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

// Singleton instance
export const calendarState = new CalendarState();
