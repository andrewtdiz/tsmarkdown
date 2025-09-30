# Project Overview

This project is a type-safe, component-based markdown engine for TypeScript. It allows developers to create dynamic, template-driven markdown with full TypeScript support. The project includes a command-line interface (CLI) for transpiling `.tsmd` files into TypeScript files, as well as a library of functions for use in other projects.

## Building and Running

### Build

To build the project, run the following command:

```bash
bun run build
```

### Development

To run the project in development mode with file watching, use the following command:

```bash
bun run dev
```

## Development Conventions

The project is written in TypeScript and uses `bun` for package management. The code is organized into a `src` directory, which contains the core logic of the transpiler and a `test` directory, which contains the tests.

The transpiler works by parsing `.tsmd` files, which are a mix of markdown and TypeScript, and then generating corresponding TypeScript files. The parser is designed to handle template interpolations, conditional rendering, and component integration.

The project uses the `typescript` library to create an abstract syntax tree (AST) of the source code, which is then traversed to find and transpile the TSM blocks.
