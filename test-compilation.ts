import { execFileSync, execSync } from "node:child_process";
import { compileFullFile } from "./src/compiler";

const completeTypeScriptSource = `
import {Dashboard} from "./components/Dashboard";
import { getData } from "./api/getData";

const VERSION_NUMBER = "1.0.0";

function LocalComponent() {
  const someNumber = 30;

  return <@Dashboard />
}

export function TestComponent() {
  const someNumber = 3;
  const names = ["John", "Jane", "Jim"];
  const lowerCaseNames = names.map(name => name.toLowerCase());
  const anotherVariable = "Another Variable";
  const someBool = someNumber > 5;

  return (
    # Version
    ## Here i am
    * {{ VERSION_NUMBER }} *
    Test: More content *bolded*

    <@LocalComponent />

    <@Dashboard title="My Dashboard" showHeader={true} />
    
    {{ names.length > 0 ? (
      Names: {{ names.join(", ") }}
    ) : (
      No names
    )}}

    {{ someBool ? (
      Some number is greater than 5! It's {{ someNumber }}
    ) : (
      Some number is less than 5, it's {{ someNumber }}
    )}}
    {{ someNumber > 10 ? Some number is greater than 10! : Some number is less than 10, it's {{ someNumber }} }}
    More Content
  )
}
`;

const totalStart = performance.now();
const fullFileResult = await compileFullFile(completeTypeScriptSource);

console.log("FULL FILE RESULT: ", fullFileResult.transpiledFile);

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

Bun.write("compiled-test.ts", fileToRun);

const execStart = performance.now();
execFileSync("bun", ["compiled-test.ts"], { stdio: "inherit" });
const execEnd = performance.now();
console.log(`Execution time: ${(execEnd - execStart).toFixed(2)}ms`);

const file = Bun.file("compiled-test.ts");
// await file.delete();

const totalEnd = performance.now();
console.log(`Total test time: ${(totalEnd - totalStart).toFixed(2)}ms`);