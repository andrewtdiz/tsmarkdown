**Coverage Gap PRD**
- Build an integration-test expansion plan that closes the gaps between ROOT feature intent and the automated suites; sources: `ROOT_TEST_FEATURES.md` plus test suites in `test/`.
- Scope explicitly excludes the ad-hoc demo runners (`test-*.ts`) because they lack assertions and are not wired into `bun:test`.
- All requirements below target Bun-based automated tests that run under the existing harness (`test/component-features/index.test.ts`, `test/core-features/index.test.ts`, `test/expanded-features/index.test.ts`, `test/phase3.test.ts`, and `test/markdown-features/index.test.ts`).

**Current Coverage**
- Rendering flow is validated for simple parse → compile → render cycles and context-only execution (`test/expanded-features/index.test.ts:8-104`, `test/core-features/index.test.ts:11-161`).
- Component imports resolve through `basePath`, but all executions inject empty props because `render` is invoked with `{}` (`test/component-features/index.test.ts:17-162`, `src/exact-testing-utilities.ts:120-128`).
- Error handling assertions stop at verifying error arrays populate for undefined variables/invalid conditions (`test/core-features/index.test.ts:96-105`, `test/expanded-features/index.test.ts:111-120`).
- Runtime/API coverage focuses on cache primitives, compile/render success, and generic execution (`test/phase3.test.ts:9-332`).
- Markdown fixtures exercise formatting breadth but do not interact with Better-MDX-specific constructs beyond static output checks (`test/markdown-features/index.test.ts`).

**Uncovered Features**
- Rendering pipeline gaps: no test proves props hydration or metadata exposure (`compiled.metadata.parameterTypes`) despite catalog expectations (`ROOT_TEST_FEATURES.md §1`, `src/exact-testing-utilities.ts:120-128`).
- Interpolation & formatting gaps: automated suites never hit numeric formatting helpers (`toFixed`, `toLocaleString`), reducers, or multi-placeholder ordering guarantees; current checks remain on `.join` and `.toUpperCase()` (`test/expanded-features/index.test.ts:18-37`).
- Conditional & control-flow gaps: there is no coverage for negative guards (`!condition`), prop-driven toggles, or multi-return branches—manual scripts like `test-multiple-returns.ts` do not assert (`ROOT_TEST_FEATURES.md §§3 & 8`, `test/core-features/index.test.ts:24-161`).
- Collections & props gaps: reusable list components, ordered vs unordered rendering, empty-state messaging, and default prop semantics are only exercised in console demos (`test-list-rendering.ts`, `test-default-props-final.ts`), leaving catalog §4 and §6 untested.
- Performance/diagnostics gaps: suites never assert timing data, large collection throughput, or structured error payloads beyond presence checks (`ROOT_TEST_FEATURES.md §§9-10`, `test/phase3.test.ts:200-332`).
- Runtime/tooling & scenarios gaps: HMR lifecycle, client script delivery, scenario blueprints (commerce, dashboard, newsletters), async rendering, typed context contracts, and error-recovery policies have zero automated coverage (`ROOT_TEST_FEATURES.md §§11-12`, Recommended Additions section; compare `test-hmr.ts` which only logs).

**Requirements**
- Add prop-aware integration tests that pass optional/required props through render/execution, assert default overrides, and validate `parameterTypes` metadata exposure for compiled artifacts (`ROOT_TEST_FEATURES.md §§1 & 6`).
- Extend interpolation tests with numeric and localization expressions (`toFixed`, `toLocaleString`), reducer-based aggregations, and deterministic multi-placeholder order assertions to satisfy §2 guarantees.
- Introduce conditional suites covering `!condition` fallbacks, context/prop-driven toggles, and MDX components with multiple explicit return branches, verifying both early exits and fallback content (§§3 & 8).
- Create collection-focused cases that render large lists, reusable list components (ordered/unordered/empty states), and aggregation summaries while tracking execution duration to back performance commitments (§§4 & 10).
- Automate HMR/client tooling checks: simulate watcher events, SSE payloads, and client script generation, and assert cache/test-runner utilities behavior beyond current smoke checks (§11).
- Author end-to-end scenario suites (content-heavy marketing, authenticated dashboards, commerce flows) that blend context + props, async data resolution, and error-recovery policy toggles, addressing §§7 & 12 plus the Recommended Additions.

**Risks**
- Expanding integration breadth without isolating fixtures may inflate runtime; introduce focused fixtures per feature to keep suites performant.
- Async and HMR tests could flake without controlled timing hooks; use deterministic mocks for file watchers, timers, and network messages.
- Scenario blueprints risk overlapping responsibilities with application-level tests; keep assertions focused on MDX engine behavior.

**Acceptance Criteria**
- Every catalog bullet in §§1-12 and the Recommended Additions maps to at least one deterministic `bun:test` case with explicit assertions.
- New suites demonstrate props + context hydration, default handling, and metadata validation alongside interpolation/conditional variants.
- Performance/HMR validations include measurable assertions (timeouts, event payloads) rather than console output.
- Scenario blueprints cover at least one async flow, one typed-context contract, and one configurable error-recovery pathway.
- All new tests integrate with existing harness (`bun test`) and run green locally.
