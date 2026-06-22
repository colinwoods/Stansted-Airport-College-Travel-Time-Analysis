"""Transform raw Routes API responses into the static files the web app loads.

Outputs (no API calls; pure transform so it can be re-run via `run.py --rebuild`):
  web/public/data/routes.geojson   one LineString feature per origin-per-mode
  web/public/data/origins.json     per-origin combined record (markers + scatter)
  web/public/data/meta.json        destination, target time, counts, diff domain
  data/out/summary.csv             flat audit table
"""
from __future__ import annotations

import csv
import json
import math

import polyline

import config


def _decode_lnglat(route: dict) -> list[list[float]]:
    """Decode an encoded polyline to GeoJSON [lng, lat] pairs."""
    enc = (route.get("polyline") or {}).get("encodedPolyline")
    if not enc:
        return []
    return [[lng, lat] for lat, lng in polyline.decode(enc)]


def _mins(sec: int | None) -> int | None:
    return None if sec is None else int(round(sec / 60))


def _km(meters: int | None) -> float | None:
    return None if meters is None else round(meters / 1000, 1)


def _transit_steps(route: dict) -> tuple[list[dict], str]:
    """Compact per-step summary + a short human string like 'Walk -> Train -> Bus'."""
    steps_out, labels = [], []
    for leg in route.get("legs", []):
        for step in leg.get("steps", []):
            mode = step.get("travelMode", "")
            dur = step.get("staticDuration")
            dur_sec = int(round(float(str(dur).rstrip("s")))) if dur else None
            dist = step.get("distanceMeters")
            if mode == "TRANSIT":
                td = step.get("transitDetails", {})
                line = td.get("transitLine", {})
                vehicle = (line.get("vehicle") or {}).get("type")
                name = line.get("nameShort") or line.get("name") or "Transit"
                stops = td.get("stopDetails", {})
                steps_out.append({
                    "mode": "TRANSIT",
                    "line": name,
                    "vehicle": vehicle,
                    "duration_sec": dur_sec,
                    "distance_m": dist,
                    "from": (stops.get("departureStop") or {}).get("name"),
                    "to": (stops.get("arrivalStop") or {}).get("name"),
                })
                labels.append(name)
            elif mode == "WALK":
                steps_out.append({"mode": "WALK", "duration_sec": dur_sec, "distance_m": dist})
                labels.append("Walk")
    # collapse consecutive duplicate labels (several walk sub-steps)
    short = []
    for lab in labels:
        if not short or short[-1] != lab:
            short.append(lab)
    return steps_out, " → ".join(short)


def _compare(car_sec: int | None, transit_sec: int | None) -> dict:
    if car_sec is None or transit_sec is None:
        return {}
    car_m, transit_m = _mins(car_sec), _mins(transit_sec)
    diff_min = car_m - transit_m  # positive => transit faster => modal-shift candidate
    faster = "transit" if diff_min > 0 else "car" if diff_min < 0 else "equal"
    return {
        "car_min": car_m,
        "transit_min": transit_m,
        "diff_min": diff_min,
        "abs_diff_min": abs(diff_min),
        "faster": faster,
    }


