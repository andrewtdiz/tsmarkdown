# ESLint Migration Status

## Current Capabilities
- Component discovery and splitting is handled by the opt-in scanner (`src/parser/component-scanner.ts`) described in `ESLINT_MIGRATION_IMPLEMENTATION.md`, giving us reliable `tsPrelude` / markdown boundaries.
- `parseForESLint` wraps the TypeScript prelude with `@typescript-eslint/parser`, returning an ESTree plus diagnostics while stubbing the markdown payload for linting.
- `validateComponentStructure`, `extractTypeInfo`, and `analyzeReturnStatements` are re-exported through `src/parser/parser-utils.ts` for consumers.
- The current path keeps the legacy parser untouched; all ESLint tooling is opt-in so no breaking changes were introduced.

## What’s Covered by Tests
- `validateComponentStructure` is asserted to surface component metadata and the TS/markdown split (`test/eslint-migration/index.test.ts:9`).
- `parseForESLint` is checked to emit a `Program` AST with the component function (`test/eslint-migration/index.test.ts:19`).
- `extractTypeInfo` currently reports declared interfaces/types by name for typed fixtures (`test/eslint-migration/index.test.ts:66`).
- `analyzeReturnStatements` counts top-level returns across multiple control-flow fixtures (`test/eslint-migration/index.test.ts:131`–`191`).
- Existing Exact MDX rendering tests were rerun alongside ESLint validation to confirm no regressions.

## Gaps Blocking Full Type-Safe MDX
- No TypeScript program or project service is wired up; we only parse the prelude so cross-file type resolution, generics, and ambient declarations remain unchecked.
- Markdown output is replaced with a JSX stub, meaning real MDX expressions aren’t type-checked and JSX structure is only approximated.
- `analyzeReturnStatements` depends on regex-based MDX-to-JSX rewrites, which can drift from real syntax and won’t survive richer constructs.
- ESLint integration stops at parsing; there are no Better MDX-specific rules or diagnostics that surface type errors back to editors/CI.
- Tooling remains manual—there’s no CLI flag, bundler plugin, or IDE wiring that turns the opt-in parser into a default experience.

## Path to Type-Safe MDX
1. Feed MDX through a real MDX→TSX transformer (or the existing compiler) so the TypeScript checker sees genuine JSX/expressions instead of a stub.
2. Enable project-aware parsing (`parserOptions.project` or direct `typescript` program APIs) so types flow from the user’s tsconfig, not just local declarations.
3. Build ESLint rules (or a plugin) that run the type-checker and surface Better MDX diagnostics, including failure fixtures in `test/eslint-migration`.
4. Replace the regex heuristics in `analyzeReturnStatements` with AST-level analysis once MDX is emitted as TSX.
5. Ship integration points (CLI switch, bundler hook, editor config) so teams can opt into type-safe MDX with confidence.
