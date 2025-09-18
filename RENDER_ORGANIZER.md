# Renderer Refactor Outline

## render-context.ts
- Keep shared renderer types from `src/renderer/render-utils.ts:6-17` and the singleton `componentRegistry` (`:19`).
- Move dependency loading utilities (`loadDependencies`, `resolveComponentPath` at `:438-:472`) that populate the registry.
- Include prop/context helpers (`createPropsContext`, `mergePropsWithDefaults`, `getDefaultValueForType` at `:485-:538`), so inputs are normalized before rendering.
- This module becomes the hub that exposes the registry and context-shaping API consumed by other layers.

## template-processing.ts
- House the pure string/placeholder pipeline (`processMultipleReturnStatements` through `processJSXElementsForParsing`, `:21-:360`).
- Keep structural helpers such as `findMatchingBrace`, `processEscapeSequences`, `normalizeIndentation`, and `valueToString` (`:396-:1044`).
- This file focuses on deterministic template manipulation with no runtime side effects.

## typescript-runtime.ts
- Extract the sandboxed TypeScript executor (`executeTypeScript`, `createSafeContext`, `extractImports`, `resolveImports`, `resolveModule`, `removeImports`, `extractVariableNames`, `:545-:756`).
- Keeps all filesystem/dynamic import concerns in one place to simplify auditing and potential replacement.

## jsx-runtime.ts
- Collect JSX-centric evaluation/rendering (`processConditionalBlocks`, `processTernaryExpressions`, `processJSXExpressions`, `processJSXElements`, `evaluateJSXExpression`, ternary/map helpers, `renderJSXElement`, `renderJSXComponent`, `jsxResultToString`, `:804-:1828`).
- Handles async resolution, placeholder substitution, ternary/map JSX branches, and component invocation logic.
- Serves as the bridge between data contexts and rendered component strings.

## render-component.ts
- Leave `renderComponent` (`:1830-:1913`) as the orchestrator that wires together the context module, TypeScript runtime, template processor, and JSX runtime.
- Manages orchestration concerns (ordering passes, collecting errors, whitespace cleanup) while delegating heavy lifting to the new modules.

## Migration Notes
- Update existing imports from `render-utils` to the new module boundaries or export a compatibility barrel if short-term stability is needed.
- Align tests to cover each module independently (e.g., template parsing vs. JSX runtime) to validate the split.
