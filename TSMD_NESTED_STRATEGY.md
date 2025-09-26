# Nested TSM Block Parsing Strategy

## Problem Statement

The current TSM parser fails to handle complex nested expressions where TSM blocks exist within JavaScript expressions. This includes:

- **Ternary expressions with TSM blocks**: `condition ? (TSM content) : (TSM content)`
- **Conditional expressions with nested content**: `condition && (TSM content)`
- **Map functions with TSM content**: `items.map((item, index) => (TSM content))`
- **JSX component parsing issues**: Complex expressions within component props

The core issue is that the current parser only detects top-level `return (...)` blocks, missing TSM content that exists at any nesting level within expressions.

## Current Limitations

### 1. Shallow Block Detection
- `findTsmBlocksWithAST()` only finds top-level `return (...)` blocks
- Misses TSM content within arrow functions, ternary expressions, and other nested contexts
- No recursive scanning of expression content

### 2. Expression-Only Parsing
- Interpolation parser treats complex expressions as single interpolations
- No detection of TSM content within expression bodies
- Missing recursive processing of nested TSM blocks

### 3. AST Structure Limitations
- Current AST doesn't represent nested TSM blocks within complex expressions
- No support for variable scoping in nested contexts
- Limited handling of expression hierarchy

## Proposed Multi-Phase Solution

### Phase 1: Enhanced Block Detection Algorithm

**Goal**: Detect TSM blocks at any nesting level within expressions.

#### Strategy:

1. **Multi-Level Block Scanner**
   - Create recursive scanner that searches for TSM content patterns within any expression
   - Not limited to `return (...)` blocks
   - Detect TSM content in arrow functions, ternary expressions, conditionals, etc.

2. **Expression-Aware Detection**
   - Recognize TSM content within:
     - Arrow function bodies: `items.map((item, index) => (...))`
     - Ternary expressions: `condition ? (TSM content) : (TSM content)`
     - Conditional expressions: `condition && (TSM content)`
     - Template literals and complex expressions

3. **Nested Block Hierarchy**
   - Build tree structure representing nesting levels of TSM blocks
   - Track parent-child relationships
   - Maintain context for each nesting level

#### Implementation:

```typescript
interface NestedTSMBlock {
    outerExpression: string;
    nestedBlocks: TSMBlock[];
    variableScope: Map<string, string>;
    nestingLevel: number;
    parentBlock?: NestedTSMBlock;
}

function findNestedTsmBlocks(content: string): NestedTSMBlock[] {
    // Recursive scanner that finds TSM content at any nesting level
    // Returns hierarchical structure of all TSM blocks found
}
```

### Phase 2: Recursive Content Processing

**Goal**: Process nested TSM content through the full parsing pipeline.

#### Strategy:

1. **Expression Decomposition**
   - Break down complex expressions into constituent parts
   - Extract outer expression (e.g., `items.map(...)`)
   - Identify TSM content blocks within the expression
   - Parse each TSM block recursively through TSM pipeline

2. **Context Preservation**
   - Maintain proper parsing context for nested blocks
   - Variable scoping (e.g., `item` and `index` in map functions)
   - Parent expression context
   - Nesting level information

3. **AST Integration**
   - Create unified AST structure representing both outer expression and nested TSM content
   - Maintain relationships between expression and TSM content

#### Implementation:

```typescript
function processNestedExpression(expression: string, context: ParseContext): TSMComplexInterpolation {
    // Decompose expression into parts
    const outerExpression = extractOuterExpression(expression);
    const tsmBlocks = findTSMContentInExpression(expression);
    
    // Process each TSM block recursively
    const processedBlocks = tsmBlocks.map(block => 
        parseContent(block, createNestedContext(context, block.variableScope))
    );
    
    return {
        type: 'TSMComplexInterpolation',
        expression: outerExpression,
        nestedTSMBlocks: processedBlocks,
        variableScope: extractVariableScope(expression)
    };
}
```

### Phase 3: Enhanced AST Structure

**Goal**: Extend AST to properly represent nested TSM blocks within complex expressions.

#### New AST Node Types:

