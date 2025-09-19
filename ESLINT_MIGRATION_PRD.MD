# ESLint Migration PRD

## Background
Better MDX currently tokenizes component files as undifferentiated strings. The parser modules in `src/parser` (e.g. `pipeline.ts`, `interpolations.ts`, `conditionals.ts`) walk brace pairs and inject placeholders, but they do not distinguish TypeScript authoring sections from markdown/MDX return blocks. As a result, ESLint (which expects valid TypeScript) cannot analyze `.bmdx`/`.mdx` sources without heavy preprocessing, and we lose type information needed for code intelligence.

## Problem Statement
We need a migration path that lets ESLint treat the TypeScript portions of Better MDX components as real TypeScript while continuing to run the existing markdown/interpolation pipeline on the templated return value. The solution must coexist with the modular parser re-exports in `parser-utils.ts` and avoid destabilizing runtime rendering.

## Goals
- Preserve TypeScript syntax checking and type extraction for code that appears before the first `return` inside the component function.
- Treat the content returned from the component as markdown/MDX so the existing interpolation/conditional/JSX processors continue to work.
- Provide an ESLint-compatible parser output (ESTree) that aligns with `@typescript-eslint/parser` expectations for the TypeScript portion and supplies stubs for the markdown portion.
- Minimize churn to downstream renderer modules (`template-processing.ts`, `render-component.ts`) by keeping existing placeholder semantics.

## Non-Goals
- Supporting multiple top-level component functions in a single file (migration targets the default export pattern only).
- Rewriting the markdown parsing algorithms beyond the mode switch; existing conditional/ternary/JSX processors stay intact.
- Delivering a fully general MDX AST; the markdown section remains string-processed for now.

## Proposed Approach
### 1. Component Mode Switcher
- Add a lightweight scanner in `src/parser` (new module e.g. `component-scanner.ts`) that:
  - Locates the default-exported component body (handles `export default function`, `export const Foo = () =>`, `export default () =>`).
  - Walks the function body to find the first `return` token that is not nested inside a child function/class.
  - Splits the source into `tsPrelude` (from start of file through the characters preceding the `return`) and `markdownBody` (from just after the `return` keyword through the matching closing brace of the component).
  - Handles braces/parentheses via utilities similar to `findMatchingBrace`/`findMatchingParen` to respect nested structures.
  - Emits diagnostics if:
    - No return statement is found.
    - Multiple top-level returns exist (flag for future support but lint failure for now).

### 2. TypeScript Parsing Pipeline
- Feed `tsPrelude` to `@typescript-eslint/typescript-estree` (or the TypeScript compiler API) to build an ESTree AST.
- Preserve node positions relative to the original file by tracking offsets when we slice around the return.
- Surface parser errors directly to ESLint so syntax mistakes remain actionable.
- Extract:
  - Imported identifiers (needed by runtime and lint rules).
  - Props/interface declarations using existing helpers in `parameters.ts` and `inferTypeFromUsage` as fallback.
- Expose the AST plus metadata through `parser-utils.ts` so downstream callers (renderer, CLI, ESLint adapter) can access both source flavors.

### 3. Markdown/MDX Processing
- Pass `markdownBody` into the current pipeline (`protectCodeBlocks` → `parseInterpolations` → conditional/ternary/JSX processors → `restoreCodeBlocks`).
- Maintain placeholder schemes (`__INTERPOLATION_*__`, `__CONDITIONAL_*__`, etc.) so renderer modules work unchanged.
- Record a mapping between placeholder spans and the original source offsets so ESLint rules can report against markdown tokens if needed (initially optional; log as enhancement).

### 4. ESLint Integration
- Build a custom ESLint parser wrapper (`packages/eslint-plugin-better-mdx` or similar) that:
  - Invokes the mode switcher.
  - Returns the ESTree from `tsPrelude` and attaches the markdown analysis as a synthetic `ReturnStatement` node whose argument is a `Literal` or custom node carrying the markdown string plus placeholder metadata.
  - Provides parser services so ESLint rules can query both the TypeScript AST and the markdown parse artifacts.
- Update lint configuration templates to point `.bmdx`/`.mdx` files at the new parser.

### 5. Migration Ergonomics
- Feature flag the behavior through config (e.g. `betterMDX: { lintMode: 'split' | 'legacy' }`) to allow gradual rollout.
- Add CLI switches/tests ensuring render output is unchanged when the flag is enabled.

## Functional Requirements
- R1: Detect and split the default component’s first return block with correct brace balancing even when comments and string literals exist.
- R2: Report meaningful diagnostics when the scanner cannot identify a unique `return`.
- R3: Produce a valid ESTree for the TypeScript segment that ESLint can walk without modifications.
- R4: Preserve existing rendering semantics by ensuring the markdown pipeline uses the same placeholders and ordering as today.
- R5: Expose a programmatic API (e.g. `parseBetterMDXForLint`) that returns `{ tsAst, markdownResult, diagnostics }`.

## Non-Functional Requirements
- NFR1: Scanner must run in linear time relative to file length (< 1 ms for typical docs) to keep linting responsive.
- NFR2: Zero regression in existing unit/integration tests covering template rendering.
- NFR3: The new parser wrapper must support Node 18+ environments (align with current toolchain).

## Implementation Plan
1. **Analysis & Test Harness**
   - Snapshot current parser behavior with fixtures in `test/component-features` and `test/core-features`.
   - Add fixtures representing tricky returns (nested functions, template literals containing `return`).
2. **Component Scanner**
   - Implement scanner module with unit tests (use `findMatchingBrace` utilities).
   - Integrate with `parser-utils.ts` exports.
3. **TypeScript AST Integration**
   - Create adapter around `@typescript-eslint/typescript-estree`.
   - Ensure offset mapping between sliced code and original source.
4. **Markdown Pipeline Hook**
   - Wire scanner output into existing pipeline.
   - Confirm placeholders survive round trip via renderer tests.
5. **ESLint Parser Wrapper**
   - Scaffold package (or extend existing CLI) to expose ESLint parser entry.
   - Provide documentation and config examples.
6. **Rollout & Flagging**
   - Add config flag and CLI toggle.
   - Update docs (`README`, `quick-start.md`) and PRDs.

## Testing Strategy
- Unit tests for scanner edge cases (nested returns, comments, strings).
- Unit tests verifying TypeScript syntax errors propagate correctly.
- Integration tests comparing rendered output before/after split mode.
- ESLint smoke tests running against sample `.bmdx` files to ensure rules fire on TypeScript code.

## Risks & Mitigations
- **False positives in scanner**: mitigate with robust brace/paren tracking and explicit validation of AST results.
- **Offset drift between TypeScript AST and original file**: maintain cumulative offset tracking and assert in tests.
- **Multiple returns**: initially block with diagnostic; document requirement and add backlog item for full control-flow analysis.
- **Tooling divergence**: align parser exports with `parser-utils.ts` so runtime and lint paths stay in sync.

## Open Questions
- How should we expose markdown tokens to ESLint rules? (Need decision between literal node, custom node, or virtual file approach.)
- Do we need to support named component exports in addition to default export during migration?
- Should feature flag default to legacy or split mode for the first release?
