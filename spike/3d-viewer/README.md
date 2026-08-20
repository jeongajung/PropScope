# PropScope 3D 스택 스파이크

PRD(`docs/PRD.md`) 9번 항목에서 제안한 하이브리드 3D 구조 — **(1) 지도 기반 블록/도시 뷰 + (2) 커스텀 건물 상세 뷰** — 가 기술적으로 동작하는지 확인하기 위한 최소 PoC입니다.

이 스파이크는 이 개발 환경의 네트워크 정책상 외부 지도 타일 서버/CDN에 접근할 수 없어, **로컬 합성(synthetic) 데이터만으로** 두 렌더링 엔진의 핵심 메커니즘(3D 압출, 카메라 인터랙션, 클릭 → 정보 패널, 화면 간 전환)을 검증하는 데 집중했습니다. 실제 지도 타일/공공데이터 연동은 별도로 검증이 필요합니다 (자세한 내용은 `docs/technical-spike.md` 참고).

## 구성

- `city-view.html` / `src/city-view.js` — **MapLibre GL JS**로 합성 건물 풋프린트를 `fill-extrusion`으로 3D 압출. 외부 타일 서버 없이 로컬 GeoJSON만 사용.
- `building-detail.html` / `src/building-detail.js` — **Three.js**로 선택된 건물의 커스텀 매스 모델(박스 형태) + 주변 컨텍스트 건물, OrbitControls, 가격 추이 스파크라인.
- `src/sample-buildings.js` — 강남역 인근 좌표를 기준으로 생성한 합성 건물 12개 (실제 지적/실거래 데이터 아님).

## 실행

```bash
npm install
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드 (번들 크기 확인용)
npm run preview   # 빌드 결과 미리보기
```

`index.html`에서 두 데모로 이동할 수 있습니다.
