import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import { useApp } from "../state/AppState";
import MapView from "../map/MapView";
import Legend from "./Legend";
import { modeLabel } from "../lib/format";
import type { Mode } from "../data/types";

function Pane({ mode, onMapReady }: { mode: Mode; onMapReady: (m: MaplibreMap) => void }) {
  return (
    <section className="relative min-w-0 flex-1">
      <MapView modeOverride={mode} main={false} onMapReady={onMapReady} />
      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute left-4 top-4 flex items-center gap-2 rounded-full border border-hairline bg-surface/85 px-3.5 py-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.5)] backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-section text-ink">
            {modeLabel(mode)}
          </span>
        </div>
        <div className="pointer-events-auto absolute bottom-4 right-4">
          <Legend compact modeOverride={mode} />
        </div>
      </div>
    </section>
  );
}

/** Keep two maps locked to the same camera; a shared guard stops the echo. */
function syncMaps(a: MaplibreMap, b: MaplibreMap) {
  let running = false;
  const mk = (from: MaplibreMap, to: MaplibreMap) => () => {
    if (running) return;
    running = true;
    to.jumpTo({
      center: from.getCenter(),
      zoom: from.getZoom(),
      bearing: from.getBearing(),
      pitch: from.getPitch(),
    });
    running = false;
  };
  const ha = mk(a, b);
  const hb = mk(b, a);
  a.on("move", ha);
  b.on("move", hb);
  return () => {
    a.off("move", ha);
    b.off("move", hb);
  };
}

export default function SplitView() {
  const { data, setSplitView } = useApp();
  const carMap = useRef<MaplibreMap | null>(null);
  const transitMap = useRef<MaplibreMap | null>(null);
  const [ready, setReady] = useState(0);

  const registerCar = useCallback((m: MaplibreMap) => {
    carMap.current = m;
    if (import.meta.env.DEV) (window as unknown as { __carMap: unknown }).__carMap = m;
    setReady((n) => n + 1);
  }, []);
  const registerTransit = useCallback((m: MaplibreMap) => {
    transitMap.current = m;
    if (import.meta.env.DEV) (window as unknown as { __transitMap: unknown }).__transitMap = m;
    setReady((n) => n + 1);
  }, []);

  // once both panes have a live map, mirror every camera move between them
  useEffect(() => {
    const a = carMap.current;
    const b = transitMap.current;
    if (!a || !b) return;
    // align once (covers a move made before the second map finished loading),
    // then keep both cameras in lock-step
    b.jumpTo({
      center: a.getCenter(), zoom: a.getZoom(),
      bearing: a.getBearing(), pitch: a.getPitch(),
    });
    return syncMaps(a, b);
  }, [ready]);

  const dateLabel = useMemo(() => {
    if (!data) return "";
    const d = new Date(`${data.meta.target_date}T09:00:00`);
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    }).format(d);
  }, [data]);

  if (!data) return null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-paper">
      <header className="flex flex-none items-center justify-between border-b border-hairline bg-surface px-5 py-3">
        <div>
          <div className="kicker">Travel Time Analysis · Car vs Transit</div>
          <h1 className="mt-1 font-display text-[19px] font-semibold leading-none tracking-tight text-ink">
            {data.meta.destination.name}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-[10.5px] uppercase tracking-section text-graphite sm:block">
            arrive 09:00 · {dateLabel}
          </span>
          <button
            onClick={() => setSplitView(false)}
            className="flex items-center gap-2 rounded-full border border-hairline bg-transparent px-4 py-2 font-mono text-[10.5px] font-semibold uppercase tracking-section text-ink transition-colors hover:border-accent hover:bg-surface-2"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Exit split
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <Pane mode="car" onMapReady={registerCar} />
        <div className="w-px flex-none bg-hairline" />
        <Pane mode="transit" onMapReady={registerTransit} />
      </div>
    </div>
  );
}
