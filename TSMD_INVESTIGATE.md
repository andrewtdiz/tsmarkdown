# TSM Transpiler Investigation & Implementation Plan

## Current State Analysis

After analyzing the current implementation and test failures, the transpiler has the following issues that prevent it from working according to the specification:

### 1. Critical Code Generation Issues

**Problem**: The AST code generator produces invalid TypeScript syntax
- Generated code has syntax errors like `return return __tsm([...])` (duplicate return)
- Invalid expression parsing in complex interpolations
- Missing proper handling of nested expressions

**Evidence from test failures**:
```
9 |   return return __tsm(["- "]) ", item, ""])
             ^
error: Unexpected return
```

### 2. Context Detection Missing

**Problem**: No implementation of inline vs block context detection
- Specification requires: "where you open `{{` is where it renders"
- Current implementation doesn't differentiate between inline and block contexts
- This affects array joining (`""` vs `"\n"`) and whitespace handling

### 3. Expression Coercion Issues

**Problem**: Falsy value handling doesn't match specification
- `undefined`, `false` should emit nothing (no spaces)
- `null` should erase previous line
- Current runtime handles this but code generation doesn't properly implement the rules

### 4. Newline and Boundary Semantics

**Problem**: Missing boundary coalescing rule
- Specification: "`__tsm` block has exactly one trailing newline at its boundary"
- Boundary coalescing rule to prevent double newlines
- Current implementation adds newlines incorrectly

### 5. Complex Expression Parsing

**Problem**: Nested interpolations and complex expressions fail
- Ternary expressions with TSM blocks inside don't parse correctly
- Conditional expressions with nested content fail
- JSX component parsing has issues

## Incremental Implementation Plan

### Phase 1: Fix Core Code Generation (High Priority)

#### 1.1 Fix AST Code Generator Syntax Errors
**File**: `src/compiler/ast-code-generator.ts`
**Issues**:
- Line 202: Duplicate `return` statement generation
- Invalid chunk processing that creates malformed TypeScript
- Missing proper expression wrapping

**Tasks**:
1. Fix the `transpileSource` function to avoid duplicate returns
2. Ensure generated code is valid TypeScript syntax
3. Add proper error handling for malformed expressions

#### 1.2 Implement Context Detection
**Files**: `src/compiler/ast-code-generator.ts`, `src/parser/interpolations.ts`
**Tasks**:
1. Add context detection in interpolation parsing:
   - Inline context: non-whitespace before `{{` on same line
   - Block context: `{{` is first non-whitespace on line
2. Store context information in TSM AST nodes
3. Use context in code generation for array joining rules

#### 1.3 Fix Expression Coercion Rules
**Files**: `src/compiler/ast-code-generator.ts`, `src/runtime/tsm-runtime.ts`
**Tasks**:
1. Implement proper falsy value handling in code generation:
   - `undefined | false` → no chunk emitted
   - `null` → `__erasePrevLine` sentinel
2. Add context-aware array joining:
   - Inline: join with `""`
   - Block: join with `"\n"`

### Phase 2: Fix Newline and Boundary Semantics (Medium Priority)

#### 2.1 Implement Boundary Coalescing
**Files**: `src/runtime/tsm-runtime.ts`, `src/compiler/ast-code-generator.ts`
**Tasks**:
1. Add boundary coalescing logic to `__tsm` runtime
2. Track previous character state to prevent double newlines
3. Ensure `__tsm` blocks have exactly one trailing newline

#### 2.2 Fix Newline Emission
**Files**: `src/compiler/ast-code-generator.ts`
**Tasks**:
1. Fix line processing to emit newlines correctly
2. Handle empty lines and comment lines properly
3. Implement proper indentation preservation

### Phase 3: Fix Complex Expression Parsing (Medium Priority)

#### 3.1 Fix Ternary Expression Parsing
**Files**: `src/parser/interpolations.ts`, `src/compiler/ast-code-generator.ts`
**Tasks**:
1. Fix nested ternary parsing with TSM blocks
2. Properly handle conditional blocks within ternary expressions
3. Ensure proper AST generation for complex expressions

#### 3.2 Fix Conditional Expression Parsing
**Files**: `src/parser/interpolations.ts`
**Tasks**:
1. Fix logical AND expressions with TSM blocks
2. Properly parse nested conditionals
3. Handle complex nested structures

#### 3.3 Fix JSX Component Parsing
**Files**: `src/parser/interpolations.ts`, `src/compiler/ast-code-generator.ts`
**Tasks**:
1. Fix component attribute parsing
2. Handle component calls in code generation
3. Ensure proper prop passing

### Phase 4: Validate Against Specification (Low Priority)

#### 4.1 Test Matrix Implementation
**Tasks**:
1. Implement all core test cases from specification (Section 11.1)
2. Add tests for edge cases and error conditions
3. Validate against golden test cases

#### 4.2 Performance Optimization
**Tasks**:
1. Optimize chunk processing
2. Implement proper error handling and diagnostics
3. Add source map support

## Immediate Action Items

### 1. Fix Duplicate Return Statement (Critical)
**Location**: `src/compiler/core.ts:201-203`
```typescript
transpiledCode = transpiledCode.substring(0, match.index) +
    `return ${generatedCode}` +  // This adds return
    transpiledCode.substring(match.index + match[0].length);
```
**Issue**: The original code already has `return`, so this creates `return return ...`

### 2. Fix Code Generation Context
**Location**: `src/compiler/ast-code-generator.ts`
**Issue**: The code generator doesn't properly handle the context where interpolations appear

### 3. Fix Expression Parsing
**Location**: `src/parser/interpolations.ts`
**Issue**: Complex expressions with nested TSM blocks fail to parse correctly

## Success Criteria

The transpiler will be considered working when:

1. ✅ All core test cases pass without syntax errors
2. ✅ Context detection works correctly (inline vs block)
3. ✅ Falsy values are handled according to specification
4. ✅ Newline semantics match specification
5. ✅ Complex expressions parse and generate correctly
6. ✅ Runtime produces expected output for all test cases

## Risk Assessment

**High Risk**: Core code generation issues could require significant refactoring
**Medium Risk**: Context detection and expression parsing may need architectural changes
**Low Risk**: Runtime improvements and optimization


## Next Steps

1. Start with Phase 1.1 - Fix the duplicate return statement issue
2. Implement basic context detection
3. Fix expression coercion rules
4. Gradually work through remaining phases
5. Validate against test suite after each phase
