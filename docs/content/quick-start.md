---
title: Quick Start Guide
description: Get up and running with TS Markdown in just a few minutes
date: 2024-01-15
author: TS Markdown Team
tags: [quick-start, tutorial, getting-started]
---

## 5-Minute Setup

### Step 1: Create a New Project

```bash
mkdir my-ts-markdown-app
cd my-ts-markdown-app
bun init -y
```

### Step 2: Install TS Markdown

```bash
bun add tsm
```

### Step 3: Create Your First File

Create `index.tsd`:

```typescript
import { TSMParser, compileTSM, executeTSMTemplate } from 'tsm'
import React from 'react'
import { createRoot } from 'react-dom/client'

// Your dynamic content template
const template = `
# Welcome to TS Markdown!

Hello {name}! Today is {currentDate}.

## Your Profile
- **Name**: {user.name}
- **Email**: {user.email}
- **Status**: {user.isActive ? 'Active' : 'Inactive'}

## Quick Actions
{user.isActive ? (
  <div>
    <button onClick={() => alert('Hello {user.name}!')}>
      Say Hello
    </button>
    <button onClick={() => console.log('User clicked!')}>
      Log Action
    </button>
  </div>
) : (
  <p>Please activate your account to see actions.</p>
)}
`

// Sample data
const data = {
  name: 'Developer',
  currentDate: new Date().toLocaleDateString(),
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    isActive: true
  }
}

// Parse and compile
const parser = new MDXParser()
const parsed = parser.parse(template)
const compiled = compileMDX(parsed)

// Execute with data
const result = executeMDXTemplate(compiled, data)

// Render to DOM
const container = document.getElementById('root')
const root = createRoot(container!)
root.render(<div>{result}</div>)
```

### Step 4: Create HTML Template

Create `index.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Better-MDX Quick Start</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
</body>
</html>
```

### Step 5: Run Your App

```bash
bun run --bun index.tsx
```

🎉 **Congratulations!** You've created your first Better-MDX application!

## Understanding the Code

Let's break down what happened:

### Template Interpolation

```jsx
Hello {name}! Today is {currentDate}.
```

This creates dynamic text that changes based on your data.

### Conditional Rendering

```jsx
{user.isActive ? (
  <div>Active user content</div>
) : (
  <p>Inactive user content</p>
)}
```

This shows different content based on conditions.

### Interactive Components

```jsx
<button onClick={() => alert('Hello {user.name}!')}>
  Say Hello
</button>
```

This creates interactive buttons that respond to user clicks.

## Next Steps

Now that you have a working example, try these enhancements:

### 1. Add More Data

```typescript
const data = {
  name: 'Developer',
  currentDate: new Date().toLocaleDateString(),
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    isActive: true,
    preferences: {
      theme: 'dark',
      language: 'en'
    }
  },
  todos: [
    { id: 1, text: 'Learn Better-MDX', completed: true },
    { id: 2, text: 'Build something cool', completed: false }
  ]
}
```

### 2. Create Dynamic Lists

```jsx
## Your Todos
{todos.map(todo => (
  <div key={todo.id} style={{
    textDecoration: todo.completed ? 'line-through' : 'none'
  }}>
    {todo.completed ? '✅' : '⭕'} {todo.text}
  </div>
))}
```

### 3. Add Styling

```jsx
<div style={{
  padding: '20px',
  border: '1px solid #ccc',
  borderRadius: '8px',
  backgroundColor: user.preferences.theme === 'dark' ? '#333' : '#fff',
  color: user.preferences.theme === 'dark' ? '#fff' : '#333'
}}>
  <h2>Styled Content</h2>
  <p>This content adapts to user preferences!</p>
</div>
```

## Common Patterns

### Data Fetching

```typescript
// Fetch data from an API
const fetchUserData = async () => {
  const response = await fetch('/api/user')
  return response.json()
}

// Use in your template
const userData = await fetchUserData()
const result = executeMDXTemplate(compiled, userData)
```

### Error Handling

```typescript
try {
  const result = executeMDXTemplate(compiled, data)
  return result
} catch (error) {
  console.error('Template execution failed:', error)
  return <div>Error: {error.message}</div>
}
```

### Loading States

```jsx
{isLoading ? (
  <div>Loading...</div>
) : (
  <div>
    <h1>Welcome, {user.name}!</h1>
    <p>Your data is ready.</p>
  </div>
)}
```

## What You've Learned

✅ **Template Interpolation**: Using `{variable}` syntax  
✅ **Conditional Rendering**: Using ternary operators  
✅ **Interactive Components**: Adding click handlers  
✅ **Data Integration**: Passing data to templates  
✅ **Basic Setup**: Getting Better-MDX running  

## Ready for More?

Now that you understand the basics, you're ready to:

1. **Create Your First File** - Build a complete application
2. **Explore Syntax** - Learn advanced features
3. **Build Real Projects** - Apply Better-MDX to your use cases

{% callout type="check" %}
**Quick Start Complete!** You now have a working Better-MDX application and understand the core concepts.
{% /callout %}

## Troubleshooting

### Common Issues

**Template not updating?**
- Make sure you're passing fresh data to `executeMDXTemplate`
- Check that your data structure matches what the template expects

**Components not rendering?**
- Ensure React is properly imported
- Check that your JSX syntax is correct

**Build errors?**
- Verify all dependencies are installed
- Check your TypeScript configuration

Need help? Check out our [troubleshooting guide](/troubleshooting) or join our [community Discord](https://discord.gg/better-mdx).
