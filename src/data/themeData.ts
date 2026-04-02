/** CSS custom-property maps for each theme and petal color.
 *  Mirrors values from themes.css for programmatic use by the renderer. */

export const themeVariables: Record<string, Record<string, string>> = {
  "pumpkin-spice": {
    "--neutral-white": "#f0ead2",
    "--circle-dark": "#35231c",
    "--circle-light": "#594a42",
    "--background": "#ceb0a0",
    "--gradient-1": "#fff33b",
    "--gradient-2": "#fee62d",
    "--gradient-3": "#fdd51b",
    "--gradient-4": "#fdca0f",
    "--gradient-5": "#fdc70c",
    "--gradient-6": "#f3903f",
    "--gradient-7": "#ed683c",
    "--gradient-8": "#e93e3a",
  },
  "ice-castle": {
    "--neutral-white": "#cbccce",
    "--circle-dark": "#07122c",
    "--circle-light": "#243050",
    "--background": "#1e222d",
    "--gradient-1": "#2db295",
    "--gradient-2": "#2db295",
    "--gradient-3": "#2dada1",
    "--gradient-4": "#2ea9ad",
    "--gradient-5": "#2fa8b1",
    "--gradient-6": "#2e769f",
    "--gradient-7": "#29599e",
    "--gradient-8": "#34408d",
  },
  "blooming-flowers": {
    "--neutral-white": "#e6dee3",
    "--circle-dark": "#4a1d34",
    "--circle-light": "#6c1e4e",
    "--background": "#844169",
    "--gradient-1": "#f4d48c",
    "--gradient-2": "#f4ba8c",
    "--gradient-3": "#f4a78c",
    "--gradient-4": "#f49b8c",
    "--gradient-5": "#f5988c",
    "--gradient-6": "#eb4b6b",
    "--gradient-7": "#ea246c",
    "--gradient-8": "#e9254f",
  },
  "heat-wave": {
    "--neutral-white": "#f5f1dc",
    "--circle-dark": "#3b120b",
    "--circle-light": "#5f1d12",
    "--background": "#d55e3c",
    "--gradient-1": "#f2ac3e",
    "--gradient-2": "#f1a53d",
    "--gradient-3": "#ee933d",
    "--gradient-4": "#ed873d",
    "--gradient-5": "#ed843d",
    "--gradient-6": "#ed2a2b",
    "--gradient-7": "#c12226",
    "--gradient-8": "#ae1f26",
  },
};

export const petalGradientVars: Record<string, Record<string, string>> = {
  red: {
    "--gradient-1": "#f2ac3e",
    "--gradient-2": "#f1a53d",
    "--gradient-3": "#ee933d",
    "--gradient-4": "#ed873d",
    "--gradient-5": "#ed843d",
    "--gradient-6": "#ed2a2b",
    "--gradient-7": "#c12226",
    "--gradient-8": "#ae1f26",
  },
  orange: {
    "--gradient-1": "#fff33b",
    "--gradient-2": "#fee62d",
    "--gradient-3": "#fdd51b",
    "--gradient-4": "#fdca0f",
    "--gradient-5": "#fdc70c",
    "--gradient-6": "#f3903f",
    "--gradient-7": "#ed683c",
    "--gradient-8": "#e93e3a",
  },
  green: {
    "--gradient-1": "#dce249",
    "--gradient-2": "#d6e04a",
    "--gradient-3": "#c4d94d",
    "--gradient-4": "#b8d550",
    "--gradient-5": "#b5d451",
    "--gradient-6": "#58b95d",
    "--gradient-7": "#499058",
    "--gradient-8": "#338a63",
  },
  blue: {
    "--gradient-1": "#2db295",
    "--gradient-2": "#2db295",
    "--gradient-3": "#2dada1",
    "--gradient-4": "#2ea9ad",
    "--gradient-5": "#2fa8b1",
    "--gradient-6": "#2e769f",
    "--gradient-7": "#29599e",
    "--gradient-8": "#34408d",
  },
  indigo: {
    "--gradient-1": "#89afb1",
    "--gradient-2": "#82a4ad",
    "--gradient-3": "#7792a7",
    "--gradient-4": "#7086a3",
    "--gradient-5": "#6e83a2",
    "--gradient-6": "#68528c",
    "--gradient-7": "#6f337c",
    "--gradient-8": "#6e3067",
  },
  pink: {
    "--gradient-1": "#f4d78c",
    "--gradient-2": "#f4ba8c",
    "--gradient-3": "#f4a78c",
    "--gradient-4": "#f49b8c",
    "--gradient-5": "#f5988c",
    "--gradient-6": "#eb4b6b",
    "--gradient-7": "#ea246c",
    "--gradient-8": "#e9254f",
  },
};

/** Merge a theme's neutral colors with a petal color's gradient overrides. */
export function buildThemeVars(
  themeId: string,
  colorId: string,
): Record<string, string> {
  const base = themeVariables[themeId] ?? themeVariables["pumpkin-spice"];
  const petal = petalGradientVars[colorId];
  return petal ? { ...base, ...petal } : { ...base };
}
