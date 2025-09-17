# Better MDX - Product Requirements Document

## Overview

Better MDX is a TypeScript-first, React-compatible markdown language that enables fast, iterative development of dynamic content. It combines the expressiveness of Markdown with the power of TypeScript and React, transpiling directly to TypeScript for optimal performance and developer experience.

## Core Value Proposition

- **Fast Iteration**: Write content in a familiar markdown syntax with TypeScript logic
- **Type Safety**: Full TypeScript support with compile-time error checking
- **React Integration**: Seamless integration with React components and hooks
- **Async Support**: Built-in support for asynchronous content generation
- **Component Composition**: Reusable components with props and conditional rendering

## Language Features

### Syntax Rules

Better MDX uses two distinct syntax patterns for different types of expressions:

- **`{{ }}` - String Interpolation**: Use for simple variable interpolation within markdown text
- **`{ }` - JavaScript Expressions**: Use for complex JavaScript expressions that return JSX/React elements

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

Use double curly braces `{{ }}` for simple variable interpolation within markdown content:

```mdx
function Welcome({ userName, score }: { userName: string; score: number }) {
  return (
    Welcome {{ userName }}! Your score is {{ score }}.
  )
}
```

### 3. Conditional Rendering

Use single curly braces `{ }` for JavaScript expressions that return JSX/React elements, including ternary operators and logical AND operators:

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

Import and use other MDX components with full TypeScript prop support:

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

### 5. Async Function Support

Built-in support for asynchronous content generation:

```mdx
async function AsyncContent() {
  // Simulate data fetching
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const data = await fetchUserData();
  
  return (
    # Async Content
    
    Data loaded: {{ data.name }}
  )
}
```

### 6. Complex Conditional Logic

Use single curly braces `{ }` for complex JavaScript expressions that return JSX/React elements:

```mdx
function UserDashboard({ user, showWelcome }: { user: User; showWelcome: boolean }) {
  const isLoggedIn = user !== null;
  
  return (
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

Use single curly braces `{ }` for JavaScript expressions that return JSX/React elements, including `.map()` calls:

```mdx
function TechnologyList({ items }: { items: string[] }) {
  return (
    ## Technologies Used
    {items.map((item) => <UlItem item={item} />)}
  )
}
```

### 8. Component Props with Defaults

Support for optional props with default values. Use single curly braces `{ }` for complex expressions:

```mdx
function List({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  return (
    {items.length === 0 ? 'Empty' : items.map((item, index) => 
      ordered ? <OlItem item={item} index={index} /> : <UlItem item={item} />
    )}
  )
}
```

## Technical Specifications

### Transpilation Target
- **Output**: TypeScript/React components
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
- TypeScript error integration
- Helpful suggestions for common mistakes

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

## Future Enhancements

- Enhanced debugging tools
- Visual component editor
- Advanced type inference
- Performance profiling tools
- Integration with design systems

---

*Better MDX enables developers to write dynamic, type-safe content with the simplicity of Markdown and the power of TypeScript and React.*
