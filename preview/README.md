# PropScope 정적 프리뷰 (백엔드 없음)

`app/` + `driver/`는 실제로는 3개 프로세스(MCP 서버, 드라이버, 프론트)로 나뉘어 진짜 a2ui 프로토콜(HTTP+SSE)로 통신한다. 이 디렉토리는 그 둘을 하나로 합쳐, **백엔드 없이 브라우저 안에서만 완결되는 버전**이다 — claude.ai 아티팩트처럼 외부 서버에 접속할 수 없는 곳에 공유용으로 배포할 때 쓴다.

- `AgentUIRenderer`, Material 컴포넌트, `CityMapView`(MapLibre), `BuildingDetailPanel`(Three.js), 검색 로직(`chatEngine.ts`/`mockBuildings.ts`/`surface.ts`)은 `app/`·`driver/`와 동일한 코드
- 다른 건 딱 하나: `App.tsx`가 `driver/src/index.ts`의 `handleEvent` 로직을 MCP 클라이언트 호출 대신 **직접 함수 호출**로 실행한다 (네트워크 왕복 없음)
- `vite-plugin-singlefile`로 빌드하면 JS/CSS가 전부 인라인된 단일 `dist/index.html`이 나온다 (외부 리소스는 Google Fonts뿐)

## 빌드

```sh
cd packages/a2ui-material-kit && npm install && npm run build && cd ../..   # kit 빌드가 안 돼있으면
cd preview && npm install && npm run build
# dist/index.html을 그대로 브라우저로 열거나 정적 호스팅에 올리면 됨
```

## 주의

`app/`나 `driver/`의 검색 로직·UI를 바꾸면 이 디렉토리의 파일들(`src/chatEngine.ts`, `src/mockBuildings.ts`, `src/surface.ts`, `src/components/*`)도 수동으로 다시 복사해야 한다 — 자동 동기화되지 않는다. 실 API 연동 후에는 이 프리뷰가 필요 없어질 가능성이 높다(실 백엔드를 배포하면 `app/`을 그대로 쓰면 되므로).
