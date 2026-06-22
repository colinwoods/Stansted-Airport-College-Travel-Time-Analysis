"""Central configuration for the Stansted Airport College travel-times pipeline.

All paths are absolute and derived from the repo root so scripts can be run from
anywhere. Secrets come from the .env file at the repo root.
"""
from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

# --- Paths -----------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

ORIGINS_FILE = PROJECT_ROOT / "data" / "inputs" / "postcodes.csv"
GEOCODE_CACHE = PROJECT_ROOT / "data" / "cache" / "geocode.json"
RAW_ROUTES = PROJECT_ROOT / "data" / "raw" / "routes_raw.json"
SUMMARY_CSV = PROJECT_ROOT / "data" / "out" / "summary.csv"
WEB_DATA_DIR = PROJECT_ROOT / "web" / "public" / "data"

# --- Secrets ---------------------------------------------------------------
API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()

# --- Destination (fixed) ---------------------------------------------------
DESTINATION = {
    "name": "Stansted Airport College",
    "lat": 51.87615217641031,
    "lng": 0.21590254232830522,
}

# --- Target arrival --------------------------------------------------------
# A concrete, reproducible weekday. June is BST (UTC+1), so 09:00 local resolves
# to 08:00:00Z automatically via zoneinfo. Change TARGET_DATE for a different day.
LONDON = ZoneInfo("Europe/London")
# Must be a FUTURE weekday: traffic-aware car routing back-solves a departureTime, and
# the Routes API rejects a past departureTime (HTTP 400). run.py guards against this.
TARGET_DATE = "2026-06-23"          # Tuesday, term time
ARRIVAL_LOCAL_TIME = (9, 0)         # 09:00 local


def arrival_local() -> datetime:
    y, m, d = (int(x) for x in TARGET_DATE.split("-"))
    hh, mm = ARRIVAL_LOCAL_TIME
    return datetime(y, m, d, hh, mm, tzinfo=LONDON)


def arrival_utc_rfc3339() -> str:
    """09:00 local arrival expressed as RFC3339 UTC, e.g. 2026-06-23T08:00:00Z."""
    return arrival_local().astimezone(ZoneInfo("UTC")).strftime("%Y-%m-%dT%H:%M:%SZ")


# --- API behaviour ---------------------------------------------------------
ROUTES_ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes"
GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json"
MAX_WORKERS = 6
CAR_BACKSOLVE_ITERS = 3             # iterations to land the car arrival on ~09:00

# Transit journeys longer than this are treated as "no realistic 9am service"
# (the API can return absurd overnight itineraries). Kept in the data but flagged
# and excluded from the colour-scale domain so one outlier cannot wreck the scale.
MAX_REALISTIC_TRANSIT_MIN = 180

# Field masks (never use "*": it inflates cost and can bump the billing SKU).
CAR_FIELD_MASK = ",".join([
    "routes.duration",
    "routes.staticDuration",
    "routes.distanceMeters",
    "routes.polyline.encodedPolyline",
    "routes.legs.distanceMeters",
    "routes.legs.duration",
    "routes.legs.polyline.encodedPolyline",
])
TRANSIT_FIELD_MASK = ",".join([
    "routes.duration",
    "routes.distanceMeters",
    "routes.polyline.encodedPolyline",
    "routes.legs.distanceMeters",
    "routes.legs.duration",
    "routes.legs.polyline.encodedPolyline",
    "routes.legs.steps.distanceMeters",
    "routes.legs.steps.staticDuration",
    "routes.legs.steps.travelMode",
    "routes.legs.steps.transitDetails",
])
