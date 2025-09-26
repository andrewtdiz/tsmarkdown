Here’s an internal spec for the **TypeScript-Markdown (TSM) → TypeScript** transpiler that compiles the sample syntax into plain TypeScript producing markdown strings (or streamable chunks).

# 1) Scope & Goals

* **Input:** `.tsm.ts` (or `.tsm`) files containing standard TypeScript plus **TSM blocks**: multi-line markdown returns, `{{ ... }}` inline expressions, component tags `<@Comp .../>`, lightweight XML wrappers, and markdown-first ergonomics.
* **Output:** Valid `.ts` that:

  * Preserves author TypeScript (imports, async/await, control flow).
  * Converts TSM blocks into runtime calls that produce markdown (`string` or `Iterable<string>`).
  * Emits zero output for falsy nodes and handles the “remove previous empty line” escape.
* **Non-Goals (v1):** Full JSX compatibility, SSR/DOM output. (TSM targets markdown strings only.)
* **Future:** Optional streaming renderer; component children; editor sourcemaps.

# 2) High-Level Design

TSM introduces **embedded render expressions** inside TypeScript with a simple, explicit rendering model:

## 2.1 Mental Model (Simple & Explicit)

* You render **an array of Chunks** that are either:
  * `string` — no implicit newlines
  * `__tsm` blocks — conceptually a list of lines; has **exactly one trailing newline at the block boundary**
* Interpolations `{{ … }}` return TS expressions, that can also be `__tsm` blocks
* The **placement** of an interpolation is determined by where its `{{` starts:
  * **Inline context**: there is non-whitespace before `{{` on the same line
  * **Block context**: `{{` is the first non-whitespace character on the line

> Rule of thumb: "where you open it is where it renders."

## 2.2 Block Detection

* Treat `return (\n … )` as a **TS Markdown region** **if** the `(` is followed by a newline before any non-whitespace content. That's your reliable lexer hint (similar to JSX blocks)
* Inside that region:
  * Plain text → `__tsm` block (split into lines)
  * `{{ expr }}` → evaluate `expr` (TypeScript AST), then coerce per rules below
* **Validity**: expressions inside `{{ … }}` must be valid TS; fail the build on parse/type errors

## 2.3 Inline vs Block Context

**Decision:** The **opening position wins**.

* If `{{ … }}` opens inline on a block → its result is **inserted inline**
* If `{{ … }}` opens at line start (block context) → its result is **inserted as a block** starting at that line

## 2.4 Expression Coercion Rules

* `undefined | false` → no line emitted
* `null` → no line and remove line above
* **Block context** → **no chunk** (no line emitted)
* `true` → same as empty string (rare; discourage)
* `number` → render as string
* `string` → render as string
* `(\n .. )` → render with `__tsm()`
* `Array<T>` → **map, then join based on context**

## 2.5 Newline Semantics & Double-Newline Avoidance

* **`__tsm` block has exactly one trailing newline at its boundary**
* **Boundary coalescing rule:** When inserting a `__tsm` block into a **Block context**:
  * if the previous character **before** the insertion point is **already a newline**, do **not** add another
  * otherwise, insert the `__tsm` block's single trailing newline
* **Interior content** of a `__tsm` block (including intentional leading/trailing empty lines *inside* the block payload) is preserved verbatim. Only the **outer boundary** uses the coalescing rule

## 2.6 Arrays & List Rendering

**Decision:** Array join depends on the **context** where the array interpolation begins.

* **Inline context:** join with `""` (concatenate inline)
* **Block context:** join with `"\n"` (each item becomes its own line boundary)

## 2.7 Indentation & Trimming

* Compute a **baseline indent** for each TS Markdown region from the column of the opening `(` line + 1
* For every **logical line** inside the region:
  * Strip up to **baseline indent** worth of leading spaces/tabs
  * **Preserve** any extra spaces beyond that (developer intent)
