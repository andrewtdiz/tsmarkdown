# Better MDX Syntax Highlighting - Product Requirements Document

## Overview

This PRD defines the requirements for implementing comprehensive syntax highlighting for Better MDX files (`.mdx` extension) across popular code editors. Better MDX is a TypeScript-first, React-compatible markdown language that requires specialized syntax highlighting to properly distinguish between markdown content, TypeScript expressions, and React components.

## Core Value Proposition

- **Enhanced Developer Experience**: Clear visual distinction between markdown, TypeScript, and React syntax
- **Type Safety Awareness**: Syntax highlighting that reflects TypeScript type information
- **Multi-Context Support**: Proper highlighting for both `{{ }}` string interpolation and `{ }` JavaScript expressions
- **Editor Agnostic**: Support across VS Code, Sublime Text, Atom, and other TextMate-compatible editors

## Language Syntax Requirements

### Better MDX Syntax Patterns

Better MDX uses two distinct syntax patterns that require different highlighting approaches:

1. **`{{ }}` - String Interpolation**: Simple variable interpolation within markdown text
2. **`{ }` - JavaScript Expressions**: Complex JavaScript expressions that return JSX/React elements

### Key Syntax Elements to Highlight

#### 1. Function Declarations
```mdx
function MyComponent({ title }: { title: string }) {
  return (
    # {{ title }}
    
    This is dynamic content with {{ title }}.
  )
}
```

#### 2. Variable Interpolation (`{{ }}`)
```mdx
Welcome {{ userName }}! Your score is {{ score }}.
```

#### 3. JavaScript Expressions (`{ }`)
```mdx
{isHighScore ? (
  🎉 **Congratulations!** You achieved a high score!
) : (
  Keep trying to reach 80+ points.
)}
```

#### 4. Component Composition
```mdx
import { List } from "./List";

function Dashboard({ items }: { items: string[] }) {
  return (
    # Dashboard
    
    ## Your Items
    <List items={items} ordered={true} />
  )
}
```

#### 5. Async Functions
```mdx
async function AsyncContent() {
  const data = await fetchUserData();
  
  return (
    # Async Content
    
    Data loaded: {{ data.name }}
  )
}
```

## Technical Implementation Requirements

### 1. TextMate Grammar Structure

Following the TypeScript-TmLanguage repository approach, we need to create a YAML-based grammar with the following structure:

#### Header Metadata
```yaml
name: Better MDX
scopeName: source.better-mdx
fileTypes: [mdx]
uuid: [unique-uuid]
```

#### Variables Section
Define reusable regex patterns for:
- Better MDX identifiers and keywords
- String interpolation patterns (`{{ }}`)
- JavaScript expression patterns (`{ }`)
- Markdown syntax elements
- TypeScript type annotations
- React component syntax

#### Repository Section
Pattern definitions for:
- Function declarations with TypeScript types
- String interpolation blocks
- JavaScript expression blocks
- Markdown headers, lists, and formatting
- Import statements
- Component JSX syntax
- Comments and strings

### 2. Scope Naming Convention

Following TextMate conventions, define scopes for:

#### Core Language Elements
- `source.better-mdx` - Root scope
- `meta.function.better-mdx` - Function declarations
- `meta.interpolation.better-mdx` - String interpolation blocks
- `meta.expression.better-mdx` - JavaScript expression blocks
- `meta.markdown.better-mdx` - Markdown content

#### TypeScript Integration
- `variable.other.readwrite.better-mdx` - Variables in interpolation
- `keyword.control.better-mdx` - Control flow keywords
- `storage.type.better-mdx` - Type annotations
- `entity.name.function.better-mdx` - Function names

#### React/JSX Elements
- `meta.tag.better-mdx` - JSX tags
- `entity.name.tag.better-mdx` - Component names
- `string.quoted.better-mdx` - Attribute values

### 3. Build System Requirements

#### YAML to tmLanguage Compilation
- TypeScript-based build system similar to TypeScript-TmLanguage
- YAML grammar files as source of truth
- Automated compilation to XML tmLanguage format
- Validation and testing infrastructure

#### Testing Framework
- Baseline files for expected scope assignments
- Automated testing against sample Better MDX files
- Visual diff tools for grammar changes
- Performance testing for large files

### 4. Editor Integration

#### VS Code Extension
- Package as VS Code extension
- Include grammar files and language configuration
- Support for IntelliSense and error highlighting
- Integration with TypeScript language server

#### Other Editors
- Sublime Text package
- Atom package
- Direct tmLanguage files for TextMate-compatible editors

## Detailed Grammar Requirements

### 1. Function Declaration Patterns

