# TSMD Compiler Architecture & Refactoring Guide

This document provides an overview of the current TSMD compiler architecture, identifies critical issues, and outlines a clear path for refactoring. This guide assumes that the parser has been refactored according to `TSMD_PARSER_TODO.md` and now provides a clean, structured `ParsedTSmd` object.

## 1. Current Compiler Architecture

The compiler's primary responsibility is to transform the `ParsedTSmd` object from the parser into final, executable TypeScript code. The main entry point is `compile` in `src/compiler.ts`, which orchestrates several utilities from `src/compiler/compiler-utils.ts` and `src/compiler/generateReturnStatements.ts`.

However, the current implementation suffers from a major architectural flaw: **it does not trust its input**. Instead of acting as a pure code generator, it performs its own parsing, string manipulation, and placeholder replacement, which duplicates the parser's responsibilities and introduces significant fragility.

## 2. Key Issues & Deviations

### Issue 1: Redundant Parsing and String Manipulation

The compiler utilities contain multiple functions that re-parse strings or perform manual string manipulation, a task that should be exclusively handled by the parser.

-   **`extractDependencies` & `parseImportStatement`:** These functions use regex to parse import statements from raw strings. A refactored parser should provide a structured list of import objects, making these manual parsing functions obsolete.
-   **`compileJSXExpression`:** This function re-parses a JSX expression string to create a `TSMComponent` object. The parser should have already done this, and the `ParsedTSmd` object should contain the structured `TSMComponent` directly.
-   **`replaceJSXExpressionPlaceholders`:** This function uses string replacement to inject JSX expressions back into the code. A proper compiler would build the final code structure directly from the parsed AST, eliminating the need for placeholders.

### Issue 2: Flawed and Convoluted Code Generation

The core code generation logic is complex, difficult to follow, and contains architectural anti-patterns.

-   **`compileTemplate`:** This function is highly problematic. It contains a `require()` call for the runtime, creating a potential circular dependency and indicating a poor separation of concerns. Its responsibility is unclear, as it seems to be a catch-all for template processing that should be handled by a more specialized function.
-   **`generateReturnStatements`:** This is the heart of the code generation, but it is incredibly complex. It contains deeply nested logic to `reconstructTernary` expressions from arrays and `processNestedArrays`, effectively re-parsing the structure that the parser should have provided. It manually encodes string literals and tries to guess how to format different types of chunks.

### Issue 3: Unclear Separation of Concerns

The line between the parser, compiler, and renderer is blurred.

-   The compiler contains functions from the `renderer` directory (`string-helpers.ts`), suggesting a tangled dependency graph.
-   The logic is not data-driven. Instead of cleanly mapping from a `ParsedTSmd` structure to an output string, it performs a series of imperative, fragile transformations.

## 3. Refactoring Path

The goal is to refactor the compiler into a pure, data-driven code generator that trusts the structured `ParsedTSmd` object it receives from the parser.

### Recommendation 1: Purge All Parsing Logic from the Compiler

-   **Action:** Delete the following functions from `compiler-utils.ts`:
    -   `extractDependencies`
    -   `parseImportStatement`
    -   `compileJSXExpression`
    -   `replaceJSXExpressionPlaceholders`
-   **Reasoning:** The refactored parser will provide structured data for imports and JSX components, making these redundant.

### Recommendation 2: Overhaul Code Generation

-   **Action:** Completely rewrite `generateReturnStatements.ts` and `compileTemplate`.
-   **Guidance:**
    1.  **Create a `generateTSMCall` function.** This function will be the new core of the compiler. It will take a `Chunk[]` array from the parser and recursively walk the structure, generating the final `__tsm([...])` call string.
    2.  It should use a `switch` statement or a visitor pattern to handle each chunk type (string literal, interpolation, component, conditional, etc.) and generate the correct code for it.
    3.  String literals should be safely encoded using `JSON.stringify()`.
    4.  Component objects should be transformed into function calls (e.g., `await MyComponent({ prop: 'value' })`).
    5.  This new function will replace the convoluted logic in `generateReturnStatements` and the confusing `compileTemplate` function.

### Recommendation 3: Simplify the Main `compile` Function

-   **Action:** Refactor the `compile` function in `src/compiler.ts`.
-   **Guidance:** With the new `generateTSMCall` function, the main `compile` function will become much simpler. It will be responsible for assembling the final file from the structured data:
    1.  Generate import statements (from the parser's structured import data).
    2.  Generate the props interface.
    3.  Generate the function signature.
    4.  Generate the `if/else` structure for conditional returns, calling `generateTSMCall` for each TSM block.

This refactoring will result in a clean, maintainable, and robust compiler that is a true counterpart to the refactored AST-based parser.