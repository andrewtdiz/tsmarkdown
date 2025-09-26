import { execFileSync } from "node:child_process";
import { transpileSource } from "./src/compiler/core";

const totalStart = performance.now();
const file = await Bun.file("./test/core-features/complex-expressions.tsmd").text();

const compiled = transpileSource(file);

console.log("=== Compiled file ===");
console.log(compiled.transpiledFile);

console.log("✅ TSM compilation successful!");

const fileToRun = `${compiled.transpiledFile}

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
Here's a list of items:
Apple Banana Cherry
`;

Bun.write("compiled-test.ts", fileToRun);

execFileSync("bun", ["compiled-test.ts"], { stdio: "inherit" });

const totalEnd = performance.now();
console.log(`Compiled in: ${(totalEnd - totalStart).toFixed(2)}ms`);
