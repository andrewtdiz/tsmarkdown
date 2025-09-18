# Integration‑Testable Feature Catalog

This catalog summarizes the behavior validated by the root-level test harnesses and organizes it into integration‑testable feature areas. Use it to guide scenario selection and assertion design when authoring automated tests.

## 1. Rendering Pipeline & Execution Flow
- End‑to‑end parse → compile → render workflow across inline sources and external MDX assets.
- Renderer accepts a context object, a props object, and an optional base path for resolving component dependencies.
- Compilation exposes metadata (for example, parameter typing) for introspection during tests.

## 2. Template Interpolation & Data Formatting
- Inline interpolation using `{{ }}` for scalars and computed values within Markdown text.
- Complex expressions supported, including arithmetic, string templates, array joins, reducers, `toFixed`, and `toLocaleString`.
- Multiple placeholders within a single template render deterministically and in order.

## 3. Conditional Rendering Patterns
- Standard boolean guards with `{condition && (...)}` for gating sections (truthy and falsy cases).
- Multi‑level nested conditionals for role‑based views, premium upsells, and fallbacks.
- Branch toggling validated via constant substitution and context‑driven variants.
- Negative guards (`!condition && (...)`) to emulate else‑style behavior.

## 4. Collection Rendering & List Behaviors
- Array mapping to Markdown strings and JSX fragments, including performance baselines on large collections.
- Reusable list components supporting ordered and unordered modes, comma‑delimited output, and empty‑state messaging.
- Iteration‑driven sections with counts, progress calculations, and aggregated totals.

## 5. Component Composition & Architecture
- Preference for componentized rendering over raw string assembly, validated by comparative demonstrations.
- Nested component usage inside loops with prop forwarding through wrapper components.
- Base‑path resolution for component imports colocated with MDX fixtures.

## 6. Props Management & Default Values
- Prop destructuring in function signatures with optional parameters and TypeScript annotations.
- Default prop semantics (especially booleans) verified via omissions, explicit `true`, and explicit `false`.
- Output parity checks confirm that defaults and explicit overrides behave as intended.

## 7. External Context & Environment Integration
- Context injection at render time (for example, authentication, weather, user dashboards) to personalize output.
- Context functions callable from templates to simulate API/store access.
- Composition of context and props to hydrate complex experiences (dashboards, newsletters, commerce flows).

## 8. Control Flow & Multiple Return Paths
- Early returns for empty data, single‑item cases, and pre‑render error states.
- Multi‑branch return chains that select alternative templates while preserving safe fallbacks.
- Backward compatibility confirmed for single‑return components.

## 9. Error Handling & Diagnostics
- Graceful surfacing of interpolation and condition evaluation errors alongside partial content.
- Structured error capture in render results for downstream assertions.
- Optional timing/logging around render calls to benchmark execution characteristics.

## 10. Performance & Scalability
- Rendering of large item sets to establish throughput expectations.
- Duration measurements to detect regressions in synchronous or asynchronous execution paths.
- Validation of computed summaries and progress indicators under load.

## 11. Developer Tooling & Runtime Services
- Hot Module Replacement lifecycle: watcher startup, change detection, update events, SSE broadcasting, and shutdown.
- Client‑script generation for connecting viewers to the live update stream.
- Testing utilities to compose suites, chain expectations, persist reports, and perform snapshot comparisons.

## 12. Scenario Blueprints
- Content‑heavy experiences (blogs, newsletters, marketing pages) with dynamic metadata and personalization.
- Authenticated dashboards reacting to roles, permissions, and entitlements.
- Commerce templates with pricing logic, inventory/status indicators, and progress summaries.
- Team and profile views featuring optional sections, project histories, and computed tenure.

## Recommended Additions (High Value)
- Async rendering coverage for `async` components and awaited data sources.
- Typed contracts for injected context to catch shape mismatches pre‑render.
- Configurable error‑recovery policies (redaction, default messaging) for failed expressions.
