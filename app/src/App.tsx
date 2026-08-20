import { useEffect, useMemo, useState } from "react";
import { AgentUIRenderer, type A2UISurface, type A2UIEventHandler } from "material-a2ui";
import { postEvent, sanitizeEventValue, subscribeSurface } from "./lib/bridge";
import { CityMapView } from "./components/CityMapView";
import { BuildingDetailPanel } from "./components/BuildingDetailPanel";
import type { Building } from "./types";

/**
 * 이 컴포넌트가 렌더링하는 건 두 종류다:
 * 1) `surface`를 그대로 AgentUIRenderer에 넘긴 것 — 진짜 a2ui 프로토콜로 온
 *    채팅/결과 목록 UI. driver/(결정론적 "가짜 에이전트")가 이 surface를
 *    render_surface로 계속 갱신한다.
 * 2) CityMapView / BuildingDetailPanel — surface.nodes 안의 "ext-data" 고아
 *    노드에서 직접 읽은 데이터로 그리는 호스트 네이티브 컴포넌트. a2ui
 *    카탈로그에 지도/3D 컴포넌트가 없어서, AgentUIRenderer를 거치지 않고
 *    이 컴포넌트가 직접 데이터를 소비한다 (driver/src/surface.ts의 주석 참고).
 */
export function App() {
  const [surface, setSurface] = useState<A2UISurface | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => subscribeSurface(setSurface, setConnected), []);

  const onEvent: A2UIEventHandler = (event) => {
    postEvent({ ...event, value: sanitizeEventValue(event.value) });
  };

  const { buildings, selectedId } = useMemo(() => {
    const extData = surface?.nodes.find((n) => n.id === "ext-data");
    const props = (extData?.props ?? {}) as { buildings?: Building[]; selectedId?: string | null };
    return { buildings: props.buildings ?? [], selectedId: props.selectedId ?? null };
  }, [surface]);

  const selectedBuilding = buildings.find((b) => b.id === selectedId) ?? null;

  function handleMapSelect(id: string) {
    postEvent({ nodeId: "city-map", component: "CityMapView", name: "onBuildingSelect", value: id });
  }

  return (
    <div className="app-shell">
      <div className="app-shell__chat">
        <div className="connection-badge" data-connected={connected}>
          <span className="dot" /> {connected ? "에이전트 연결됨 (a2ui)" : "연결 대기 중…"}
        </div>
        {surface ? (
          <AgentUIRenderer surface={surface} onEvent={onEvent} />
        ) : (
          <p className="waiting">드라이버가 첫 화면을 그릴 때까지 기다리는 중…</p>
        )}
      </div>
      <div className="app-shell__spatial">
        <CityMapView buildings={buildings} selectedId={selectedId} onSelect={handleMapSelect} />
        <BuildingDetailPanel building={selectedBuilding} />
      </div>
    </div>
  );
}
