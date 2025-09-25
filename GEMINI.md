# Project Overview

This project is a type-safe, component-based markdown engine for TypeScript called "TS Markdown". It allows developers to create dynamic, template-driven markdown with full TypeScript support.

The project includes:
- A compiler that transpiles `.tsmd` files into TypeScript.
- A command-line interface (CLI) to watch for file changes and automatically transpile them.
- A testing utility for running tests on `.tsmd` files.
- A VS Code extension for syntax highlighting and IntelliSense.

## Building and Running

The project uses `bun` for package management and running scripts.

- **Build:** `bun run build`
  - This command transpiles the TypeScript source code into JavaScript and outputs it to the `dist` directory.

- **Run in Development:** `bun run dev`
  - This command watches for changes in the source code and automatically rebuilds the project.

- **Run Tests:** `bun test`
  - This command runs the test suite for the project.

- **Run the CLI:** `bun run tsmarkdown`
  - This command runs the TS Markdown CLI, which watches for changes in `.tsmd` files and transpiles them to TypeScript. By default, it watches the `/tsmd` directory.

## Development Conventions

- **Testing:** The project uses `bun:test` for testing. Tests are located in the `test` directory and are organized by feature. The testing setup includes a custom test runner for `.tsmd` files, which allows for asserting on the exact output of the transpiled markdown.
- **Linting:** The project uses the TypeScript compiler for linting (`bun run lint`).
- **File Structure:**
  - `src`: Contains the main source code for the library.
    - `compiler`: The TSMD compiler.
    - `parser`: The TSMD parser.
    - `renderer`: The TSMD renderer.
    - `runtime`: The TSMD runtime.
    - `utils`: Utility functions.
  - `bin`: Contains the source code for the CLI.
  - `test`: Contains the tests for the project.