```yaml
function-declaration:
  name: meta.function.better-mdx
  begin: '^function\s+(\w+)\s*\(([^)]*)\)\s*:\s*\{[^}]*\}\s*\{'
  beginCaptures:
    '1': { name: entity.name.function.better-mdx }
    '2': { name: meta.parameters.better-mdx }
  end: '^\}'
  patterns:
    - include: '#return-statement'
    - include: '#interpolation'
    - include: '#expression'
    - include: '#markdown'
```

### 2. String Interpolation Patterns

```yaml
interpolation:
  name: meta.interpolation.better-mdx
  begin: '\{\{'
  beginCaptures:
    '0': { name: punctuation.definition.interpolation.begin.better-mdx }
  end: '\}\}'
  endCaptures:
    '0': { name: punctuation.definition.interpolation.end.better-mdx }
  patterns:
    - include: '#typescript-expression'
```

### 3. JavaScript Expression Patterns

```yaml
expression:
  name: meta.expression.better-mdx
  begin: '(?<!\{\{)\{(?!\{)'
  beginCaptures:
    '0': { name: punctuation.definition.expression.begin.better-mdx }
  end: '\}'
  endCaptures:
    '0': { name: punctuation.definition.expression.end.better-mdx }
  patterns:
    - include: '#typescript-expression'
    - include: '#jsx'
```

### 4. Markdown Integration

```yaml
markdown:
  patterns:
    - name: markup.heading.better-mdx
      match: '^(#{1,6})\s+(.+)$'
      captures:
        '1': { name: markup.heading.marker.better-mdx }
        '2': { name: markup.heading.better-mdx }
    - name: markup.bold.better-mdx
      match: '\*\*([^*]+)\*\*'
      captures:
        '1': { name: markup.bold.better-mdx }
    - name: markup.italic.better-mdx
      match: '\*([^*]+)\*'
      captures:
        '1': { name: markup.italic.better-mdx }
```

## Testing Requirements

### 1. Baseline Test Files

Create comprehensive test files covering:

#### Basic Syntax
- Simple function declarations
- Variable interpolation
- Conditional expressions
- Component composition

#### Advanced Features
- Async functions
- Complex conditional logic
- List rendering with `.map()`
- Default props and optional parameters

#### Edge Cases
- Nested expressions
- Mixed markdown and expressions
- Complex TypeScript types
- Import statements

### 2. Test Infrastructure

```typescript
// Example test structure
const testCases = [
  {
    name: 'simple-interpolation',
    input: 'function Test({ name }: { name: string }) {\n  return (\n    Hello {{ name }}!\n  )\n}',
    expectedScopes: [
      'source.better-mdx',
      'meta.function.better-mdx',
      'entity.name.function.better-mdx',
      'meta.interpolation.better-mdx',
      'variable.other.readwrite.better-mdx'
    ]
  }
];
```

## Distribution Strategy

### 1. VS Code Extension
- Primary distribution method
- Include grammar files and language configuration
- Support for IntelliSense and error highlighting
- Integration with TypeScript language server

### 2. Package Registry
- Publish to npm for easy installation
- Include grammar files for multiple editors
- Documentation and examples

### 3. Editor-Specific Packages
- Sublime Text package
- Atom package
- Direct tmLanguage files for other editors

## Success Metrics

### 1. Syntax Accuracy
- 100% correct scope assignment for all Better MDX syntax elements
- Proper highlighting for nested expressions
- Accurate TypeScript type highlighting

### 2. Performance
- Fast grammar parsing for large files (>1000 lines)
- Minimal impact on editor performance
- Efficient memory usage

### 3. Developer Experience
- Clear visual distinction between syntax elements
- Consistent highlighting across different editors
- Integration with existing TypeScript tooling

## Implementation Timeline

### Phase 1: Core Grammar (Weeks 1-2)
- Define basic grammar structure
- Implement function declarations and interpolation
- Create basic test cases

### Phase 2: Advanced Features (Weeks 3-4)
- Add JavaScript expression support
- Implement markdown integration
- Add TypeScript type highlighting

### Phase 3: Testing and Refinement (Weeks 5-6)
- Comprehensive test suite
- Performance optimization
- Edge case handling

### Phase 4: Distribution (Weeks 7-8)
- VS Code extension packaging
- Documentation and examples
- Community feedback and iteration

## Future Enhancements

### 1. Advanced TypeScript Integration
- Real-time type checking integration
- Error highlighting with grammar
- IntelliSense support

### 2. Theme Integration
- Custom color schemes for Better MDX
- Dark/light mode support
- Accessibility considerations

### 3. Performance Optimization
- Incremental parsing for large files
- Caching strategies
- Memory usage optimization

---

*This PRD provides a comprehensive roadmap for implementing syntax highlighting for Better MDX files, ensuring developers have the best possible experience when working with this powerful TypeScript-first markdown language.*
