import { execFileSync, execSync } from "node:child_process";
import { compileFullFile } from "./src/compiler";
import { parseJSXExpressionToTSMComponent } from "./src/parser/interpolations";


const completeTypeScriptSource = `
async function TestComponent() {
   const someNumber = 10;
   const anotherNumber = 20
  return (
    In the markdown {{ anotherNumber }}
    {{ someNumber > 5 && (
      Some number is greater than 5. Another number is {{ anotherNumber }}
    )}}
  )
}
`;

const expectedOutput = `# Version
*Version: 1.0.0!*`;

const totalStart = performance.now();
const fullFileResult = await compileFullFile(completeTypeScriptSource);

console.log("FULL FILE RESULT: ", fullFileResult.transpiledFile);