def build(raw: dict) -> None:
    features: list[dict] = []
    origins_out: list[dict] = []
    summary_rows: list[dict] = []
    n_car = n_transit = n_no_transit = 0
    max_abs_diff = 0

    for rec in raw["origins"]:
        oid, pc, name = rec["originId"], rec["postcode"], rec["name"]
        geo = rec.get("geocode", {})
        car = rec.get("car", {})
        transit = rec.get("transit", {})
        car_ok = car.get("status") == "OK" and car.get("route")
        transit_ok = transit.get("status") == "OK" and transit.get("route")
        cmp = _compare(car.get("duration_sec") if car_ok else None,
                       transit.get("duration_sec") if transit_ok else None)
        transit_min_val = cmp.get("transit_min")
        transit_realistic = bool(
            transit_ok and transit_min_val is not None
            and transit_min_val <= config.MAX_REALISTIC_TRANSIT_MIN)
        if cmp and transit_realistic:
            max_abs_diff = max(max_abs_diff, cmp["abs_diff_min"])

        if car_ok:
            n_car += 1
            coords = _decode_lnglat(car["route"])
            if coords:
                props = {
                    "tripId": f"{oid}-car", "originId": oid, "originPostcode": pc,
                    "originName": name, "mode": "car",
                    "duration_sec": car["duration_sec"], "duration_min": _mins(car["duration_sec"]),
                    "static_duration_min": _mins(routes_static(car)),
                    "distance_m": car["route"].get("distanceMeters"),
                    "distance_km": _km(car["route"].get("distanceMeters")),
                    "arrival_iso": car.get("arrival"), "departure_iso": car.get("departure"),
                    "alt_count": car.get("alt_count"),
                    "converged": car.get("converged"),
                    "arrival_residual_min": (
                        round(car["residual_sec"] / 60) if car.get("residual_sec") is not None else None
                    ),
                    **cmp,
                    "transit_realistic": transit_realistic,
                }
                features.append({"type": "Feature", "id": props["tripId"],
                                 "properties": props,
                                 "geometry": {"type": "LineString", "coordinates": coords}})

        if transit_ok:
            n_transit += 1
            coords = _decode_lnglat(transit["route"])
            steps, steps_summary = _transit_steps(transit["route"])
            if coords:
                props = {
                    "tripId": f"{oid}-transit", "originId": oid, "originPostcode": pc,
                    "originName": name, "mode": "transit",
                    "duration_sec": transit["duration_sec"],
                    "duration_min": _mins(transit["duration_sec"]),
                    "distance_m": transit["route"].get("distanceMeters"),
                    "distance_km": _km(transit["route"].get("distanceMeters")),
                    "arrival_iso": transit.get("arrival"),
                    "alt_count": transit.get("alt_count"),
                    "legs": steps, "legs_summary": steps_summary,
                    **cmp,
                    "transit_realistic": transit_realistic,
                }
                features.append({"type": "Feature", "id": props["tripId"],
                                 "properties": props,
                                 "geometry": {"type": "LineString", "coordinates": coords}})
        else:
            n_no_transit += 1

        origins_out.append({
            "originId": oid, "postcode": pc, "name": name,
            "lat": geo.get("lat"), "lng": geo.get("lng"),
            "geocode_status": geo.get("status"),
            "car_min": cmp.get("car_min"), "transit_min": cmp.get("transit_min"),
            "diff_min": cmp.get("diff_min"), "faster": cmp.get("faster"),
            "transit_available": bool(transit_ok),
            "transit_realistic": transit_realistic,
        })
        summary_rows.append({
            "originId": oid, "postcode": pc, "lat": geo.get("lat"), "lng": geo.get("lng"),
            "car_min": cmp.get("car_min"), "transit_min": cmp.get("transit_min"),
            "diff_min": cmp.get("diff_min"), "faster": cmp.get("faster"),
            "car_distance_km": _km(car["route"].get("distanceMeters")) if car_ok else None,
            "transit_distance_km": _km(transit["route"].get("distanceMeters")) if transit_ok else None,
            "transit_available": bool(transit_ok),
            "transit_realistic": transit_realistic,
        })

    diff_domain = int(math.ceil(max_abs_diff / 10.0) * 10) if max_abs_diff else 10
    n_unrealistic = sum(1 for o in origins_out
                        if o.get("transit_available") and not o.get("transit_realistic"))
    meta = {
        **raw["meta"],
        "n_car_routes": n_car,
        "n_transit_routes": n_transit,
        "n_no_transit": n_no_transit,
        "n_transit_unrealistic": n_unrealistic,
        "diff_domain_min": diff_domain,
        "candidate_count": sum(
            1 for o in origins_out if o.get("faster") == "transit" and o.get("transit_realistic")
        ),
    }

    config.WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    (config.WEB_DATA_DIR / "routes.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": features}), encoding="utf-8")
    (config.WEB_DATA_DIR / "origins.json").write_text(
        json.dumps(origins_out, indent=2), encoding="utf-8")
    (config.WEB_DATA_DIR / "meta.json").write_text(
        json.dumps(meta, indent=2), encoding="utf-8")

    config.SUMMARY_CSV.parent.mkdir(parents=True, exist_ok=True)
    with config.SUMMARY_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(summary_rows[0].keys()))
        writer.writeheader()
        writer.writerows(summary_rows)

    print(f"Built outputs: {n_car} car + {n_transit} transit routes, "
          f"{n_no_transit} origins without transit, "
          f"{meta['candidate_count']} modal-shift candidates (transit faster). "
          f"diff domain +/-{diff_domain} min.")
    print(f"  -> {config.WEB_DATA_DIR / 'routes.geojson'}")
    print(f"  -> {config.WEB_DATA_DIR / 'origins.json'}")
    print(f"  -> {config.WEB_DATA_DIR / 'meta.json'}")
    print(f"  -> {config.SUMMARY_CSV}")


def routes_static(car: dict) -> int | None:
    """Car free-flow baseline (staticDuration) in seconds, if present."""
    route = car.get("route") or {}
    val = route.get("staticDuration")
    return int(round(float(str(val).rstrip("s")))) if val else None
