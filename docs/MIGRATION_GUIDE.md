# Migration Guide

This guide helps you migrate from other content frameworks to Better-MDX.

## From Traditional MDX

### Key Differences

**Traditional MDX:**
```mdx
import { Button } from './components';

export const metadata = {
  title: 'My Post',
  author: 'Jane Doe'
};

# {metadata.title}

This is a standard MDX file with JSX mixed in.

<Button onClick={() => alert('Hello')}>
  Click me
</Button>
```

**Better-MDX:**
```mdx
import { Button } from './components';

function MyPost() {
  const metadata = {
    title: 'My Post',
    author: 'Jane Doe'
  };

  return (
    # {{ metadata.title }}

    This is a Better-MDX file with template expressions.

    <Button onClick={() => alert('Hello')}>
      Click me
    </Button>
  )
}
```

### Migration Steps

1. **Wrap content in function**
2. **Convert exports to variables**
3. **Use template expressions for dynamic content**
4. **Test compilation and execution**

### Automated Migration

Use our migration tool:

```bash
npx better-mdx migrate --from=mdx --input=./content --output=./mdx
```

## From Next.js MDX

### Converting getStaticProps

**Before (Next.js):**
```tsx
// pages/blog/[slug].tsx
export async function getStaticProps({ params }) {
  const post = await getPost(params.slug);
  return { props: { post } };
}

export default function BlogPost({ post }) {
  return <MDXContent {...post} />;
}
```

**After (Better-MDX):**
```mdx
// mdx/blog/BlogPost.mdx
function BlogPost({ slug }) {
  const post = getPost(slug);
  const relatedPosts = getRelatedPosts(post.tags);

  return (
    # {{ post.title }}

    **Published:** {{ formatDate(post.publishedAt) }}

    {{ post.content }}

    ## Related Posts
    {{ relatedPosts.map(p => `- [${p.title}](${p.slug})`).join('\n') }}
  )
}
```

## From Gatsby

### Converting GraphQL queries

**Before (Gatsby):**
```jsx
export const query = graphql`
  query BlogPostBySlug($slug: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      html
      frontmatter {
        title
        date
        tags
      }
    }
  }
`;

export default function BlogPost({ data }) {
  const post = data.markdownRemark;
  return (
    <div>
      <h1>{post.frontmatter.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.html }} />
    </div>
  );
}
```

**After (Better-MDX):**
```mdx
function BlogPost({ slug }) {
  const post = getPostBySlug(slug);

  return (
    # {{ post.frontmatter.title }}

    **Date:** {{ formatDate(post.frontmatter.date) }}

    {{ post.content }}

    ## Tags
    {{ post.frontmatter.tags.map(tag => `[#${tag}](/tags/${tag})`).join(' ') }}
  )
}
```

## From Jekyll

### Converting Liquid templates

**Before (Jekyll):**
```markdown
---
layout: post
title: "My Post"
date: 2024-01-15
categories: blog
---

# {{ page.title }}

Published on {{ page.date | date: "%B %d, %Y" }}

{% if page.featured %}
  This is a featured post!
{% endif %}

{% for category in page.categories %}
  - [{{ category }}](/categories/{{ category }})
{% endfor %}
```

**After (Better-MDX):**
```mdx
function BlogPost() {
  const page = {
    title: "My Post",
    date: new Date('2024-01-15'),
    categories: ['blog'],
    featured: true
  };

  return (
    # {{ page.title }}

    Published on {{ formatDate(page.date) }}

    {page.featured && (
      This is a featured post!
    )}

    ## Categories
    {{ page.categories.map(cat => `- [${cat}](/categories/${cat})`).join('\n') }}
  )
}
```

## From Hugo

### Converting shortcodes

**Before (Hugo):**
```markdown
---
title: "My Post"
date: 2024-01-15
---

# {{ .Title }}

{{< highlight typescript >}}
const greeting = "Hello World";
console.log(greeting);
{{< /highlight >}}

{{< figure src="/images/example.jpg" title="Example Image" >}}
```

**After (Better-MDX):**
```mdx
import { CodeBlock, Figure } from '../components';

function BlogPost() {
  const frontmatter = {
    title: "My Post",
    date: new Date('2024-01-15')
  };

  return (
    # {{ frontmatter.title }}

    <CodeBlock language="typescript">
      {`const greeting = "Hello World";
      console.log(greeting);`}
    </CodeBlock>

    <Figure
      src="/images/example.jpg"
      title="Example Image"
    />
  )
}
```

## From Docusaurus

### Converting MDX pages

**Before (Docusaurus):**
```mdx
---
id: getting-started
title: Getting Started
sidebar_label: Getting Started
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Getting Started

<Tabs>
  <TabItem value="npm" label="npm">
    ```bash
    npm install my-package
    ```
  </TabItem>
  <TabItem value="yarn" label="Yarn">
    ```bash
    yarn add my-package
    ```
  </TabItem>
</Tabs>
```

**After (Better-MDX):**
```mdx
import { Tabs, TabItem, CodeBlock } from '../components';

