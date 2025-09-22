# TSMD Architecture & Implementation Guide

## **PHASE 1: FIX CRITICAL PARSING FAILURES**

### Current Critical Issues

**Ternary Expression Parsing Failure**: `{{cond1 ? (content {{nested && (more)}}) : other}}` fails completely
- Results in empty output `__tsm([])` instead of proper ternary rendering
- Root cause: `parseNestedTernary` treats ternary branches as raw strings, not nested TSM blocks
- Impact: All complex nested expressions fail

**Context Corruption**: Ternary parsing conflicts with conditional parsing logic
- Nested TSM content in ternary branches causes complete parsing breakdown
- Simple ternary expressions work: `{{ data.isAuthorized ? Authorized : Not Authorized }}`

### Required Fundamental Fixes

#### 1. **Recursive TSM Block Parsing in Ternary Branches**
**Problem**: Ternary branches are treated as raw strings, not parsed TSM blocks

**Solution**: Modify `parseNestedTernary` to recursively parse ternary values as TSM blocks:

```typescript
// Current (broken)
parseNestedTernary("cond1 ? (content {{nested && (more)}}) : other")
// Returns: { condition: "cond1", trueValue: "content {{nested && (more)}}", falseValue: "other" }

// Required (recursive parsing)
parseNestedTernary("cond1 ? (content {{nested && (more)}}) : other")
// Should return: { condition: "cond1", trueValue: ["content ", [nested && more]], falseValue: "other" }
```

**Implementation Steps**:
1. In `parseNestedTernary`, detect TSM syntax in `trueValue` and `falseValue`
2. If TSM syntax found, call `parseContent()` recursively on the value
3. Return parsed chunks instead of raw string
4. Handle mixed content (plain text + TSM blocks)

#### 2. **Context Isolation for Nested Parsing**
**Problem**: All parsing contexts share arrays, causing index conflicts

**Solution**: Create isolated parsing contexts for nested expressions:
- Nested ternary branches get their own `ParseContext`
- Placeholder indices are hierarchical (e.g., `1.1`, `1.2` for nested levels)
- Parent context absorbs nested context results

#### 3. **TSM Block Detection in Expression Values**
**Problem**: Parser doesn't recognize `{{...}}` syntax within expression contexts

**Solution**: Enhance expression parsing to detect and handle nested TSM blocks:
- In ternary value processing, scan for `{{` and `}}` patterns
- Extract and recursively parse TSM blocks within expressions
- Maintain proper context boundaries

### Phase 1 Implementation Priority

1. **Fix `parseNestedTernary` to handle nested TSM content** (Critical)
2. **Add context isolation for ternary branch parsing** (Critical)
3. **Preserve working simple ternary expressions** (Critical)
4. **Test with nested ternary test case** (High)

### Success Criteria for Phase 1

- `{{cond1 ? (content {{nested && (more)}}) : other}}` parses correctly
- Simple ternary expressions still work: `{{a ? b : c}}`
- Nested conditionals within ternary branches work properly
- No empty output (`__tsm([])`) from parsing failures

### Later Phases (After Phase 1 Works)

**Phase 2**: Fix chunk assembly spacing issues
**Phase 3**: Improve context management
**Phase 4**: Enhanced recursive processing
**Phase 5**: Testing and validation

## Key Implementation Notes

- **Start with `parseNestedTernary` function** - this is the primary failure point
- **Recursive parsing is the core requirement** - ternary branches must be parsed as TSM blocks
- **Context isolation prevents conflicts** - nested parsing needs separate state
- **Preserve simple cases** - don't break working functionality
- **Test incrementally** - verify each fix with the nested ternary test case