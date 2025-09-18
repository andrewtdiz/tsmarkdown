# Debug Directory

This directory contains debug scripts organized by feature areas to help with development and troubleshooting of the Better MDX compiler.

## Directory Structure

### `pipeline/`
Core compilation pipeline debugging:
- `debug-parser.ts` - Parser functionality
- `debug-main-pipeline.ts` - Main compilation pipeline
- `debug-full-pipeline.ts` - Complete pipeline execution
- `debug-test-output.ts` - Test output debugging

### `templates/`
Template processing and placeholder resolution:
- `debug-template-processing.ts` - Template processing logic
- `debug-placeholder-resolution.ts` - Placeholder resolution

### `expressions/jsx/`
JSX element parsing and processing:
- `debug-simple-jsx.ts` - Basic JSX parsing
- `debug-jsx-element.ts` - JSX element handling
- `debug-jsx-element-processing.ts` - JSX element processing
- `debug-full-jsx-parsing.ts` - Complete JSX parsing
- `debug-jsx-detection.ts` - JSX detection logic

### `expressions/evaluation/`
Expression evaluation and processing:
- `debug-jsx-expression.ts` - JSX expression handling
- `debug-jsx-expression-processing.ts` - JSX expression processing
- `debug-jsx-expression-evaluation.ts` - JSX expression evaluation
- `debug-ternary-jsx-evaluation.ts` - Ternary expression evaluation

### `collections/lists/`
List rendering and execution:
- `debug-list.ts` - List functionality
- `debug-list-execution.ts` - List execution
- `debug-list-rendering.ts` - List rendering
- `debug-direct-list-test.ts` - Direct list testing

### `collections/maps/`
Map expression handling:
- `debug-map-expression-detection.ts` - Map expression detection
- `debug-map-expression-direct.ts` - Direct map expression testing
- `debug-map-context.ts` - Map context handling
- `debug-map-evaluation.ts` - Map evaluation

### `control-flow/`
Control flow and conditional logic:
- `debug-simple-nested.ts` - Simple nested structures
- `debug-ternary-evaluation.ts` - Ternary evaluation
- `debug-conditional-spacing-issue.ts` - Conditional spacing issues
- `debug-conditional-spacing.ts` - Conditional spacing

### `components/`
Component loading and registry:
- `debug-component-loading.ts` - Component loading
- `debug-component-registry.ts` - Component registry
- `debug-resolve-path.ts` - Path resolution
- `debug-component-spacing.ts` - Component spacing

### `markdown/`
Markdown feature debugging:
- `debug-blockquote-whitespace.ts` - Blockquote whitespace handling
- `debug-task-lists.ts` - Task list functionality
- `debug-code-blocks.ts` - Code block handling
- `debug-indentation.ts` - Indentation handling

### `typescript/`
TypeScript transpilation:
- `debug-typescript-transpilation.ts` - TypeScript transpilation

## Shared Setup

All debug scripts are designed to run with the Bun runtime. Common fixture paths include:
- `List.mdx` and related fixtures for list testing
- Various `.mdx` files in the `bmdx/` and `mdx/` directories

## Usage

Run any debug script using Bun:
```bash
bun run src/debug/[category]/debug-[feature].ts
```

## Notes

- Scripts are organized by feature area for easier navigation during debugging
- Consider extracting shared helpers for repeatedly used fixtures and setup code
- Update relative imports when moving files between categories
