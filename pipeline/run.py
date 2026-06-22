"""Orchestrator: postcodes -> geocode -> car + transit routes -> raw JSON -> outputs.

Usage:
  python run.py                 # full run over every postcode
  python run.py --limit 3       # dry run on the first 3 postcodes
  python run.py --rebuild       # rebuild web outputs from existing raw JSON (no API calls)
"""
from __future__ import annotations

import argparse
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone

import build_outputs
import config
import geocode
import routes_api


def load_origins(limit: int | None = None) -> list[dict]:
    """One postcode per line, no header, BOM tolerated."""
    text = config.ORIGINS_FILE.read_text(encoding="utf-8-sig")
    seen, origins = set(), []
    for line in text.splitlines():
        pc = " ".join(line.strip().upper().split())
        if not pc or pc in seen:
            continue
        seen.add(pc)
        origins.append({"originId": f"O{len(origins) + 1:03d}", "postcode": pc, "name": pc})
    return origins[:limit] if limit else origins


def _process_origin(origin: dict, geo: dict, arrival: datetime) -> dict:
    record = {**origin, "geocode": geo}
    if geo.get("status") != "OK":
        record["car"] = {"status": "NO_GEOCODE"}
        record["transit"] = {"status": "NO_GEOCODE"}
        return record
    try:
        record["car"] = routes_api.route_car(geo, arrival)
    except Exception as exc:  # noqa: BLE001 - record and continue
        record["car"] = {"status": "ERROR", "error": str(exc)}
    try:
        record["transit"] = routes_api.route_transit(geo, arrival)
    except Exception as exc:  # noqa: BLE001
        record["transit"] = {"status": "ERROR", "error": str(exc)}
    return record


def run(limit: int | None, workers: int) -> None:
    if not config.API_KEY:
        raise SystemExit("GOOGLE_MAPS_API_KEY is missing from .env")

    arrival = config.arrival_local()
    # Car routing back-solves a departureTime (up to ~4h before arrival); the Routes API
    # rejects a past departureTime, so the target must be comfortably in the future.
    if arrival - timedelta(hours=4) <= datetime.now(config.LONDON):
        raise SystemExit(
            f"TARGET_DATE {config.TARGET_DATE} is in the past or too soon. Traffic-aware car "
            f"routing needs a future departureTime; pick a future weekday in pipeline/config.py."
        )
    origins = load_origins(limit)
    print(f"Loaded {len(origins)} origin postcode(s). "
          f"Target arrival {arrival.isoformat()} ({config.arrival_utc_rfc3339()}).")

    print("Geocoding postcodes...")
    geo_map = geocode.geocode_postcodes([o["postcode"] for o in origins])

    print(f"Routing {len(origins)} origins x {{car, transit}} with {workers} workers...")
    records: list[dict] = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(_process_origin, o, geo_map[o["postcode"]], arrival): o
            for o in origins
        }
        done = 0
        for fut in as_completed(futures):
            rec = fut.result()
            records.append(rec)
            done += 1
            car = rec.get("car", {})
            tr = rec.get("transit", {})
            cs = car.get("duration_sec")
            ts = tr.get("duration_sec")
            print(f"  [{done:>3}/{len(origins)}] {rec['postcode']:>9}  "
                  f"car={car.get('status')}"
                  f"{f' {cs // 60}m' if cs else ''}  "
                  f"transit={tr.get('status')}"
                  f"{f' {ts // 60}m' if ts else ''}")

    records.sort(key=lambda r: r["originId"])
    total_route_calls = sum(
        r.get("car", {}).get("calls", 0) + r.get("transit", {}).get("calls", 0)
        for r in records
    )
    raw = {
        "meta": {
            "destination": config.DESTINATION,
            "target_date": config.TARGET_DATE,
            "arrival_local": arrival.isoformat(),
            "arrival_utc": config.arrival_utc_rfc3339(),
            "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "n_origins": len(records),
            "route_api_calls": total_route_calls,
        },
        "origins": records,
    }
    config.RAW_ROUTES.parent.mkdir(parents=True, exist_ok=True)
    config.RAW_ROUTES.write_text(json.dumps(raw, indent=2), encoding="utf-8")
    print(f"Wrote raw responses -> {config.RAW_ROUTES} ({total_route_calls} route API calls)")

    build_outputs.build(raw)


def main() -> None:
    ap = argparse.ArgumentParser(description="Stansted travel-times pipeline")
    ap.add_argument("--limit", type=int, default=None, help="only process the first N postcodes")
    ap.add_argument("--workers", type=int, default=config.MAX_WORKERS)
    ap.add_argument("--rebuild", action="store_true",
                    help="rebuild web outputs from existing raw JSON without calling the API")
    args = ap.parse_args()

    if args.rebuild:
        raw = json.loads(config.RAW_ROUTES.read_text(encoding="utf-8"))
        build_outputs.build(raw)
        return
    run(args.limit, args.workers)


if __name__ == "__main__":
    main()
