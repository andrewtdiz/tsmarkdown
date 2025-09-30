# TSMD Compiler Architecture Investigation

This document contains an analysis of the current TSMD compiler architecture, its limitations regarding nested content, and a proposed plan for re-architecting it for safety and scalability.

## 1. Current Architecture Analysis

The current transpilation process in `src/compiler/core.ts` follows these steps:

1.  **Block Finding**: `findRootLevelTsmBlocks` scans the source file for `return (...)` statements, treating them as top-level TSM blocks. This detection is based on string and regex matching on the function's text, which is not robust.
2.  **AST Parsing**: The content of each root block is passed to `parseContent` (`src/parser/pipeline.ts`), which builds a TSM-specific Abstract Syntax Tree (AST) for that block's content.
3.  **Code Generation**: `generateFromAST` traverses this TSM AST and generates the corresponding TypeScript code, wrapping the content in a `__tsm([...])` call.
4.  **String Replacement**: The generated code is then injected back into the original source file via string replacement, replacing the original `return (...)` block.
5.  **Nested Block Post-Processing**: Crucially, after the primary code generation, a function named `processNestedBlocks` is called. This function takes the *already generated string of code* and uses regular expressions to find and replace patterns corresponding to nested TSM blocks (e.g., in ternaries or conditional expressions).

### Core Architectural Flaw

The fundamental issue is the lack of a unified, recursive parsing model. The system does not build a complete, nested AST in one pass. Instead, it generates code for the top level and then performs a fragile post-processing step using regex on the output code to handle nesting.

This approach is:
*   **Unsafe**: Manipulating code with regular expressions is notoriously brittle. It can easily fail with complex or deeply nested structures, unexpected formatting, or edge cases.
*   **Not Scalable**: As the complexity of the TSM syntax grows, this regex-based approach will become increasingly difficult to maintain and extend.
*   **Hard to Debug**: Errors originating from the `processNestedBlocks` step are difficult to trace back to the original source code.

## 2. Proposed Re-architecture: Recursive Descent Parsing

To safely handle arbitrarily deep nesting, the compiler should be refactored to use a single, recursive parsing and code generation strategy.

1.  **Unified Recursive Parser**: The parser should be the single source of truth for understanding the structure of TSM. When it encounters an interpolation (`{{ ... }}`), it should analyze the expression. If that expression contains a TSM block (e.g., `condition ? (...) : null`), the parser should **recursively invoke itself** on the content of that inner block.
2.  **Nested AST**: This recursive process will produce a single, unified AST where `TSMInterpolation` nodes can contain complete `TSMBlock` nodes, creating a proper tree structure that mirrors the nesting in the source code.
3.  **Recursive Code Generation**: The code generator (`ast-code-generator.ts`) will then walk this nested AST. When it encounters an interpolation node that contains a nested block, it will simply recurse into that block and generate the code for it.

This eliminates the need for the `processNestedBlocks` function and all string-based manipulation of the generated code, making the entire process robust and predictable.

### Opinionated Parsing Rules

To simplify the parser and improve predictability, we will adopt a set of opinionated rules for TSM syntax:

1.  **Parenthesized Blocks on New Lines**: A `(` that opens a multi-line TSM block **must** be followed by a newline. This provides a clear and unambiguous signal to the parser.
2.  **Single-Line Interpolations**: `{{ ... }}` expressions are confined to a single line, unless they contain a parenthesized `(...)` TSM block.

## 3. Incremental Migration Plan

This plan is designed to be implemented in small, testable steps.

### Step 1: Make the Parser Recursive

*   **Goal**: Enhance the parser to build a fully nested AST.
*   **Actions**:
    1.  Modify `parseInterpolationsToAST` in `src/parser/interpolations.ts`.
    2.  When parsing an interpolation's content, detect if it contains a TSM block pattern (e.g., `... && (...)`).
    3.  If found, recursively call `parseContent` on the inner block's content.
    4.  Store the resulting `TSMBlock` AST on a new property of the `TSMInterpolation` node, e.g., `nestedBlock`.
*   **Testing**: Add new unit tests for `parseContent` that parse strings with nested ternaries and conditionals. Assert that the output AST has the correct nested structure (e.g., `result.lines[0].chunks[0].nestedBlock` is a valid `TSMBlock`).

### Step 2: Update Code Generator to Use the Nested AST

*   **Goal**: Make the code generator recursively walk the new nested AST.
*   **Actions**:
    1.  In `TSMCodeGenerator.visitInterpolation` (`src/compiler/ast-code-generator.ts`), check for the existence of the `nestedBlock` property.
    2.  If `nestedBlock` exists, recursively call `this.visitBlock(interpolation.nestedBlock)` to generate the code for the nested block.
    3.  Remove the old, fragile logic for handling conditionals and ternaries within the `visitInterpolation` method.
*   **Testing**: Write unit tests for `generateFromAST` that pass it the nested ASTs from Step 1's tests. Assert that the generated TypeScript code is correct without requiring any post-processing.

### Step 3: Eliminate the Post-Processing Step

*   **Goal**: Remove the fragile `processNestedBlocks` function.
*   **Actions**:
    1.  In `src/compiler/core.ts`, delete the `processNestedBlocks` function.
    2.  Remove the call to it from `transpileSource`.
    3.  Delete the unused `findNestedTsmBlocks` function from `src/compiler/block-finder.ts`.
*   **Testing**: Run the full existing test suite (`bun test`). All tests related to nesting should continue to pass, now powered by the new recursive engine.

### Step 4: Solidify Block Detection

*   **Goal**: Improve the initial detection of TSM blocks and enforce the new opinionated rules.
*   **Actions**:
    1.  Rewrite `findRootLevelTsmBlocks` to more reliably find `return` statements followed by a parenthesized expression that starts on a new line, using the TypeScript AST walker.
    2.  In the parser, throw errors if the new syntax rules (e.g., `(` not on a new line) are violated.
*   **Testing**: Add tests for invalid syntax to ensure the compiler throws clear, informative errors.
