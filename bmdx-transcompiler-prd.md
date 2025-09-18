# BMDX → TypeScript Transcompilation PRD

## 1. Overview
This document defines the requirements for building a parser, compiler, and renderer that transcompile BMDX files into TypeScript/JSX. BMDX combines TypeScript module scaffolding with Markdown-driven JSX fragments that embed rich component tags such as `<@TrainingExample>` and inline expressions like `{{ value }}`. The transcompiler must faithfully preserve TypeScript semantics while converting the BMDX presentation layer into runnable React-compatible code.

## 2. Goals
- Provide end-to-end conversion from `.bmdx` source files to formatted TypeScript/JSX.
- Maintain fidelity between the original prose/layout and the generated output, enabling confident round-tripping for authors.
- Supply precise diagnostics, source maps, and formatting so editors and runtime tooling integrate seamlessly.

## 3. Non-Goals
- Building a generic Markdown renderer; the focus is BMDX-specific semantics.
- Implementing runtime components referenced in the source (e.g., `TrainingExample`).
- Automatic application-level wiring or bundler integration.

## 4. User Stories
1. **Author:** As a prompt author, I can write hybrid TypeScript + BMDX syntax and receive TypeScript output that uses familiar JSX without manual translation.
2. **Developer:** As a developer maintaining the pipeline, I can hook the transcompiler into a build/validation step and rely on structured diagnostics when syntax errors occur.
3. **Tooling Integrator:** As an IDE/plugin developer, I can map generated errors back to the original `.bmdx` lines using source maps and span metadata.

## 5. Functional Requirements
### 5.1 Parsing
- Preserve existing TypeScript imports, type annotations, and non-BMDX statements exactly as authored.
- Detect any `return (` boundary that introduces a BMDX fragment and parse the remainder in BMDX mode.
    - Do not add support for `() => ()` until later version
- Tokenize Markdown constructs (headings, paragraphs, lists) that appear inside the fragment while preserving blank lines and indentation.
- Support element tags in both `<@Name>` and `<Name>` forms with JSX-style attributes (string, expression, boolean).
- Distinguish between `<@Component>` (rendered functional component) and `<component>` (Markdown/XML tag) forms, with the parser emitting different node kinds for each.
- Distinguish between JSX expression containers `{ expression }` and inline Markdown splices `{{ expression }}`.
- Record start/end offsets for all nodes to power diagnostics and mapping.

### 5.2 AST
- Represent the file as a root node containing TypeScript AST nodes plus one or more `BmdxFragment` nodes.
- `BmdxFragment` children include Markdown blocks, element nodes, JSX expression blocks, and inline-expression tokens.
- Element nodes track tag name, whether it used the `@` prefix, attribute list, nested children, and a kind flag (RenderedComponent for @-prefixed tags, MarkupElement otherwise).

### 5.3 Compilation
- Serialize TypeScript imports/statements verbatim before the fragment.
- Convert `<@Component>` into function Component while resolving names to imported identifiers; support nested namespaces when needed.
- XML tags without the <@ (ex: `<Component>`) are read as normal Markdown/HTML rendering path (preserving case/attributes) instead of functional component resolution.
- Lower Markdown headings and paragraphs into JSX output according to a configurable strategy (e.g., direct `<h2>` tags or helper components).
- Translate `{{ expression }}` into `{ expression }` within text nodes while preserving surrounding whitespace.
- Map structural tags like `<trainingExamples>` to configured JSX equivalents or intrinsic wrappers.

### 5.4 Rendering & Output
- Provide a pretty-printer that enforces consistent indentation (two spaces by default) and collapses spurious blank lines without altering semantic whitespace.
- Emit source maps tying generated JSX back to original spans.
- Surface syntax and compilation errors with file:line:column references plus contextual snippets.

## 6. Non-Functional Requirements
- Parser must handle files up to at least 1 MB with linear-time complexity relative to file size.
- Compilation should be deterministic and idempotent: re-running on the same input yields identical output and formatting.
- Implementation must be unit-testable with componentized modules (lexer, parser, compiler, renderer).

## 7. Technical Approach
1. **Lexer/Tokenizer:** Implement a dual-mode tokenizer that switches from TypeScript tokenization to BMDX-mode once inside the return fragment, handling Markdown markers, element delimiters, and expression braces.
2. **Parser:** Reuse a TypeScript parser (e.g., `typescript` compiler API) for the top-level module; build a custom recursive-descent parser for BMDX that consumes the specialized tokens.
3. **AST Model:** Define TypeScript-facing node interfaces (`BmdxFragment`, `MarkdownBlock`, `ElementNode`, `InlineExpression`) augmented with span metadata.
4. **Compiler:** Walk the AST, emitting JSX strings or builder objects while consulting configuration for element/tag mappings and Markdown lowering strategy.
5. **Renderer/Formatter:** Use a structured printer to produce final TypeScript with predictable indentation, optionally leveraging existing formatters while respecting preserved spans.
6. **Source Maps:** During emission, track generated character offsets and map back to original spans.

## 8. Milestones
1. **MVP Parser (Week 1-2):** Tokenizer + parser that produce an AST for sample files (`IndividualRevisionPrompt.bmdx`, `ContentsFromChallenge.bmdx`).
2. **Compiler Prototype (Week 3):** Basic JSX emission for `<@Component>` elements and Markdown headings/paragraphs without source maps.
3. **Renderer & Formatting (Week 4):** Integrate pretty-printer, handle inline expressions, and ensure idempotent output.
4. **Diagnostics & Source Maps (Week 5):** Attach precise error reporting and source map generation.
5. **Testing & Hardening (Week 6):** Add regression fixtures, performance benchmarking, and documentation.

## 9. Open Questions
- Should Markdown lists map to HTML `<ol>/<ul>` or to custom components? (Requires UX decision.)
- Do we support arbitrary HTML-like tags beyond the configured whitelist? (Impacts validation strategy.)
- Is runtime evaluation expected to preserve the original Markdown text for further processing, or should the compiler eagerly transform everything into JSX nodes?

## 10. Acceptance Criteria
- Running the transcompiler on existing `.bmdx` files produces syntactically valid TypeScript/JSX that the current build system can consume without manual edits.
- Inline expressions and component attributes preserve semantics and whitespace compared to the source files.
- Developers receive actionable diagnostics with accurate references when syntax errors are introduced.
- The tool passes automated test suites covering representative examples and edge cases (nested tags, multiple headings, empty fragments).

