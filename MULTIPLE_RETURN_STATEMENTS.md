# Multiple Conditional Return Statements Implementation

## Core Problem

The current MDX parser and template engine only supports components with a **single return statement** containing template content. Components like the following are not properly handled:

```typescript
function MyComponent({ items }: { items: string[] }) {
  if (items.length === 0) return (
    No items available
  );
  
  if (items.length === 1) return (
    Single item: {{ items[0] }}
  );
  
  const processedItems = items.map(item => item.toUpperCase());
  
  return (
    Multiple items: {{ processedItems.join(', ') }}
  );
}
```

### Current Limitations

1. **Parser Issue**: The parser expects a single `return (` statement and treats everything after it as template content
2. **Early Returns**: Early return statements with interpolations are incorrectly placed in the TypeScript section instead of being processed as templates
3. **Template Processing**: Only the final return statement's content is processed as a template, ignoring earlier conditional returns

## Required Implementation Areas

### 1. Parser Updates (`src/parser.ts`)

**File**: `src/parser.ts`
**Methods to modify**:
- `parse()` method (lines ~16-119)
- `processTemplateContent()` method (lines ~269-311)

**Key Changes Needed**:
```typescript
// Current: Single return detection
if (trimmed === "return (") {
  inReturn = true;
  continue;
}

// Needed: Multiple return detection and handling
if (trimmed.startsWith("return ")) {
  // Handle both early returns and final return statement
  // Parse return content and determine if it's template or TypeScript
}
```

**Specific Requirements**:
- Detect all `return` statements in the function
- Distinguish between early returns (with template content) and the main return statement
- Parse interpolations in early return statements
- Maintain proper separation between TypeScript logic and template content

### 2. Compiler Updates (`src/compiler.ts`)

**File**: `src/compiler.ts`
**Methods to modify**:
- `compile()` method (lines ~22-46)
- `compileTemplate()` method (lines ~106-110)

**Key Changes Needed**:
- Extend `CompiledMDX` interface to support multiple return templates
- Handle compilation of multiple template sections
- Ensure proper dependency extraction across all return statements

### 3. Template Engine Updates (`src/template-engine.ts`)

**File**: `src/template-engine.ts`
**Methods to modify**:
- `execute()` method (lines ~25-101)
- `processConditionalBlocks()` method (lines ~469-510)
- `processInterpolations()` method (lines ~444-467)

**Key Changes Needed**:
- Execute TypeScript code to determine which return statement should be used
- Process the appropriate template based on runtime conditions
- Handle interpolation processing for conditional return statements

## Implementation Strategy

### Phase 1: Parser Enhancement
1. **Detect Multiple Returns**: Modify the parser to identify all return statements
2. **Categorize Returns**: Distinguish between early returns (with template content) and final return
3. **Parse Early Returns**: Extract template content and interpolations from early returns
4. **Maintain State**: Keep track of which return statement contains the main template

### Phase 2: Compiler Enhancement
1. **Extend Interface**: Add support for multiple template sections in `CompiledMDX`
2. **Template Compilation**: Compile each return statement's template content separately
3. **Dependency Management**: Ensure all dependencies are properly extracted

### Phase 3: Engine Enhancement
1. **Conditional Execution**: Execute TypeScript code to determine the appropriate return path
2. **Template Selection**: Select and process the correct template based on runtime conditions
3. **Interpolation Handling**: Process interpolations for the selected return statement

## Example Target Component Structure

```typescript
function ConditionalComponent({ data, type }: { data: any; type: string }) {
  // TypeScript logic
  const processed = processData(data);
  
  // Early return with template
  if (!processed) return (
    Error: Unable to process data
  );
  
  // Another early return with template
  if (type === 'simple') return (
    Simple view: {{ processed.name }}
  );
  
  // Final return with complex template
  return (
    Complex view: {{ processed.name }}
    
    Details:
    {{ processed.items.map(item => `- ${item}`).join('\n') }}
  );
}
```

## Testing Requirements

Create test cases for:
1. **Empty Array Handling**: `items.length === 0` early return
2. **Single Item Handling**: `items.length === 1` early return  
3. **Multiple Items**: Final return statement with complex logic
4. **Nested Conditions**: Multiple conditional returns with different template structures
5. **Error States**: Early returns for error conditions

## Files to Create/Modify

### Core Files (Required Changes)
- `src/parser.ts` - Parser logic for multiple returns
- `src/compiler.ts` - Compilation of multiple templates
- `src/template-engine.ts` - Runtime execution and template selection

### Interface Updates
- `src/parser.ts` - Extend `ParsedMDX` interface
- `src/compiler.ts` - Extend `CompiledMDX` interface

### Test Files
- `test/multiple-returns.test.ts` - Unit tests for multiple return functionality
- `mdx/ConditionalExample.mdx` - Example component with multiple returns
- `test-conditional-returns.ts` - Integration test script

## Success Criteria

The implementation is complete when:
1. ✅ Components with multiple return statements parse correctly
2. ✅ Early returns with template content are processed as templates
3. ✅ Runtime conditions determine which return statement to use
4. ✅ All interpolations work correctly in conditional returns
5. ✅ The `CommaList` component can be rewritten with multiple returns
6. ✅ Backward compatibility is maintained for single-return components

## Current Workaround

The current solution uses a single return statement with nested ternary expressions:
```typescript
return (
  {{ items.length === 0 ? 'Empty' : items.length === 1 ? items[0] : beginningItems.join(', ') + (withAnd ? ' and ' : ', ') + lastItem }}
);
```

This works but is less readable and maintainable than multiple return statements would be.
