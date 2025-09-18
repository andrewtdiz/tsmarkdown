## Syntax Highlighting Fixes (TestExample.bmdx) ✅ COMPLETED
- [x] Extend `#mdx_return_content` fallback so plain Markdown lines (including indented ones) emit `text.html.markdown` instead of falling back to TSX.
- [x] Normalize the `{{` interpolation rule so both braces share the same `punctuation.definition.interpolation.*` scope (fixes mixed colors) and re-run scope capture tests.
- [x] Audit ternary handling in `#expressions` to keep TS scope active until the closing `}`; add a fixture to stop Markdown italics leaking into the conditional branches.
- [x] Embed `source.ts` (or `source.tsx` where needed) inside `{{ ... }}` and `{ ... }` islands so variables like `userName` and `items` highlight as TypeScript identifiers in `TestExample.bmdx`.
- [x] Add a scope regression test for `bmdx/TestExample.bmdx` that asserts raw text, interpolations, and ternaries tokenize per the PRD.

## Summary of Changes Made

### Grammar Improvements (`better-mdx-simple.yaml`)
1. **Extended fallback patterns**: Added `#mdx_inline` to `mdx_return_content` patterns to ensure plain Markdown text is properly scoped as `text.html.markdown`
2. **Normalized interpolation**: Updated `{{ }}` patterns to use consistent `punctuation.definition.interpolation.*` scopes
3. **Enhanced TypeScript integration**: Changed all `source.ts` references to `source.tsx` for better JSX/TSX support
4. **Improved ternary handling**: Added `#mdx_ternary_expression` pattern to properly handle ternary operators while keeping TypeScript scope active
5. **Better JSX attribute handling**: Enhanced `jsx_attributes` pattern to properly handle TypeScript expressions in attribute values

### Test Infrastructure
- Created `test-syntax-highlighting.ts` to validate expected highlighting behaviors
- Verified all key syntax highlighting requirements from the PRD are addressed
