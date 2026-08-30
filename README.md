# Growth Time OS

성격이 다른 자기계발 작업을 하나의 카드 흐름으로 관리하는 정적 웹앱입니다.

핵심 목표는 사용자가 매일 `무엇을 해야 하지?`라고 판단하는 과정을 없애는 것입니다.

```text
지금 카드 열기
→ 지정된 위치 열기
→ 첫 행동 실행
→ 완료 또는 막힘 표시
→ 다음 카드 자동 승격
```

## 현재 MVP

- 프로젝트와 기본 실행 환경 생성
- 여러 장의 카드 사슬 생성
- 전역 `NOW` 최대 1장, `NEXT` 최대 3장 보장
- NOW 카드 단독 실행 화면과 시작 기록
- 완료 증거·집중시간 기록 후 다음 카드 자동 승격
- 우회 행동도 불가능한 카드의 `WAITING` 이동과 다음 카드 자동 승격
- WAITING 카드 복귀, NEXT 순서 조정, 카드 인계 정보 수정
- 최근 7일 시작률·완료 산출물·집중시간 요약
- 브라우저 `localStorage` 자동 보존

하루가 지나거나 앱을 열지 않아도 NOW 카드와 실행 순서는 바뀌지 않습니다.

## 기술 스택

빌드 없이 GitHub Pages가 저장소 파일을 그대로 제공하도록 구성했습니다.

- 표준 Web Components와 Shadow DOM
- 브라우저 네이티브 ES Modules
- HTML/CSS/JavaScript
- `localStorage`
- Node.js 내장 테스트 러너
- GitHub Pages `main / (root)` 정적 서빙

각 컴포넌트는 한 `.js` 파일 안에 HTML 템플릿, 동작, scoped CSS를 함께 둡니다.

```text
src/components/
├── growth-time-app.js   # 상태 소유, 화면 조합, 저장
├── app-header.js        # 해시 기반 정적 탐색
├── now-card-view.js     # NOW 단독 실행과 완료·대기 처리
├── planning-view.js     # 프로젝트, 카드 사슬, NEXT·WAITING 관리
└── review-view.js       # 7일 요약과 완료 증거
```

카드 상태 전이와 저장은 UI와 분리되어 있습니다.

```text
src/domain.js   # 상태 전이와 불변조건
src/storage.js  # localStorage 저장·복구
src/ui.js       # 안전한 템플릿 보조 함수
```

외부 프레임워크, 런타임 CDN, 번들러, 컴파일 결과물은 없습니다.

## 로컬 실행

Node.js 20 이상이 필요합니다. 패키지 설치나 빌드는 필요하지 않습니다.

```bash
npm run serve
```

브라우저에서 [http://localhost:4173](http://localhost:4173)을 엽니다.

정적 서버를 직접 실행해도 같습니다.

```bash
node scripts/serve.mjs
```

## 테스트

```bash
npm test
```

테스트는 NOW 단일성, NEXT 상한, 프로젝트 간 전역 순서, 완료·대기 자동 승격, 대기 복귀, 중복 완료 방지, 7일 집계, 로컬 저장 복구를 검증합니다.

## GitHub Pages

이 저장소는 Public이며 루트 `index.html`을 진입점으로 사용하고 `.nojekyll`을 포함합니다. Pages 소스는 `main / (root)`로 설정되어 이후 `main` 푸시가 정적 사이트에 바로 반영됩니다.

1. `Settings → Pages`로 이동합니다.
2. `Build and deployment`의 Source를 `Deploy from a branch`로 선택합니다.
3. Branch를 `main`, 폴더를 `/(root)`로 선택하고 저장합니다.

별도 빌드나 `dist` 브랜치는 필요하지 않습니다. 배포 주소는 [https://byh020907.github.io/growth-time-os/](https://byh020907.github.io/growth-time-os/)입니다.

## 제품 원칙

- `NOW`는 시스템 전체에서 최대 한 장입니다.
- 프로젝트가 달라도 실행 순서는 하나의 전역 큐를 사용합니다.
- 카드에는 이어받을 위치, 첫 행동, 완료 조건, 검증 방법, 우회 행동을 포함합니다.
- 하루를 놓쳐도 기존 NOW와 순서를 유지합니다.
- 우선순위와 작업 순서는 매일이 아니라 카드 사슬을 만들 때 정합니다.
- 시간 투입보다 결과 증거와 다음 행동을 남깁니다.
- 알림·연속 배지보다 시작 마찰과 선택지 제거를 우선합니다.

## 설계 문서

- [MVP 요구사항과 결정](docs/mvp-decisions.ko.md)
- [범용 유익시간 운영체계](docs/universal-productive-time-system.ko.md)
- [연결 카드 보드 템플릿](templates/continuity-card-board.ko.md)
- [제품 개요와 초기 범위](docs/product-brief.ko.md)
