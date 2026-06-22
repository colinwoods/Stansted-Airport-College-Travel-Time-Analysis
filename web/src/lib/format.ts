import type { Mode } from "../data/types";

export const fmtMin = (m: number | null | undefined): string =>
  m == null ? "—" : `${m} min`;

export const fmtKm = (k: number | null | undefined): string =>
  k == null ? "—" : `${k.toFixed(1)} km`;

export const modeLabel = (mode: Mode): string =>
  mode === "car" ? "Drive" : mode === "transit" ? "Public transport" : "Car vs transit";

export const modeShort = (mode: Mode): string =>
  mode === "car" ? "Car" : mode === "transit" ? "Transit" : "Difference";

/** "+12" / "−34" minutes, from the car-minus-transit difference.
 *  diff = car - transit. Negative => car faster (the common case here). */
export function fmtGap(diff: number | null | undefined): string {
  if (diff == null) return "—";
  if (diff === 0) return "±0";
  return diff > 0 ? `+${diff}` : `−${Math.abs(diff)}`;
}