```typescript
interface TSMNestedExpression extends TSMNode {
    type: 'TSMNestedExpression';
    outerExpression: string; // e.g., "items.map((item, index) => ...)"
    nestedBlocks: TSMBlock[]; // Parsed TSM content within the expression
    variableScope: Map<string, string>; // Local variables (item, index, etc.)
    nestingLevel: number;
}

interface TSMComplexInterpolation extends TSMInterpolation {
    type: 'TSMComplexInterpolation';
    expression: string;
    nestedTSMBlocks: TSMBlock[]; // TSM blocks found within the expression
    isMapFunction?: boolean;
    isTernary?: boolean;
    isConditional?: boolean;
    variableScope?: Map<string, string>;
}
```

### Phase 4: Implementation Plan

#### Step 1: Enhanced Block Detection

Create `findNestedTsmBlocks()` function that:

1. **Scans for TSM patterns** within any expression, not just return statements
2. **Identifies nesting levels** and parent-child relationships
3. **Extracts variable scopes** from arrow functions and other contexts
4. **Returns hierarchical structure** of all TSM blocks found

#### Step 2: Recursive Processing Pipeline

Modify parsing pipeline to:

1. **Detect nested TSM content** within expressions
2. **Recursively parse** each nested block through TSM pipeline
3. **Preserve context** and variable scoping
4. **Build unified AST** with both expression and TSM content

#### Step 3: Code Generation Updates

Update code generator to:

1. **Handle nested expressions** with proper variable scoping
2. **Generate correct JavaScript** for complex expressions with TSM content
3. **Maintain runtime context** for nested blocks

## Example Implementation

### Input Analysis

```typescript
// Input: items.map((item, index) => (- {{ item }}))
// Detection finds:
// - Outer expression: "items.map((item, index) => (...))"
// - Nested TSM block: "- {{ item }}"
// - Variable scope: { item: "item", index: "index" }
```

### Output AST Structure

```typescript
{
    type: 'TSMNestedExpression',
    outerExpression: 'items.map((item, index) => ...)',
    nestedBlocks: [{
        type: 'TSMBlock',
        lines: [{
            type: 'TSMLine',
            chunks: [
                { type: 'TSMTextChunk', content: '- ' },
                { type: 'TSMInterpolation', expression: 'item' }
            ]
        }]
    }],
    variableScope: new Map([['item', 'item'], ['index', 'index']]),
    nestingLevel: 1
}
```

### Generated JavaScript

```typescript
// Output: items.map((item, index) => __tsm(["- ", item]))
```

## Benefits of This Approach

1. **Complete Coverage**: Handles any level of nesting within any type of expression
2. **Context Preservation**: Maintains proper variable scoping and expression context
3. **Unified Processing**: All TSM content goes through the same parsing pipeline
4. **Extensible**: Can be extended to handle more complex patterns as needed
5. **Backward Compatible**: Existing functionality remains unchanged

## Implementation Priority

### High Priority (Immediate)
- Enhanced block detection algorithm
- Recursive processing for map functions
- Basic nested conditional support

### Medium Priority (Next Phase)
- Ternary expression support
- Complex JSX expression handling
- Advanced variable scoping

### Low Priority (Future)
- Template literal support
- Advanced expression patterns
- Performance optimizations

## Testing Strategy

### Test Cases

1. **Simple Nested Blocks**
   ```typescript
   {{ items.map((item) => (- {{ item }})) }}
   ```

2. **Complex Ternary Expressions**
   ```typescript
   {{ condition ? (TSM content) : (Other TSM content) }}
   ```

3. **Nested Conditionals**
   ```typescript
   {{ outer && ({{ inner && (Nested content) }}) }}
   ```

4. **JSX with Complex Expressions**
   ```typescript
   <@Component items={items.map((item) => ({{ item }}))} />
   ```

### Validation

- Verify correct AST generation for nested structures
- Ensure proper variable scoping in nested contexts
- Test code generation produces valid JavaScript
- Validate runtime behavior matches expected output

## Conclusion

This strategy addresses the core issues with nested TSM block parsing by implementing a comprehensive nested block detection and processing system. The multi-phase approach ensures that complex expressions with TSM content at any nesting level are properly detected, parsed, and converted to valid JavaScript output.

The key insight is that TSM content can exist at any nesting level within expressions, not just at the top level. The proposed solution implements a recursive detection and processing system that can handle these complex scenarios while maintaining backward compatibility with existing functionality.
