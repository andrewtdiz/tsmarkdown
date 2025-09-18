---
title: Test Markdoc React Rendering
description: Testing React component rendering with Markdoc
---

# Test Markdoc React Rendering

This is a test file to verify that Markdoc is properly rendering React components.

## Basic Elements

This is a **bold** paragraph with *italic* text and `inline code`.

### Blockquote

> This is a blockquote to test styling.

### Code Block

```typescript
const test = "Hello World";
console.log(test);
```

## Lists

- First item
- Second item
- Third item

1. First step
2. Second step
3. Third step

## Markdoc Callout Test

{% callout type="note" %}
This is a test callout using Markdoc syntax. It should render as a React component.
{% /callout %}

{% callout type="warning" %}
This is a warning callout with different styling.
{% /callout %}

{% callout type="check" %}
This is a success callout to verify the component mapping works.
{% /callout %}

## Table Test

| Component | Status | Description |
|-----------|--------|-------------|
| Callout | ✅ | Working |
| Headings | ✅ | Working |
| Lists | ✅ | Working |

## Conclusion

If you can see styled callouts above, then Markdoc React rendering is working correctly!
