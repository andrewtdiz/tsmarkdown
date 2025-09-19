---
title: Install TS Markdown
description: Complete installation guide for TS Markdown in your project
date: 2024-01-15
author: TS Markdown Team
tags: [installation, setup, getting-started]
---

## Prerequisites

Before installing TS Markdown, make sure you have:

- **Node.js** 18+ or **Bun** 1.0+
- **TypeScript** (recommended for type safety)

**Package Manager**: We recommend using Bun for the best performance, but npm, yarn, and pnpm are also supported.

## Installation Options

### Option 1: Bun (Recommended)

```bash
bun add tsm
```

### Option 2: npm

```bash
npm install tsm
```

### Option 3: yarn

```bash
yarn add tsm
```

### Option 4: pnpm

```bash
pnpm add tsm
```

## TypeScript Setup

For TypeScript projects, you'll also want to install the type definitions:

```bash
bun add -D @types/react @types/react-dom
```

## Basic Setup

### 1. Import Better-MDX

```typescript
import { MDXParser, compileMDX, executeMDXTemplate } from 'better-mdx'
```

### 2. Create Your First Template

```typescript
const template = `
# Hello {name}!

Today is {currentDate}

{isLoggedIn ? (
  <p>Welcome back, {user.name}!</p>
) : (
  <p>Please log in to continue.</p>
)}
`
```

### 3. Parse and Execute

```typescript
// Parse the template
const parsed = new MDXParser().parse(template)

// Compile to executable code
const compiled = compileMDX(parsed)

// Execute with data
const result = executeMDXTemplate(compiled, {
  name: 'World',
  currentDate: new Date().toLocaleDateString(),
  isLoggedIn: true,
  user: { name: 'John Doe' }
})

// Render the result
console.log(result)
```

## React Integration

For React applications, you can use the ClientRenderer:

```typescript
import { ClientRenderer } from 'better-mdx'

function MyComponent() {
  const renderer = new ClientRenderer()
  
  return (
    <div>
      {renderer.render(compiled, {
        name: 'React User',
        currentDate: new Date().toISOString(),
        isLoggedIn: false
      })}
    </div>
  )
}
```

## Framework-Specific Setup

### Next.js

For Next.js applications:

```typescript
// pages/api/mdx.ts
import { MDXParser, compileMDX } from 'better-mdx'

export default async function handler(req, res) {
  const { content, data } = req.body
  
  const parsed = new MDXParser().parse(content)
  const compiled = compileMDX(parsed)
  
  // Your execution logic here
  
  res.json({ result: compiled })
}
```

### Vite

For Vite applications, add Better-MDX to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    // Better-MDX integration
  ],
  // Your other config
})
```

### Webpack

For Webpack applications, you can create a custom loader:

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.mdx$/,
        use: [
          'babel-loader',
          {
            loader: 'better-mdx/loader',
            options: {
              // Your options
            }
          }
        ]
      }
    ]
  }
}
```

## Verification

To verify your installation is working correctly:

### 1. Create a Test File

```typescript
// test-better-mdx.ts
import { MDXParser } from 'better-mdx'

const parser = new MDXParser()
const result = parser.parse('# Hello {name}!')

console.log('✅ Better-MDX is working!')
console.log('Parsed result:', result)
```

### 2. Run the Test

```bash
bun run test-better-mdx.ts
# or
node test-better-mdx.ts
```

You should see:
```
✅ Better-MDX is working!
Parsed result: [parsed AST structure]
```

## Common Issues

### Import Errors

If you encounter import errors:

**Module Resolution**: Make sure your `tsconfig.json` or `package.json` has the correct module resolution settings.

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

### TypeScript Errors

For TypeScript projects, ensure you have the correct types:

```bash
bun add -D @types/node @types/react @types/react-dom
```

### Build Tool Integration

Different build tools may require additional configuration:

**Build Tools**: Check the specific integration guide for your build tool (Webpack, Vite, Next.js, etc.) for detailed setup instructions.

## Next Steps

Now that Better-MDX is installed, you're ready to:

1. **Quick Start** - Create your first dynamic content
2. **Your First File** - Build a complete example
3. **Explore Syntax** - Learn about dynamic features

{% callout type="check" %}
**Installation Complete!** You're now ready to start creating dynamic content with Better-MDX.
{% /callout %}

## Support

If you run into any issues during installation:

- Check the [troubleshooting guide](/troubleshooting)
- Visit our [GitHub repository](https://github.com/better-mdx/better-mdx)
- Join our [Discord community](https://discord.gg/better-mdx)
