# Getting Started with Better-MDX

Welcome to Better-MDX! This guide will walk you through everything you need to know to start building amazing content with our hybrid TypeScript + Markdown framework.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** or **Bun 1.0+**
- **TypeScript 5.0+** (optional but recommended)
- A modern text editor (VS Code recommended with our extension)

## Installation

### Quick Start with CLI

Create a new Better-MDX project in seconds:

```bash
# Using npm
npx better-mdx init my-project
cd my-project
npm install
npm run dev

# Using bun (recommended)
bun x better-mdx init my-project
cd my-project
bun install
bun run dev
```

### Manual Installation

If you prefer to add Better-MDX to an existing project:

```bash
# Install Better-MDX
npm install better-mdx
# or
bun add better-mdx

# Install peer dependencies
npm install react react-dom typescript
# or
bun add react react-dom typescript
```

## Your First MDX File

Create a file called `Welcome.mdx` in your `mdx/` directory:

```mdx
// mdx/Welcome.mdx
function Welcome() {
  const name = 'Better-MDX Developer';
  const features = ['Type-safe', 'Fast', 'Developer-friendly'];
  const isExcited = true;

  return (
    # Hello, {{ name }}! 👋

    Welcome to Better-MDX - the future of content creation.

    <tone>
    Be kind
    </tone>

    {isExcited && (
      ## 🎉 Why You'll Love Better-MDX

      Better-MDX combines the best of both worlds:
      - **Markdown simplicity** for content creators
      - **TypeScript power** for developers
    )}

    ## Key Features

    {{ features.map((feature, index) => (
      {{index + 1}}. **{{feature}}**
    ))}}

    ---

    Ready to build something amazing? Let's go! 🚀
  )
}
```

### Understanding the Structure

Every Better-MDX file follows this pattern:

1. **Function Declaration** - Your content is wrapped in a TypeScript function
2. **TypeScript Logic** - Variables, computations, data processing
3. **Return Statement** - The actual content using Markdown + template expressions

## Core Concepts

### 1. Template Interpolation

Use `{{ expression }}` to inject dynamic content:

```mdx
function UserProfile() {
  const user = {
    name: 'Alice Johnson',
    role: 'Senior Developer',
    experience: 8,
    skills: ['React', 'TypeScript', 'Node.js']
  };

  return (
    # {{ user.name }}'s Profile

    **Role:** {{ user.role }}
    **Experience:** {{ user.experience }} years

    **Top Skills:**
    {{ user.skills.slice(0, 3).map(skill => `- ${skill}`).join('\n') }}

    {{ user.experience > 5 ? '🏆 **Senior Level**' : '🌱 **Growing Professional**' }}
  )
}
```

### 2. Conditional Rendering

Show different content based on conditions:

```mdx
function Dashboard({ user }) {
  const notifications = getNotifications(user.id);
  const hasUnreadMessages = notifications.some(n => !n.read);

  return (
    # Welcome back, {{ user.name }}!

    {user.isPremium && (
      ## 💎 Premium Dashboard
      Access your exclusive features and premium content.
    )}

    {!user.isPremium && (
      ## Standard Dashboard
      [Upgrade to Premium](/upgrade) to unlock more features.
    )}

    {hasUnreadMessages && (
      ## 🔔 Notifications ({{ notifications.filter(n => !n.read).length }})
      You have unread messages waiting for you.
    )}

    {!hasUnreadMessages && (
      📭 All caught up! No new notifications.
    )}
  )
}
```

### 3. Props Support

Pass data to your MDX components:

```mdx
function ProductCard({ product, showPrice = true }) {
  const isOnSale = product.salePrice < product.regularPrice;
  const discount = Math.round((1 - product.salePrice / product.regularPrice) * 100);

  return (
    # {{ product.name }}

    {{ product.description }}

    {showPrice && (
      ## Price Information
      {isOnSale && (
        **Sale Price:** ${{ product.salePrice }}
        ~~Regular: ${{ product.regularPrice }}~~
        **Save {{ discount }}%!** 🔥
      )}

      {!isOnSale && (
        **Price:** ${{ product.regularPrice }}
      )}
    )}

    **Rating:** {{ product.rating }}/5 ⭐
    **In Stock:** {{ product.inventory > 0 ? '✅ Available' : '❌ Out of Stock' }}
  )
}
```

### 4. Component Imports

Use React components within your MDX:

```mdx
import { Button, Card, Chart } from '../components';
import { formatDate } from '../utils';

function SalesReport() {
  const salesData = getSalesData();
  const totalRevenue = salesData.reduce((sum, sale) => sum + sale.amount, 0);
  const bestMonth = salesData.reduce((best, current) =>
    current.amount > best.amount ? current : best
  );

  return (
    # Q4 Sales Report

    <Card variant="success">
      ## 💰 Total Revenue: ${{ totalRevenue.toLocaleString() }}

      **Best Month:** {{ bestMonth.month }} (${{ bestMonth.amount.toLocaleString() }})
      **Report Generated:** {{ formatDate(new Date()) }}
    </Card>

    <Chart
      data={salesData}
      type="line"
      title="Monthly Sales Performance"
    />

    ## Monthly Breakdown

    {{ salesData.map(month => `
    ### {{ month.month }}
    - **Revenue:** ${{ month.amount.toLocaleString() }}
    - **Orders:** {{ month.orders }}
    - **Growth:** {{ month.growth > 0 ? '+' : '' }}{{ month.growth }}%
    `).join('\n') }}

    <Button variant="primary" onClick={() => exportReport()}>
      📊 Export Detailed Report
    </Button>
  )
}
```

