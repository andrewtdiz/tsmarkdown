# TSMarkdown Newline Architecture Analysis

## Problem Statement

The tsmarkdown compiler has been incorrectly handling newlines, producing markdown output with too many blank lines. The root cause is a complex interaction between multiple parsing and code generation stages, each with different (and sometimes contradictory) approaches to handling whitespace and newlines.

## Architecture Overview

The compilation pipeline has these key stages:

1. **Block Extraction** (`src/compiler/block-finder.ts`)
   - Extracts raw content from `return (...)` blocks
   - Previously included leading/trailing empty lines
   - **FIXED**: Now trims leading/trailing empty lines

2. **AST Parsing** (`src/parser/interpolations.ts`)
   - Converts raw text into a TSM AST (blocks → lines → chunks)
   - Has a `stripBlockIndentation()` function for nested blocks (ternary/conditional)
   - **FIXED**: Now trims leading/trailing empty lines after stripping indentation
   
3. **Code Generation** (`src/compiler/ast-code-generator.ts`)
   - Walks the AST and generates `__tsm([...])` calls
   - Has its OWN `stripBlockIndentation()` function (duplicate logic!)
   - **FIXED**: Now uses `.join('\n')` instead of `.join('')` for map expressions

## Current Issues Identified

### Issue 1: Duplicate `stripBlockIndentation` Functions

There are TWO separate implementations:

**Location 1**: `src/parser/interpolations.ts` (lines 18-56)
- Used for: Ternary and conditional blocks during parsing
- Behavior: Strips indentation, then trims empty lines ✅

**Location 2**: `src/compiler/ast-code-generator.ts` (lines 348-386)
- Used for: Map blocks during code generation
- Behavior: Strips indentation, then trims empty lines ✅
- **Problem**: This is called AFTER parsing, on already-parsed content

### Issue 2: Map Expressions Take a Different Path

Looking at the terminal output:
```
parseInterpolationsToAST: "{{ items.map((item, index) => (\n  <@ListItem item={item} index={index} />\n\n))}}"
```

Notice the `\n\n` (double newline) at the end. This map expression:
1. Gets parsed by `parseInterpolationsToAST` as a single interpolation
2. The nested block content `"\n  <@ListItem item={item} index={index} />\n\n"` is NOT stripped during parsing
3. Instead, it's stored as the raw expression string
4. Later, during code generation, `ast-code-generator.ts` extracts it and calls ITS OWN `stripBlockIndentation`

But the terminal output shows `stripBlockIndentation` is only called for the ternary blocks, not for the map block!

### Issue 3: The Line-Splitting Logic

In `parseInterpolationsToAST`, lines 232-247:
```typescript
for (const chunk of chunks) {
    if (chunk.type === 'TSMTextChunk') {
        const lines = chunk.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].length > 0) {
                currentLine.push(createTSMTextChunk(lines[i]));
            }
            if (i < lines.length - 1) {
                pushLine();
            }
        }
    } else {
        currentLine.push(chunk);
    }
}
pushLine();
```

This logic:
- Splits text chunks on `\n`
- For each split segment, if it has length > 0, adds it to current line
- Pushes a line after each segment (except the last)
- Always pushes a final line

**Problem**: If text ends with `\n`, the split creates an empty string at the end, which doesn't get added (length === 0), but a line still gets pushed. This creates an extra empty line.

## Root Cause Summary

1. **Map expressions** are not going through `stripBlockIndentation` at parse time
2. The code generator's `stripBlockIndentation` is only used for `.map()` pattern matching
3. But the pattern in `ast-code-generator.ts` line 190: `/(.+)\.map\s*\((.+)\s*=>\s*\(([\s\S]+)\)\)/s` extracts the block content, which still has the extra newlines
4. The extracted content THEN gets passed to `stripBlockIndentation` in the code generator

## Why It's Confusing

The terminal output shows:
```
parseInterpolationsToAST: "{{ items.map((item, index) => (\n  <@ListItem item={item} index={index} />\n\n))}}"
```

But `stripBlockIndentation` is NOT called on this map content during parsing. It's only called later during code generation. However, the terminal doesn't show the code generation phase, so we don't see when/if it's being stripped.

## Recommended Solution

### Option A: Strip During Parsing (Preferred)

Detect `.map(() => (...))` patterns during parsing in `parseInterpolationsToAST` and strip their block content immediately:

1. Add map detection logic similar to ternary/conditional detection
2. Extract the map block content
3. Apply `stripBlockIndentation` 
4. Store the cleaned version in the AST

**Pros**:
- Single source of truth for whitespace handling
- AST accurately represents the cleaned content
- Code generator becomes simpler
- Easier to debug (all cleaning happens in one place)

**Cons**:
- More complex parsing logic
- Need to handle multiple expression types (map, ternary, conditional)

### Option B: Consolidate Stripping in Code Generator (Current Approach)

Keep the current architecture but ensure the code generator's `stripBlockIndentation` is actually being called:

1. Verify the regex pattern matches correctly
2. Ensure `stripBlockIndentation` is called before `parseContent`
3. Remove duplicate function from parser (only keep in code generator)

**Pros**:
- Separation of concerns (parser parses, generator cleans)
- Less parsing complexity

**Cons**:
- Two-pass processing (parse then clean)
- AST contains "dirty" data that needs cleaning
- Harder to debug (whitespace issues could be in parser OR generator)
- Duplicate function definitions

### Option C: Pre-process All Nested Blocks (Simplest)

Before parsing ANY nested block (ternary, conditional, map), strip it:

```typescript
function preprocessNestedBlock(content: string): string {
    return stripBlockIndentation(content);
}
```

Use this EVERYWHERE before calling `parseContent` on nested blocks.

**Pros**:
- Simple, uniform approach
- Single function, called consistently
- Easy to understand and maintain

**Cons**:
- Still requires detecting all nested block types
- Whitespace handling split between detection and preprocessing

## Recommended Fix: Option A (Enhanced)

1. **Create a unified nested block detector** in `interpolations.ts`:
   ```typescript
   function extractAndCleanNestedBlock(expression: string, startIndex: number): string {
       const endIndex = findMatchingParen(expression, startIndex);
       if (endIndex === -1) return '';
       
       const content = expression.substring(startIndex + 1, endIndex);
       return stripBlockIndentation(content);
   }
   ```

2. **Use it for ALL nested block types**:
   - Conditional: `&& (`
   - Ternary: `? (` and `: (`
   - Map: `.map(...) => (`

3. **Remove `stripBlockIndentation` from `ast-code-generator.ts`**:
   - The code generator should work with clean AST data
   - No need to re-clean already-cleaned content

4. **Keep the current `.join('\n')` fix** for map expressions

## Why This is Correct

- **Single responsibility**: Parser handles ALL whitespace normalization
- **Clean AST**: The AST represents the logical structure, not the formatted source
- **Simpler code generation**: Generator just walks the AST, no special cases
- **Easier debugging**: All whitespace issues trace back to one place
- **Future-proof**: Adding new nested block types only requires adding to the parser

## Implementation Priority

1. ✅ **DONE**: Fix `block-finder.ts` to trim extracted blocks
2. ✅ **DONE**: Fix `stripBlockIndentation` in parser to trim empty lines
3. ✅ **DONE**: Fix code generator to use `.join('\n')` for maps
4. ⚠️ **TODO**: Add map block detection to parser's nested block handling
5. ⚠️ **TODO**: Remove duplicate `stripBlockIndentation` from code generator
6. ⚠️ **TODO**: Verify all nested block types are handled consistently