* **Do not** trim interior empty lines. Leading/trailing **interior** blank lines typed by the author are preserved
* When an interpolation appears in **block context**, ignore ambient indentation on that line (because the block will render its own lines)

## 2.8 Component Tags & XML

* **Component tags:** `<@Dashboard .../>` map to imported component function calls
* **XML wrappers:** `<content>…</content>` are treated as raw strings, should not be parsed
* **One-line returns:** `return "**API Error**"` is a block with a single lin

# 3) File Processing Pipeline

1. **Lex → Parse (TSM Layer)**

   * Tokenize TypeScript normally using a tolerant TS parser (ts-morph / TypeScript compiler API).
   * Within function bodies, detect **TSM Block Expressions**: `return "  "` where the parenthesized form contains **TSM tokens** (e.g., `{{`, `<@`).
   * Parse inner TSM with a custom markdown-aware grammar (below) into a **TSM AST**.
2. **Transform**

   * Replace each TSM block with a call to runtime helpers, emitting TypeScript nodes.
3. **Emit**

   * Print final TypeScript and add `import { __tsm, __tsmJoin, __erasePrevLine } from "tsm-runtime"` (tree-shaken).

# 4) Grammar (TSM Inner Blocks)

```
Block        := "(" WS? Lines WS? ")"
Lines        := (Line (NL Line)*)?
Line         := (TextChunk | Interp | Component | XmlGroup)*
Interp       := "{{" WS? Expr WS? "}}"
Component    := "<@" Ident Attrs? ("/>" | ">" Lines "</@" Ident ">")
TextChunk    := any UTF-8 run excluding "{{", "<@", NL
Attrs        := (WS Attr)*
Attr         := Ident "=" (StringLiteral | "{"+ Expr +"}")
Expr         := valid TypeScript expression (balanced braces)
WS           := /[ \t]+/
NL           := "\n" | "\r\n"
Ident        := /[A-Za-z_][A-Za-z0-9_]*/
```

Notes:

* `Component` names prefixed by `@` are **TSM Components**; they compile to function calls.
* `Xml` strings (e.g., `<content>`).
* Single-line returns are the same grammar (Block with one Line).

# 5) Semantics & Codegen

## 5.1 Runtime Primitives

Provide a tiny runtime (tree-shakable):

```ts
type Chunk = string | null | undefined | false | Iterable<string>;
export function __tsm(chunks: Array<Chunk>): string;                 // join + normalize
export function __tsmJoin(parts: Array<Chunk>): Array<Chunk>;        // flatten helper
export function __erasePrevLine(buf: string[]): void;                // pop empty line
```

* `__tsm` flattens `chunks`, drops falsy, normalizes newlines, compacts whitespace rules.
* Iterable support enables **streaming** in v2 (generator components).

## 5.2 Text Emission

* `TextChunk` → string literal as emitted.
* Preserve indentation and empty lines exactly as authored **except** where compaction rules apply (below).

## 5.3 Interpolations `{{ expr }}`

* Compile as `(__expr__)` value pushed to chunks based on context:
* **Inline context**: falsy → nothing inserted; no spaces added
* **Block context**: falsy → no chunk; **no** blank line added
* **Strings** appended as-is
* **Numbers/booleans** → `String(value)`
* **Objects**: call `.toString()`; if `[object Object]`, throw compile-time warning `TSM001`
* **Arrays**: join based on context (inline: `""`, block: `"\n"`)

## 5.4 Conditional Rendering

* `{{ cond ? (Block) : (Block) }}` → evaluate `cond`; render chosen block
* `{{ cond && (Block) }}` / `{{ !cond && (Block) }}` → render block iff truthy
* Blocks inside interpolations are parsed recursively as **nested TSM Blocks** and compiled to arrays of chunks
* **Context preservation**: conditional blocks inherit the context (inline vs block) from where the `{{` opens

## 5.5 Line-Erase Escape: `{{ null }}`

