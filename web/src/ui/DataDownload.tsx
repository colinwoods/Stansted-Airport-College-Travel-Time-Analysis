import { useApp } from "../state/AppState";
import type { TripProps } from "../data/types";

// Car/transit journeys exported per mode as either a flat CSV (mode-appropriate
// columns) or the raw route GeoJSON (LineString geometry + full properties).
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

function download(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
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

  const featuresByMode = (mode: TripProps["mode"]) =>
    data.routes.features
      .filter((f) => f.properties.mode === mode)
      .sort((a, b) =>
        a.properties.originPostcode.localeCompare(b.properties.originPostcode),
      );

  const exportCsv = (mode: TripProps["mode"]) => {
    const rows = featuresByMode(mode).map((f) => f.properties);
    if (mode === "car") {
      download(
        `stansted-car-trips-${target_date}.csv`,
        toCsv(
          ["postcode", "duration_min", "distance_km", "departure", "arrival"],
          rows.map((p) => [
            p.originPostcode, p.duration_min, p.distance_km,
            londonTime(p.departure_iso), londonTime(p.arrival_iso),
          ]),
        ),
        "text/csv;charset=utf-8",
      );
    } else {
      download(
        `stansted-transit-trips-${target_date}.csv`,
        toCsv(
          ["postcode", "duration_min", "distance_km", "legs", "realistic"],
          rows.map((p) => [
            p.originPostcode, p.duration_min, p.distance_km,
            p.legs_summary ?? "", p.transit_realistic ? "true" : "false",
          ]),
        ),
        "text/csv;charset=utf-8",
      );
    }
  };

  // Raw route features for the mode, geometry intact — the most useful form for
  // anyone pulling the lines into QGIS / a map. Pretty-printed for readability.
  const exportGeoJson = (mode: TripProps["mode"]) => {
    const fc = { type: "FeatureCollection", features: featuresByMode(mode) };
    download(
      `stansted-${mode}-routes-${target_date}.geojson`,
      JSON.stringify(fc, null, 2),
      "application/geo+json",
    );
  };

  const btn =
    "group flex items-center justify-center gap-1.5 rounded-full border border-hairline bg-transparent px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-section text-graphite transition-colors hover:border-accent hover:text-ink";
  const fmt = "text-faint transition-colors group-hover:text-graphite";

  // Mode-grouped, each row one mode: Car (CSV | GeoJSON), then Transit (CSV | GeoJSON).
  const modes: { mode: TripProps["mode"]; label: string }[] = [
    { mode: "car", label: "Car" },
    { mode: "transit", label: "Transit" },
  ];
  const formats: { format: string; run: (m: TripProps["mode"]) => void }[] = [
    { format: "CSV", run: exportCsv },
    { format: "GeoJSON", run: exportGeoJson },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="kicker">Download data</div>
      <div className="grid grid-cols-2 gap-2">
        {modes.flatMap(({ mode, label }) =>
          formats.map(({ format, run }) => (
            <button
              key={`${mode}-${format}`}
              type="button"
              onClick={() => run(mode)}
              className={btn}
            >
              <DownloadIcon /> {label} <span className={fmt}>· {format}</span>
            </button>
          )),
        )}
      </div>
    </div>
  );
}
