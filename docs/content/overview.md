---
title: What is TS Markdown?
description: 
date: 2024-01-15
author: TypeScript Markdown Team
tags: [overview, introduction, typescript, markdown, beginner]
---

TS Markdown is a file format and runtime for writing type-safe, component-based markdown.

Instead of writing messy string concatenation or template literals, write **Reusable**, **type-safe** React-style markdown components.

The output is clean Markdown, but writing it feels like JSX.

### Example:

```typescript
function UserProfile({ user }: UserProfileProps) {
  const { name, role, yearsOfExperience, skills } = user;

  return (
    # {{ name }}'s Profile

    **Role:** {{ role }}
    **Experience:** {{ yearsOfExperience }} years

    **Top Skills:**
    {{ skills.map(skill => (
      - {{skill}}
    ))}}
  )
}
```

### Generated markdown:

```md
# Alice's Profile

**Role:** Senior Developer
**Experience:** 8 years

**Top Skills:**
- React
- Typescript
- Bun
```

Since there's no render cycle, components are just pure functions.

TS Markdown also includes a complete toolkit with a component parser, type system, runtime engine, and Markdown generator, all designed to make your development experience faster, and more intuitive than dealing with strings.

Get started with one of the quick links below, or read on to learn more about TS Markdown.

**Quick Start:**
- [Install TypeScript Markdown](installation)
- [Create your first component](quick-start)
- [Use a project template](first-tsm)
- [Build dynamic content](component-examples)
- [Structure complex documents](frontmatter-examples)
