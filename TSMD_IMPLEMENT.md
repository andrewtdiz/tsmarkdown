Awesome — let’s turn those “TBDs” into concrete rules so you can implement without waffling. I’ll propose a small, explicit rendering model plus defaults you can ship now, with opt-ins for edge cases later.

# 1) Mental model (simple & explicit)

* You render **an array of Chunks** that are either:

  * `string` — no implicit newlines.
  * `__tsm` blocks — conceptually a list of lines; has **exactly one trailing newline at the block boundary**.
* Interpolations `{{ … }}` return TS expressions, that can also be `__tsm` blocks.
* The **placement** of an interpolation is determined by where its `{{` starts:

  * **Inline context**: there is non-whitespace before `{{` on the same line.
  * **Block context**: `{{` is the first non-whitespace character on the line.

> Rule of thumb: “where you open it is where it renders.”

---

# 2) Parsing & syntax

**Block detection (parenthesized “TS markdown”):**

* Treat `return (\n … )` as a **TS Markdown region** **if** the `(` is followed by a newline before any non-whitespace content. That’s your reliable lexer hint. Similar to JSX block
* Inside that region:

  * Plain text → `__tsm` block (split into lines).
  * `{{ expr }}` → evaluate `expr` (TypeScript AST), then coerce per rules below.
* **Validity**: expressions inside `{{ … }}` must be valid TS; fail the build on parse/type errors.

---

# 3) Inline vs newline precedence (decide this now)

**Decision:** The **opening position wins**.

* If `{{ … }}` opens inline on a block → its result is **inserted inline**.
* If `{{ … }}` opens at line start (block context) → its result is **inserted as a block** starting at that line.

**Developer intent knobs:**

* To render a block **inline**, place it *after* the expected spacing of the block
* To inject an intentional blank line, leave a line blank anywhere within a `__tsm` block. Blank lines are preserved within a `__tsm` block

---

# 4) What does an expression return?

Coercion rules (keep them tiny and predictable):

* `undefined | false` → no line emitted
* `null` → no line and remove line above

* **Block context** → **no chunk** (no line emitted).
    *Rationale: “don’t render anything” means no extra blank line unless asked.*
* `true` → same as empty string (rare; discourage)
* `number` → render as string
* `string` → render as string
* `(\n .. )` → render with `__tsm()`
* `Array<T>` → **map, then join based on context**

---

# 5) Newline semantics & double-newline avoidance

* **`__tsm` block has exactly one trailing newline at its boundary.**
* **Boundary coalescing rule:**
  When inserting a `__tsm` block into a **Block context**,

  * if the previous character **before** the insertion point is **already a newline**, do **not** add another.
  * otherwise, insert the `__tsm` block's single trailing newline.
* **Interior content** of a `__tsm` block (including intentional leading/trailing empty lines *inside* the block payload) is preserved verbatim. Only the **outer boundary** uses the coalescing rule.

This gives you:

* No accidental double newlines at joins.
* Preserves developer-intentional blank lines *inside* the block.

---

# 6) Arrays & list rendering (the big TBD)

**Decision:** Array join depends on the **context** where the array interpolation begins.

* **Inline context:** join with `""` (concatenate inline).
* **Block context:** join with `"\n"` (each item becomes its own line boundary).

Notes:

* Each array element is first coerced using the same rules. If an element is a `__tsm` block, its trailing boundary newline participates in coalescing so you still avoid doubles.


---

# 7) Indentation & trimming (the subtle one)

* Compute a **baseline indent** for each TS Markdown region from the column of the opening `(` line + 1.
* For every **logical line** inside the region:

  * Strip up to **baseline indent** worth of leading spaces/tabs.
  * **Preserve** any extra spaces beyond that (developer intent).
* **Do not** trim interior empty lines. Leading/trailing **interior** blank lines typed by the author are preserved.
* When an interpolation appears in **block context**, ignore ambient indentation on that line (because the block will render its own lines).

This matches your “flatten to Markdown” requirement without eating meaningful spaces.

---

# 8) Conditional rendering & space consumption

* In **inline context**: falsy → nothing inserted; no spaces added.
* In **block context**: falsy → no chunk; **no** blank line added.
  If developers want a placeholder line, they can return `md.blankLine()`.

---

# 9) Worked examples (using your snippet)

```ts
# Test{{ isEitherVisible && `: ${isVisible ? "Visible" : "Not Visible"}` }}
```

* Interp opens **inline** → result is inline. If falsy, nothing extra (no stray space).
* If truthy and `isVisible` → `: Visible` appended.

```ts
{{ isEitherVisible ? (
  # Test: {{ isVisible ? "Visible" : (
    # Test: Not Visible {{ someData }}
  ) }}
) : (
  # Test
)}}
```

* Interp opens at line start → **block context**.
* Each inner block returns `__tsm` block; boundaries coalesce so you don't get double newlines between nested returns.

```ts
{{isVisible && (
  This should be visible.
)}}
{{notVisible && (
  This should NOT be visible.
)}}
```

* First renders a `__tsm` block, with one trailing newline.
* Second is falsy in block context → renders nothing (no blank line).

**Array map case (decision applied):**

```ts
{{ items.map(s => `- ${s}`) }}
```

* Opens at line start → block context → joined with `"\n"`, giving a clean list.
* Prefer: `{{ md.list(items) }}` for correctness with complex items.


**Renderer core (high level):**

1. Determine **context** at each `{{…}}` by scanning the source line up to `{{`.
2. **Inline context**: insert text into current line.
3. **Block context**: end current line (if not empty), insert `__tsm` block with **boundary coalescing**.
4. At region end, emit one final newline (already guaranteed by the top `__tsm` block).

---

# 10) Test cases to lock behavior

1. **Inline falsy doesn’t add spaces**

   * `X {{false && "Y"}} Z` → `X  Z` (two spaces become one visually; no extra chars)
2. **Block falsy doesn’t add blank line**

   * `{{ false && "Hi" }}` → *(nothing)*
3. **No double newline at joins**

   * `# A\n{{ "# B" }}\n# C` → exactly one blank line between each heading if intended
4. **Array in inline vs block**

   * `X {{[1,2,3]}}` → `X 123`
5. **Indent preservation beyond baseline**

   * A line starting with two more spaces than baseline keeps those two spaces.
6. **Leading/trailing interior blank lines preserved**

   * `(\n\n\nHello\n\n\n)` inside block context preserves the two empty lines inside the block.

---

# 11) Open items you can safely defer

* **Imports**: keep standard TS semantics; the renderer only cares about evaluated values.
* **Explicit “hard break”** primitive: add later if authors want `\n` *without* ending a Block boundary.

---

## TL;DR of decisions

* Opening position determines inline vs block.
* Falsy in block context renders nothing (no blank line).
* `__tsm` blocks have exactly one trailing boundary newline; coalesce to avoid doubles.
* Arrays join inline with `""`, block with `"\n"`.
* Flatten indentation to baseline, preserve interior empties and extra spaces.

If you want, I can turn this into a tiny spec + reference implementation stub you can drop into the repo (types + renderer skeleton + tests).
