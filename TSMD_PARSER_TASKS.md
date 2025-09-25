# TSMD Parser & Compiler Migration Task List

This document outlines the tasks required to refactor the TSMD parser and compiler to align with the specification, improve robustness, and eliminate architectural issues identified in `TSMD_INVESTIGATION.md`.

## Phase 1: Establish a True AST-First Pipeline

The goal of this phase is to completely remove the fragile regex-based pre-processing and manual string manipulation in favor of a reliable pipeline that uses the TypeScript AST as the single source of truth.

- [x] **Task 1.1: Create a new core compiler entry point.**
    - This new pipeline will be responsible for the entire transpilation process.
    - It will take a source code string as input and use `ts.createSourceFile` to parse it into a `ts.SourceFile` without any prior modification.

- [x] **Task 1.2: Implement the "Block Finder" module.**
    - This module will traverse the `ts.SourceFile` AST.
    - It should identify `ts.ReturnStatement` nodes whose `expression` is a `ts.ParenthesizedExpression`.
    - It should extract the `ParenthesizedExpression` node.

- [x] **Task 1.3: Implement reliable, AST-based content extraction.**
    - For each `ParenthesizedExpression` node found, extract its inner content.
    - This must be done by using the AST node's properties to get the precise start and end positions from the source file.
    - This replaces all brittle `getText()` or `slice()` logic that relies on manual parenthesis matching.

- [x] **Task 1.4: Deprecate and remove all regex-based pre-processing.**
    - Delete the `preprocessTSmdInFunctions` function from `src/compiler/multi-function-compiler.ts`.
    - Remove any calls to it from existing compiler entry points.

- [ ] **Task 1.5: Deprecate and remove brittle content extraction functions.**
    - Remove `extractMarkdownFromReturnStatementWithOriginalSource` and any other variants that rely on string slicing.
    - Refactor `extractFunctionContent` to use the new, robust "Block Finder" and AST-based content extraction logic.

## Phase 2: Enhance the TSM Parser and Unify the Architecture

This phase focuses on improving the parser's output and consolidating the fragmented compiler codebase.

- [ ] **Task 2.1: Refactor the TSM Parser to produce a rich AST.**
    - Modify the parser pipeline (in `src/parser/pipeline.ts` and `src/parser/parser-utils.ts`).
    - The `parseContent` function must be updated to return a root `TSMNode` object from `src/parser/tsm-ast.ts`, not a `Chunk[]`.
    - This AST must use distinct, specific node types (e.g., `TextNode`, `InterpolationNode`, `ComponentNode`, `ConditionalNode`).

- [ ] **Task 2.2: Deprecate the non-standard `(*...*)` global template syntax.**
    - Remove all logic for processing the `(*...*)` syntax from `src/compiler/processVariables.ts`.
    - The architecture should only support the official `return (...)` syntax for TSM blocks.

- [ ] **Task 2.3: Consolidate and unify all compiler entry points.**
    - Migrate all valid and necessary logic from `transpile.ts`, `new-compiler.ts`, and `multi-function-compiler.ts` into the single core pipeline created in Phase 1.
    - Delete the old, redundant compiler files to create a single, clear entry point for all transpilation.

## Phase 3: Refactor Code Generation and Implement Missing Features

The final phase is to leverage the new, robust ASTs to simplify code generation and implement features from the specification.

- [ ] **Task 3.1: Rewrite the code generator as a TSM AST Visitor.**
    - Create a new code generator that accepts a `TSMNode` (the AST from the new parser).
    - Implement this generator using a visitor pattern that walks the TSM AST.
    - For each node type in the TSM AST, the visitor will generate the corresponding TypeScript code (e.g., a `ConditionalNode` becomes a `(condition && __tsm([...]))` expression).
    - This new module will replace the complex, chunk-processing logic in `generateReturnStatements.ts`.

- [ ] **Task 3.2: Implement the `{{ null }}` line-erase feature.**
    - The TSM parser should produce a specific `LineEraseNode` in the AST when it encounters `{{ null }}`.
    - The new code generator will see this node and emit a call to the `__erasePrevLine` runtime helper.

- [ ] **Task 3.3: Implement correct whitespace compaction rules.**
    - Review the whitespace rules in `TSMD_IMPLEMENTATION.md` regarding falsy values.
    - Ensure the new parser and code generator correctly handle whitespace around falsy interpolations, likely by ensuring the `__tsm` runtime function receives the correct chunk structure.

- [ ] **Task 3.4: Add full support for component children.**
    - Update the TSM parser to handle the `<@Comp>...</@Comp>` syntax.
    - The content between the component tags should be parsed recursively into a nested TSM AST.
    - The code generator will then pass this AST to the component as a `children` prop, wrapped in a `__tsm` call (e.g., `Comp({ children: __tsm([...]) })`).
