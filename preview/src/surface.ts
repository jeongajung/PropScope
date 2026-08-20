import type { A2UINode, A2UISurface, Building } from "./types.js";

export interface DriverState {
  messages: { speaker: "user" | "assistant"; text: string }[];
  results: Building[];
  selectedId: string | null;
}

const SUGGESTIONS = ["강남구 아파트 12억 이하", "마포구 오피스텔", "20평대 아파트"];

/**
 * A2UI 서피스는 항상 이 함수로 "전체 다시 그리기(render_surface)"로 구성한다.
 * update_nodes로 부분 갱신하는 게 더 효율적이지만, 이 규모의 데모에서는
 * 전체 재구성이 훨씬 단순하고 상태 불일치 버그가 없다 — 의도적 트레이드오프.
 */
export function buildSurface(state: DriverState): A2UISurface {
  const nodes: A2UINode[] = [];

  nodes.push({
    id: "topbar",
    component: "TopAppBar",
    props: { title: "PropScope 임장 어시스턴트", variant: "small" },
  });

  const msgIds = state.messages.map((m, i) => {
    const id = `msg-${i}`;
    nodes.push({
      id,
      component: "ListItem",
      props: { headline: m.text, supportingText: m.speaker === "user" ? "나" : "AI 어시스턴트" },
    });
    return id;
  });
  nodes.push({ id: "convo", component: "List", children: msgIds });

  const suggIds = SUGGESTIONS.map((s, i) => {
    const id = `sugg-${i}`;
    nodes.push({ id, component: "Chip", props: { variant: "suggestion", children: s } });
    return id;
  });
  nodes.push({ id: "quick-row", component: "Card", props: { variant: "outlined" }, children: suggIds });

  nodes.push({
    id: "chat-input",
    component: "TextField",
    props: { variant: "outlined", label: "메시지 입력", placeholder: "예: 강남구 아파트 10억 이하" },
  });
  nodes.push({ id: "send-btn", component: "Button", props: { variant: "filled", children: "보내기" } });
  nodes.push({
    id: "compose-row",
    component: "Card",
    props: { variant: "outlined" },
    children: ["chat-input", "send-btn"],
  });

  nodes.push({
    id: "results-heading",
    component: "Text",
    props: { variant: "titleMedium", children: `검색 결과 ${state.results.length}건` },
  });

  const resultIds = state.results.map((b) => {
    const id = `res-${b.id}`;
    nodes.push({
      id,
      component: "ListItem",
      props: {
        headline: `${b.name} · ${b.type}`,
        supportingText: `${b.district} · ${b.areaPyeong}평 · 매매 ${b.priceEok}억 · 전세 ${b.jeonseEok}억`,
      },
    });
    return id;
  });
  nodes.push({ id: "results-list", component: "List", children: resultIds });

  // "ext-data"는 root에서 도달 불가능한 고아 노드다 — AgentUIRenderer는 root부터
  // 그래프를 순회해 그리기 때문에 절대 화면에 렌더링되지 않지만, surface.nodes
  // 배열 자체는 그대로 SSE로 브라우저에 전달된다. 카탈로그에 지도/3D 같은
  // "컴포넌트가 아닌" 데이터를 표현할 방법이 없어서, 호스트 앱이 지도/상세뷰를
  // 그리는 데 필요한 원본 데이터(좌표, 추이 등)를 여기 실어 보낸다. 호스트는
  // AgentUIRenderer로는 이 노드를 그리지 않고, surface.nodes에서 직접 읽어
  // CityMapView/BuildingDetailPanel에 넘긴다.
  nodes.push({
    id: "ext-data",
    component: "Text",
    props: {
      buildings: state.results,
      selectedId: state.selectedId,
    },
  });

  return {
    root: "root",
    nodes: [
      {
        id: "root",
        component: "Card",
        props: { variant: "filled" },
        children: ["topbar", "convo", "quick-row", "compose-row", "results-heading", "results-list"],
      },
      ...nodes,
    ],
  };
}

export { SUGGESTIONS };
