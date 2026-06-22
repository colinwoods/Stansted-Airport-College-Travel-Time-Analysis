// Single source of truth for the colour scales, shared by the MapLibre paint
// expressions (map/layerStyles.ts), the Legend, and the Scatter plot so the
// map and the charts can never drift apart.

export type Stop = [number, string];

// Journey time — ONE shared "heat" ramp used by BOTH car and transit so the two
// modes sit on an identical scale: a 40-minute trip is the same colour whether
// driven or ridden. Cool/bright = fast, hot = slow. Vivid throughout (no grey)
// to stay legible on the dark Steer basemap. Domain spans both modes (~5-135 min),
// which is what makes transit's long journeys read correctly as "hot".
export const DURATION_STOPS: Stop[] = [
  [5, "#16cde0"],   // bright cyan — fastest
  [38, "#5fd97a"],  // green
  [70, "#f2c63b"],  // amber
  [102, "#f0853c"], // orange
  [135, "#ec4f5c"], // red — slowest
];

// Difference (car_min - transit_min) as a *normalised* position in [-1, 1] where
// t = diff / domain. One-sided in this dataset (car always faster), so the ramp
// recedes for a large car advantage (deep slate-blue) and brightens toward parity
// (bright cyan = the strongest switch candidates), turning warm only if transit
// ever wins. No grey / cream — every stop reads on the dark canvas.
export const DIFF_NORM_STOPS: Stop[] = [
  [-1.0, "#245a7a"],  // car hugely faster — recedes
  [-0.55, "#1f93c4"],
  [-0.18, "#00b7e6"], // closing in — Steer cyan
  [0.0, "#7fe9ff"],   // parity — brightest
  [0.4, "#f4b13a"],   // transit edging ahead
  [1.0, "#f0616d"],   // transit clearly faster
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").slice(0, 6);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

/** JS-side interpolation over a stop list (used by Legend + Scatter). */
export function sampleStops(stops: Stop[], value: number): string {
  if (value <= stops[0][0]) return stops[0][1];
  if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [v0, c0] = stops[i];
    const [v1, c1] = stops[i + 1];
    if (value >= v0 && value <= v1) {
      return mix(c0, c1, (value - v0) / (v1 - v0));
    }
  }
  return stops[stops.length - 1][1];
}

// Shared by car + transit — both ride the same duration ramp.
export const colorForDuration = (min: number) => sampleStops(DURATION_STOPS, min);
export const colorForDiff = (diff: number, domain: number) =>
  sampleStops(DIFF_NORM_STOPS, Math.max(-1, Math.min(1, diff / domain)));

/** Flatten stops into the [value, color, value, color, ...] tail of a MapLibre
 *  `interpolate` expression. */
export function interpStops(stops: Stop[]): (number | string)[] {
  return stops.flatMap(([v, c]) => [v, c]);
}
