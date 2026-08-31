# Growth Time OS Engineering Desired State

이 문서는 Growth Time OS가 따라야 할 현재 Engineering Desired State입니다. 현재 코드의 inventory나 제품 요구사항을 다시 설명하는 문서가 아닙니다.

## System Context

- 시스템은 한 사용자의 current desktop/mobile browser 안에서 실행되는 static client application입니다.
- 핵심 실행 flow는 backend service, account, network API 없이 동작합니다.
- 배포 artifact를 생성하는 build pipeline 없이 repository의 정적 source를 그대로 서비스합니다.
- 사용자 data는 browser-local persistence boundary 밖으로 전송하지 않습니다.

## Technology and Runtime

- UI는 semantic HTML, CSS, browser-native JavaScript ES modules와 standard Web Components로 구성합니다.
- 각 화면 component는 template, behavior와 scoped CSS를 하나의 JavaScript module에 함께 둡니다.
- component style isolation에는 open Shadow DOM을 사용하며 global stylesheet는 design token과 document reset만 소유합니다.
- production은 GitHub Pages가 `main / (root)`의 `index.html`과 source module을 직접 제공합니다.
- local verification server와 test runner에는 Node.js 20 이상만 사용하고 runtime dependency는 두지 않습니다.
- 외부 framework, runtime CDN, bundler, transpiler와 generated distribution directory를 추가하지 않습니다.

## Module Boundaries

| Boundary | Responsibility | Must Not Know |
| --- | --- | --- |
| Domain (`src/domain.js`) | project/card/run data contract, state transition, global queue invariant, summary calculation | DOM, component layout, storage serialization |
| Application Shell (`growth-time-app`) | durable runtime state ownership, use-case orchestration, persistence commit, view composition, recoverable error publication | individual control markup, storage payload details |
| UI Components (`src/components/*`) | semantic render, transient interaction state, accessible user intent translation | persistence API and serialized storage format |
| Guided Input (`guided-entry-form`) | one-question progression, input focus, local draft values, completion event | product state transition and persistence |
| Persistence Adapter (`src/storage.js`) | schema-versioned browser-local load/save, validation delegation and safe recovery | UI structure and navigation |
| Presentation Helpers (`src/ui.js`) | output escaping, display formatting and shared draft helpers | durable application state and storage |
| Static Entry/Host (`index.html`, `src/main.js`, `scripts/serve.mjs`) | document entry, component bootstrap and local static delivery | product state transition |

## Dependency Direction

Dependencies point from adapters and composition toward policy modules.

```text
index.html → main.js → Application Shell
                         ├─→ UI Components ──→ presentation helpers
                         │                  └─→ Domain read-only projections
                         ├─→ Domain
                         └─→ Persistence Adapter → Domain validation
```

- Domain does not import UI, DOM or persistence modules.
- UI components do not import or call browser storage.
- UI components may import pure Domain query/projection functions for rendering, but only Application Shell invokes transitions that change durable state.
- Persistence does not import UI components.
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

## Data and Persistence Contract

- `AppState.version` identifies the serialized schema and is validated on load.
- Project records retain stable ID, completion definition, quality criterion, default context, session length and creation time.
- Card records retain stable ID, project ID, required continuity fields, exactly one status, queue order and transition evidence.
- Run records retain stable ID, card/project references, activation/start/end time, outcome and focus evidence.
- Domain validation rejects duplicate identity, orphan reference, invalid status, non-contiguous NEXT order and inconsistent NOW/ACTIVE-run state.
- Persistence accepts an injected `Storage` implementation for tests and defaults to browser storage only at the adapter boundary.
- Unrecoverable or structurally invalid payloads return a safe empty state instead of partially trusted state.

## Engineering Constraints

- `NOW <= 1` and `NEXT <= 3` are enforced only by canonical Domain rules, never reimplemented in event handlers.
- Completion, waiting and promotion occur in one immutable state transition.
- User-authored text is escaped before interpolation into HTML.
- Durable data mutation is synchronous and small; normal interactions must not depend on network latency.
- Navigation uses same-document hash routes so GitHub Pages subpath hosting does not require server rewrites.
- Keyboard behavior, accessible name, progress text and error text must remain meaningful without relying on visual styling.
- Time-based tests pass explicit timestamps; storage tests use an isolated adapter.
- Agent, scheduler, worktree, CI and orchestration products are not architecture dependencies.

## Error and Recovery Boundaries

- Domain input error returns a user-readable failure without replacing the active draft component.
- Storage write failure must not publish an unpersisted snapshot as successful.
- Corrupt stored data must not crash component bootstrap or violate Domain invariants.
- A stale card action identifies the expected card ID so a repeated action cannot affect a newly promoted NOW card.
- The local static server rejects repository-private paths such as `.git` and `node_modules`.

## Testing and Verification Direction

- Domain tests cover invariant boundaries, project-spanning queue order, completion/waiting promotion, incomplete handoff, duplicate action protection and seven-day summary windows.
- Persistence contract tests cover round-trip, elapsed-time stability, corrupt payload and semantic inconsistency recovery.
- Architecture tests cover no-build Pages entry, component co-location, Shadow DOM registration and guided-input focus contract.
- Static verification checks JavaScript syntax, HTTP content types, relative module loading and private-path rejection.
- Browser verification covers the NOW, card-chain and review routes; guided input progression; keyboard/focus behavior; error-free console; reload persistence; desktop and narrow viewport presentation.
- Independent verification compares current Product Goal identifiers and this Architecture against code and runtime evidence without trusting `STATE.md` completion claims.

## Engineering Conventions

- Product behavior changes are decided in `PRODUCT_GOAL.html` before implementation.
- Engineering structure changes are decided in this document before implementation.
- Tests and verifier criteria are not weakened to fit an implementation.
- Existing reference documents may provide evidence but cannot override the two Desired State sources.
