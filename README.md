# PropScope

AI 챗봇과 3D 건물 뷰어로 실제 임장(현장 답사) 전에 온라인에서 후보지를 좁히는 서비스. 개인 포트폴리오 규모 프로젝트.

- **지금 상태와 다음 할 일** → [`ROADMAP.md`](ROADMAP.md)
- **전략/요구사항 전체** → [`docs/PRD.md`](docs/PRD.md) (사업 전략 부록 포함)
- **3D 기술 스택 검증** → [`docs/technical-spike.md`](docs/technical-spike.md), 코드는 [`spike/3d-viewer/`](spike/3d-viewer/)
- **포트폴리오 내러티브** → [`docs/case-study.html`](docs/case-study.html)
- **동작하는 MVP 앱** (mock 데이터, 실제 a2ui 프로토콜) → [`app/`](app/) (실행 방법은 `app/README.md`), 검색 로직은 [`driver/`](driver/), UI 킷은 서브모듈 [`packages/a2ui-material-kit/`](packages/a2ui-material-kit/)

새 세션에서 이어서 작업한다면 `ROADMAP.md`부터 읽을 것.

## 클론 시 주의

서브모듈이 있어서 `git clone --recurse-submodules`로 받거나, 이미 클론했다면 `git submodule update --init`을 한 번 실행해야 `packages/a2ui-material-kit`이 채워진다.
