# TSM Implementation Architecture Investigation

## Overview

This document provides a comprehensive analysis of the current TypeScript-Markdown (TSM) transpiler implementation, focusing on the architecture, parsing strategies, and the proper separation of concerns between TypeScript AST usage and regex-based parsing.

## Current Architecture Analysis

### 1. Core Transpilation Pipeline (`src/compiler/core.ts`)

The main entry point uses a **hybrid approach** that combines TypeScript AST parsing with regex fallback:

#### AST-First Strategy
- **Primary Method**: Uses TypeScript AST (`findTsmBlocks`) to locate `return (...)` statements
- **AST Benefits**: Leverages TypeScript's robust parsing for valid TypeScript syntax
- **AST Limitations**: Fails when TSM syntax is not valid TypeScript (e.g., markdown content with `#` headers)

#### Regex Fallback Strategy  
- **Fallback Method**: Uses regex-based parsing (`findTsmBlocksWithRegex`) when AST fails
- **Regex Benefits**: Can handle invalid TypeScript syntax that contains TSM constructs
- **Regex Limitations**: Less precise than AST parsing, may miss edge cases

#### Hybrid Implementation
```typescript
function findTsmBlocksWithAST(sourceFile: ts.SourceFile, source: string) {
    try {
        // Try AST approach first
        const astBlocks = findTsmBlocks(sourceFile);
        // Process AST results...
    } catch (error) {
        // Fall back to regex when AST fails
        console.log('AST parsing failed, using regex fallback:', error);
    }
    
    // Always use regex as well to catch TSM blocks AST couldn't parse
    const regexBlocks = findTsmBlocksWithRegex(source);
    // Merge results, avoiding duplicates
}
```

### 2. TSM Block Detection (`src/compiler/block-finder.ts`)

#### AST-Based Detection
- **Method**: `findTsmBlocks()` traverses TypeScript AST looking for `ReturnStatement` nodes with `ParenthesizedExpression`
- **Precision**: High accuracy for valid TypeScript syntax
- **Content Extraction**: `extractBlockContent()` uses AST node positions for precise content extraction
- **Indentation Handling**: Automatically de-indents content using AST position information

#### Content Validation
- **TSM Detection**: `isTSMContent()` checks for TSM syntax markers (`#`, `{{`, `<@`, `*`, `-`)
- **Pattern Matching**: Simple regex-based detection of TSM constructs

### 3. TSM Content Parsing (`src/parser/pipeline.ts`)

#### Unified Parsing Entry Point
```typescript
export function parseContent(content: string, context: ParseContext): TSMBlock {
    // 1. Protect code blocks from parsing
    const { protectedContent, codeBlocks } = protectCodeBlocks(content);
    
    // 2. Parse to TSM AST
    const ast = parseInterpolationsToAST(protectedContent, context);
    
    // 3. Restore code blocks in the AST
    if (codeBlocks.length > 0) {
        return restoreCodeBlocksInAST(ast, codeBlocks);
    }
    
    return ast;
}
```

#### Code Protection Strategy
- **Purpose**: Prevents code blocks (```` ``` ```` and `` ` ``) from being parsed as TSM syntax
- **Implementation**: Uses placeholder replacement during parsing, then restores original content
- **Critical**: Ensures JavaScript/TypeScript code within markdown isn't misinterpreted

### 4. Interpolation Parsing (`src/parser/interpolations.ts`)

#### Dual Parsing System
The interpolation parser implements **two parallel systems**:

1. **Legacy Chunk-Based Parser**: `parseInterpolations()` - processes content into chunks
2. **Modern AST-Based Parser**: `parseInterpolationsToAST()` - builds TSM AST nodes

#### Expression Classification
```typescript
function classifyExpression(expression: string): 'conditional' | 'ternary' | 'jsx' | 'null' | 'interpolation' {
    // Check for null pattern: {{ null }}
    if (trimmed === 'null') return 'null';
    
    // Check for JSX pattern: contains < and > or JSX elements  
    if (trimmed.includes('<@') && trimmed.includes('>')) return 'jsx';
    
    // Check for ternary pattern: condition ? trueValue : falseValue
    if (trimmed.includes('?') && trimmed.includes(':')) return 'ternary';
    
    // Check for conditional pattern: condition && (content)
    if (trimmed.includes('&&') && trimmed.includes('(')) return 'conditional';
    
    return 'interpolation';
}
```

#### Nested Expression Handling
- **Recursive Processing**: Handles nested `{{ }}` expressions within other expressions
- **Context Preservation**: Maintains parsing context across nested levels
- **Placeholder System**: Uses unique placeholders to avoid conflicts during processing

