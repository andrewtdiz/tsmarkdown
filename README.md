# Better-MDX

A revolutionary hybrid TypeScript + Markdown framework that combines the power of TypeScript with the simplicity of Markdown to create dynamic, template-driven content.

## ✨ Features

- **🔥 Hot Module Replacement (HMR)** - Live reload your MDX files during development
- **⚡ TypeScript Integration** - Full TypeScript support with type checking and IntelliSense
- **🎯 Template Interpolation** - Dynamic content with `{{ expression }}` syntax
- **🔀 Conditional Rendering** - Smart conditional blocks with `{condition && (content)}`
- **⚛️ React Components** - Seamless integration with React components
- **🛠️ Developer Tools** - Comprehensive CLI, VS Code extension, and testing utilities
- **📊 Performance Optimized** - Built-in caching and optimization features
- **🧪 Testing Framework** - Complete testing utilities with snapshot testing

## 🚀 Quick Start

### Installation

```bash
npm install better-mdx
# or
bun add better-mdx
```

### Create Your First MDX File

```mdx
// Welcome.mdx
import { Button } from './components/Button';

function Welcome() {
  const appName = 'My App';
  const version = '1.0.0';
  const isProduction = false;

  return (
    # Welcome to {{ appName }}! 🎉

    Current version: **{{ version }}**

    {isProduction && (
      ## Production Mode ✅
      Your app is running in production mode.
    )}

    {!isProduction && (
      ## Development Mode 🚧
      You're in development mode with hot reload enabled.
    )}
  )
}
```

### Basic Usage

```typescript
import { parseMDX, compileMDX, executeMDXTemplate } from 'better-mdx';


// Parse MDX content
const parsed = parseMDX(mdxContent);

// Compile to intermediate format
const compiled = compileMDX(parsed);

// Execute with context
const result = executeMDXTemplate(compiled, {
  Button: ({ children, onClick }) => `<button onclick="${onClick}">${children}</button>`
});

console.log(result.content); // Final rendered content
```

## 📖 Documentation

### Core Concepts

#### 1. Template Interpolation

Use `{{ expression }}` to embed dynamic content:

```mdx
function UserProfile() {
  const user = { name: 'Alice', age: 30, skills: ['React', 'TypeScript'] };

  return (
    # {{ user.name }}'s Profile

    **Age:** {{ user.age }}

    **Skills:** {{ user.skills.join(', ') }}

    **Bio:** {{ user.age > 25 ? 'Experienced developer' : 'Junior developer' }}
  )
}
```

#### 2. Conditional Rendering

Create dynamic content with conditional blocks:

```mdx
function Dashboard() {
  const { user, isLoggedIn } = useAuth();
  const notifications = getNotifications();

  return (
    # Dashboard

    {isLoggedIn && (
      Welcome back, {{ user.name }}!
    )}

    {!isLoggedIn && (
      Please [log in](./login) to continue.
    )}

    {notifications.length > 0 && (
      ## Notifications ({{ notifications.length }})
      {{ notifications.map(n => `- ${n.message}`).join('\n') }}
    )}

    {notifications.length === 0 && (
      No new notifications.
    )}
  )
}
```

#### 3. React Component Integration

Seamlessly use React components:

```mdx
import { useUser } from './hooks';

function Homepage() {
  const user = useUser();
  const features = ['Fast', 'Type-safe', 'Developer-friendly'];

  return (
    # Welcome to Better-MDX

    Get started in minutes with our powerful framework.

    ## Features

    {{ features.map(feature => <FeatureDetailView feature={feature} /> ) }}
  )
}
```

### CLI Usage

#### Development Server

Start a development server with hot reload:

```bash
better-mdx dev
# or with custom port
better-mdx dev --port 8080
```

#### Building for Production

```bash
better-mdx build
# or with custom output directory
better-mdx build --output ./dist
```

#### Project Initialization

Create a new Better-MDX project:

