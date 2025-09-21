import { execFileSync, execSync } from "node:child_process";
import { compileFullFile } from "./src/compiler";


const completeTypeScriptSource = `
const VERSION_NUMBER = "1.0.0";
import { Dashboard } from "./components/Dashboard";

async function TestComponent() {
   const someNumber = 1;
   const currentUser = { name: "John", id: 123 };
  return (
    # Version
    ## Here i am
    * {{ VERSION_NUMBER }} *
    Test: More content *bolded*

    <@Dashboard />
    <@Dashboard title="My Dashboard" showHeader user={currentUser} />

    {{ someNumber > 5 ? (
      Some number is greater than 5
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

console.log("FULL TRANSPILED FILE RESULT: ");
console.log(fullFileResult.transpiledFile);