### 5. TSM AST Structure (`src/parser/tsm-ast.ts`)

#### Well-Defined AST Nodes
```typescript
// Core AST types
export interface TSMBlock extends TSMNode {
    type: 'TSMBlock';
    lines: TSMLine[];
}

export interface TSMLine extends TSMNode {
    type: 'TSMLine';
    chunks: TSMChunk[];
    isEmpty?: boolean;
    isComment?: boolean;
}

export type TSMChunk = TSMTextChunk | TSMInterpolation | TSMComponent;
```

#### Type Safety
- **Type Guards**: Comprehensive type checking functions (`isTSMBlock`, `isTSMLine`, etc.)
- **Visitor Pattern**: Support for AST traversal and transformation
- **Transformer Pattern**: Support for AST modification

### 6. Code Generation (`src/compiler/ast-code-generator.ts`)

#### AST Visitor Implementation
```typescript
class TSMCodeGenerator implements TSMVisitor {
    generate(block: TSMBlock): string {
        this.output = [];
        this.visitBlock(block);
        return this.output.join('');
    }
    
    visitBlock(block: TSMBlock): void {
        this.output.push('__tsm([');
        // Process each line...
        this.output.push('])');
    }
}
```

#### Complex Expression Handling
- **Ternary Expressions**: Properly handles `{{ cond ? (...) : (...) }}` with TSM block detection
- **Logical Expressions**: Handles `{{ cond && (...) }}` patterns
- **Component Calls**: Generates proper function calls for `<@Component />` syntax
- **Nested TSM Blocks**: Recursively processes TSM content within expressions

### 7. Runtime System (`src/runtime/tsm-runtime.ts`)

#### Chunk Processing
```typescript
export function __tsm(chunks: Array<Chunk>): string {
    const buffer: string[] = [];
    const flattenedChunks = __tsmJoin(chunks);
    
    for (const chunk of flattenedChunks) {
        if (chunk === __ERASE_PREV_LINE || chunk === null) {
            __erasePrevLine(buffer);
        } else if (chunk === undefined || chunk === false) {
            continue; // Falsy values don't emit text
        } else if (typeof chunk === 'string') {
            buffer.push(chunk);
        }
        // Handle other chunk types...
    }
    
    return buffer.join('');
}
```

#### Falsy Compaction
- **Null Handling**: `{{ null }}` triggers line erasure functionality
- **Falsy Values**: `undefined` and `false` don't emit text or whitespace
- **Whitespace Rules**: Proper handling of leading/trailing spaces around falsy values

## Architecture Strengths

### 1. Proper Separation of Concerns

#### TypeScript AST Usage
- **When Used**: For parsing valid TypeScript syntax and locating TSM blocks
- **Benefits**: Leverages TypeScript's robust parsing capabilities
- **Scope**: Limited to structural analysis (finding `return (...)` statements)

#### Regex Usage  
- **When Used**: For parsing TSM-specific syntax (`{{ }}`, `<@Component />`, markdown)
- **Benefits**: Can handle syntax that's not valid TypeScript
- **Scope**: Content parsing within TSM blocks

### 2. Layered Architecture

```
┌─────────────────────────────────────┐
│           Core Transpiler           │  ← Entry point, orchestration
├─────────────────────────────────────┤
│        Block Detection Layer        │  ← AST + Regex hybrid
├─────────────────────────────────────┤
│         TSM Parser Layer            │  ← TSM-specific parsing
├─────────────────────────────────────┤
│        AST Generation Layer         │  ← Code generation
├─────────────────────────────────────┤
│         Runtime Layer               │  ← Execution primitives
└─────────────────────────────────────┘
```

### 3. Robust Error Handling

#### Graceful Degradation
- AST parsing fails → Falls back to regex
- Invalid TSM syntax → Treats as regular text
- Missing components → Generates placeholders

#### Code Protection
- Code blocks are protected from TSM parsing
- Inline code is preserved during processing
- JavaScript expressions within markdown are not misinterpreted

## Areas for Improvement

### 1. Parser Separation Issues

#### Current State
- **Markdown Parsing**: Handled by regex-based interpolation parser
- **Expression Parsing**: Mixed with markdown parsing in same module
- **Component Parsing**: Integrated into interpolation parser

#### Recommended Separation
```
┌─────────────────────────────────────┐
│         Markdown Parser             │  ← Pure markdown syntax (#, *, -, etc.)
├─────────────────────────────────────┤
│       Expression Parser              │  ← {{ }} expressions only
├─────────────────────────────────────┤
│        Component Parser              │  ← <@Component /> syntax
└─────────────────────────────────────┘
```

