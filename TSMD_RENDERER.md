# TSMD Renderer Investigation

This document outlines the findings from investigating the `src/renderer` directory and its relationship to the core TSMD compiler.

## 1. Architectural Findings

The `src/renderer` directory does **not** contain code related to the core TSMD-to-TypeScript transpiler. Instead, it implements a completely separate, parallel feature: a **Direct Runtime Renderer**.

-   **Compiler's Goal:** Transpile a `.tsmd` file into a `.ts` file for later execution.
-   **Renderer's Goal:** Interpret a `.tsmd` file and execute it on-the-fly against a given context object, producing a string result immediately without creating a `.ts` file.

This direct renderer has its own implementations for parsing, expression evaluation, and TypeScript execution, which creates significant architectural overlap and confusion.

## 2. Relationship to the Compiler

-   **Direct Dependencies:** The only function from `src/renderer` that is directly used by the `full-file-compiler.ts` is `normalizeIndentation` from `src/renderer/string-helpers.ts`.
-   **Necessity:** The direct renderer and its components are **not required** for the core TSMD transpilation process to function. They are a separate, optional feature.

## 3. Key Issues & Recommendations

The primary issue is the duplication of logic and the blurring of architectural boundaries. The renderer contains its own parsing and evaluation logic, which is inconsistent with the main parser and compiler.

### Recommendation 1: Relocate Shared Utilities

The few functions that are truly shared should be moved to a neutral, shared location.

-   **Action:** Move `normalizeIndentation` from `src/renderer/string-helpers.ts` to a more general utility directory like `src/utils/string-helpers.ts`. The compiler and the renderer can then both import it from this single source of truth.

### Recommendation 2: Isolate the Renderer

Treat the `src/renderer` directory as a distinct package. It should be understood as a separate tool that provides runtime-rendering capabilities, not as a part of the core compiler.

### Recommendation 3: Refactor the Renderer Post-Compiler Refactor

After the main parser and compiler have been refactored to be fully AST-driven, the direct renderer should be updated to leverage this new, robust infrastructure.

-   **Action:** Modify the `DirectRenderer` to use the new, official TSMD parser instead of its own internal parsing logic (`template-parsing.ts`, etc.).
-   **New Workflow for DirectRenderer:**
    1.  Accept a TSMD string.
    2.  Pass it to the refactored, AST-based **parser** to get a clean, structured `ParsedTSmd` object.
    3.  Traverse the `ParsedTSmd` object's structure.
    4.  Use the renderer's existing expression evaluation logic (`evaluateExpression`, `typescript-runtime.ts`) to resolve interpolations and conditionals against a provided context.
    5.  Generate the final string output.

This will unify the parsing logic across the entire project, remove a significant amount of redundant and fragile code, and make the direct renderer more reliable and consistent with the compiler.
