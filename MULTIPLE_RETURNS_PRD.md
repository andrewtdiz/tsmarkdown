# Multiple Return Statements PRD

## Background
The current ESLint integration in Better MDX only supports components with a single return statement. The `findFirstReturn` function in `src/parser/component-scanner.ts` stops after finding the first return statement, and the `splitComponent` function only handles one return. This limits the framework to simple components and prevents support for conditional rendering patterns with multiple return paths.

## Problem Statement
Better MDX components need to support multiple return statements for:
- Conditional rendering with early returns
- Error state handling with different return paths
- Complex component logic with multiple rendering branches
- TypeScript pattern matching with exhaustive returns

The current implementation fails when encountering multiple return statements and needs to be extended to handle this common React/TypeScript pattern.

## Goals
- Support multiple return statements in Better MDX components
- Maintain ESLint compatibility for all return paths
- Preserve existing single-return functionality
- Provide clear diagnostics for invalid multiple return patterns
- Enable conditional rendering with early returns

## Non-Goals
- Supporting return statements nested inside child functions (keep current behavior)
- Supporting return statements without parentheses (keep current markdown-focused approach)
- Rewriting the markdown processing pipeline (extend existing system)

## Current Implementation Analysis

### Key Files to Modify
1. **`src/parser/component-scanner.ts`** - Core component scanning logic
2. **`src/parser/eslint-parser.ts`** - ESLint parsing integration
3. **`src/parser/parser-utils.ts`** - Public API exports

### Current Limitations
- `findFirstReturn()` stops after finding first return statement
- `splitComponent()` only handles one return path
- `ComponentSplit` interface only stores single return indices
- ESLint parser creates single markdown stub

## Proposed Implementation

### 1. Extend Type Definitions

**File: `src/parser/component-scanner.ts`**

Add new interfaces for multiple returns:

```typescript
export interface ReturnStatement {
  returnIndex: number;
  contentStartIndex: number;
  contentEndIndex: number;
  condition?: string; // For conditional returns like "if (error) return (...)"
  isEarlyReturn: boolean; // true if not the last return
}

export interface MultipleComponentSplit {
  tsPrelude: string;
  returnStatements: ReturnStatement[];
  hasValidStructure: boolean;
  diagnostics: string[];
  isMultipleReturns: boolean;
}

// Extend existing ComponentSplit to support both single and multiple
export interface ComponentSplit {
  tsPrelude: string;
  markdownBody: string; // For backward compatibility - will be empty for multiple returns
  returnStartIndex: number; // For backward compatibility
  returnEndIndex: number; // For backward compatibility
  hasValidStructure: boolean;
  diagnostics: string[];
  // New fields for multiple returns
  returnStatements?: ReturnStatement[];
  isMultipleReturns?: boolean;
}
```

### 2. Implement Multiple Return Detection

**File: `src/parser/component-scanner.ts`**

Create new function to find all return statements:

