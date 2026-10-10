// Types for mandalaRenderer.js, which stays plain JavaScript (see
// ../motion/presets.d.ts for the same pattern). Without this, `tsc -b`
// fails with TS7016 and `npm run build` can't run.

export interface RenderOptions {
	/** false to render with no motion, or overrides for the entrance. */
	entrance?: false | Record<string, unknown>;
	/** Dev preview: synthesise text on the month petals. */
	previewLabels?: boolean;
}

export function renderMandala(
	container: HTMLElement,
	apiResponse: unknown,
	options?: RenderOptions,
): unknown;