```bash
better-mdx init my-project
cd my-project
bun install
better-mdx dev
```

#### File Operations

```bash
# Compile a single file
better-mdx compile my-file.mdx

# Execute with mock context
better-mdx execute my-file.mdx

# Watch files for changes
better-mdx watch ./mdx
```

### Testing

Better-MDX includes comprehensive testing utilities:

```typescript
import { MDXTestRunner, createMDXTest, createMDXTestSuite } from 'better-mdx/testing';

const runner = new MDXTestRunner();

// Create individual tests
const test = createMDXTest('Basic interpolation', `
function Test() {
  const greeting = 'Hello';
  return (
    # {{ greeting }} World!
  )
}
`)
.expectContent('# Hello World!')
.build();

// Run test
const result = await runner.runTestCase(test);

// Create test suites
const suite = createMDXTestSuite('Core Features')
  .addTest(test)
  .addTest(/* more tests */)
  .build();

await runner.runTestSuite(suite);
```

#### Test CLI

```bash
# Run all tests
better-mdx-test run

# Watch tests
better-mdx-test watch

# Update snapshots
better-mdx-test snapshot update

# Validate MDX files
better-mdx-test validate ./mdx
```

### VS Code Extension

Install the Better-MDX VS Code extension for:

- **Syntax highlighting** for MDX files
- **IntelliSense** for template expressions
- **Error detection** and diagnostics
- **Snippets** for common patterns
- **Live preview** of MDX content

### Hot Module Replacement (HMR)

HMR is built into the development server and provides:

- **Live reload** when MDX files change
- **Error overlay** for compilation errors
- **React integration** with hot component updates
- **WebSocket connection** for real-time updates

#### React Integration

```tsx
import { useBetterMDXHMR, BetterMDXHMRStatus } from 'better-mdx/react';

function MyComponent() {
  const { isConnected, lastUpdate } = useBetterMDXHMR('my-file.mdx');

  return (
    <div>
      {/* Your MDX content */}
      <BetterMDXHMRStatus position="bottom-right" />
    </div>
  );
}
```

## 🏗️ Architecture

Better-MDX follows a multi-phase compilation process:

### Phase 1: Parsing
- Extract imports, function declarations, and TypeScript code
- Separate Markdown content from TypeScript logic
- Generate Abstract Syntax Tree (AST)

### Phase 2: Compilation
- Process template interpolations (`{{ expression }}`)
- Handle conditional rendering blocks
- Create intermediate representation

### Phase 3: Execution
- Execute TypeScript code in safe environment
- Resolve template expressions with runtime context
- Generate final content

### Phase 4: Rendering
- Convert to HTML or other output formats
- Apply React component rendering
- Optimize for performance

## 🔧 API Reference

### MDXParser

```typescript
class MDXParser {
  parse(content: string): ParsedMDX;
}

interface ParsedMDX {
  imports: string[];
  functionName: string;
  typescript: string;
  markdown: string;
  interpolations: Array<{ placeholder: string; expression: string }>;
  conditionalBlocks: Array<{ condition: string; content: string }>;
}
```

### compileMDX

```typescript
function compileMDX(parsed: ParsedMDX): CompiledMDX;

interface CompiledMDX {
  id: string;
  template: string;
  dependencies: string[];
  metadata: {
    functionName: string;
    imports: string[];
    exports: string[];
    version: string;
  };
  interpolations: Array<{ placeholder: string; expression: string }>;
  conditionalBlocks: Array<{ condition: string; content: string }>;
}
```

### executeMDXTemplate

```typescript
async function executeMDXTemplate(
  compiled: CompiledMDX, 
  context?: TemplateContext, 
  props?: any, 
  basePath?: string
): Promise<TemplateExecutionResult>;

interface TemplateExecutionResult {
  content: string;
  errors: string[];
}
```

### Client Renderer