```typescript
/**
 * Finds all return statements that are not nested in child functions
 */
function findAllReturns(componentBody: string): ReturnStatement[] {
  const returns: ReturnStatement[] = [];
  let braceLevel = 0;
  let inFunction = false;
  
  for (let i = 0; i < componentBody.length; i++) {
    const char = componentBody[i];
    const nextChars = componentBody.slice(i, i + 6);
    
    // Track brace levels
    if (char === '{') {
      braceLevel++;
      if (braceLevel === 1) {
        inFunction = true;
      }
    } else if (char === '}') {
      braceLevel--;
      if (braceLevel === 0) {
        inFunction = false;
      }
    }
    
    // Look for return statements
    if (inFunction && nextChars === 'return') {
      const afterReturn = componentBody.slice(i + 6).trim();
      if (afterReturn.startsWith('(')) {
        const openParenIndex = i + 6 + afterReturn.indexOf('(');
        const closeParenIndex = findMatchingParen(componentBody, openParenIndex);
        
        if (closeParenIndex !== -1) {
          // Check if this is a conditional return
          const beforeReturn = componentBody.slice(0, i).trim();
          const condition = extractConditionFromReturn(beforeReturn);
          
          returns.push({
            returnIndex: i,
            contentStartIndex: openParenIndex + 1,
            contentEndIndex: closeParenIndex,
            condition,
            isEarlyReturn: returns.length > 0 // Not the first return
          });
        }
      }
    }
  }
  
  return returns;
}

/**
 * Extracts condition from code before return statement
 * Handles patterns like "if (error) return (...)" or "if (loading) { return (...) }"
 */
function extractConditionFromReturn(beforeReturn: string): string | undefined {
  // Look for if statements, ternary operators, or switch cases
  const lines = beforeReturn.split('\n');
  const lastLine = lines[lines.length - 1].trim();
  
  // Pattern: "if (condition) return"
  const ifMatch = lastLine.match(/if\s*\(([^)]+)\)\s*$/);
  if (ifMatch) {
    return ifMatch[1];
  }
  
  // Pattern: "} else if (condition) {"
  const elseIfMatch = lastLine.match(/}\s*else\s*if\s*\(([^)]+)\)\s*{\s*$/);
  if (elseIfMatch) {
    return elseIfMatch[1];
  }
  
  // Pattern: "} else {"
  const elseMatch = lastLine.match(/}\s*else\s*{\s*$/);
  if (elseMatch) {
    return 'else';
  }
  
  return undefined;
}
```

### 3. Update Component Splitting Logic

**File: `src/parser/component-scanner.ts`**

Modify `splitComponent` to handle multiple returns:

```typescript
/**
 * Splits a component into TypeScript prelude and return statements
 * Supports both single and multiple return patterns
 */
export function splitComponent(source: string): ComponentSplit {
  const diagnostics: string[] = [];
  
  // First, locate the component
  const component = locateComponent(source);
  if (!component) {
    return {
      tsPrelude: '',
      markdownBody: '',
      returnStartIndex: -1,
      returnEndIndex: -1,
      hasValidStructure: false,
      diagnostics: ['No component function found']
    };
  }
  
  // Find all return statements
  const returnStatements = findAllReturns(source);
  if (returnStatements.length === 0) {
    return {
      tsPrelude: source,
      markdownBody: '',
      returnStartIndex: -1,
      returnEndIndex: -1,
      hasValidStructure: false,
      diagnostics: ['No return statement found in component']
    };
  }
  
  // Handle single return (backward compatibility)
  if (returnStatements.length === 1) {
    const returnMatch = returnStatements[0];
    const tsPrelude = source.slice(0, returnMatch.returnIndex);
    const markdownBody = source.slice(returnMatch.contentStartIndex, returnMatch.contentEndIndex);
    
    return {
      tsPrelude: tsPrelude.trim(),
      markdownBody: markdownBody.trim(),
      returnStartIndex: returnMatch.returnIndex,
      returnEndIndex: returnMatch.contentEndIndex,
      hasValidStructure: true,
      diagnostics: [],
      returnStatements,
      isMultipleReturns: false
    };
  }
  
  // Handle multiple returns
  const firstReturn = returnStatements[0];
  const tsPrelude = source.slice(0, firstReturn.returnIndex);
  
  // For multiple returns, markdownBody is empty (backward compatibility)
  // All return content is available in returnStatements array
  
  return {
    tsPrelude: tsPrelude.trim(),
    markdownBody: '', // Empty for multiple returns
    returnStartIndex: firstReturn.returnIndex,
    returnEndIndex: returnStatements[returnStatements.length - 1].contentEndIndex,
    hasValidStructure: true,
    diagnostics: [],
    returnStatements,
    isMultipleReturns: true
  };
}
```

### 4. Update ESLint Parser

**File: `src/parser/eslint-parser.ts`**

