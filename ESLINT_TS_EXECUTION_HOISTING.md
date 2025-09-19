# ESLint TS Execution Hoisting PRD

## Problem Statement
Better MDX currently leaves `{{ ... }}` template regions embedded inside the markdown returned from the component. Because the expressions remain in-place, we cannot run TypeScript analysis against them or safely evaluate their runtime values before rendering. This limits ESLint-powered diagnostics and prevents true type-safe authoring of interpolated content.

## Goal
Implement an incremental workflow that hoists valid TypeScript expressions found in `{{ ... }}` regions into the component function scope before the primary `return`, then re-materialises the return value using string/template interpolation. Every phase must be testable with the existing `ExactMDXTestRunner` harness and Bun test suite.

## Non-Goals
- Full MDX-to-JSX compilation (handled elsewhere in the pipeline).
- Rewriting or replacing the current markdown renderer beyond the new interpolation handling.
- Supporting arbitrary JavaScript statements inside `{{ ... }}`; only expressions that are type-checkable and side-effect free are in scope.

## Terminology
- **Hoistable Region**: A `{{ ... }}` expression that parses as a valid TypeScript expression, does not reference undefined identifiers, and has no obvious side effects (heuristic-based to start).
- **Execution Prelude**: The section of the component extracted by `component-scanner.ts` prior to the `return` statement (aka `tsPrelude`).
- **Return Template**: The markdown body that previously contained `{{ ... }}` and will now be transformed into a template literal or string-builder output.

## Current Constraints & Hooks
- `splitComponent` provides `tsPrelude` and `markdownBody` for ESLint usage (`ESLINT_MIGRATION_IMPLEMENTATION.md`).
- `parseForESLint` can produce an ESTree for the prelude but currently stubs markdown content.
- `ExactMDXTestRunner` lets us assert final rendered strings; we can add fixtures under `test/eslint-migration` or `test/core-features` to cover hoisting behaviour.

## Incremental Delivery Plan

### Phase 0 – Instrumentation & Feature Flags
- Add an opt-in flag (e.g. `enableInterpolationHoisting`) to the ESLint parser utilities and runtime renderer.
- Expose a helper that returns both the transformed prelude additions and the rewritten return template so tests can introspect changes.
- Tests: Update `test/eslint-migration/index.test.ts` with a noop assertion confirming the flag defaults to `false` and current behaviour is unchanged.

### Phase 1 – Expression Detection & Validation
- Implement a scanner that walks the markdown body and collects `{{ ... }}` regions with their start/end offsets.
- Use `@typescript-eslint/typescript-estree` (or the existing parser instance) to validate each expression in isolation.
- Mark regions as hoistable when parsing succeeds and no banned tokens (`await`, `yield`, assignments) are present.
- Tests: New fixture `hoist-basic.mdx` containing simple numeric/string interpolations. Assert via `ExactMDXTestRunner` that rendering is still correct while `enableInterpolationHoisting` is `false`, and via a new targeted unit test that detection returns the expected metadata when the flag is `true`.

### Phase 2 – Hoisting & Binding Generation
- For each hoistable region, emit a deterministic variable declaration (e.g. `const __mdxHoist_1 = <expression>;`) appended to the `tsPrelude` before the return statement.
- Maintain ordering to preserve evaluation semantics (top-to-bottom as they appear in markdown).
- Inject the declarations into the ESLint AST response so downstream tooling sees real bindings.
- Tests: Extend `test/eslint-migration/index.test.ts` to parse the transformed source and assert that `parseForESLint(..., { enableInterpolationHoisting: true })` produces variable declarations with the expected identifiers and expression AST nodes.

### Phase 3 – Return Template Rewriting
- Replace hoisted `{{ ... }}` regions in the markdown body with template literal placeholders referencing the generated bindings.
- If the original markdown contained backticks or interpolation braces, escape them appropriately.
- Produce two outputs:
  1. Updated markdown body for the runtime renderer (string interpolation).
  2. Updated stub content returned by `parseForESLint` so ESLint sees a realistic JSX/TemplateLiteral.
- Tests: Rendering assertions that the final string matches the original output (with and without hoisting enabled). Add fixtures for mixed markdown + interpolation (headers, lists) and ensure spacing/newlines are preserved.

### Phase 4 – Runtime Execution Integration
- Update the runtime renderer / compiler stage to evaluate hoisted bindings before executing the markdown-to-HTML pipeline.
- Ensure the hoisted values participate in the same context object that supplies existing component props/state.
- Tests: `ExactMDXTestRunner` cases covering:
  - Interpolations that depend on props (`{{ user.name }}`).
  - Type narrowing scenarios (`{{ user?.profile ?? 'Anonymous' }}`) to confirm the prelude receives the same scope as the return body.
  - Error handling when an interpolation fails validation (should leave the original `{{ ... }}` intact and surface a diagnostic).

### Phase 5 – Diagnostics & Tooling Surface
- Feed hoisting diagnostics back through `validateComponentStructure` so editors can highlight unsupported expressions.
- Provide a summary object enumerating hoisted bindings for debugging (mirroring `analyzeReturnStatements`).
- Tests: Unit tests ensuring diagnostics fire for invalid expressions (assignments, statements) and are absent for valid cases. ESLint parsing tests verifying the AST contains both declarations and updated return nodes.

## Edge Cases & Safeguards
- Nested braces or markdown code fences containing `{{` should be ignored by the hoister; detection must respect fenced code blocks and inline code.
- Expressions relying on imported identifiers must still resolve—if the identifier is unavailable in the prelude, emit a warning and skip hoisting.
- Preserve whitespace and indentation so diff noise is limited and existing snapshot tests continue to pass.
- Provide escape hatches (per-file pragma or function comment) to disable hoisting where it causes issues.

## Testing Strategy
- Augment `test/eslint-migration/index.test.ts` with targeted unit-style checks for the hoisting helpers.
- Add integration fixtures under `test/expanded-features` to capture end-to-end rendering and ESLint AST expectations.
- Ensure Bun snapshot or exact-line comparisons remain stable by asserting both hoisted (`enableInterpolationHoisting: true`) and legacy (`false`) output.
- Include negative tests validating that unsupported expressions fall back to legacy behaviour and log diagnostics.

## Open Questions
- Should hoisted bindings be prefixed with `useMemo` or similar constructs when multiple interpolations reuse the same expression?
- Do we need configurability for naming conventions (`__mdxHoist_X`) to avoid clashing with user code?
- How should we surface hoisting metrics in the CLI or debug tooling (e.g. extend `debug-jsx-expression.ts`)?

This PRD should provide enough structure to land incremental changes, each supported by Bun tests, ultimately enabling type-safe interpolation via ESLint-aware hoisting.
