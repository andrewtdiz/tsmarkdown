**Architecture Findings**
- `src/compiler/core.ts` wraps TypeScript parsing: it finds `return (...)` blocks via `findRootLevelTsmBlocks`, de-indents them, runs `parseContent`, and regenerates TS with `generateFromAST` / `generateExpressionFromAST`.
- Nested block plumbing is unfinished: `transpileSource` allocates `processedNestedBlocks` but never fills it, so `processNestedBlocks` never runs; `findNestedTsmBlocks` relies on regex heuristics and is not integrated, leaving nested `{{ ... }}` unhandled in emitted TS.
- `parseContent` delegates to `parseInterpolationsToAST`, which interleaves placeholder substitution with AST construction, relying on global `ParseContext` arrays (interpolations, ternaries, conditionals, JSX). The flow depends on string substitution order, making deep nesting fragile.
- `parseInterpolationsToAST` recurs into `parseContent` for logical/ternary branches after trimming indentation, but it normalizes everything into flat `TSMLine` chunks and then reconstructs line structure, so original inline vs block context is inferred late.
- Code generation in `ast-code-generator.ts` assumes the AST already encodes line breaks correctly; it builds `__tsm([...])` arrays, adds `"\\n"` between lines, and treats `TSMInterpolation.isTSMContent` as if nested blocks were already expanded.
- Utility helpers (`findMatchingDoubleBrace`, `normalizeIndentation`, JSX prop parsers) operate purely on strings. Without a dedicated lexer they cannot enforce invariants like `{{ }}` staying single-line or `(` being on a dedicated line.

**Deeply Nested __tsm Handling**
- Brace pairing uses `findMatchingDoubleBrace`, which counts nested braces and will locate the right closing `}}`, but the surrounding parser flattens nested placeholders into the same `context.interpolations` array, so inner blocks lose their block/inline context.
- Logical blocks (`condition && (...)`) store a `nestedConditionalBlock` AST but later reconstruction in `renderASTToChunks` returns raw arrays or strings; if those inner nodes hold TSM text, they are not re-enqueued through `generateFromAST`, so nested `__tsm` content can collapse into string literals.
- Ternary handling (`parseNestedTernary`) trims parentheses and tries to detect TSM payloads, yet it ultimately pushes `trueValue` / `falseValue` back as placeholder arrays; there is no stage that converts those arrays into nested AST nodes, so `__tsm` calls are not guaranteed for deeply nested branches.
- `findNestedTsmBlocks` attempts to scan expressions like `.map(() => ( ... ))` and record `NestedTSMBlock` metadata, but because `transpileSource` never populates `parsedAST` on those records, nested calls never render.
- The absence of a token/AST stack means context (block vs inline, indentation depth) is reconstructed from string slicing. Multiple nested `{{ }}` blocks on the same line or deeply nested logical expressions easily confuse the current heuristics.

**Opinionated Parsing Approach**
- Enforce that TSM regions start with `return` whose opening `(` sits at the end of the line and the matching `)` appears on its own line with equal indent; any violation keeps the block in plain TS.
- Treat `{{ }}` interpolations as single logical lines: opening braces must be the first non-whitespace token of the interpolation line (block context) or appear after other glyphs (inline context).
- Build a dedicated lexer that produces a stream of tokens (`TEXT`, `LBRACE`, `RBRACE`, `LPAREN`, `RPAREN`, `NEWLINE`) with column data. Maintain a stack so nested `{{ ... }}` create child nodes immediately, preserving depth and context instead of flattening via placeholders.
- Represent each interpolation with explicit metadata (`context: "inline" | "block"`, `children: TSMNode[]`, `expression: string`) so the generator can decide whether to wrap results in `__tsm` and how to splice trailing newlines.
- Keep indentation normalization separate from parsing: first capture raw text with leading whitespace, then apply baseline indent trimming per block so nested `__tsm` blocks inherit the right indentation when rendered.

**Incremental Migration Plan**
1. Add a focused lexer (`src/parser/tsm-lexer.ts`) that scans return-block slices into typed tokens while enforcing the newline / single-line `{{ }}` constraints. Cover detection with unit tests for single and nested interpolations, and keep it side-by-side with the current parser.
2. Introduce a small AST builder (`buildTsmAst(tokens)`) that consumes the token stream using a stack to produce nested `TSMBlock` / `TSMInterpolation` nodes, capturing context (inline vs block) and indentation columns. Add tests that construct ASTs for nested `&&`, ternaries, and nested `__tsm` blocks without generating code yet.
3. Extend `ast-code-generator.ts` with adapters that map the new AST shape to existing output while preserving newline semantics. Gate this path behind a feature flag (e.g. `ENABLE_TSM_AST_V2`) and add golden tests asserting emitted TS for deeply nested samples.
4. Move logical/ternary handling into the new AST: replace placeholder arrays with real child nodes and update generator helpers to emit `__tsm` when children contain block content. Add regression tests that traverse nested ternaries and conditionals.
5. Retire the regex-based `findNestedTsmBlocks` and placeholder-heavy helpers once the flag is stable; clean up debug `console.log` calls and tighten type signatures. Finish by enabling the flag by default and removing the legacy path after confirming green golden tests and any runtime smoke tests.

Each step is independently testable (lexer → AST → codegen), allowing fast feedback and incremental integration.