### 2. AST vs Regex Usage Optimization

#### Current Hybrid Approach
- **Good**: Covers both valid and invalid TypeScript syntax
- **Issue**: Some redundancy between AST and regex approaches
- **Opportunity**: More precise routing based on content type

#### Recommended Approach
```typescript
function findTsmBlocks(sourceFile: ts.SourceFile, source: string) {
    // 1. Use AST for structural analysis (finding return statements)
    const astBlocks = findTsmBlocksAST(sourceFile);
    
    // 2. For each AST block, determine parsing strategy
    for (const block of astBlocks) {
        const content = extractBlockContent(block, sourceFile);
        
        if (isValidTypeScriptExpression(content)) {
            // Use AST-based parsing for valid TypeScript
            parseWithAST(content);
        } else {
            // Use regex-based parsing for TSM syntax
            parseWithRegex(content);
        }
    }
}
```

### 3. TSM AST Completeness

#### Current AST Coverage
- ✅ Text chunks
- ✅ Interpolations  
- ✅ Components
- ✅ Lines and blocks

#### Missing AST Nodes
- ❌ Markdown-specific nodes (headers, lists, emphasis)
- ❌ Conditional block nodes
- ❌ Ternary expression nodes

#### Recommended Enhancement
```typescript
// Add markdown-specific AST nodes
export interface TSMHeader extends TSMNode {
    type: 'TSMHeader';
    level: number; // 1-6 for h1-h6
    content: string;
}

export interface TSMList extends TSMNode {
    type: 'TSMList';
    items: TSMListItem[];
    ordered: boolean;
}

export interface TSMConditional extends TSMNode {
    type: 'TSMConditional';
    condition: string;
    trueBlock: TSMBlock;
    falseBlock?: TSMBlock;
}
```

## Implementation Recommendations

### 1. Immediate Improvements

#### Separate Parser Modules
```typescript
// src/parser/markdown-parser.ts
export function parseMarkdown(content: string): TSMBlock {
    // Handle pure markdown syntax
}

// src/parser/expression-parser.ts  
export function parseExpressions(content: string): TSMInterpolation[] {
    // Handle {{ }} expressions only
}

// src/parser/component-parser.ts
export function parseComponents(content: string): TSMComponent[] {
    // Handle <@Component /> syntax only
}
```

#### Enhanced AST Usage
```typescript
// Use TypeScript AST more extensively for expression parsing
function parseTypeScriptExpression(expression: string): ts.Expression {
    const sourceFile = ts.createSourceFile(
        'expression.ts',
        `const expr = ${expression};`,
        ts.ScriptTarget.Latest,
        true
    );
    
    // Extract and return the expression node
    return extractExpressionNode(sourceFile);
}
```

### 2. Long-term Architecture

#### Unified Parser Architecture
```
┌─────────────────────────────────────┐
│         TSM Parser Core             │
├─────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────────┐│
│  │  Markdown   │ │   Expression    ││
│  │   Parser    │ │     Parser      ││
│  └─────────────┘ └─────────────────┘│
│  ┌─────────────┐ ┌─────────────────┐│
│  │ Component   │ │   TypeScript    ││
│  │   Parser    │ │   AST Parser    ││
│  └─────────────┘ └─────────────────┘│
└─────────────────────────────────────┘
```

#### Enhanced Type Safety
- Full TypeScript AST integration for expression parsing
- Comprehensive TSM AST with all syntax constructs
- Type-safe code generation with proper error handling

## Conclusion

The current TSM implementation demonstrates a **well-architected hybrid approach** that effectively combines TypeScript AST parsing with regex-based fallback. The separation between structural analysis (AST) and content parsing (regex) is appropriate and follows good software engineering principles.

### Key Strengths
1. **Robust Error Handling**: Graceful degradation from AST to regex
2. **Code Protection**: Proper handling of JavaScript/TypeScript within markdown
3. **Type Safety**: Well-defined AST structure with comprehensive type guards
4. **Runtime Efficiency**: Efficient chunk processing with falsy compaction

### Areas for Enhancement
1. **Parser Separation**: More modular parser architecture
2. **AST Completeness**: Enhanced TSM AST with markdown-specific nodes
3. **Expression Parsing**: Greater use of TypeScript AST for expression analysis
4. **Error Reporting**: More detailed error messages with source locations

The architecture successfully balances the need for robust TypeScript parsing with the flexibility required for TSM-specific syntax, making it a solid foundation for the transpiler's continued development.
