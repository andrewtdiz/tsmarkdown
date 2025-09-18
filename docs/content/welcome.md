---
title: Welcome to Markdoc
description: A sample Markdoc document demonstrating integration with shadcn Bun starter template
date: 2024-01-15
author: Markdoc Team
tags: [markdoc, bun, react, shadcn]
---

# Welcome to Markdoc

This is a sample Markdoc document that demonstrates the integration with your shadcn Bun starter template.

## Page Metadata

This page has frontmatter! Here are some details:

- **Title**: {% $frontmatter.title %}
- **Description**: {% $frontmatter.description %}
- **Date**: {% $frontmatter.date %}
- **Author**: {% $frontmatter.author %}
- **Tags**: {% $frontmatter.tags %}

## Features

Here are some of the features you can use:

{% callout type="note" %}
This is a note callout that provides helpful information to users.
{% /callout %}

{% callout type="check" %}
This is a success callout that indicates something worked correctly.
{% /callout %}

{% callout type="warning" %}
This is a warning callout that alerts users to potential issues.
{% /callout %}

{% callout type="error" %}
This is an error callout that highlights problems or failures.
{% /callout %}

## Getting Started

To get started with Markdoc in your project:

1. Create your content in `.md` files
2. Use Markdoc tags like `{% callout %}` for rich components
3. The server will parse and transform your content
4. React will render the final output

## Code Examples

You can also include code blocks:

```javascript
const example = "This is a code example";
console.log(example);
```

And inline code like `const variable = "value"`.

## Next Steps

- Add more custom components to your schema
- Create additional content pages
- Customize the styling to match your brand
