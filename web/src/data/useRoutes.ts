import { useEffect, useState } from "react";
import type { Meta, Origin, OriginsFC, RoutesFC } from "./types";

export interface RoutesData {
  routes: RoutesFC;
  meta: Meta;
  origins: Origin[];
  originsFC: OriginsFC;
}

const base = import.meta.env.BASE_URL;

function buildOriginsFC(origins: Origin[]): OriginsFC {
  return {
    type: "FeatureCollection",
    features: origins
      .filter((o) => o.lat != null && o.lng != null)
      .map((o) => ({
        type: "Feature",
        id: o.originId,
        properties: {
          originId: o.originId,
          postcode: o.postcode,
          faster: o.faster,
          car_min: o.car_min,
          transit_min: o.transit_min,
          diff_min: o.diff_min,
          transit_available: o.transit_available,
          transit_realistic: o.transit_realistic,
        },
        geometry: { type: "Point", coordinates: [o.lng as number, o.lat as number] },
      })),
  };
}

export function useRoutes() {
  const [data, setData] = useState<RoutesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [routes, meta, origins] = await Promise.all([
          fetch(`${base}data/routes.geojson`).then((r) => r.json() as Promise<RoutesFC>),
          fetch(`${base}data/meta.json`).then((r) => r.json() as Promise<Meta>),
          fetch(`${base}data/origins.json`).then((r) => r.json() as Promise<Origin[]>),
        ]);
        if (cancelled) return;
        setData({ routes, meta, origins, originsFC: buildOriginsFC(origins) });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error, loading: !data && !error };
}
