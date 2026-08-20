import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { parseQuery, searchBuildings, formatAssistantReply } from "./chatEngine.js";
import { buildSurface, type DriverState } from "./surface.js";

/**
 * "가짜 에이전트" — 실제 Claude API 대신 결정론적 로직이 render_surface를 호출한다.
 * MCP 프로토콜/서버/렌더링 경로는 전부 진짜다. 나중에 실 LLM으로 바꿀 때는
 * handleEvent() 안에서 검색 로직을 호출하는 부분만 Claude API 호출(도구 호출로
 * chatEngine의 함수들을 실행)로 바꾸면 되고, 이 파일의 MCP 연결/이벤트 루프
 * 구조는 그대로 재사용된다.
 */

const MCP_URL = process.env.MCP_URL ?? "http://localhost:8788/mcp";

interface ToolTextResult {
  content?: { type: string; text: string }[];
  isError?: boolean;
}

function textOf(result: ToolTextResult): string {
  const first = result.content?.[0];
  if (!first || first.type !== "text") throw new Error("unexpected MCP tool result shape");
  return first.text;
}

async function main() {
  const state: DriverState = { messages: [], results: [], selectedId: null };
  let lastInputValue = "";

  const client = new Client({ name: "propscope-driver", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  await client.connect(transport);
  console.log(`[driver] connected to MCP server at ${MCP_URL}`);

  const componentsResult = (await client.callTool({
    name: "list_components",
    arguments: {},
  })) as ToolTextResult;
  const catalog = JSON.parse(textOf(componentsResult));
  console.log(`[driver] catalog loaded (${catalog.components.length} components)`);

  async function render() {
    const surface = buildSurface(state);
    const result = (await client.callTool({
      name: "render_surface",
      arguments: { surface },
    })) as ToolTextResult;
    if (result.isError) {
      console.error("[driver] render_surface failed:", textOf(result));
    }
  }

  function runQuery(text: string) {
    const filters = parseQuery(text);
    const results = searchBuildings(filters);
    const reply = formatAssistantReply(filters, results);
    state.messages.push({ speaker: "user", text });
    state.messages.push({ speaker: "assistant", text: reply });
    state.results = results;
    state.selectedId = null;
  }

  function selectBuilding(id: string) {
    const building = state.results.find((b) => b.id === id);
    state.selectedId = id;
    if (building) {
      state.messages.push({ speaker: "assistant", text: `${building.name} 상세 정보를 지도/차트에 표시했어요.` });
    }
  }

  async function handleEvent(event: { nodeId: string; component: string; name: string; value?: unknown }) {
    console.log(`[driver] event: ${event.component}#${event.nodeId} ${event.name}`, event.value ?? "");

    if (event.nodeId === "chat-input" && event.name === "onChange") {
      if (typeof event.value === "string") lastInputValue = event.value;
      return; // 매 타이핑마다 다시 그릴 필요는 없음
    }

    if (event.nodeId === "send-btn" && event.name === "onClick") {
      if (lastInputValue.trim()) {
        runQuery(lastInputValue.trim());
        lastInputValue = "";
        await render();
      }
      return;
    }

    if (event.nodeId.startsWith("sugg-") && event.name === "onClick") {
      const idx = Number(event.nodeId.slice("sugg-".length));
      const { SUGGESTIONS } = await import("./surface.js");
      const text = SUGGESTIONS[idx];
      if (text) {
        runQuery(text);
        await render();
      }
      return;
    }

    // ListItem의 onSelect prop은 렌더러가 onClick도 같이 자동 연결하는데, ListItem
    // 컴포넌트 내부에서 {...rest} spread가 onClick={onSelect}보다 뒤에 와서 덮어써버림
    // (a2ui-material-kit 실측 동작 — 실제로는 onSelect가 아니라 onClick으로 도착함).
    if (event.nodeId.startsWith("res-") && event.name === "onClick") {
      selectBuilding(event.nodeId.slice("res-".length));
      await render();
      return;
    }

    // 지도(CityMapView)는 a2ui 서피스 밖의 호스트 네이티브 컴포넌트라, 호스트 앱이
    // 같은 /events 엔드포인트로 직접 이 모양({nodeId:"city-map", component:"CityMapView",
    // name:"onBuildingSelect", value:<id>})을 보낸다. await_event는 여기서도 그대로 받는다.
    if (event.nodeId === "city-map" && event.name === "onBuildingSelect" && typeof event.value === "string") {
      selectBuilding(event.value);
      await render();
      return;
    }
  }

  state.messages.push({
    speaker: "assistant",
    text: "안녕하세요. 원하는 지역·매물유형·예산을 말씀해주시면 후보 건물을 찾아드릴게요. (예: \"강남구 아파트 10억 이하\")",
  });
  await render();

  console.log("[driver] entering await_event loop");
  for (;;) {
    const result = (await client.callTool({
      name: "await_event",
      arguments: { timeoutMs: 25000 },
    })) as ToolTextResult;
    const payload = JSON.parse(textOf(result));
    if (payload.timedOut) continue;
    await handleEvent(payload);
  }
}

main().catch((err) => {
  console.error("[driver] fatal error:", err);
  process.exit(1);
});
