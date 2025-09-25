# TSMD Parser Migration: A Testable TODO List

This document outlines an incremental and testable plan to refactor the TSMD parser to align with the specification and resolve the issues identified in the investigation documents.

## Phase 1: Code Cleanup & Core Refactor

**Goal:** Remove dead code and fix the most critical architectural flaw (AST vs. string parsing).

- [ ] **Task 1.1: Delete Legacy Parser**
    -   **Action:** Delete the file `src/parser.ts`.
    -   **Verification:** Run the `test-file.ts` and `test-compilation.ts`

- [ ] **Task 1.2: Refactor Content Extraction to be AST-First**
    -   **Action:** Rewrite the content extraction logic in `extractMarkdownFromReturnStatement` (in `full-file-compiler.ts`). Remove the manual string parsing and parenthesis counting. The function should be modified to properly traverse the TypeScript AST to reliably find the content of a `ts.ParenthesizedExpression`.
    -   **Verification:** Run the `test-file.ts` and `test-compilation.ts` and check their output

## Phase 2: Unify and Consolidate Parsing Logic

**Goal:** Fix the incorrect global template implementation and unify common logic.

- [ ] **Task 2.1: Fix Global Template Detection**
    -   **Action:** In `full-file-compiler.ts`, modify `processGlobalTemplates` and `containsTemplateSyntax`. Remove the incorrect logic that searches for `(*...*)`. A global TSM block should be identified as a `ts.ParenthesizedExpression` containing TSM-specific syntax (e.g., `{{`, `#`, `<@`).
    -   **Verification:** Add a test case for a global TSM variable using the standard `(...)` syntax. Confirm that it compiles correctly.

- [ ] **Task 2.2: Consolidate Whitespace & Indentation Logic**
    -   **Action:** Analyze the redundant whitespace/indentation logic currently in `extractMarkdownFromReturnStatement` and other utility functions (`normalizeIndentation`). Consolidate this into a single, robust function that handles all TSM block normalization.
    -   **Verification:** All existing snapshot tests that involve formatting should remain unchanged. Add new tests for complex indentation scenarios to ensure the new utility is working correctly.

## Phase 3: Implement Missing Spec Features

**Goal:** Bring the parser up to full compliance with the `TSMD_IMPLEMENTATION.md` specification.

- [ ] **Task 3.1: Implement Comment Support**
    -   **Action:** Add a parsing step (ideally in the `parseContent` pipeline) to identify and remove lines that are TSM comments (e.g., `// This is a comment`).
    -   **Verification:** Add a test with comments inside a TSM block. The snapshot output should show that the comments are correctly removed from the final output.

- [ ] **Task 3.2: Implement Line-Erase Escape (`{{ null }}`)
    -   **Action:** Enhance the `parseContent` pipeline to recognize `{{ null }}`. This should produce a special sentinel that the `__tsm` runtime can process to remove a preceding empty line.
    -   **Verification:** Add a test case like `"Line 1\n\n{{ null }}Line 2"`. The rendered output should be `"Line 1\nLine 2"`.

- [ ] **Task 3.3: Implement Structural XML Wrappers (`<content>`)**
    -   **Action:** Add a parsing step to recognize and process structural-only tags like `<content>`. The parser should process the children of these tags but discard the tags themselves.
    -   **Verification:** Add a test where a TSM block is wrapped in `<content>...</content>`. The output should not include the tags.

## Phase 4: Final Polish

**Goal:** Finalize the refactor and ensure the codebase is clean and well-documented.

- [ ] **Task 4.1: Code Review and Documentation**
    -   **Action:** Conduct a thorough review of all refactored parser code. Update `TSMD_IMPLEMENTATION.md` and any other internal documentation to reflect the new, correct architecture.
    -   **Verification:** The documentation is up-to-date and a team member has approved the changes.
