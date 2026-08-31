# Growth Time OS Engineering Desired State

이 문서는 Growth Time OS가 따라야 할 현재 Engineering Desired State입니다. 현재 코드의 inventory나 제품 요구사항을 다시 설명하는 문서가 아닙니다.

## System Context

- 시스템은 한 사용자의 current desktop/mobile browser 안에서 실행되는 static client application입니다.
- 핵심 실행 flow는 backend service, account, network API 없이 동작합니다.
- 배포 artifact를 생성하는 build pipeline 없이 repository의 정적 source를 그대로 서비스합니다.
- 사용자 data는 browser-local persistence boundary 밖으로 전송하지 않습니다.
- 지원 browser에서는 같은 static source를 installable standalone web app으로 실행합니다.

## Technology and Runtime

- UI는 semantic HTML, CSS, browser-native JavaScript ES modules와 standard Web Components로 구성합니다.
- 각 화면 component는 template, behavior와 scoped CSS를 하나의 JavaScript module에 함께 둡니다.
- component style isolation에는 open Shadow DOM을 사용하며 global stylesheet는 design token과 document reset만 소유합니다.
- production은 GitHub Pages가 `main / (root)`의 `index.html`과 source module을 직접 제공합니다.
- root Web App Manifest가 app identity와 launch scope를 제공하고, root service worker가 app-shell cache와 version update lifecycle을 소유합니다.
- `app-version.js`는 service worker가 import하는 단일 cache version token이며 새 app release마다 값이 바뀝니다.
- local verification server와 test runner에는 Node.js 20 이상만 사용하고 runtime dependency는 두지 않습니다.
- 외부 framework, runtime CDN, bundler, transpiler와 generated distribution directory를 추가하지 않습니다.

## Module Boundaries

| Boundary | Responsibility | Must Not Know |
| --- | --- | --- |
| Domain (`src/domain.js`) | project/card/run data contract, quick/detailed Todo defaults, state transition, global queue invariant, summary calculation | DOM, component layout, storage serialization |
| Application Shell (`growth-time-app`) | durable runtime state ownership, quick-add orchestration, persistence commit, view composition, recoverable error publication | individual control markup, storage payload details |
| UI Components (`src/components/*`) | Todo-first semantic render, progressive disclosure, transient interaction state와 accessible user intent translation | persistence API and serialized storage format |
| Guided Input (`guided-entry-form`) | one-question progression, input focus, local draft values, completion event | product state transition and persistence |
| Persistence Adapter (`src/storage.js`) | schema-versioned browser-local load/save, validation delegation and safe recovery | UI structure and navigation |
| Mobile App Controller (`pwa-controller`) | install prompt lifecycle, service-worker registration, waiting update notice와 user-triggered activation | project/card state transition and storage payload |
| Service Worker (`service-worker.js`) | versioned app-shell precache, offline fallback, old-cache cleanup와 `SKIP_WAITING` message | durable user project/card/run data |
| Presentation Helpers (`src/ui.js`) | output escaping, display formatting and shared draft helpers | durable application state and storage |
| Static Entry/Host (`index.html`, `manifest.webmanifest`, icons, `src/main.js`, `scripts/serve.mjs`) | document/PWA metadata entry, component bootstrap and local static delivery | product state transition |

## Dependency Direction

Dependencies point from adapters and composition toward policy modules.

```text
index.html → main.js ─┬→ Application Shell
                      │    ├─→ UI Components ──→ presentation helpers
                      │    │                  └─→ Domain read-only projections
                      │    ├─→ Domain
                      │    └─→ Persistence Adapter → Domain validation
                      └→ Mobile App Controller → Service Worker registration
```

- Domain does not import UI, DOM or persistence modules.
- UI components do not import or call browser storage.
- UI components may import pure Domain query/projection functions for rendering, but only Application Shell invokes transitions that change durable state.
- Persistence does not import UI components.
- Service Worker and Mobile App Controller do not import Domain or persistence modules and never read or cache durable user data.
- Mobile App Controller is a root sibling of Application Shell so card-state re-renders cannot discard a captured install prompt or waiting-update state.
- Component-to-component reuse happens through explicit custom elements and CustomEvent contracts, not hidden mutable globals.
- Circular ES module imports are prohibited.

## State Ownership and Data Flow

- Application Shell owns the single durable `AppState` snapshot containing projects, cards and execution runs.
- Child components receive a snapshot and own only transient view state such as current question, draft answers, open action panel and selected edit target.
- Child components emit user intent as named `domain-action` events. They do not mutate the durable snapshot.
- Application Shell applies one canonical Domain transition, validates and persists the resulting snapshot, then publishes it through a re-render.
- A failed transition or save keeps the last valid durable state and preserves the currently mounted input flow while showing a text error.

```text
User Input
    ↓
UI Component transient draft
    ↓ domain-action
Application Shell → Domain transition → Persistence Adapter
    ↓ success                               ↓ failure
new AppState render                 previous state + recoverable error
```

Quick capture composes one application transaction before persistence.

