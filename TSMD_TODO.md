# TSMD Implementation Task List

Based on the TSMD specification and analysis of the current architecture, here are the critical tasks needed to implement the full TSMD transpiler:

## Critical Issues (High Priority)

### 1. Recursive Nested Conditional Rendering
**Status**: Pending
**Description**: The current system fails when conditional blocks contain other TSM syntax. For example:
```ts
{{ cond1 && (
  Some content
  {{ cond2 && (nested content) }}
  More content
)}}
```
**Implementation**: Fix the parsing pipeline to properly handle nested TSM content within conditional blocks by recursively processing the content before adding to context arrays.

### 2. Proper Falsy Compaction
**Status**: Pending
**Description**: Currently, falsy values (false, null, undefined, "") still emit whitespace placeholders, violating the spec requirement that they "don't take up space on the line."
**Implementation**: Modify the TSM runtime and parsing to ensure falsy interpolations emit zero output, including surrounding spaces when they're the only content between text boundaries.

### 3. Line-Erase Escape Functionality
**Status**: Pending
**Description**: Implement `{{ null }}` behavior where encountering null removes the previously emitted empty line.
**Implementation**: Add `__ERASE_PREV_LINE` sentinel and `__erasePrevLine` function to handle removing trailing empty lines from the buffer.

### 4. Nested TSM Block Parsing
**Status**: Pending
**Description**: Conditional and ternary expressions should properly parse and render nested TSM content, not treat it as raw strings.
**Implementation**: Enhance the parsing pipeline to recursively process TSM content within expression values, ensuring proper chunk generation for nested blocks.

## Enhanced Parsing & Processing (Medium Priority)

### 5. Enhanced Ternary Expression Parsing
**Status**: Pending
**Description**: Handle complex nested ternary cases like `{{ a ? (b ? c : d) : e }}` with proper recursive parsing.
**Implementation**: Improve the `parseNestedTernary` function to handle arbitrarily nested ternary expressions and ensure proper content processing.

### 6. Whitespace Rules Implementation
**Status**: Pending
**Description**: Ensure surrounding spaces are not emitted when interpolations resolve to falsy values, especially at line boundaries.
**Implementation**: Modify the chunk generation logic to handle whitespace compaction based on falsy interpolation results.

### 7. Runtime Chunk Handling Improvements
**Status**: Pending
**Description**: Fix TSM runtime to properly handle nested chunk arrays and conditional expressions as first-class values.
**Implementation**: Enhance `__tsm` function to correctly process complex nested structures and maintain proper chunk relationships.

### 8. Comment Handling
**Status**: Pending
**Description**: Lines beginning with `//` inside TSM blocks should be treated as authoring comments and not emitted.
**Implementation**: Add comment detection and filtering in the parsing pipeline, preserving newlines for visual separation unless erased by `{{ null }}`.

## System Infrastructure (Medium Priority)

### 9. Error Diagnostics System
**Status**: Pending
**Description**: Add comprehensive error handling and diagnostics (TSM001-TSM006) for common issues like unbalanced braces, missing imports, non-stringifiable objects.
**Implementation**: Implement error reporting system with file/line/column information and quick-fix suggestions where possible.

### 10. XML Wrapper Support
**Status**: Pending
**Description**: Add `<content>...</content>` support that groups content without emitting wrapper elements, used for indentation/grouping.
**Implementation**: Extend the TSM AST to handle XML wrapper elements that compile to just their children.

### 11. Streaming Compatibility
**Status**: Pending
**Description**: Implement forward-compatible streaming support to handle `Iterable<string>` chunks for future streaming renderer.
**Implementation**: Ensure the system can handle iterable chunks in the runtime without breaking existing functionality.

## Testing & Validation (Lower Priority)

### 12. Comprehensive Test Suite
**Status**: Pending
**Description**: Create test suite covering recursive conditionals, falsy compaction, line erasure, nested expressions, and edge cases.
**Implementation**: Develop golden tests with input `.tsm` → expected `.ts` snapshots and runtime output validation.

### 13. Performance Optimization
**Status**: Pending
**Description**: Optimize parsing and runtime performance for large files and complex nested structures.
**Implementation**: Profile current bottlenecks and implement optimizations in the parsing pipeline and runtime execution.

## Implementation Notes

- **Start with recursive conditional rendering** as it's the foundation for most other features
- **Falsy compaction** is critical for proper markdown output formatting
- **Line-erase escape** provides the authoring experience described in the spec
- **Nested parsing** enables the sophisticated expression handling required
- **Error handling** ensures robust development experience

## Current Architecture Strengths

- Solid TSM runtime foundation with chunk processing
- Good separation of concerns with parsing pipeline
- Existing support for basic interpolation and JSX components
- TypeScript integration with compiler API
- Code block protection system

## Estimated Timeline

- **Phase 1 (Weeks 1-2)**: Recursive conditionals, falsy compaction, line-erase escape
- **Phase 2 (Weeks 3-4)**: Nested parsing, ternary improvements, whitespace rules
- **Phase 3 (Weeks 5-6)**: Error diagnostics, XML wrappers, streaming compatibility
- **Phase 4 (Weeks 7-8)**: Testing, performance optimization, documentation
