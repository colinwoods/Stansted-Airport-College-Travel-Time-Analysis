import { useCallback, useEffect, useMemo, useRef } from "react";
import { useApp } from "../state/AppState";
import type { TripProps } from "../data/types";
import TripRow from "./TripRow";

export default function TripPanel() {
  const { data, mode, selectedTripId, setSelectedTripId, hoveredTripId, setHoveredTripId } =
    useApp();
  const listRef = useRef<HTMLDivElement | null>(null);

  const trips = useMemo<TripProps[]>(() => {
    if (!data) return [];
    const feats = data.routes.features.map((f) => f.properties);
    if (mode === "transit") {
      return feats
        .filter((p) => p.mode === "transit" && p.transit_realistic)
        .sort((a, b) => b.duration_min - a.duration_min);
    }
    if (mode === "diff") {
      return feats
        .filter((p) => p.mode === "car" && p.transit_realistic && p.diff_min != null)
        .sort((a, b) => (b.diff_min ?? 0) - (a.diff_min ?? 0)); // closest to parity first
    }
    return feats.filter((p) => p.mode === "car").sort((a, b) => b.duration_min - a.duration_min);
  }, [data, mode]);

  // scroll the selected row into view when selection comes from the map
  useEffect(() => {
    if (!selectedTripId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-trip="${CSS.escape(selectedTripId)}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedTripId]);

  const onSelect = useCallback(
    (id: string) => setSelectedTripId(id === selectedTripId ? null : id),
    [selectedTripId, setSelectedTripId],
  );

  if (!data) return null;

  return (
    <div ref={listRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-y border-hairline bg-surface/95 px-3.5 py-1.5 backdrop-blur">
        <span className="kicker">{trips.length} origins</span>
        <span className="kicker">
          {mode === "diff" ? "gap · car − transit" : mode === "transit" ? "transit time" : "drive time"}
        </span>
      </div>
      <div className="divide-y divide-hairline/60">
        {trips.map((t) => (
          <TripRow
            key={t.tripId}
            trip={t}
            mode={mode}
            domain={data.meta.diff_domain_min}
            selected={selectedTripId === t.tripId}
            hovered={hoveredTripId === t.tripId}
            onSelect={onSelect}
            onHover={setHoveredTripId}
          />
        ))}
      </div>
    </div>
  );
}
