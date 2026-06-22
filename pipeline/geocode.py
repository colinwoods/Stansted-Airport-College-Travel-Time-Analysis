"""Forward-geocode UK postcodes to lat/lng + place_id, with an on-disk cache.

Done once up front: plotting uses lat/lng, routing uses the place_id (Google's
most accurate waypoint form). Re-runs read the cache and skip the API.
"""
from __future__ import annotations

import json

import requests

import config


def _load_cache() -> dict:
    if config.GEOCODE_CACHE.exists():
        return json.loads(config.GEOCODE_CACHE.read_text(encoding="utf-8"))
    return {}


def _save_cache(cache: dict) -> None:
    config.GEOCODE_CACHE.parent.mkdir(parents=True, exist_ok=True)
    config.GEOCODE_CACHE.write_text(json.dumps(cache, indent=2), encoding="utf-8")


def _geocode_one(postcode: str) -> dict:
    params = {
        "address": postcode,
        "components": "country:GB",
        "key": config.API_KEY,
    }
    r = requests.get(config.GEOCODE_ENDPOINT, params=params, timeout=30)
    r.raise_for_status()
    payload = r.json()
    status = payload.get("status")
    if status != "OK" or not payload.get("results"):
        return {"status": status, "lat": None, "lng": None, "place_id": None,
                "formatted_address": None, "error": payload.get("error_message")}
    top = payload["results"][0]
    loc = top["geometry"]["location"]
    return {
        "status": "OK",
        "lat": loc["lat"],
        "lng": loc["lng"],
        "place_id": top.get("place_id"),
        "formatted_address": top.get("formatted_address"),
    }


def geocode_postcodes(postcodes: list[str]) -> dict[str, dict]:
    """Return {postcode: {lat, lng, place_id, formatted_address, status}}.

    Only calls the Geocoding API for postcodes missing from the cache.
    """
    cache = _load_cache()
    new_calls = 0
    for pc in postcodes:
        if pc in cache and cache[pc].get("status") == "OK":
            continue
        result = _geocode_one(pc)
        cache[pc] = result
        new_calls += 1
        flag = "ok" if result["status"] == "OK" else f"FAILED ({result['status']})"
        print(f"  geocode {pc:>9}  {flag}")
        if new_calls % 10 == 0:
            _save_cache(cache)  # checkpoint
    _save_cache(cache)
    print(f"  geocoding: {new_calls} new API call(s), {len(postcodes)} total postcodes")
    return {pc: cache[pc] for pc in postcodes}