```text
title one-line intent
    ↓
Application Shell
    ├─ no project → internal default project
    └─ quick Todo draft defaults
    ↓
canonical createCardChain transition → one save → NOW/NEXT render
```

Install/update state is an independent transient platform flow.

```text
Manifest → Browser install capability → Mobile App Controller install action

stable service-worker.js + changed app-version.js
        ↓ browser update check
new worker waiting → update notice → user chooses update
        ↓
SKIP_WAITING → activate → old shell cache cleanup → one reload
```

## Data and Persistence Contract

- `AppState.version` identifies the serialized schema and is validated on load.
- Project records retain stable ID, completion definition, quality criterion, default context, session length and creation time.
- Card records retain stable ID, project ID, required continuity fields, exactly one status, queue order and transition evidence.
- Card `entryMode` is `QUICK` or `DETAILED`. Missing values from existing stored cards normalize to `DETAILED` during validation-compatible migration.
- QUICK cards still satisfy the canonical Card shape through Domain-owned defaults; UI event handlers do not recreate those defaults.
- Run records retain stable ID, card/project references, activation/start/end time, outcome and focus evidence.
- Domain validation rejects duplicate identity, orphan reference, invalid status, non-contiguous NEXT order and inconsistent NOW/ACTIVE-run state.
- Persistence accepts an injected `Storage` implementation for tests and defaults to browser storage only at the adapter boundary.
- Unrecoverable or structurally invalid payloads return a safe empty state instead of partially trusted state.
- Cache Storage contains only public static app-shell assets. Project, Card and Run records remain exclusively in the persistence adapter's browser-local data store.

## Engineering Constraints

- `NOW <= 1` and `NEXT <= 3` are enforced only by canonical Domain rules, never reimplemented in event handlers.
- The primary Todo add path accepts one non-empty title only. Detailed fields and project setup remain behind explicit progressive-disclosure actions.
- QUICK-card one-tap completion/continue and one-input waiting use Application Shell orchestration but still call the same canonical Domain transitions.
- Completion, waiting and promotion occur in one immutable state transition.
- User-authored text is escaped before interpolation into HTML.
- Durable data mutation is synchronous and small; normal interactions must not depend on network latency.
- Navigation uses same-document hash routes so GitHub Pages subpath hosting does not require server rewrites.
- Keyboard behavior, accessible name, progress text and error text must remain meaningful without relying on visual styling.
- Time-based tests pass explicit timestamps; storage tests use an isolated adapter.
- Agent, scheduler, worktree, CI and orchestration products are not architecture dependencies.
- Manifest and service-worker URLs remain stable across releases. `app-version.js` changes whenever cached shell content changes.
- A new worker waits by default. It does not call `skipWaiting()` until the user selects the update action.
- Service-worker registration uses `updateViaCache: 'none'` and checks for updates when the app opens or becomes visible.
- Navigation uses network-first with cached `index.html` fallback; versioned shell assets use cache-first with network fallback.

## Error and Recovery Boundaries

- Domain input error returns a user-readable failure without replacing the active draft component.
- Storage write failure must not publish an unpersisted snapshot as successful.
- Corrupt stored data must not crash component bootstrap or violate Domain invariants.
- A stale card action identifies the expected card ID so a repeated action cannot affect a newly promoted NOW card.
- The local static server rejects repository-private paths such as `.git` and `node_modules`.
- Service-worker or install-prompt failure is isolated from application bootstrap and is rendered as non-blocking platform status only when user action is possible.
- `controllerchange` causes at most one reload per accepted update.

## Testing and Verification Direction

- Domain tests cover invariant boundaries, project-spanning queue order, completion/waiting promotion, incomplete handoff, duplicate action protection and seven-day summary windows.
- Quick-capture tests cover empty-state default project creation, one-line NOW/NEXT insertion, generated canonical fields, one-tap complete/continue, one-input waiting and detailed-card regression.
- Persistence contract tests cover round-trip, elapsed-time stability, corrupt payload and semantic inconsistency recovery.
- Architecture tests cover no-build Pages entry, component co-location, Shadow DOM registration and guided-input focus contract.
- PWA contract tests validate manifest members and icon assets, stable worker/version URLs, cache-version coupling, shell asset existence, user-gated `SKIP_WAITING` and local server MIME.
- Static verification checks JavaScript syntax, HTTP content types, relative module loading and private-path rejection.
- Browser verification covers the NOW, Todo list and review routes; one-line capture; optional detailed flow; quick actions; keyboard/focus behavior; error-free console; reload persistence; desktop and narrow viewport presentation.
- Mobile-app verification covers manifest discovery, installability metadata, service-worker registration/control, deterministic cache fallback, waiting update notice and user-triggered activation without durable-data loss.
- Independent verification compares current Product Goal identifiers and this Architecture against code and runtime evidence without trusting `STATE.md` completion claims.

## Engineering Conventions

- Product behavior changes are decided in `PRODUCT_GOAL.html` before implementation.
- Engineering structure changes are decided in this document before implementation.
- Tests and verifier criteria are not weakened to fit an implementation.
- Existing reference documents may provide evidence but cannot override the two Desired State sources.
