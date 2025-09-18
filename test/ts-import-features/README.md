# TypeScript and External Asset Import Tests

This directory contains comprehensive TDD tests for the TypeScript and external asset import features as specified in the `IMPORT_TS_PRD.md`.

## Test Structure

The tests are organized into the following categories and use proper Better-MDX syntax:

### Module Resolution Tests
- **relative-ts-import.mdx**: Tests relative TypeScript imports with explicit extensions
- **relative-no-extension.mdx**: Tests extension inference with default search order
- **alias-import.mdx**: Tests alias map resolution before Node fallback
- **extension-inference-warning.mdx**: Tests warning when extension inference is required
- **prohibited-mdx-import.mdx**: Tests prohibition of direct MDX file imports

### TypeScript Module Handling Tests
- **type-only-imports.mdx**: Tests stripping of type-only imports before execution
- **async-export.mdx**: Tests awaiting async exports during render
- **comprehensive-imports.mdx**: Tests default, named, and namespace imports

### Asset Support Tests
- **json-import.mdx**: Tests JSON file imports as default export
- **raw-text-import.mdx**: Tests text/markdown imports with ?raw suffix
- **mixed-imports.mdx**: Tests mixed import types in single MDX file

### Enhanced Dependency Tracking Tests
- **aliased-imports.mdx**: Tests preservation of alias names in imports
- **side-effect-import.mdx**: Tests side-effect-only import handling

### Error Handling Tests
- **prohibited-mdx-import.mdx**: Tests error for prohibited MDX imports
- **unsupported-extension.mdx**: Tests error for unsupported file extensions
- **global-css-import.mdx**: Tests error for global CSS imports

### Developer Ergonomics Tests
- **browser-api-warning.mdx**: Tests warning for browser API dependencies
- **cli-extension-warning.mdx**: Tests CLI warnings for unsupported extensions
- **missing-raw-suffix.mdx**: Tests lint warnings for missing ?raw suffix

## Fixture Files

The `fixtures/` directory contains supporting files used by the tests:

- **TypeScript files**: `.ts`, `.tsx` files with various export patterns
- **Asset files**: `.json`, `.md`, `.css` files for asset import testing
- **Utility files**: Helper modules for testing different import scenarios

## MDX Syntax

All MDX fixture files use proper Better-MDX syntax:

```mdx
import { helper } from './fixtures/helper.ts';

function TestComponent() {
  const result = helper('test');
  
  return (
    # Test Component
    
    Result: {{ result }}
  );
}
```

Key syntax elements:
- **Function structure**: Each MDX file contains a function that returns content
- **Template interpolation**: Uses `{{ expression }}` for dynamic content
- **Conditional rendering**: Uses `{condition && (content)}` syntax
- **Return statement**: Markdown content goes inside the return statement

## Implementation Notes

These tests are designed to be implemented by another LLM according to the specifications in `IMPORT_TS_PRD.md`. The tests cover:

1. **Module Resolution**: Relative paths, aliases, extension handling
2. **TypeScript Handling**: Type-only imports, async exports, diagnostics
3. **Asset Support**: JSON/YAML, text/markdown, CSS modules
4. **Dependency Tracking**: Enhanced metadata extraction
5. **Error Handling**: Proper diagnostics and source mapping
6. **Developer Experience**: Warnings, source maps, editor support

## Running Tests

```bash
bun test test/ts-import-features/
```

## Test Coverage

The tests provide comprehensive coverage of all requirements specified in the PRD:

- ✅ Module resolution with relative paths and aliases
- ✅ TypeScript module handling with type stripping and async support
- ✅ Non-MDX asset support (JSON, YAML, text, CSS modules)
- ✅ Enhanced dependency tracking with namespace and side-effect imports
- ✅ Error handling with proper source mapping
- ✅ Developer ergonomics with warnings and diagnostics
- ✅ Runtime contract validation
- ✅ CLI and linting integration

Each test case includes expected outputs and error conditions to ensure proper implementation validation.
