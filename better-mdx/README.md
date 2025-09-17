# Better MDX

A TypeScript-first, React-compatible markdown language that enables fast, iterative development of dynamic content. Better MDX combines the expressiveness of Markdown with the power of TypeScript and React.

## Features

- **Syntax Highlighting**: Full syntax highlighting support for Better MDX files
- **TypeScript Integration**: Full TypeScript support with compile-time error checking
- **React Components**: Seamless integration with React components and JSX
- **String Interpolation**: Use `{{ }}` for simple variable interpolation
- **JavaScript Expressions**: Use `{ }` for complex JavaScript expressions
- **Async Support**: Built-in support for asynchronous content generation

## Syntax

Better MDX uses two distinct syntax patterns:

- **`{{ }}` - String Interpolation**: For simple variable interpolation within markdown text
- **`{ }` - JavaScript Expressions**: For complex JavaScript expressions that return JSX/React elements

### Example

```mdx
function Welcome({ userName, score }: { userName: string; score: number }) {
  return (
    # Welcome {{ userName }}!
    
    Your score is {{ score }}.
    
    {score > 80 ? (
      🎉 **Congratulations!** You achieved a high score!
    ) : (
      Keep trying to reach 80+ points.
    )}
  )
}
```

## Requirements

- VS Code 1.104.0 or higher
- TypeScript knowledge (recommended)

## Extension Settings

This extension contributes the following settings:

* `better-mdx.enable`: Enable/disable Better MDX syntax highlighting
* `better-mdx.typescript`: Enable TypeScript integration features

## Known Issues

- Some complex JSX patterns may not highlight perfectly
- TypeScript type checking requires additional tooling

## Release Notes

### 0.0.1

Initial release of Better MDX syntax highlighting extension.

---

**Enjoy writing dynamic, type-safe content with Better MDX!**
