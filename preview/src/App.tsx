import { useMemo, useRef, useState } from "react";
import { AgentUIRenderer, type A2UIEventHandler } from "material-a2ui";
import { parseQuery, searchBuildings, formatAssistantReply } from "./chatEngine";
import { buildSurface, SUGGESTIONS, type DriverState } from "./surface";
import { CityMapView } from "./components/CityMapView";
import { BuildingDetailPanel } from "./components/BuildingDetailPanel";
import type { A2UISurface, Building } from "./types";

/**
 * 이 파일은 저장소의 `driver/src/index.ts` + `app/src/App.tsx`를 하나로 합친
 * "정적 프리뷰" 버전이다. 실제 리포에서는 이 둘이 별도 프로세스이고 진짜 MCP
 * 프로토콜(HTTP+SSE)로 통신하지만, claude.ai 아티팩트는 외부 백엔드에 접속할
 * 수 없어서 같은 결정론적 로직을 브라우저 안에서 직접 호출한다.
 * AgentUIRenderer, Material 컴포넌트, MapLibre/Three.js 뷰, 검색 로직은
 * 리포와 100% 동일 — 바뀐 건 "MCP 서버를 거치느냐, 함수 호출로 바로 가느냐" 뿐이다.
 */
function initialState(): DriverState {
  return {
    messages: [
      {
        speaker: "assistant",
        text: '안녕하세요. 원하는 지역·매물유형·예산을 말씀해주시면 후보 건물을 찾아드릴게요. (예: "강남구 아파트 10억 이하")',
      },
    ],
    results: [],
    selectedId: null,
  };
}

export function App() {
  const stateRef = useRef<DriverState>(initialState());
  const lastInputRef = useRef("");
  const [surface, setSurface] = useState<A2UISurface>(() => buildSurface(stateRef.current));

  function render() {
    setSurface(buildSurface({ ...stateRef.current, messages: [...stateRef.current.messages] }));
  }

  function runQuery(text: string) {
    const filters = parseQuery(text);
    const results = searchBuildings(filters);
    const reply = formatAssistantReply(filters, results);
    stateRef.current.messages.push({ speaker: "user", text });
    stateRef.current.messages.push({ speaker: "assistant", text: reply });
    stateRef.current.results = results;
    stateRef.current.selectedId = null;
  }

  function selectBuilding(id: string) {
    const building = stateRef.current.results.find((b) => b.id === id);
    stateRef.current.selectedId = id;
    if (building) {
      stateRef.current.messages.push({
        speaker: "assistant",
        text: `${building.name} 상세 정보를 지도/차트에 표시했어요.`,
      });
    }
  }

  const onEvent: A2UIEventHandler = (event) => {
    if (event.nodeId === "chat-input" && event.name === "onChange") {
      const value = (event.value as { target?: { value?: string } } | undefined)?.target?.value;
      if (typeof value === "string") lastInputRef.current = value;
      return;
    }
    if (event.nodeId === "send-btn" && event.name === "onClick") {
      if (lastInputRef.current.trim()) {
        runQuery(lastInputRef.current.trim());
        lastInputRef.current = "";
        render();
      }
      return;
    }
    if (event.nodeId.startsWith("sugg-") && event.name === "onClick") {
      const idx = Number(event.nodeId.slice("sugg-".length));
      const text = SUGGESTIONS[idx];
      if (text) {
        runQuery(text);
        render();
      }
      return;
    }
    // ListItem의 onSelect prop은 렌더러가 onClick도 같이 자동 연결하는데, ListItem
    // 컴포넌트 내부에서 {...rest} spread가 onClick={onSelect}보다 뒤에 와서 덮어써버림
    // (a2ui-material-kit의 실측된 동작 — 실제로는 onSelect가 아니라 onClick으로 도착함).
    if (event.nodeId.startsWith("res-") && event.name === "onClick") {
      selectBuilding(event.nodeId.slice("res-".length));
      render();
      return;
    }
  };

  function handleMapSelect(id: string) {
    selectBuilding(id);
    render();
  }

  const { buildings, selectedId } = useMemo(() => {
    const extData = surface.nodes.find((n) => n.id === "ext-data");
    const props = (extData?.props ?? {}) as { buildings?: Building[]; selectedId?: string | null };
    return { buildings: props.buildings ?? [], selectedId: props.selectedId ?? null };
  }, [surface]);

  const selectedBuilding = buildings.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="preview-shell">
      <div className="preview-badge">
        PREVIEW — 백엔드 없이 브라우저에서 직접 동작 (실제 리포는 MCP 서버+드라이버 프로세스로 분리됨)
      </div>
      <div className="app-shell">
        <div className="app-shell__chat">
          <div className="connection-badge" data-connected="true">
            <span className="dot" /> a2ui (in-browser)
          </div>
          <AgentUIRenderer surface={surface} onEvent={onEvent} />
        </div>
        <div className="app-shell__spatial">
          <CityMapView buildings={buildings} selectedId={selectedId} onSelect={handleMapSelect} />
          <BuildingDetailPanel building={selectedBuilding} />
        </div>
      </div>
    </div>
  );
}
