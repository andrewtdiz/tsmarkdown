# PRD: Markdown-in-Return Highlighting for TS/TSX Functional Components

## 1) Overview

Enable writers (humans or LLMs) to author Markdown inside a functional component's return ( … ) while keeping TypeScript/TSX correctly highlighted wherever { … }, {{ … }}, or <JSX …/> appears. The experience should "feel like Markdown with TypeScript islands."

## 2) Goals & Non-goals

### Goals

- Treat raw text between return ( and the matching ) as Markdown.

- Inside that block:
  - { … } = TypeScript expression (ternaries, variables, function calls).
  - {{ … }} = TypeScript interpolation (double-curly, often used by templates).
  - <Component …/> and <div>… = JSX/TSX with attribute expressions highlighted as TS.

- Outside the return (…) block: normal TS/TSX.

- Work for single- and multi-line returns.

- Robust to whitespace, trailing );, and end-of-line comments.

### Non-goals

- Executing React lifecycle / runtime semantics.

- Full MDX runtime parsing; this is purely syntax highlighting/tokenization.

- Advanced JSX control flow/macros outside what TSX grammars already cover.

## 3) File Associations

- **Scope:** `source.better-mdx`
- **Extensions:** `.bettermdx`, `.bmdx`, or explicit language mode selection.
- **Fallback grammar:** `source.tsx` (never plain `source.ts`).

## 4) High-Level Tokenization Model

### Top-level precedence

1. **First:** `mdx_return_block` (multi-line return ( … closing ) on its own line).
2. **Second:** `mdx_return_inline_block` (single-line return ( … ) ;).
3. **Last:** `source.tsx` fallback.

### Inside a return block

- **Default scope:** `text.html.markdown` (block + inline Markdown).

- **Islands:**
  - `{{ … }}` → `source.ts` (interpolation).
  - `{ … }` → `source.ts` (expression).
  - `<Tag …> / </Tag> / <Tag …/>` → JSX/TSX element/attribute scopes, with `{expr}` attributes embedding `source.ts`.

### End-of-block detection

- Closing `)` must match the opening `(` of return.
- Allow optional `;` and trailing `//` comment.

## 5) UX Requirements (What end users see)

### 5.1 Outside the return block (standard TS/TSX)

Imports, function declarations, parameter/return types, const/let, operators, etc. → tokenized by the theme's TS/TSX grammar.

### 5.2 Inside return ( … ) (Markdown-first)

- **Headings:** `#`, `##`, … `######` → `markup.heading.*.markdown`
- **Bold:** `**text**` → `markup.bold.markdown`
- **Italic:** `*text*` → `markup.italic.markdown`
- **Lists:** `-`, `*`, `1.` → `markup.list.*.markdown`
- **Inline code:** `` `code` `` → `markup.inline.raw.string.markdown`
- **Fences:** triple backticks → `markup.fenced_code.block.markdown`
- **Links/images/tables/blockquote/hr** → standard Markdown scopes
- **Plain text** remains in `text.html.markdown`

#### Islands (embedded TS/TSX within Markdown)

**`{{ userName }}` and `{{ score }}`:**

- Braces → `punctuation.definition.interpolation.*`
- Identifiers/ops → `source.ts` scopes (`variable.other.readwrite.ts`, `keyword.operator.ts`, etc.)

**`{isHighScore ? ( … ) : ( … )}`:**

- Outer braces → `punctuation.definition.expression.*`
- Ternary tokens → `keyword.operator.ternary.ts` (theme dependent)
- Inner parentheses/content → stays Markdown until re-entered by braces/JSX.

**`<List items={items} />`:**

- Tag name → `entity.name.tag`
- Attributes → `entity.other.attribute-name`
- Attribute expression braces → `source.ts` for items.

### 5.3 Error Tolerance & Graceful Degradation

- If closing `)` isn't on a dedicated line, still support `);` with optional `//` trailing.
- If a Markdown fence isn't closed, keep content as code until the end of return block.
- If JSX is unclosed, rely on TSX fallback inside that JSX scope.

## 6) Detailed Example (expected scopes)

Using the provided file, highlights should appear as:

