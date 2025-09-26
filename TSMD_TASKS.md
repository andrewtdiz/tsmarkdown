# TSM Transpiler Implementation Tasks

## Phase 1: Fix Core Code Generation (Critical - 2-3 days)

### 1.1 Fix AST Code Generator Syntax Errors
- [ ] **Fix duplicate return statement** in `src/compiler/core.ts:201-203`
  - Issue: Creates `return return __tsm([...])` syntax error
  - Solution: Remove duplicate return keyword in code replacement
- [ ] **Fix invalid chunk processing** in `src/compiler/ast-code-generator.ts`
  - Issue: Malformed TypeScript syntax generation
  - Solution: Ensure generated code is valid TypeScript
- [ ] **Add proper error handling** for malformed expressions
  - Issue: No graceful handling of parse errors
  - Solution: Add try-catch and meaningful error messages

### 1.2 Implement Context Detection
- [ ] **Add context detection in interpolation parsing** (`src/parser/interpolations.ts`)
  - Inline context: non-whitespace before `{{` on same line
  - Block context: `{{` is first non-whitespace on line
- [ ] **Store context information in TSM AST nodes**
  - Add context field to `TSMInterpolation` type
  - Track context during parsing
- [ ] **Use context in code generation** for array joining rules
  - Inline: join arrays with `""`
  - Block: join arrays with `"\n"`

### 1.3 Fix Expression Coercion Rules
- [ ] **Implement proper falsy value handling** in code generation
  - `undefined | false` → no chunk emitted
  - `null` → `__erasePrevLine` sentinel
- [ ] **Add context-aware array joining**
  - Inline context: join with `""`
  - Block context: join with `"\n"`

## Phase 2: Fix Newline and Boundary Semantics (1-2 days)

### 2.1 Implement Boundary Coalescing
- [ ] **Add boundary coalescing logic** to `__tsm` runtime (`src/runtime/tsm-runtime.ts`)
  - Track previous character state
  - Prevent double newlines at block boundaries
- [ ] **Ensure `__tsm` blocks have exactly one trailing newline**
  - Fix newline emission in code generator
  - Implement boundary coalescing rule

### 2.2 Fix Newline Emission
- [ ] **Fix line processing** to emit newlines correctly
  - Handle empty lines properly
  - Process comment lines correctly
- [ ] **Implement proper indentation preservation**
  - Compute baseline indent from opening `(` position
  - Strip baseline indent while preserving extra spaces

## Phase 3: Fix Complex Expression Parsing (2-3 days)

### 3.1 Fix Ternary Expression Parsing
- [ ] **Fix nested ternary parsing** with TSM blocks (`src/parser/interpolations.ts`)
  - Handle `{{ cond ? (TSM content) : (TSM content) }}`
  - Parse nested conditionals within ternary expressions
- [ ] **Ensure proper AST generation** for complex expressions
  - Fix `parseNestedTernary` function
  - Handle mixed content types

### 3.2 Fix Conditional Expression Parsing
- [ ] **Fix logical AND expressions** with TSM blocks
  - Handle `{{ cond && (TSM content) }}`
  - Parse condition extraction properly
- [ ] **Properly parse nested conditionals**
  - Handle complex nested structures
  - Fix conditional block processing

### 3.3 Fix JSX Component Parsing
- [ ] **Fix component attribute parsing** (`src/parser/interpolations.ts`)
  - Handle props with expressions: `prop={value}`
  - Handle string props: `prop="value"`
- [ ] **Handle component calls in code generation**
  - Generate proper function calls: `ComponentName({ prop: value })`
  - Ensure proper prop passing
- [ ] **Fix JSX placeholder replacement**
  - Replace `__JSX_EXPRESSION_X__` with actual component calls

## Phase 4: Validate Against Specification (1-2 days)

### 4.1 Test Matrix Implementation
- [ ] **Implement core test cases** from specification (Section 11.1)
  - Inline falsy doesn't add spaces: `X {{false && "Y"}} Z` → `X  Z`
  - Block falsy doesn't add blank line: `{{ false && "Hi" }}` → *(nothing)*
  - No double newline at joins
  - Array in inline vs block context
  - Indent preservation beyond baseline
  - Leading/trailing interior blank lines preserved
- [ ] **Add tests for edge cases** and error conditions
  - Invalid syntax handling
  - Missing imports
  - Non-stringifiable objects
- [ ] **Validate against golden test cases**
  - Input `.tsm` → expected `.ts` snapshot
  - Render output validation

### 4.2 Performance Optimization
- [ ] **Optimize chunk processing**
  - Avoid quadratic concatenation
  - Implement efficient flattening
- [ ] **Add proper error handling and diagnostics**
  - TSM001-TSM005 error codes
  - File/line/column information
  - Quick-fix suggestions
- [ ] **Add source map support**
  - Map TSM block spans to generated code
  - Enable proper stack traces

## Immediate Action Items (Start Here)

### Critical Fixes (Do First)
1. [ ] **Fix duplicate return statement** - `src/compiler/core.ts:201-203`
2. [ ] **Fix code generation syntax errors** - `src/compiler/ast-code-generator.ts`
3. [ ] **Add basic context detection** - inline vs block context

### Validation Steps
- [ ] Run `bun test test/core-features/` after each major fix
- [ ] Check that generated TypeScript compiles without errors
- [ ] Verify runtime output matches expected results
- [ ] Ensure no regressions in existing functionality

## Success Criteria

- [ ] All core test cases pass without syntax errors
- [ ] Context detection works correctly (inline vs block)
- [ ] Falsy values handled according to specification
- [ ] Newline semantics match specification
- [ ] Complex expressions parse and generate correctly
- [ ] Runtime produces expected output for all test cases

## File Priority Order

1. `src/compiler/core.ts` - Fix duplicate return (Critical)
2. `src/compiler/ast-code-generator.ts` - Fix code generation
3. `src/parser/interpolations.ts` - Fix context detection and parsing
4. `src/runtime/tsm-runtime.ts` - Fix runtime behavior
5. Test files - Validate fixes

---

**Total Estimated Time**: 6-10 days for full implementation
**Current Status**: Investigation complete, ready to start Phase 1