# Better-MDX: Hybrid TypeScript + Markdown Framework

## Product Overview

Better-MDX is a revolutionary framework that enables developers to write TypeScript logic and Markdown content in the same file, creating dynamic, type-safe documentation and content that can be transpiled for both API consumption and front-end rendering.

## Core Vision

Enable seamless integration of:
- **TypeScript logic** with imports, functions, and type safety
- **Markdown syntax** for content formatting
- **React components** for rich interactive elements
- **Template interpolation** for dynamic content
- **Conditional rendering** based on runtime data
- **API-ready transpilation** to string-based formats

## Key Features

### 1. Hybrid File Format (.mdx)

Files combine TypeScript imports, logic, and Markdown in a single cohesive format:

```typescript
import RoutesList from "./RoutesList"
import { useUserInfo } from "./hooks/useUserInfo"

function ExampleComponent() {
    const { user } = useUserInfo();
    const name = user?.name || 'Guest';
    const now = Date.now()

    return (
    # Welcome Page
    Hello, {{ name }}!
    Current time: {{ new Date(now).toLocaleString() }}

    ## Navigation
    <RoutesList />

    {user?.notifications?.length > 0 && (
    ### Notifications
    You have {{ user.notifications.length }} new notifications.
    )}
}
```

### 2. Template Interpolation

Dynamic content insertion using `{{ }}` syntax:
- JavaScript expressions: `{{ user.name }}`
- Function calls: `{{ formatDate(timestamp) }}`
- Computed values: `{{ items.length > 0 ? 'Available' : 'None' }}`

### 3. Nested Component Support

Full React component integration:
- Import external components
- Use JSX syntax within markdown
- Pass props and handle events
- Maintain TypeScript type checking

### 4. Conditional Rendering

JSX-style conditional blocks:
```typescript
{condition && (
## Conditional Section
This content only shows when condition is true.
)}

{user ? (
Welcome back, {{ user.name }}!
) : (
Please log in to continue.
)}
```

## Technical Requirements

### 1. Transpilation System

**Input**: `.mdx` files with hybrid TypeScript + Markdown
**Output**: String-based format consumable by:
- Markdown API servers
- TypeScript front-end applications
- Static site generators
- Content management systems

### 2. Type Safety

- Full TypeScript support with imports and exports
- Type checking for template interpolation
- Component prop validation
- Hook usage validation

### 3. Runtime Support

**Client-Side Rendering**:
- Parse transpiled strings into React components
- Execute TypeScript logic in browser
- Handle dynamic imports and code splitting

**Server-Side Processing**:
- Pre-compile templates with server data
- Generate static content where possible
- Support incremental regeneration

## Architecture

### Compilation Pipeline

```
.mdx File � Parser � AST � TypeScript Compiler � String Format � Runtime
```

1. **Parser**: Extract TypeScript and Markdown sections
2. **AST Generation**: Build abstract syntax tree
3. **TypeScript Compilation**: Type check and compile TS logic
4. **String Generation**: Create serializable format
5. **Runtime Rendering**: Parse and execute in target environment

### Output Formats

**API Server Format**:
```json
{
  "id": "example-component",
  "typescript": "compiled TS code",
  "template": "markdown with placeholders",
  "dependencies": ["RoutesList", "useUserInfo"],
  "metadata": {
    "title": "Welcome Page",
    "lastModified": "2024-01-15T10:30:00Z"
  }
}
```

**Front-end Format**:
```typescript
interface CompiledMDX {
  Component: React.FC<any>;
  dependencies: string[];
  metadata: Record<string, any>;
}
```

## API Specifications

### Server Endpoints

**GET /api/mdx/:component**
- Returns compiled MDX in string format
- Supports query parameters for dynamic data injection
- Includes dependency metadata

**POST /api/mdx/compile**
- Accepts raw .mdx content
- Returns compiled string format
- Validates TypeScript and dependencies

### Client Integration

**React Hook**:
```typescript
const { Component, loading, error } = useMDXComponent('example-component');
```

**Direct Import**:
```typescript
import { renderMDX } from 'better-mdx/client';
const result = await renderMDX(compiledString, props);
```

## Development Workflow

### 1. File Creation
- Create `.mdx` files with hybrid syntax
- Import dependencies and define logic
- Write Markdown content with interpolation

### 2. Development Server
```bash
npm run dev  # Watch mode with hot reload
```

### 3. Build Process
```bash
npm run build  # Compile all .mdx files
```

### 4. Testing
- Unit tests for TypeScript logic
- Integration tests for rendering
- Type checking validation

## Success Criteria

### Functional Requirements
- [ ] Parse hybrid TypeScript + Markdown syntax
- [ ] Compile to string-based API format
- [ ] Render in TypeScript front-end applications
- [ ] Support nested React components
- [ ] Enable template interpolation with `{{ }}`
- [ ] Handle conditional rendering blocks
- [ ] Maintain full TypeScript type safety

### Performance Requirements
- [ ] Compile files in under 100ms each
- [ ] Support incremental compilation
- [ ] Generate optimized output bundles
- [ ] Enable client-side caching

### Developer Experience
- [ ] Provide clear error messages
- [ ] Support VS Code syntax highlighting
- [ ] Enable hot module replacement
- [ ] Offer comprehensive TypeScript support

### Integration Requirements
- [ ] Work with existing React applications
- [ ] Support various bundlers (Webpack, Vite, etc.)
- [ ] Enable server-side rendering
- [ ] Provide API server compatibility

## Implementation Phases

### Phase 1: Core Parser and Compiler
- Basic .mdx file parsing
- TypeScript compilation pipeline
- String format generation

### Phase 2: Template System
- `{{ }}` interpolation support
- Conditional rendering blocks
- Component integration

### Phase 3: Runtime and API
- Client-side rendering system
- API server integration
- Optimization and caching

### Phase 4: Developer Tooling
- CLI improvements
- VS Code extension
- Testing utilities
- Documentation site

## Risk Assessment

**Technical Risks**:
- TypeScript compilation complexity
- Runtime performance with dynamic evaluation
- Security considerations with code execution

**Mitigation Strategies**:
- Comprehensive testing and validation
- Sandboxed execution environments
- Clear security guidelines and best practices

---

*This PRD defines the vision and requirements for Better-MDX, a framework that bridges the gap between static content and dynamic applications through hybrid TypeScript + Markdown files.*