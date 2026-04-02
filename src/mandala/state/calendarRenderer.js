// calendarRenderer.js
import { calendarState } from './calendarState.js';

export class CalendarRenderer {
    constructor(svgElement) {
        this.svg = svgElement;
        
        calendarState.subscribe((change) => {
            // Only render if svg exists
            if (!this.svg) return;

            if (change?.type === 'day') {
                this.updateDayShape(change.dayNumber);
                this.updateWeekShape(change.affectedWeek);
                this.updateMonthPetal(change.affectedMonth);
            } else {
                this.renderAll();
            }
        });
    }

    renderAll() {
        if (!this.svg) return; // Guard clause
        this.renderDays();
        this.renderWeeks();
        this.renderMonths();
    }

    renderDays() {
        const totalDays = calendarState.habitData?.habit.total_days || 365;
        for (let i = 1; i <= totalDays; i++) {
            this.updateDayShape(i);
        }
    }

    updateDayShape(dayNumber) {
        const dayState = calendarState.getDayState(dayNumber);
        if (!dayState) return;

        // Find by data-day attribute
        const shapeGroup = this.svg.querySelector(`[data-day="${dayNumber}"]`);
        
        if (!shapeGroup) {
            console.warn(`Shape not found for day ${dayNumber}`);
            return;
        }

        // Update the class on the outer group
        const currentClasses = shapeGroup.getAttribute('class') || '';
        const baseClasses = currentClasses.replace(/day-(completed|incomplete)/g, '').trim();
        shapeGroup.setAttribute('class', `${baseClasses} ${dayState.cssClass}`.trim());
    

        shapeGroup.setAttribute('data-completed', dayState.isCompleted);
    }

    renderWeeks() {
        const totalWeeks = calendarState.weekStates.size;
        for (let i = 1; i <= totalWeeks; i++) {
            this.updateWeekShape(i);
        }
    }

    updateWeekShape(weekNumber) {
        const weekState = calendarState.getWeekState(weekNumber);
        if (!weekState) return;

        const shapeGroup = this.svg.querySelector(`[data-week="${weekNumber}"]`);
        if (!shapeGroup) return;

        const currentClasses = shapeGroup.getAttribute('class') || '';
        const baseClasses = currentClasses.replace(/week-(complete|incomplete)/g, '').trim();
        shapeGroup.setAttribute('class', `${baseClasses} ${weekState.cssClass}`.trim());

        shapeGroup.setAttribute('data-complete', weekState.isComplete);
    }

    renderMonths() {
        for (let i = 1; i <= 12; i++) {
            this.updateMonthPetal(i);
        }
    }

    updateMonthPetal(monthNumber) {
        const monthState = calendarState.getMonthState(monthNumber);
        if (!monthState) return;

        const petalGroup = this.svg.querySelector(`[data-month="${monthNumber}"]`);
        if (!petalGroup) return;

        const currentClasses = petalGroup.getAttribute('class') || '';
        const baseClasses = currentClasses.replace(/month-(complete|incomplete)/g, '').trim();
        petalGroup.setAttribute('class', `${baseClasses} ${monthState.cssClass}`.trim());

        petalGroup.setAttribute('data-complete', monthState.isComplete);
    }

    addInteractivity() {
        this.svg.addEventListener('click', (e) => {
            const dayGroup = e.target.closest('[id^="day-"]');
            if (dayGroup) {
                const dayNumber = parseInt(dayGroup.id.replace('day-', ''));
                calendarState.toggleDayCompletion(dayNumber);
            }
        });
    }
}