```typescript
class ClientRenderer {
  render(compiled: CompiledMDX, context?: Record<string, any>): RenderedResult;
}

interface RenderedResult {
  html: string;
  metadata: any;
  dependencies: string[];
  executionTime: number;
}
```

## 🎯 Examples

### Blog Post with Dynamic Content

```mdx
import { BlogLayout, AuthorCard, ShareButton } from './components';
import { formatDate, readingTime } from './utils';

function BlogPost() {
  const post = {
    title: 'Getting Started with Better-MDX',
    author: 'Jane Developer',
    publishDate: new Date('2024-01-15'),
    content: '...',
    tags: ['mdx', 'typescript', 'react']
  };

  const estimatedReadingTime = readingTime(post.content);

  return (
    <BlogLayout>
      # {{ post.title }}

      <AuthorCard author="{{ post.author }}" />

      **Published:** {{ formatDate(post.publishDate) }}
      **Reading time:** {{ estimatedReadingTime }} minutes

      {{ post.content }}

      ## Tags
      {{ post.tags.map(tag => `[${tag}](#${tag})`).join(' • ') }}

      <ShareButton title="{{ post.title }}" />
    </BlogLayout>
  )
}
```

### E-commerce Product Page

```mdx
import { ProductGallery, AddToCart, ReviewStars, PriceDisplay } from './components';

function ProductPage() {
  const product = getProduct();
  const { user, cart } = useShoppingContext();
  const reviews = getProductReviews(product.id);

  return (
    <ProductGallery images="{{ product.images }}" />

    # {{ product.name }}

    <PriceDisplay
      price="{{ product.price }}"
      originalPrice="{{ product.originalPrice }}"
      discount="{{ product.discount }}"
    />

    <ReviewStars rating="{{ product.averageRating }}" count="{{ reviews.length }}" />

    ## Description
    {{ product.description }}

    {product.inStock && (
      <AddToCart product="{{ product }}" />
    )}

    {!product.inStock && (
      **Out of Stock** - Get notified when available
    )}

    {user.isLoggedIn && (
      ## Your Cart
      {{ cart.items.length }} items in cart
    )}

    ## Reviews ({{ reviews.length }})
    {{ reviews.slice(0, 5).map(review => `
    **${review.author}** - ${review.rating}/5
    > ${review.comment}
    `).join('\n') }}
  )
}
```

### Documentation with Code Examples

```mdx
import { CodeBlock, Tabs, Alert } from './components';

function APIDocumentation() {
  const apiVersion = '1.0.0';
  const endpoints = getAPIEndpoints();

  return (
    # API Documentation v{{ apiVersion }}

    <Alert type="info">
      This documentation covers API version {{ apiVersion }}.
    </Alert>

    ## Authentication

    All API requests require authentication:

    <CodeBlock language="bash">
    curl -H "Authorization: Bearer YOUR_TOKEN" \\
         https://api.example.com/v1/users
    </CodeBlock>

    ## Endpoints

    {{ endpoints.map(endpoint => `
    ### ${endpoint.method} ${endpoint.path}

    ${endpoint.description}

    <Tabs>
      <Tab label="Request">
        <CodeBlock language="json">
        ${JSON.stringify(endpoint.requestExample, null, 2)}
        </CodeBlock>
      </Tab>

      <Tab label="Response">
        <CodeBlock language="json">
        ${JSON.stringify(endpoint.responseExample, null, 2)}
        </CodeBlock>
      </Tab>
    </Tabs>
    `).join('\n') }}
  )
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/better-mdx/better-mdx
cd better-mdx
bun install
bun run dev
```

### Running Tests

```bash
bun test
# or with coverage
bun test --coverage
```

## 📜 License

MIT © [Better-MDX Team](https://github.com/better-mdx)

## 🔗 Links

- [Documentation](https://better-mdx.dev)
- [Examples](https://github.com/better-mdx/examples)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=better-mdx.better-mdx)
- [Discord Community](https://discord.gg/better-mdx)

---

Made with ❤️ by the Better-MDX team