* At codegen, emit sentinel `__ERASE_PREV_LINE`.
* In `__tsm`, when encountered, call `__erasePrevLine(buf)` which:

  * If the **last emitted entry** is exactly a newline or an empty line (whitespace only), remove it.
  * If not empty, no-op.
* This matches: “returning null removes the previously rendered line (if empty).”

## 5.6 Falsy on Line Boundaries

> "Falsy values don't take up space on the line."

Implementation:

* **Inline context**: falsy → nothing inserted; no spaces added
* **Block context**: falsy → no chunk; **no** blank line added
* When an interpolation is between textual neighbors separated only by indentation/spacing, and it resolves falsy, **do not emit those spaces**. This is handled by emitting the interpolation as a **zero-width chunk** rather than `" "` + value + `" "`; surrounding literal spaces remain only if non-leading/non-trailing.

## 5.7 Comments Inside Blocks

* Lines beginning with `//` **inside a TSM Block** are treated as **authoring comments** and are **not emitted**.
* We still include their trailing newline to preserve visual separation unless the next token erases it with `{{ null }}`.
* Rationale: matches sample where `// Multi-line markdown` is not output.

## 5.8 Components `<@Dashboard .../>`

* **Zero-arg self-closing**: `<@Dashboard/>` → `Dashboard()`; expected return: `Chunk | Promise<Chunk> | Iterable<string>`.
* **Props**: `<@Comp a="x" b={expr}/>` → `Comp({ a: "x", b: expr })`.
* **Children** (v2): `<@Comp> … </@Comp>` → `Comp({ children: __tsm([...]) })`.
* Async components supported; `__tsm` `await`s Promises (transpiler wraps block in `await Promise.all` then concatenates).

## 5.9 XML Groups `<content>...</content>`

* Compile to just raw strings. They exist to group/indent author content.

## 5.10 One-Line Block Returns

* `return (**API Error**)` → `return __tsm(["**API Error**\n"]);`
* A trailing newline is added if the author placed one; otherwise omit.

## 5.11 Indentation & Empty Lines

* Compute a **baseline indent** for each TS Markdown region from the column of the opening `(` line + 1
* For every **logical line** inside the region:
  * Strip up to **baseline indent** worth of leading spaces/tabs
  * **Preserve** any extra spaces beyond that (developer intent)
* **Do not** trim interior empty lines. Leading/trailing **interior** blank lines typed by the author are preserved
* When nested blocks render, inner lines inherit their own indentation (not auto-reindented)
* When an interpolation appears in **block context**, ignore ambient indentation on that line (because the block will render its own lines)

## 5.12 Streaming (forward-compatible)

* When any child yields `Iterable<string>`, `__tsm` can return a `string` (default) or, under a compiler flag `stream: true`, return an `AsyncIterable<string>`.
* v1: always returns `string`. Keep interfaces ready.

# 6) Transformation Examples

## 6.1 Worked Examples (Context-Based Rendering)

**Inline Context Example:**

```ts
# Test{{ isEitherVisible && `: ${isVisible ? "Visible" : "Not Visible"}` }}
```

* Interp opens **inline** → result is inline. If falsy, nothing extra (no stray space)
* If truthy and `isVisible` → `: Visible` appended

**Block Context Example:**

```ts
{{ isEitherVisible ? (
  # Test: {{ isVisible ? "Visible" : (
    # Test: Not Visible {{ someData }}
  ) }}
) : (
  # Test
)}}
```

* Interp opens at line start → **block context**
* Each inner block returns `__tsm` block; boundaries coalesce so you don't get double newlines between nested returns

**Conditional Block Example:**

```ts
{{isVisible && (
  This should be visible.
)}}
{{notVisible && (
  This should NOT be visible.
)}}
```

* First renders a `__tsm` block, with one trailing newline
* Second is falsy in block context → renders nothing (no blank line)

**Array Map Case:**

```ts
{{ items.map(s => `- ${s}`) }}
```

* Opens at line start → block context → joined with `"\n"`, giving a clean list
* Prefer: `{{ md.list(items) }}` for correctness with complex items

