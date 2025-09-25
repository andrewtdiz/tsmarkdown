import { execFileSync, execSync } from "node:child_process";
import { compileFullFile } from "./src/compiler";

import content from "./test/core-features/complex-expressions.tsmd"
import { transpile } from "./src/compiler/full-file-compiler";

const totalStart = performance.now();
const file = await Bun.file(content).text();
const {transpiledFile} = compileFullFile(file);

console.log('DEBUG: fullFileResult:', transpiledFile);

const fileToRun = `
import { __tsm } from "./src/runtime/tsm-runtime";

${transpiledFile}

(async () => {
  try {
    const out = await Test();
    Bun.write("compiled-test.md", out);

  } catch (err) {
    console.error("Runtime error:", err);
    process.exitCode = 1;
  }
})();
`;

const expectedOutput = `
Items:
- Apple
- Banana
- Cherry
`;

Bun.write("compiled-test.ts", fileToRun);

execFileSync("bun", ["compiled-test.ts"], { stdio: "inherit" });

const totalEnd = performance.now();
console.log(`Compiled in: ${(totalEnd - totalStart).toFixed(2)}ms`);

