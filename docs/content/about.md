---
title: About This Project
description: Learn about the Markdoc + Bun + React + shadcn/ui integration
date: 2024-01-15
version: 1.0.0
features: [markdoc, bun, react, shadcn]
---

# About This Project

This project demonstrates how to integrate Markdoc with a Bun + React + shadcn/ui stack.

## Project Info

- **Version**: {% $frontmatter.version %}
- **Last Updated**: {% $frontmatter.date %}
- **Key Features**: {% $frontmatter.features %}

## Architecture

The integration includes:

- **Bun Server**: Handles Markdoc parsing and transformation
- **React Client**: Renders the transformed content
- **shadcn/ui Components**: Provides beautiful, accessible UI components
- **Markdoc Schema**: Defines custom tags and their behavior

## Benefits

{% callout type="check" %}
**Developer Experience**: Markdoc provides a great authoring experience with custom components
{% /callout %}

{% callout type="check" %}
**Performance**: Bun's fast runtime ensures quick parsing and transformation
{% /callout %}

{% callout type="check" %}
**Design System**: shadcn/ui components ensure consistent, accessible design
{% /callout %}

## Customization

You can easily extend this setup by:

1. Adding new schema files in the `schema/` directory
2. Creating corresponding React components
3. Updating the server configuration to include new tags
4. Adding the components to the client-side renderer
