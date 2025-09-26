# Nested Conditionals Implementation Analysis & Recommendation

## Current Architecture Analysis

### 1. Brace Matching System
The project has a robust brace matching system in `src/utils/string-helpers.ts`:

- `findMatchingDoubleBrace()`: Correctly handles nested `{{` and `}}` pairs
- `findMatchingBrace()`: Handles single braces with string literal awareness
- `findMatchingParen()`: Handles parentheses matching

**✅ Strength**: The brace matching logic is solid and handles nesting correctly.

### 2. Expression Classification System
The parser uses `classifyExpression()` to determine expression types:
- `null`: `{{ null }}`
- `conditional`: `{{ condition && (content) }}`
- `ternary`: `{{ condition ? trueValue : falseValue }}`
- `jsx`: `{{ <@Component /> }}`
- `interpolation`: Regular variable references

**✅ Strength**: Good separation of concerns for different expression types.

### 3. Current Parsing Flow
```
Content → findMatchingDoubleBrace() → classifyExpression() → process by type
```

**❌ Problem**: The current system processes expressions sequentially, but nested conditionals require **recursive processing** of the content within parentheses.

## Root Cause Analysis

### The Core Issue
The current parser correctly identifies the outer conditional:
```typescript
{{user && isActive && (
  {{user.role === 'admin' && (
    # Admin Dashboard
    {{user.permissions.includes('delete') ? (...) : (...)}}
  )}}
  {{user.role !== 'admin' && (
    # User Dashboard
  )}}
)}}
```

But when it processes the content inside the parentheses, it treats the nested `{{...}}` as **raw text** instead of **nested TSM expressions** that need to be parsed.

### Specific Failure Points

1. **Content Processing**: In `parseInterpolations()` line 277, the nested content is processed with `parseInterpolations(blockContent, context)`, but the result is stored as a string instead of being parsed into an AST.

2. **AST Generation**: The `parseInterpolationsToAST()` function doesn't properly handle nested conditional content - it treats nested `{{}}` as text chunks instead of parsing them as expressions.

3. **Code Generation**: The AST code generator tries to include raw TSM syntax (`{{user.role === 'admin' && (`) inside JavaScript expressions, which is invalid.

## Recommended Solution: Incremental Implementation

### Phase 1: Fix Content Processing (Immediate)

**Problem**: Nested content is processed as strings instead of being parsed into AST nodes.

**Solution**: Modify the conditional processing to recursively parse nested content into proper AST nodes.

**Files to modify**:
- `src/parser/interpolations.ts` (lines 276-278)
- `src/parser/tsm-ast.ts` (add nested conditional support)

**Test Case**:
```typescript
// Simple nested conditional
{{outer && (
  {{inner && (
    # Nested Content
  )}}
)}}
```

**Implementation**:
```typescript
// In parseInterpolationsToAST(), conditional case:
case 'conditional':
  const andPattern = /&&\s*\(/;
  const match = expression.match(andPattern);
  if (match) {
    const andIndex = match.index!;
    const condition = expression.substring(0, andIndex).trim();
    const parenStart = andIndex + match[0].length - 1;
    const parenEnd = findMatchingParen(expression, parenStart);
    
    if (parenEnd !== -1) {
      const blockContent = expression.substring(parenStart + 1, parenEnd).trim();
      
      // RECURSIVELY PARSE the nested content into AST
      const nestedAST = parseInterpolationsToAST(blockContent, context);
      
      // Store the parsed AST instead of raw string
      context.conditionalBlocks.push({
        condition: condition,
        content: nestedAST, // Store AST, not string
      });
      
      chunks.push({
        type: 'TSMInterpolation',
        expression: expression,
        isLogical: true,
        conditionalBlocks: [nestedAST] // Reference to nested AST
      });
    }
  }
```

### Phase 2: Enhance AST Code Generation (2-3 days)

**Problem**: The code generator doesn't know how to handle nested AST nodes in conditionals.

**Solution**: Extend the AST code generator to recursively process nested conditional AST nodes.