## 6.2 Renderer Core (High Level)

1. Determine **context** at each `{{…}}` by scanning the source line up to `{{`
2. **Inline context**: insert text into current line
3. **Block context**: end current line (if not empty), insert `__tsm` block with **boundary coalescing**
4. At region end, emit one final newline (already guaranteed by the top `__tsm` block)

# 7) Error Handling & Diagnostics

* **TSM001** Non-stringifiable object interpolation (suggest `.toString()`).
* **TSM002** Unbalanced `{{ ... }}` or unmatched `</...>` tag.
* **TSM003** Component not imported: `<@X/>` without `X` import.
* **TSM004** Async in sync context (if function not `async` but a child returns Promise).
* **TSM005** Expression parse failure inside `{{ }}` (surface TS parser message + span).
* All diagnostics carry **file/line/column** and a quick-fix when possible.

# 8) Whitespace Rules (Deterministic)

* Literal text is emitted as written.
* Interpolation that is falsy does not emit text **and** does not force spaces before/after.
* `__erasePrevLine` only removes the **most recent trailing blank line** (including spaces/tabs).
* Trailing newline at the end of a block is preserved only if authored.

# 9) Type Signatures

* Component functions should type as:

  ```ts
  type TSMNode = string | null | false | undefined | Promise<string | null | false | undefined> | Iterable<string> /* future */;
  type TSMComponent<P = {}> = (props?: P) => TSMNode | Promise<TSMNode>;
  ```
* Transpiled functions return `string | false | Promise<string | false>`; `false` signifies “render nothing”.

# 10) Tooling Integration

* **Editor:** TSM language mode highlighting:

  * Markdown tokens (headings, lists, emphasis).
  * `{{ ... }}` expressions as TS.
  * `<@Comp/>` as components.
* **Types:** `.d.ts` for runtime helpers to keep TS happy.
* **Source Maps:** Map TSM block spans to generated arrays for stack traces and diagnostics.

# 11) Testing Matrix

## 11.1 Core Test Cases to Lock Behavior

1. **Inline falsy doesn't add spaces**
   * `X {{false && "Y"}} Z` → `X  Z` (two spaces become one visually; no extra chars)

2. **Block falsy doesn't add blank line**
   * `{{ false && "Hi" }}` → *(nothing)*

3. **No double newline at joins**
   * `# A\n{{ "# B" }}\n# C` → exactly one blank line between each heading if intended

4. **Array in inline vs block**
   * `X {{[1,2,3]}}` → `X 123`

5. **Indent preservation beyond baseline**
   * A line starting with two more spaces than baseline keeps those two spaces

6. **Leading/trailing interior blank lines preserved**
   * `(\n\n\nHello\n\n\n)` inside block context preserves the two empty lines inside the block

## 11.2 Additional Test Categories

* **Happy paths:** ternary, `&&`/`!` conditionals, nested blocks, components, async data
* **Whitespace:** leading/trailing spaces, blank lines, `{{ null }}` behavior
* **Errors:** unmatched tags, missing imports, non-string objects, Promise in sync fn
* **Golden tests:** input `.tsm` → expected `.ts` snapshot; render outputs

# 12) Performance Notes

* Single pass TSM parse per block; reuse the TS AST for host code
* Chunk arrays are flat; `__tsm` avoids quadratic concatenation (join once)
* Async awaits batched with `Promise.all` when multiple component calls exist

# 13) Key Implementation Decisions (TL;DR)

* **Opening position determines inline vs block** - where you open `{{` is where it renders
* **Falsy in block context renders nothing** (no blank line)
* **`__tsm` blocks have exactly one trailing boundary newline**; coalesce to avoid doubles
* **Arrays join inline with `""`, block with `"\n"`**
* **Flatten indentation to baseline**, preserve interior empties and extra spaces
* **Boundary coalescing rule** prevents double newlines when inserting `__tsm` blocks
* **Context-based coercion** ensures predictable behavior for all expression types

