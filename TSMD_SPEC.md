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

TSM introduces **embedded render expressions** inside TypeScript:

* **Block Markdown Return:**

  ```ts
  return ( 
    # Header
    - Item
    {{ expr }}
  )
  ```

  becomes a call to a generated helper:
  `return __tsm_block`…\`\`(chunks, interpolations) → string\`.

* **Inline Interpolation:** `{{ expr }}` inside a block.

* **Conditional forms:** `{{cond ? (...) : (...)}}`, `{{cond && (...)}}`, `{{!cond && (...)}}`.

* **Falsy compaction:** Falsy evals render nothing and **do not leave placeholder whitespace**.

* **Line-erase escape:** `{{ null }}` removes a previously emitted **empty** line (see §5.5).

* **Component tags:** `<@Dashboard .../>` map to imported component function calls.

* **XML wrappers:** `<content>…</content>` are structural (no output) unless bound to a component name; they define grouping for indentation/whitespace.

* **One-line returns:** `return (**API Error**)` is a block with a single line.

# 3) File Processing Pipeline

1. **Lex → Parse (TSM Layer)**

   * Tokenize TypeScript normally using a tolerant TS parser (ts-morph / TypeScript compiler API).
   * Within function bodies, detect **TSM Block Expressions**: `return ( … )` where the parenthesized form contains **TSM tokens** (e.g., `{{`, `<@`, XML tags not valid in TS).
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
XmlGroup     := "<" Ident Attrs? ">" Lines "</" Ident ">"
TextChunk    := any UTF-8 run excluding "{{", "<@", "<", NL
Attrs        := (WS Attr)*
Attr         := Ident "=" (StringLiteral | "{"+ Expr +"}")
Expr         := valid TypeScript expression (balanced braces)
WS           := /[ \t]+/
NL           := "\n" | "\r\n"
Ident        := /[A-Za-z_][A-Za-z0-9_]*/
```

Notes:

* `XmlGroup` names (e.g., `<content>`) default to **no-op wrappers**.
* `Component` names prefixed by `@` are **TSM Components**; they compile to function calls.
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

* Compile as `(__expr__)` value pushed to chunks.
* **Falsy compaction:** If value is `false | null | undefined | ""`, nothing is emitted and **no placeholder whitespace** remains.
* **Strings** appended as-is.
* **Numbers/booleans** → `String(value)`.
* **Objects**: call `.toString()`; if `[object Object]`, throw compile-time warning `TSM001`.

## 5.4 Conditional Rendering

* `{{ cond ? (Block) : (Block) }}` → evaluate `cond`; render chosen block.
* `{{ cond && (Block) }}` / `{{ !cond && (Block) }}` → render block iff truthy.

Blocks inside interpolations are parsed recursively as **nested TSM Blocks** and compiled to arrays of chunks.

## 5.5 Line-Erase Escape: `{{ null }}`

* At codegen, emit sentinel `__ERASE_PREV_LINE`.
* In `__tsm`, when encountered, call `__erasePrevLine(buf)` which:

  * If the **last emitted entry** is exactly a newline or an empty line (whitespace only), remove it.
  * If not empty, no-op.
* This matches: “returning null removes the previously rendered line (if empty).”

## 5.6 Falsy on Line Boundaries

> “Falsy values don’t take up space on the line.”

Implementation:

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

* Compile to just the children (no wrapper). They exist to group/indent author content.

## 5.10 One-Line Block Returns

* `return (**API Error**)` → `return __tsm(["**API Error**\n"]);`
* A trailing newline is added if the author placed one; otherwise omit.

## 5.11 Indentation & Empty Lines

* Preserve author indentation and blank lines verbatim.
* When nested blocks render, inner lines inherit their own indentation (not auto-reindented).

## 5.12 Streaming (forward-compatible)

* When any child yields `Iterable<string>`, `__tsm` can return a `string` (default) or, under a compiler flag `stream: true`, return an `AsyncIterable<string>`.
* v1: always returns `string`. Keep interfaces ready.

# 6) Transformation Examples

## 6.1 Sample Function (abbreviated)

**Input (TSM):**

```ts
async function TestComponent() {
  const { data, error, timedout } = await getData();

  if (error) return false;
  if (timedout) return (**API Error**)
  if (!data) {
    return (
      **Error**: No data available

      {{ null }}
    )
  }

  return (
    # Admin panel
    {{ data.isAuthorized ? (Authorized) : (Not Authorized) }}
    {{ !data.active && (Account is inactive) }}
    - Name: {{ data.name }}
    - Description: {{ data.description }}
      Access your information here

    <content>
      <@Dashboard />
    </content>
  )
}
```

**Output (TS):**

```ts
import { getData } from "./api/getData";
import { Dashboard } from "./Dashboard";
import { __tsm, __tsmJoin, __erasePrevLine } from "tsm-runtime";

export async function TestComponent(): Promise<string | false> {
  const { data, error, timedout } = await getData();

  if (error) return false;
  if (timedout) return __tsm(["**API Error**"]);

  if (!data) {
    return __tsm([
      "**Error**: No data available",
      "\n",
      __erasePrevLine // sentinel handled by __tsm
    ]);
  }

  return __tsm([
    "# Admin panel\n",
    (data.isAuthorized ? __tsm(["Authorized"]) : __tsm(["Not Authorized"])), "\n",
    (!data.active ? __tsm(["Account is inactive"]) : null), "\n",
    "- Name: ", data.name, "\n",
    "- Description: ", data.description, "\n",
    "  Access your information here\n",
    await Dashboard()
  ]);
}
```

(Exact array shaping may vary; the contract is preserved.)

# 7) Error Handling & Diagnostics

* **TSM001** Non-stringifiable object interpolation (suggest `.toString()`).
* **TSM002** Unbalanced `{{ ... }}` or unmatched `</...>` tag.
* **TSM003** Component not imported: `<@X/>` without `X` import.
* **TSM004** Disallowed top-level XML tag (if later we reserve names).
* **TSM005** Async in sync context (if function not `async` but a child returns Promise).
* **TSM006** Expression parse failure inside `{{ }}` (surface TS parser message + span).
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

* **Happy paths:** ternary, `&&`/`!` conditionals, nested blocks, components, async data.
* **Whitespace:** leading/trailing spaces, blank lines, `{{ null }}` behavior.
* **Errors:** unmatched tags, missing imports, non-string objects, Promise in sync fn.
* **Golden tests:** input `.tsm` → expected `.ts` snapshot; render outputs.

# 12) Performance Notes

* Single pass TSM parse per block; reuse the TS AST for host code.
* Chunk arrays are flat; `__tsm` avoids quadratic concatenation (join once).
* Async awaits batched with `Promise.all` when multiple component calls exist.

---

If you want, I can generate a minimal `tsm-runtime.ts` and a transformer stub (TypeScript compiler API) that implements the helpers and one full test case from this spec.
