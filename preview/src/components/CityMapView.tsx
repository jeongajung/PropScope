import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Building } from "../types";

interface CityMapViewProps {
  buildings: Building[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TYPE_COLOR: Record<string, string> = {
  아파트: "#2c6e7f",
  오피스텔: "#9a7830",
};
const SELECTED_COLOR = "#b23b2e";

function toFeatureCollection(buildings: Building[]) {
  return {
    type: "FeatureCollection" as const,
    features: buildings.map((b) => {
      const w = 0.00025;
      const h = 0.00025;
      return {
        type: "Feature" as const,
        id: b.id,
        geometry: {
          type: "Polygon" as const,
          coordinates: [
            [
              [b.lng - w, b.lat - h],
              [b.lng + w, b.lat - h],
              [b.lng + w, b.lat + h],
              [b.lng - w, b.lat + h],
              [b.lng - w, b.lat - h],
            ],
          ],
        },
        properties: { id: b.id, type: b.type, heightMeters: b.floors * 3.1 },
      };
    }),
  };
}

// 지도 레이어는 MapLibre GL JS(오픈소스, Mapbox GL JS 호환 포크) — 근거는
// docs/technical-spike.md 참고. 여기서도 외부 타일 서버 없이 로컬 GeoJSON만 사용.
export function CityMapView({ buildings, selectedId, onSelect }: CityMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: { buildings: { type: "geojson", data: toFeatureCollection([]) } },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "#e8e2d0" } },
          {
            id: "buildings-3d",
            type: "fill-extrusion",
            source: "buildings",
            paint: {
              "fill-extrusion-color": [
                "match",
                ["get", "type"],
                "아파트",
                TYPE_COLOR["아파트"],
                "오피스텔",
                TYPE_COLOR["오피스텔"],
                "#8a8570",
              ],
              "fill-extrusion-height": ["get", "heightMeters"],
              "fill-extrusion-opacity": 0.92,
            },
          },
        ],
      },
      center: [127.02, 37.52],
      zoom: 11,
      pitch: 50,
      bearing: -12,
      antialias: true,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.on("load", () => {
      map.on("click", "buildings-3d", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      });
      map.on("mouseenter", "buildings-3d", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "buildings-3d", () => (map.getCanvas().style.cursor = ""));
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource("buildings") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData(toFeatureCollection(buildings) as never);
      if (buildings.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        buildings.forEach((b) => bounds.extend([b.lng, b.lat]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 500 });
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [buildings]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.setPaintProperty("buildings-3d", "fill-extrusion-color", [
      "case",
      ["==", ["get", "id"], selectedId ?? "__none__"],
      SELECTED_COLOR,
      ["match", ["get", "type"], "아파트", TYPE_COLOR["아파트"], "오피스텔", TYPE_COLOR["오피스텔"], "#8a8570"],
    ]);
  }, [selectedId]);

  return <div ref={containerRef} className="city-map" />;
}
