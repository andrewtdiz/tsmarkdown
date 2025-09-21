import { execFileSync, execSync } from "node:child_process";
import { compileFullFile } from "./src/compiler";
import { parseJSXExpressionToTSMComponent } from "./src/parser/interpolations";


const completeTypeScriptSource = `
async function TestComponent() {
   const someNumber = 10;
  return (
    {{ someNumber > 5 ? (
      Some number is greater than 5. It's {{ someNumber }}
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

console.log("FULL FILE RESULT: ", fullFileResult.transpiledFile);