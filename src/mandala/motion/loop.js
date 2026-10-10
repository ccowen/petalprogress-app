// loop.js
//
// Cycles a mandala: enter, hold, exit, pause, enter again.
//
// Built for the marketing page, where mandalas succeed one another, and useful
// while tuning because you get to watch the same moment repeatedly without
// reaching for the replay button. The app itself is expected to play the
// entrance once and stop, which is just this not being started.
//
// Cancellation is the fiddly part and the reason this is a module rather than a
// setInterval at the call site. A cycle is a chain of promises that outlive any
// single frame, so stopping has to be checked at every await -- otherwise a
// stopped loop keeps scheduling transitions against a mandala that may already
// have been destroyed, and they fight whatever replaced it.

import { playEntrance } from './entrance.js';
import { playExit } from './exit.js';

export const LOOP_DEFAULTS = {
	/** How long the mandala sits fully resolved before it starts leaving. */
	hold: 1600,
	/** How long the empty beat lasts before the next entrance begins. */
	pause: 500
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Start cycling.
 *
 * `rings` is the same shape the entrance and exit take. Returns a handle with
 * `stop()`; calling it prevents any further phase from starting, though the
 * one in flight finishes on its own rather than being torn out mid-transition.
 */
export function startLoop(rings, options = {}) {
	const { hold, pause, ...motion } = { ...LOOP_DEFAULTS, ...options };
	let running = true;
	let cycles = 0;

	async function cycle() {
		// Checked after every await, not just at the top: each of these can take
		// seconds, and stop() during any of them must take effect at the next
		// opportunity rather than after the whole cycle plays out.
		while (running) {
			await playEntrance(rings, motion);
			if (!running) return;

			await wait(hold);
			if (!running) return;

			await playExit(rings, motion);
			if (!running) return;

			await wait(pause);
			cycles += 1;
		}
	}

	cycle();

	return {
		stop() {
			running = false;
		},
		get running() {
			return running;
		},
		get cycles() {
			return cycles;
		}
	};
}
