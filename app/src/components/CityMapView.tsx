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

// 실사(위성/항공사진) 베이스맵. 기본값은 키가 필요 없는 Esri World Imagery —
// 데모/개발용으로는 충분하지만 국내 정밀도는 브이월드·카카오 위성사진이 더 낫다.
// PRD 8번 기준 실 서비스 전환 시 VITE_SATELLITE_TILE_URL을 브이월드
// (예: https://api.vworld.kr/req/wmts/1.0.0/{API_KEY}/Satellite/{z}/{y}/{x}.jpeg)
// 또는 카카오/네이버 위성 타일로 교체. 이 세션 환경은 타일 서버 자체가
// 네트워크 정책으로 막혀 있어 여기서 직접 렌더링 확인은 못 했음 — 실제
// 인터넷이 열린 곳에서 npm run dev로 띄워서 확인 필요.
const SATELLITE_TILE_URL =
  (import.meta as { env?: Record<string, string> }).env?.VITE_SATELLITE_TILE_URL ??
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

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
        sources: {
          satellite: {
            type: "raster",
            tiles: [SATELLITE_TILE_URL],
            tileSize: 256,
            attribution: "Esri, Maxar, Earthstar Geographics (또는 설정된 타일 소스)",
          },
          buildings: { type: "geojson", data: toFeatureCollection([]) },
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "#e8e2d0" } },
          { id: "satellite", type: "raster", source: "satellite" },
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
              "fill-extrusion-opacity": 0.85,
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
