# Better MDX - Product Requirements Document

## Overview

Better MDX is a TypeScript-first, React-compatible markdown language that enables fast, iterative development of dynamic content. It combines the expressiveness of Markdown with the power of TypeScript and React, transpiling directly to TypeScript for optimal performance and developer experience.

The current automated test suites validate the end-to-end flow for string interpolation, conditional rendering, component imports, complex expressions, and context-driven execution. Parser-level checks confirm that interpolation and conditional blocks are captured with the correct metadata, while renderer assertions guarantee accurate output and surfaced errors.

## Core Value Proposition

- **Fast Iteration**: Write content in a familiar markdown syntax with TypeScript logic
- **Type Safety**: Full TypeScript support with compile-time error checking
- **React Integration**: Seamless integration with React components and hooks
- **Context-Aware Rendering**: Render functions execute with injected context objects for personalization
- **Component Composition**: Reusable components with props and conditional rendering

## Current Validation Status

- **Template Interpolation**: Exact output tests guarantee single and multiple placeholder rendering, complex formatting, and evaluation of computed expressions.
- **Conditional Logic**: Truthy, falsy, nested, and combined interpolation or conditional scenarios are parsed and rendered with deterministic expectations.
- **Component Imports**: Runtime evaluation verifies that imported components resolve relative to the provided base path and render in-line markdown output.
- **Context Integration**: Execution tests confirm that injected context functions influence template output without errors.
- **Error Reporting**: Render flows emit structured errors for undefined data and invalid condition expressions while still returning partial content.
- **Test Harness Reliability**: The exact test runner and suite composition are exercised to ensure deterministic passing and informative failure reporting.

## Language Features

### Syntax Rules

Better MDX uses two distinct syntax patterns for different types of expressions:

- **{{ }} - String Interpolation**: Use for simple variable interpolation within markdown text
- **{ } - JavaScript Expressions**: Use for complex JavaScript expressions that return JSX or React elements

**Examples:**
```mdx
function Example({ name, items }: { name: string; items: string[] }) {
  return (
    # Hello {{ name }}!

    {items.length > 0 ? (
      Here are your items:
      {items.map(item => <Item key={item} name={item} />)}
    ) : (
      No items found.
    )}
  )
}
```

### 1. Function Declaration Syntax

Better MDX files are TypeScript functions that return JSX-like content:

```mdx
function MyComponent({ title }: { title: string }) {
  return (
    # {{ title }}

    This is dynamic content with {{ title }}.
  )
}
```

### 2. Variable Interpolation

Use double curly braces `{{ }}` for simple variable interpolation within markdown content. Automated tests cover basic and multi-field interpolation outputs.

```mdx
function Welcome({ userName, score }: { userName: string; score: number }) {
  return (
    Welcome {{ userName }}! Your score is {{ score }}.
  )
}
```

### 3. Conditional Rendering

Use single curly braces `{ }` for JavaScript expressions that return JSX or React elements, including ternary operators and logical AND operators. Tests assert both displayed and suppressed branches, including nested guards.

```mdx
function ScoreDisplay({ score }: { score: number }) {
  const isHighScore = score > 80;
  
  return (
    Your score: {{ score }}

    {isHighScore ? (
      🎉 **Congratulations!** You achieved a high score!
    ) : (
      Keep trying to reach 80+ points.
    )}
  )
}
```

### 4. Component Composition

Import and use other MDX components with full TypeScript prop support. Component import tests confirm successful resolution using the provided base path context.

```mdx
import { List } from './List';

function Dashboard({ items }: { items: string[] }) {
  return (
    # Dashboard

    ## Your Items
    <List items={items} ordered={true} />
  )
}
```

### 5. Context Integration

Rendering can receive arbitrary context objects, such as authentication helpers, to customize output at run time. Tests validate that context-injected functions control conditional paths without raising errors.

```mdx
function WelcomeBack() {
  const { user, isLoggedIn } = useAuth();

  return (
    {isLoggedIn && (
      Welcome back, {{ user.name }}!
    )}
  )
}
```

### 6. Complex Conditional Logic

