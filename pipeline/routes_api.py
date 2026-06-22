"""Thin wrapper over the Google Routes API computeRoutes endpoint.

Two entry points:
  - route_car:     DRIVE with TRAFFIC_AWARE_OPTIMAL, back-solving departureTime so
                   the predicted arrival lands on ~09:00 (DRIVE has no arrive-by).
  - route_transit: TRANSIT with arrivalTime = 09:00 (the API's native arrive-by).

Retries with exponential backoff on HTTP 429 / 5xx and transient network errors.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import requests
from tenacity import (retry, retry_if_exception_type, stop_after_attempt,
                      wait_exponential)

import config

UTC = ZoneInfo("UTC")


class RetryableError(Exception):
    """Raised on 429 / 5xx so tenacity retries the request."""


def parse_duration(value: str | None) -> int | None:
    """Routes API durations come back as strings like '1234s'."""
    if not value:
        return None
    return int(round(float(str(value).rstrip("s"))))


def waypoint(geo: dict) -> dict:
    """Prefer place_id (most accurate); fall back to lat/lng."""
    if geo.get("place_id"):
        return {"placeId": geo["place_id"]}
    return {"location": {"latLng": {"latitude": geo["lat"], "longitude": geo["lng"]}}}


def _dest_waypoint() -> dict:
    return {"location": {"latLng": {
        "latitude": config.DESTINATION["lat"],
        "longitude": config.DESTINATION["lng"],
    }}}


@retry(
    retry=retry_if_exception_type((RetryableError, requests.exceptions.RequestException)),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(5),
    reraise=True,
)
def _post(body: dict, field_mask: str) -> dict:
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": config.API_KEY,
        "X-Goog-FieldMask": field_mask,
    }
    resp = requests.post(config.ROUTES_ENDPOINT, json=body, headers=headers, timeout=60)
    if resp.status_code == 429 or resp.status_code >= 500:
        raise RetryableError(f"{resp.status_code}: {resp.text[:200]}")
    if not resp.ok:
        raise RuntimeError(f"Routes API {resp.status_code}: {resp.text[:500]}")
    return resp.json()


def _rfc3339(dt: datetime) -> str:
    return dt.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def route_car(origin_geo: dict, arrival: datetime) -> dict:
    """Back-solve departureTime so predicted (traffic-aware) arrival ~= 09:00.

    Returns {"status", "route", "departure", "arrival", "duration_sec", "calls"}.
    """
    origin_wp = waypoint(origin_geo)
    dest_wp = _dest_waypoint()
    departure = arrival - timedelta(hours=1)  # initial guess: leave 1h before arrival
    route = None
    payload: dict = {}
    duration_sec = 0
    residual_sec = 0
    calls = 0

    # Fixed-point back-solve. We always REPORT the last triple we actually measured
    # (this departure, its API duration, and arrival = departure + duration) so the
    # reported departure/duration/arrival are mutually consistent and the arrival is a
    # real prediction (it may legitimately differ from 09:00 when traffic doesn't converge).
    for i in range(config.CAR_BACKSOLVE_ITERS):
        body = {
            "origin": origin_wp,
            "destination": dest_wp,
            "travelMode": "DRIVE",
            "routingPreference": "TRAFFIC_AWARE_OPTIMAL",
            "departureTime": _rfc3339(departure),
            "trafficModel": "BEST_GUESS",
            "computeAlternativeRoutes": True,
            "polylineQuality": "OVERVIEW",
        }
        payload = _post(body, config.CAR_FIELD_MASK)
        calls += 1
        routes = payload.get("routes") or []
        if not routes:
            return {"status": "ZERO_RESULTS", "route": None, "alt_count": 0,
                    "departure": _rfc3339(departure), "arrival": None, "duration_sec": None,
                    "converged": False, "residual_sec": None, "calls": calls}
        route = routes[0]
        duration_sec = parse_duration(route.get("duration")) or 0
        residual_sec = int((departure + timedelta(seconds=duration_sec) - arrival).total_seconds())
        # converged, or out of iterations: keep THIS measurement
        if abs(residual_sec) < 60 or i == config.CAR_BACKSOLVE_ITERS - 1:
            break
        departure = arrival - timedelta(seconds=duration_sec)  # next guess

    achieved_arrival = departure + timedelta(seconds=duration_sec)
    return {
        "status": "OK",
        "route": route,
        "alt_count": len(payload.get("routes", [])),
        "departure": _rfc3339(departure),
        "arrival": _rfc3339(achieved_arrival),
        "duration_sec": duration_sec,
        "converged": abs(residual_sec) < 60,
        "residual_sec": residual_sec,
        "calls": calls,
    }


def route_transit(origin_geo: dict, arrival: datetime) -> dict:
    """TRANSIT with native arrivalTime. Returns same shape as route_car."""
    body = {
        "origin": waypoint(origin_geo),
        "destination": _dest_waypoint(),
        "travelMode": "TRANSIT",
        "arrivalTime": _rfc3339(arrival),
        "transitPreferences": {
            "allowedTravelModes": ["BUS", "SUBWAY", "TRAIN", "LIGHT_RAIL", "RAIL"],
            "routingPreference": "FEWER_TRANSFERS",
        },
        "computeAlternativeRoutes": True,
    }
    payload = _post(body, config.TRANSIT_FIELD_MASK)
    routes = payload.get("routes") or []
    if not routes:
        return {"status": "ZERO_RESULTS", "route": None, "alt_count": 0,
                "arrival": _rfc3339(arrival), "duration_sec": None, "calls": 1}
    route = routes[0]
    return {
        "status": "OK",
        "route": route,
        "alt_count": len(routes),
        "arrival": _rfc3339(arrival),
        "duration_sec": parse_duration(route.get("duration")),
        "calls": 1,
    }
