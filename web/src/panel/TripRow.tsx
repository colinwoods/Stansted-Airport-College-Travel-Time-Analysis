import { memo } from "react";
import type { Mode, TripProps } from "../data/types";
import { colorForDiff, colorForDuration } from "../lib/scales";
import { fmtGap, fmtKm, fmtMin } from "../lib/format";

interface Props {
  trip: TripProps;
  mode: Mode;
  domain: number;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function swatch(mode: Mode, trip: TripProps, domain: number): string {
  if (mode === "diff") return colorForDiff(trip.diff_min ?? 0, domain);
  return colorForDuration(trip.duration_min);
}

function TripRow({ trip, mode, domain, selected, hovered, onSelect, onHover }: Props) {
  return (
    <button
      data-trip={trip.tripId}
      onClick={() => onSelect(trip.tripId)}
      onMouseEnter={() => onHover(trip.tripId)}
      onMouseLeave={() => onHover(null)}
      className={[
        "flex w-full items-center gap-3 border-l-2 px-3.5 py-2.5 text-left transition-colors",
        selected
          ? "border-accent bg-accent/8"
          : hovered
            ? "border-transparent bg-ink/[0.04]"
            : "border-transparent hover:bg-ink/[0.03]",
      ].join(" ")}
    >
      <span
        className="mt-0.5 h-7 w-1.5 flex-none rounded-full"
        style={{ background: swatch(mode, trip, domain) }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[12.5px] font-semibold tracking-tight text-ink">
            {trip.originPostcode}
          </span>
          {mode === "diff" ? (
            <span className="font-mono text-[12.5px] font-semibold text-graphite">
              {fmtGap(trip.diff_min)}<span className="text-faint"> min</span>
            </span>
          ) : (
            <span className="font-mono text-[12.5px] font-semibold text-ink">
              {fmtMin(trip.duration_min)}
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          {mode === "diff" ? (
            <span className="truncate font-sans text-[11px] text-graphite">
              car {fmtMin(trip.car_min)} · transit {fmtMin(trip.transit_min)}
            </span>
          ) : mode === "transit" ? (
            <span className="truncate font-sans text-[11px] text-graphite">
              {trip.legs_summary || "—"}
            </span>
          ) : (
            <span className="truncate font-sans text-[11px] text-graphite">
              arrive {trip.arrival_iso?.slice(11, 16) ?? "—"}
            </span>
          )}
          <span className="flex-none font-mono text-[10px] text-faint">{fmtKm(trip.distance_km)}</span>
        </span>
      </span>
    </button>
  );
}

export default memo(TripRow);