## Development Workflow

### 1. Development Server

Start the development server with hot reload:

```bash
# Start with default settings
better-mdx dev

# Custom port
better-mdx dev --port 8080

# Verbose output for debugging
better-mdx dev --verbose
```

Features included:
- 🔥 **Hot Module Replacement** - Instant updates on file changes
- 🚨 **Error Overlay** - Clear compilation error messages
- 📊 **Dev Tools** - Built-in debugging and inspection tools

### 2. File Operations

Work with individual files during development:

```bash
# Compile a single file to see output
better-mdx compile my-file.mdx

# Execute with mock context for testing
better-mdx execute my-file.mdx

# Watch specific files for changes
better-mdx watch ./mdx/blog/

# Save compiled output
better-mdx compile my-file.mdx --output ./output.json
```

### 3. Building for Production

When you're ready to deploy:

```bash
# Build all files
better-mdx build

# Custom output directory
better-mdx build --output ./dist

# Production build with optimizations
better-mdx build --optimize
```

This creates:
- Compiled MDX files as JSON
- Manifest file with metadata
- Optimized bundles for production

## IDE Setup

### VS Code Extension

Install the Better-MDX extension for the best development experience:

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Better-MDX"
4. Install and reload

Features you'll get:
- ✨ **Syntax Highlighting** for MDX files
- 🔍 **IntelliSense** for template expressions
- 🚨 **Error Detection** with inline diagnostics
- 📝 **Code Snippets** for common patterns
- 👀 **Live Preview** of your content

### Configuration

Add these settings to your VS Code workspace:

```json
// .vscode/settings.json
{
  "better-mdx.autoCompile": true,
  "better-mdx.outputDirectory": "./dist",
  "better-mdx.showInlineErrors": true,
  "better-mdx.syntax.enableInterpolationHighlighting": true,
  "better-mdx.syntax.enableConditionalHighlighting": true
}
```

### Recommended Extensions

These extensions work great with Better-MDX:
- **TypeScript Importer** - Auto-import for TypeScript
- **Prettier** - Code formatting
- **GitLens** - Git integration
- **Auto Rename Tag** - HTML/JSX tag renaming

## Testing Your Content

Better-MDX includes comprehensive testing utilities:

```typescript
import { createMDXTest, createMDXTestSuite, MDXTestRunner } from 'better-mdx/testing';

// Create individual tests
const welcomeTest = createMDXTest('Welcome message', `
  function Welcome() {
    const name = 'Developer';
    return (
      # Hello {{ name }}!
    )
  }
`)
.expectContains('Hello Developer!')
.build();

// Create test suites
const basicSuite = createMDXTestSuite('Basic Features')
  .addTest(welcomeTest)
  .addTest(/* more tests */)
  .build();

// Run tests
const runner = new MDXTestRunner();
await runner.runTestSuite(basicSuite);

// Generate reports
runner.generateHTMLReport('./test-results/report.html');
```

### Snapshot Testing

Test your content against saved snapshots:

```typescript
import { MDXSnapshotTester } from 'better-mdx/testing';

const tester = new MDXSnapshotTester();

// Create or verify snapshot
const matches = tester.matchSnapshot('user-profile', userProfileMDX, {
  user: { name: 'Alice', role: 'Developer' }
});

// Update snapshots when content changes
tester.updateSnapshot('user-profile', userProfileMDX, context);
```

## Common Patterns

### Data Fetching

```mdx
function BlogPost() {
  const post = getCurrentPost(); // Your data fetching logic
  const relatedPosts = getRelatedPosts(post.tags);
  const comments = getComments(post.id);

  return (
    # {{ post.title }}

    {{ post.content }}

    {relatedPosts.length > 0 && (
      ## Related Posts
      {{ relatedPosts.map(p => `- [${p.title}](${p.url})`).join('\n') }}
    )}

    ## Comments ({{ comments.length }})
    {{ comments.map(c => `
    **${c.author}** - ${formatDate(c.date)}
    > ${c.content}
    `).join('\n') }}
  )
}
```

### Error Handling

```mdx
function SafeContent() {
  let data;
  let error;

  try {
    data = fetchImportantData();
  } catch (e) {
    error = e.message;
  }

  return (
    # Content Dashboard

    {error && (
      ## ⚠️ Error Loading Data
      {{ error }}

      Please try refreshing the page.
    )}

    {data && !error && (
      ## 📊 Your Data
      {{ JSON.stringify(data, null, 2) }}
    )}

    {!data && !error && (
      ## 🔄 Loading...
      Please wait while we fetch your data.
    )}
  )
}
```

