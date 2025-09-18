# Task List

## Parser front-end overhaul
- [ ] Replace the line-oriented scanning in `src/parser.ts:29-105` with a TypeScript compiler-API pass that preserves existing statements, locates every return ( BMDX fragment (including guarded/multi-return cases), and actually populates returnStatements; add fixtures that cover async functions, nested blocks, and non-standard whitespace.

## AST & span model
- [ ] Evolve ParsedMDX in `src/parser.ts:14-27` into a typed BMDX AST (root → fragments → Markdown/element/inline nodes) with start/end offsets on every node so diagnostics/source-maps become possible; verify via parser snapshot tests that spans remain stable as content shifts.

## Markdown + inline parsing
- [ ] Replace the placeholder-based processTemplateContent flow in `src/parser/parser-utils.ts:360-379` with a tokenizer that emits headings, paragraphs, ordered/unordered lists, and text nodes interleaved with explicit inline-expression tokens instead of raw strings; add golden tests to prove blank-line retention and `{{ expr }}`.

## Element semantics
- [ ] Upgrade the regex helpers in `src/parser/parser-utils.ts:145-170` so they handle `<@Component>` versus `<element>` tagging, full attribute syntax, and nested children while flagging rendered components vs markup elements; unit-test attribute parsing (string, boolean, JSX) and mixed component/markup nesting.

## Static compiler pipeline
- [ ] Replace the pass-through behavior in `src/compiler.ts:30-47` and `src/compiler/compiler-utils.ts:61-64` plus the runtime templating in `src/renderer/render-utils.ts:1305-1384` with an AST-driven emitter that generates JSX/TypeScript, maps Markdown structures to configured JSX tags, resolves `<@Component>` to imports, and rewrites `{{ expr }}` into JSX expression containers; add integration tests comparing emitted `.tsx` against expected output.

## Formatting, maps, diagnostics
- [ ] Layer a structured pretty-printer and source-map builder atop the new emitter (none exist today, see `src/compiler/compiler-utils.ts:27-35` and `src/renderer.ts:11-33`), and surface parser/compiler errors with file:line:column precision leveraging the recorded spans; extend the test harness to assert idempotent formatting and accurate error locations.