**Files to modify**:
- `src/compiler/ast-code-generator.ts`
- `src/parser/tsm-ast.ts` (extend interfaces)

**Implementation**:
```typescript
// In TSMCodeGenerator.visitInterpolation():
if (interpolation.isLogical && interpolation.conditionalBlocks) {
  // Process nested conditional blocks
  for (const nestedBlock of interpolation.conditionalBlocks) {
    const nestedGenerator = new TSMCodeGenerator(this.context);
    const nestedCode = nestedGenerator.generateExpression(nestedBlock);
    this.output.push(nestedCode);
  }
}
```

### Phase 3: Fix Complex Nested Cases (3-4 days)

**Problem**: Complex cases with multiple nested levels and mixed expression types.

**Test Cases**:
```typescript
// Complex nested with ternary
{{user && isActive && (
  {{user.role === 'admin' && (
    # Admin Dashboard
    {{user.permissions.includes('delete') ? (
      You have delete permissions.
    ) : (
      Limited permissions.
    )}}
  )}}
)}}
```

**Solution**: Implement a full recursive parsing pipeline that handles:
- Nested conditionals within conditionals
- Ternary expressions within conditionals
- Mixed expression types at any nesting level

### Phase 4: Context Detection (2-3 days)

**Problem**: Implement proper inline vs block context detection as per specification.

**Solution**: Add context tracking to the parser to determine whether interpolations should render inline or as blocks.

## Incremental Testing Strategy

### Test 1: Simple Nested (Phase 1)
```typescript
// Input
{{outer && (
  {{inner && (
    # Nested Content
  )}}
)}}

// Expected Output
(outer && (inner && __tsm(["# Nested Content"])))
```

### Test 2: Nested with Ternary (Phase 2)
```typescript
// Input
{{user && (
  {{user.role === 'admin' ? (
    # Admin Dashboard
  ) : (
    # User Dashboard
  )}}
)}}

// Expected Output
(user && (user.role === 'admin' ? __tsm(["# Admin Dashboard"]) : __tsm(["# User Dashboard"])))
```

### Test 3: Complex Nested (Phase 3)
```typescript
// Input - the full complex test case
// Expected Output - proper nested structure with all conditionals and ternaries
```

## Implementation Priority

1. **Phase 1** (Critical): Fix basic nested conditional parsing
2. **Phase 2** (Important): Enhance AST code generation
3. **Phase 3** (Complex): Handle complex nested cases
4. **Phase 4** (Specification): Add context detection

## Key Architectural Changes

### 1. AST Structure Enhancement
```typescript
interface TSMInterpolation extends TSMNode {
  expression: string;
  isLogical?: boolean;
  isConditional?: boolean;
  conditionalBlocks?: TSMBlock[]; // NEW: Store nested AST blocks
}
```

### 2. Recursive Processing Pipeline
```
Content → parseInterpolationsToAST() → 
  ├─ Text chunks
  ├─ Conditional expressions → parseInterpolationsToAST(nestedContent)
  ├─ Ternary expressions → parseInterpolationsToAST(nestedContent)
  └─ Regular interpolations
```

### 3. Code Generation Enhancement
```typescript
// Generate nested conditionals recursively
if (interpolation.conditionalBlocks) {
  for (const block of interpolation.conditionalBlocks) {
    const nestedCode = generateExpression(block);
    // Integrate nested code into parent expression
  }
}
```

## Success Metrics

- ✅ Simple nested conditionals work
- ✅ Complex nested conditionals work
- ✅ Mixed expression types work at any nesting level
- ✅ All existing tests continue to pass
- ✅ New nested conditional tests pass
- ✅ Generated code is valid TypeScript
- ✅ Runtime output matches expected results

## Risk Mitigation

1. **Backward Compatibility**: Ensure existing functionality continues to work
2. **Incremental Testing**: Test each phase thoroughly before moving to the next
3. **Fallback Handling**: Add proper error handling for malformed nested expressions
4. **Performance**: Monitor parsing performance with deeply nested structures

This approach provides a clear path from the current broken state to a fully functional nested conditional system, with each phase being independently testable and deliverable.
