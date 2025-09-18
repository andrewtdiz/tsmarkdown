# TypeScript and External Asset Import Specification

- **Primary goal:** allow Better-MDX functions to import and safely execute TypeScript modules and selected non-MDX assets inside `.mdx` sources without breaking determinism or developer ergonomics.
- **Ownership:** compiler and renderer maintainers.
- **Related code:** `compile` orchestrator (`src/compiler.ts:23`), dependency discovery (`src/compiler/compiler-utils.ts:3`).

## Background

- `compile` currently pipes parsed imports into `extractDependencies` before emitting the compiled artifact (`src/compiler.ts:23-47`). The resulting `dependencies` array drives downstream caching and hot-module reload decisions.
- `extractDependencies` performs two regex passes to collect default and named bindings from each raw import string (`src/compiler/compiler-utils.ts:3-21`). It does not yet understand namespace imports, type-only imports, or side-effect imports, and therefore cannot distinguish runtime vs. compile-time dependencies.

## Requirements

### Module Resolution
- Resolve relative specifiers against the MDX file’s `basePath`; honor configured alias maps before falling back to Node-style resolution.
- Accept explicit extensions. If an extension is omitted, default search order is `.tsx`, `.ts`, `.mdx`, `.js`, `.jsx`; emit a warning when resolution requires extension inference.
- Prohibit importing other MDX files directly to avoid recursive render trees; require components to re-export from TypeScript entry points instead.

### TypeScript Module Handling
- Support `.ts`, `.tsx`, `.cts`, and `.mts` sources. Hand the resolved module contents to the shared TypeScript runtime (`src/renderer/typescript-runtime.ts`) and respect the project’s `tsconfig` compiler options.
- Strip type-only imports (e.g. `import type { Foo }`) before execution. Update `extractDependencies` so it skips pushing `type` identifiers and records a dependency flag indicating the import was type-only.
- Await async exports during render. If an imported function returns a promise, the compiler must wrap invocation in `await` within the generated runtime to maintain deterministic output.
- Bubble TypeScript diagnostics with MDX filename and line numbers. Surface the original import statement in the error payload.

### Non-MDX Asset Support
- JSON/YAML: default-export the parsed object; validation errors should include the source filename.
- Text/Markdown: require the `?raw` suffix and default-export the file contents as a UTF-8 string.
- CSS modules: default-export a `Record<string, string>`; reject global CSS imports.
- Any other extension must fail fast with a compiler diagnostic pointing at the import line.

### Dependency Tracking (Implementation Detail)
- Extend `extractDependencies` to:
  - Record default, named, and namespace imports while preserving alias names (`import { Foo as Bar }`).
  - Ignore side-effect-only statements (`import './bootstrap'`) for dependency names but keep the module path in a parallel `sideEffects` list surfaced alongside `dependencies`.
  - Detect type-only clauses (`import type { Foo }`) and skip them in the runtime dependency list while still registering them for rebuild triggers.
  - Normalize whitespace so the regex strategy handles multi-line named imports. Consider migrating to a lightweight parser if regex maintenance cost grows.
- Feed the enriched dependency metadata back through `compile` so downstream caches can differentiate runtime dependencies from type-only watchers.

## Runtime Contract
- Imported values execute inside the MDX sandbox. Modules must export serialisable data or functions/components that do not rely on mutable singletons.
- Cache module evaluation per render context to avoid duplicate side-effects during SSR or incremental builds.
- Warn when imported functions rely on unavailable browser APIs (detected via static analysis or runtime checks).

## Developer Ergonomics
- Provide editor hover information and go-to-definition by emitting source maps for the generated TypeScript bundle.
- Document supported suffixes (`?raw`) and asset behaviors in the Better-MDX docs site. Reference this PRD from fixture comments like `test/component-features/simple-import.mdx`.
- Offer lint rules (or CLI warnings) when developers import unsupported extensions or forget to mark text assets with `?raw`.

## Testing & Validation
- Unit tests targeting `extractDependencies` to cover default, named, namespace, type-only, alias, and side-effect imports.
- Integration fixtures mirroring `test/component-features/simple-import.mdx` to include TypeScript helpers, JSON/YAML assets, and raw markdown imports.
- CLI smoke test to ensure diagnostics render correct paths when resolution fails.

## Rollout Plan
- Phase 1: augment `extractDependencies` to capture enhanced metadata without changing runtime behavior; ship behind an internal flag.
- Phase 2: enable TypeScript and asset loading changes in the compiler/runtime, update documentation and fixtures, and remove the flag once stable.
