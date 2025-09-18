# Double-Brace Syntax Migration PRD

## Background
Better MDX currently parses four classes of dynamic constructs using single-brace `{…}` syntax for conditionals, ternaries, and JSX expressions, while plain interpolations use `{{…}}`. The unified parser pipeline (`parseContent`) processes these constructs sequentially, starting with `parseInterpolations`, followed by conditional, ternary, and JSX passes. Because the interpolation pass runs first and eagerly replaces every `{{…}}` with a placeholder, downstream passes never see double-brace content and instead rely on single braces.

## Goals
- Standardize all dynamic regions on double-brace syntax `{{…}}`
- Preserve existing placeholder arrays (`interpolations`, `conditionalBlocks`, `ternaryExpressions`, `jsxExpressions`) so renderer/runtime remain unchanged
- Provide a migration path that warns on legacy `{…}` usage and removes it once content is updated
- Maintain or improve resilience against nested constructs without regressions in current test fixtures

## Out of Scope
- Changes to runtime evaluation semantics (`evaluateExpression`, renderer behavior) beyond accepting the new placeholders
- Grammar/highlighting updates beyond documenting the need and capturing as follow-up tasks

## Parser Pipeline Changes
- Replace the monolithic `parseInterpolations` pass with a dispatcher that scans for `{{…}}`, classifies the inner expression, and routes it to the appropriate placeholder array before removing it from the string.
  - Base the dispatcher in `src/parser/interpolations.ts` or a new helper module so existing context mutation is preserved.
  - Add a shared utility (`findMatchingDoubleBrace`) in `src/parser/string-helpers.ts` to correctly match nested double braces.
- Update specialized passes to expect double braces:
  - `src/parser/conditionals.ts`: search for `{{` instead of `{`, strip the outer braces, and reuse existing `&& (...)` detection.
  - `src/parser/ternary.ts`: switch regexes to match `{{ condition ? … : … }}` or lean on the dispatcher for classification to reduce duplication.
  - `src/parser/jsx.ts`: have `processJSXExpressions` treat `{{ expression }}` as the only valid wrapper while keeping JSX element extraction intact.
- Revisit `parseContent` sequencing; either run the refactored dispatcher once up front or reorder the passes so that conditionals/ternaries/JSX operate on the raw content before the generic interpolation fallback.

## Compiler & Renderer Touchpoints
- Ensure `src/parser.ts` receives the same placeholder arrays and normalized markdown.
- Verify runtime processors in `src/renderer/jsx-runtime.ts` handle the new placeholders without expecting legacy single-brace remnants.
- Audit ancillary helpers (e.g., `evaluateExpression` handling for `.map` with `{{ }}`) to confirm compatibility.

## Migration Strategy
1. **Dual-Syntax Phase**
   - Allow both `{…}` and `{{…}}` temporarily. When the dispatcher encounters single braces, emit warnings and treat them as double braces to keep legacy docs working.
2. **Content Update**
   - Ship a codemod/lint rule that rewrites `{ condition && (…) }`, `{ value }`, ternaries, and JSX expressions to the double-brace form.
   - Update repository fixtures (tests in `test/`, MDX examples) and documentation to use `{{…}}` exclusively.
3. **Enforcement**
   - After adoption, remove single-brace support and add parser assertions so tests fail fast on `{…}` usage.

## Testing Plan
- Update snapshot and behavior tests across `test/expanded-features`, `test/component-features`, and core markdown suites to reflect the new syntax.
- Add regression tests covering nested double-brace constructs (e.g., conditional blocks containing ternaries and JSX) to ensure the dispatcher maintains ordering and placeholder indices.
- Run end-to-end rendering tests via `better-mdx/src/tests/test-runner.ts` to catch integration issues.

## Documentation & Tooling Follow-Up
- Update syntax references (`SYNTAX_HIGHLIGHTING_GUIDE.MD`, grammar YAML files) and IDE tokens to highlight `{{…}}` as dynamic sections.
- Communicate deprecation timelines and migration steps in project docs (`PRD.md`, `TASKLIST.md`).

## Risks & Mitigations
- **Parsing regressions**: centralize double-brace matching logic and add thorough unit coverage.
- **Content drift during dual-phase**: instrument warnings, track occurrences, and define a cut-off date for removal.
- **Codemod gaps**: dry-run on existing MDX suite and iterate before announcing enforcement.
