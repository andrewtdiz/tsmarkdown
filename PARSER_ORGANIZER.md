# Parser Module Organizer

## Pipeline Core (`pipeline.ts`)
- Own `ParseContext` type and `parseContent` dispatcher.
- Import individual passes; provide orchestration only.

## Interpolation Pass (`interpolations.ts`)
- Move `parseInterpolations` and `processNestedInterpolations`.
- Share placeholder helpers unique to interpolation.

## Conditional & Ternary Passes (`conditionals/`)
- `conditionals.ts` for `parseConditionals` and `processConditionalBlocks`.
- `ternary.ts` for `parseTernary` and `processTernaryExpressions`.
- Keep mutual recursion local; expose clear interfaces back to pipeline.

## JSX Extraction (`jsx.ts`)
- House `parseJSX`, `processJSXElements`, and `processJSXExpressions`.
- Maintain placeholder bookkeeping specific to JSX parsing paths.

## Parameter Utilities (`parameters.ts`)
- Group `parseParameters`, `parseParameterTypes`, `inferTypeFromUsage`, `generatePropsInterface`.
- Keep signature inference accessible to both parser and renderer code.

## Shared Helpers (`string-helpers.ts`)
- `findMatchingBrace`, `findMatchingParen`, `normalizeIndentation`.
- Provide reusable string/AST traversal primitives.

## Follow-Up
- Update import map in callers (`parser.ts`, render utilities).
- Add unit coverage around each pass before/after split.
