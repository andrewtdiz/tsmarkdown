---
title: Frontmatter Examples
description: Comprehensive examples of different frontmatter formats supported by Markdoc
date: 2024-01-15
author: Markdoc Documentation
version: 2.0.0
tags: [frontmatter, yaml, toml, json, graphql, markdoc]
published: true
---

# Frontmatter Examples

This document demonstrates how to use frontmatter in your Markdoc documents. Frontmatter allows you to apply page-level metadata to your documents.

## Page Information

Here's the frontmatter data for this page:

- **Title**: {% $frontmatter.title %}
- **Description**: {% $frontmatter.description %}
- **Date**: {% $frontmatter.date %}
- **Author**: {% $frontmatter.author %}
- **Version**: {% $frontmatter.version %}
- **Tags**: {% $frontmatter.tags %}
- **Published**: {% $frontmatter.published %}

## Supported Frontmatter Formats

Markdoc supports multiple frontmatter formats. Here are examples of each:

### YAML Format (Default)

```yaml
---
title: Authoring in Markdoc
description: Quickly author amazing content with Markdoc syntax
date: 2022-04-01
author: John Doe
tags: [markdoc, documentation, yaml]
---
```

### TOML Format

```toml
---
title       = "Authoring in Markdoc"
description = "Quickly author amazing content with Markdoc syntax"
date        = "2022-04-01"
author      = "John Doe"
tags        = ["markdoc", "documentation", "toml"]
---
```

### JSON Format

```json
---
{
  "title": "Authoring in Markdoc",
  "description": "Quickly author amazing content with Markdoc syntax",
  "date": "2022-04-01",
  "author": "John Doe",
  "tags": ["markdoc", "documentation", "json"]
}
---
```

### GraphQL Format

```graphql
---
{
  page {
    title
    description
    date
    author
    tags
  }
}
---
```

## Using Frontmatter in Templates

You can access frontmatter values in your Markdoc documents using the `{% $frontmatter.key %}` syntax:

{% callout type="note" %}
**Frontmatter Access**: Use `{% $frontmatter.title %}` to display the title, `{% $frontmatter.description %}` for description, and so on.
{% /callout %}

## Complex Frontmatter Data

Frontmatter can also contain complex data structures:

- **Arrays**: {% $frontmatter.tags %}
- **Objects**: You can store nested data like `author.name`, `author.email`
- **Booleans**: {% $frontmatter.published %}
- **Numbers**: {% $frontmatter.version %}

## Best Practices

{% callout type="check" %}
**Consistent Format**: Choose one frontmatter format and stick with it across your project
{% /callout %}

{% callout type="check" %}
**Meaningful Keys**: Use descriptive keys like `title`, `description`, `date` instead of `t`, `desc`, `d`
{% /callout %}

{% callout type="check" %}
**Validation**: Consider validating frontmatter data in your build process
{% /callout %}

## Implementation Details

This implementation uses the `js-yaml` library to parse frontmatter. The frontmatter is:

1. **Parsed** from the document content
2. **Stored** in the content manifest
3. **Made available** as variables in Markdoc configuration
4. **Accessible** in templates using `{% $frontmatter.key %}` syntax

The frontmatter parsing supports:
- YAML format (primary)
- TOML format
- JSON format
- Error handling for malformed frontmatter
