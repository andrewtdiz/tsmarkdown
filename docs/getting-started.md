# Getting Started with Better-MDX

This guide will walk you through creating your first Better-MDX project from scratch.

## Prerequisites

- Node.js 18+ or Bun
- Basic knowledge of TypeScript and React
- A text editor (VS Code recommended for best experience)

## Installation

### Option 1: Create New Project

The fastest way to get started is with the Better-MDX CLI:

```bash
npx better-mdx init my-first-project
cd my-first-project
npm install
npm run dev
```

This creates a complete project structure with examples and documentation.

### Option 2: Add to Existing Project

Install Better-MDX in an existing project:

```bash
npm install better-mdx
# or
bun add better-mdx
```

## Project Structure

A typical Better-MDX project looks like this:

```
my-project/
├── mdx/                    # Your MDX files
│   ├── Welcome.mdx
│   ├── About.mdx
│   └── Blog/
│       ├── Post1.mdx
│       └── Post2.mdx
├── src/
│   ├── components/         # React components
│   │   ├── Button.tsx
│   │   └── Card.tsx
│   └── hooks/             # React hooks
│       └── useAuth.ts
├── dist/                  # Compiled output
├── test/                  # Test files
├── package.json
└── tsconfig.json
```

## Your First MDX File

Create `mdx/Hello.mdx`:

```mdx
function HelloWorld() {
  const message = 'Welcome to Better-MDX!';
  const currentTime = new Date().toLocaleTimeString();

  return (
    # {{ message }}

    It's currently {{ currentTime }}.

    ## What can you do with Better-MDX?

    - 🔥 **Dynamic content** with template interpolation
    - 🎯 **Conditional rendering** based on data
    - ⚛️ **React components** seamlessly integrated
    - 🛠️ **TypeScript support** for type safety
    - 🚀 **Hot reload** during development
  )
}
```

## Understanding the Syntax

### Function Structure

Every MDX file contains a TypeScript function that returns content:

```mdx
function MyComponent() {
  // TypeScript code goes here
  const data = fetchSomeData();

  return (
    // Markdown content goes here
    # My Title

    Content with {{ data.value }}
  )
}
```

### Template Interpolation

Use `{{ expression }}` to embed dynamic values:

```mdx
function Examples() {
  const user = { name: 'Alice', age: 30 };
  const items = ['Apple', 'Banana', 'Cherry'];

  return (
    # Hello {{ user.name }}!

    You are {{ user.age }} years old.

    ## Shopping List
    {{ items.map((item, index) => `${index + 1}. ${item}`).join('\n') }}

    ## Calculations
    Next year you'll be {{ user.age + 1 }}.
  )
}
```

### Conditional Rendering

Show or hide content based on conditions:

```mdx
function ConditionalExample() {
  const user = getCurrentUser();
  const isPremium = user?.subscription === 'premium';

  return (
    # Dashboard

    {user && (
      Welcome back, {{ user.name }}!
    )}

    {!user && (
      Please [log in](/login) to continue.
    )}

    {isPremium && (
      ## Premium Features ✨
      You have access to all premium features!
    )}

    {user && !isPremium && (
      ## Upgrade to Premium
      [Upgrade now](/upgrade) to unlock more features.
    )}
  )
}
```

### React Components

Import and use React components directly:

```mdx
import { Button, Card, Icon } from '../src/components';

function ComponentExample() {
  const handleClick = () => alert('Button clicked!');

  return (
    # Component Integration

    <Card variant="primary">
      <Icon name="star" />
      This is a React component inside MDX!

      <Button onClick={handleClick} variant="primary">
        Click me
      </Button>
    </Card>
  )
}
```

## Working with Data

### Static Data

Define data directly in your MDX file:

```mdx
function StaticDataExample() {
  const products = [
    { id: 1, name: 'Laptop', price: 999 },
    { id: 2, name: 'Phone', price: 699 },
    { id: 3, name: 'Tablet', price: 399 }
  ];

  return (
    # Our Products

    {{ products.map(product => `
    ## ${product.name}
    Price: $${product.price}
    [Buy now](/buy/${product.id})
    `).join('\n') }}
  )
}
```

### External Data with Hooks

Use React hooks to fetch external data:

```mdx
import { useAPI } from '../src/hooks';

function DynamicDataExample() {
  const { data: posts, loading, error } = useAPI('/api/posts');

  return (
    # Latest Blog Posts

    {loading && (
      Loading posts...
    )}

    {error && (
      Error loading posts: {{ error.message }}
    )}

    {posts && (
      {{ posts.map(post => `
      ## ${post.title}
      *Published: ${post.publishedAt}*

      ${post.excerpt}

      [Read more](/blog/${post.slug}) | {{ post.readingTime }} min read
      `).join('\n') }}
    )}
  )
}
```

### Context and Props

Use context for shared data:

```mdx
import { useContext } from '../src/hooks';

function ContextExample() {
  const { user, theme, settings } = useContext();

  return (
    # Settings Dashboard

    **Current theme:** {{ theme }}
    **User:** {{ user.name }}

    {settings.notifications && (
      ## Notifications Enabled ✅
      You'll receive email notifications.
    )}

    {!settings.notifications && (
      ## Enable Notifications
      [Turn on notifications](/settings) to stay updated.
    )}
  )
}
```