### Internationalization

```mdx
function MultiLanguageContent() {
  const currentLocale = getCurrentLocale();
  const t = useTranslations();

  const messages = {
    en: { welcome: 'Welcome', description: 'This is amazing!' },
    es: { welcome: 'Bienvenido', description: '¡Esto es increíble!' },
    fr: { welcome: 'Bienvenue', description: 'C\'est incroyable!' }
  };

  const text = messages[currentLocale] || messages.en;

  return (
    # {{ text.welcome }}! 🌍

    {{ text.description }}

    **Language:** {{ currentLocale.toUpperCase() }}

    ## Available Languages
    {{ Object.keys(messages).map(lang => `
    - [${lang.toUpperCase()}](/lang/${lang})
    `).join('\n') }}
  )
}
```

## Performance Best Practices

### 1. Optimize Large Data Sets

```mdx
function LargeDataDisplay() {
  const allItems = getLargeDataSet(); // 1000+ items
  const itemsPerPage = 20;
  const currentPage = getCurrentPage();

  // Paginate data to avoid rendering all at once
  const paginatedItems = allItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(allItems.length / itemsPerPage);

  return (
    # Data Display ({{ allItems.length }} total items)

    ## Page {{ currentPage }} of {{ totalPages }}

    {{ paginatedItems.map(item => `
    - **${item.name}**: ${item.description}
    `).join('\n') }}

    {{ currentPage > 1 ? '[← Previous](/page/' + (currentPage - 1) + ')' : '' }}
    {{ currentPage < totalPages ? '[Next →](/page/' + (currentPage + 1) + ')' : '' }}
  )
}
```

### 2. Lazy Loading Components

```mdx
import { LazyComponent } from '../components';

function HomePage() {
  const showAdvancedFeatures = useFeatureFlag('advanced-features');

  return (
    # Welcome to Our Platform

    Basic content loads immediately.

    {showAdvancedFeatures && (
      <LazyComponent
        loader={() => import('../components/AdvancedChart')}
        fallback="Loading advanced chart..."
      />
    )}
  )
}
```

### 3. Memoization for Expensive Calculations

```mdx
function ComplexAnalytics() {
  const rawData = getLargeDataSet();

  // Memoize expensive calculations
  const analytics = useMemo(() => {
    return {
      total: rawData.length,
      average: rawData.reduce((sum, item) => sum + item.value, 0) / rawData.length,
      trends: calculateTrends(rawData),
      predictions: generatePredictions(rawData)
    };
  }, [rawData]);

  return (
    # Analytics Dashboard

    ## Summary
    - **Total Records:** {{ analytics.total.toLocaleString() }}
    - **Average Value:** {{ analytics.average.toFixed(2) }}

    ## Trends
    {{ analytics.trends.map(trend => `
    - **${trend.period}**: ${trend.change > 0 ? '📈' : '📉'} ${trend.change}%
    `).join('\n') }}
  )
}
```

## Troubleshooting

### Common Issues

#### 1. Compilation Errors

**Problem**: "Unmatched interpolation braces"
```mdx
# Welcome {{ name  // Missing closing brace
```

**Solution**: Always close your interpolation braces
```mdx
# Welcome {{ name }}
```

#### 2. TypeScript Errors

**Problem**: Variable not defined
```mdx
function Example() {
  return (
    # Hello {{ unknownVariable }}
  )
}
```

**Solution**: Define all variables used in templates
```mdx
function Example() {
  const unknownVariable = 'World';

  return (
    # Hello {{ unknownVariable }}
  )
}
```

#### 3. Component Import Issues

**Problem**: Component not rendering
```mdx
import { MissingComponent } from './wrong-path';
```

**Solution**: Check import paths and ensure components exist
```mdx
import { Button } from '../components/Button';
```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# CLI debug mode
better-mdx dev --verbose

# Programmatic debug mode
// No need to instantiate - executeMDXTemplate is a standalone function
```

### Getting Help

- 📚 [Full Documentation](https://better-mdx.dev/docs)
- 💬 [Discord Community](https://discord.gg/better-mdx)
- 🐛 [Issue Tracker](https://github.com/better-mdx/better-mdx/issues)
- 📧 [Support Email](mailto:support@better-mdx.dev)

## Next Steps

Now that you understand the basics, explore these advanced topics:

1. **[Advanced Patterns](./ADVANCED_PATTERNS.md)** - Complex use cases and best practices
2. **[Plugin Development](./PLUGIN_DEVELOPMENT.md)** - Extend Better-MDX functionality
3. **[Performance Guide](./PERFORMANCE.md)** - Optimize for production
4. **[Testing Strategies](./TESTING.md)** - Comprehensive testing approaches
5. **[Deployment](./DEPLOYMENT.md)** - Deploy your Better-MDX applications

---

Welcome to the Better-MDX community! We're excited to see what you build. 🚀