```typescript
import { List } from "./List";
^^^^^^ keyword.control.import
      ^ punctuation.section.block (TSX import braces)
...

return (
^^^^^^ keyword.control.return
^ punctuation.section.group.begin (the "(" line starts markdown block)

# Test MDX Component
^ markup.heading.marker
  ^^^^^^^^^^^^^^^^^^^ entity.name.section

## Another test component
^^ markup.heading.marker
   ^^^^^^^^^^^^^^^^^^^^^ entity.name.section

**Bolded**
^^ punctuation.definition.bold
  ^^^^^^ markup.bold
        ^^ punctuation.definition.bold

*italics*
^ punctuation.definition.italic
 ^^^^^^ markup.italic
        ^ punctuation.definition.italic

Welcome {{ userName }}! Your score is {{ score }}.
        ^^ punctuation.definition.interpolation.begin
           ^^^^^^^^^ variable.other (scoped in source.ts)
                     ^^ punctuation.definition.interpolation.end
                                    ^^ punctuation.definition.interpolation.begin
                                       ^^^^^ variable.other (source.ts)
                                            ^^ punctuation.definition.interpolation.end

{isHighScore ? (
^ punctuation.definition.expression.begin
 ^^^^^^^^^^^ variable.other.readwrite.ts
            ^ keyword.operator.ternary.ts
              ^ punctuation.section.group.begin  (paren of JSX/markdown island)

  🎉 **Congratulations!** You achieved a high score!
     ^^ punctuation.definition.bold
       ^^^^^^^^^^^^^^^ markup.bold
                      ^^ punctuation.definition.bold

) : (
^ punctuation.section.group.end
  ^ keyword.operator.ternary.ts
    ^ punctuation.section.group.begin

  Keep trying to reach 80+ points.
)

## Technologies Used
^^ markup.heading.marker
   ^^^^^^^^^^^^^^^^^^^ entity.name.section

<List items={items} />
^ punctuation.definition.tag.begin
 ^^^^ entity.name.tag
      ^^^^^ entity.other.attribute-name
            ^ punctuation.definition.expression.begin (attribute)
             ^^^^^ variable.other.readwrite.ts
                  ^ punctuation.definition.expression.end
                      ^^ punctuation.definition.tag.end (self-closing)

)
^ punctuation.section.group.end (closes return block)
```

> **Note:** Exact scope strings vary slightly by theme; the intent is clear precedence: Markdown by default, TS/TSX for brace/JSX islands.

## 7) Grammar/Engine Requirements

### 7.1 Ordering (critical)

```yaml
patterns:
  - include: '#mdx_return_block'
  - include: '#mdx_return_inline_block'   # optional but recommended
  - include: 'source.tsx'                 # fallback
```

### 7.2 Return block matchers

#### Multiline

```yaml
begin: ^\s*return\s*\(\s*$
end: ^\s*\)\s*;?\s*(?://.*)?$
contentName: text.html.markdown
patterns inside: #mdx_block, #mdx_inline
```

#### Inline (optional)

```yaml
begin: \breturn\s*\(
end: \)\s*;
# Same contentName & patterns
```

### 7.3 Inline rules included by #mdx_inline

- `#interpolation` → `{{ … }}` embeds `source.ts`
- `#expressions` → `{ … }` embeds `source.ts`
- `#jsx_elements` → tag + attributes; attribute `{ … }` embeds `source.ts`
- Plus standard inline Markdown: bold, italic, links, images, inline code, strikethrough, escapes

### 7.4 Fallback

Always use `source.tsx` for code outside the return block and for JSX unrecognized by Markdown rules.

## 8) Acceptance Criteria (QA checklist)

- [ ] Lines between `return (` and closing `)` render as Markdown by default.
- [ ] `{ … }` regions inside the block switch to TS highlighting.
- [ ] `{{ … }}` regions inside the block switch to TS highlighting.
- [ ] JSX tags inside the block are tokenized as JSX/TSX; `{expr}` attributes embed TS.
- [ ] The provided example renders headings/bold/italic exactly as Markdown.
- [ ] Works with `);` on the same closing line and with trailing `//` comment.
- [ ] Works if `return (# Title);` appears on one line (when inline rule is enabled).
- [ ] No regression for ordinary TS/TSX files without such returns.
- [ ] Performance: tokenization remains responsive on files up to ~5k lines.

## 9) Edge Cases to Cover

- Nested parentheses in TS expressions inside `{ … }` (e.g., function calls/ternaries).
- Backticked Markdown code fences spanning to end of block.
- JSX fragments `<> … </>`.
- Multiple return blocks in the same function (early returns).
- Empty returns: `return ( )` (should still be recognized).
- Unicode emoji and wide characters in Markdown.

## 10) Out of Scope / Future

- Real MDX semantics (imports/exports/ESM blocks embedded in Markdown).
- React server components / directives.
- Custom container syntax (e.g., `:::tip`) beyond standard Markdown.

## Summary

This PRD defines a Markdown-first editing experience inside a component's return ( … ) while preserving TypeScript/TSX islands via braces and JSX. Ordering and scoping ensure intuitive authoring for both humans and LLMs writing content-heavy components with light TS/TSX glue.