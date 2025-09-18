**Debug Directory Reorganization Proposal**

Organize the debug helpers by the feature areas they exercise so related scripts live together and are easier to find while debugging a specific capability.

**pipeline/**
- `debug-parser.ts`
- `debug-main-pipeline.ts`
- `debug-full-pipeline.ts`

**templates/**
- `debug-template-processing.ts`
- `debug-placeholder-resolution.ts`

**expressions/jsx/**
- `debug-simple-jsx.ts`
- `debug-jsx-element.ts`
- `debug-jsx-element-processing.ts`
- `debug-full-jsx-parsing.ts`
- `debug-jsx-detection.ts`

**expressions/evaluation/**
- `debug-jsx-expression.ts`
- `debug-jsx-expression-processing.ts`
- `debug-jsx-expression-evaluation.ts`
- `debug-ternary-jsx-evaluation.ts`

**collections/lists/**
- `debug-list.ts`
- `debug-list-execution.ts`
- `debug-list-rendering.ts`
- `debug-direct-list-test.ts`

**collections/maps/**
- `debug-map-expression-detection.ts`
- `debug-map-expression-direct.ts`
- `debug-map-context.ts`
- `debug-map-evaluation.ts`

**control-flow/**
- `debug-simple-nested.ts`
- `debug-ternary-evaluation.ts`

**components/**
- `debug-component-loading.ts`
- `debug-component-registry.ts`
- `debug-resolve-path.ts`

**markdown/**
- `debug-blockquote-whitespace.ts`
- `debug-task-lists.ts`

**typescript/**
- `debug-typescript-transpilation.ts`

Follow-ups
- Add a short `README.md` in `src/debug/` describing the categories and shared setup (Bun runtime, fixture paths).
- Update relative imports once the files move, and consider extracting shared helpers for repeatedly loading `List.mdx` and related fixtures.
