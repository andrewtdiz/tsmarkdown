import { execFileSync, execSync } from "node:child_process";
import { compileFullFile } from "./src/compiler";
import { parseJSXExpressionToTSMComponent } from "./src/parser/interpolations";


const completeTypeScriptSource = `
import {Dashboard} from "./components/Dashboard";
import { getData } from "./api/getData";

const VERSION_NUMBER = "1.0.0";

async function TestComponent() {
   const someNumber = 1;
   const currentUser = { name: "John", id: 123 };
  return (
    # Version
    ## Here i am
    * {{ VERSION_NUMBER }} *
    Test: More content *bolded*

    <@Dashboard />

    <@Dashboard title="My Dashboard" showHeader={true} />

    {{ someNumber > 5 ? (
      Some number is greater than 5. It's
    ) : (
      Some number is less than 5
    )}}
  )
}
`;

const expectedOutput = `# Version
*Version: 1.0.0!*`;

const totalStart = performance.now();
const fullFileResult = await compileFullFile(completeTypeScriptSource);

// Parse JSX expressions into TSMComponent objects
console.log("\n=== TSMComponent Parsing ===");

console.log("TRANSPILED FILE: ", fullFileResult.transpiledFile);

const fileToRun = `
import { __tsm } from "./src/runtime/tsm-runtime";

${fullFileResult.transpiledFile}

(async () => {
  try {
    const out = await TestComponent();
    console.log("\\n=== Runtime Output ===");
    console.log(out);
  } catch (err) {
    console.error("Runtime error:", err);
    process.exitCode = 1;
  }
})();
`;

console.log("FILE TO RUN: \n", fileToRun);

Bun.write("compiled-test.ts", fileToRun);

const execStart = performance.now();
execFileSync("bun", ["compiled-test.ts"], { stdio: "inherit" });
const execEnd = performance.now();
console.log(`Execution time: ${(execEnd - execStart).toFixed(2)}ms`);

const file = Bun.file("compiled-test.ts");
// await file.delete();

const totalEnd = performance.now();
console.log(`Total test time: ${(totalEnd - totalStart).toFixed(2)}ms`);