Modify ESLint parsing to handle multiple returns:

```typescript
/**
 * Creates a TypeScript-compatible source from component parts with multiple returns
 */
function createTypeScriptSourceWithMultipleReturns(
  tsPrelude: string,
  returnStatements: ReturnStatement[],
  options: {
    includeMarkdownStub: boolean;
    preserveSource: boolean;
  }
): string {
  const { includeMarkdownStub, preserveSource } = options;
  
  if (!includeMarkdownStub) {
    // Create a simple return for ESLint parsing
    return `${tsPrelude}
    return <div>/* Multiple return paths processed separately */</div>;
}`;
  }
  
  if (preserveSource) {
    // Include all return content as template literals
    const returnStubs = returnStatements.map((ret, index) => {
      const content = ret.condition 
        ? `\`${ret.condition ? `/* ${ret.condition} */ ` : ''}Return ${index + 1} content\``
        : `\`Return ${index + 1} content\``;
      return `    ${ret.condition ? `if (${ret.condition}) ` : ''}return ${content};`;
    }).join('\n');
    
    return `${tsPrelude}
${returnStubs}
}`;
  }
  
  // Create JSX stubs for each return
  const returnStubs = returnStatements.map((ret, index) => {
    const stub = createMarkdownStub(`Return ${index + 1} content`);
    return `    ${ret.condition ? `if (${ret.condition}) ` : ''}return ${stub};`;
  }).join('\n');
  
  return `${tsPrelude}
${returnStubs}
}`;
}

/**
 * Parses a Better MDX component with multiple returns for ESLint compatibility
 */
export function parseForESLintWithMultipleReturns(
  source: string,
  options: ESLintParseOptions = {}
): ESLintParseResult {
  const {
    includeMarkdownStub = true,
    preserveSource = false,
    fileName = 'component.bmdx'
  } = options;

  const diagnostics: string[] = [];

  try {
    const componentSplit = splitComponent(source);
    
    if (!componentSplit.hasValidStructure) {
      return {
        success: false,
        diagnostics: [
          'Component structure validation failed',
          ...componentSplit.diagnostics
        ]
      };
    }

    // Handle multiple returns
    if (componentSplit.isMultipleReturns && componentSplit.returnStatements) {
      const tsSource = createTypeScriptSourceWithMultipleReturns(
        componentSplit.tsPrelude,
        componentSplit.returnStatements,
        { includeMarkdownStub, preserveSource }
      );

      const ast = parseTypeScript(tsSource, {
        loc: true,
        range: true,
        tokens: true,
        comment: true,
        jsx: true,
        useJSXTextNode: true,
        filePath: fileName,
        project: undefined,
        tsconfigRootDir: undefined,
        extraFileExtensions: ['.bmdx', '.mdx']
      });

      return {
        success: true,
        ast,
        diagnostics,
        componentSplit,
        tsPrelude: componentSplit.tsPrelude,
        markdownBody: '' // Empty for multiple returns
      };
    }

    // Fall back to single return handling
    return parseForESLint(source, options);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      diagnostics: [
        'TypeScript parsing failed',
        errorMessage
      ]
    };
  }
}
```

### 5. Add New Public API Functions

**File: `src/parser/parser-utils.ts`**

Add exports for multiple return functionality:

```typescript
// Multiple return support exports
export { parseForESLintWithMultipleReturns } from './eslint-parser';
export type { ReturnStatement, MultipleComponentSplit } from './component-scanner';

/**
 * Validates that a component with multiple returns has proper structure
 */
