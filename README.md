# TS Markdown

![TS Markdown Extension](./EmbedImage.png)

A type-safe, component based markdown engine for embedding markdown content with TypeScript.
Create dynamic, template-driven markdown with full type support.

> ⚠️ **Early Alpha**: This library is in early alpha and is not stable for production applications.

## ✨ Features

1. **TypeScript Integration** - Full TypeScript support with type checking and IntelliSense
2. **Template Interpolation** - Dynamic content with `{{ expression }}` syntax
3. **Conditional Rendering** - Smart conditional blocks with ternary operators and logical AND
4. **Developer Tools** - Comprehensive CLI, VS Code extension, and testing utilities

## 🚀 Quick Start

### Installation

```bash
npm install typescriptmd
# or
bun add typescriptmd
```

### Create Your First TSMD File

```bash
mkdir tsmd
```

```ts
// /tsmd/Welcome.tsmd
function Welcome() {
  const appName = 'My App';
  const version = '1.0.0';
  const isProduction = false;

  return (
    # Welcome to {{ appName }}! 🎉

    Current version: **{{ version }}**

    {{ isProduction ? (
      ## Production Mode ✅
    ) : (
      ## Development Mode 🚧
    ) }}
  )
}
```

### Basic Usage

```bash
npm run typescriptmd
```

Then, you will see `.ts` files output in `/tsmd/_generated`

## 📖 Documentation

### Core Concepts

#### 1. Template Interpolation

Use `{{ expression }}` to embed dynamic content:

```ts
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

```ts
function Dashboard() {
  const { user, isLoggedIn } = useAuth();
  const notifications = getNotifications();

  return (
    # Dashboard

    {{ isLoggedIn && (
      Welcome back, {{ user.name }}!
    ) }}

    {{ !isLoggedIn && (
      Please [log in](./login) to continue.
    ) }}

    {{ notifications.length > 0 && (
      ## Notifications ({{ notifications.length }})
      {{ notifications.map(n => `- ${n.message}`).join('\n') }}
    ) }}

    {{ notifications.length === 0 && (
      No new notifications.
    ) }}
  )
}
```

#### 3. Component Integration

Use components with the `<@ComponentName/>` syntax:

```ts
import { FeatureDetailView } from './components';

function Homepage() {
  const features = ['Fast', 'Type-safe', 'Developer-friendly'];

  return (
    # Welcome to TS Markdown

    Get started in minutes with our powerful framework.

    ## Features

    {{ features.map(feature => (
      <@FeatureDetailView feature="${feature}" />
    ) }}
  )
}
```

Install the TS Markdown VS Code extension for:

- **Syntax highlighting** for TSMD files
- **IntelliSense** for template expressions
- **Live preview** of TSMD content


## 🤝 Contributing

We welcome contributions!

### Development Setup

```bash
git clone https://github.com/andrewtdiz/tsmarkdown
cd tsmarkdown
npm install
npm run dev
```

### Running Tests

```bash
npm test
# or with coverage
npm test --coverage
```

## 📜 License

MIT © [TS Markdown Team](https://github.com/andrewtdiz/tsmarkdown)

## 🔗 Links

- [Documentation](https://tsmarkdown.dev)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=TSMarkdown.tsmarkdown-extension)

---

Made with ❤️ by the TS Markdown team