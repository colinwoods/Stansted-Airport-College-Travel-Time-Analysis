# Stansted Airport College · Travel Time Atlas

Car vs public-transport journey times from 82 origin postcodes to **Stansted Airport
College** (arriving by 09:00), built to show where transport users are most likely to
switch from car to transit. Two parts:

1. **`pipeline/`** — a Python CLI that geocodes the postcodes, queries the Google Routes
   API for car and transit journeys (real geometry, leg detail, durations, distances),
   and writes static data files.
2. **`web/`** — a React + MapLibre single-page app with three full-screen, print-ready
   map states (car, transit, car-vs-transit difference), a trip panel with two-way
   highlight, a drive-vs-transit scatter, and an A3 print mode.

## Headline finding

Public transport is **slower than driving from every origin** for a 09:00 arrival, so
there are no origins where transit beats the car. The map therefore highlights the
origins where transit is *closest to competitive* (the smallest time penalty — the top
five are pinned on the difference map) and flags the **4 origins with no realistic 09:00
transit at all** (2 with no route, 2 with absurd multi-hour itineraries).

## Prerequisites

- Python 3.12+, Node 20+.
- A Google Maps Platform API key with **Routes API** and **Geocoding API** enabled,
  in `.env` at the repo root:

  ```
  GOOGLE_MAPS_API_KEY=your_key_here
  ```

## 1. Run the pipeline

```bash
python3 -m venv .venv
.venv/bin/pip install -r pipeline/requirements.txt

.venv/bin/python pipeline/run.py --limit 3   # dry run (3 postcodes) to sanity check
.venv/bin/python pipeline/run.py             # full run over all 82 origins
.venv/bin/python pipeline/run.py --rebuild   # rebuild web data from cached raw (no API calls)
```

Inputs/outputs:

| Path | Role |
| --- | --- |
| `data/inputs/postcodes.csv` | input: one postcode per line, no header |
| `data/cache/geocode.json` | cached geocodes (re-runs skip the Geocoding API) |
| `data/raw/routes_raw.json` | full Routes API responses (audit / rebuild) |
| `data/out/summary.csv` | flat per-origin table |
| `web/public/data/{routes.geojson,origins.json,meta.json}` | what the web app loads |

Notes: car "arrive by 09:00" is back-solved (the Routes API has no arrive-by for
driving) using `TRAFFIC_AWARE_OPTIMAL`; transit uses the native `arrivalTime`. The full
run is ~410 API calls, comfortably inside Google's per-SKU free monthly caps. The target
date lives in `pipeline/config.py`.

## 2. Run the web app

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into web/dist
npm run preview  # serve the production build
```

The app is fully static (no runtime backend) — `web/dist` can be hosted on any static
host. `base: "./"` in `vite.config.ts` keeps it path-independent (works under a sub-path
such as GitHub Pages).

### Printing

Use the **Print map (A3)** button (or the browser's print to PDF). Panels are hidden and
the map, title, legend, scatter, scale, north arrow and attribution print as a single A3
landscape sheet.

## Stack

React 19 · @vis.gl/react-maplibre + maplibre-gl 5 · Tailwind v4 · Vite 8 · CARTO Positron
basemap. Colour: car = warm sequential ramp, transit = cool sequential ramp, difference =
diverging teal↔cream↔vermilion.
