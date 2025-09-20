# Architecture Tasks – Codex

`test-end-to-end.ts` currently fails because the compiler still emits raw template strings instead of the TSM runtime described in `ARCHITECTURE.MD`. The backlog below breaks the missing functionality into incremental slices aligned with the spec so we can bring the end-to-end flow online.

## Milestone 1 – Parser Foundation
- [ ] Replace the regex-based `preprocessMDXInFunctions` in `src/compiler/full-file-compiler.ts` with the TypeScript AST block detection outlined in §3, so we preserve real TSM blocks for transformation.
- [ ] Stand up a dedicated TSM block parser module that implements the grammar from §4 (Block/Lines/Line/Interp/Component/XmlGroup), returning a typed TSM AST.
- [ ] Extend the parser to detect TSM expressions outside function returns (e.g. `const inlineVersion = (...)`) because `test-end-to-end.ts` exercises global templates.

## Milestone 2 – Runtime Semantics
- [ ] Implement the runtime helpers `__tsm`, `__tsmJoin`, and `__erasePrevLine` with the flatten/compaction behaviour from §5.1–§5.6 and the types from §9.
- [ ] Encode interpolation, falsy compaction, and `{{ null }}` erase semantics in the TSM AST (Sections §5.3–§5.6, §8) so codegen can emit the correct sentinel nodes.
- [ ] Handle `<@Component/>` and XML group nodes exactly as in §5.8–§5.9, including component import validation (`TSM003`).

## Milestone 3 – Code Generation & Integration
- [ ] Replace `compileTemplate` and the return-statement emitters in `src/compiler/compiler-utils.ts` with codegen that lowers the TSM AST to `__tsm([...])` helper calls per §5.
- [ ] Inject the runtime import (`import { __tsm, __tsmJoin, __erasePrevLine } from "tsm-runtime"`) during transformation and ensure the generated TypeScript preserves the author’s control flow (Section §6).
- [ ] Rework `compileFullFile` so `ParsedMDX` instances are built from the new TSM AST (instead of normalized strings) and global template replacements emit compiled helpers.
- [ ] Update dependency extraction to surface component usage and raise diagnostics when referenced components are missing imports (TSM003).

## Milestone 4 – Diagnostics, Tooling, and Tests
- [ ] Surface the architecture’s diagnostics (TSM001–TSM006) with file/line spans through the parser pipeline so callers like `test-end-to-end.ts` can report actionable failures.
- [ ] Add golden/codegen tests that assert the sample program from `ARCHITECTURE.MD` and `completeTypeScriptSource` in `test-end-to-end.ts` compile to the expected helper-based TypeScript (§11).
- [ ] Update the CLI/debug utilities to expose the new TSM AST and runtime output, and document the workflow so editor tooling (Section §10) can hook into the new pipeline.