Use single curly braces `{ }` for complex JavaScript expressions that return JSX or React elements. Deeply nested scenarios and combined interpolation or conditional cases are covered by the current regression tests.

```mdx
function UserDashboard({ user, showWelcome }: { user: User; showWelcome: boolean }) {
  const isLoggedIn = user !== null;

  return (
    # Dashboard

    {isLoggedIn && showWelcome && (
      Welcome back, {{ user.name }}!
    )}

    {isLoggedIn && (
      ## Your Dashboard
      Here are your current items:
      <CommaList items={user.items} />
    )}

    {!isLoggedIn && (
      Please log in to continue.
    )}
  )
}
```

### 7. List Rendering

Use single curly braces `{ }` for JavaScript expressions that return JSX or React elements, including `.map()` calls. Existing tests ensure that mapped output matches exact expectations in combined interpolation scenarios.

```mdx
function TechnologyList({ items }: { items: string[] }) {
  return (
    ## Technologies Used
    {items.map((item) => <UlItem item={item} />)}
  )
}
```

### 8. Component Props with Defaults

Support for optional props with default values. Additional regression coverage is available outside the index suites to ensure boolean defaults and override behavior.

```mdx
function List({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  return (
    {items.length === 0 ? 'Empty' : items.map((item, index) =>
      ordered ? <OlItem item={item} index={index} /> : <UlItem item={item} />
    )}
  )
}
```

### 9. Async Function Support (High-Value Addition)

Async rendering remains a priority but is not yet covered by the current index suites. Implementation should allow `async function` definitions, awaited data sources, and deterministic output once promises resolve.

## Technical Specifications

### Transpilation Target
- **Output**: TypeScript or React components
- **Build Time**: Fast compilation with TypeScript checking
- **Runtime**: Zero runtime overhead - pure React components

### Type Safety
- Full TypeScript support for props, variables, and function signatures
- Compile-time error checking for type mismatches
- IntelliSense support in compatible editors

### Performance
- Direct transpilation to TypeScript (no runtime parsing)
- Tree-shaking compatible
- Optimized for fast iteration and development

### Integration
- Seamless integration with existing React applications
- Support for React hooks and context
- Compatible with modern build tools (Vite, Webpack, etc.)

## Use Cases

### 1. Documentation Sites
- Dynamic documentation with interactive examples
- Component showcases with live props
- API documentation with generated content

### 2. Blog Platforms
- Rich blog posts with embedded components
- Interactive tutorials and guides
- Dynamic content based on user data

### 3. Marketing Sites
- Landing pages with conditional content
- Product showcases with interactive elements
- A/B testing with dynamic content

### 4. Internal Tools
- Dashboard components with real-time data
- Admin interfaces with conditional rendering
- Report generation with dynamic content

## Developer Experience

### Syntax Highlighting
- Full syntax highlighting support for MDX files
- TypeScript integration in editors
- Markdown preview with component rendering

### Error Handling
- Clear error messages for syntax issues
- Renderer surfaces interpolation and condition errors alongside partial output
- Exact testing utilities provide regression coverage for common failure modes

### Development Workflow
- Hot module replacement for fast iteration
- Type checking during development
- Seamless integration with existing TypeScript projects

## Migration Path

### From Standard MDX
- Minimal changes required for basic content
- Enhanced TypeScript support
- Better performance characteristics

### From React Components
- Convert JSX return statements to markdown syntax
- Add variable interpolation syntax
- Maintain existing prop interfaces

## High-Value Additions (Not Yet Covered)

- **Async Rendering Pipeline**: End-to-end tests for async functions, streaming output, and loading states.
- **Typed Context Contracts**: Static analysis to validate the shape of injected context objects before render time.
- **Error Recovery Strategies**: Configurable fallbacks when expression evaluation fails, including redaction or default messaging.
- **Incremental Compilation Metrics**: Build instrumentation to flag slow parsing or rendering paths.

## Future Enhancements

- Enhanced debugging tools
- Visual component editor
- Advanced type inference
- Performance profiling tools
- Integration with design systems
- Expanded async and data-fetching primitives (see High-Value Additions)

---

*Better MDX enables developers to write dynamic, type-safe content with the simplicity of Markdown and the power of TypeScript and React.*
