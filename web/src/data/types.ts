import type { FeatureCollection, LineString, Point } from "geojson";

export type Mode = "car" | "transit" | "diff";

export interface TripProps {
  tripId: string;
  originId: string;
  originPostcode: string;
  originName: string;
  mode: "car" | "transit";
  duration_sec: number;
  duration_min: number;
  static_duration_min?: number | null;
  distance_m: number;
  distance_km: number;
  arrival_iso?: string;
  departure_iso?: string;
  alt_count?: number;
  legs_summary?: string;
  legs?: TransitStep[];
  car_min?: number;
  transit_min?: number;
  diff_min?: number;
  abs_diff_min?: number;
  faster?: "car" | "transit" | "equal";
  transit_realistic?: boolean;
}

export interface TransitStep {
  mode: string;
  line?: string;
  vehicle?: string;
  duration_sec?: number | null;
  distance_m?: number | null;
  from?: string | null;
  to?: string | null;
}

export interface Origin {
  originId: string;
  postcode: string;
  name: string;
  lat: number | null;
  lng: number | null;
  geocode_status?: string;
  car_min: number | null;
  transit_min: number | null;
  diff_min: number | null;
  faster: "car" | "transit" | "equal" | null;
  transit_available: boolean;
  transit_realistic: boolean;
}

export interface Meta {
  destination: { name: string; lat: number; lng: number };
  target_date: string;
  arrival_local: string;
  arrival_utc: string;
  generated_utc: string;
  n_origins: number;
  route_api_calls: number;
  n_car_routes: number;
  n_transit_routes: number;
  n_no_transit: number;
  n_transit_unrealistic: number;
  diff_domain_min: number;
  candidate_count: number;
}

export type RoutesFC = FeatureCollection<LineString, TripProps>;
export type OriginsFC = FeatureCollection<Point, OriginPointProps>;

export interface OriginPointProps {
  originId: string;
  postcode: string;
  faster: string | null;
  car_min: number | null;
  transit_min: number | null;
  diff_min: number | null;
  transit_available: boolean;
  transit_realistic: boolean;
}