## Development Workflow

### Starting Development Server

```bash
better-mdx dev
```

This starts a development server with:
- Hot reload for MDX files
- Error overlay for compilation issues
- TypeScript type checking
- React component updates

### File Watching

Watch specific files or directories:

```bash
better-mdx watch ./mdx
```

### Compilation

Compile MDX files to JSON format:

```bash
better-mdx compile MyFile.mdx --output compiled.json
```

### Execution

Test MDX execution with mock context:

```bash
better-mdx execute MyFile.mdx
```

## Building for Production

### Build Command

```bash
better-mdx build
```

This creates optimized builds in the `dist/` directory.

### Build Configuration

Customize build settings in `package.json`:

```json
{
  "scripts": {
    "build": "better-mdx build --output ./dist --verbose",
    "build:watch": "better-mdx build --watch"
  }
}
```

## Testing Your MDX

### Test Setup

Create test files using the testing utilities:

```typescript
// test/content.test.ts
import { test, expect } from 'bun:test';
import { MDXTestRunner, createMDXTest } from 'better-mdx/testing';

const runner = new MDXTestRunner();

test('Welcome page renders correctly', async () => {
  const testCase = createMDXTest(
    'Welcome page',
    `
function Welcome() {
  const appName = 'My App';
  return (
    # Welcome to {{ appName }}!
  )
}
    `.trim()
  )
  .expectContent('# Welcome to My App!')
  .build();

  const result = await runner.runTestCase(testCase);
  expect(result.passed).toBe(true);
});
```

### Running Tests

```bash
better-mdx-test run
```

### Snapshot Testing

```typescript
import { MDXSnapshotTester } from 'better-mdx/testing';

const snapshots = new MDXSnapshotTester();

test('Homepage snapshot', () => {
  const matches = snapshots.matchSnapshot('homepage', homepageContent);
  expect(matches).toBe(true);
});
```

## VS Code Integration

### Install Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Better-MDX"
4. Click Install

### Features

- **Syntax highlighting** for MDX files
- **IntelliSense** for template expressions
- **Error diagnostics** for compilation issues
- **Code snippets** for common patterns
- **Live preview** of compiled output

### Snippets

Type these shortcuts in `.mdx` files:

- `mdx-function` - Basic MDX function template
- `mdx-conditional` - Conditional rendering block
- `mdx-interpolation` - Template interpolation
- `mdx-component` - React component usage

## Common Patterns

### Navigation Menu

```mdx
function Navigation() {
  const currentPath = window.location.pathname;
  const menuItems = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/blog', label: 'Blog' },
    { path: '/contact', label: 'Contact' }
  ];

  return (
    {{ menuItems.map(item => {
      const isActive = item.path === currentPath;
      return `[${item.label}](${item.path})${isActive ? ' *(current)*' : ''}`;
    }).join(' | ') }}
  )
}
```

### Feature List

```mdx
function FeatureList() {
  const features = [
    { icon: '🚀', title: 'Fast', description: 'Optimized for performance' },
    { icon: '🔧', title: 'Flexible', description: 'Customize everything' },
    { icon: '💡', title: 'Smart', description: 'Intelligent defaults' }
  ];

  return (
    # Features

    {{ features.map(feature => `
    ## ${feature.icon} ${feature.title}
    ${feature.description}
    `).join('\n') }}
  )
}
```

### User Profile

```mdx
import { Avatar, Badge } from '../components';

function UserProfile() {
  const { user, stats } = getUserData();

  return (
    <Avatar src="{{ user.avatar }}" alt="{{ user.name }}" />

    # {{ user.name }}

    <Badge variant="primary">{{ user.role }}</Badge>

    **Joined:** {{ formatDate(user.joinDate) }}
    **Posts:** {{ stats.postCount }}
    **Followers:** {{ stats.followerCount }}

    ## Bio
    {{ user.bio || 'No bio available.' }}

    {user.skills && user.skills.length > 0 && (
      ## Skills
      {{ user.skills.map(skill => `- ${skill}`).join('\n') }}
    )}
  )
}
```

## Next Steps

Now that you understand the basics, explore these advanced topics:

1. **[Advanced Templating](./advanced-templating.md)** - Complex expressions and data manipulation
2. **[Component Integration](./components.md)** - Deep dive into React component usage
3. **[Performance Optimization](./performance.md)** - Caching and optimization strategies
4. **[Testing Strategies](./testing.md)** - Comprehensive testing approaches
5. **[Deployment](./deployment.md)** - Production deployment guide

## Getting Help

- 📚 [Full Documentation](./README.md)
- 💬 [Discord Community](https://discord.gg/better-mdx)
- 🐛 [Issue Tracker](https://github.com/better-mdx/better-mdx/issues)
- 📧 [Email Support](mailto:support@better-mdx.dev)

Happy coding with Better-MDX! 🎉