import { useMemo } from "react";
import { useApp } from "../state/AppState";
import ModeToggle from "../ui/ModeToggle";
import PrintButton from "../ui/PrintButton";
import TripPanel from "./TripPanel";
import { fmtGap } from "../lib/format";

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (!n) return 0;
  return n % 2 ? s[(n - 1) / 2] : Math.round((s[n / 2 - 1] + s[n / 2]) / 2);
};

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-md border border-hairline bg-paper/50 px-3 py-2">
      <div
        className={[
          "font-display text-[22px] leading-none",
          accent ? "text-accent" : "text-ink",
        ].join(" ")}
      >
        {value}
      </div>
      <div className="kicker mt-1.5">{label}</div>
    </div>
  );
}

export default function Sidebar() {
  const { data, mode, setSplitView } = useApp();

  const dateLabel = useMemo(() => {
    if (!data) return "";
    const d = new Date(`${data.meta.target_date}T09:00:00`);
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    }).format(d);
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return null;
    const o = data.origins;
    const car = o.map((x) => x.car_min).filter((v): v is number => v != null);
    const transit = o.filter((x) => x.transit_realistic).map((x) => x.transit_min!) as number[];
    const closest = o
      .filter((x) => x.transit_realistic && x.diff_min != null)
      .sort((a, b) => (b.diff_min ?? 0) - (a.diff_min ?? 0))[0];
    return {
      noTransit: data.meta.n_no_transit + data.meta.n_transit_unrealistic,
      medCar: median(car),
      medTransit: median(transit),
      slowTransit: transit.filter((v) => v > 60).length,
      maxCar: Math.max(...car),
      closest,
    };
  }, [data]);

  if (!data || !stats) return null;

  return (
    <aside className="no-print flex h-full w-[384px] flex-none flex-col border-r border-hairline bg-surface">
      <header className="border-b border-hairline px-5 pb-4 pt-5">
        <div className="kicker">Travel Time Atlas · Modal Shift</div>
        <h1 className="mt-2 font-display text-[27px] font-semibold leading-[1.05] tracking-tight text-ink">
          Stansted Airport College
        </h1>
        <p className="mt-2 font-mono text-[11px] text-graphite">
          Journeys arriving by 09:00 · {dateLabel}
        </p>
      </header>

      <div className="flex flex-col gap-4 px-5 py-4">
        <ModeToggle />

        <button
          onClick={() => setSplitView(true)}
          className="flex items-center justify-center gap-2 rounded-full border border-hairline bg-transparent px-4 py-2 font-mono text-[10.5px] font-semibold uppercase tracking-section text-graphite transition-colors hover:border-accent hover:text-ink"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="7" height="16" rx="1" />
            <rect x="14" y="4" width="7" height="16" rx="1" />
          </svg>
          Compare side by side
        </button>

        {mode === "diff" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat value={String(data.meta.candidate_count)} label="Transit faster" accent />
              <Stat value={String(stats.noTransit)} label="No 09:00 transit" />
            </div>
            <p className="font-sans text-[12.5px] leading-snug text-graphite">
              Public transport is slower than driving from <strong className="text-ink">every</strong>{" "}
              origin. The closest to competitive is{" "}
              <strong className="font-mono text-ink">{stats.closest?.postcode}</strong> — still{" "}
              {fmtGap(stats.closest?.diff_min)} min behind the car.
            </p>
          </>
        )}

        {mode === "car" && (
          <div className="grid grid-cols-2 gap-2">
            <Stat value={`${stats.medCar}`} label="Median drive min" />
            <Stat value={`${stats.maxCar}`} label="Longest drive min" />
          </div>
        )}

        {mode === "transit" && (
          <div className="grid grid-cols-2 gap-2">
            <Stat value={`${stats.medTransit}`} label="Median transit min" />
            <Stat value={`${stats.slowTransit}`} label="Over 60 min" accent />
          </div>
        )}
      </div>

      <TripPanel />

      <footer className="flex flex-col gap-3 border-t border-hairline px-5 py-4">
        <PrintButton />
        <p className="font-mono text-[9px] leading-relaxed text-faint">
          Routing © Google · Basemap © CARTO, © OpenStreetMap contributors · Generated{" "}
          {data.meta.generated_utc.slice(0, 10)}
        </p>
      </footer>
    </aside>
  );
}
