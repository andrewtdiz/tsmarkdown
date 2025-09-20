# TSM (TypeScript-Markdown) Architecture Implementation Tasks

Based on the architecture specification in `ARCHITECTURE.md` and the current failing implementation in `test-end-to-end.ts`, here are the incremental tasks needed to properly implement the TSM transpiler:

## Phase 1: Core Runtime Foundation

### 1.1 Create TSM Runtime Module
- [ ] **Create `src/runtime/tsm-runtime.ts`** with the core runtime primitives:
  - [ ] `type Chunk = string | null | undefined | false | Iterable<string>`
  - [ ] `export function __tsm(chunks: Array<Chunk>): string` - main runtime function
  - [ ] `export function __tsmJoin(parts: Array<Chunk>): Array<Chunk>` - flatten helper
  - [ ] `export function __erasePrevLine(buf: string[]): void` - line erase functionality
  - [ ] Implement falsy compaction logic (falsy values don't emit text or whitespace)
  - [ ] Implement whitespace normalization and newline handling
  - [ ] Handle `__ERASE_PREV_LINE` sentinel for `{{ null }}` functionality

### 1.2 Create TSM AST Types
- [ ] **Create `src/parser/tsm-ast.ts`** with TSM-specific AST node types:
  - [ ] `TSMBlock`, `TSMLine`, `TSMTextChunk`, `TSMInterpolation`, `TSMComponent`, `TSMXmlGroup`
  - [ ] Support for nested blocks in conditional expressions
  - [ ] Proper typing for TSM grammar elements

## Phase 2: TSM Grammar Parser

### 2.1 TSM Block Detection
- [ ] **Enhance `src/parser/component-scanner.ts`** to properly detect TSM blocks:
  - [ ] Detect `return ( ... )` patterns containing TSM tokens (`{{`, `<@`, XML tags)
  - [ ] Distinguish between regular TypeScript expressions and TSM blocks
  - [ ] Handle one-line returns like `return (**API Error**)`

### 2.2 TSM Grammar Parser
- [ ] **Create `src/parser/tsm-grammar-parser.ts`** implementing the TSM grammar:
  - [ ] Parse `Block := "(" WS? Lines WS? ")"`
  - [ ] Parse `Lines := (Line (NL Line)*)?`
  - [ ] Parse `Line := (TextChunk | Interp | Component | XmlGroup)*`
  - [ ] Parse `Interp := "{{" WS? Expr WS? "}}"`
  - [ ] Parse `Component := "<@" Ident Attrs? ("/>" | ">" Lines "</@" Ident ">")`
  - [ ] Parse `XmlGroup := "<" Ident Attrs? ">" Lines "</" Ident ">"`
  - [ ] Handle balanced braces in expressions
  - [ ] Support for comments inside blocks (lines starting with `//`)

### 2.3 Expression Parsing
- [ ] **Enhance expression parsing** to handle TSM-specific constructs:
  - [ ] Parse conditional forms: `{{cond ? (Block) : (Block)}}`
  - [ ] Parse logical forms: `{{cond && (Block)}}`, `{{!cond && (Block)}}`
  - [ ] Parse nested TSM blocks within interpolations
  - [ ] Validate TypeScript expressions within `{{ }}`

## Phase 3: TSM to TypeScript Transformation

### 3.1 TSM AST to TypeScript Code Generation
- [ ] **Create `src/compiler/tsm-codegen.ts`** for TSM-specific code generation:
  - [ ] Convert TSM blocks to `__tsm([...])` calls
  - [ ] Generate proper chunk arrays with text literals and interpolations
  - [ ] Handle conditional rendering with nested `__tsm` calls
  - [ ] Convert components `<@Comp/>` to function calls `Comp()`
  - [ ] Handle XML groups as no-op wrappers (just emit children)
  - [ ] Generate `__ERASE_PREV_LINE` sentinels for `{{ null }}`

### 3.2 Import Management
- [ ] **Enhance import handling** to automatically add TSM runtime imports:
  - [ ] Add `import { __tsm, __tsmJoin, __erasePrevLine } from "tsm-runtime"` when needed
  - [ ] Tree-shake unused runtime functions
  - [ ] Handle component imports for `<@Component/>` usage

### 3.3 Full-File Compilation Integration
- [ ] **Fix `src/compiler/full-file-compiler.ts`** to use proper TSM transformation:
  - [ ] Replace current template literal approach with TSM block detection
  - [ ] Use TSM grammar parser instead of regex-based preprocessing
  - [ ] Generate proper `__tsm` calls instead of template literals
  - [ ] Handle global template syntax outside functions properly

## Phase 4: Advanced TSM Features

### 4.1 Conditional Rendering
- [ ] **Implement conditional rendering** as specified in architecture:
  - [ ] `{{ cond ? (Block) : (Block) }}` → ternary with nested `__tsm` calls
  - [ ] `{{ cond && (Block) }}` → logical AND with conditional `__tsm` call
  - [ ] `{{ !cond && (Block) }}` → logical NOT with conditional `__tsm` call
  - [ ] Parse nested blocks recursively within conditionals

### 4.2 Component System
- [ ] **Implement TSM component system**:
  - [ ] Zero-arg self-closing: `<@Dashboard/>` → `Dashboard()`
  - [ ] Props: `<@Comp a="x" b={expr}/>` → `Comp({ a: "x", b: expr })`
  - [ ] Async component support with `await Promise.all`
  - [ ] Component import validation (TSM003 error)

### 4.3 Whitespace and Line Handling
- [ ] **Implement precise whitespace rules**:
  - [ ] Preserve author indentation exactly as written
  - [ ] Handle falsy compaction (no placeholder whitespace for falsy values)
  - [ ] Implement `{{ null }}` line-erase functionality
  - [ ] Handle trailing newlines only if authored
  - [ ] Support for authoring comments (lines starting with `//`)

## Phase 5: Error Handling and Diagnostics

### 5.1 TSM-Specific Error Codes
- [ ] **Implement TSM error diagnostics**:
  - [ ] TSM001: Non-stringifiable object interpolation
  - [ ] TSM002: Unbalanced `{{ ... }}` or unmatched `<@/...>` tags
  - [ ] TSM003: Component not imported
  - [ ] TSM004: Disallowed top-level XML tag
  - [ ] TSM005: Async in sync context
  - [ ] TSM006: Expression parse failure inside `{{ }}`
  - [ ] Include file/line/column information and quick-fixes

### 5.2 Validation and Type Checking
- [ ] **Add TSM-specific validation**:
  - [ ] Validate component imports exist
  - [ ] Check for async/sync context mismatches
  - [ ] Validate expression syntax within interpolations
  - [ ] Check for balanced braces and tags

## Phase 6: Testing and Integration

### 6.1 Golden Tests
- [ ] **Create comprehensive test suite**:
  - [ ] Input `.tsm` → expected `.ts` snapshot tests
  - [ ] Render output tests for various TSM constructs
  - [ ] Error case tests for all TSM error codes
  - [ ] Whitespace and line handling tests
  - [ ] Component integration tests

### 6.2 End-to-End Integration
- [ ] **Fix `test-end-to-end.ts`** to work with proper TSM implementation:
  - [ ] Update test to expect proper `__tsm` calls instead of template literals
  - [ ] Test the complete TSM transformation pipeline
  - [ ] Verify runtime behavior matches architecture specification

### 6.3 Performance Optimization
- [ ] **Implement performance optimizations**:
  - [ ] Single pass TSM parse per block
  - [ ] Reuse TypeScript AST for host code
  - [ ] Flat chunk arrays to avoid quadratic concatenation
  - [ ] Batch async awaits with `Promise.all`

## Phase 7: Tooling and Developer Experience

### 7.1 Type Definitions
- [ ] **Create TypeScript definitions**:
  - [ ] `src/types/tsm-runtime.d.ts` for runtime helpers
  - [ ] `TSMNode` and `TSMComponent` type definitions
  - [ ] Proper return type annotations for transpiled functions

### 7.2 Editor Integration (Future)
- [ ] **Language mode highlighting**:
  - [ ] Markdown tokens (headings, lists, emphasis)
  - [ ] `{{ ... }}` expressions as TypeScript
  - [ ] `<@Comp/>` as components
  - [ ] Source maps for TSM block spans

## Current Issues to Fix Immediately

### Critical Issues in `test-end-to-end.ts`:
1. **Wrong transformation approach**: Currently using template literals instead of `__tsm` calls
2. **Missing runtime**: No `__tsm`, `__tsmJoin`, `__erasePrevLine` functions
3. **Incomplete parsing**: Not properly detecting TSM blocks vs regular TypeScript
4. **Broken conditional syntax**: `{{ data.isAuthorized ? (Authorized` is cut off
5. **Missing component handling**: `<@Dashboard />` not converted to function calls
6. **No line-erase support**: `{{ null }}` not handled properly

### Priority Order:
1. **Phase 1** (Runtime Foundation) - Critical for basic functionality
2. **Phase 2** (Grammar Parser) - Essential for proper parsing
3. **Phase 3** (Transformation) - Core compilation logic
4. **Phase 4** (Advanced Features) - Full TSM feature set
5. **Phase 5** (Error Handling) - Production readiness
6. **Phase 6** (Testing) - Quality assurance
7. **Phase 7** (Tooling) - Developer experience

This task list provides a clear roadmap for implementing the TSM transpiler according to the architecture specification, with each phase building upon the previous ones to create a robust and feature-complete system.