export function validateMultipleReturns(source: string): {
  isValid: boolean;
  diagnostics: string[];
  returnStatements: ReturnStatement[];
  componentSplit?: ComponentSplit;
} {
  const diagnostics: string[] = [];
  
  const componentSplit = splitComponent(source);
  if (!componentSplit.hasValidStructure) {
    return {
      isValid: false,
      diagnostics: componentSplit.diagnostics,
      returnStatements: []
    };
  }
  
  if (!componentSplit.isMultipleReturns || !componentSplit.returnStatements) {
    return {
      isValid: false,
      diagnostics: ['Component does not have multiple returns'],
      returnStatements: []
    };
  }
  
  const returnStatements = componentSplit.returnStatements;
  
  // Validate multiple return patterns
  if (returnStatements.length < 2) {
    diagnostics.push('Component must have at least 2 return statements');
  }
  
  // Check for proper conditional structure
  const hasConditionalReturns = returnStatements.some(ret => ret.condition);
  const hasUnconditionalReturn = returnStatements.some(ret => !ret.condition);
  
  if (hasConditionalReturns && !hasUnconditionalReturn) {
    diagnostics.push('Components with conditional returns should have an unconditional fallback');
  }
  
  return {
    isValid: diagnostics.length === 0,
    diagnostics,
    returnStatements,
    componentSplit
  };
}
```

## Implementation Steps

### Phase 1: Core Infrastructure
1. **Add new type definitions** to `component-scanner.ts`
2. **Implement `findAllReturns()`** function
3. **Implement `extractConditionFromReturn()`** helper
4. **Update `splitComponent()`** to handle multiple returns
5. **Add comprehensive tests** for multiple return detection

### Phase 2: ESLint Integration
1. **Implement `createTypeScriptSourceWithMultipleReturns()`** in `eslint-parser.ts`
2. **Add `parseForESLintWithMultipleReturns()`** function
3. **Update existing `parseForESLint()`** to detect and delegate to multiple return handler
4. **Add tests** for ESLint parsing with multiple returns

### Phase 3: Public API
1. **Add new exports** to `parser-utils.ts`
2. **Implement `validateMultipleReturns()`** function
3. **Update existing validation functions** to handle multiple returns
4. **Add integration tests** for the complete flow

### Phase 4: Testing and Documentation
1. **Create test components** with various multiple return patterns
2. **Add comprehensive test suite** covering edge cases
3. **Update documentation** with multiple return examples
4. **Verify backward compatibility** with existing single-return components

## Example Usage

### Before (Single Return)
```typescript
function MyComponent() {
  const user = getUser();
  
  return (
    # User Profile
    Name: {{ user.name }}
  )
}
```

### After (Multiple Returns)
```typescript
function MyComponent() {
  const user = getUser();
  
  if (!user) {
    return (
      # Error
      User not found
    )
  }
  
  if (user.isLoading) {
    return (
      # Loading
      Please wait...
    )
  }
  
  return (
    # User Profile
    Name: {{ user.name }}
  )
}
```

## Testing Strategy

### Test Cases to Cover
1. **Basic multiple returns** - 2-3 return statements with conditions
2. **Early returns** - Error handling with early returns
3. **Conditional returns** - if/else if/else patterns
4. **Mixed patterns** - Some conditional, some unconditional returns
5. **Edge cases** - Empty return content, malformed conditions
6. **Backward compatibility** - Single return components still work
7. **ESLint integration** - All return paths get proper type checking

### Test Files to Create
- `test/eslint-migration/basic-multiple-returns.mdx`
- `test/eslint-migration/conditional-returns.mdx`
- `test/eslint-migration/error-handling.mdx`
- `test/eslint-migration/edge-cases.mdx`

## Success Criteria
- ✅ Components with multiple return statements parse successfully
- ✅ ESLint can type-check all return paths
- ✅ Existing single-return components continue to work
- ✅ Clear diagnostics for invalid multiple return patterns
- ✅ All tests pass (existing + new multiple return tests)
- ✅ Documentation updated with multiple return examples

## Future Enhancements
- Support for switch statement returns
- Return statement validation (ensuring all code paths return)
- Integration with TypeScript's control flow analysis
- IDE support for multiple return navigation
