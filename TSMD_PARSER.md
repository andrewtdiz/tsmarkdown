# TSMD Parser Architecture & Refactoring Guide

This document provides an overview of the current TSMD parser architecture, identifies critical issues, and outlines a clear path for refactoring.

## 1. Current Parser Architecture

The codebase currently contains two parallel and conflicting parser implementations:

### The Legacy Parser (`src/parser.ts`)

- **Description:** This file contains a monolithic, string-based parser (`parseTSmd`). It processes an entire file using line-by-line analysis, manual brace counting, and string matching.
- **Status:** **DEPRECATED**. This parser is no longer used by the main `compileFullFile` pipeline in `full-file-compiler.ts`.
- **Recommendation:** This file should be deleted to eliminate confusion, remove dead code, and prevent future use.

### The Modern Pipeline (Used by `full-file-compiler.ts`)

This is the active parser implementation. It is a multi-stage process that correctly separates concerns but has a critical flaw in how the stages are connected.

1.  **Function Discovery:** The pipeline correctly uses the `extractFunctions` utility from `src/parser/typescript-parser.ts`. This function leverages the TypeScript compiler's AST to robustly find all function declarations, which is the correct approach.

2.  **Content Extraction:** This is the weakest link. The `extractMarkdownFromReturnStatement` function in `full-file-compiler.ts` is responsible for getting the TSM content from inside a `return (...)` block. Instead of using the AST, it reverts to brittle string manipulation, including manual parenthesis counting, to extract the content. **This is the primary source of parsing bugs.**

3.  **Feature Parsing Pipeline (`parseContent`):** Once the (potentially malformed) string is extracted, it is passed to `parseContent` (from `src/parser/pipeline.ts`). This function acts as a pipeline, calling a series of modular, purpose-built parsers for each TSM feature (interpolations, conditionals, components, etc.). This modular pipeline itself is a good, extensible design.

## 2. Core Components of the Modern Parser

The modular parser is organized correctly, with components located in `src/parser/`:

-   **`typescript-parser.ts`:** The foundation of the modern approach. It correctly uses the `typescript` package to parse the source file and extract reliable, AST-based information about functions and types.
-   **`pipeline.ts`:** Contains the `parseContent` function, which orchestrates the parsing of a TSM string by calling specialized sub-parsers in a defined order.
-   **Feature Parsers (`interpolations.ts`, `conditionals.ts`, `ternary.ts`, etc.):** Each file is responsible for identifying a single TSM feature within a string. This is a clean and maintainable design.
-   **`parser-utils.ts`:** A barrel file that conveniently re-exports the various parser components for consumption by the compiler.

## 3. Key Issues & Refactoring Path

The primary goal is to create a single, robust, AST-first parsing pipeline.

### Recommendation 1: Delete the Legacy Parser

To prevent confusion and reduce technical debt, the first step should be to **delete `src/parser.ts`**.

### Recommendation 2: Fix the AST-to-String Seam (Highest Priority)

The most critical task is to fix the handoff between the TypeScript AST and the TSM feature parsing pipeline.

-   **Action:** Refactor the `extractMarkdownFromReturnStatement` function in `full-file-compiler.ts`.
-   **Guidance:** It **must not** perform any manual string parsing, character counting, or parenthesis matching. It should be rewritten to intelligently walk the TypeScript AST. Given a `ts.ReturnStatement` node, it should traverse its children to find the `ts.ParenthesizedExpression` and reliably get its contents directly from the AST nodes.

### Recommendation 3: Consolidate and Simplify Utilities

-   **Action:** Review all string and whitespace utilities (`string-helpers.ts`, `normalizeIndentation`).
-   **Guidance:** The logic for handling indentation and newlines is currently spread out, convoluted, and partially duplicated inside `extractMarkdownFromReturnStatement`. This should be consolidated into a single, well-defined, and robust set of functions.

### Recommendation 4: Enhance the Feature-Parsing Pipeline

-   **Action:** Improve the `parseContent` pipeline and its sub-parsers.
-   **Guidance:** Once the pipeline receives clean and reliably extracted strings from the AST, it will be much easier to enhance. The focus should then shift to implementing the missing TSM features (e.g., `{{ null }}` for line-erase, `//` for comments, and structural XML wrappers like `<content>`) by adding new specialized parsers to the pipeline.
