import { useApp } from "../state/AppState";
import type { TripProps } from "../data/types";

// Car/transit journeys exported as two CSVs, each with mode-appropriate columns.
// Built client-side from the already-loaded routes, so no extra fetch is needed.

const londonTime = (iso?: string): string =>
  iso
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London",
      }).format(new Date(iso))
    : "";

// RFC 4180: quote a field only when it contains a comma, quote or newline.
const field = (v: string | number | null | undefined): string => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Leading BOM (﻿) so Excel reads it as UTF-8 — the transit "legs" use arrows.
const toCsv = (headers: string[], rows: (string | number | null)[][]): string =>
  "﻿" + [headers, ...rows].map((r) => r.map(field).join(",")).join("\r\n") + "\r\n";

function download(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

export default function DataDownload() {
  const { data } = useApp();
  if (!data) return null;
  const { target_date } = data.meta;

  const tripsByMode = (mode: TripProps["mode"]): TripProps[] =>
    data.routes.features
      .map((f) => f.properties)
      .filter((p) => p.mode === mode)
      .sort((a, b) => a.originPostcode.localeCompare(b.originPostcode));

  const exportCar = () => {
    const rows = tripsByMode("car").map((p) => [
      p.originPostcode, p.duration_min, p.distance_km,
      londonTime(p.departure_iso), londonTime(p.arrival_iso),
    ]);
    download(
      `stansted-car-trips-${target_date}.csv`,
      toCsv(["postcode", "duration_min", "distance_km", "departure", "arrival"], rows),
    );
  };

  const exportTransit = () => {
    const rows = tripsByMode("transit").map((p) => [
      p.originPostcode, p.duration_min, p.distance_km,
      p.legs_summary ?? "", p.transit_realistic ? "true" : "false",
    ]);
    download(
      `stansted-transit-trips-${target_date}.csv`,
      toCsv(["postcode", "duration_min", "distance_km", "legs", "realistic"], rows),
    );
  };

  const btn =
    "flex items-center justify-center gap-1.5 rounded-full border border-hairline bg-transparent px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-section text-graphite transition-colors hover:border-accent hover:text-ink";

  return (
    <div className="flex flex-col gap-2">
      <div className="kicker">Download data (CSV)</div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={exportCar} className={btn}>
          <DownloadIcon /> Car
        </button>
        <button type="button" onClick={exportTransit} className={btn}>
          <DownloadIcon /> Transit
        </button>
      </div>
    </div>
  );
}
