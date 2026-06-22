import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  ScaleControl,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "@vis.gl/react-maplibre";
import { useApp } from "../state/AppState";
import { fmtGap } from "../lib/format";
import type { Mode } from "../data/types";
import {
  CASING_LAYER_ID,
  LINE_LAYER_ID,
  SOURCE_ID,
  casingLayout,
  casingPaint,
  filterFor,
  lineLayout,
  linePaint,
} from "./layerStyles";

const BASEMAP = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

type LngLatBounds = [[number, number], [number, number]];

export default function MapView({
  modeOverride,
  main = true,
}: {
  modeOverride?: Mode;
  main?: boolean;
}) {
  const {
    data,
    mode: globalMode,
    selectedTripId,
    setSelectedTripId,
    hoveredTripId,
    setHoveredTripId,
    printMode,
  } = useApp();
  const mode = modeOverride ?? globalMode;
  const mapRef = useRef<MapRef | null>(null);
  const [labelBeforeId, setLabelBeforeId] = useState<string | undefined>(undefined);
  const [styleReady, setStyleReady] = useState(false);
  const [cursor, setCursor] = useState<string>("");
  const prevSelected = useRef<string | null>(null);
  const prevHovered = useRef<string | null>(null);

  const routes = data?.routes;
  const originsFC = data?.originsFC;
  const meta = data?.meta;
  const domain = meta?.diff_domain_min ?? 60;

  // Fit to the catchment (all origins + the college) once data is ready.
  const bounds = useMemo<LngLatBounds | null>(() => {
    if (!originsFC || !meta) return null;
    let minX = meta.destination.lng, minY = meta.destination.lat;
    let maxX = minX, maxY = minY;
    for (const f of originsFC.features) {
      const [x, y] = (f.geometry as GeoJSON.Point).coordinates;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return [[minX, minY], [maxX, maxY]];
  }, [originsFC, meta]);

  // per-trip bounding box, so selecting a row can frame that single journey
  // (plain record — the maplibre `Map` import shadows the global Map constructor)
  const tripBBox = useMemo(() => {
    const m: Record<string, LngLatBounds> = {};
    if (!routes) return m;
    for (const f of routes.features) {
      const coords = (f.geometry as GeoJSON.LineString).coordinates;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [x, y] of coords) {
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      m[f.properties.tripId] = [[minX, minY], [maxX, maxY]];
    }
    return m;
  }, [routes]);

  // top modal-shift candidates (smallest car advantage) — called out on the map in
  // diff mode so the answer is obvious at a glance and survives into print
  const candidates = useMemo(() => {
    if (!data || mode !== "diff") return [];
    return data.origins
      .filter((o) => o.transit_realistic && o.lat != null && o.diff_min != null)
      .sort((a, b) => (b.diff_min as number) - (a.diff_min as number))
      .slice(0, 5);
  }, [data, mode]);

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (main && import.meta.env.DEV) (window as unknown as { __map: unknown }).__map = map;
    // place route layers beneath the basemap's labels for a clean cartographic read
    const firstSymbol = map.getStyle().layers?.find((l) => l.type === "symbol");
    if (firstSymbol) setLabelBeforeId(firstSymbol.id);
    if (bounds) map.fitBounds(bounds, { padding: 64, duration: 0 });
    setStyleReady(true); // re-assert any pending selection/hover once the style is live
  }, [bounds, main]);

  // feature-state: selection
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.isStyleLoaded()) return;
    const setState = (id: string | null, on: boolean) => {
      if (id) map.setFeatureState({ source: SOURCE_ID, id }, { selected: on });
    };
    if (prevSelected.current && prevSelected.current !== selectedTripId)
      setState(prevSelected.current, false);
    setState(selectedTripId, true);
    prevSelected.current = selectedTripId;
  }, [selectedTripId, mode, data, styleReady]);

  // feature-state: hover
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.isStyleLoaded()) return;
    if (prevHovered.current && prevHovered.current !== hoveredTripId)
      map.setFeatureState({ source: SOURCE_ID, id: prevHovered.current }, { hover: false });
    if (hoveredTripId)
      map.setFeatureState({ source: SOURCE_ID, id: hoveredTripId }, { hover: true });
    prevHovered.current = hoveredTripId;
  }, [hoveredTripId, styleReady]);

  // pan/zoom to the selected journey's extent (main map only — driven by row + map clicks)
  useEffect(() => {
    if (!main) return;
    const map = mapRef.current?.getMap();
    if (!map || !selectedTripId) return;
    const bb = tripBBox[selectedTripId];
    if (bb)
      map.fitBounds(bb, {
        padding: { top: 80, right: 300, bottom: 110, left: 80 },
        duration: 750,
        maxZoom: 12.5,
      });
  }, [selectedTripId, main, tripBBox]);

  // keep the canvas correctly sized when the print layout collapses the panel
  useEffect(() => {
    const id = requestAnimationFrame(() => mapRef.current?.getMap()?.resize());
    return () => cancelAnimationFrame(id);
  }, [printMode]);

  const onClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      setSelectedTripId(f ? (f.id as string) ?? f.properties?.tripId ?? null : null);
    },
    [setSelectedTripId],
  );

  const onMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const id = f ? ((f.id as string) ?? f.properties?.tripId ?? null) : null;
      setCursor(id ? "pointer" : "");
      setHoveredTripId(id);
    },
    [setHoveredTripId],
  );

  const onMouseLeave = useCallback(() => {
    setCursor("");
    setHoveredTripId(null);
  }, [setHoveredTripId]);

  if (!routes || !meta || !originsFC) return null;

  return (
    <Map
      ref={mapRef}
      mapStyle={BASEMAP}
      initialViewState={{ longitude: meta.destination.lng, latitude: meta.destination.lat, zoom: 9 }}
      interactiveLayerIds={[LINE_LAYER_ID]}
      onLoad={onLoad}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      cursor={cursor}
      canvasContextAttributes={{ preserveDrawingBuffer: true }}
      attributionControl={false}
      style={{ position: "absolute", inset: 0 }}
    >
      <ScaleControl position="bottom-left" unit="metric" />

      <Source id={SOURCE_ID} type="geojson" data={routes} promoteId="tripId">
        <Layer
          id={CASING_LAYER_ID}
          type="line"
          beforeId={labelBeforeId}
          filter={filterFor(mode)}
          layout={casingLayout(mode)}
          paint={casingPaint(mode)}
        />
        <Layer
          id={LINE_LAYER_ID}
          type="line"
          beforeId={labelBeforeId}
          filter={filterFor(mode)}
          layout={lineLayout(mode)}
          paint={linePaint(mode, domain)}
        />
      </Source>

      <Source id="origins" type="geojson" data={originsFC} promoteId="originId">
        <Layer
          id="origins-dot"
          type="circle"
          beforeId={labelBeforeId}
          paint={{
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 2, 12, 3.6],
            "circle-color": "#aebcc6",
            "circle-opacity": 0.4,
            "circle-stroke-color": "#11161b",
            "circle-stroke-width": 1,
          }}
        />
      </Source>

      {candidates.map((c, i) => {
        const tripId = `${c.originId}-car`;
        const active = selectedTripId === tripId || hoveredTripId === tripId;
        return (
          <Marker key={c.originId} longitude={c.lng as number} latitude={c.lat as number} anchor="center">
            <button
              className={["map-marker cand-marker", active && "is-active"].filter(Boolean).join(" ")}
              aria-label={`${c.postcode}: public transport ${Math.abs(c.diff_min ?? 0)} min slower than driving`}
              onClick={() => setSelectedTripId(tripId)}
              onMouseEnter={() => setHoveredTripId(tripId)}
              onMouseLeave={() => setHoveredTripId(null)}
            >
              <span className="cand-marker__dot">{i + 1}</span>
              <span className="map-marker__label">
                {c.postcode} <span className="cand-marker__gap">{fmtGap(c.diff_min)}</span>
              </span>
            </button>
          </Marker>
        );
      })}

      <Marker longitude={meta.destination.lng} latitude={meta.destination.lat} anchor="center">
        <div className="map-marker dest-marker">
          <span className="dest-marker__ring" />
          <span className="map-marker__label">{meta.destination.name}</span>
        </div>
      </Marker>
    </Map>
  );
}
