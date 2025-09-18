# Component Examples

This page demonstrates all the available markdown components with TailwindCSS and shadcn/ui styling.

## Basic Text Elements

This is a regular paragraph with some **bold text** and *italic text*. You can also use `inline code` for technical terms.

### Blockquotes

> This is a blockquote with some important information. It has a nice left border and italic styling.

### Code Blocks

```typescript
// Example TypeScript code
interface User {
  id: string;
  name: string;
  email: string;
}

const user: User = {
  id: "1",
  name: "John Doe",
  email: "john@example.com"
};
```

## Lists

### Unordered List
- First item
- Second item with **bold text**
- Third item with `inline code`
  - Nested item
  - Another nested item

### Ordered List
1. First step
2. Second step with a [link](https://example.com)
3. Third step
   1. Sub-step A
   2. Sub-step B

## Tables

| Component | Type | Description |
|-----------|------|-------------|
| Button | Interactive | Primary action component |
| Card | Layout | Container for related content |
| Badge | Display | Small status or label indicator |
| Alert | Feedback | Important message display |

## Custom Components

### Enhanced Callouts

<EnhancedCallout type="tip" title="Pro Tip">
This is an enhanced callout with an icon and better styling. It's perfect for highlighting important information.
</EnhancedCallout>

<EnhancedCallout type="warning">
Always remember to test your components before deploying to production.
</EnhancedCallout>

<EnhancedCallout type="check" title="Success!">
Your setup is complete and ready to use.
</EnhancedCallout>

### Feature Cards

<FeatureCard 
  title="Type Safety" 
  description="Built with TypeScript for better development experience"
  badge="New"
>
This card demonstrates how to showcase features with icons and badges.
</FeatureCard>

### Code Examples

<CodeExample 
  title="React Component"
  description="A simple React component example"
  language="tsx"
>
```tsx
import React from 'react';
import { Button } from '@/components/ui/button';

export function MyComponent() {
  return (
    <Button onClick={() => console.log('Clicked!')}>
      Click me
    </Button>
  );
}
```
</CodeExample>

### Action Cards

<ActionCard
  title="Get Started"
  description="Begin building your documentation site with our comprehensive components"
  action={{
    label: "View Documentation",
    href: "/quick-start",
    icon: "📚"
  }}
/>

### Steps

<Step number={1} title="Install Dependencies">
Run the following command to install all required dependencies:

```bash
bun install
```
</Step>

<Step number={2} title="Configure Components">
Import the markdown components in your layout file:

```tsx
import markdownComponents from './components/markdown';
```
</Step>

<Step number={3} title="Start Development">
Start the development server:

```bash
bun run dev
```
</Step>

## Alerts

<Alert>
<AlertTitle>Information</AlertTitle>
This is a standard alert component with title and description.
</Alert>

<Alert variant="destructive">
<AlertTitle>Error</AlertTitle>
Something went wrong. Please check your configuration and try again.
</Alert>

## Info Cards

<InfoCard title="Did you know?">
This info card provides additional context or helpful tips to your readers.
</InfoCard>

<WarningCard title="Important">
Always backup your data before making major changes.
</WarningCard>

<ErrorCard title="Caution">
This action cannot be undone. Please proceed with caution.
</ErrorCard>

<SuccessCard title="Great job!">
You've successfully completed the setup process.
</SuccessCard>

## Badges

Here are some inline badges: <Badge>Default</Badge> <Badge variant="secondary">Secondary</Badge> <Badge variant="outline">Outline</Badge> <Badge variant="destructive">Destructive</Badge>

## Horizontal Rule

---

This content appears after a horizontal rule separator.

## Conclusion

These components provide a comprehensive set of tools for creating rich, interactive documentation with beautiful styling powered by TailwindCSS and shadcn/ui components.