function GettingStarted() {
  const pageInfo = {
    id: 'getting-started',
    title: 'Getting Started',
    sidebarLabel: 'Getting Started'
  };

  const installCommands = [
    { label: 'npm', command: 'npm install my-package' },
    { label: 'Yarn', command: 'yarn add my-package' }
  ];

  return (
    # {{ pageInfo.title }}

    <Tabs>
      {{ installCommands.map(cmd => `
      <TabItem value="${cmd.label.toLowerCase()}" label="${cmd.label}">
        <CodeBlock language="bash">
          ${cmd.command}
        </CodeBlock>
      </TabItem>
      `).join('') }}
    </Tabs>
  )
}
```

## Common Migration Patterns

### 1. Frontmatter to Variables

```diff
- ---
- title: "My Post"
- author: "John Doe"
- tags: ["react", "typescript"]
- ---
+ function MyPost() {
+   const frontmatter = {
+     title: "My Post",
+     author: "John Doe",
+     tags: ["react", "typescript"]
+   };
```

### 2. Template Variables to Expressions

```diff
- # {{ title }}
- By {{ author }}
+ # {{ frontmatter.title }}
+ By {{ frontmatter.author }}
```

### 3. Loops to Array Methods

```diff
- {% for tag in tags %}
-   - [{{ tag }}](/tags/{{ tag }})
- {% endfor %}
+ {{ frontmatter.tags.map(tag => `- [${tag}](/tags/${tag})`).join('\n') }}
```

### 4. Conditionals to JavaScript

```diff
- {% if featured %}
-   ⭐ Featured Post
- {% endif %}
+ {frontmatter.featured && (
+   ⭐ Featured Post
+ )}
```

## Migration Checklist

- [ ] **Install Better-MDX** in your project
- [ ] **Create mdx directory** structure
- [ ] **Convert frontmatter** to JavaScript objects
- [ ] **Wrap content** in function declarations
- [ ] **Update template syntax** to Better-MDX expressions
- [ ] **Migrate components** to React components
- [ ] **Test compilation** and execution
- [ ] **Update build process** to use Better-MDX CLI
- [ ] **Configure VS Code extension**
- [ ] **Set up testing** with Better-MDX utilities

## Migration Tools

### Automated Migration CLI

```bash
# Migrate from various formats
better-mdx migrate --from=mdx --input=./content
better-mdx migrate --from=jekyll --input=./_posts
better-mdx migrate --from=hugo --input=./content
better-mdx migrate --from=gatsby --input=./src/pages

# Custom migration with rules
better-mdx migrate --config=./migration.config.js
```

### Migration Configuration

```javascript
// migration.config.js
module.exports = {
  from: 'jekyll',
  input: './_posts',
  output: './mdx',
  rules: {
    frontmatterToVariables: true,
    liquidToExpressions: true,
    preserveMetadata: true,
    componentMapping: {
      'highlight': 'CodeBlock',
      'figure': 'Figure'
    }
  },
  transforms: [
    // Custom transformation functions
    (content) => content.replace(/{% raw %}/g, ''),
    (content) => content.replace(/{% endraw %}/g, '')
  ]
};
```

### Validation and Testing

After migration, validate your content:

```bash
# Validate all migrated files
better-mdx validate ./mdx

# Test compilation
better-mdx test compile ./mdx

# Generate migration report
better-mdx migrate --report ./migration-report.html
```

## Post-Migration Optimization

### 1. Leverage TypeScript

Add type safety to your migrated content:

```mdx
interface BlogPost {
  title: string;
  author: string;
  publishedAt: Date;
  tags: string[];
}

function BlogPost() {
  const post: BlogPost = {
    title: "My Post",
    author: "John Doe",
    publishedAt: new Date('2024-01-15'),
    tags: ["react", "typescript"]
  };

  return (
    # {{ post.title }}
    By {{ post.author }} on {{ formatDate(post.publishedAt) }}
  )
}
```

### 2. Extract Reusable Components

```mdx
// Before: Duplicated code
function PostA() {
  return (
    # Post A
    **Author:** John Doe
    **Date:** 2024-01-15
  )
}

function PostB() {
  return (
    # Post B
    **Author:** Jane Smith
    **Date:** 2024-01-16
  )
}
```

```mdx
// After: Reusable components
import { PostHeader } from '../components';

function PostA() {
  const post = { title: "Post A", author: "John Doe", date: new Date('2024-01-15') };
  return (
    <PostHeader post={post} />
  )
}
```

### 3. Optimize Performance

Use Better-MDX features for better performance:

```mdx
function OptimizedPost() {
  // Lazy load heavy components
  const showChart = useFeatureFlag('charts');

  // Memoize expensive calculations
  const analytics = useMemo(() => calculateAnalytics(), [data]);

  return (
    # Performance Optimized Post

    {showChart && (
      <LazyChart data={analytics} />
    )}
  )
}
```

## Getting Help

If you encounter issues during migration:

1. **Check the [troubleshooting guide](./TROUBLESHOOTING.md)**
2. **Use the migration validator**: `better-mdx validate --migration`
3. **Join our [Discord community](https://discord.gg/better-mdx)**
4. **Open an issue** on [GitHub](https://github.com/better-mdx/better-mdx/issues)

## Migration Examples

Complete before/after examples are available in our repository:

- [Jekyll to Better-MDX](https://github.com/better-mdx/examples/tree/main/migrations/jekyll)
- [Gatsby to Better-MDX](https://github.com/better-mdx/examples/tree/main/migrations/gatsby)
- [Next.js MDX to Better-MDX](https://github.com/better-mdx/examples/tree/main/migrations/nextjs)
- [Docusaurus to Better-MDX](https://github.com/better-mdx/examples/tree/main/migrations/docusaurus)

Each example includes:
- Original source code
- Migrated Better-MDX code
- Step-by-step migration process
- Performance comparisons
- Best practices applied

---

Happy migrating! The Better-MDX experience is worth the effort. 🚀