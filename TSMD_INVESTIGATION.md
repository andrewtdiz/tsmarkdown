# TSMD Architecture Investigation

This document outlines the findings from investigating the current architecture of the TSMD transpiler, comparing the implementation in `src/compiler/full-file-compiler.ts` against the specification in `TSMD_IMPLEMENTATION.md`.

## 1. Overall Architecture

The current transpilation process follows a multi-stage pipeline that deviates from the original specification.

1.  **Regex-based Pre-processing (`preprocessTSmdInFunctions`):** The compiler first performs a regex-based search for `return (...)` statements. It attempts to convert the content of these statements into standard TypeScript template literals (e.g., `` `...` ``) by replacing `{{...}}` with `${...}`. This is a significant departure from the spec, which proposed using the TypeScript AST to locate TSM blocks and then parsing them with a custom grammar.

2.  **Global Template Processing (`processGlobalTemplates`):** The compiler attempts to process top-level variable declarations to find TSM blocks, similar to how JSX returns work, e.g., `const myTemplate = (...)`. However, the implementation incorrectly looks for a non-standard `(*...*)` syntax instead of the correct `(...)` block syntax.

3.  **TypeScript AST Parsing:** The pre-processed source code is then parsed into a standard TypeScript AST using `ts.createSourceFile`.

4.  **Feature Extraction:** The compiler traverses the AST to find functions and global template variables. It extracts the content from function return statements and the incorrectly identified `(*...*)` blocks.

5.  **TSM Feature Parsing (`parseContent`):** The extracted content is processed by a custom parser (`parseContent`) which identifies and builds data structures for interpolations (`{{...}}`), conditional blocks, and component tags (`<@.../>`).

6.  **Code Generation:** The parsed structures are used to generate the final TypeScript code, which replaces the original TSM blocks with calls to the `__tsm` runtime function. The `generateTranspiledFile` function assembles the final transpiled file.

## 2. Feature Coverage (Spec vs. Implementation)

| Feature | Specification | Implementation Status | Notes |
| :--- | :--- | :--- | :--- |
| **Block Markdown Return** | `return (...)` syntax parsed as a TSM block. | **Partially Implemented** | Implemented via a fragile regex pre-processor that converts it to a template literal. This is a major deviation from the spec's proposed AST-based approach and is prone to errors with nested or complex code. |
| **Inline Interpolation** | `{{ expr }}` | **Implemented** | Handled by both the pre-processor and the `parseContent` pipeline. |
| **Conditional Forms** | `{{ cond ? ... }}`, `{{ cond && ... }}` | **Implemented** | The parser correctly identifies and transforms conditional and ternary expressions. |
| **Component Tags** | `<@Comp .../>` | **Implemented** | The parser handles JSX-like component syntax and converts it to function calls. |
| **Global Templates** | Support for `(...)` blocks in variables is implied by the design. | **Incorrectly Implemented** | The feature is implemented, but it looks for a non-standard `(*...*)` syntax instead of the correct `(...)` block syntax used for returns. |
| **Falsy Compaction** | Falsy values render as empty strings. | **Implemented** | Relies on the `__tsm` runtime function, which appears to handle this as specified. |
| **Line-Erase Escape** | `{{ null }}` should remove a previous empty line. | **Not Implemented** | There is no evidence in the compiler or parser of handling for `{{ null }}` or the `__erasePrevLine` runtime function. |
| **XML Wrappers** | `<content>...</content>` for structure only. | **Not Implemented** | The parser does not appear to recognize or strip these structural XML tags. |
| **Comments in Blocks** | `//` comments should be ignored. | **Not Implemented** | The regex pre-processor does not account for comments, and they will likely be treated as literal text, contrary to the spec. |

## 3. Key Findings & Deviations

1.  **Brittle and Flawed Parsing Strategy:** The entire parsing approach is architecturally unsound. 
    *   **AST Underutilization:** The `extractMarkdownFromReturnStatement` function critically fails to use the AST. Instead of traversing the `ParenthesizedExpression` node, it reverts to operating on the raw source text, using manual parenthesis counting to find the end of the block. This is extremely fragile and will break with moderately complex nested code.
    *   **Regex Pre-processing:** The initial `preprocessTSmdInFunctions` step, which attempts to convert TSM blocks to template strings, is a workaround that adds complexity and is prone to failure.
    *   **Convoluted Whitespace Logic:** The process for normalizing indentation and handling newlines within `extractMarkdownFromReturnStatement` is complex, redundant, and involves multiple manual steps. This indicates a lack of a clear, robust whitespace handling strategy.

2.  **Incorrect Global Template Implementation:** The implementation for global templates is flawed. Instead of reusing the standard `(...)` block syntax, it incorrectly looks for a special, non-standard `(*...*)` syntax. This is a bug that creates an unnecessary and confusing inconsistency.

3.  **Incomplete Feature Set:** Several key features from the specification are missing, most notably the line-erase escape (`{{ null }}`) and the handling of structural XML wrappers (`<content>`). The lack of comment support is also a critical gap.

## 4. Conclusion & Recommendations

The current implementation successfully covers several core TSM features, such as interpolation, conditionals, and components. However, its architecture deviates significantly from the original design, introducing risks and inconsistencies.

**Recommendations:**

1.  **Overhaul the Parser:** The entire parsing mechanism needs to be refactored to be AST-first.
    *   Remove the `preprocessTSmdInFunctions` step entirely.
    *   Rewrite `extractMarkdownFromReturnStatement` to rely *only* on the TypeScript AST to extract the content of a TSM block. It should not perform manual string manipulation like parenthesis counting.
    *   Simplify and consolidate the whitespace and indentation logic into a single, reliable function.

2.  **Correct the Global Template Implementation:** The bug in `processGlobalTemplates` should be fixed to correctly identify standard `(...)` TSM blocks instead of the non-standard `(*...*)` syntax.

3.  **Implement Missing Features:** To achieve full feature coverage as per the spec, the following need to be implemented:
    *   Line-erase escape (`{{ null }}`).
    *   Handling of structural XML wrappers.
    *   Ignoring comments within TSM blocks.
