# Read -> Transform -> Write Migration Guide

## Current Script Snapshot
- `test-read-transform-write.ts:33` now routes through `parseWithTypeScript`, but `buildParsedMDXWithTSParser` still shapes the data into the legacy `ParsedMDX` object and drops the `ts.SourceFile`. Consumers never receive the actual AST they would need for transformation.
- `test-read-transform-write.ts:11` continues to walk the tree with `any` and compares `node.kind === 263`; we should import `ts` and rely on `ts.isFunctionDeclaration`/`ts.SyntaxKind.FunctionDeclaration` so downstream code can stay typed.
- `test-read-transform-write.ts:36` and `test-read-transform-write.ts:45` still throw "Failed to parse with ESLint parser"/"No AST available from ESLint parser", even though the ESLint parser is long gone.
- `test-read-transform-write.ts:70`-`test-read-transform-write.ts:152` still recover TypeScript and markdown through manual string slicing. That blocks us from running codemods on a `SourceFile` and from emitting printer output directly.
- The transform/write steps remain TODO: there is no jscodeshift phase and the script never calls `ts.createPrinter`, so we still only log the result instead of writing it back out.

## Migration Goals
1. **Parse with the TypeScript compiler API** – continue using `parseWithTypeScript` (`src/parser/typescript-parser.ts:31`) but surface its `sourceFile` so the rest of the pipeline can operate on typed nodes.
2. **Transform with jscodeshift** – run codemods on the TypeScript section to make structural changes declarative and testable.
3. **Emit via `ts.createPrinter`** – regenerate TypeScript from the mutated AST instead of hand-built strings, then persist the result beside the untouched markdown.

## Implementation Plan
1. **Expose typed parse results**
   - Update `buildParsedMDXWithTSParser` to return `{ sourceFile, componentSplit, props }` alongside the legacy `ParsedMDX` data, or split it into two helpers so the read → transform flow can opt into the raw `ts.SourceFile`.
   - Fix the error messages to reference the TypeScript parser and surface diagnostic text directly from `tsResult`.

2. **Clean up AST access**
   - Import `typescript` inside the script and replace `node.kind === 263` with `ts.isFunctionDeclaration` so we can drop the `any` casts.
   - Remove unused imports such as `parseParameters`/`validateComponentStructure`, relying only on the typed helpers coming from the TypeScript parser.

3. **Normalise the TypeScript segment**
   - Instead of slicing strings, build a dedicated `ts.SourceFile` for the `tsPrelude` via `ts.createSourceFile('MiniComponent.tsx', tsPrelude, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)`.
   - Preserve markdown by reading it from `componentSplit.markdownBody` and leaving it untouched during the transform stage.

4. **Introduce a jscodeshift transform phase**
   - Configure jscodeshift with the TSX parser (`const j = jscodeshift.withParser('tsx');`).
   - Run the desired codemods (e.g. enforcing exported props interfaces, normalising return branching) and capture the result with `collection.toSource({ quote: 'single' })`.
   - Reparse the transformed text with TypeScript so the printer works from a fresh `SourceFile`.

5. **Emit and write**
   - Instantiate a printer (`const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });`).
   - Print the updated `SourceFile`, stitch imports + printed body + markdown, and write the output to a scratch path before replacing the live component.

6. **Validate**
   - Re-run `compile`/`render` on the rewritten file.
   - Add an assertion in `test-read-transform-write.ts` that the printed TypeScript still parses with `parseWithTypeScript`, guarding against printer regressions.

## Example Flow (conceptual)
```ts
import * as ts from 'typescript';
import jscodeshift from 'jscodeshift';
import { parseWithTypeScript } from './src/parser/typescript-parser';

const parse = parseWithTypeScript(source, { includeMarkdownStub: false, fileName: 'MiniComponent.bmdx.tsx' });
const { tsPrelude, markdownBody } = parse.componentSplit!;

const j = jscodeshift.withParser('tsx');
const transformedPrelude = j(tsPrelude)
  .find(j.VariableDeclarator, { id: { name: 'excited' }})
  .forEach(path => {
    path.node.init = j.callExpression(
      j.identifier('toUpperCaseName'),
      [j.identifier('name')]
    );
  })
  .toSource({ reuseWhitespace: false });

const updatedSourceFile = ts.createSourceFile(
  'MiniComponent.tsx',
  transformedPrelude,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const printedTypeScript = printer.printFile(updatedSourceFile);

const finalOutput = `${printedTypeScript}\n\n/* markdown */\n${markdownBody}`;
```

## Open Questions / Follow-ups
- Should codemods operate purely in jscodeshift space, or should we migrate long term to `ts.factory` updates once we have bridging utilities?
- Where should the read-transform-write helper live long term (CLI command vs. Bun test harness)?
- `compileTypeScript` in `src/compiler/compiler-utils.ts:63` still fabricates strings; track a follow-up to align compiler output with the printer-based pipeline once this read → transform → write flow lands.
