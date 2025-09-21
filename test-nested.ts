import { execFileSync, execSync } from "node:child_process";
import { compileFullFile } from "./src/compiler";
import { parseJSXExpressionToTSMComponent } from "./src/parser/interpolations";


const completeTypeScriptSource = `
function TestComponent() {
   const someNumber = 10;
   const anotherNumber = 20;

  return (
    Hello {{ userName }}!

    {{ someNumber > 5 && (
      Some number is large with value {{ someNumber }}
    )}}
  )
}
`;

const totalStart = performance.now();
const fullFileResult = await compileFullFile(completeTypeScriptSource);

console.log("FULL FILE RESULT: ", fullFileResult.transpiledFile);
