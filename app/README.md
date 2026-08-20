# PropScope app (a2ui host)

React + Vite 프론트엔드. UI를 직접 그리지 않고, [`a2ui-material-kit`](../packages/a2ui-material-kit)의 `AgentUIRenderer`가 `driver/`(가짜 에이전트)가 만든 A2UI surface를 그대로 렌더링한다. 지도(`CityMapView`, MapLibre GL JS)와 건물 상세 뷰(`BuildingDetailPanel`, Three.js)는 a2ui 카탈로그에 없는 컴포넌트라 호스트가 직접 그리고, `driver/`가 surface 안에 심어둔 "ext-data" 노드에서 데이터를 읽어온다. 자세한 배경은 [`../ROADMAP.md`](../ROADMAP.md)와 `driver/src/surface.ts`의 주석 참고.

## 실행 (3개 프로세스 필요)

```sh
# 1) a2ui-material-kit이 아직 빌드 전이면
cd packages/a2ui-material-kit && npm install && npm run build && cd ../..

# 2) MCP 서버 (지도/드라이버가 붙는 실제 프로토콜 엔드포인트)
node packages/a2ui-material-kit/packages/mcp-server/dist/index.js --transport http --port 8787 --mcpPort 8788

# 3) 드라이버 ("가짜 에이전트" — 결정론적 로직이 render_surface를 호출)
cd driver && npm install && npm start

# 4) 프론트엔드
cd app && npm install && npm run dev
```

브라우저에서 `http://localhost:5173` 접속. 좌측이 a2ui가 그린 채팅/결과 목록, 우측이 지도+상세뷰.

## 지도 실사(위성/항공사진) 베이스맵

`CityMapView`는 기본적으로 키 없이 쓸 수 있는 Esri World Imagery를 raster 레이어로 깔고 그 위에 3D 건물을 압출한다. 다른 소스로 바꾸려면 `VITE_SATELLITE_TILE_URL` 환경변수에 `{z}/{x}/{y}` 템플릿 타일 URL을 넣으면 된다 (예: 브이월드 위성사진 API 키 발급 후 그 URL로 교체 — PRD `docs/PRD.md` 8번 참고).

**이 세션 환경에서는 확인 못 함**: 이 개발 컨테이너 자체가 지도 타일 서버 도메인에 대한 네트워크 접근이 정책으로 막혀 있어서(Esri, MapTiler, Google 전부 `CONNECT tunnel failed` 확인), 실사 타일이 실제로 로드되는지는 여기서 렌더링해볼 수 없었다. 코드는 넣어뒀지만 인터넷이 열린 환경에서 `npm run dev`로 띄워 직접 확인 필요.

## 알려진 사소한 이슈

- 콘솔에 `Unknown event handler property onAction` 경고가 뜬다 — `AgentUIRenderer`가 모든 노드에 이벤트 prop을 무조건 와이어링하는데, `TopAppBar`가 내부적으로 `<header>`에 그 prop을 그대로 넘겨서 나는 경고. 기능에는 영향 없음(a2ui-material-kit 쪽 이슈).
- Card처럼 컨테이너 역할인 노드도 클릭 이벤트가 자동으로 와이어링돼서, 자식 요소 클릭 시 DOM 버블링으로 부모 Card의 클릭 이벤트도 같이 `/events`로 전송된다. 드라이버가 인식 못 하는 nodeId는 그냥 무시하므로 기능상 문제는 없고 로그만 조금 더 찍힌다.
- 채팅 입력창은 전송 후 자동으로 비워지지 않는다 (TextField를 controlled로 만들면 매 타이핑마다 surface를 다시 그려야 해서 일부러 보류).
- **(실측으로 발견/수정됨)** `ListItem`의 `onSelect`는 실제로는 `onSelect`가 아니라 `onClick` 이벤트로 도착한다. 렌더러가 `onClick`과 `onSelect`를 둘 다 자동 연결하는데, `ListItem` 내부에서 `<li onClick={onSelect} {...rest}>`처럼 spread가 뒤에 와서 auto-wired `onClick`이 `onSelect`를 덮어쓰기 때문(a2ui-material-kit 쪽 이슈). `driver/src/index.ts`는 이미 `onClick` 기준으로 수정해뒀다.
